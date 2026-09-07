import assert from 'node:assert/strict';
import { OASISMathKernelV1Canonical } from '../../executable/src/oasis-math-kernel-v1-canonical.mjs';
import { OASISMathKernelV1CanonicalMemorySafe } from '../src/oasis-math-kernel-v1.2-memory-safe.mjs';
import { PREHISTORIC_COHORT_V1, createPrehistoricChoicePolicy } from '../src/prehistoric-cohort-v1.mjs';
import { runPrehistoricUntilCivilizationV1 } from '../src/prehistoric-continuous-runner-v1.mjs';
import { runPrehistoricUntilCivilizationMemorySafeV1_2 } from '../src/prehistoric-continuous-runner-v1.2-memory-safe.mjs';
import { createCleanPrehistoricSocietyV1_1 } from '../src/prehistoric-clean-world-v1.1.mjs';
import { createCivilizationObserverV1 } from '../src/prehistoric-civilization-observer-v1.mjs';

const SEED = 'prehistoric-civilization-v1-run0';
const CYCLES = 12;

async function execute({ KernelClass, runner }) {
  let societyRef = null;
  const signatures = [];
  const result = await runner({
    cohort: PREHISTORIC_COHORT_V1,
    seedForRun: () => SEED,
    maxRuns: 1,
    maxCyclesPerRun: CYCLES,
    createSociety: async ({ seed, cohort }) => {
      societyRef = createCleanPrehistoricSocietyV1_1({ seed, cohort });
      return societyRef;
    },
    createKernelForAgent: async ({ agentSpec, society, seed }) => new KernelClass({
      world: society.createAgentWorld(agentSpec.id),
      capabilities: society.capabilitiesForAgent(agentSpec.id),
      choicePolicy: createPrehistoricChoicePolicy(agentSpec, seed),
      maxSelfInterventions: 1,
      initialBudget: { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 },
      lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
    }),
    createCivilizationObserver: async ({ society }) => createCivilizationObserverV1({ society }),
    onEvent: async ({ agentId, transition }) => {
      signatures.push({
        agentId,
        status: transition?.status ?? null,
        choiceId: transition?.deliberation?.realizedPossibility?.id ?? null,
        action: transition?.experience?.executionResult?.steps?.at?.(-1)?.action
          ?? transition?.experience?.executionResult?.action
          ?? null,
        experienceId: transition?.experience?.id ?? null,
        historyLength: transition?.historyLength ?? null
      });
    }
  });
  return { result, signatures, snapshot: societyRef.externalSnapshot() };
}

const canonical = await execute({ KernelClass: OASISMathKernelV1Canonical, runner: runPrehistoricUntilCivilizationV1 });
const memorySafe = await execute({ KernelClass: OASISMathKernelV1CanonicalMemorySafe, runner: runPrehistoricUntilCivilizationMemorySafeV1_2 });

assert.equal(canonical.result.status, memorySafe.result.status, 'runner status diverged');
assert.deepEqual(canonical.signatures, memorySafe.signatures, 'decision/realization signatures diverged');
assert.deepEqual(canonical.snapshot.ledger, memorySafe.snapshot.ledger, 'world event ledger diverged');
assert.deepEqual(canonical.snapshot.objects, memorySafe.snapshot.objects, 'world objects diverged');
assert.deepEqual(canonical.snapshot.relations, memorySafe.snapshot.relations, 'world relations diverged');
assert.equal(canonical.snapshot.cycle, memorySafe.snapshot.cycle, 'world cycle diverged');

console.log(JSON.stringify({
  status: 'PASS',
  seed: SEED,
  cycles: CYCLES,
  transitionCount: canonical.signatures.length,
  ledgerEvents: canonical.snapshot.ledger.length,
  note: 'v1.2 memory-safe representation is trajectory-equivalent to v1.1 canonical for this deterministic prefix'
}));
