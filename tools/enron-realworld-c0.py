import argparse, json, math, os, random, urllib.request
from bisect import bisect_left
from collections import defaultdict, deque
from itertools import combinations
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score, log_loss
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

RAW_BASE = 'https://raw.githubusercontent.com/hypernetwork-research-group/motif_representation_learning/refs/heads/main/datasets/__datasets__/email-Enron-full'
FILES = {
    'nverts': 'email-Enron-full-nverts.txt',
    'simplices': 'email-Enron-full-simplices.txt',
    'times': 'email-Enron-full-times.txt',
}
DAY = 86400.0
HOUR = 3600.0


def download_dataset(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    out = {}
    for key, name in FILES.items():
        p = cache / name
        if not p.exists():
            urllib.request.urlretrieve(f'{RAW_BASE}/{name}', p)
        out[key] = p
    return out


def read_ints(path):
    with open(path, 'r', encoding='utf-8') as f:
        return [int(x.strip()) for x in f if x.strip()]


def load_events(paths):
    nverts = read_ints(paths['nverts'])
    simp = read_ints(paths['simplices'])
    times = read_ints(paths['times'])
    assert len(nverts) == len(times)
    assert sum(nverts) == len(simp)
    events = []
    k = 0
    for nv, t in zip(nverts, times):
        nodes = tuple(sorted(set(simp[k:k+nv])))
        k += nv
        if 2 <= len(nodes) <= 25:
            ts = float(t / 1000.0 if t > 1e11 else t)
            events.append((ts, nodes))
    events.sort(key=lambda x: x[0])
    return events, {'raw_events': len(nverts), 'used_events': len(events), 'nodes': len(set(n for _, e in events for n in e))}


def safe_log_recency(now, last):
    if last is None:
        return math.log1p(3650 * DAY)
    return math.log1p(max(0.0, now - last))


def stats(vals, default=0.0):
    if not vals:
        return (default, default, default)
    a = np.asarray(vals, dtype=float)
    return (float(a.mean()), float(a.min()), float(a.max()))


def sampled_combinations(nodes, r, cap=64):
    vals = list(combinations(nodes, r))
    if len(vals) <= cap:
        return vals
    idx = np.linspace(0, len(vals)-1, cap, dtype=int)
    return [vals[i] for i in idx]


class HistoryState:
    def __init__(self):
        self.node_count = defaultdict(int)
        self.node_last = {}
        self.node_times = defaultdict(list)
        self.pair_count = defaultdict(int)
        self.pair_last = {}
        self.triple_count = defaultdict(int)
        self.triple_last = {}
        self.group_count = defaultdict(int)
        self.group_last = {}
        self.recent = deque()
        self.last200 = deque(maxlen=200)
        self.seen_nodes = set()

    def purge(self, now):
        cutoff = now - 7 * DAY
        while self.recent and self.recent[0][0] < cutoff:
            self.recent.popleft()

    def count_node_window(self, node, now, window):
        xs = self.node_times.get(node, [])
        return len(xs) - bisect_left(xs, now-window)

    def features(self, now, cand):
        cand = tuple(sorted(cand))
        C = set(cand)
        n = len(cand)
        self.purge(now)

        node_counts = [math.log1p(self.node_count[x]) for x in cand]
        node_rec = [safe_log_recency(now, self.node_last.get(x)) for x in cand]
        nc_mean, nc_min, nc_max = stats(node_counts)
        nr_mean, nr_min, nr_max = stats(node_rec, math.log1p(3650*DAY))
        local = [float(n), nc_mean, nc_min, nc_max, nr_mean, nr_min, nr_max]

        pairs = list(combinations(cand, 2))
        pc = [math.log1p(self.pair_count[p]) for p in pairs]
        pr = [safe_log_recency(now, self.pair_last.get(p)) for p in pairs]
        pc_mean, pc_min, pc_max = stats(pc)
        pr_mean, pr_min, pr_max = stats(pr, math.log1p(3650*DAY))
        pair_seen = sum(self.pair_count[p] > 0 for p in pairs) / max(1, len(pairs))
        pair = local + [pc_mean, pc_min, pc_max, pr_mean, pr_min, pr_max, pair_seen]

        g = cand
        exact_count = math.log1p(self.group_count[g])
        exact_rec = safe_log_recency(now, self.group_last.get(g))
        triples = sampled_combinations(cand, 3, 64) if n >= 3 else []
        tc = [math.log1p(self.triple_count[t]) for t in triples]
        tr = [safe_log_recency(now, self.triple_last.get(t)) for t in triples]
        tc_mean, tc_min, tc_max = stats(tc)
        tr_mean, tr_min, tr_max = stats(tr, math.log1p(3650*DAY))
        triple_seen = sum(self.triple_count[t] > 0 for t in triples) / max(1, len(triples)) if triples else 0.0
        hyper = pair + [exact_count, exact_rec, tc_mean, tc_min, tc_max, tr_mean, tr_min, tr_max, triple_seen]

        member_1h = [self.count_node_window(x, now, HOUR) for x in cand]
        member_1d = [self.count_node_window(x, now, DAY) for x in cand]
        member_7d = [self.count_node_window(x, now, 7*DAY) for x in cand]
        md = [math.log1p(np.mean(member_1h) if member_1h else 0),
              math.log1p(np.mean(member_1d) if member_1d else 0),
              math.log1p(np.mean(member_7d) if member_7d else 0)]

        touch_1h = touch_1d = touch_7d = 0
        touch2_1h = touch2_1d = touch2_7d = 0
        outside = set()
        for t, e in self.recent:
            ov = len(C.intersection(e))
            if ov:
                dt = now - t
                outside.update(set(e) - C)
                if dt <= 7*DAY: touch_7d += 1
                if dt <= DAY: touch_1d += 1
                if dt <= HOUR: touch_1h += 1
                if ov >= 2:
                    if dt <= 7*DAY: touch2_7d += 1
                    if dt <= DAY: touch2_1d += 1
                    if dt <= HOUR: touch2_1h += 1
        density = [math.log1p(touch_1h), math.log1p(touch_1d), math.log1p(touch_7d),
                   math.log1p(touch2_1h), math.log1p(touch2_1d), math.log1p(touch2_7d)]

        recent = list(self.last200)
        def overlaps(lastn):
            rr = recent[-lastn:]
            if not rr:
                return [0.0, 0.0, 0.0]
            js, fracs = [], []
            for _, e in rr:
                E = set(e); inter = len(C & E); union = len(C | E)
                js.append(inter / max(1, union))
                fracs.append(inter / max(1, n))
            return [max(js), float(np.mean(js)), max(fracs)]
        ov20 = overlaps(20)
        ov100 = overlaps(100)

        chain = 0
        for _, e in reversed(recent[-50:]):
            if C.intersection(e): chain += 1
            else: break

        uncovered = set(C); cover = 0
        for _, e in sorted(recent[-50:], key=lambda x: len(uncovered.intersection(x[1])), reverse=True):
            gain = uncovered.intersection(e)
            if gain:
                uncovered -= gain; cover += 1
            if not uncovered: break
        cover_val = cover if not uncovered else n + 1
        recent_member_fraction = 1.0 - len(uncovered) / max(1, n)

        if recent:
            prev = set(recent[-1][1])
            prev_j = len(C & prev) / max(1, len(C | prev))
            prev_frac = len(C & prev) / max(1, n)
        else:
            prev_j = prev_frac = 0.0

        oasis = hyper + md + density + ov20 + ov100 + [math.log1p(chain), float(cover_val), recent_member_fraction,
                                                         math.log1p(len(outside)), prev_j, prev_frac]
        return np.asarray(oasis, dtype=np.float32), (len(local), len(pair), len(hyper), len(oasis))

    def update(self, now, nodes):
        nodes = tuple(sorted(nodes)); S = set(nodes)
        self.seen_nodes.update(S)
        for x in nodes:
            self.node_count[x] += 1
            self.node_last[x] = now
            self.node_times[x].append(now)
        for p in combinations(nodes, 2):
            self.pair_count[p] += 1; self.pair_last[p] = now
        for t in sampled_combinations(nodes, 3, 64) if len(nodes) >= 3 else []:
            self.triple_count[t] += 1; self.triple_last[t] = now
        self.group_count[nodes] += 1; self.group_last[nodes] = now
        item = (now, frozenset(nodes))
        self.recent.append(item); self.last200.append(item)
        self.purge(now)


def make_negatives(pos, seen_nodes, rng, k=3):
    pos = tuple(sorted(pos)); P = set(pos); pool = list(seen_nodes - P)
    if not pool:
        return []
    out, used = [], {pos}
    attempts = 0
    while len(out) < k and attempts < 100:
        attempts += 1
        arr = list(pos)
        j = rng.randrange(len(arr))
        arr[j] = rng.choice(pool)
        cand = tuple(sorted(set(arr)))
        if len(cand) != len(pos) or cand in used:
            continue
        used.add(cand); out.append(cand)
    return out


def build_dataset(events, seed, warmup=500, neg_k=3):
    rng = random.Random(seed)
    H = HistoryState()
    rows, labels, event_ids = [], [], []
    lengths = None
    eligible = 0
    for i, (now, pos) in enumerate(events):
        if i >= warmup and set(pos).issubset(H.seen_nodes):
            negs = make_negatives(pos, H.seen_nodes, rng, neg_k)
            if len(negs) == neg_k:
                cands = [pos] + negs
                for j, c in enumerate(cands):
                    feat, lengths = H.features(now, c)
                    rows.append(feat); labels.append(1 if j == 0 else 0); event_ids.append(eligible)
                eligible += 1
        H.update(now, pos)
    return np.vstack(rows), np.asarray(labels, dtype=int), np.asarray(event_ids, dtype=int), lengths, eligible


def event_rank_metrics(y, p, ids):
    tops = []; rrs = []
    for eid in np.unique(ids):
        m = ids == eid
        yy, pp = y[m], p[m]
        order = np.argsort(-pp)
        rank = int(np.where(yy[order] == 1)[0][0]) + 1
        tops.append(rank == 1); rrs.append(1.0/rank)
    return float(np.mean(tops)), float(np.mean(rrs))


def bootstrap_top1_diff(y, p_a, p_b, ids, B=1000, seed=123):
    rng = np.random.default_rng(seed)
    eids = np.unique(ids)
    da, db = {}, {}
    for eid in eids:
        m = ids == eid
        yy = y[m]
        da[eid] = int(yy[np.argmax(p_a[m])] == 1)
        db[eid] = int(yy[np.argmax(p_b[m])] == 1)
    diffs = []
    for _ in range(B):
        s = rng.choice(eids, size=len(eids), replace=True)
        diffs.append(np.mean([da[e]-db[e] for e in s]))
    return [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))]


