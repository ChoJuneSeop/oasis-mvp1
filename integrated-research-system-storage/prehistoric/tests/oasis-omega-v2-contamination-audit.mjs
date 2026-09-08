import assert from 'node:assert/strict';
import { createCleanPrehistoricSocietyV1_1 } from '../src/prehistoric-clean-world-v1.1.mjs';
import { createPrehistoricChoicePolicy } from '../src/prehistoric-cohort-v1.mjs';
import { NEUTRAL_COMPARISON_COHORT_V1 } from '../src/prehistoric-native-memory-reference-agents-v1.mjs';
import { OASISGammaV2Kernel } from '../src/oasis-gamma-v2-kernel.mjs';
import {
  OASISOmegaV2Kernel,
  OASISOmegaV2AtomicOnlyKernel,
  OASISOmegaV2FrozenMacroKernel,
  OASISOmegaV2IndependentShamKernel,
  omegaV2MacroSignature,
  isCanonicalOmegaComposite,
  isGammaV2BridgeCandidate,
  omegaV2AdjacentDependency,
  buildOmegaV2IndependentShamPool,
  OmegaV2TestHelpers
} from '../src/oasis-omega-v2-kernel.mjs';

const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };
const clone = value => value == null ? value : structuredClone(value);

function createActor(KernelClass, society, spec, runSeed = 'omega-v2-audit') {
  return new KernelClass({
    world: society.createAgentWorld(spec.id),
    capabilities: society.capabilitiesForAgent(spec.id),
    choicePolicy: createPrehistoricChoicePolicy(spec, runSeed),
    maxSelfInterventions: 1,
    initialBudget: BUDGET,
    lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
  });
}

function syntheticObservation(id = 'SYN:Y0') {
  return {
    id, sequence: 0, time: 0,
    facts: [],
    relations: [],
    participants: [{ id: 'A', available: true }, { id: 'B', available: true }],
    entities: ['A', 'B'],
    responsibilitySignals: {}, relationalProcess: [], meta: {}
  };
}

function baseStep(overrides = {}) {
  return {
    id: 'step', capabilityId: 'step', actor: 'A', action: 'step', target: null,
    participants: [], entities: [], requires: [], provides: [], requiresEntities: [], createsEntities: [],
    requiresRelationKinds: [], providesRelationKinds: [], bridgeKeys: [], requiresBridgeKeys: [], relations: [],
    responsibility: {}, lifeViolation: false, requiresLifeAssessment: false, repeatable: false,
    ...overrides
  };
}

function sourceRecord(actions = ['move', 'observe']) {
  return {
    occurrenceId: 'experience:0:r:0:contact:A->B', sourceExperienceId: 'experience:0', order: 0,
    e: 1, q: 0,
    relation: { id: 'contact:A->B', kind: 'contact', from: 'A', to: 'B' },
    sourceSigmaActions: actions, sourceParticipantIds: ['A', 'B']
  };
}

function syntheticCapabilities() {
  const move = baseStep({ id: 'move:B', capabilityId: 'move', action: 'move', target: 'B', participants: ['B'], entities: ['A', 'B'], provides: ['near:B'] });
  const contact = baseStep({ id: 'contact:B', capabilityId: 'contact', action: 'contact', target: 'B', participants: ['B'], entities: ['A', 'B'], requires: ['near:B'], providesRelationKinds: ['contact'] });
  const observe = baseStep({ id: 'observe:0', capabilityId: 'observe', action: 'observe' });
  const rest = baseStep({ id: 'rest:0', capabilityId: 'rest', action: 'rest' });
  const move2 = baseStep({ id: 'move:X', capabilityId: 'move', action: 'move', target: 'X' });
  return { move, contact, observe, rest, move2 };
}

function makeSyntheticKernel(KernelClass) {
  const obs = syntheticObservation();
  const s = syntheticCapabilities();
  const fakeWorld = { observe: async () => clone(obs), execute: async () => ({ ok: true }) };
  const capabilities = [
    { id: 'move', instantiate: () => [clone(s.move), clone(s.move2)] },
    { id: 'contact', instantiate: () => [clone(s.contact)] },
    { id: 'observe', instantiate: () => [clone(s.observe)] },
    { id: 'rest', instantiate: () => [clone(s.rest)] }
  ];
  const kernel = new KernelClass({ world: fakeWorld, capabilities, choicePolicy: () => null, initialBudget: BUDGET, lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true });
  return { kernel, obs, steps: s };
}

