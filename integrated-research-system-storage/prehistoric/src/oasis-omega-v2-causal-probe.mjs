import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createCleanPrehistoricSocietyV1_1 } from './prehistoric-clean-world-v1.1.mjs';
import { createCivilizationObserverV1 } from './prehistoric-civilization-observer-v1.mjs';
import { createPrehistoricChoicePolicy } from './prehistoric-cohort-v1.mjs';
import { NEUTRAL_COMPARISON_COHORT_V1 } from './prehistoric-native-memory-reference-agents-v1.mjs';
import {
  OASISOmegaV2Kernel,
  OASISOmegaV2AtomicOnlyKernel,
  OASISOmegaV2FrozenMacroKernel,
  OASISOmegaV2IndependentShamKernel,
  omegaV2MacroSignature,
  isCanonicalOmegaComposite,
  isGammaV2BridgeCandidate
} from './oasis-omega-v2-kernel.mjs';

const SEED_SLOT = Number(process.env.OASIS_OMEGA_V2_SEED_SLOT || 0);
const ELIGIBILITY_MAX_CYCLES = Number(process.env.OASIS_OMEGA_V2_ELIGIBILITY_MAX_CYCLES || 300);
const POST_CYCLES = Number(process.env.OASIS_OMEGA_V2_POST_CYCLES || 100);
const BUDGET = Object.freeze({ maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 });
const HORIZONS = Object.freeze([10, 30, 100]);
const VIEW_RADIUS = 7.5;
const NEAR_RADIUS = 1.35;

if (!Number.isInteger(SEED_SLOT) || SEED_SLOT < 0 || SEED_SLOT > 39) throw new Error('OASIS_OMEGA_V2_SEED_SLOT must be 0..39');
if (!Number.isInteger(ELIGIBILITY_MAX_CYCLES) || ELIGIBILITY_MAX_CYCLES < 1) throw new Error('eligibility max cycles invalid');
if (!Number.isInteger(POST_CYCLES) || POST_CYCLES < 100) throw new Error('post cycles must be >=100');

const clone = value => value == null ? value : structuredClone(value);
const shaText = text => createHash('sha256').update(String(text)).digest('hex');
const sha = value => shaText(JSON.stringify(value));
const hypot = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

function fixedSeedTable() {
  return Array.from({ length: 40 }, (_, sourceIndex) => {
    const seed = `oasis-omega-causal-v2:${String(sourceIndex).padStart(3, '0')}`;
    return { sourceIndex, seed, hash: shaText(seed) };
  }).sort((a, b) => a.hash.localeCompare(b.hash) || a.sourceIndex - b.sourceIndex);
}

export const FIXED_OMEGA_V2_SEEDS = Object.freeze(fixedSeedTable());
const seedRow = FIXED_OMEGA_V2_SEEDS[SEED_SLOT];
const RUN_SEED = seedRow.seed;

function createKernel(KernelClass, society, spec) {
  const kernel = new KernelClass({
    world: society.createAgentWorld(spec.id),
    capabilities: society.capabilitiesForAgent(spec.id),
    choicePolicy: createPrehistoricChoicePolicy(spec, RUN_SEED),
    maxSelfInterventions: 1,
    initialBudget: BUDGET,
    lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
  });
  kernel.__agentId = spec.id;
  return kernel;
}

function createActors(society, KernelClass = OASISOmegaV2Kernel) {
  return new Map(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, createKernel(KernelClass, society, spec)]));
}

function actorCausalState(actor) {
  return {
    state: clone(actor.state),
    omegaV2MacroLibrary: clone(actor.omegaV2MacroLibrary)
  };
}

function actorStates(actors) {
  return Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, actorCausalState(actors.get(spec.id))]));
}

function causalDigest(society, actors) {
  return sha({ world: society.externalSnapshot(), actors: actorStates(actors) });
}

function rotatedOrder(cycleIndex) {
  const shift = cycleIndex % NEUTRAL_COMPARISON_COHORT_V1.length;
  return [...NEUTRAL_COMPARISON_COHORT_V1.slice(shift), ...NEUTRAL_COMPARISON_COHORT_V1.slice(0, shift)];
}

