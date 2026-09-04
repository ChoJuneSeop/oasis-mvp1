#!/usr/bin/env python3
"""P1-3 preregistered external empirical verification.

Datasets are external and non-OASIS-generated:
A) Stanford SNAP/JODIE MOOC temporal interactions
B) GroupLens MovieLens 100K

Primary metric: held-out log loss.
Thresholds are defined in P1_3_EXTERNAL_PREREGISTRATION.md.
"""
from __future__ import annotations

import argparse, csv, json, math, random, zipfile
from collections import Counter, defaultdict
from pathlib import Path

EPS = 1e-12
SEED = 20260905
LAMBDAS = [0.0, 0.25, 0.5, 0.75, 1.0]
DECAYS = [0.01, 0.05, 0.10, 0.20]
ALPHA_MULTI = 5.0
ALPHA_BIN = 10.0


def clip(p):
    return min(1.0 - EPS, max(EPS, p))


def ll_multi(p):
    return -math.log(clip(p))


def ll_bin(p, y):
    p = clip(p)
    return -(y * math.log(p) + (1-y) * math.log(1-p))


def brier(p, y):
    return (p-y)**2


def split_seq(seq):
    n = len(seq)
    a = max(2, int(n * 0.60))
    b = max(a + 1, int(n * 0.80))
    b = min(b, n-1)
    return seq[:a], seq[a:b], seq[b:]


def beta_prob(pos, n, base, alpha=ALPHA_BIN):
    return (pos + alpha * base) / (n + alpha)


def boot_relative_ci(per_user, reps=1000, seed=SEED, mode="improve"):
    # per_user: list of (base_sum, alt_sum, n)
    rng = random.Random(seed)
    if not per_user:
        return [None, None]
    vals = []
    m = len(per_user)
    for _ in range(reps):
        sb = sa = 0.0
        nn = 0
        for _ in range(m):
            b,a,n = per_user[rng.randrange(m)]
            sb += b; sa += a; nn += n
        if sb <= 0:
            vals.append(0.0)
        elif mode == "improve":
            vals.append((sb-sa)/sb)
        else:
            vals.append((sa-sb)/sb)
    vals.sort()
    return [vals[int(0.025*(reps-1))], vals[int(0.975*(reps-1))]]


def summarize_losses(rows, names):
    out = {}
    for name in names:
        vals = [r[name] for r in rows]
        out[name] = sum(vals)/len(vals) if vals else None
    return out


def load_mooc(path):
    users = defaultdict(list)
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        header = next(r, None)
        for row in r:
            if not row or len(row) < 3:
                continue
            try:
                u = str(row[0]); item = str(row[1]); ts = float(row[2])
            except ValueError:
                continue
            users[u].append((ts, item))
    for u in users:
        users[u].sort(key=lambda x: x[0])
    return users


def mooc_build(users, shuffled=False, seed=SEED):
    rng = random.Random(seed)
    splits = {}
    targets = set()
    for u,seq in users.items():
        if len(seq) < 10:
            continue
        tr,va,te = split_seq(seq)
        if len(va) < 2 or len(te) < 2:
            continue
        if shuffled:
            items = [x[1] for x in tr]
            rng.shuffle(items)
            tr = [(tr[i][0], items[i]) for i in range(len(tr))]
        splits[u]=(tr,va,te)
        targets.update(x[1] for x in tr)
    targets = sorted(targets)

    pop = Counter(); trans = defaultdict(Counter); trans2 = defaultdict(Counter)
    ufreq = defaultdict(Counter); utrans = defaultdict(lambda: defaultdict(Counter))
    utrans_pos = defaultdict(lambda: defaultdict(list))

    for u,(tr,_,_) in splits.items():
        for _,x in tr: ufreq[u][x]+=1
        for i in range(len(tr)-1):
            t0,x = tr[i]; t1,y = tr[i+1]
            if t1 <= t0: continue
            pop[y]+=1; trans[x][y]+=1; utrans[u][x][y]+=1; utrans_pos[u][x].append((i,y))
            if i>=1:
                tp,p = tr[i-1]
                if t0 > tp: trans2[(p,x)][y]+=1
    totpop=sum(pop.values()); k=max(1,len(targets))
    p0={x:(pop[x]+1)/(totpop+k) for x in targets}
    return splits, targets, p0, trans, trans2, ufreq, utrans, utrans_pos