// Audit A — intact Omega-v2 adds diagnostics/library only; behavior equals Gamma-v2 baseline before intervention.
{
  const seed = 'omega-v2-audit-baseline';
  const leftSociety = createCleanPrehistoricSocietyV1_1({ seed, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const rightSociety = createCleanPrehistoricSocietyV1_1({ seed, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const spec = NEUTRAL_COMPARISON_COHORT_V1[0];
  const baseline = createActor(OASISGammaV2Kernel, leftSociety, spec, seed);
  const omega = createActor(OASISOmegaV2Kernel, rightSociety, spec, seed);
  const a = await baseline.step();
  const b = await omega.step();
  assert.deepEqual(a.deliberation?.realizedPossibility ?? null, b.deliberation?.realizedPossibility ?? null);
  assert.deepEqual(leftSociety.externalSnapshot(), rightSociety.externalSnapshot());
}

// Audit B — macro library freezes once and remains immutable.
{
  const { kernel, obs } = makeSyntheticKernel(OASISOmegaV2Kernel);
  const participation = { current: obs.participants, historical: [], affectedEntities: obs.entities };
  kernel.omega(obs, participation, [], BUDGET);
  const first = [...kernel.omegaV2MacroLibrary];
  assert.ok(first.length >= 1, 'fixture must freeze at least one canonical composite signature');
  const obs2 = { ...clone(obs), id: 'SYN:Y1', facts: [{ id: 'extra:fact' }] };
  kernel.omega(obs2, participation, [], BUDGET);
  assert.deepEqual(kernel.omegaV2MacroLibrary, first);
  assert.ok(Object.isFrozen(kernel.omegaV2MacroLibrary));
}

// Audit C — atomic-only removes only canonical Omega composites; atomics and Gamma-v2 bridge candidates remain.
{
  const left = makeSyntheticKernel(OASISOmegaV2Kernel);
  const right = makeSyntheticKernel(OASISOmegaV2AtomicOnlyKernel);
  left.kernel.state.historyRelations = [clone(sourceRecord())];
  right.kernel.state.historyRelations = [clone(sourceRecord())];
  const pLeft = { current: left.obs.participants, historical: [], affectedEntities: left.obs.entities };
  const pRight = { current: right.obs.participants, historical: [], affectedEntities: right.obs.entities };
  // First call freezes libraries before intervention.
  left.kernel.omega(left.obs, pLeft, left.kernel.gamma(left.obs, pLeft), BUDGET);
  right.kernel.omega(right.obs, pRight, right.kernel.gamma(right.obs, pRight), BUDGET);
  right.kernel.setOmegaV2Intervention(true);
  const on = left.kernel.omega(left.obs, pLeft, left.kernel.gamma(left.obs, pLeft), BUDGET);
  const off = right.kernel.omega(right.obs, pRight, right.kernel.gamma(right.obs, pRight), BUDGET);
  const offById = new Map(off.map(p => [p.id, p]));
  for (const p of on.filter(x => !isCanonicalOmegaComposite(x))) assert.deepEqual(offById.get(p.id), p);
  assert.equal(off.filter(isCanonicalOmegaComposite).length, 0);
  assert.equal(on.filter(isGammaV2BridgeCandidate).length, off.filter(isGammaV2BridgeCandidate).length);
}

// Audit D — frozen-macro branch cannot admit a later signature absent from the immutable library.
{
  const { kernel, obs } = makeSyntheticKernel(OASISOmegaV2FrozenMacroKernel);
  const participation = { current: obs.participants, historical: [], affectedEntities: obs.entities };
  kernel.omega(obs, participation, [], BUDGET);
  kernel.omegaV2MacroLibrary = Object.freeze([]);
  kernel.setOmegaV2Intervention(true);
  const returned = kernel.omega(obs, participation, [], BUDGET);
  assert.equal(returned.filter(isCanonicalOmegaComposite).length, 0);
  assert.equal(kernel.omegaV2MacroLibrary.length, 0);
}

// Audit E — independent sham can exactly match a synthetic depth histogram while carrying no adjacent prior-step dependency.
{
  const obs = syntheticObservation();
  const s = syntheticCapabilities();
  const safeSteps = [s.observe, s.rest, s.move2, baseStep({ id: 'move:Y', capabilityId: 'move', action: 'move', target: 'Y' }), baseStep({ id: 'move:Z', capabilityId: 'move', action: 'move', target: 'Z' })];
  const fakeComposite = depth => ({ id: `target:${depth}`, sigma: Array.from({ length: depth }, (_, i) => baseStep({ id: `dep:${depth}:${i}`, capabilityId: i ? 'contact' : 'move', action: i ? 'contact' : 'move', provides: i === 0 ? ['near:B'] : [], requires: i === 1 ? ['near:B'] : [] })), trace: { source: 'canonical-relational-sequential-composition' } });
  const targets = [fakeComposite(2), fakeComposite(2), fakeComposite(3), fakeComposite(4)];
  const intact = [...targets];
  const pool = buildOmegaV2IndependentShamPool({ observation: obs, steps: safeSteps, intactPossibilities: intact, maxNeeded: 20 });
  assert.ok((pool.get(2)?.length ?? 0) >= 2);
  assert.ok((pool.get(3)?.length ?? 0) >= 1);
  assert.ok((pool.get(4)?.length ?? 0) >= 1);
  for (const values of pool.values()) for (const p of values) {
    for (let i = 0; i + 1 < p.sigma.length; i++) assert.equal(omegaV2AdjacentDependency(p.sigma[i], p.sigma[i + 1]).any, false);
  }
  const matched = OmegaV2TestHelpers.selectCountDepthMatchedShams({ observation: obs, steps: safeSteps, intactPossibilities: intact, targetComposites: targets });
  assert.equal(matched.available, true);
  assert.deepEqual(matched.selectedHistogram, matched.targetHistogram);
}

// Audit F — shared candidates receive no Omega-specific preference injection.
{
  const left = makeSyntheticKernel(OASISOmegaV2Kernel);
  const right = makeSyntheticKernel(OASISOmegaV2AtomicOnlyKernel);
  const p = { current: left.obs.participants, historical: [], affectedEntities: left.obs.entities };
  left.kernel.omega(left.obs, p, [], BUDGET);
  right.kernel.omega(right.obs, p, [], BUDGET);
  right.kernel.setOmegaV2Intervention(true);
  const on = left.kernel.omega(left.obs, p, [], BUDGET);
  const off = right.kernel.omega(right.obs, p, [], BUDGET);
  const offById = new Map(off.map(x => [x.id, x]));
  for (const candidate of on) {
    const shared = offById.get(candidate.id);
    if (!shared) continue;
    assert.equal(left.kernel.psi(candidate, left.kernel.kappa(candidate), left.obs, p), right.kernel.psi(shared, right.kernel.kappa(shared), right.obs, p));
    assert.deepEqual(left.kernel.responsibilityFor(candidate, left.obs, [], p), right.kernel.responsibilityFor(shared, right.obs, [], p));
    const lifeA = left.kernel.applyLifeConstraint([candidate], { observation: left.obs, participation: p, activeRelations: [], responsibilityById: {} });
    const lifeB = right.kernel.applyLifeConstraint([shared], { observation: right.obs, participation: p, activeRelations: [], responsibilityById: {} });
    assert.equal(lifeA.admissible.length, lifeB.admissible.length);
  }
}

// Audit G — all branch classes are externally identical before activation; branch labels are not computation inputs.
{
  const classes = [OASISOmegaV2Kernel, OASISOmegaV2AtomicOnlyKernel, OASISOmegaV2FrozenMacroKernel, OASISOmegaV2IndependentShamKernel];
  const snapshots = [];
  for (const KernelClass of classes) {
    const society = createCleanPrehistoricSocietyV1_1({ seed: 'omega-v2-audit-branch-leakage', cohort: NEUTRAL_COMPARISON_COHORT_V1 });
    const spec = NEUTRAL_COMPARISON_COHORT_V1[0];
    const actor = createActor(KernelClass, society, spec, 'omega-v2-audit-branch-leakage');
    await actor.step();
    snapshots.push(JSON.stringify(society.externalSnapshot()));
  }
  assert.equal(new Set(snapshots).size, 1);
}

console.log('OASIS_OMEGA_V2_CONTAMINATION_AUDIT=PASS');