function previewObservation(society, actor) {
  const id = actor.__agentId;
  const self = society.agents.get(id);
  if (!self) throw new Error(`preview missing actor ${id}`);
  const radius = VIEW_RADIUS + (self.sightBoostUntil >= society.cycle ? 3 : 0);
  const visibleAgents = [...society.agents.values()].filter(a => a.alive && a.id !== id && hypot(self, a) <= radius);
  const visibleObjects = [...society.objects.values()].filter(o => hypot(self, o) <= radius);
  const visibleIds = new Set([id, ...visibleAgents.map(a => a.id), ...visibleObjects.map(o => o.id)]);
  const currentRelations = [...society.relations.values()]
    .filter(r => r.activeUntil >= society.cycle && visibleIds.has(r.from) && visibleIds.has(r.to))
    .map(r => ({ id: r.id, kind: r.kind, from: r.from, to: r.to, meta: clone(r.meta ?? {}) }));

  const facts = [];
  for (const other of visibleAgents) if (hypot(self, other) <= NEAR_RADIUS) facts.push(`near:${other.id}`);
  for (const object of visibleObjects) if (hypot(self, object) <= NEAR_RADIUS) facts.push(`near:${object.id}`);
  if (self.held) { facts.push(`holding:${self.held}`); facts.push(`near:${self.held}`); }
  if (self.stamina < 25) facts.push('body:low-stamina');

  const participants = [{ id, available: true, meta: { kind: 'human' } }, ...visibleAgents.map(a => ({ id: a.id, available: true, meta: { kind: 'human' } }))];
  const entities = uniq([id, ...participants.map(p => p.id), ...visibleObjects.map(o => o.id), ...currentRelations.flatMap(r => [r.from, r.to])]);
  const recentProcess = society.ledger.slice(-16).filter(e => e.actor === id || e.participants?.includes(id));

  return {
    id: `PREVIEW:${society.cycle}:${id}:${actor.state.observations.length}`,
    sequence: actor.state.observations.length,
    time: society.cycle,
    facts,
    relations: currentRelations,
    participants,
    entities,
    responsibilitySignals: self.stamina < 12 ? { uncertainty: 0.2, irreversibility: 0.1, affectedScope: 0.1, recoverability: 0.8, lifeSafetyImpact: 0.5, structuralImpact: 0 } : {},
    relationalProcess: recentProcess.map(e => ({ cycle: e.cycle, action: e.action, actor: e.actor, target: e.target ?? null, participants: clone(e.participants ?? []) })),
    meta: {
      self: { id: self.id, x: self.x, y: self.y, stamina: self.stamina, held: self.held },
      visibleAgents: visibleAgents.map(a => ({ id: a.id, x: a.x, y: a.y, distance: hypot(self, a) })),
      visibleObjects: visibleObjects.map(o => ({
        id: o.id, type: o.type, kind: o.kind, x: o.x, y: o.y, distance: hypot(self, o), portable: !!o.portable,
        durable: !!o.durable, heldBy: o.heldBy ?? null, composite: o.type === 'composite', materialSignature: o.materialSignature ?? null,
        lineage: clone(o.lineage ?? [o.id]), stock: Number.isFinite(o.stock) ? o.stock : null
      })),
      nearRadius: NEAR_RADIUS, moveDistance: 2.8, cycle: society.cycle
    }
  };
}

function stepSignature(step) {
  return JSON.stringify({
    id: step?.id ?? null, capabilityId: step?.capabilityId ?? null, action: step?.action ?? null, target: step?.target ?? null,
    participants: step?.participants ?? [], requires: step?.requires ?? [], provides: step?.provides ?? [],
    requiresEntities: step?.requiresEntities ?? [], createsEntities: step?.createsEntities ?? [],
    requiresRelationKinds: step?.requiresRelationKinds ?? [], providesRelationKinds: step?.providesRelationKinds ?? [],
    bridgeKeys: step?.bridgeKeys ?? [], requiresBridgeKeys: step?.requiresBridgeKeys ?? []
  });
}