def mooc_prob_markov(y,x,p0,trans):
    c=trans.get(x,{}); n=sum(c.values())
    return (c.get(y,0)+ALPHA_MULTI*p0.get(y,EPS))/(n+ALPHA_MULTI)


def mooc_prob_userfreq(y,u,p0,ufreq):
    c=ufreq.get(u,{}); n=sum(c.values())
    return (c.get(y,0)+ALPHA_MULTI*p0.get(y,EPS))/(n+ALPHA_MULTI)


def mooc_prob_second(y,p,x,pb1,trans2):
    c=trans2.get((p,x),{}); n=sum(c.values())
    return (c.get(y,0)+ALPHA_MULTI*pb1)/(n+ALPHA_MULTI)


def mooc_prob_personal(y,u,x,pb1,utrans):
    c=utrans.get(u,{}).get(x,{}); n=sum(c.values())
    return (c.get(y,0)+ALPHA_MULTI*pb1)/(n+ALPHA_MULTI)


def make_mooc_recency(utrans_pos, splits, decay):
    out=defaultdict(dict)
    for u, byx in utrans_pos.items():
        end=max(1,len(splits[u][0])-1)
        for x,lst in byx.items():
            wc=Counter(); total=0.0
            for pos,y in lst:
                w=math.exp(-decay*(end-pos))
                wc[y]+=w; total+=w
            out[u][x]=(wc,total)
    return out


def eval_mooc_split(splits, which, p0, trans, trans2, ufreq, utrans, recency, lam_b2, lam_o1, lam_o2):
    rows=[]
    per_user=defaultdict(lambda: defaultdict(float)); counts=Counter()
    for u,(tr,va,te) in splits.items():
        seq = va if which=="val" else te
        # previous target is allowed as current observed state; no labels from the future are used.
        for i in range(len(seq)-1):
            t0,x=seq[i]; t1,y=seq[i+1]
            if t1<=t0 or y not in p0: continue
            p = seq[i-1][1] if i>=1 else (tr[-1][1] if tr else x)
            pb0=p0.get(y,EPS)
            pb1=mooc_prob_markov(y,x,p0,trans)
            puf=mooc_prob_userfreq(y,u,p0,ufreq)
            pb2=(1-lam_b2)*pb1+lam_b2*puf
            pb4=mooc_prob_second(y,p,x,pb1,trans2)
            prel=mooc_prob_personal(y,u,x,pb1,utrans)
            po1=(1-lam_o1)*pb1+lam_o1*prel
            wc,total=recency.get(u,{}).get(x,(None,0.0))
            if total>0:
                q=(wc.get(y,0.0)+ALPHA_MULTI*pb1)/(total+ALPHA_MULTI)
            else: q=pb1
            po2=(1-lam_o2)*pb1+lam_o2*q
            d={"B0":ll_multi(pb0),"B1":ll_multi(pb1),"B2":ll_multi(pb2),"B4":ll_multi(pb4),"O1":ll_multi(po1),"O2":ll_multi(po2)}
            rows.append(d); counts[u]+=1
            for k,v in d.items(): per_user[u][k]+=v
    return rows,per_user,counts


def tune_mooc(splits,p0,trans,trans2,ufreq,utrans,utrans_pos):
    best={"B2":(1e99,None),"O1":(1e99,None),"O2":(1e99,None,None)}
    # B2, O1
    rec0=make_mooc_recency(utrans_pos,splits,DECAYS[0])
    for lam in LAMBDAS:
        rows,_,_=eval_mooc_split(splits,"val",p0,trans,trans2,ufreq,utrans,rec0,lam,lam,0.0)
        if not rows: continue
        b2=sum(r["B2"] for r in rows)/len(rows); o1=sum(r["O1"] for r in rows)/len(rows)
        if b2<best["B2"][0]: best["B2"]=(b2,lam)
        if o1<best["O1"][0]: best["O1"]=(o1,lam)
    for decay in DECAYS:
        rec=make_mooc_recency(utrans_pos,splits,decay)
        for lam in LAMBDAS:
            rows,_,_=eval_mooc_split(splits,"val",p0,trans,trans2,ufreq,utrans,rec,best["B2"][1],best["O1"][1],lam)
            if not rows: continue
            o2=sum(r["O2"] for r in rows)/len(rows)
            if o2<best["O2"][0]: best["O2"]=(o2,lam,decay)
    return best


