import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createCleanPrehistoricSocietyV1_1 } from './prehistoric-clean-world-v1.1.mjs';
import { createCivilizationObserverV1 } from './prehistoric-civilization-observer-v1.mjs';
import { createPrehistoricChoicePolicy } from './prehistoric-cohort-v1.mjs';
import { OASISMathKernelV1CanonicalMemorySafe } from './oasis-math-kernel-v1.2-memory-safe.mjs';
import { NEUTRAL_COMPARISON_COHORT_V1 } from './prehistoric-native-memory-reference-agents-v1.mjs';
import {
  GammaOffKernelV1,
  GammaHistoryLossControlKernelV1,
  OmegaAtomicOnlyKernelV1,
  OmegaCountMatchedControlKernelV1
} from './oasis-gamma-omega-intervention-kernels-v1.mjs';

const MODE = String(process.env.OASIS_CAUSAL_PROBE_MODE || 'G').toUpperCase();
const SEED_SLOT = Number(process.env.OASIS_CAUSAL_SEED_SLOT || 0);
const ELIGIBILITY_MAX_CYCLES = Number(process.env.OASIS_CAUSAL_ELIGIBILITY_MAX_CYCLES || 300);
const POST_MAX_CYCLES = Number(process.env.OASIS_CAUSAL_POST_MAX_CYCLES || 300);
const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };
const HORIZONS = [10, 30, 100];

if (!['G', 'O'].includes(MODE)) throw new Error('OASIS_CAUSAL_PROBE_MODE must be G or O');
if (!Number.isInteger(SEED_SLOT) || SEED_SLOT < 0 || SEED_SLOT > 39) throw new Error('causal seed slot must be 0..39');
if (!Number.isInteger(ELIGIBILITY_MAX_CYCLES) || ELIGIBILITY_MAX_CYCLES < 1) throw new Error('eligibility max cycles must be positive');
if (!Number.isInteger(POST_MAX_CYCLES) || POST_MAX_CYCLES < 100) throw new Error('post max cycles must be >=100');

const clone = value => value == null ? value : structuredClone(value);
const sha256Text = text => createHash('sha256').update(String(text)).digest('hex');
const sha256 = value => sha256Text(JSON.stringify(value));

function seedTable(mode) {
  const namespace = mode === 'G' ? 'oasis-gamma-causal-v1' : 'oasis-omega-causal-v1';
  return Array.from({ length: 40 }, (_, index) => {
    const seed = `${namespace}:${String(index).padStart(3, '0')}`;
    return { sourceIndex: index, seed, hash: sha256Text(seed) };
  }).sort((a, b) => a.hash.localeCompare(b.hash) || a.sourceIndex - b.sourceIndex);
}

export const FIXED_CAUSAL_SEEDS_V1 = Object.freeze({
  G: seedTable('G'),
  O: seedTable('O')
});

const seedRow = FIXED_CAUSAL_SEEDS_V1[MODE][SEED_SLOT];
const RUN_SEED = seedRow.seed;

function createBaseActors(society, KernelClass = OASISMathKernelV1CanonicalMemorySafe) {
  const actors = new Map();
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    actors.set(spec.id, new KernelClass({
      world: society.createAgentWorld(spec.id),
      capabilities: society.capabilitiesForAgent(spec.id),
      choicePolicy: createPrehistoricChoicePolicy(spec, RUN_SEED),
      maxSelfInterventions: 1,
      initialBudget: BUDGET,
      lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true,
      controlSeed: RUN_SEED,
      controlAgentId: spec.id
    }));
  }
  return actors;
}

function actorStates(actors) {
  return Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, clone(actors.get(spec.id).state)]));
}

function preInterventionDigest(society, actors) {
  return sha256({ world: society.externalSnapshot(), actors: actorStates(actors) });
}

function rotatedOrder(cycleIndex) {
  const shift = cycleIndex % NEUTRAL_COMPARISON_COHORT_V1.length;
  return [...NEUTRAL_COMPARISON_COHORT_V1.slice(shift), ...NEUTRAL_COMPARISON_COHORT_V1.slice(0, shift)];
}

function chosenRound(transition) {
  const rounds = transition?.deliberation?.rounds ?? [];
  return rounds.findLast?.(round => round?.choice?.status === 'chosen') ?? rounds.at(-1) ?? null;
}