function possibilitySignature(possibility) {
  return (possibility?.sigma ?? []).map(step => stepSignature(step)).join('>>');
}

function previewBundle(KernelClass, sourceActor, society, spec, observation, interventionActive = false) {
  const scratch = createKernel(KernelClass, society, spec);
  scratch.state = clone(sourceActor.state);
  scratch.omegaV2MacroLibrary = clone(sourceActor.omegaV2MacroLibrary);
  if (interventionActive) scratch.setOmegaV2Intervention(true);
  const preParticipation = { current: observation.participants.filter(p => p.available !== false).map(clone), historical: [], affectedEntities: clone(observation.entities) };
  const activeRelations = scratch.gamma(observation, preParticipation);
  const participation = scratch.deriveParticipation(observation, activeRelations);
  const primitives = scratch.instantiateCapabilities(observation, participation, activeRelations, BUDGET);
  const possibilities = scratch.omega(observation, participation, activeRelations, BUDGET);
  const responsibilityById = Object.fromEntries(possibilities.map(p => [p.id, scratch.responsibilityFor(p, observation, activeRelations, participation)]));
  const life = scratch.applyLifeConstraint(possibilities, { observation, participation, activeRelations, responsibilityById });
  return { activeRelations, participation, primitives, possibilities, admissible: life.admissible, diagnostics: clone(scratch.lastOmegaV2Diagnostics) };
}

function setEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function previewEligibility(society, actors, spec) {
  const actor = actors.get(spec.id);
  if (actor.omegaV2MacroLibrary == null) return null;
  const observation = previewObservation(society, actor);
  const digest = causalDigest(society, actors);
  const o0 = previewBundle(OASISOmegaV2Kernel, actor, society, spec, observation, false);
  const o1 = previewBundle(OASISOmegaV2AtomicOnlyKernel, actor, society, spec, observation, true);
  const o2 = previewBundle(OASISOmegaV2FrozenMacroKernel, actor, society, spec, observation, true);
  const o3 = previewBundle(OASISOmegaV2IndependentShamKernel, actor, society, spec, observation, true);

  const primitiveSets = [o0, o1, o2, o3].map(bundle => new Set(bundle.primitives.map(stepSignature)));
  if (!primitiveSets.slice(1).every(set => setEqual(set, primitiveSets[0]))) throw new Error('OMEGA_V2_PRIMITIVE_PARITY_VIOLATION');

  const o1Admissible = new Set(o1.admissible.map(possibilitySignature));
  const o2Admissible = new Set(o2.admissible.map(possibilitySignature));
  const library = new Set(actor.omegaV2MacroLibrary ?? []);
  const canonicalAdmissible = o0.admissible.filter(isCanonicalOmegaComposite);
  const compositionExtras = canonicalAdmissible.filter(p => !o1Admissible.has(possibilitySignature(p)));
  const onlineNovel = canonicalAdmissible.filter(p => !library.has(omegaV2MacroSignature(p)) && !o2Admissible.has(possibilitySignature(p)));
  if (!compositionExtras.length || !onlineNovel.length) return null;

  return {
    reached: true,
    worldCycle: society.cycle,
    actorId: spec.id,
    preDigest: digest,
    primitiveCount: o0.primitives.length,
    o0PossibilityCount: o0.possibilities.length,
    o1PossibilityCount: o1.possibilities.length,
    o2PossibilityCount: o2.possibilities.length,
    o3PossibilityCount: o3.possibilities.length,
    o0AdmissibleCount: o0.admissible.length,
    o1AdmissibleCount: o1.admissible.length,
    o2AdmissibleCount: o2.admissible.length,
    canonicalAdmissibleCompositeCount: canonicalAdmissible.length,
    atomicBlockedAdmissibleCount: compositionExtras.length,
    onlineNovelAdmissibleCount: onlineNovel.length,
    onlineNovelMacroSignatures: [...new Set(onlineNovel.map(omegaV2MacroSignature))].sort(),
    frozenMacroLibraryCount: actor.omegaV2MacroLibrary.length,
    shamMatchAvailablePreview: o3.diagnostics?.shamMatchAvailable === true,
    gammaBridgeCountO0: o0.possibilities.filter(isGammaV2BridgeCandidate).length,
    gammaBridgeCountO1: o1.possibilities.filter(isGammaV2BridgeCandidate).length,
    gammaBridgeCountO2: o2.possibilities.filter(isGammaV2BridgeCandidate).length,
    gammaBridgeCountO3: o3.possibilities.filter(isGammaV2BridgeCandidate).length,
    dryRunChoiceSampled: false,
    dryRunWorldExecuted: false
  };
}