def run_mooc(path, bootstrap):
    users=load_mooc(path)
    splits,targets,p0,trans,trans2,ufreq,utrans,upos=mooc_build(users,False)
    tune=tune_mooc(splits,p0,trans,trans2,ufreq,utrans,upos)
    rec=make_mooc_recency(upos,splits,tune["O2"][2])
    rows,pu,counts=eval_mooc_split(splits,"test",p0,trans,trans2,ufreq,utrans,rec,tune["B2"][1],tune["O1"][1],tune["O2"][1])
    losses=summarize_losses(rows,["B0","B1","B2","B4","O1","O2"])
    simple=min(["B1","B2","B4"],key=lambda x: losses[x])
    paired=[(pu[u][simple],pu[u]["O2"],counts[u]) for u in counts if counts[u]>0]
    rel=(losses[simple]-losses["O2"])/losses[simple]
    ci=boot_relative_ci(paired,bootstrap,SEED,"improve")

    # order permutation: only user-specific relational history is rebuilt from shuffled train events.
    ss,_,p0s,trs,tr2s,ufs,uts,uposs=mooc_build(users,True,SEED)
    recs=make_mooc_recency(uposs,ss,tune["O2"][2])
    rsh,psh,csh=eval_mooc_split(ss,"test",p0,trans,trans2,ufreq,uts,recs,tune["B2"][1],tune["O1"][1],tune["O2"][1])
    lsh=sum(r["O2"] for r in rsh)/len(rsh)
    paired_perm=[(pu[u]["O2"],psh[u]["O2"],counts[u]) for u in counts if counts[u]>0 and csh[u]>0]
    perm_rel=(lsh-losses["O2"])/losses["O2"]
    perm_ci=boot_relative_ci(paired_perm,bootstrap,SEED+1,"degrade")
    support = rel>=0.005 and ci[0] is not None and ci[0]>0 and perm_rel>=0.005 and perm_ci[0] is not None and perm_ci[0]>0
    not_supported = rel<0.005 and ci[0] is not None and ci[0]<=0<=ci[1] and perm_rel<0.005 and perm_ci[0] is not None and perm_ci[0]<=0<=perm_ci[1]
    verdict="SUPPORT" if support else ("NOT_SUPPORTED" if not_supported else "PARTIAL")
    return {"dataset":"SNAP MOOC","users_loaded":len(users),"users_evaluated":len(counts),"targets":len(targets),"test_events":len(rows),"tuning":tune,"test_log_loss":losses,"strongest_simple":simple,"o2_relative_improvement":rel,"o2_improvement_bootstrap95":ci,"permuted_o2_log_loss":lsh,"permutation_relative_degradation":perm_rel,"permutation_bootstrap95":perm_ci,"verdict":verdict}


def load_movielens(zip_path):
    users=defaultdict(list); genres={}
    with zipfile.ZipFile(zip_path) as z:
        # data: user\titem\trating\ttimestamp
        with z.open("ml-100k/u.data") as f:
            for raw in f:
                row=raw.decode("latin-1").strip().split("\t")
                if len(row)!=4: continue
                u,m,r,t=row; users[u].append((int(t),m,float(r)))
        with z.open("ml-100k/u.item") as f:
            for raw in f:
                row=raw.decode("latin-1").rstrip("\n").split("|")
                if len(row)<24: continue
                m=row[0]; flags=row[5:24]
                genres[m]={i for i,v in enumerate(flags) if v=="1"}
    for u in users: users[u].sort(key=lambda x:(x[0],x[1]))
    return users,genres


def jaccard(a,b):
    if not a and not b: return 0.0
    un=a|b
    return len(a&b)/len(un) if un else 0.0


def ml_build(users, shuffled=False, seed=SEED):
    rng=random.Random(seed); splits={}
    global_pos=global_n=0; item_pos=Counter(); item_n=Counter(); user_pos=Counter(); user_n=Counter()
    histories={}
    for u,seq in users.items():
        if len(seq)<20: continue
        tr,va,te=split_seq(seq)
        if shuffled:
            pairs=[(m,r) for _,m,r in tr]; rng.shuffle(pairs)
            tr=[(tr[i][0],pairs[i][0],pairs[i][1]) for i in range(len(tr))]
        splits[u]=(tr,va,te); histories[u]=tr
        for _,m,r in tr:
            y=1 if r>=4.0 else 0
            global_pos+=y; global_n+=1; item_pos[m]+=y; item_n[m]+=1; user_pos[u]+=y; user_n[u]+=1
    gp=global_pos/global_n
    return splits,histories,gp,item_pos,item_n,user_pos,user_n


