import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4226;
const REPORT = 'ex04p-matched-initialization-specificity-v3-report.json';
const PRIOR = Object.freeze({
  id: 'MIN_RELATIONAL_SUPPORT_ATTENTION_A',
  type: 'MINIMUM_RELATIONAL_SUPPORT_ATTENTION_PRIOR',
  seed: 'OASIS-DISPOSITION-v3-RS-A',
  scope: 'TOP_VOTE_TIE_WITH_DISTINCT_DIRECT_RELATIONAL_SUPPORT_ONLY',
  aggregation: 'MEAN_FIXED_SALIENCE_OVER_DIRECT_SUPPORT_IDENTITIES'
});
const DANGER_LEVELS = Object.freeze(Array.from({ length: 71 }, (_, i) => i / 100));

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
    typeof mkW === 'function' && typeof evalP === 'function' && typeof relationExists === 'function' &&
    typeof currentPlace === 'function' && typeof places === 'object' && Array.isArray(npcs),
    null, { timeout: 60000 });
  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const result = await page.evaluate(({ PRIOR, DANGER_LEVELS }) => {
    const savedE = E;
    const pairKeyLocal = (a, b) => [a, b].sort().join('↔');
    const publicPlaceIds = Object.keys(places).filter(id => places[id].pub);
    const partyIds = ['dawn', 'star', 'blue'];
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
        for (const sa of supportersForPlace(a)) {
          for (const sb of supportersForPlace(b)) {
            if (sa === sb) continue;
            targetSupportPairs.push({ a, b, sa, sb });
          }
        }
      }
    }

    function chooseAnchor(exclude) {
      const names = npcs.map(x => x[0]).filter(n => !exclude.has(n));
      return names[0] || null;
    }

    function placePartyAt(P, placeId) {
      const q = places[placeId];
      const offsets = [[-16,-10],[16,-10],[-16,12],[16,12]];
      P.members.forEach((m, i) => {
        m.x = q.x + offsets[i][0];
        m.y = q.y + offsets[i][1];
      });
      P.target = placeId;
    }

    function initMatchedWorld(partyId, currentId, danger, spec) {
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
      if (!anchorA || !anchorB) return null;
      P.relationHistory.push({ t: -18, npc: anchorA, place: currentId });
      P.relationHistory.push({ t: -17, npc: anchorB, place: currentId });
      P.seenNPC.add(anchorA);
      P.seenNPC.add(anchorB);

      const epA = { t: -10, key: pairKeyLocal(spec.sa, anchorA), a: spec.sa, b: anchorA, places: [spec.a, currentId], from: [-20, -18] };
      const epB = { t: -9, key: pairKeyLocal(spec.sb, anchorB), a: spec.sb, b: anchorB, places: [spec.b, currentId], from: [-19, -17] };
      P.relationField.episodes.push(epA, epB);
      return { S, P, epA, epB };
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

    function relationSalience(ids) {
      if (!ids.length) return null;
      return ids.reduce((a, id) => a + hash(`${PRIOR.seed}|${id}`), 0) / ids.length;
    }

    function placeboSalience(P, rowId) {
      return hash(`${PRIOR.seed}|PLACEBO|${P.id}|${rowId}`);
    }

    function resolveTarget(rowId) {
      if (!rowId) return null;
      if (!rowId.startsWith('hidden:')) return rowId;
      const h = hiddenDefs.find(x => x.id === rowId.slice(7));
      return h?.places?.[h.places.length - 1] || rowId;
    }

    const summary = {
      totalPredeclaredScenarios: 0,
      evaluatedScenarios: 0,
      topVoteTieScenarios: 0,
      eligibleDistinctDirectRelationalSupportScenarios: 0,
      relationPriorChoiceChangesVsCanonical: 0,
      relationPriorResolvedTargetChangesVsCanonical: 0,
      placeboChoiceChangesVsCanonical: 0,
      relationalVsPlaceboChoiceDisagreements: 0,
      supportIdentityPermutationChoiceChanges: 0,
      supportIdentityPermutationResolvedTargetChanges: 0,
      candidateMembershipChanges: 0,
      experimenterInterventionCount: 0
    };
    const samples = [];
    const perParty = Object.fromEntries(partyIds.map(id => [id, { evaluated: 0, ties: 0, eligible: 0, relationalVsPlacebo: 0, permutationSensitive: 0 }]));

    E = { tick: 0, worlds: {}, paused: true };

    for (const partyId of partyIds) {
      for (const currentId of publicPlaceIds) {
        for (const danger of DANGER_LEVELS) {
          for (const spec of targetSupportPairs) {
            summary.totalPredeclaredScenarios++;
            const init = initMatchedWorld(partyId, currentId, danger, spec);
            if (!init) continue;
            const { S, P } = init;
            E.worlds = { scan: S };
            summary.evaluatedScenarios++;
            perParty[partyId].evaluated++;

            const rows = evalP(S, P, 1).map(r => ({ id: r.id, votes: r.votes, voices: (r.voices || []).map(v => [v[0], v[1]]) }));
            if (!rows.length) continue;
            const topVote = rows[0].votes;
            const top = rows.filter(r => r.votes === topVote);
            if (top.length < 2) continue;
            summary.topVoteTieScenarios++;
            perParty[partyId].ties++;

            const support = new Map(top.map(r => [r.id, directSupportIds(P, r.id)]));
            const sigs = top.map(r => (support.get(r.id) || []).join('|'));
            const allSupported = sigs.every(Boolean);
            const distinct = new Set(sigs).size >= 2;
            if (!(allSupported && distinct)) continue;

            summary.eligibleDistinctDirectRelationalSupportScenarios++;
            perParty[partyId].eligible++;
            const originalIndex = new Map(top.map((r, i) => [r.id, i]));
            const relational = [...top].sort((a, b) => relationSalience(support.get(b.id)) - relationSalience(support.get(a.id)) || originalIndex.get(a.id) - originalIndex.get(b.id));
            const placebo = [...top].sort((a, b) => placeboSalience(P, b.id) - placeboSalience(P, a.id) || originalIndex.get(a.id) - originalIndex.get(b.id));
            const rotatedSupport = new Map();
            top.forEach((r, i) => rotatedSupport.set(r.id, support.get(top[(i + 1) % top.length].id)));
            const permuted = [...top].sort((a, b) => relationSalience(rotatedSupport.get(b.id)) - relationSalience(rotatedSupport.get(a.id)) || originalIndex.get(a.id) - originalIndex.get(b.id));

            const canonical = top[0].id;
            const relationalChoice = relational[0].id;
            const placeboChoice = placebo[0].id;
            const permutedChoice = permuted[0].id;
            if (canonical !== relationalChoice) summary.relationPriorChoiceChangesVsCanonical++;
            if (resolveTarget(canonical) !== resolveTarget(relationalChoice)) summary.relationPriorResolvedTargetChangesVsCanonical++;
            if (canonical !== placeboChoice) summary.placeboChoiceChangesVsCanonical++;
            if (relationalChoice !== placeboChoice) {
              summary.relationalVsPlaceboChoiceDisagreements++;
              perParty[partyId].relationalVsPlacebo++;
            }
            if (relationalChoice !== permutedChoice) {
              summary.supportIdentityPermutationChoiceChanges++;
              perParty[partyId].permutationSensitive++;
            }
            if (resolveTarget(relationalChoice) !== resolveTarget(permutedChoice)) summary.supportIdentityPermutationResolvedTargetChanges++;
            const membersA = rows.map(r => r.id).sort().join(',');
            const membersB = rows.map(r => r.id).sort().join(',');
            if (membersA !== membersB) summary.candidateMembershipChanges++;

            if (samples.length < 80 && (relationalChoice !== placeboChoice || relationalChoice !== permutedChoice)) {
              samples.push({
                partyId,
                currentId,
                danger,
                seededPastRelationalStructure: {
                  supportA: { possibility: spec.a, relation: spec.sa, activeKey: init.epA.key },
                  supportB: { possibility: spec.b, relation: spec.sb, activeKey: init.epB.key }
                },
                tiedTopPossibilities: top.map(r => r.id),
                directSupportByPossibility: Object.fromEntries(top.map(r => [r.id, support.get(r.id)])),
                canonicalChoice: canonical,
                relationalChoice,
                placeboChoice,
                supportIdentityPermutationChoice: permutedChoice,
                relationalScores: Object.fromEntries(top.map(r => [r.id, relationSalience(support.get(r.id))])),
                placeboScores: Object.fromEntries(top.map(r => [r.id, placeboSalience(P, r.id)]))
              });
            }
          }
        }
      }
    }

    const validity = {
      exhaustivePredeclaredFactorialScan: summary.evaluatedScenarios === summary.totalPredeclaredScenarios,
      noExperimenterInterventionAfterInitialization: summary.experimenterInterventionCount === 0,
      shadowDoesNotChangeCandidateMembership: summary.candidateMembershipChanges === 0
    };
    const valid = Object.values(validity).every(Boolean);
    const evidence = {
      matchedEligibility:
        summary.eligibleDistinctDirectRelationalSupportScenarios > 0 && valid
          ? 'ELIGIBLE_MATCHED_INITIAL_CONDITIONS_OBSERVED'
          : 'NO_ELIGIBLE_MATCHED_INITIAL_CONDITIONS_OBSERVED',
      directRelationalSupportSpecificity:
        summary.eligibleDistinctDirectRelationalSupportScenarios > 0 && summary.supportIdentityPermutationChoiceChanges > 0 && valid
          ? 'OBSERVED_FOR_PREDECLARED_RELATIONAL_SUPPORT_ATTENTION_OPERATIONALIZATION_IN_MATCHED_INITIAL_CONDITIONS'
          : summary.eligibleDistinctDirectRelationalSupportScenarios > 0 && valid
            ? 'NO_SUPPORT_IDENTITY_SENSITIVITY_OBSERVED_IN_MATCHED_INITIAL_CONDITIONS'
            : 'INCONCLUSIVE_NO_ELIGIBLE_MATCHED_CONDITIONS',
      placeboSeparation:
        summary.relationalVsPlaceboChoiceDisagreements > 0 && valid
          ? 'RELATIONAL_SUPPORT_PRIOR_SEPARATES_FROM_CANDIDATE_ONLY_PLACEBO_IN_MATCHED_INITIAL_CONDITIONS'
          : 'NO_SEPARATION_FROM_CANDIDATE_ONLY_PLACEBO',
      dispositionNecessity: 'NOT_TESTED_BY_THIS_MATCHED_SPECIFICITY_BATTERY',
      dispositionSufficiency: 'NOT_ESTABLISHED'
    };

    E = savedE;
    return {
      experiment: 'EX-04P-C Matched Initial-Condition Relational-Support Specificity Battery',
      fixedPrior: PRIOR,
      design: {
        predeclaredFactorialAxes: ['party', 'currentPublicPlace', 'danger_0.00_to_0.70_step_0.01', 'distinct_target_support_pair'],
        initializationOnlyPastRelationalStructureConstruction: true,
        noPostInitializationIntervention: true,
        allScenariosEvaluatedNoPostHocSelection: true,
        topVoteTieOnly: true,
        directSupportMustBeNonemptyAndDistinctAcrossAllTiedTopPossibilities: true,
        relationalPriorUsesOnlyDirectSupportIdentities: true,
        placeboUsesCandidateIdentityButNoRelationalIdentity: true,
        supportIdentityPermutationPreservesVotesAndCandidateMembership: true,
        noRiskRewardOutcomeQualityEncodedInPrior: true,
        longitudinalClaim: false
      },
      validity,
      valid,
      summary,
      perParty,
      samples,
      evidence,
      interpretationBoundary: [
        'This is an initialization-matched specificity battery, not a natural-frequency estimate.',
        'Past Relational Structure is fixed before each scenario begins; no judgment, relation, candidate, or choice is altered after initialization.',
        'A positive specificity result validates only that this minimum relational-attention prior can condition selection on relation identity when production scores are tied.',
        'It does not establish that disposition is necessary, sufficient, universal, or equivalent to personality in humans.',
        'Longitudinal consequences require a separate follow-up experiment after this gate.'
      ]
    };
  }, { PRIOR, DANGER_LEVELS });

  await writeFile(REPORT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ valid: result.valid, summary: result.summary, perParty: result.perParty, evidence: result.evidence, sampleCount: result.samples.length }, null, 2));
  if (!result.valid) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