async function locateOnset() {
  const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const actors = createActors(society, OASISOmegaV2Kernel);
  for (let cycleIndex = 0; cycleIndex < ELIGIBILITY_MAX_CYCLES; cycleIndex++) {
    const order = rotatedOrder(cycleIndex);
    for (let orderIndex = 0; orderIndex < order.length; orderIndex++) {
      const spec = order[orderIndex];
      const eligibility = previewEligibility(society, actors, spec);
      if (eligibility) return { ...eligibility, cycleIndex, orderIndex };
      await actors.get(spec.id).step();
    }
    await society.advanceExogenousFlow();
  }
  return { reached: false, reason: 'INTERVENTION_NOT_REACHED', maxCycles: ELIGIBILITY_MAX_CYCLES };
}

function branchDefinitions() {
  return [
    { id: 'O0', label: 'intact-online-omega-v2', KernelClass: OASISOmegaV2Kernel },
    { id: 'O1', label: 'canonical-omega-atomic-only', KernelClass: OASISOmegaV2AtomicOnlyKernel },
    { id: 'O2', label: 'frozen-first-current-macro-library', KernelClass: OASISOmegaV2FrozenMacroKernel },
    { id: 'O3', label: 'count-depth-matched-independent-sequence-sham', KernelClass: OASISOmegaV2IndependentShamKernel }
  ];
}

function activateBranch(actors, branchId) {
  if (branchId === 'O0') return;
  for (const actor of actors.values()) actor.setOmegaV2Intervention(true);
}

function eventSignature(event) {
  return JSON.stringify({ action: event?.action ?? null, actor: event?.actor ?? null, target: event?.target ?? null, objectId: event?.objectId ?? null, componentIds: event?.componentIds ?? [], relation: event?.relation ?? null });
}

function externalMetrics(snapshot, onsetLedgerLength) {
  const tail = snapshot.ledger.slice(onsetLedgerLength);
  const combineEvents = snapshot.ledger.filter(e => e.action === 'combine' && e.objectId);
  const creators = new Map(combineEvents.map(e => [e.objectId, e.actor]));
  let crossAgentReuseEvents = 0;
  for (const event of tail) {
    const objectIds = [event.target, event.objectId, ...(event.componentIds ?? [])].filter(Boolean);
    if (objectIds.some(id => creators.has(id) && creators.get(id) !== event.actor)) crossAgentReuseEvents += 1;
  }
  const structures = snapshot.objects.filter(o => o.type === 'composite');
  const rootSet = new Set();
  for (const structure of structures) for (const id of structure.lineage ?? []) if (String(id).startsWith('raw-')) rootSet.add(id);
  const relationKeys = snapshot.relations.filter(r => r.activeUntil >= snapshot.cycle).map(r => `${r.kind}:${r.from}->${r.to}`).sort();
  return {
    cycle: snapshot.cycle,
    eventSequence: tail.map(eventSignature),
    relationKeys,
    survivingStructureCount: structures.length,
    structureRootSet: [...rootSet].sort(),
    crossAgentReuseEvents,
    participationBreadth: new Set(tail.map(e => e.actor).filter(Boolean)).size
  };
}

function sampleIfNeeded(samples, society, onset, onsetLedgerLength) {
  const elapsed = society.cycle - onset.worldCycle;
  for (const horizon of HORIZONS) {
    const key = `plus${horizon}`;
    if (!samples[key] && elapsed >= horizon) samples[key] = externalMetrics(society.externalSnapshot(), onsetLedgerLength);
  }
}