function gammaEligibility(round) {
  if (!round) return null;
  const active = round.activeRelations ?? [];
  if (!active.length) return null;
  const activeIds = new Set(active.map(r => r?.relation?.id).filter(Boolean));
  const linked = [];
  for (const possibility of round.possibilities ?? []) {
    const ids = (possibility.R_c ?? []).map(r => r?.id).filter(Boolean);
    if (ids.some(id => activeIds.has(id))) linked.push(possibility.id);
  }
  if (!linked.length) return null;
  return {
    activeRelationCount: active.length,
    activeOccurrenceIds: active.map(r => r.occurrenceId ?? null),
    linkedPossibilityIds: linked
  };
}

function omegaEligibility(round) {
  if (!round) return null;
  const possibilities = round.possibilities ?? [];
  const atomic = possibilities.filter(p => (p?.sigma?.length ?? 0) === 1);
  const composite = possibilities.filter(p => (p?.sigma?.length ?? 0) >= 2);
  const admissible = new Set(round?.life?.admissibleIds ?? []);
  const admissibleComposite = composite.filter(p => admissible.has(p.id));
  if (!atomic.length || !composite.length || !admissibleComposite.length) return null;
  return {
    atomicCount: atomic.length,
    compositeCount: composite.length,
    admissibleCompositeCount: admissibleComposite.length,
    maxSigmaDepth: Math.max(...composite.map(p => p.sigma.length))
  };
}

async function locateInterventionOnset() {
  const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const observer = createCivilizationObserverV1({ society });
  const actors = createBaseActors(society);
  let lastObserver = null;

  for (let cycleIndex = 0; cycleIndex < ELIGIBILITY_MAX_CYCLES; cycleIndex++) {
    const order = rotatedOrder(cycleIndex);
    for (let orderIndex = 0; orderIndex < order.length; orderIndex++) {
      const spec = order[orderIndex];
      const before = {
        cycleIndex,
        orderIndex,
        actorId: spec.id,
        worldCycle: society.cycle,
        ledgerLength: society.externalSnapshot().ledger.length,
        preDigest: preInterventionDigest(society, actors)
      };
      const transition = await actors.get(spec.id).step();
      const round = chosenRound(transition);
      const eligibility = MODE === 'G' ? gammaEligibility(round) : omegaEligibility(round);
      if (eligibility) {
        return {
          reached: true,
          ...before,
          eligibility,
          scanTransitionStatus: transition?.status ?? null
        };
      }
    }

    await society.advanceExogenousFlow();
    lastObserver = await observer.observe({ cycle: society.cycle });
    if (lastObserver?.confirmed) {
      return {
        reached: false,
        reason: 'INTERVENTION_NOT_REACHED_BEFORE_RESEARCH_TERMINAL',
        terminalCycle: society.cycle,
        observer: clone(lastObserver)
      };
    }
    if (await society.isTerminal()) {
      return {
        reached: false,
        reason: 'INTERVENTION_NOT_REACHED_BEFORE_RESEARCH_TERMINAL',
        terminalCycle: society.cycle,
        terminalReason: await society.terminalReason()
      };
    }
  }
  return { reached: false, reason: 'INTERVENTION_NOT_REACHED', maxCycles: ELIGIBILITY_MAX_CYCLES };
}

function branchDefinitions() {
  if (MODE === 'G') {
    return [
      { id: 'G0', label: 'intact', KernelClass: OASISMathKernelV1CanonicalMemorySafe },
      { id: 'G1', label: 'gamma-off', KernelClass: GammaOffKernelV1 },
      { id: 'G2', label: 'history-loss-control', KernelClass: GammaHistoryLossControlKernelV1 }
    ];
  }
  return [
    { id: 'O0', label: 'intact', KernelClass: OASISMathKernelV1CanonicalMemorySafe },
    { id: 'O1', label: 'atomic-only', KernelClass: OmegaAtomicOnlyKernelV1 },
    { id: 'O2', label: 'count-matched-control', KernelClass: OmegaCountMatchedControlKernelV1 }
  ];
}

function activateBranch(actors, branchId) {
  for (const actor of actors.values()) {
    if (branchId === 'G1' || branchId === 'G2') actor.setGammaIntervention(true);
    if (branchId === 'O1' || branchId === 'O2') actor.setOmegaIntervention(true);
  }
}