def item_prob(m,gp,item_pos,item_n):
    return beta_prob(item_pos[m],item_n[m],gp)

def user_prob(u,gp,user_pos,user_n):
    return beta_prob(user_pos[u],user_n[u],gp)


def ml_context_prob(u,m,histories,genres,gp,user_pos,user_n,decay=None):
    tr=histories[u]; gm=genres.get(m,set()); pos=0.0; den=0.0; end=max(1,len(tr)-1)
    for i,(ts,pm,r) in enumerate(tr):
        s=jaccard(gm,genres.get(pm,set()))
        if s<=0: continue
        w=s
        if decay is not None: w*=math.exp(-decay*(end-i))
        den+=w; pos+=w*(1 if r>=4.0 else 0)
    base=user_prob(u,gp,user_pos,user_n)
    return (pos+ALPHA_BIN*base)/(den+ALPHA_BIN) if den>0 else base


def ml_recency_prob(u,histories,gp,user_pos,user_n,decay):
    tr=histories[u]; end=max(1,len(tr)-1); pos=den=0.0
    for i,(_,_,r) in enumerate(tr):
        w=math.exp(-decay*(end-i)); den+=w; pos+=w*(1 if r>=4 else 0)
    base=user_prob(u,gp,user_pos,user_n)
    return (pos+ALPHA_BIN*base)/(den+ALPHA_BIN)


def eval_ml(splits,histories,genres,gp,item_pos,item_n,user_pos,user_n,which,pars):
    rows=[]; pu=defaultdict(lambda: defaultdict(float)); counts=Counter()
    cache_ctx={}; cache_ctxr={}; cache_rec={}
    for u,(tr,va,te) in splits.items():
        seq=va if which=="val" else te
        for ts,m,r in seq:
            y=1 if r>=4 else 0
            pi=item_prob(m,gp,item_pos,item_n); up=user_prob(u,gp,user_pos,user_n)
            pb2=(1-pars["b2"])*pi+pars["b2"]*up
            keyr=(u,pars["b4_decay"])
            if keyr not in cache_rec: cache_rec[keyr]=ml_recency_prob(u,histories,gp,user_pos,user_n,pars["b4_decay"])
            pb4=(1-pars["b4"])*pi+pars["b4"]*cache_rec[keyr]
            key=(u,m)
            if key not in cache_ctx: cache_ctx[key]=ml_context_prob(u,m,histories,genres,gp,user_pos,user_n,None)
            po1=(1-pars["o1"])*pi+pars["o1"]*cache_ctx[key]
            key2=(u,m,pars["o2_decay"])
            if key2 not in cache_ctxr: cache_ctxr[key2]=ml_context_prob(u,m,histories,genres,gp,user_pos,user_n,pars["o2_decay"])
            po2=(1-pars["o2"])*pi+pars["o2"]*cache_ctxr[key2]
            d={"B0":ll_bin(pi,y),"B2":ll_bin(pb2,y),"B4":ll_bin(pb4,y),"O1":ll_bin(po1,y),"O2":ll_bin(po2,y),"Brier_O2":brier(po2,y)}
            rows.append(d); counts[u]+=1
            for k,v in d.items(): pu[u][k]+=v
    return rows,pu,counts


def tune_ml(splits,histories,genres,gp,item_pos,item_n,user_pos,user_n):
    best={"B2":(1e99,None),"B4":(1e99,None,None),"O1":(1e99,None),"O2":(1e99,None,None)}
    # B2/O1 use arbitrary decays, ignored for respective models
    for lam in LAMBDAS:
        pars={"b2":lam,"b4":0,"b4_decay":DECAYS[0],"o1":lam,"o2":0,"o2_decay":DECAYS[0]}
        rows,_,_=eval_ml(splits,histories,genres,gp,item_pos,item_n,user_pos,user_n,"val",pars)
        if not rows: continue
        b2=sum(x["B2"] for x in rows)/len(rows); o1=sum(x["O1"] for x in rows)/len(rows)
        if b2<best["B2"][0]: best["B2"]=(b2,lam)
        if o1<best["O1"][0]: best["O1"]=(o1,lam)
    for d in DECAYS:
        for lam in LAMBDAS:
            pars={"b2":best["B2"][1],"b4":lam,"b4_decay":d,"o1":best["O1"][1],"o2":lam,"o2_decay":d}
            rows,_,_=eval_ml(splits,histories,genres,gp,item_pos,item_n,user_pos,user_n,"val",pars)
            b4=sum(x["B4"] for x in rows)/len(rows); o2=sum(x["O2"] for x in rows)/len(rows)
            if b4<best["B4"][0]: best["B4"]=(b4,lam,d)
            if o2<best["O2"][0]: best["O2"]=(o2,lam,d)
    return best