function transitionRecord(transition, society, actorId, beforeLedgerLength) {
  const events = society.externalSnapshot().ledger.slice(beforeLedgerLength);
  const realized = transition?.deliberation?.realizedPossibility ?? null;
  return {
    actorId,
    status: transition?.status ?? null,
    realizedSigma: (realized?.sigma ?? []).map(step => ({ action: step.action, target: step.target ?? null })),
    realizedSource: realized?.trace?.source ?? null,
    externalEvents: events.map(eventSignature)
  };
}

function firstRoundMechanism(transition, macroLibrary) {
  const round = transition?.deliberation?.rounds?.[0] ?? null;
  if (!round) return null;
  const admissible = new Set(round.life?.admissibleIds ?? []);
  const library = new Set(macroLibrary ?? []);
  const possibilities = (round.possibilities ?? []).map(p => ({
    id: p.id,
    signature: possibilitySignature(p),
    macroSignature: omegaV2MacroSignature(p),
    admissible: admissible.has(p.id),
    source: p?.trace?.source ?? null,
    sigmaDepth: p?.sigma?.length ?? 0,
    canonicalOmegaComposite: isCanonicalOmegaComposite(p),
    gammaBridge: isGammaV2BridgeCandidate(p),
    onlineNovel: isCanonicalOmegaComposite(p) && !library.has(omegaV2MacroSignature(p))
  }));
  return {
    possibilities,
    admissibleSignatures: possibilities.filter(p => p.admissible).map(p => p.signature),
    canonicalOmegaAdmissibleSignatures: possibilities.filter(p => p.admissible && p.canonicalOmegaComposite).map(p => p.signature),
    onlineNovelOmegaAdmissibleSignatures: possibilities.filter(p => p.admissible && p.onlineNovel).map(p => p.signature),
    gammaBridgeAdmissibleSignatures: possibilities.filter(p => p.admissible && p.gammaBridge).map(p => p.signature),
    choiceStatus: round.choice?.status ?? null,
    choicePossibilityId: round.choice?.possibilityId ?? null
  };
}

async function replayBranch(definition, onset) {
  const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const observer = createCivilizationObserverV1({ society });
  const actors = createActors(society, definition.KernelClass);
  const samples = {};
  const postOnsetTransitions = [];
  let onsetReached = false;
  let onsetLedgerLength = null;
  let preDigest = null;
  let firstMechanism = null;
  let firstObserverConfirmation = null;
  let firstKernelDiagnostics = null;

  const finalCycleIndex = onset.cycleIndex + POST_CYCLES + 2;
  for (let cycleIndex = 0; cycleIndex < finalCycleIndex; cycleIndex++) {
    const order = rotatedOrder(cycleIndex);
    for (let orderIndex = 0; orderIndex < order.length; orderIndex++) {
      const spec = order[orderIndex];
      const atOnset = cycleIndex === onset.cycleIndex && orderIndex === onset.orderIndex;
      if (atOnset) {
        preDigest = causalDigest(society, actors);
        if (preDigest !== onset.preDigest) throw new Error(`OMEGA_V2_PRE_INTERVENTION_REPLAY_MISMATCH branch=${definition.id}`);
        onsetLedgerLength = society.externalSnapshot().ledger.length;
        activateBranch(actors, definition.id);
        onsetReached = true;
      }
      const beforeLedgerLength = society.externalSnapshot().ledger.length;
      const transition = await actors.get(spec.id).step();
      if (onsetReached) {
        postOnsetTransitions.push(transitionRecord(transition, society, spec.id, beforeLedgerLength));
        if (atOnset) {
          const actor = actors.get(spec.id);
          firstMechanism = firstRoundMechanism(transition, actor.omegaV2MacroLibrary);
          firstKernelDiagnostics = clone(actor.lastOmegaV2Diagnostics);
        }
      }
    }
    await society.advanceExogenousFlow();
    const observation = await observer.observe({ cycle: society.cycle });
    if (onsetReached) sampleIfNeeded(samples, society, onset, onsetLedgerLength);
    if (onsetReached && observation?.confirmed && !firstObserverConfirmation) firstObserverConfirmation = { cycle: society.cycle, observation: clone(observation) };
    if (onsetReached && society.cycle - onset.worldCycle >= POST_CYCLES) break;
  }

  if (!onsetReached) throw new Error(`onset not replayed for ${definition.id}`);
  return {
    branchId: definition.id,
    branchLabel: definition.label,
    preInterventionDigest: preDigest,
    onsetLedgerLength,
    firstMechanism,
    firstKernelDiagnostics,
    postOnsetTransitions,
    samples,
    firstObserverConfirmation,
    finalExternalMetrics: externalMetrics(society.externalSnapshot(), onsetLedgerLength),
    contaminationChecks: {
      branchIdentityPassedToChoicePolicy: false,
      branchIdentityPassedToObservation: false,
      branchIdentityPassedToObserver: false,
      branchIdentityPassedToWorld: false,
      runSeedIncludesBranchIdentity: false,
      resultFeedbackToDecision: false
    }
  };
}