function pureExternalMetrics(snapshot, onsetLedgerLength) {
  const tail = snapshot.ledger.slice(onsetLedgerLength);
  const social = tail.filter(e => ['contact', 'transfer'].includes(e.action));
  const pairCounts = new Map();
  for (const event of social) {
    const key = `${event.actor ?? ''}->${event.target ?? ''}:${event.action}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const combineEvents = snapshot.ledger.filter(e => e.action === 'combine' && e.objectId);
  const creators = new Map(combineEvents.map(e => [e.objectId, e.actor]));
  let crossAgentReuseEvents = 0;
  for (const event of tail) {
    const objectIds = [event.target, event.objectId, ...(event.componentIds ?? [])].filter(Boolean);
    for (const id of objectIds) {
      const creator = creators.get(id);
      if (creator && event.actor && event.actor !== creator) {
        crossAgentReuseEvents += 1;
        break;
      }
    }
  }
  const structures = snapshot.objects.filter(o => o.type === 'composite');
  const activeRelations = snapshot.relations.filter(r => r.activeUntil >= snapshot.cycle);
  return {
    worldCycle: snapshot.cycle,
    postOnsetWorldEventCount: tail.length,
    postOnsetActionDiversity: new Set(tail.map(e => e.action).filter(Boolean)).size,
    postOnsetInteractionCount: social.length,
    repeatedDirectedRelationPairs: [...pairCounts.values()].filter(n => n >= 2).length,
    participationBreadth: new Set(tail.map(e => e.actor).filter(Boolean)).size,
    crossAgentReuseEvents,
    structuresCreatedPostOnset: tail.filter(e => e.action === 'combine').length,
    survivingStructureCount: structures.length,
    maxSurvivingLineageSize: structures.length ? Math.max(...structures.map(o => o.lineage?.length ?? 0)) : 0,
    activeRelationKeys: activeRelations.map(r => `${r.kind}:${r.from}->${r.to}`).sort(),
    allRelationKeys: snapshot.relations.map(r => `${r.kind}:${r.from}->${r.to}`).sort()
  };
}

function transitionRecord(transition, society, actorId, beforeLedgerLength) {
  const snapshot = society.externalSnapshot();
  const events = snapshot.ledger.slice(beforeLedgerLength);
  const possibility = transition?.deliberation?.realizedPossibility ?? null;
  return {
    worldCycle: snapshot.cycle,
    actorId,
    status: transition?.status ?? null,
    possibilityId: possibility?.id ?? null,
    sigmaDepth: possibility?.sigma?.length ?? 0,
    sigmaActions: (possibility?.sigma ?? []).map(step => step.action),
    worldEvents: events.map(e => ({ action: e.action, actor: e.actor ?? null, target: e.target ?? null, objectId: e.objectId ?? null }))
  };
}

function sampleIfNeeded(samples, society, onset, onsetLedgerLength) {
  const elapsed = society.cycle - onset.worldCycle;
  for (const horizon of HORIZONS) {
    const key = `plus${horizon}`;
    if (samples[key] || elapsed < horizon) continue;
    samples[key] = pureExternalMetrics(society.externalSnapshot(), onsetLedgerLength);
  }
}

function interventionDiagnostics(actor, branchId) {
  if (branchId === 'G1' || branchId === 'G2') return clone(actor.lastGammaInterventionDiagnostics ?? null);
  if (branchId === 'O1' || branchId === 'O2') return clone(actor.lastOmegaInterventionDiagnostics ?? null);
  return null;
}

async function replayBranch(definition, onset) {
  const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  // Branch identity is deliberately not passed to the observer.
  const observer = createCivilizationObserverV1({ society });
  const actors = createBaseActors(society, definition.KernelClass);
  const postOnsetTransitions = [];
  const samples = {};
  let onsetReached = false;
  let onsetLedgerLength = null;
  let preDigest = null;
  let firstInterventionDiagnostics = null;
  let firstObserverConfirmation = null;
  let naturalTerminal = null;

  const totalCycleLimit = onset.cycleIndex + POST_MAX_CYCLES + 2;
  for (let cycleIndex = 0; cycleIndex < totalCycleLimit; cycleIndex++) {
    const order = rotatedOrder(cycleIndex);
    for (let orderIndex = 0; orderIndex < order.length; orderIndex++) {
      const spec = order[orderIndex];
      const atOnset = cycleIndex === onset.cycleIndex && orderIndex === onset.orderIndex;
      if (atOnset) {
        preDigest = preInterventionDigest(society, actors);
        if (preDigest !== onset.preDigest) {
          throw new Error(`PRE_INTERVENTION_REPLAY_MISMATCH branch=${definition.id} expected=${onset.preDigest} got=${preDigest}`);
        }
        onsetLedgerLength = society.externalSnapshot().ledger.length;
        activateBranch(actors, definition.id);
        onsetReached = true;
      }

      const beforeLedgerLength = society.externalSnapshot().ledger.length;
      const transition = await actors.get(spec.id).step();
      if (onsetReached) {
        postOnsetTransitions.push(transitionRecord(transition, society, spec.id, beforeLedgerLength));
        if (atOnset) firstInterventionDiagnostics = interventionDiagnostics(actors.get(spec.id), definition.id);
      }
    }

    await society.advanceExogenousFlow();
    const observation = await observer.observe({ cycle: society.cycle });
    if (onsetReached) sampleIfNeeded(samples, society, onset, onsetLedgerLength);

    if (onsetReached && observation?.confirmed && !firstObserverConfirmation) {
      firstObserverConfirmation = { cycle: society.cycle, observation: clone(observation) };
      break;
    }
    if (onsetReached && await society.isTerminal()) {
      naturalTerminal = { cycle: society.cycle, reason: await society.terminalReason() };
      break;
    }
    if (onsetReached && society.cycle - onset.worldCycle >= POST_MAX_CYCLES) break;
  }

  if (!onsetReached) throw new Error(`onset was not replayed for branch ${definition.id}`);
  const finalSnapshot = society.externalSnapshot();
  const status = firstObserverConfirmation
    ? 'civilization-observer-confirmed'
    : naturalTerminal
      ? 'natural-terminal'
      : 'post-intervention-software-guard-reached';
  const externalMetrics = pureExternalMetrics(finalSnapshot, onsetLedgerLength);
  const result = {
    // Branch label is attached only outside agent/observer computation.
    branchId: definition.id,
    branchLabel: definition.label,
    preInterventionDigest: preDigest,
    onsetLedgerLength,
    firstInterventionDiagnostics,
    postOnsetTransitions,
    samples,
    status,
    firstObserverConfirmation,
    naturalTerminal,
    finalExternalMetrics: externalMetrics,
    finalExternalSnapshot: finalSnapshot,
    contaminationChecks: {
      branchIdentityPassedToChoicePolicy: false,
      branchIdentityPassedToObservation: false,
      branchIdentityPassedToObserver: false,
      branchIdentityPassedToWorld: false,
      runSeedIncludesBranchIdentity: false,
      resultFeedbackToDecision: false
    }
  };
  return result;
}

function validateIntervention(mode, onset, branches) {
  const byId = Object.fromEntries(branches.map(row => [row.branchId, row]));
  if (mode === 'G') {
    const d1 = byId.G1?.firstInterventionDiagnostics;
    const valid = Boolean(d1?.active && d1.intactActiveCount > d1.returnedActiveCount && d1.returnedActiveCount === 0);
    return {
      valid,
      target: 'Gamma historical activeRelations re-entry',
      intactEligibilityActiveCount: onset.eligibility.activeRelationCount,
      gammaOffDiagnostics: d1,
      historyLossDiagnostics: byId.G2?.firstInterventionDiagnostics ?? null
    };
  }
  const d1 = byId.O1?.firstInterventionDiagnostics;
  const d2 = byId.O2?.firstInterventionDiagnostics;
  const valid = Boolean(d1?.active && d1.intactCompositeCount > 0 && d1.returnedCompositeCount === 0 && d1.returnedTotalCount < d1.intactTotalCount);
  const countMatched = Boolean(d2?.active && d2.returnedTotalCount === d1?.returnedTotalCount);
  return {
    valid: valid && countMatched,
    target: 'Omega sequential composition',
    omegaAtomicOnlyDiagnostics: d1,
    countMatchedDiagnostics: d2,
    countMatched
  };
}

function branchPairDivergence(left, right) {
  const max = Math.max(left.postOnsetTransitions.length, right.postOnsetTransitions.length);
  let firstTransitionDivergenceIndex = null;
  for (let i = 0; i < max; i++) {
    const a = left.postOnsetTransitions[i] ?? null;
    const b = right.postOnsetTransitions[i] ?? null;
    const sigA = a ? `${a.actorId}|${a.status}|${a.sigmaActions.join('>')}|${JSON.stringify(a.worldEvents)}` : 'MISSING';
    const sigB = b ? `${b.actorId}|${b.status}|${b.sigmaActions.join('>')}|${JSON.stringify(b.worldEvents)}` : 'MISSING';
    if (sigA !== sigB) { firstTransitionDivergenceIndex = i; break; }
  }
  const relationSymDiff = (a, b) => {
    const A = new Set(a ?? []), B = new Set(b ?? []);
    let n = 0;
    for (const x of A) if (!B.has(x)) n++;
    for (const x of B) if (!A.has(x)) n++;
    return n;
  };
  const horizonDivergence = {};
  for (const horizon of HORIZONS) {
    const key = `plus${horizon}`;
    const a = left.samples[key], b = right.samples[key];
    horizonDivergence[key] = a && b ? {
      worldEventCountDifference: b.postOnsetWorldEventCount - a.postOnsetWorldEventCount,
      interactionCountDifference: b.postOnsetInteractionCount - a.postOnsetInteractionCount,
      structureCountDifference: b.survivingStructureCount - a.survivingStructureCount,
      participationBreadthDifference: b.participationBreadth - a.participationBreadth,
      activeRelationSymmetricDifference: relationSymDiff(a.activeRelationKeys, b.activeRelationKeys)
    } : null;
  }
  return { firstTransitionDivergenceIndex, horizonDivergence };
}

const onset = await locateInterventionOnset();
let branches = [];
let interventionValidity = null;
let pairedDivergence = null;

if (onset.reached) {
  for (const definition of branchDefinitions()) branches.push(await replayBranch(definition, onset));
  const uniquePreDigests = [...new Set(branches.map(row => row.preInterventionDigest))];
  if (uniquePreDigests.length !== 1 || uniquePreDigests[0] !== onset.preDigest) {
    throw new Error('PRE_INTERVENTION_BRANCH_IDENTITY_GATE_FAILED');
  }
  interventionValidity = validateIntervention(MODE, onset, branches);
  if (!interventionValidity.valid) throw new Error(`INTERVENTION_VALIDITY_GATE_FAILED ${JSON.stringify(interventionValidity)}`);
  const intactId = MODE === 'G' ? 'G0' : 'O0';
  const activeId = MODE === 'G' ? 'G1' : 'O1';
  const controlId = MODE === 'G' ? 'G2' : 'O2';
  const byId = Object.fromEntries(branches.map(row => [row.branchId, row]));
  pairedDivergence = {
    interventionVsIntact: branchPairDivergence(byId[intactId], byId[activeId]),
    controlVsIntact: branchPairDivergence(byId[intactId], byId[controlId])
  };
}

const result = {
  protocol: 'OASIS Gamma/Omega Flow-Preserving Causal Probe v1.0',
  preregistration: 'OASIS_GAMMA_OMEGA_CAUSAL_PROBE_PREREG_v1.0.md',
  mode: MODE,
  seedSlot: SEED_SLOT,
  seedSourceIndex: seedRow.sourceIndex,
  seed: RUN_SEED,
  seedHash: seedRow.hash,
  fixedSeedFamilySize: 40,
  eligibilityMaxCycles: ELIGIBILITY_MAX_CYCLES,
  postInterventionSoftwareGuardCycles: POST_MAX_CYCLES,
  onset,
  branches,
  interventionValidity,
  pairedDivergence,
  researchInterpretationGuard: onset.reached
    ? 'A valid local intervention was executed. Direction or magnitude is not interpreted in this runner.'
    : 'Eligibility not reached is reported as such and is not negative evidence.',
  implementationBoundary: {
    worldVersion: 'prehistoric-clean-world-v1.1 unchanged',
    cohort: '6 neutral founders',
    budget: BUDGET,
    observerBlindDuringDecisionAndObservation: true,
    forkMethod: 'deterministic replay to identical pre-intervention SHA, then local operator intervention',
    exogenousRngInterpretation: 'world-native state-conditioned randomness is preserved; downstream stochastic amplification is part of total trajectory effect, not a direct-effect isolation',
    noReward: true,
    noQ: true,
    noTargetAction: true,
    noFutureStream: true,
    noCivilizationGoalFeedback: true
  }
};

const filename = `oasis-${MODE === 'G' ? 'gamma' : 'omega'}-causal-probe-v1-seed-slot-${SEED_SLOT}.json`;
await writeFile(filename, JSON.stringify(result, null, 2));
console.log('OASIS_GAMMA_OMEGA_CAUSAL_PROBE_RESULT=' + JSON.stringify({
  mode: MODE,
  seedSlot: SEED_SLOT,
  seed: RUN_SEED,
  onsetReached: onset.reached,
  onsetCycle: onset.worldCycle ?? null,
  onsetActor: onset.actorId ?? null,
  interventionValid: interventionValidity?.valid ?? null,
  branchStatus: branches.map(row => ({ branchId: row.branchId, status: row.status, finalCycle: row.finalExternalSnapshot?.cycle ?? null })),
  pairedDivergence
}));
