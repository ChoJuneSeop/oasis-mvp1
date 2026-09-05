import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4176', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalActionable = actionableIds;

    // Fairness lock used in the existing OASIS comparison tests:
    // relationship structure may change judgment, but not executable access.
    actionableIds = function(S, P, use = 1) {
      const here = currentPlace(P);
      const ids = Object.keys(places);
      const other = ids.filter(id => id !== here);
      return other.length ? other : ids;
    };

    const OFFSETS = [0, 73, 149, 251, 389, 577, 911];
    const WARMUP_TICKS = 1800;
    const POST_TICKS = 1800;
    const SAMPLE_EVERY = 20;
    const BENIGN_FORCE_TICKS = 180;

    const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const same = (a, b) => a === b ? 0 : 1;
    const activeSig = P => [...(P.relationField?.active || [])].sort().join('|');

    function snapshot(S, relCounterBase) {
      return {
        tick: E.tick,
        danger: S.danger,
        parties: S.parties.map(P => ({
          id: P.id,
          target: P.target,
          current: currentPlace(P),
          candidates: P.last || '',
          leader: P.leader || '',
          active: activeSig(P)
        })),
        counters: {
          relationFieldActivation: (S.c.relationFieldActivation || 0) - relCounterBase.relationFieldActivation,
          relationRecombination: (S.c.relationRecombination || 0) - relCounterBase.relationRecombination,
          relationChoiceTransition: (S.c.choiceTransition || 0) - relCounterBase.relationChoiceTransition,
          relationParticipationTransition: (S.c.participationTransition || 0) - relCounterBase.relationParticipationTransition,
          actions: (S.c.actions || 0) - relCounterBase.actions
        }
      };
    }

    function divergence(a, b) {
      const n = Math.min(a.parties.length, b.parties.length) || 1;
      let target = 0, current = 0, candidates = 0, leader = 0, active = 0;
      for (let i = 0; i < n; i++) {
        target += same(a.parties[i].target, b.parties[i].target);
        current += same(a.parties[i].current, b.parties[i].current);
        candidates += same(a.parties[i].candidates, b.parties[i].candidates);
        leader += same(a.parties[i].leader, b.parties[i].leader);
        active += same(a.parties[i].active, b.parties[i].active);
      }
      const d = {
        danger: Math.abs(a.danger - b.danger),
        target: target / n,
        current: current / n,
        candidates: candidates / n,
        leader: leader / n,
        active: active / n
      };
      d.structural = mean([d.target, d.current, d.candidates, d.leader]);
      d.composite = mean([d.danger, d.target, d.current, d.candidates, d.leader]);
      return d;
    }

    function churn(samples, fromTick, toTick) {
      const xs = samples.filter(x => x.relTick >= fromTick && x.relTick <= toTick);
      if (xs.length < 2) return { target: 0, candidates: 0, leader: 0, active: 0, composite: 0 };
      let target = 0, candidates = 0, leader = 0, active = 0, denom = 0;
      for (let i = 1; i < xs.length; i++) {
        const a = xs[i - 1], b = xs[i];
        const n = Math.min(a.snap.parties.length, b.snap.parties.length);
        for (let p = 0; p < n; p++) {
          target += same(a.snap.parties[p].target, b.snap.parties[p].target);
          candidates += same(a.snap.parties[p].candidates, b.snap.parties[p].candidates);
          leader += same(a.snap.parties[p].leader, b.snap.parties[p].leader);
          active += same(a.snap.parties[p].active, b.snap.parties[p].active);
          denom++;
        }
      }
      const out = { target: target / denom, candidates: candidates / denom, leader: leader / denom, active: active / denom };
      out.composite = mean([out.target, out.candidates, out.leader]);
      return out;
    }

    function counterBase(S) {
      return {
        relationFieldActivation: S.c.relationFieldActivation || 0,
        relationRecombination: S.c.relationRecombination || 0,
        relationChoiceTransition: S.c.choiceTransition || 0,
        relationParticipationTransition: S.c.participationTransition || 0,
        actions: S.c.actions || 0
      };
    }

    function cloneForKey(seed, key) {
      const S = structuredClone(seed);
      S.key = key;
      if (key === 'norel') {
        for (const P of S.parties) {
          if (P.relationField) P.relationField.active = [];
          P.pendingFieldChoice = null;
          P.pendingRelChoice = null;
        }
      }
      return S;
    }

    function warmSeed(offset) {
      E = { tick: offset, worlds: {}, paused: true };
      const S = mkW('full');
      for (let t = 1; t <= WARMUP_TICKS; t++) {
        E.tick = offset + t;
        tickW(S, env(E.tick));
      }
      return { seed: S, startTick: offset + WARMUP_TICKS };
    }

    function forcing(type, S, relTick, basePulse) {
      if (type === 'none') return basePulse;
      if (type === 'benign') {
        // Transient perturbation: the forcing disappears completely.
        // The experiment asks whether the flow returns without requiring a relation-field response.
        if (relTick <= BENIGN_FORCE_TICKS) return basePulse + (0.46 - S.danger) * 0.025;
        return basePulse;
      }
      if (type === 'persistent') {
        // Persistent regime pressure: no single event threshold; the environment continuously
        // pulls the flow toward a changed operating region.
        return basePulse + (0.66 - S.danger) * 0.012;
      }
      return basePulse;
    }

    function runArm(seed, startTick, key, type) {
      const S = cloneForKey(seed, key);
      const base = counterBase(S);
      const samples = [];
      for (let relTick = 1; relTick <= POST_TICKS; relTick++) {
        E.tick = startTick + relTick;
        const baseEnv = env(E.tick);
        tickW(S, { pulse: forcing(type, S, relTick, baseEnv.pulse) });
        if (relTick % SAMPLE_EVERY === 0) samples.push({ relTick, snap: snapshot(S, base) });
      }
      return { key, type, samples, final: snapshot(S, base) };
    }

    function summarize(reference, perturbed, type) {
      const rows = perturbed.samples.map((x, i) => ({
        relTick: x.relTick,
        d: divergence(x.snap, reference.samples[i].snap),
        snap: x.snap
      }));
      const afterForce = type === 'benign' ? BENIGN_FORCE_TICKS : Math.floor(POST_TICKS * 0.25);
      const earlyEnd = Math.min(POST_TICKS, afterForce + 360);
      const lateStart = POST_TICKS - 360;
      const early = rows.filter(x => x.relTick > afterForce && x.relTick <= earlyEnd);
      const late = rows.filter(x => x.relTick >= lateStart);
      const all = rows;
      const peakComposite = Math.max(...all.map(x => x.d.composite));
      const earlyComposite = mean(early.map(x => x.d.composite));
      const lateComposite = mean(late.map(x => x.d.composite));
      const earlyStructural = mean(early.map(x => x.d.structural));
      const lateStructural = mean(late.map(x => x.d.structural));
      const earlyChurn = churn(perturbed.samples, Math.max(SAMPLE_EVERY, afterForce), earlyEnd);
      const lateChurn = churn(perturbed.samples, lateStart, POST_TICKS);
      return {
        type,
        key: perturbed.key,
        peakComposite,
        earlyComposite,
        lateComposite,
        lateToEarlyComposite: earlyComposite ? lateComposite / earlyComposite : null,
        earlyStructural,
        lateStructural,
        lateToEarlyStructural: earlyStructural ? lateStructural / earlyStructural : null,
        earlyChurn,
        lateChurn,
        counters: perturbed.final.counters,
        finalDanger: perturbed.final.danger,
        finalTargets: perturbed.final.parties.map(p => p.target),
        series: rows.map(x => ({ relTick: x.relTick, ...x.d }))
      };
    }

    function armDistance(a, b) {
      const rows = a.samples.map((x, i) => divergence(x.snap, b.samples[i].snap));
      return {
        meanComposite: mean(rows.map(x => x.composite)),
        lateComposite: mean(rows.slice(-18).map(x => x.composite)),
        meanTargetDifference: mean(rows.map(x => x.target)),
        lateTargetDifference: mean(rows.slice(-18).map(x => x.target)),
        meanActiveDifference: mean(rows.map(x => x.active))
      };
    }

    const trials = [];
    for (const offset of OFFSETS) {
      const { seed, startTick } = warmSeed(offset);
      const relationEpisodesAtSplit = seed.parties.reduce((n, P) => n + (P.relationField?.episodes.length || 0), 0);
      const relationHistoryAtSplit = seed.parties.reduce((n, P) => n + P.relationHistory.length, 0);

      const refFull = runArm(seed, startTick, 'full', 'none');
      const refNoRel = runArm(seed, startTick, 'norel', 'none');
      const benignFull = runArm(seed, startTick, 'full', 'benign');
      const benignNoRel = runArm(seed, startTick, 'norel', 'benign');
      const persistentFull = runArm(seed, startTick, 'full', 'persistent');
      const persistentNoRel = runArm(seed, startTick, 'norel', 'persistent');

      trials.push({
        offset,
        split: { relationEpisodesAtSplit, relationHistoryAtSplit },
        benign: {
          full: summarize(refFull, benignFull, 'benign'),
          norel: summarize(refNoRel, benignNoRel, 'benign'),
          fullVsNoRel: armDistance(benignFull, benignNoRel)
        },
        persistent: {
          full: summarize(refFull, persistentFull, 'persistent'),
          norel: summarize(refNoRel, persistentNoRel, 'persistent'),
          fullVsNoRel: armDistance(persistentFull, persistentNoRel)
        }
      });
    }

    const avg = (type, key, field) => mean(trials.map(t => t[type][key][field]).filter(x => Number.isFinite(x)));
    const avgNested = (type, key, outer, inner) => mean(trials.map(t => t[type][key][outer][inner]).filter(x => Number.isFinite(x)));
    const count = fn => trials.filter(fn).length;

    const aggregate = {
      conditions: trials.length,
      warmupRelationEpisodesMean: mean(trials.map(t => t.split.relationEpisodesAtSplit)),
      warmupRelationHistoryMean: mean(trials.map(t => t.split.relationHistoryAtSplit)),
      benign: {
        fullLateToEarlyComposite: avg('benign', 'full', 'lateToEarlyComposite'),
        noRelLateToEarlyComposite: avg('benign', 'norel', 'lateToEarlyComposite'),
        fullLateToEarlyStructural: avg('benign', 'full', 'lateToEarlyStructural'),
        noRelLateToEarlyStructural: avg('benign', 'norel', 'lateToEarlyStructural'),
        fullLateChurn: avgNested('benign', 'full', 'lateChurn', 'composite'),
        noRelLateChurn: avgNested('benign', 'norel', 'lateChurn', 'composite'),
        fullRelationActivations: mean(trials.map(t => t.benign.full.counters.relationFieldActivation)),
        fullRelationChoiceTransitions: mean(trials.map(t => t.benign.full.counters.relationChoiceTransition)),
        naturalReturnFullConditions: count(t => t.benign.full.lateComposite < t.benign.full.earlyComposite),
        naturalReturnNoRelConditions: count(t => t.benign.norel.lateComposite < t.benign.norel.earlyComposite)
      },
      persistent: {
        fullLateToEarlyComposite: avg('persistent', 'full', 'lateToEarlyComposite'),
        noRelLateToEarlyComposite: avg('persistent', 'norel', 'lateToEarlyComposite'),
        fullEarlyChurn: avgNested('persistent', 'full', 'earlyChurn', 'composite'),
        fullLateChurn: avgNested('persistent', 'full', 'lateChurn', 'composite'),
        noRelEarlyChurn: avgNested('persistent', 'norel', 'earlyChurn', 'composite'),
        noRelLateChurn: avgNested('persistent', 'norel', 'lateChurn', 'composite'),
        fullRelationActivations: mean(trials.map(t => t.persistent.full.counters.relationFieldActivation)),
        fullRelationRecombinations: mean(trials.map(t => t.persistent.full.counters.relationRecombination)),
        fullRelationChoiceTransitions: mean(trials.map(t => t.persistent.full.counters.relationChoiceTransition)),
        fullRelationParticipationTransitions: mean(trials.map(t => t.persistent.full.counters.relationParticipationTransition)),
        fullVsNoRelLateTargetDifference: mean(trials.map(t => t.persistent.fullVsNoRel.lateTargetDifference)),
        stabilizedFullConditions: count(t => t.persistent.full.lateChurn.composite < t.persistent.full.earlyChurn.composite),
        stabilizedNoRelConditions: count(t => t.persistent.norel.lateChurn.composite < t.persistent.norel.earlyChurn.composite)
      }
    };

    // Falsification-oriented verdicts. These are observations, not hard-coded assertions.
    const verdicts = {
      V1_benign_can_return_without_forced_field: aggregate.benign.naturalReturnNoRelConditions > 0,
      V2_full_does_not_need_more_persistent_intervention_for_benign_than_risky:
        aggregate.benign.fullRelationChoiceTransitions <= aggregate.persistent.fullRelationChoiceTransitions,
      V3_persistent_risk_recruits_relation_field:
        aggregate.persistent.fullRelationActivations > 0 &&
        (aggregate.persistent.fullRelationChoiceTransitions > 0 || aggregate.persistent.fullRelationParticipationTransitions > 0),
      V4_relation_field_changes_realized_action_flow_under_persistent_risk:
        aggregate.persistent.fullVsNoRelLateTargetDifference > 0,
      V5_full_flow_stabilizes_after_persistent_heterogeneity:
        aggregate.persistent.stabilizedFullConditions > aggregate.conditions / 2,
      V6_relation_field_stabilizes_better_than_ablation:
        aggregate.persistent.fullLateChurn < aggregate.persistent.noRelLateChurn
      };

    E = originalE;
    actionableIds = originalActionable;

    return {
      design: {
        question: 'After heterogeneity appears, does the flow naturally re-converge when the perturbation is transient, while persistent risky heterogeneity recruits relationship-field structure, changes action flow, and then stabilizes?',
        scope: 'Post-heterogeneity trajectory. Heterogeneity is not treated as a frozen event or a single coordinate.',
        controls: ['matched unperturbed trajectory', 'NoRelation ablation from the exact same pre-heterogeneity OASIS state'],
        currentDefinition: 'A sampled transition stream containing danger, realized target, current place, candidate structure, participation leader, and active relationship-field signature.',
        benignPerturbation: `continuous pull toward a temporary changed region for ${BENIGN_FORCE_TICKS} ticks, then completely removed`,
        persistentPerturbation: 'continuous environmental pull toward a changed operating region for the whole post period',
        offsets: OFFSETS,
        warmupTicks: WARMUP_TICKS,
        postTicks: POST_TICKS,
        sampleEvery: SAMPLE_EVERY,
        interpretationRule: 'Do not infer OASIS superiority from field activity alone. Relation-field value requires changed realized action flow and better/stable post-heterogeneity dynamics versus the matched ablation.'
      },
      aggregate,
      verdicts,
      trials
    };
  });

  console.log('\nOASIS POST-HETEROGENEITY FLOW TEST');
  console.log(JSON.stringify(report.design, null, 2));
  console.log('\nAGGREGATE');
  console.log(JSON.stringify(report.aggregate, null, 2));
  console.log('\nFALSIFICATION VERDICTS');
  for (const [k, v] of Object.entries(report.verdicts)) console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  console.log('\nNOTE: PASS/FAIL here is limited to this synthetic OASIS world and these matched perturbation streams.');

  await writeFile('heterogeneity-flow-report.json', JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
