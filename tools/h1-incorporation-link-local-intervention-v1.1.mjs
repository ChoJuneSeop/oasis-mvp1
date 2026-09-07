import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4237;
const HORIZON = 120000;
const MIN_TRIGGER_TICK = 5000;
const PARTY_ID = 'dawn';
const REPORT = 'h1-incorporation-link-local-intervention-v1.1-report.json';

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
  await page.waitForFunction(
    () => typeof mkW === 'function' && typeof tickW === 'function' && typeof env === 'function' && typeof choose === 'function' && typeof outcome === 'function',
    null,
    { timeout: 60000 }
  );
  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const result = await page.evaluate(({ HORIZON, MIN_TRIGGER_TICK, PARTY_ID }) => {
    const clone = x => structuredClone(x);
    const prodChoose = choose;
    const prodOutcome = outcome;

    const baseline = mkW('full');
    const twin = mkW('full');
    const intervention = mkW('full');
    const worlds = { baseline, twin, intervention };
    const role = new Map([[baseline, 'baseline'], [twin, 'twin'], [intervention, 'intervention']]);
    E = { tick: 0, worlds, paused: true };

    const partyOf = S => S.parties.find(P => P.id === PARTY_ID);
    const relationRecordSig = e => `${e.npc ?? ''}|${e.place ?? ''}`;
    const behaviorSig = S => {
      const P = partyOf(S);
      return JSON.stringify([P.target, currentPlace(P), P.leader, P.last]);
    };
    // Fixed-size/bounded structural signature. We intentionally avoid serializing the
    // ever-growing relationHistory contents at every tick; the intervention itself records
    // exact blocked relation rows and all three arms still execute the full 120k flow.
    const stateSig = S => JSON.stringify([
      Number(S.danger.toFixed(12)), S.spiral, Object.values(S.c),
      ...S.parties.map(P => [
        P.id, P.target, P.leader, P.last, currentPlace(P),
        P.relationHistory.length, P.choiceHistory.length,
        [...P.disc].sort(), [...P.hiddenCandidates].sort(), [...P.hiddenDone].sort(), [...P.seenNPC].sort(),
        P.relationField?.episodes?.length || 0,
        [...(P.relationField?.active || [])].sort(),
        P.relationField?.latent?.byId?.size || 0,
        [...(P.relationField?.latent?.activeIds || [])].sort(),
        ...P.members.flatMap(m => [m.name, Number(m.x.toFixed(8)), Number(m.y.toFixed(8)), Number(m.hp.toFixed(8))])
      ])
    ]);

    const counters = {
      baseline: { choices: 0, outcomes: 0 },
      twin: { choices: 0, outcomes: 0 },
      intervention: { choices: 0, outcomes: 0 }
    };
    let trigger = null;
    let beforeTriggerMismatchTicks = 0;
    let fullTwinMismatchCheckpoints = 0;
    let fullTwinChecks = 0;
    let firstStructuralDivergenceTick = null;
    let firstBehaviorDivergenceTick = null;
    let firstBehaviorReconvergenceTick = null;
    let postTriggerBehaviorDivergenceTicks = 0;
    let postTriggerRelationEvents = 0;
    let postTriggerChoices = 0;
    let postTriggerOutcomes = 0;

    choose = function(S, P) {
      prodChoose(S, P);
      const k = role.get(S);
      if (k && P.id === PARTY_ID) {
        counters[k].choices++;
        if (k === 'intervention' && trigger && E.tick > trigger.tick) postTriggerChoices++;
      }
    };

    outcome = function(S, P, id) {
      const k = role.get(S);
      if (k === 'intervention' && P.id === PARTY_ID && !trigger && E.tick >= MIN_TRIGGER_TICK) {
        const originalPush = P.relationHistory.push;
        const blocked = [];
        P.relationHistory.push = function(...items) {
          blocked.push(...items.map(clone));
          return this.length;
        };
        try {
          prodOutcome(S, P, id);
        } finally {
          P.relationHistory.push = originalPush;
        }
        if (blocked.length) {
          const BP = partyOf(baseline);
          const baselineSameTick = BP.relationHistory.filter(e => e.t === E.tick).map(clone);
          trigger = {
            tick: E.tick,
            party: P.id,
            realizedChoice: id,
            blockedRelationRecords: blocked,
            blockedRelationSignatures: blocked.map(relationRecordSig),
            baselineSameTickRelationRecords: baselineSameTick,
            baselineSameTickRelationSignatures: baselineSameTick.map(relationRecordSig),
            baselineMatch: JSON.stringify(blocked.map(relationRecordSig).sort()) === JSON.stringify(baselineSameTick.map(relationRecordSig).sort()),
            relationHistoryLengthAfterBlock: P.relationHistory.length,
            baselineRelationHistoryLengthAtTrigger: BP.relationHistory.length,
            interventionRelationEpisodesAtTrigger: P.relationField?.episodes?.length || 0,
            baselineRelationEpisodesAtTrigger: BP.relationField?.episodes?.length || 0
          };
          firstStructuralDivergenceTick = E.tick;
        }
      } else {
        prodOutcome(S, P, id);
      }

      if (k && P.id === PARTY_ID) {
        counters[k].outcomes++;
        if (k === 'intervention' && trigger && E.tick > trigger.tick) postTriggerOutcomes++;
      }
    };

    let wasBehaviorDiverged = false;
    for (let t = 1; t <= HORIZON; t++) {
      E.tick = t;
      const ex = env(t);
      tickW(baseline, clone(ex));
      tickW(twin, clone(ex));
      tickW(intervention, clone(ex));

      // Before intervention, verify identity every tick. After intervention, baseline/twin
      // identity is checked at fixed checkpoints plus the final tick; both still execute all ticks.
      if (!trigger) {
        if (stateSig(baseline) !== stateSig(intervention)) beforeTriggerMismatchTicks++;
      }
      if (t <= MIN_TRIGGER_TICK || t % 250 === 0 || t === HORIZON || (trigger && t === trigger.tick)) {
        fullTwinChecks++;
        if (stateSig(baseline) !== stateSig(twin)) fullTwinMismatchCheckpoints++;
      }

      if (trigger) {
        const behaviorDifferent = behaviorSig(baseline) !== behaviorSig(intervention);
        if (behaviorDifferent) {
          postTriggerBehaviorDivergenceTicks++;
          if (firstBehaviorDivergenceTick === null) firstBehaviorDivergenceTick = t;
        }
        if (wasBehaviorDiverged && !behaviorDifferent && firstBehaviorReconvergenceTick === null) firstBehaviorReconvergenceTick = t;
        wasBehaviorDiverged = behaviorDifferent;
      }
    }

    const IP = partyOf(intervention);
    const BP = partyOf(baseline);
    if (trigger) {
      postTriggerRelationEvents = IP.relationHistory.filter(e => e.t > trigger.tick).length;
      trigger.regeneratedBlockedRelationRecords = IP.relationHistory
        .filter(e => e.t > trigger.tick && trigger.blockedRelationSignatures.includes(relationRecordSig(e)))
        .slice(0, 20)
        .map(clone);
      trigger.firstRegenerationTick = trigger.regeneratedBlockedRelationRecords.length
        ? Math.min(...trigger.regeneratedBlockedRelationRecords.map(e => e.t))
        : null;
    }

    const nonTargetFlowPreserved = !!trigger && postTriggerChoices > 0 && postTriggerOutcomes > 0 && postTriggerRelationEvents > 0;
    const valid = !!trigger && trigger.baselineMatch && beforeTriggerMismatchTicks === 0 && fullTwinMismatchCheckpoints === 0 && nonTargetFlowPreserved;

    let classification = 'INVALID_OR_TRIGGER_NOT_OBSERVED';
    if (valid && firstBehaviorDivergenceTick !== null) classification = 'FLOW_PRESERVED_INTERVENTION_DOWNSTREAM_BEHAVIOR_EFFECT_OBSERVED';
    else if (valid) classification = 'NULL_WITHIN_HORIZON_FOR_BEHAVIOR_AFTER_FLOW_PRESERVED_INCORPORATION_BLOCK';

    return {
      system: { name: 'OASIS Integrated Paper System', version: '1.1', stage: 'F1' },
      question: 'When the full production flow is preserved, does blocking only one realized relational-experience incorporation event alter the later OASIS trajectory?',
      scope: {
        intervention: 'At the first naturally occurring dawn-party outcome at or after tick 5000 that would append relational records, suppress only that outcome\'s relationHistory append. All other production functions and later events continue unchanged.',
        noFutureTargetSelection: true,
        noActionMenuInjection: true,
        noRewardInjection: true,
        sameExogenousStream: true,
        fullTwinControl: true,
        horizon: HORIZON,
        twinCheckMode: 'every tick through trigger window, then every 250 ticks plus final; full flow executes at every tick in all arms'
      },
      gate: {
        triggerObserved: !!trigger,
        triggerBaselineMatch: trigger?.baselineMatch ?? false,
        beforeTriggerMismatchTicks,
        fullTwinChecks,
        fullTwinMismatchCheckpoints,
        nonTargetFlowPreserved,
        postTriggerChoices,
        postTriggerOutcomes,
        postTriggerRelationEvents,
        valid
      },
      trigger,
      outcome: {
        firstStructuralDivergenceTick,
        firstBehaviorDivergenceTick,
        firstBehaviorReconvergenceTick,
        postTriggerBehaviorDivergenceTicks,
        finalBehaviorBaseline: behaviorSig(baseline),
        finalBehaviorIntervention: behaviorSig(intervention),
        finalBaselineRelationHistoryLength: BP.relationHistory.length,
        finalInterventionRelationHistoryLength: IP.relationHistory.length,
        finalBaselineRelationEpisodeCount: BP.relationField?.episodes?.length || 0,
        finalInterventionRelationEpisodeCount: IP.relationField?.episodes?.length || 0
      },
      counters,
      classification,
      interpretationBoundary: {
        provesUniversalNecessityOfAllIncorporation: false,
        provesWholePastStructureNecessity: false,
        provesExternalValidity: false,
        validNegativeIfNoBehaviorDivergence: valid && firstBehaviorDivergenceTick === null,
        validPositiveIfBehaviorDivergence: valid && firstBehaviorDivergenceTick !== null
      }
    };
  }, { HORIZON, MIN_TRIGGER_TICK, PARTY_ID });

  await writeFile(REPORT, JSON.stringify(result, null, 2));
  console.log('OASIS-H1-INCORPORATION-F1 ' + JSON.stringify({ classification: result.classification, gate: result.gate, trigger: result.trigger, outcome: result.outcome }));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