def run_ml(path,bootstrap):
    users,genres=load_movielens(path)
    splits,hist,gp,ip,inn,up,un=ml_build(users,False)
    tune=tune_ml(splits,hist,genres,gp,ip,inn,up,un)
    pars={"b2":tune["B2"][1],"b4":tune["B4"][1],"b4_decay":tune["B4"][2],"o1":tune["O1"][1],"o2":tune["O2"][1],"o2_decay":tune["O2"][2]}
    rows,pu,counts=eval_ml(splits,hist,genres,gp,ip,inn,up,un,"test",pars)
    losses=summarize_losses(rows,["B0","B2","B4","O1","O2"])
    simple=min(["B0","B2","B4"],key=lambda x: losses[x])
    paired=[(pu[u][simple],pu[u]["O2"],counts[u]) for u in counts if counts[u]>0]
    rel=(losses[simple]-losses["O2"])/losses[simple]; ci=boot_relative_ci(paired,bootstrap,SEED+10,"improve")
    # permutation of training event order, keeping (movie,rating) pairs intact
    ss,hsh,gps,ips,inns,ups,uns=ml_build(users,True,SEED)
    rsh,psh,csh=eval_ml(ss,hsh,genres,gp,ip,inn,up,un,"test",pars)
    lsh=sum(r["O2"] for r in rsh)/len(rsh)
    paired_perm=[(pu[u]["O2"],psh[u]["O2"],counts[u]) for u in counts if counts[u]>0 and csh[u]>0]
    perm_rel=(lsh-losses["O2"])/losses["O2"]; perm_ci=boot_relative_ci(paired_perm,bootstrap,SEED+11,"degrade")
    support=rel>=0.005 and ci[0] is not None and ci[0]>0 and perm_rel>=0.005 and perm_ci[0] is not None and perm_ci[0]>0
    not_supported=rel<0.005 and ci[0] is not None and ci[0]<=0<=ci[1] and perm_rel<0.005 and perm_ci[0] is not None and perm_ci[0]<=0<=perm_ci[1]
    verdict="SUPPORT" if support else ("NOT_SUPPORTED" if not_supported else "PARTIAL")
    return {"dataset":"MovieLens 100K","users_loaded":len(users),"users_evaluated":len(counts),"test_events":len(rows),"tuning":tune,"test_log_loss":losses,"test_brier_o2":sum(r["Brier_O2"] for r in rows)/len(rows),"strongest_simple":simple,"o2_relative_improvement":rel,"o2_improvement_bootstrap95":ci,"permuted_o2_log_loss":lsh,"permutation_relative_degradation":perm_rel,"permutation_bootstrap95":perm_ci,"verdict":verdict}


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--mooc",required=True); ap.add_argument("--movielens",required=True); ap.add_argument("--bootstrap",type=int,default=1000); ap.add_argument("--output",required=True)
    a=ap.parse_args()
    result={"experiment":"P1-3 external empirical verification","seed":SEED,"bootstrap_reps":a.bootstrap,"preregistered":True,"dataset_A":run_mooc(a.mooc,a.bootstrap),"dataset_B":run_ml(a.movielens,a.bootstrap)}
    va=result["dataset_A"]["verdict"]; vb=result["dataset_B"]["verdict"]
    if va=="SUPPORT" and vb=="SUPPORT": result["p1_3_verdict"]="EXTERNAL_SUPPORT_TWO_DATASETS"
    elif va=="NOT_SUPPORTED" and vb=="NOT_SUPPORTED": result["p1_3_verdict"]="K1_CANDIDATE_FAIL_REVIEW_REQUIRED"
    else: result["p1_3_verdict"]="PARTIAL_OR_INCONCLUSIVE"
    Path(a.output).parent.mkdir(parents=True,exist_ok=True); Path(a.output).write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
