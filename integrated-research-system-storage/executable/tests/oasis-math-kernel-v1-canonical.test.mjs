import test from 'node:test';
import assert from 'node:assert/strict';
import { OASISMathKernelV1Canonical } from '../src/oasis-math-kernel-v1-canonical.mjs';

function makeWorld(frames) {
  let index = 0;
  return {
    async observe() {
      const frame = frames[Math.min(index, frames.length - 1)];
      index += 1;
      return structuredClone(frame);
    },
    async execute(choice) {
      return { accepted: true, choiceId: choice.id };
    }
  };
}

test('canonical Gamma does not reactivate history from shared actor/endpoint alone', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a', 'c'], participants: [{ id: 'a' }], relations: [{ id: 'now', from: 'a', to: 'c', kind: 'trust' }] }]);
  const kernel = new OASISMathKernelV1Canonical({ world, capabilities: [], maxSelfInterventions: 0 });
  kernel.wIncorporate({
    id: 'past',
    processRelations: [{ id: 'past-r', from: 'a', to: 'b', kind: 'trust' }],
    choice: { R_c: [], sigma: [] },
    outcomeObservation: { relations: [] }
  });
  const y = await kernel.observe();
  const active = kernel.gamma(y, { current: y.participants, historical: [], affectedEntities: y.entities });
  assert.equal(active.length, 0);
  assert.equal(kernel.relationState()[0].q, 0);
});

test('canonical Gamma re-currentizes the same directed relational structure', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a', 'b'], participants: [{ id: 'a' }], relations: [{ id: 'new-id', from: 'a', to: 'b', kind: 'trust' }] }]);
  const kernel = new OASISMathKernelV1Canonical({ world, capabilities: [], maxSelfInterventions: 0 });
  kernel.wIncorporate({
    id: 'past',
    processRelations: [{ id: 'past-r', from: 'a', to: 'b', kind: 'trust' }],
    choice: { R_c: [], sigma: [] },
    outcomeObservation: { relations: [] }
  });
  const y = await kernel.observe();
  const active = kernel.gamma(y, { current: y.participants, historical: [], affectedEntities: y.entities });
  assert.equal(active.length, 1);
  assert.equal(kernel.relationState()[0].q, 1);
});

test('canonical Omega does not admit unsatisfied primitive as atomic, but can construct it after an explicit bridge', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['agent', 'wood'], participants: [{ id: 'agent' }], facts: [] }]);
  const capabilities = [
    {
      id: 'gather',
      instantiate: () => [{ id: 'gather-wood', actor: 'agent', action: 'gather', target: 'wood', provides: ['has-wood'], bridgeKeys: ['material-ready'] }]
    },
    {
      id: 'build',
      instantiate: () => [{ id: 'build-shelter', actor: 'agent', action: 'build', requires: ['has-wood'], requiresBridgeKeys: ['material-ready'], createsEntities: ['shelter'] }]
    }
  ];
  const kernel = new OASISMathKernelV1Canonical({
    world,
    capabilities,
    maxSelfInterventions: 0,
    initialBudget: { maxDepth: 3, maxPrimitive: 16, maxCompositions: 32, verificationPasses: 1 }
  });
  const d = await kernel.deliberate();
  const ids = d.rounds[0].possibilities.map(p => p.id);
  assert.equal(ids.includes('c:build-shelter'), false, 'unsatisfied build must not appear as atomic possibility');
  assert.ok(ids.includes('c:gather-wood>build-shelter'), 'build may emerge through an explicit process bridge');
});