function symmetricDifferenceCount(a = [], b = []) {
  const A = new Set(a), B = new Set(b); let n = 0;
  for (const x of A) if (!B.has(x)) n++;
  for (const x of B) if (!A.has(x)) n++;
  return n;
}

function alignedMismatchCount(a = [], b = []) {
  const n = Math.max(a.length, b.length); let mismatch = 0;
  for (let i = 0; i < n; i++) if ((a[i] ?? '__MISSING__') !== (b[i] ?? '__MISSING__')) mismatch++;
  return mismatch;
}

function pairDivergence(intact, other) {
  const maxTransitions = Math.max(intact.postOnsetTransitions.length, other.postOnsetTransitions.length);
  let firstExternalTransitionDivergenceIndex = null;
  for (let i = 0; i < maxTransitions; i++) {
    const left = intact.postOnsetTransitions[i]?.externalEvents ?? ['__MISSING__'];
    const right = other.postOnsetTransitions[i]?.externalEvents ?? ['__MISSING__'];
    if (JSON.stringify(left) !== JSON.stringify(right)) { firstExternalTransitionDivergenceIndex = i; break; }
  }
  const horizons = {};
  for (const horizon of HORIZONS) {
    const key = `plus${horizon}`; const a = intact.samples[key]; const b = other.samples[key];
    horizons[key] = a && b ? {
      eventSequenceDifferent: JSON.stringify(a.eventSequence) !== JSON.stringify(b.eventSequence),
      eventSequenceAlignedMismatchCount: alignedMismatchCount(a.eventSequence, b.eventSequence),
      relationGraphSymmetricDifference: symmetricDifferenceCount(a.relationKeys, b.relationKeys),
      structureRootSetSymmetricDifference: symmetricDifferenceCount(a.structureRootSet, b.structureRootSet),
      survivingStructureCountDifference: b.survivingStructureCount - a.survivingStructureCount,
      crossAgentReuseDifference: b.crossAgentReuseEvents - a.crossAgentReuseEvents,
      participationBreadthDifference: b.participationBreadth - a.participationBreadth
    } : null;
  }
  return { firstExternalTransitionDivergenceIndex, horizons };
}

