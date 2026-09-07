import test from 'node:test';
import assert from 'node:assert/strict';
import { runPrehistoricUntilCivilizationV1 } from '../src/prehistoric-continuous-runner-v1.mjs';

const cohort = [
  { id: 'A', disposition: 'neutral' },
  { id: 'B', disposition: 'explorer' },
  { id: 'C', disposition: 'cooperative' }
];

test('scheduler rotates first actor across continuous world cycles', async () => {
  const orders = [];
  const result = await runPrehistoricUntilCivilizationV1({
    cohort,
    maxRuns: 1,
    maxCyclesPerRun: 3,
    createSociety: async () => ({
      async isTerminal() { return false; }
    }),
    createKernelForAgent: async ({ agentSpec }) => ({
      async step() { return { status: 'realized', agentId: agentSpec.id }; }
    }),
    createCivilizationObserver: async () => ({
      async observe({ cycleEvent }) {
        orders.push(cycleEvent.schedulerOrder);
        return { confirmed: false };
      }
    })
  });

  assert.equal(result.status, 'software-guard-reached');
  assert.deepEqual(orders, [
    ['A', 'B', 'C'],
    ['B', 'C', 'A'],
    ['C', 'A', 'B']
  ]);
});

test('natural terminal run without civilization restarts cleanly with a new seed', async () => {
  const societyCreates = [];
  const kernelCreates = [];

  const result = await runPrehistoricUntilCivilizationV1({
    cohort,
    maxRuns: 3,
    maxCyclesPerRun: 10,
    seedForRun: runIndex => `seed-${runIndex}`,
    createSociety: async ({ runIndex, seed }) => {
      societyCreates.push({ runIndex, seed });
      let cycles = 0;
      return {
        markCycle() { cycles += 1; },
        async advanceExogenousFlow() { this.markCycle(); },
        async isTerminal() { return runIndex === 0 && cycles >= 1; },
        async terminalReason() { return 'population-extinction'; }
      };
    },
    createKernelForAgent: async ({ agentSpec, runIndex, seed }) => {
      kernelCreates.push({ agentId: agentSpec.id, runIndex, seed, history: [] });
      return { async step() { return { status: 'nonintervention' }; } };
    },
    createCivilizationObserver: async ({ runIndex }) => ({
      async observe({ cycle }) {
        return { confirmed: runIndex === 1 && cycle >= 1, evidence: runIndex === 1 ? ['E1', 'E2', 'E3'] : [] };
      }
    })
  });

  assert.equal(result.status, 'civilization-confirmed');
  assert.equal(result.runIndex, 1);
  assert.deepEqual(societyCreates, [
    { runIndex: 0, seed: 'seed-0' },
    { runIndex: 1, seed: 'seed-1' }
  ]);
  assert.equal(kernelCreates.length, cohort.length * 2);
  assert.ok(kernelCreates.every(row => row.history.length === 0));
});

test('finite software guard is never reported as absence of civilization', async () => {
  const result = await runPrehistoricUntilCivilizationV1({
    cohort,
    maxRuns: 1,
    maxCyclesPerRun: 1,
    createSociety: async () => ({ async isTerminal() { return false; } }),
    createKernelForAgent: async () => ({ async step() { return { status: 'nonintervention' }; } }),
    createCivilizationObserver: async () => ({ async observe() { return { confirmed: false }; } })
  });

  assert.equal(result.status, 'software-guard-reached');
  assert.match(result.reason, /not evidence/i);
});
