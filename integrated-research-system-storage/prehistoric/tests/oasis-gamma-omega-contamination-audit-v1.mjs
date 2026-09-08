import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createCleanPrehistoricSocietyV1_1 } from '../src/prehistoric-clean-world-v1.1.mjs';
import { createPrehistoricChoicePolicy } from '../src/prehistoric-cohort-v1.mjs';
import { NEUTRAL_COMPARISON_COHORT_V1 } from '../src/prehistoric-native-memory-reference-agents-v1.mjs';
import { OASISMathKernelV1CanonicalMemorySafe } from '../src/oasis-math-kernel-v1.2-memory-safe.mjs';
import {
  GammaOffKernelV1,
  GammaHistoryLossControlKernelV1,
  OmegaAtomicOnlyKernelV1,
  OmegaCountMatchedControlKernelV1,
  interventionKernelOwnMethodsV1
} from '../src/oasis-gamma-omega-intervention-kernels-v1.mjs';

const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };
const AUDIT_SEED = 'oasis-gamma-omega-contamination-audit-v1';
const clone = value => value == null ? value : structuredClone(value);
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function createActors(society, KernelClass) {
  const actors = new Map();
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    actors.set(spec.id, new KernelClass({
      world: society.createAgentWorld(spec.id),
      capabilities: society.capabilitiesForAgent(spec.id),
      choicePolicy: createPrehistoricChoicePolicy(spec, AUDIT_SEED),
      maxSelfInterventions: 1,
      initialBudget: BUDGET,
      lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true,
      controlSeed: AUDIT_SEED,
      controlAgentId: spec.id
    }));
  }
  return actors;
}

function rotatedOrder(cycleIndex) {
  const shift = cycleIndex % NEUTRAL_COMPARISON_COHORT_V1.length;
  return [...NEUTRAL_COMPARISON_COHORT_V1.slice(shift), ...NEUTRAL_COMPARISON_COHORT_V1.slice(0, shift)];
}

async function inactivePrefixDigest(KernelClass, cycles = 4) {
  const society = createCleanPrehistoricSocietyV1_1({ seed: AUDIT_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const actors = createActors(society, KernelClass);
  for (let cycleIndex = 0; cycleIndex < cycles; cycleIndex++) {
    for (const spec of rotatedOrder(cycleIndex)) await actors.get(spec.id).step();
    await society.advanceExogenousFlow();
  }
  return sha256({
    world: society.externalSnapshot(),
    actors: Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, clone(actors.get(spec.id).state)]))
  });
}

// Audit 1: intervention subclasses may own only their explicit local operator
// and activation/diagnostic methods. They must not override choice, observation,
// responsibility, life constraint, realization, or W incorporation paths.
assert.deepEqual(interventionKernelOwnMethodsV1(GammaOffKernelV1), ['gamma', 'setGammaIntervention']);
assert.deepEqual(interventionKernelOwnMethodsV1(GammaHistoryLossControlKernelV1), ['gamma', 'setGammaIntervention']);
assert.deepEqual(interventionKernelOwnMethodsV1(OmegaAtomicOnlyKernelV1), ['omega', 'setOmegaIntervention']);
assert.deepEqual(interventionKernelOwnMethodsV1(OmegaCountMatchedControlKernelV1), ['omega', 'setOmegaIntervention']);

// Audit 2: with interventions OFF, all classes must produce exactly the same
// external world and causally-live actor state over a deterministic prefix.
const classes = [
  OASISMathKernelV1CanonicalMemorySafe,
  GammaOffKernelV1,
  GammaHistoryLossControlKernelV1,
  OmegaAtomicOnlyKernelV1,
  OmegaCountMatchedControlKernelV1
];
const prefixDigests = [];
for (const Klass of classes) prefixDigests.push(await inactivePrefixDigest(Klass));
assert.equal(new Set(prefixDigests).size, 1, `inactive intervention classes diverged: ${JSON.stringify(prefixDigests)}`);

// Audit 3-6: static boundary audit of the experiment runner.
const runnerPath = new URL('../src/oasis-gamma-omega-causal-probe-v1.mjs', import.meta.url);
const runnerSource = readFileSync(runnerPath, 'utf8');
assert.match(runnerSource, /createPrehistoricChoicePolicy\(spec, RUN_SEED\)/, 'choice policy must receive only spec + common run seed');
assert.match(runnerSource, /createCivilizationObserverV1\(\{ society \}\)/, 'observer must receive society only');
assert.doesNotMatch(runnerSource, /readFile|readFileSync|createReadStream/, 'runner must not read prior result files');
assert.match(runnerSource, /runSeedIncludesBranchIdentity: false/, 'runner must explicitly audit branch-free run seed');
assert.match(runnerSource, /branchIdentityPassedToObserver: false/, 'runner must explicitly audit observer blindness');
assert.match(runnerSource, /PRE_INTERVENTION_BRANCH_IDENTITY_GATE_FAILED/, 'runner must fail closed on branch pre-state mismatch');
assert.match(runnerSource, /INTERVENTION_VALIDITY_GATE_FAILED/, 'runner must fail closed on intervention no-op');

// Fixed fresh seed family audit. No past-result data enters this construction.
for (const namespace of ['oasis-gamma-causal-v1', 'oasis-omega-causal-v1']) {
  const rows = Array.from({ length: 40 }, (_, index) => {
    const seed = `${namespace}:${String(index).padStart(3, '0')}`;
    return { seed, hash: createHash('sha256').update(seed).digest('hex') };
  }).sort((a, b) => a.hash.localeCompare(b.hash));
  assert.equal(rows.length, 40);
  assert.equal(new Set(rows.map(row => row.seed)).size, 40);
  assert.equal(new Set(rows.map(row => row.hash)).size, 40);
}

const report = {
  status: 'PASS',
  protocol: 'OASIS Gamma/Omega contamination audit v1',
  audits: {
    targetedOperatorOverrideOnly: true,
    inactivePrefixSemanticIdentity: true,
    commonChoiceSeedNoBranchLabel: true,
    observerReceivesSocietyOnly: true,
    runnerReadsNoPriorResults: true,
    freshFortySeedFamiliesFixed: true,
    preInterventionShaFailClosed: true,
    interventionValidityFailClosed: true
  },
  inactivePrefixDigest: prefixDigests[0],
  note: 'PASS establishes implementation-boundary checks before causal outcomes. It is not evidence for Gamma/Omega causal efficacy.'
};
console.log('OASIS_GAMMA_OMEGA_CONTAMINATION_AUDIT=' + JSON.stringify(report));