def fit_eval(X, y, ids, lengths):
    n_events = int(ids.max()) + 1
    cut1, cut2 = int(n_events*0.60), int(n_events*0.80)
    train = ids < cut1
    val = (ids >= cut1) & (ids < cut2)
    test = ids >= cut2
    l_local, l_pair, l_hyper, l_oasis = lengths
    reps = {'Local': l_local, 'Pairwise': l_pair, 'TemporalHypergraph': l_hyper, 'OASISFlow': l_oasis}
    out, preds = {}, {}
    for name, d in reps.items():
        best = None
        for C in [0.01, 0.1, 1.0, 10.0]:
            model = make_pipeline(StandardScaler(), LogisticRegression(C=C, max_iter=1500, solver='liblinear'))
            model.fit(X[train, :d], y[train])
            pv = model.predict_proba(X[val, :d])[:,1]
            ap = average_precision_score(y[val], pv)
            if best is None or ap > best[0]: best = (ap, C)
        C = best[1]
        model = make_pipeline(StandardScaler(), LogisticRegression(C=C, max_iter=1500, solver='liblinear'))
        tv = train | val
        model.fit(X[tv, :d], y[tv])
        p = model.predict_proba(X[test, :d])[:,1]
        yt, it = y[test], ids[test]
        top1, mrr = event_rank_metrics(yt, p, it)
        out[name] = {
            'features': d, 'C': C,
            'roc_auc': float(roc_auc_score(yt, p)),
            'average_precision': float(average_precision_score(yt, p)),
            'log_loss': float(log_loss(yt, p, labels=[0,1])),
            'top1': top1, 'mrr': mrr,
        }
        preds[name] = (yt, p, it)
    yt, po, it = preds['OASISFlow']
    _, ph, _ = preds['TemporalHypergraph']
    out['paired_oasis_minus_hyper_top1_ci95'] = bootstrap_top1_diff(yt, po, ph, it)
    out['test_events'] = int(len(np.unique(it)))
    out['train_events'] = cut1
    out['validation_events'] = cut2-cut1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='enron-realworld-c0-report.json')
    ap.add_argument('--cache', default='.cache/enron')
    args = ap.parse_args()
    paths = download_dataset(Path(args.cache))
    events, meta = load_events(paths)
    seeds = [7, 19, 43]
    runs = []
    for seed in seeds:
        X, y, ids, lengths, eligible = build_dataset(events, seed)
        res = fit_eval(X, y, ids, lengths)
        res['seed'] = seed; res['eligible_events'] = eligible; res['samples'] = int(len(y)); res['feature_lengths'] = lengths
        runs.append(res)
        print(f'\nSEED {seed} eligible={eligible} samples={len(y)}')
        for k in ['Local','Pairwise','TemporalHypergraph','OASISFlow']:
            r=res[k]
            print(f"{k}: top1={r['top1']:.4f} mrr={r['mrr']:.4f} AP={r['average_precision']:.4f} AUC={r['roc_auc']:.4f} logloss={r['log_loss']:.4f} C={r['C']}")
        print('OASIS-Hyper top1 bootstrap CI95:', res['paired_oasis_minus_hyper_top1_ci95'])
    agg = {}
    for k in ['Local','Pairwise','TemporalHypergraph','OASISFlow']:
        agg[k] = {m: float(np.mean([r[k][m] for r in runs])) for m in ['top1','mrr','average_precision','roc_auc','log_loss']}
        agg[k].update({m+'_sd': float(np.std([r[k][m] for r in runs], ddof=1)) for m in ['top1','mrr','average_precision','roc_auc','log_loss']})
    report = {
        'status': 'C0_realworld_external_dataset',
        'dataset': meta,
        'dataset_source': RAW_BASE,
        'design': {
            'question': 'Does an OASIS-like whole-flow representation add out-of-sample information about the next real Enron email hyperedge beyond local, pairwise, and temporal-hypergraph history?',
            'target': 'Within each real event, rank the observed hyperedge above 3 same-size one-node-corrupted candidates drawn only from nodes known before that event.',
            'no_future_rule': 'No relationship decay, higher-order opening, or density-to-outcome rule is imposed. Features are functions of prior observed events only.',
            'chronological_split': '60% train / 20% validation / 20% test by event order; C selected on validation only.',
            'same_predictor': 'StandardScaler + L2 logistic regression for all representations.',
            'representations': {
                'Local': 'candidate size + per-node historical activity/recency',
                'Pairwise': 'Local + pair co-occurrence frequency/recency/coverage',
                'TemporalHypergraph': 'Pairwise + exact-hyperedge and sampled triple history/recency',
                'OASISFlow': 'TemporalHypergraph + candidate-specific recent relational density, sequential overlap, recent-event coverage, bridge context, and immediate realized-event context'
            },
            'negative_seeds': seeds
        },
        'runs': runs,
        'aggregate': agg
    }
    Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('\nAGGREGATE')
    for k,v in agg.items():
        print(k, json.dumps(v, sort_keys=True))
    print('REPORT', args.out)

if __name__ == '__main__':
    main()
