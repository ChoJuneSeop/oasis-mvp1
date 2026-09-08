import assert from 'node:assert/strict';
import { createCleanPrehistoricSocietyV1_1 } from '../src/prehistoric-clean-world-v1.1.mjs';
import { createPrehistoricChoicePolicy } from '../src/prehistoric-cohort-v1.mjs';
import { NEUTRAL_COMPARISON_COHORT_V1 } from '../src/prehistoric-native-memory-reference-agents-v1.mjs';
import { OASISMathKernelV1CanonicalMemorySafe } from '../src/oasis-math-kernel-v1.2-memory-safe.mjs';
import {
  OASISGammaV2Kernel,
  OASISGammaV2OffKernel,
  OASISGammaV2OrderScrambledKernel,
  OASISGammaV2CandidateMatchedShamKernel,
  classifyGammaV2Recurrence,
  buildHistoricalProcessBridgeCandidatesV2
} from '../src/oasis-gamma-v2-kernel.mjs';

const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };
const clone = value => value == null ? value : structuredClone(value);

function createActor(KernelClass, society, spec, runSeed = 'gamma-v2-audit') {
  return new KernelClass({
    world: society.createAgentWorld(spec.id),
    capabilities: society.capabilitiesForAgent(spec.id),
    choicePolicy: createPrehistoricChoicePolicy(spec, runSeed),
    maxSelfInterventions: 1,
    initialBudget: BUDGET,
    lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
  });
}

function comparableExternal(snapshot) {
  return JSON.stringify(snapshot);
}

function syntheticObservation({ exactRelation = false, includeB = true } = {}) {
  const participants = [{ id: 'A', available: true }];
  if (includeB) participants.push({ id: 'B', available: true });
  return {
    id: 'SYN:Y0', sequence: 0, time: 0,
    facts: [],
    relations: exactRelation ? [{ id: 'contact:A->B', kind: 'contact', from: 'A', to: 'B' }] : [],
    participants,
    entities: participants.map(p => p.id),
    responsibilitySignals: {}, relationalProcess: [], meta: {}
  };
}

function sourceRecord(actions = ['move', 'contact']) {
  return {
    occurrenceId: 'experience:0:r:0:contact:A->B',
    sourceExperienceId: 'experience:0',
    order: 0,
    e: 1,
    q: 0,
    relation: { id: 'contact:A->B', kind: 'contact', from: 'A', to: 'B' },
    sourceSigmaActions: actions,
    sourceParticipantIds: ['A', 'B']
  };
}

function positiveSteps({ provideNear = true } = {}) {
  return [
    {
      id: 'move:B', capabilityId: 'move', actor: 'A', action: 'move', target: 'B', participants: ['B'], entities: ['A', 'B'],
      requires: [], provides: provideNear ? ['near:B'] : [], requiresEntities: [], createsEntities: [],
      requiresRelationKinds: [], providesRelationKinds: [], bridgeKeys: [], requiresBridgeKeys: [], relations: [],
      responsibility: {}, lifeViolation: false, requiresLifeAssessment: false, repeatable: false
    },
    {
      id: 'contact:B', capabilityId: 'contact', actor: 'A', action: 'contact', target: 'B', participants: ['B'], entities: ['A', 'B'],
      requires: ['near:B'], provides: [], requiresEntities: [], createsEntities: [],
      requiresRelationKinds: [], providesRelationKinds: ['contact'], bridgeKeys: [], requiresBridgeKeys: [], relations: [],
      responsibility: {}, lifeViolation: false, requiresLifeAssessment: false, repeatable: false
    }
  ];
}

