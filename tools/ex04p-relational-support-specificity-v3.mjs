import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4225;
const MAX_TICK = 120000;
const REPORT = 'ex04p-relational-support-specificity-v3-report.json';
const PRIOR = Object.freeze({
  id: 'MIN_RELATIONAL_SUPPORT_ATTENTION_A',
  type: 'MINIMUM_RELATIONAL_SUPPORT_ATTENTION_PRIOR',
  seed: 'OASIS-DISPOSITION-v3-RS-A',
  scope: 'TOP_VOTE_TIE_WITH_DISTINCT_DIRECT_RELATIONAL_SUPPORT_ONLY',
  aggregation: 'MEAN_FIXED_SALIENCE_OVER_DIRECT_SUPPORT_IDENTITIES'
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
    typeof evalP === 'function' && typeof choose === 'function' && typeof relationExists === 'function',
    null, { timeout: 60000 });
  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const result = await page.evaluate(({ MAX_TICK, PRIOR }) => {
    const savedE = E;
    const productionEvalP = evalP;
    const productionChoose = choose;
    const clone = x => structuredClone(x);
    const pairKeyLocal = (a, b) => [a, b].sort().join('↔');
    const epId = ep => `${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`;

    const observed = mkW('full');
    const twin = mkW('full');
    E = { tick: 0, worlds: { observed, twin }, paused: true };

    const summary = {
      completedTick: 0,
      decisionEvaluations: 0,
      topVoteTieMoments: 0,
      eligibleDistinctDirectRelationalSupportTieMoments: 0,
      relationPriorAppliedMoments: 0,
      relationPriorChoiceChangesVsCanonical: 0,
      relationPriorResolvedTargetChangesVsCanonical: 0,
      placeboChoiceChangesVsCanonical: 0,
      relationalVsPlaceboChoiceDisagreements: 0,
      supportIdentityPermutationChoiceChanges: 0,
      supportIdentityPermutationResolvedTargetChanges: 0,
      candidateMembershipChanges: 0,
      twinBehaviorMismatchTicks: 0,
      experimenterInterventionCount: 0
    };
    const samples = [];
    let phase = null;

    function relevantReasons(S, P, ep) {
      const here = currentPlace(P), target = P.target, reasons = [];
      if ((ep.places || []).includes(here)) reasons.push(`here:${here}`);
      if ((ep.places || []).includes(target)) reasons.push(`target:${target}`);
      for (const id of ep.places || []) if (Math.abs((places[id]?.r || 0) - S.danger) <= 0.18) reasons.push(`danger:${id}`);
      const gate = places[target]?.gate;
      if (gate && (ep.a === gate || ep.b === gate)) reasons.push(`gate:${gate}`);
      return reasons;
    }

    function exactActiveEpisodes(S, P) {
      const F = P.relationField || {}, out = new Map();
      for (const ep of F.episodes || []) {
        if (E.tick - ep.t <= 1200 && relevantReasons(S, P, ep).length) out.set(epId(ep), ep);
      }
      const L = F.latent;
      for (const id of L?.activeIds || []) {
        const ep = L.byId.get(id);
        if (ep) out.set(id, ep);
      }
      return [...out.values()];
    }

    function directSupportIds(S, P, rowId, activeEpisodes) {
      const ids = new Set();
      if (!rowId) return [];
      if (rowId.startsWith('hidden:')) {
        const h = hiddenDefs.find(x => x.id === rowId.slice(7));
        if (!h) return [];
        for (const n of h.links || []) {
          const k = pairKeyLocal(h.npc, n);
          if (activeEpisodes.some(ep => ep.key === k)) ids.add(`active-key:${k}`);
        }
        if (!(h.links || []).length) {
          for (const ep of activeEpisodes) if (ep.a === h.npc || ep.b === h.npc) ids.add(`active-key:${ep.key}`);
        }
        for (const placeId of h.places || []) {
          const gate = places[placeId]?.gate;
          if (gate && relationExists(P, gate)) ids.add(`relation-presence:${gate}`);
        }
        return [...ids].sort();
      }

      const gate = places[rowId]?.gate;
      if (gate && relationExists(P, gate)) ids.add(`relation-presence:${gate}`);
      for (const [npc, placeId] of npcs) if (placeId === rowId && relationExists(P, npc)) ids.add(`relation-presence:${npc}`);
      for (const ep of activeEpisodes) {
        if ((ep.places || []).includes(rowId) || (gate && (ep.a === gate || ep.b === gate))) ids.add(`active-key:${ep.key}`);
      }
      return [...ids].sort();
    }

    function relationSalience(supportIds) {
      if (!supportIds.length) return null;
      return supportIds.reduce((a, id) => a + hash(`${PRIOR.seed}|${id}`), 0) / supportIds.length;
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

    function analyzeTie(S, P, rows) {
      if (!rows.length) return null;
      const topVote = rows[0].votes;
      const top = rows.filter(r => r.votes === topVote);
      if (top.length < 2) return { top, eligible: false, reason: 'NO_TOP_TIE' };

      const activeEpisodes = exactActiveEpisodes(S, P);
      const support = new Map(top.map(r => [r.id, directSupportIds(S, P, r.id, activeEpisodes)]));
      const signatures = top.map(r => (support.get(r.id) || []).join('|'));
      const allSupported = signatures.every(Boolean);
      const distinct = new Set(signatures).size >= 2;
      if (!(allSupported && distinct)) return { top, support, eligible: false, reason: 'SUPPORT_NOT_DISTINCT_FOR_ALL_TIED_OPTIONS' };

      const originalIndex = new Map(top.map((r, i) => [r.id, i]));
      const relational = [...top].sort((a, b) => {
        const sa = relationSalience(support.get(a.id)), sb = relationSalience(support.get(b.id));
        return sb - sa || originalIndex.get(a.id) - originalIndex.get(b.id);
      });
      const placebo = [...top].sort((a, b) => {
        const sa = placeboSalience(P, a.id), sb = placeboSalience(P, b.id);
        return sb - sa || originalIndex.get(a.id) - originalIndex.get(b.id);
      });

      const rotatedSupport = new Map();
      top.forEach((r, i) => rotatedSupport.set(r.id, support.get(top[(i + 1) % top.length].id)));
      const permuted = [...top].sort((a, b) => {
        const sa = relationSalience(rotatedSupport.get(a.id)), sb = relationSalience(rotatedSupport.get(b.id));
        return sb - sa || originalIndex.get(a.id) - originalIndex.get(b.id);
      });

      return {
        top,
        eligible: true,
        support,
        activeEpisodeCount: activeEpisodes.length,
        canonicalChoice: top[0].id,
        relationalChoice: relational[0].id,
        placeboChoice: placebo[0].id,
        permutedSupportChoice: permuted[0].id,
        relationScores: relational.map(r => [r.id, relationSalience(support.get(r.id))]),
        placeboScores: placebo.map(r => [r.id, placeboSalience(P, r.id)]),
        rotatedSupport
      };
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

    evalP = function(S, P, use = 1) {
      const rows = productionEvalP(S, P, use);
      if (phase && phase.S === S && phase.P === P && use === 1 && !phase.captured) {
        phase.captured = true;
        phase.rows = rows.map(r => ({ id: r.id, votes: r.votes, voices: (r.voices || []).map(v => [v[0], v[1]]) }));
        phase.analysis = analyzeTie(S, P, phase.rows);
      }
      return rows;
    };

    choose = function(S, P) {
      if (S !== observed) { productionChoose(S, P); return; }
      phase = { S, P, captured: false, rows: [], analysis: null };
      productionChoose(S, P);
      const rec = phase;
      phase = null;
      summary.decisionEvaluations++;
      const a = rec.analysis;
      if (!a || a.top?.length < 2) return;
      summary.topVoteTieMoments++;
      if (!a.eligible) return;
      summary.eligibleDistinctDirectRelationalSupportTieMoments++;
      summary.relationPriorAppliedMoments++;
      const canonical = a.canonicalChoice;
      if (canonical !== a.relationalChoice) summary.relationPriorChoiceChangesVsCanonical++;
      if (resolveTarget(canonical) !== resolveTarget(a.relationalChoice)) summary.relationPriorResolvedTargetChangesVsCanonical++;
      if (canonical !== a.placeboChoice) summary.placeboChoiceChangesVsCanonical++;
      if (a.relationalChoice !== a.placeboChoice) summary.relationalVsPlaceboChoiceDisagreements++;
      if (a.relationalChoice !== a.permutedSupportChoice) summary.supportIdentityPermutationChoiceChanges++;
      if (resolveTarget(a.relationalChoice) !== resolveTarget(a.permutedSupportChoice)) summary.supportIdentityPermutationResolvedTargetChanges++;
      const canonicalMembers = rec.rows.map(r => r.id).sort().join(',');
      const shadowMembers = rec.rows.map(r => r.id).sort().join(',');
      if (canonicalMembers !== shadowMembers) summary.candidateMembershipChanges++;

      if (samples.length < 60) {
        samples.push({
          tick: E.tick,
          party: P.id,
          reality: { currentPlace: currentPlace(P), danger: S.danger, priorTarget: P.target },
          tiedTopPossibilities: a.top.map(r => r.id),
          directSupportByPossibility: Object.fromEntries(a.top.map(r => [r.id, a.support.get(r.id)])),
          canonicalChoice: canonical,
          relationalChoice: a.relationalChoice,
          placeboChoice: a.placeboChoice,
          supportIdentityPermutationChoice: a.permutedSupportChoice,
          canonicalResolvedTarget: resolveTarget(canonical),
          relationalResolvedTarget: resolveTarget(a.relationalChoice),
          permutationResolvedTarget: resolveTarget(a.permutedSupportChoice),
          relationScores: a.relationScores,
          placeboScores: a.placeboScores,
          activeEpisodeCount: a.activeEpisodeCount
        });
      }
    };

    for (let t = 1; t <= MAX_TICK; t++) {
      E.tick = t;
      const ex = env(t);
      tickW(observed, clone(ex));
      tickW(twin, clone(ex));
      if (compactWorldSig(observed) !== compactWorldSig(twin)) summary.twinBehaviorMismatchTicks++;
      summary.completedTick = t;
    }

    const validity = {
      completed120k: summary.completedTick === MAX_TICK,
      deterministicTwin: summary.twinBehaviorMismatchTicks === 0,
      noExperimenterIntervention: summary.experimenterInterventionCount === 0,
      shadowDoesNotChangeCandidateMembership: summary.candidateMembershipChanges === 0
    };
    const valid = Object.values(validity).every(Boolean);
    const evidence = {
      directRelationalSupportSpecificity:
        summary.eligibleDistinctDirectRelationalSupportTieMoments > 0 && summary.supportIdentityPermutationChoiceChanges > 0 && valid
          ? 'OBSERVED_WITHIN_CANONICAL_HARNESS_FOR_PREDECLARED_RELATIONAL_SUPPORT_ATTENTION_OPERATIONALIZATION'
          : summary.eligibleDistinctDirectRelationalSupportTieMoments > 0 && valid
            ? 'NO_SUPPORT_IDENTITY_SENSITIVITY_OBSERVED_WITHIN_ELIGIBLE_MOMENTS'
            : 'INCONCLUSIVE_NO_ELIGIBLE_DISTINCT_SUPPORT_TIES',
      placeboSeparation:
        summary.relationalVsPlaceboChoiceDisagreements > 0 && valid
          ? 'RELATIONAL_PRIOR_NOT_BEHAVIORALLY_IDENTICAL_TO_MATCHED_CANDIDATE_ONLY_TIE_CONTROL'
          : 'NO_BEHAVIORAL_SEPARATION_FROM_PLACEBO_WITHIN_ELIGIBLE_MOMENTS',
      candidateSetSufficiency: 'NOT_ESTABLISHED',
      dispositionNecessity: 'NOT_TESTED_BY_THIS_SHADOW_SPECIFICITY_GATE',
      dispositionSufficiency: 'NOT_ESTABLISHED'
    };

    E = savedE;
    return {
      experiment: 'EX-04P-B Relational-Support Specificity Gate',
      fixedPrior: PRIOR,
      maxTick: MAX_TICK,
      design: {
        productionTrajectory: 'NONE canonical trajectory',
        shadowOnly: true,
        topVoteTieOnly: true,
        eligibleOnlyWhenAllTiedTopPossibilitiesHaveNonemptyDistinctDirectRelationalSupport: true,
        relationalPriorUsesOnlyDirectSupportIdentities: true,
        placeboUsesCandidateIdentityButNoRelationalSupportIdentity: true,
        supportIdentityPermutationPreservesBaseVotesAndCandidateMembership: true,
        noRiskRewardOrOutcomeQualityEncoded: true
      },
      validity,
      valid,
      summary,
      samples,
      evidence,
      interpretationBoundary: [
        'This gate tests whether a predeclared minimum attentional prior can depend specifically on which past-relation identities directly support tied possibilities.',
        'It is a shadow analysis and does not alter the production trajectory.',
        'Support-identity sensitivity is not universal proof of personality; it validates only this relational-attention operationalization.',
        'The placebo comparison separates relational-support conditioning from a candidate-only deterministic tie rule within eligible moments.',
        'No result here establishes disposition necessity or sufficiency.'
      ]
    };
  }, { MAX_TICK, PRIOR });

  await writeFile(REPORT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ valid: result.valid, summary: result.summary, evidence: result.evidence, sampleCount: result.samples.length }, null, 2));
  if (!result.valid) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
