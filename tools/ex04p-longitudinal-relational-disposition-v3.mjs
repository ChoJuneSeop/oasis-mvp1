import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4227;
const HORIZON = 12000;
const REPORT = 'ex04p-longitudinal-relational-disposition-v3-report.json';
const PRIOR = Object.freeze({
  id: 'MIN_RELATIONAL_SUPPORT_ATTENTION_A',
  type: 'MINIMUM_RELATIONAL_SUPPORT_ATTENTION_PRIOR',
  seed: 'OASIS-DISPOSITION-v3-RS-A',
  scope: 'TOP_VOTE_TIE_WITH_DISTINCT_DIRECT_RELATIONAL_SUPPORT_ONLY',
  aggregation: 'MEAN_FIXED_SALIENCE_OVER_DIRECT_SUPPORT_IDENTITIES'
});
const DANGER_LEVELS = Object.freeze(Array.from({ length: 71 }, (_, i) => i / 100));
const MODES = Object.freeze(['NONE', 'RELATIONAL', 'PLACEBO', 'SUPPORT_PERMUTED']);

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
    typeof mkW === 'function' && typeof tickW === 'function' && typeof evalP === 'function' &&
    typeof choose === 'function' && typeof outcome === 'function' && typeof env === 'function' &&
    typeof relationExists === 'function' && typeof currentPlace === 'function',
    null, { timeout: 60000 });
  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const result = await page.evaluate(({ PRIOR, DANGER_LEVELS, MODES, HORIZON }) => {
    const savedE = E;
    const productionEvalP = evalP;
    const productionChoose = choose;
    const productionOutcome = outcome;
    const clone = x => structuredClone(x);
    const pairKeyLocal = (a, b) => [a, b].sort().join('↔');
    const partyIds = ['dawn', 'star', 'blue'];
    const publicPlaceIds = Object.keys(places).filter(id => places[id].pub);
    const npcByPlace = new Map();
    for (const [npc, placeId] of npcs) {
      if (!npcByPlace.has(placeId)) npcByPlace.set(placeId, []);
      npcByPlace.get(placeId).push(npc);
    }

    function supportersForPlace(placeId) {
      const out = [];
      const gate = places[placeId]?.gate;
      if (gate) out.push(gate);
      for (const n of npcByPlace.get(placeId) || []) out.push(n);
      return [...new Set(out)];
    }

    const targetSupportPairs = [];
    const placeIds = Object.keys(places);
    for (let i = 0; i < placeIds.length; i++) {
      for (let j = i + 1; j < placeIds.length; j++) {
        const a = placeIds[i], b = placeIds[j];
        for (const sa of supportersForPlace(a)) for (const sb of supportersForPlace(b)) {
          if (sa !== sb) targetSupportPairs.push({ a, b, sa, sb });
        }
      }
    }

    function chooseAnchor(exclude) {
      return npcs.map(x => x[0]).find(n => !exclude.has(n)) || null;
    }

    function placePartyAt(P, placeId) {
      const q = places[placeId];
      const offsets = [[-16,-10],[16,-10],[-16,12],[16,12]];
      P.members.forEach((m, i) => { m.x = q.x + offsets[i][0]; m.y = q.y + offsets[i][1]; });
      P.target = placeId;
    }

    function initMatchedWorld(config) {
      const { partyId, currentId, danger, spec } = config;
      const S = mkW('full');
      const P = S.parties.find(x => x.id === partyId);
      S.danger = danger;
      placePartyAt(P, currentId);
      P.relationHistory = [];
      P.seenNPC = new Set();
      P.hiddenCandidates = new Set();
      P.hiddenDone = new Set();
      P.disc = new Set([currentId, 'road', spec.a, spec.b]);
      P.vis = {};
      P.routes = new Set();
      P.choiceHistory = [];
      P.pendingRelChoice = null;
      P.q = {};
      P.memory = [];
      if (!P.relationField) P.relationField = { episodes: [], active: [], activations: 0, recombinations: 0, spirals: 0, lastActivationTick: null };
      P.relationField.episodes = [];
      P.relationField.active = [];
      P.relationField.activations = 0;
      P.relationField.recombinations = 0;
      P.relationField.spirals = 0;
      P.relationField.lastActivationTick = null;
      if (P.relationField.latent) {
        P.relationField.latent.byId = new Map();
        P.relationField.latent.byClue = new Map();
        P.relationField.latent.activeIds = [];
        P.relationField.latent.cacheKey = null;
        P.relationField.latent.cacheEpisodes = [];
      }
      const supporters = [spec.sa, spec.sb];
      supporters.forEach((npc, i) => {
        const placeId = i === 0 ? spec.a : spec.b;
        P.relationHistory.push({ t: -20 + i, npc, place: placeId });
        P.seenNPC.add(npc);
      });
      const anchorA = chooseAnchor(new Set([spec.sa, spec.sb]));
      const anchorB = chooseAnchor(new Set([spec.sa, spec.sb, anchorA]));
      if (!anchorA || !anchorB) throw new Error('No valid anchors for matched initialization');
      P.relationHistory.push({ t: -18, npc: anchorA, place: currentId });
      P.relationHistory.push({ t: -17, npc: anchorB, place: currentId });
      P.seenNPC.add(anchorA);
      P.seenNPC.add(anchorB);
      P.relationField.episodes.push(
        { t: -10, key: pairKeyLocal(spec.sa, anchorA), a: spec.sa, b: anchorA, places: [spec.a, currentId], from: [-20, -18] },
        { t: -9, key: pairKeyLocal(spec.sb, anchorB), a: spec.sb, b: anchorB, places: [spec.b, currentId], from: [-19, -17] }
      );
      return S;
    }

    function directSupportIds(P, rowId) {
      if (!rowId || rowId.startsWith('hidden:')) return [];
      const ids = new Set();
      const gate = places[rowId]?.gate;
      if (gate && relationExists(P, gate)) ids.add(`relation-presence:${gate}`);
      for (const [npc, placeId] of npcs) if (placeId === rowId && relationExists(P, npc)) ids.add(`relation-presence:${npc}`);
      const activeKeys = new Set(P.relationField?.active || []);
      for (const ep of P.relationField?.episodes || []) {
        if (!activeKeys.has(ep.key)) continue;
        if ((ep.places || []).includes(rowId) || (gate && (ep.a === gate || ep.b === gate))) ids.add(`active-key:${ep.key}`);
      }
      return [...ids].sort();
    }

    function analyzeEligible(P, rows) {
      if (!rows.length) return null;
      const topVote = rows[0].votes;
      const top = rows.filter(r => r.votes === topVote);
      if (top.length < 2) return null;
      const support = new Map(top.map(r => [r.id, directSupportIds(P, r.id)]));
      const signatures = top.map(r => (support.get(r.id) || []).join('|'));
      if (!signatures.every(Boolean) || new Set(signatures).size < 2) return null;
      return { top, support };
    }

    function relationSalience(ids) {
      if (!ids.length) return null;
      return ids.reduce((a, id) => a + hash(`${PRIOR.seed}|${id}`), 0) / ids.length;
    }
    function placeboSalience(P, rowId) { return hash(`${PRIOR.seed}|PLACEBO|${P.id}|${rowId}`); }

    function adjustRows(P, rows, mode) {
      if (mode === 'NONE') return { rows, applied: false, eligible: false };
      const a = analyzeEligible(P, rows);
      if (!a) return { rows, applied: false, eligible: false };
      const top = a.top;
      const originalIndex = new Map(top.map((r, i) => [r.id, i]));
      let ranked;
      if (mode === 'RELATIONAL') {
        ranked = [...top].sort((x, y) => relationSalience(a.support.get(y.id)) - relationSalience(a.support.get(x.id)) || originalIndex.get(x.id) - originalIndex.get(y.id));
      } else if (mode === 'PLACEBO') {
        ranked = [...top].sort((x, y) => placeboSalience(P, y.id) - placeboSalience(P, x.id) || originalIndex.get(x.id) - originalIndex.get(y.id));
      } else {
        const rotated = new Map();
        top.forEach((r, i) => rotated.set(r.id, a.support.get(top[(i + 1) % top.length].id)));
        ranked = [...top].sort((x, y) => relationSalience(rotated.get(y.id)) - relationSalience(rotated.get(x.id)) || originalIndex.get(x.id) - originalIndex.get(y.id));
      }
      const rest = rows.slice(top.length);
      return { rows: [...ranked, ...rest], applied: true, eligible: true, topIds: top.map(r => r.id), support: a.support };
    }

    function findPredeclaredConfigs() {
      const selected = [];
      E = { tick: 0, worlds: {}, paused: true };
      for (const partyId of partyIds) {
        let count = 0;
        outer:
        for (const currentId of publicPlaceIds) {
          for (const danger of DANGER_LEVELS) {
            for (const spec of targetSupportPairs) {
              const config = { partyId, currentId, danger, spec };
              const S = initMatchedWorld(config);
              const P = S.parties.find(x => x.id === partyId);
              E.worlds = { scan: S };
              const rows = productionEvalP(S, P, 1).map(r => ({ id: r.id, votes: r.votes, voices: (r.voices || []).map(v => [v[0], v[1]]) }));
              if (analyzeEligible(P, rows)) {
                selected.push(config);
                count++;
                if (count === 2) break outer;
              }
            }
          }
        }
        if (count !== 2) throw new Error(`Could not find two eligible configs for ${partyId}`);
      }
      return selected;
    }

    const configs = findPredeclaredConfigs();
    const aggregate = {
      scenarios: configs.length,
      completedScenarios: 0,
      initialRelationalVsPlaceboChoiceDifferences: 0,
      initialRelationalVsPermutedChoiceDifferences: 0,
      scenariosWithRelationalVsPlaceboLongitudinalDivergence: 0,
      scenariosWithRelationalVsNoneLongitudinalDivergence: 0,
      scenariosWithRelationalVsPermutedLongitudinalDivergence: 0,
      scenariosWithFinalPastRelationalStructureDifferenceRelationalVsPlacebo: 0,
      scenariosWithChoiceDistributionDifferenceRelationalVsPlacebo: 0,
      totalTwinMismatchTicks: 0,
      experimenterInterventionCount: 0
    };
    const scenarioResults = [];

    function compactPartySig(S, partyId) {
      const P = S.parties.find(x => x.id === partyId);
      return JSON.stringify([
        P.target, currentPlace(P), P.leader, P.choiceHistory.length, P.relationHistory.length,
        [...P.disc].sort(), Object.entries(P.vis).sort(), [...P.hiddenCandidates].sort(), [...P.hiddenDone].sort(), [...P.seenNPC].sort(),
        P.relationField?.episodes?.length || 0, [...(P.relationField?.active || [])].sort(), P.relationField?.latent?.byId?.size || 0, [...(P.relationField?.latent?.activeIds || [])].sort(),
        ...P.members.flatMap(m => [m.name, Number(m.x.toFixed(8)), Number(m.y.toFixed(8)), Number(m.hp.toFixed(8))])
      ]);
    }

    function finalPartySummary(S, partyId, stats) {
      const P = S.parties.find(x => x.id === partyId);
      const relationKeys = new Set((P.relationField?.episodes || []).map(ep => ep.key).filter(Boolean));
      for (const ep of P.relationField?.latent?.byId?.values?.() || []) if (ep?.key) relationKeys.add(ep.key);
      return {
        target: P.target,
        currentPlace: currentPlace(P),
        decisions: stats.decisions,
        outcomes: stats.outcomes,
        priorAppliedDecisions: stats.priorAppliedDecisions,
        choiceHistogram: stats.choiceHistogram,
        relationHistoryLength: P.relationHistory.length,
        relationFieldEpisodeCount: P.relationField?.episodes?.length || 0,
        latentEpisodeCount: P.relationField?.latent?.byId?.size || 0,
        distinctRelationKeys: relationKeys.size,
        discoveredPlaces: [...P.disc].sort(),
        completedHiddenStories: [...P.hiddenDone].sort(),
        activeRelationKeys: [...(P.relationField?.active || [])].sort(),
        worldStructuralCounters: { ...S.c }
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

    for (let si = 0; si < configs.length; si++) {
      const config = configs[si];
      const worlds = {};
      const worldMeta = new Map();
      const stats = {};
      for (const mode of MODES) {
        stats[mode] = { decisions: 0, outcomes: 0, priorAppliedDecisions: 0, choiceHistogram: {}, initialChoice: null };
        const primary = initMatchedWorld(config);
        const twin = initMatchedWorld(config);
        worlds[mode] = primary;
        worlds[`${mode}_TWIN`] = twin;
        worldMeta.set(primary, { mode, primary: true, partyId: config.partyId });
        worldMeta.set(twin, { mode, primary: false, partyId: config.partyId });
      }
      E = { tick: 0, worlds, paused: true };
      let phase = null;

      evalP = function(S, P, use = 1) {
        const base = productionEvalP(S, P, use);
        const meta = worldMeta.get(S);
        if (!meta || use !== 1 || P.id !== meta.partyId) return base;
        const adjusted = adjustRows(P, base, meta.mode);
        if (phase && phase.S === S && phase.P === P && !phase.captured) {
          phase.captured = true;
          phase.applied = adjusted.applied;
          phase.eligible = adjusted.eligible;
          phase.baseTop = base[0]?.id || null;
          phase.finalTop = adjusted.rows[0]?.id || null;
        }
        return adjusted.rows;
      };

      choose = function(S, P) {
        const meta = worldMeta.get(S);
        if (!meta || P.id !== meta.partyId) { productionChoose(S, P); return; }
        phase = { S, P, captured: false, applied: false, eligible: false, baseTop: null, finalTop: null };
        productionChoose(S, P);
        const rec = phase;
        phase = null;
        if (meta.primary) {
          const st = stats[meta.mode];
          st.decisions++;
          st.choiceHistogram[P.target] = (st.choiceHistogram[P.target] || 0) + 1;
          if (rec.applied) st.priorAppliedDecisions++;
          if (st.initialChoice === null) st.initialChoice = P.target;
        }
      };

      outcome = function(S, P, id) {
        productionOutcome(S, P, id);
        const meta = worldMeta.get(S);
        if (meta?.primary && P.id === meta.partyId) stats[meta.mode].outcomes++;
      };

      // The run begins with the system's own decision function applied once to the fixed initial state.
      for (const mode of MODES) {
        choose(worlds[mode], worlds[mode].parties.find(x => x.id === config.partyId));
        choose(worlds[`${mode}_TWIN`], worlds[`${mode}_TWIN`].parties.find(x => x.id === config.partyId));
      }

      let firstRelVsPlacebo = compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.PLACEBO, config.partyId) ? 0 : null;
      let firstRelVsNone = compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.NONE, config.partyId) ? 0 : null;
      let firstRelVsPerm = compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.SUPPORT_PERMUTED, config.partyId) ? 0 : null;
      if (stats.RELATIONAL.initialChoice !== stats.PLACEBO.initialChoice) aggregate.initialRelationalVsPlaceboChoiceDifferences++;
      if (stats.RELATIONAL.initialChoice !== stats.SUPPORT_PERMUTED.initialChoice) aggregate.initialRelationalVsPermutedChoiceDifferences++;

      const twinMismatch = Object.fromEntries(MODES.map(m => [m, 0]));
      for (let t = 1; t <= HORIZON; t++) {
        E.tick = t;
        const ex = env(t);
        for (const mode of MODES) {
          tickW(worlds[mode], clone(ex));
          tickW(worlds[`${mode}_TWIN`], clone(ex));
          if (compactPartySig(worlds[mode], config.partyId) !== compactPartySig(worlds[`${mode}_TWIN`], config.partyId)) twinMismatch[mode]++;
        }
        if (firstRelVsPlacebo === null && compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.PLACEBO, config.partyId)) firstRelVsPlacebo = t;
        if (firstRelVsNone === null && compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.NONE, config.partyId)) firstRelVsNone = t;
        if (firstRelVsPerm === null && compactPartySig(worlds.RELATIONAL, config.partyId) !== compactPartySig(worlds.SUPPORT_PERMUTED, config.partyId)) firstRelVsPerm = t;
      }

      const summaries = Object.fromEntries(MODES.map(mode => [mode, finalPartySummary(worlds[mode], config.partyId, stats[mode])]));
      const tvRelPlacebo = totalVariation(summaries.RELATIONAL.choiceHistogram, summaries.PLACEBO.choiceHistogram);
      const prsRel = JSON.stringify([summaries.RELATIONAL.relationHistoryLength, summaries.RELATIONAL.relationFieldEpisodeCount, summaries.RELATIONAL.latentEpisodeCount, summaries.RELATIONAL.distinctRelationKeys, summaries.RELATIONAL.discoveredPlaces, summaries.RELATIONAL.completedHiddenStories]);
      const prsPlacebo = JSON.stringify([summaries.PLACEBO.relationHistoryLength, summaries.PLACEBO.relationFieldEpisodeCount, summaries.PLACEBO.latentEpisodeCount, summaries.PLACEBO.distinctRelationKeys, summaries.PLACEBO.discoveredPlaces, summaries.PLACEBO.completedHiddenStories]);

      if (firstRelVsPlacebo !== null) aggregate.scenariosWithRelationalVsPlaceboLongitudinalDivergence++;
      if (firstRelVsNone !== null) aggregate.scenariosWithRelationalVsNoneLongitudinalDivergence++;
      if (firstRelVsPerm !== null) aggregate.scenariosWithRelationalVsPermutedLongitudinalDivergence++;
      if (prsRel !== prsPlacebo) aggregate.scenariosWithFinalPastRelationalStructureDifferenceRelationalVsPlacebo++;
      if (tvRelPlacebo > 0) aggregate.scenariosWithChoiceDistributionDifferenceRelationalVsPlacebo++;
      const twinTotal = Object.values(twinMismatch).reduce((a, b) => a + b, 0);
      aggregate.totalTwinMismatchTicks += twinTotal;
      aggregate.completedScenarios++;

      scenarioResults.push({
        scenarioIndex: si + 1,
        config,
        horizon: HORIZON,
        initialChoices: Object.fromEntries(MODES.map(m => [m, stats[m].initialChoice])),
        firstDivergenceTick: { relationalVsPlacebo: firstRelVsPlacebo, relationalVsNone: firstRelVsNone, relationalVsSupportPermuted: firstRelVsPerm },
        twinMismatchTicks: twinMismatch,
        choiceDistributionTotalVariationRelationalVsPlacebo: tvRelPlacebo,
        finalPastRelationalStructureDifferenceRelationalVsPlacebo: prsRel !== prsPlacebo,
        conditions: summaries
      });
    }

    evalP = productionEvalP;
    choose = productionChoose;
    outcome = productionOutcome;
    E = savedE;

    const validity = {
      sixPredeclaredEligibleScenarios: configs.length === 6,
      twoPerParty: partyIds.every(p => configs.filter(c => c.partyId === p).length === 2),
      completedAllScenarios: aggregate.completedScenarios === 6,
      deterministicTwins: aggregate.totalTwinMismatchTicks === 0,
      noExperimenterInterventionAfterInitialization: aggregate.experimenterInterventionCount === 0
    };
    const valid = Object.values(validity).every(Boolean);
    const evidence = {
      longitudinalRelationalDispositionEffect:
        aggregate.scenariosWithRelationalVsPlaceboLongitudinalDivergence > 0 && valid
          ? 'LONGITUDINAL_DIVERGENCE_OBSERVED_BETWEEN_RELATIONAL_PRIOR_AND_MATCHED_CANDIDATE_ONLY_PLACEBO'
          : 'NO_LONGITUDINAL_RELATIONAL_VS_PLACEBO_DIVERGENCE_WITHIN_HORIZON',
      downstreamPastRelationalStructureEffect:
        aggregate.scenariosWithFinalPastRelationalStructureDifferenceRelationalVsPlacebo > 0 && valid
          ? 'DOWNSTREAM_PAST_RELATIONAL_STRUCTURE_DIFFERENCE_OBSERVED_IN_AT_LEAST_ONE_MATCHED_SCENARIO'
          : 'NO_DOWNSTREAM_PAST_RELATIONAL_STRUCTURE_DIFFERENCE_OBSERVED_WITHIN_HORIZON',
      dispositionNecessity: 'NOT_ESTABLISHED; NONE REMAINS BEHAVIORALLY ACTIVE',
      dispositionSufficiency: 'NOT_ESTABLISHED',
      universalGeneralization: 'NOT_ESTABLISHED'
    };

    return {
      experiment: 'EX-04P-D Longitudinal Relational-Disposition Matched Branch Test',
      fixedPrior: PRIOR,
      horizon: HORIZON,
      selectedConfigs: configs,
      selectionRule: 'first two eligible configurations per party in the same predeclared lexicographic factorial order used by EX-04P-C; selection uses eligibility only, not branch outcomes',
      design: {
        conditions: MODES,
        priorFixedBeforeRun: true,
        priorActsOnlyOnSelectedParty: true,
        priorActsOnlyAtTopVoteTiesWithNonemptyDistinctDirectRelationalSupport: true,
        candidateOnlyPlaceboUsesSameEligibilityGate: true,
        supportPermutedConditionPreservesBaseVotesAndCandidateMembership: true,
        systemDecisionFunctionInvokedAtTick0FromFixedInitialState: true,
        sameExogenousEnvironmentWithinScenario: true,
        deterministicTwinPerCondition: true,
        noMidRunPriorMutation: true,
        noMidRunRelationOrCandidateManipulation: true
      },
      validity,
      valid,
      aggregate,
      scenarios: scenarioResults,
      evidence,
      interpretationBoundary: [
        'This experiment tests longitudinal causal consequences of a predeclared minimum relational-attention disposition operationalization against NONE, candidate-only placebo, and support-permuted controls.',
        'The operationalization is engineered and therefore does not prove a naturally existing or universal form of personality.',
        'A branch difference supports causal contribution of relation-conditioned tie resolution within this harness, not necessity or sufficiency of disposition for behavior.',
        'Later divergence after the first differing realization is an accumulated consequence of divergent realized experience and Past Relational Structure; it is not attributed as a direct effect at every later tick.',
        'The six matched scenarios are selected by eligibility only and are not a natural-frequency sample.'
      ]
    };
  }, { PRIOR, DANGER_LEVELS, MODES, HORIZON });

  await writeFile(REPORT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ valid: result.valid, aggregate: result.aggregate, evidence: result.evidence, selectedConfigs: result.selectedConfigs, scenarioDigest: result.scenarios.map(s => ({ scenarioIndex: s.scenarioIndex, partyId: s.config.partyId, initialChoices: s.initialChoices, firstDivergenceTick: s.firstDivergenceTick, twinMismatchTicks: s.twinMismatchTicks, tvRelVsPlacebo: s.choiceDistributionTotalVariationRelationalVsPlacebo, prsDifference: s.finalPastRelationalStructureDifferenceRelationalVsPlacebo })) }, null, 2));
  if (!result.valid) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