// Audit A — empty-history equivalence on the actual prehistoric grammar.
{
  const seed = 'gamma-v2-audit-empty-history';
  const leftSociety = createCleanPrehistoricSocietyV1_1({ seed, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const rightSociety = createCleanPrehistoricSocietyV1_1({ seed, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const spec = NEUTRAL_COMPARISON_COHORT_V1[0];
  const canonical = createActor(OASISMathKernelV1CanonicalMemorySafe, leftSociety, spec);
  const repaired = createActor(OASISGammaV2Kernel, rightSociety, spec);
  assert.equal(canonical.state.historyRelations.length, 0);
  assert.equal(repaired.state.historyRelations.length, 0);
  await canonical.step();
  await repaired.step();
  assert.equal(comparableExternal(leftSociety.externalSnapshot()), comparableExternal(rightSociety.externalSnapshot()));
}

// Audit B — continuity-only recurrence is semantically allowed but cannot create a unique process bridge.
{
  const observation = syntheticObservation({ exactRelation: true });
  const active = classifyGammaV2Recurrence([sourceRecord()], observation);
  assert.equal(active.length, 1);
  assert.equal(active[0].recurrenceRoute, 'C');
  assert.equal(active[0].continuityDuplicate, true);
  const candidates = buildHistoricalProcessBridgeCandidatesV2({
    observation,
    activeRelations: active,
    steps: positiveSteps(),
    canonicalPossibilities: []
  });
  assert.equal(candidates.length, 0);
}

// Audit C — synthetic positive decision reachability before Choice/world execution.
{
  const observation = syntheticObservation();
  const active = classifyGammaV2Recurrence([sourceRecord()], observation);
  assert.equal(active.length, 1);
  assert.equal(active[0].recurrenceRoute, 'R');
  const candidates = buildHistoricalProcessBridgeCandidatesV2({
    observation,
    activeRelations: active,
    steps: positiveSteps(),
    canonicalPossibilities: []
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].trace.source, 'gamma-v2-historical-process-bridge');
  assert.deepEqual(candidates[0].sigma.map(s => s.action), ['move', 'contact']);
  assert.equal(candidates[0].lifeViolation, false);
}

// Audit D — synthetic negative controls.
{
  const absentEndpoint = classifyGammaV2Recurrence([sourceRecord()], syntheticObservation({ includeB: false }));
  assert.equal(absentEndpoint.length, 0, 'single endpoint alone must not reactivate');

  const observation = syntheticObservation();
  const wrongOrder = classifyGammaV2Recurrence([sourceRecord(['contact', 'move'])], observation);
  const wrongOrderCandidates = buildHistoricalProcessBridgeCandidatesV2({ observation, activeRelations: wrongOrder, steps: positiveSteps(), canonicalPossibilities: [] });
  assert.equal(wrongOrderCandidates.length, 0, 'stored action order mismatch must not bridge');

  const active = classifyGammaV2Recurrence([sourceRecord()], observation);
  const physicalFail = buildHistoricalProcessBridgeCandidatesV2({ observation, activeRelations: active, steps: positiveSteps({ provideNear: false }), canonicalPossibilities: [] });
  assert.equal(physicalFail.length, 0, 'physical/token prerequisite failure must block bridge');

  const duplicate = classifyGammaV2Recurrence([sourceRecord()], syntheticObservation({ exactRelation: true }));
  const duplicateCandidates = buildHistoricalProcessBridgeCandidatesV2({ observation: syntheticObservation({ exactRelation: true }), activeRelations: duplicate, steps: positiveSteps(), canonicalPossibilities: [] });
  assert.equal(duplicateCandidates.length, 0, 'exact current duplicate must not be confirmatory bridge');
}

// Audit E — no preference injection into candidates shared by Gamma ON/OFF.
{
  const fakeWorld = { observe: async () => syntheticObservation(), execute: async () => ({ ok: true }) };
  const capabilities = [
    { id: 'move', instantiate: () => [positiveSteps()[0]] },
    { id: 'contact', instantiate: () => [positiveSteps()[1]] }
  ];
  const make = KernelClass => new KernelClass({
    world: fakeWorld,
    capabilities,
    choicePolicy: () => null,
    initialBudget: BUDGET,
    lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
  });
  const on = make(OASISGammaV2Kernel);
  const off = make(OASISGammaV2OffKernel);
  on.state.historyRelations = [clone(sourceRecord())];
  off.state.historyRelations = [clone(sourceRecord())];
  off.setGammaV2Intervention(true);
  const observation = syntheticObservation();
  const pre = { current: observation.participants, historical: [], affectedEntities: observation.entities };
  const onRelations = on.gamma(observation, pre);
  const offRelations = off.gamma(observation, pre);
  const onParticipation = on.deriveParticipation(observation, onRelations);
  const offParticipation = off.deriveParticipation(observation, offRelations);
  const onPossibilities = on.omega(observation, onParticipation, onRelations, BUDGET);
  const offPossibilities = off.omega(observation, offParticipation, offRelations, BUDGET);
  const offById = new Map(offPossibilities.map(p => [p.id, p]));
  for (const p of onPossibilities) {
    const shared = offById.get(p.id);
    if (!shared) continue;
    assert.equal(on.psi(p, on.kappa(p), observation, onParticipation), off.psi(shared, off.kappa(shared), observation, offParticipation));
    assert.deepEqual(on.responsibilityFor(p, observation, onRelations, onParticipation), off.responsibilityFor(shared, observation, offRelations, offParticipation));
    const onLife = on.applyLifeConstraint([p], { observation, participation: onParticipation, activeRelations: onRelations, responsibilityById: {} });
    const offLife = off.applyLifeConstraint([shared], { observation, participation: offParticipation, activeRelations: offRelations, responsibilityById: {} });
    assert.equal(onLife.admissible.length, offLife.admissible.length);
  }
}

// Audit F — branch classes are behaviorally identical before activation; no branch label enters agent/world computation.
{
  const classes = [OASISGammaV2Kernel, OASISGammaV2OffKernel, OASISGammaV2OrderScrambledKernel, OASISGammaV2CandidateMatchedShamKernel];
  const snapshots = [];
  for (const KernelClass of classes) {
    const society = createCleanPrehistoricSocietyV1_1({ seed: 'gamma-v2-audit-branch-leakage', cohort: NEUTRAL_COMPARISON_COHORT_V1 });
    const spec = NEUTRAL_COMPARISON_COHORT_V1[0];
    const actor = createActor(KernelClass, society, spec, 'gamma-v2-audit-branch-leakage');
    await actor.step();
    snapshots.push(comparableExternal(society.externalSnapshot()));
  }
  assert.equal(new Set(snapshots).size, 1);
}

console.log('OASIS_GAMMA_V2_CONTAMINATION_AUDIT=PASS');
