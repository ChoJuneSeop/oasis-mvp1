import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4177', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalActionable = actionableIds;
    const originalChoose = choose;

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
    const diff = (a, b) => a === b ? 0 : 1;

    // Experimental decision gate only. Relationship experience formation remains enabled in all arms.
    // legacy: relations always participate in choice
    // silent: relations are recorded but never participate in choice
    // flowgate: relation participation is enabled/disabled from the recent direction of the flow
    choose = function(S, P) {
      if (!S.__gateExperiment) return originalChoose(S, P);
      refreshHidden(S, P);
      const mode = S.__gateMode;
      const useRel = mode === 'legacy' ? 1 : mode === 'silent' ? 0 : (S.__fieldEnabled ? 1 : 0);
      const withRel = sig(evalP(S, P, 1));
      const withoutRel = sig(evalP(S, P, 0));
      const g = useRel ? withRel : withoutRel;

      if (P.last && P.last !== g.cands) S.c.cand++;
      if (P.leader && P.leader !== g.leader) S.c.part++;
      P.last = g.cands;
      P.leader = g.leader;

      if (useRel && withRel.choice !== withoutRel.choice) S.__flowStats.actualRelationChoiceUses++;
      if (useRel && (withRel.leader !== withoutRel.leader || withRel.cands !== withoutRel.cands)) S.__flowStats.actualRelationStructureUses++;

      if (useRel && g.choice?.startsWith('hidden:') && MODELS[S.key].rel) {
        const h = hiddenDefs.find(x => x.id === g.choice.slice(7));
        P.hiddenDone.add(h.id);
        P.hiddenCandidates.delete(h.id);
        P.target = h.places[h.places.length - 1];
      } else {
        P.target = g.choice || actionableIds(S, P, useRel)[0] || 'road';
      }
      P.routes.add(P.target);
      P.choiceHistory.push({ t: E.tick, target: P.target });
      S.c.actions++;
    };

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
        if (relTick <= BENIGN_FORCE_TICKS) return basePulse + (0.46 - S.danger) * 0.025;
        return basePulse;
      }
      if (type === 'persistent') return basePulse + (0.66 - S.danger) * 0.012;
      return basePulse;
    }

    function armSnapshot(S) {
      return {
        danger: S.danger,
        parties: S.parties.map(P => ({
          target: P.target,
          current: currentPlace(P),
          candidates: P.last || '',
          leader: P.leader || ''
        }))
      };
    }

    function stateDelta(a, b) {
      const n = Math.min(a.parties.length, b.parties.length) || 1;
      let target = 0, current = 0, candidates = 0, leader = 0;
      for (let i = 0; i < n; i++) {
        target += diff(a.parties[i].target, b.parties[i].target);
        current += diff(a.parties[i].current, b.parties[i].current);
        candidates += diff(a.parties[i].candidates, b.parties[i].candidates);
        leader += diff(a.parties[i].leader, b.parties[i].leader);
      }
      return mean([Math.abs(a.danger - b.danger), target / n, current / n, candidates / n, leader / n]);
    }

    function riskLoad(S) {
      return S.danger * mean(S.parties.map(P => places[P.target]?.r || 0));
    }

    function updateFlowGate(S, snap) {
      if (S.__gateMode !== 'flowgate') return;
      const G = S.__gateState;
      const r = riskLoad(S);
      if (G.prevSnap) G.deltas.push(stateDelta(G.prevSnap, snap));
      G.risks.push(r);
      G.prevSnap = snap;
      if (G.deltas.length < 6 || G.risks.length < 7) return;

      const dPrev = mean(G.deltas.slice(-6, -3));
      const dNow = mean(G.deltas.slice(-3));
      const rPrev = mean(G.risks.slice(-7, -4));
      const rNow = mean(G.risks.slice(-3));

      // Directional criterion only: no absolute danger cutoff is used.
      const worsening = (dNow > dPrev && rNow >= rPrev) || (rNow > rPrev && dNow >= dPrev);
      const recovering = dNow < dPrev && rNow <= rPrev;
      if (worsening) {
        G.worsenStreak++;
        G.recoverStreak = 0;
      } else if (recovering) {
        G.recoverStreak++;
        G.worsenStreak = 0;
      } else {
        G.worsenStreak = 0;
        G.recoverStreak = 0;
      }

      if (!S.__fieldEnabled && G.worsenStreak >= 2) {
        S.__fieldEnabled = true;
        G.enables++;
        G.worsenStreak = 0;
      } else if (S.__fieldEnabled && G.recoverStreak >= 2) {
        S.__fieldEnabled = false;
        G.disables++;
        G.recoverStreak = 0;
      }
    }

    function setupArm(seed, mode) {
      const S = structuredClone(seed);
      S.key = 'full';
      S.__gateExperiment = true;
      S.__gateMode = mode;
      S.__fieldEnabled = mode === 'legacy';
      S.__flowStats = { actualRelationChoiceUses: 0, actualRelationStructureUses: 0, enabledSamples: 0 };
      S.__gateState = { prevSnap: null, deltas: [], risks: [], worsenStreak: 0, recoverStreak: 0, enables: 0, disables: 0 };
      return S;
    }

    function runArm(seed, startTick, mode, type) {
      const S = setupArm(seed, mode);
      const samples = [];
      for (let relTick = 1; relTick <= POST_TICKS; relTick++) {
        E.tick = startTick + relTick;
        const baseEnv = env(E.tick);
        tickW(S, { pulse: forcing(type, S, relTick, baseEnv.pulse) });
        if (relTick % SAMPLE_EVERY === 0) {
          const snap = armSnapshot(S);
          updateFlowGate(S, snap);
          if (S.__fieldEnabled) S.__flowStats.enabledSamples++;
          samples.push({ relTick, snap, fieldEnabled: S.__fieldEnabled, riskLoad: riskLoad(S) });
        }
      }
      return {
        mode,
        type,
        samples,
        stats: {
          ...S.__flowStats,
          gateEnables: S.__gateState.enables,
          gateDisables: S.__gateState.disables,
          fieldEnabledAtEnd: S.__fieldEnabled,
          relationHistory: S.parties.reduce((n, P) => n + P.relationHistory.length, 0),
          relationEpisodes: S.parties.reduce((n, P) => n + (P.relationField?.episodes.length || 0), 0)
        }
      };
    }

    function divergenceSeries(a, b) {
      return a.samples.map((x, i) => ({ relTick: x.relTick, value: stateDelta(x.snap, b.samples[i].snap) }));
    }

    function churn(samples, fromTick, toTick) {
      const xs = samples.filter(x => x.relTick >= fromTick && x.relTick <= toTick);
      if (xs.length < 2) return 0;
      return mean(xs.slice(1).map((x, i) => stateDelta(xs[i].snap, x.snap)));
    }

    function summarize(ref, arm, type) {
      const ds = divergenceSeries(arm, ref);
      const afterForce = type === 'benign' ? BENIGN_FORCE_TICKS : Math.floor(POST_TICKS * 0.25);
      const earlyEnd = Math.min(POST_TICKS, afterForce + 360);
      const lateStart = POST_TICKS - 360;
      const early = ds.filter(x => x.relTick > afterForce && x.relTick <= earlyEnd).map(x => x.value);
      const late = ds.filter(x => x.relTick >= lateStart).map(x => x.value);
      return {
        earlyDivergence: mean(early),
        lateDivergence: mean(late),
        lateToEarly: mean(early) ? mean(late) / mean(early) : null,
        earlyChurn: churn(arm.samples, Math.max(SAMPLE_EVERY, afterForce), earlyEnd),
        lateChurn: churn(arm.samples, lateStart, POST_TICKS),
        relationChoiceUses: arm.stats.actualRelationChoiceUses,
        relationStructureUses: arm.stats.actualRelationStructureUses,
        enabledFraction: arm.stats.enabledSamples / arm.samples.length,
        gateEnables: arm.stats.gateEnables,
        gateDisables: arm.stats.gateDisables,
        fieldEnabledAtEnd: arm.stats.fieldEnabledAtEnd,
        relationHistory: arm.stats.relationHistory,
        relationEpisodes: arm.stats.relationEpisodes
      };
    }

    function between(a, b) {
      const ds = a.samples.map((x, i) => stateDelta(x.snap, b.samples[i].snap));
      const targetDiffs = a.samples.map((x, i) => mean(x.snap.parties.map((p, j) => diff(p.target, b.samples[i].snap.parties[j].target))));
      return { meanDivergence: mean(ds), lateDivergence: mean(ds.slice(-18)), lateTargetDifference: mean(targetDiffs.slice(-18)) };
    }

    const trials = [];
    for (const offset of OFFSETS) {
      const { seed, startTick } = warmSeed(offset);
      const row = { offset, splitRelations: seed.parties.reduce((n, P) => n + P.relationHistory.length, 0) };
      for (const type of ['benign', 'persistent']) {
        const arms = {};
        for (const mode of ['legacy', 'silent', 'flowgate']) {
          const ref = runArm(seed, startTick, mode, 'none');
          const pert = runArm(seed, startTick, mode, type);
          arms[mode] = { summary: summarize(ref, pert, type), raw: pert };
        }
        row[type] = {
          legacy: arms.legacy.summary,
          silent: arms.silent.summary,
          flowgate: arms.flowgate.summary,
          flowgateVsSilent: between(arms.flowgate.raw, arms.silent.raw),
          flowgateVsLegacy: between(arms.flowgate.raw, arms.legacy.raw)
        };
      }
      trials.push(row);
    }

    const val = (type, mode, field) => mean(trials.map(t => t[type][mode][field]).filter(Number.isFinite));
    const count = fn => trials.filter(fn).length;
    const aggregate = {
      conditions: trials.length,
      benign: {
        legacyRelationChoiceUses: val('benign', 'legacy', 'relationChoiceUses'),
        flowGateRelationChoiceUses: val('benign', 'flowgate', 'relationChoiceUses'),
        flowGateEnabledFraction: val('benign', 'flowgate', 'enabledFraction'),
        legacyLateDivergence: val('benign', 'legacy', 'lateDivergence'),
        flowGateLateDivergence: val('benign', 'flowgate', 'lateDivergence'),
        silentLateDivergence: val('benign', 'silent', 'lateDivergence'),
        flowGateLateChurn: val('benign', 'flowgate', 'lateChurn'),
        silentLateChurn: val('benign', 'silent', 'lateChurn'),
        flowGateNaturalReturnConditions: count(t => t.benign.flowgate.lateDivergence < t.benign.flowgate.earlyDivergence)
      },
      persistent: {
        legacyRelationChoiceUses: val('persistent', 'legacy', 'relationChoiceUses'),
        flowGateRelationChoiceUses: val('persistent', 'flowgate', 'relationChoiceUses'),
        flowGateEnabledFraction: val('persistent', 'flowgate', 'enabledFraction'),
        flowGateGateEnables: val('persistent', 'flowgate', 'gateEnables'),
        flowGateGateDisables: val('persistent', 'flowgate', 'gateDisables'),
        legacyLateChurn: val('persistent', 'legacy', 'lateChurn'),
        flowGateEarlyChurn: val('persistent', 'flowgate', 'earlyChurn'),
        flowGateLateChurn: val('persistent', 'flowgate', 'lateChurn'),
        silentLateChurn: val('persistent', 'silent', 'lateChurn'),
        flowGateVsSilentLateTargetDifference: mean(trials.map(t => t.persistent.flowgateVsSilent.lateTargetDifference)),
        flowGateStabilizedConditions: count(t => t.persistent.flowgate.lateChurn < t.persistent.flowgate.earlyChurn),
        fieldReleasedAtEndConditions: count(t => !t.persistent.flowgate.fieldEnabledAtEnd)
      }
    };

    const verdicts = {
      G1_flow_gate_reduces_relation_intervention_for_benign_heterogeneity:
        aggregate.benign.flowGateRelationChoiceUses < aggregate.benign.legacyRelationChoiceUses,
      G2_flow_gate_preserves_or_improves_benign_late_flow:
        aggregate.benign.flowGateLateDivergence <= aggregate.benign.legacyLateDivergence,
      G3_persistent_heterogeneity_recruits_gate:
        aggregate.persistent.flowGateGateEnables > 0 && aggregate.persistent.flowGateEnabledFraction > 0,
      G4_recruited_relations_change_realized_action:
        aggregate.persistent.flowGateRelationChoiceUses > 0 && aggregate.persistent.flowGateVsSilentLateTargetDifference > 0,
      G5_flow_gate_stabilizes_majority_of_persistent_conditions:
        aggregate.persistent.flowGateStabilizedConditions > aggregate.conditions / 2,
      G6_flow_gate_stabilizes_better_than_relation_silent_control:
        aggregate.persistent.flowGateLateChurn < aggregate.persistent.silentLateChurn,
      G7_field_can_be_released_after_stabilization:
        aggregate.persistent.fieldReleasedAtEndConditions > 0
    };

    choose = originalChoose;
    actionableIds = originalActionable;
    E = originalE;

    return {
      design: {
        question: 'Is the failure in the first test caused by always allowing relationship-field participation, and does a directional flow gate better match the OASIS claim that self-recovering heterogeneity should be left alone while persistent risky flow recruits relations until stabilization?',
        comparison: ['legacy relation-always decision', 'relation-silent decision with the same relationship observation/history machinery', 'flow-gated relation decision'],
        gateRule: 'No absolute danger threshold. Compare recent-window versus prior-window direction of structural change and risk load; enable relations after two consecutive worsening windows and release after two consecutive recovering windows.',
        antiConfirmationRule: 'The gate parameters are fixed before this run and are not retuned from the results.',
        offsets: OFFSETS,
        warmupTicks: WARMUP_TICKS,
        postTicks: POST_TICKS,
        sampleEvery: SAMPLE_EVERY
      },
      aggregate,
      verdicts,
      trials
    };
  });

  console.log('\nOASIS FLOW-GATED RELATION FIELD EXPERIMENT');
  console.log(JSON.stringify(report.design, null, 2));
  console.log('\nAGGREGATE');
  console.log(JSON.stringify(report.aggregate, null, 2));
  console.log('\nFALSIFICATION VERDICTS');
  for (const [k, v] of Object.entries(report.verdicts)) console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  console.log('\nNOTE: This is a mechanism-isolation experiment, not a production-code replacement and not universal superiority evidence.');
  await writeFile('heterogeneity-flow-gate-report.json', JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
