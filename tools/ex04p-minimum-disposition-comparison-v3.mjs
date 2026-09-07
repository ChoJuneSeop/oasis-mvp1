import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4224;
const MAX_TICK = 120000;
const REPORT = 'ex04p-minimum-disposition-comparison-v3-report.json';
const PRIOR = Object.freeze({
  id: 'MIN_RELATIONAL_ATTENTION_A',
  type: 'MINIMUM_RELATIONAL_ATTENTION_PRIOR',
  seed: 'OASIS-DISPOSITION-v3-A',
  scope: 'TOP_VOTE_TIE_ONLY',
  rule: 'fixed relational-context attention fingerprint; no risk/reward/target value added'
});

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser;

try {
  await sleep(600);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    globalThis.OASIS_LATENT_RELATION_STORE = true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT = true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() =>
    typeof tickW === 'function' && typeof mkW === 'function' && typeof env === 'function' &&
    typeof evalP === 'function' && typeof choose === 'function' && typeof outcome === 'function',
    null, { timeout: 60000 });

  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const result = await page.evaluate(({ MAX_TICK, PRIOR }) => {
    const savedE = E;
    const productionEvalP = evalP;
    const productionChoose = choose;
    const productionOutcome = outcome;
    const clone = x => structuredClone(x);

    const none = mkW('full');
    const noneTwin = mkW('full');
    const prior = mkW('full');
    const priorTwin = mkW('full');
    E = { tick: 0, worlds: { none, noneTwin, prior, priorTwin }, paused: true };

    const priorWorlds = new Set([prior, priorTwin]);
    const labelOf = S => S === none ? 'NONE' : S === noneTwin ? 'NONE_TWIN' : S === prior ? 'PRIOR' : S === priorTwin ? 'PRIOR_TWIN' : 'OTHER';
    const stats = {
      NONE: { decisions: 0, outcomes: 0, priorApplied: 0, choiceHistogram: {}, pattern: new Map(), decisionSamples: [] },
      PRIOR: { decisions: 0, outcomes: 0, priorApplied: 0, choiceHistogram: {}, pattern: new Map(), decisionSamples: [] }
    };

    const summary = {
      completedTick: 0,
      experimenterInterventionCount: 0,
      noneTwinMismatchTicks: 0,
      priorTwinMismatchTicks: 0,
      firstLongitudinalDivergenceTick: null,
      sameCurrent: {
        decisionEvaluations: 0,
        topVoteTieMoments: 0,
        topVoteTieMomentsWithRelationalContext: 0,
        shadowPriorAppliedMoments: 0,
        shadowChoiceChanges: 0,
        shadowResolvedTargetChanges: 0,
        shadowLeaderChanges: 0,
        candidateMembershipChanges: 0
      }
    };
    const directSamples = [];
    let phase = null;

    function dangerBucket(S) {
      return Math.round(S.danger * 20) / 20;
    }

    function currentRelationalContext(P) {
      const activeKeys = [...(P.relationField?.active || [])].sort();
      const relationNPCs = [...new Set(P.relationHistory.map(e => e.npc).filter(Boolean))].sort();
      const signature = `K:${activeKeys.join(',')}|N:${relationNPCs.join(',')}`;
      return { activeKeys, relationNPCs, signature, nonempty: activeKeys.length > 0 || relationNPCs.length > 0 };
    }

    function compactRows(rows) {
      return rows.map(r => ({ id: r.id, votes: r.votes, voices: (r.voices || []).map(v => [v[0], v[1]]) }));
    }

    function leaderOf(row) {
      if (!row) return '';
      return [...(row.voices || [])].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    }

    function resolvedTarget(rowId) {
      if (!rowId) return null;
      if (!rowId.startsWith('hidden:')) return rowId;
      const h = hiddenDefs.find(x => x.id === rowId.slice(7));
      return h?.places?.[h.places.length - 1] || rowId;
    }

    function applyMinimumDisposition(rows, S, P) {
      const out = compactRows(rows);
      if (!out.length) return { rows: out, applied: false, reason: 'EMPTY', context: currentRelationalContext(P), topIds: [] };
      const topVote = out[0].votes;
      let n = 0;
      while (n < out.length && out[n].votes === topVote) n++;
      const topIds = out.slice(0, n).map(x => x.id);
      const context = currentRelationalContext(P);
      if (n < 2) return { rows: out, applied: false, reason: 'NO_TOP_TIE', context, topIds };
      if (!context.nonempty) return { rows: out, applied: false, reason: 'NO_RELATIONAL_CONTEXT', context, topIds };

      const originalIndex = new Map(topIds.map((id, i) => [id, i]));
      const rankedTop = out.slice(0, n).map(row => ({
        row,
        attention: hash(`${PRIOR.seed}|${P.id}|${context.signature}|${row.id}`)
      })).sort((a, b) => b.attention - a.attention || originalIndex.get(a.row.id) - originalIndex.get(b.row.id));
      const reordered = [...rankedTop.map(x => x.row), ...out.slice(n)];
      const changed = reordered[0]?.id !== out[0]?.id;
      return {
        rows: reordered,
        applied: true,
        changed,
        reason: 'TOP_TIE_RELATIONAL_CONTEXT',
        context,
        topIds,
        attention: rankedTop.map(x => [x.row.id, x.attention])
      };
    }

    function patternStateKey(S, P, baseRows) {
      const topVote = baseRows[0]?.votes;
      const topIds = baseRows.filter(r => r.votes === topVote).map(r => r.id).sort();
      const ctx = currentRelationalContext(P);
      return `${P.id}|${currentPlace(P)}|D:${dangerBucket(S)}|${ctx.signature}|TOP:${topIds.join(',')}`;
    }

    function addPattern(label, key, choice) {
      const m = stats[label].pattern;
      if (!m.has(key)) m.set(key, new Map());
      const c = m.get(key);
      c.set(choice, (c.get(choice) || 0) + 1);
    }

    function compactWorldSig(S) {
      return JSON.stringify([
        Number(S.danger.toFixed(12)), S.spiral, Object.values(S.c),
        ...S.parties.map(P => [
          P.id, P.target, P.leader, P.last, currentPlace(P), P.relationHistory.length, P.choiceHistory.length,
          [...P.disc].sort(), Object.entries(P.vis).sort(), [...P.hiddenCandidates].sort(), [...P.hiddenDone].sort(), [...P.seenNPC].sort(),
          P.relationField?.episodes?.length || 0, [...(P.relationField?.active || [])].sort(), P.relationField?.latent?.byId?.size || 0, [...(P.relationField?.latent?.activeIds || [])].sort(),
          ...P.members.flatMap(m => [m.name, Number(m.x.toFixed(8)), Number(m.y.toFixed(8)), Number(m.hp.toFixed(8))])
        ])
      ]);
    }

    function behavioralSig(S) {
      return JSON.stringify(S.parties.map(P => [
        P.id, P.target, currentPlace(P), P.leader, P.choiceHistory.length, P.relationHistory.length,
        [...P.disc].sort(), [...P.hiddenDone].sort(), [...(P.relationField?.active || [])].sort()
      ]));
    }

    evalP = function(S, P, use = 1) {
      const baseRows = productionEvalP(S, P, use);
      let applied = null;
      let finalRows = baseRows;
      if (use === 1 && priorWorlds.has(S)) {
        applied = applyMinimumDisposition(baseRows, S, P);
        finalRows = applied.rows;
      }

      if (phase && phase.S === S && phase.P === P && use === 1 && !phase.captured) {
        phase.captured = true;
        phase.baseRows = compactRows(baseRows);
        phase.finalRows = compactRows(finalRows);
        phase.priorMeta = applied;

        if (S === none) {
          const shadow = applyMinimumDisposition(baseRows, S, P);
          const sc = summary.sameCurrent;
          sc.decisionEvaluations++;
          if (shadow.topIds.length >= 2) sc.topVoteTieMoments++;
          if (shadow.topIds.length >= 2 && shadow.context.nonempty) sc.topVoteTieMomentsWithRelationalContext++;
          if (shadow.applied) sc.shadowPriorAppliedMoments++;
          const baseChoice = baseRows[0]?.id || null;
          const priorChoice = shadow.rows[0]?.id || null;
          const baseLeader = leaderOf(baseRows[0]);
          const priorLeader = leaderOf(shadow.rows[0]);
          if (baseChoice !== priorChoice) sc.shadowChoiceChanges++;
          if (resolvedTarget(baseChoice) !== resolvedTarget(priorChoice)) sc.shadowResolvedTargetChanges++;
          if (baseLeader !== priorLeader) sc.shadowLeaderChanges++;
          const baseMembers = baseRows.map(r => r.id).sort().join(',');
          const shadowMembers = shadow.rows.map(r => r.id).sort().join(',');
          if (baseMembers !== shadowMembers) sc.candidateMembershipChanges++;
          if (directSamples.length < 50 && shadow.applied && (baseChoice !== priorChoice || directSamples.length < 10)) {
            directSamples.push({
              tick: E.tick,
              party: P.id,
              reality: { currentPlace: currentPlace(P), danger: S.danger, dangerBucket: dangerBucket(S) },
              relationalContext: shadow.context,
              tiedTopPossibilities: shadow.topIds,
              canonicalChoice: baseChoice,
              priorChoice,
              canonicalResolvedTarget: resolvedTarget(baseChoice),
              priorResolvedTarget: resolvedTarget(priorChoice),
              attention: shadow.attention || []
            });
          }
        }
      }
      return finalRows;
    };

    choose = function(S, P) {
      const label = labelOf(S);
      phase = {
        S, P, label,
        captured: false,
        before: { tick: E.tick, currentPlace: currentPlace(P), danger: S.danger, dangerBucket: dangerBucket(S) },
        baseRows: [], finalRows: [], priorMeta: null
      };
      productionChoose(S, P);
      const rec = phase;
      phase = null;

      if (label === 'NONE' || label === 'PRIOR') {
        const chosenRow = rec.finalRows[0]?.id || null;
        const actualTarget = P.target;
        stats[label].decisions++;
        stats[label].choiceHistogram[actualTarget] = (stats[label].choiceHistogram[actualTarget] || 0) + 1;
        if (rec.priorMeta?.applied) stats[label].priorApplied++;
        const key = patternStateKey(S, P, rec.baseRows);
        addPattern(label, key, chosenRow);
        if (stats[label].decisionSamples.length < 40 && (label === 'PRIOR' ? rec.priorMeta?.applied : rec.baseRows.length)) {
          stats[label].decisionSamples.push({
            tick: E.tick,
            party: P.id,
            before: rec.before,
            chosenRow,
            actualTarget,
            topVote: rec.baseRows[0]?.votes ?? null,
            topTieIds: rec.baseRows.filter(r => r.votes === rec.baseRows[0]?.votes).map(r => r.id),
            priorApplied: !!rec.priorMeta?.applied,
            priorChangedTopChoice: !!rec.priorMeta?.changed,
            relationalContext: currentRelationalContext(P)
          });
        }
      }
    };

    outcome = function(S, P, id) {
      productionOutcome(S, P, id);
      const label = labelOf(S);
      if (label === 'NONE' || label === 'PRIOR') stats[label].outcomes++;
    };

    for (let t = 1; t <= MAX_TICK; t++) {
      E.tick = t;
      const ex = env(t);
      tickW(none, clone(ex));
      tickW(noneTwin, clone(ex));
      tickW(prior, clone(ex));
      tickW(priorTwin, clone(ex));

      if (compactWorldSig(none) !== compactWorldSig(noneTwin)) summary.noneTwinMismatchTicks++;
      if (compactWorldSig(prior) !== compactWorldSig(priorTwin)) summary.priorTwinMismatchTicks++;
      if (summary.firstLongitudinalDivergenceTick === null && behavioralSig(none) !== behavioralSig(prior)) {
        summary.firstLongitudinalDivergenceTick = t;
      }
      summary.completedTick = t;
    }

    function summarizePattern(map) {
      let repeatedStates = 0, repeatedVisits = 0, modalSelections = 0, variableStates = 0;
      for (const choices of map.values()) {
        const counts = [...choices.values()];
        const total = counts.reduce((a, b) => a + b, 0);
        if (total < 2) continue;
        repeatedStates++;
        repeatedVisits += total;
        modalSelections += Math.max(...counts);
        if (choices.size > 1) variableStates++;
      }
      return {
        repeatedStates,
        repeatedVisits,
        variableRepeatedStates: variableStates,
        modalChoiceConsistency: repeatedVisits ? modalSelections / repeatedVisits : null
      };
    }

    function summarizeWorld(S, label) {
      const relationEvents = S.parties.reduce((a, P) => a + P.relationHistory.length, 0);
      const choiceEvents = S.parties.reduce((a, P) => a + P.choiceHistory.length, 0);
      const episodes = S.parties.reduce((a, P) => a + (P.relationField?.episodes?.length || 0), 0);
      const uniqueRelationKeys = new Set();
      const uniqueNPCs = new Set();
      const discovered = new Set();
      const hiddenDone = new Set();
      for (const P of S.parties) {
        for (const ep of P.relationField?.episodes || []) if (ep.key) uniqueRelationKeys.add(ep.key);
        for (const e of P.relationHistory) if (e.npc) uniqueNPCs.add(e.npc);
        for (const x of P.disc) discovered.add(x);
        for (const x of P.hiddenDone) hiddenDone.add(`${P.id}:${x}`);
      }
      return {
        initialDispositionPrior: label === 'PRIOR' ? PRIOR : 'NONE',
        decisions: stats[label].decisions,
        outcomes: stats[label].outcomes,
        priorAppliedDecisions: stats[label].priorApplied,
        choiceHistogram: stats[label].choiceHistogram,
        relationEvents,
        choiceEvents,
        relationFieldEpisodes: episodes,
        uniqueRelationKeys: uniqueRelationKeys.size,
        uniqueRelationNPCs: uniqueNPCs.size,
        discoveredPlacesAcrossParties: discovered.size,
        completedHiddenStoriesAcrossParties: hiddenDone.size,
        structuralCounters: { ...S.c },
        observedPattern: summarizePattern(stats[label].pattern),
        sampleDecisions: stats[label].decisionSamples
      };
    }

    function totalVariation(a, b) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const sa = Object.values(a).reduce((x, y) => x + y, 0) || 1;
      const sb = Object.values(b).reduce((x, y) => x + y, 0) || 1;
      let d = 0;
      for (const k of keys) d += Math.abs((a[k] || 0) / sa - (b[k] || 0) / sb);
      return d / 2;
    }

    const noneSummary = summarizeWorld(none, 'NONE');
    const priorSummary = summarizeWorld(prior, 'PRIOR');
    const validity = {
      noExperimenterIntervention: summary.experimenterInterventionCount === 0,
      noneDeterministicTwin: summary.noneTwinMismatchTicks === 0,
      priorDeterministicTwin: summary.priorTwinMismatchTicks === 0,
      completed120k: summary.completedTick === MAX_TICK
    };
    const valid = Object.values(validity).every(Boolean);

    const evidence = {
      dispositionOperationalization:
        'MINIMUM_RELATIONAL_ATTENTION_PRIOR_FIXED_BEFORE_RUN_TOP_VOTE_TIE_ONLY',
      directSameCurrentEffect:
        summary.sameCurrent.shadowChoiceChanges > 0 && valid
          ? 'OBSERVED_WITHIN_CANONICAL_HARNESS_FOR_THIS_MINIMUM_OPERATIONALIZATION'
          : summary.sameCurrent.topVoteTieMomentsWithRelationalContext > 0 && valid
            ? 'NO_CHOICE_EFFECT_OBSERVED_WITHIN_ELIGIBLE_MOMENTS_FOR_THIS_OPERATIONALIZATION'
            : 'INCONCLUSIVE_NO_ELIGIBLE_RELATIONAL_TOP_TIES',
      necessityForBehavior:
        noneSummary.decisions > 0 && noneSummary.outcomes > 0 && valid
          ? 'NOT_NECESSARY_FOR_BEHAVIOR_OR_REALIZATION_WITHIN_THIS_HARNESS'
          : 'UNVALIDATED',
      sufficientCause:
        'NOT_ESTABLISHED',
      longitudinalEffect:
        summary.firstLongitudinalDivergenceTick !== null && valid
          ? 'LONGITUDINAL_DIVERGENCE_OBSERVED_AFTER_FIXED_INITIAL_PRIOR'
          : 'NO_LONGITUDINAL_DIVERGENCE_OBSERVED_WITHIN_HORIZON',
      observedDispositionPattern:
        'EXPLORATORY_REPEATED_CONTEXT_PATTERN_ONLY_NOT_A_LEARNED_INTERNAL_PERSONALITY_PARAMETER'
    };

    const result = {
      experiment: 'EX-04P-A Minimum Disposition Initial-Condition Comparison',
      hypothesisScope: 'Individual Disposition effect/necessity under a deliberately minimal relational-attention prior',
      maxTick: MAX_TICK,
      fixedPrior: PRIOR,
      design: {
        conditionA: 'initialDispositionPrior = NONE',
        conditionB: PRIOR,
        sameExogenousEnvironment: true,
        priorFixedBeforeRun: true,
        priorMayOnlyReorderTopVoteTiesWhenRelationalContextExists: true,
        noRiskRewardOrOutcomeTargetEncoded: true,
        noCandidateMembershipInjection: true,
        noMidRunPriorMutation: true,
        deterministicTwinPerCondition: true,
        sameCurrentShadowOnNONETrajectory: true,
        longitudinalParallelWorldsNotResetAfterDivergence: true
      },
      validity,
      valid,
      summary,
      conditions: { NONE: noneSummary, PRIOR: priorSummary },
      comparison: {
        choiceDistributionTotalVariation: totalVariation(noneSummary.choiceHistogram, priorSummary.choiceHistogram),
        relationEventDifference: priorSummary.relationEvents - noneSummary.relationEvents,
        relationFieldEpisodeDifference: priorSummary.relationFieldEpisodes - noneSummary.relationFieldEpisodes,
        hiddenStoryDifference: priorSummary.completedHiddenStoriesAcrossParties - noneSummary.completedHiddenStoriesAcrossParties,
        observedPatternConsistencyDifference:
          priorSummary.observedPattern.modalChoiceConsistency != null && noneSummary.observedPattern.modalChoiceConsistency != null
            ? priorSummary.observedPattern.modalChoiceConsistency - noneSummary.observedPattern.modalChoiceConsistency
            : null
      },
      directSameCurrentSamples: directSamples,
      evidence,
      interpretationBoundary: [
        'This test operationalizes only a minimum relational-attention form of Individual Disposition.',
        'The prior cannot change candidate membership directly and cannot override a non-tied production score.',
        'A positive result shows contribution under this operationalization, not universal necessity or sufficiency of disposition.',
        'A negative result does not refute every possible form of Individual Disposition.',
        'Longitudinal divergence is not itself proof that every later difference is directly caused by the prior; later realities are allowed to diverge naturally.',
        'NONE remains the control and is not reinterpreted as theoretical nonexistence of disposition.'
      ]
    };

    E = savedE;
    return result;
  }, { MAX_TICK, PRIOR });

  await writeFile(REPORT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    valid: result.valid,
    evidence: result.evidence,
    sameCurrent: result.summary.sameCurrent,
    firstLongitudinalDivergenceTick: result.summary.firstLongitudinalDivergenceTick,
    comparison: result.comparison,
    none: {
      decisions: result.conditions.NONE.decisions,
      outcomes: result.conditions.NONE.outcomes,
      observedPattern: result.conditions.NONE.observedPattern
    },
    prior: {
      decisions: result.conditions.PRIOR.decisions,
      outcomes: result.conditions.PRIOR.outcomes,
      priorAppliedDecisions: result.conditions.PRIOR.priorAppliedDecisions,
      observedPattern: result.conditions.PRIOR.observedPattern
    }
  }, null, 2));
  if (!result.valid) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