function validateActualOnset(branches, onset) {
  const byId = Object.fromEntries(branches.map(b => [b.branchId, b]));
  const digests = new Set(branches.map(b => b.preInterventionDigest));
  if (digests.size !== 1 || !digests.has(onset.preDigest)) throw new Error('OMEGA_V2_BRANCH_IDENTITY_GATE_FAILED');

  const o1 = new Set(byId.O1.firstMechanism?.admissibleSignatures ?? []);
  const o2 = new Set(byId.O2.firstMechanism?.admissibleSignatures ?? []);
  const canonical = byId.O0.firstMechanism?.canonicalOmegaAdmissibleSignatures ?? [];
  const novel = byId.O0.firstMechanism?.onlineNovelOmegaAdmissibleSignatures ?? [];
  const compositionExtra = canonical.filter(sig => !o1.has(sig));
  const onlineNovelExtra = novel.filter(sig => !o2.has(sig));
  const gamma0 = byId.O0.firstMechanism?.gammaBridgeAdmissibleSignatures ?? [];
  const gamma1 = byId.O1.firstMechanism?.gammaBridgeAdmissibleSignatures ?? [];
  const gamma2 = byId.O2.firstMechanism?.gammaBridgeAdmissibleSignatures ?? [];
  if (JSON.stringify(gamma0) !== JSON.stringify(gamma1) || JSON.stringify(gamma0) !== JSON.stringify(gamma2)) throw new Error('OMEGA_V2_GAMMA_FLOW_NOT_PRESERVED');
  const primaryValid = compositionExtra.length > 0 && onlineNovelExtra.length > 0;
  if (!primaryValid) throw new Error('OMEGA_V2_ACTUAL_DECISION_RELEVANCE_GATE_FAILED');
  return {
    primaryValid,
    actualCompositionAdmissibleExtraCount: compositionExtra.length,
    actualOnlineNovelAdmissibleExtraCount: onlineNovelExtra.length,
    shamMatchAvailable: byId.O3.firstKernelDiagnostics?.shamMatchAvailable === true,
    previewCompositionAdmissibleExtraCount: onset.atomicBlockedAdmissibleCount,
    previewOnlineNovelAdmissibleCount: onset.onlineNovelAdmissibleCount
  };
}

const onset = await locateOnset();
let branches = [];
let interventionValidity = null;
let pairedDivergence = null;

if (onset.reached) {
  for (const definition of branchDefinitions()) branches.push(await replayBranch(definition, onset));
  interventionValidity = validateActualOnset(branches, onset);
  const byId = Object.fromEntries(branches.map(b => [b.branchId, b]));
  pairedDivergence = {
    O1_vs_O0: pairDivergence(byId.O0, byId.O1),
    O2_vs_O0: pairDivergence(byId.O0, byId.O2),
    O3_vs_O0: pairDivergence(byId.O0, byId.O3)
  };
}

const result = {
  protocol: 'OASIS Omega Causal Probe v2.0',
  designLock: 'OASIS_OMEGA_CAUSAL_PROBE_v2_DESIGN_LOCK_2026-09-09.md',
  preregistration: 'OASIS_OMEGA_CAUSAL_PROBE_PREREG_v2.0.md',
  seedSlot: SEED_SLOT,
  seedSourceIndex: seedRow.sourceIndex,
  seed: RUN_SEED,
  seedHash: seedRow.hash,
  fixedSeedFamilySize: 40,
  eligibilityMaxCycles: ELIGIBILITY_MAX_CYCLES,
  postCycles: POST_CYCLES,
  onset,
  branches,
  interventionValidity,
  pairedDivergence,
  interpretationGuard: onset.reached
    ? 'First online-novel decision-relevant Omega onset selected before Choice/world execution; no effect direction privileged.'
    : 'Eligibility not reached remains in denominator and is not converted into negative causal evidence.',
  implementationBoundary: {
    baseline: 'post-Gamma-v2 integrated flow',
    gammaV2PreservedAcrossBranches: true,
    world: 'prehistoric-clean-world-v1.1 unchanged',
    cohort: '6 neutral founders',
    primitiveGrammar: 11,
    noReward: true, noQ: true, noTarget: true, noFutureStream: true, noCivilizationFeedback: true,
    eligibilityUsesFutureOutcome: false, eligibilitySamplesChoice: false, eligibilityExecutesWorldAction: false
  }
};

const filename = `oasis-omega-v2-causal-probe-seed-slot-${SEED_SLOT}.json`;
await writeFile(filename, JSON.stringify(result, null, 2));
console.log('OASIS_OMEGA_V2_RESULT=' + JSON.stringify({
  seedSlot: SEED_SLOT,
  seed: RUN_SEED,
  onsetReached: onset.reached,
  onsetCycle: onset.worldCycle ?? null,
  actorId: onset.actorId ?? null,
  interventionValid: interventionValidity?.primaryValid ?? null,
  shamMatchAvailable: interventionValidity?.shamMatchAvailable ?? null,
  pairedDivergence
}));