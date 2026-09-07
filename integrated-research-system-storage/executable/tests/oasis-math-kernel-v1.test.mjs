import test from 'node:test';
import assert from 'node:assert/strict';
import { OASISMathKernelV1 } from '../src/oasis-math-kernel-v1.mjs';

function makeWorld(frames) {
  let index = 0;
  let executed = null;
  return {
    async observe() {
      const frame = frames[Math.min(index, frames.length - 1)];
      index += 1;
      return structuredClone(frame);
    },
    async execute(choice) {
      executed = choice.id;
      return { accepted: true, choiceId: choice.id };
    },
    get executed() { return executed; },
    get observations() { return index; }
  };
}

const observeCapability = {
  id: 'observe',
  instantiate: ({ observation }) => observation.entities.length ? [{ id: 'observe-current', action: 'observe', entities: [observation.entities[0]] }] : []
};

test('zero history can still construct a first possibility from current reality and capability', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['rock'], participants: [{ id: 'agent' }] }]);
  const kernel = new OASISMathKernelV1({ world, capabilities: [observeCapability], maxSelfInterventions: 0 });
  const deliberation = await kernel.deliberate();
  assert.equal(kernel.state.history.length, 0);
  assert.equal(deliberation.status, 'chosen');
  assert.equal(deliberation.rounds[0].activeRelations.length, 0);
  assert.equal(deliberation.realizedPossibility.B_c[0], 'observe');
});

test('non-current historical relation remains existent and is not deleted by time or non-participation', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['other'], participants: [{ id: 'agent' }] }]);
  const kernel = new OASISMathKernelV1({ world, capabilities: [], maxSelfInterventions: 0 });
  kernel.wIncorporate({
    id: 'exp-old',
    processRelations: [{ id: 'r-old', from: 'a', to: 'b', kind: 'trust' }],
    choice: { R_c: [], sigma: [] },
    outcomeObservation: { relations: [] }
  });
  const y = await kernel.observe();
  const participation = { current: y.participants, historical: [], affectedEntities: y.entities };
  const active = kernel.gamma(y, participation);
  assert.equal(active.length, 0);
  const state = kernel.relationState();
  assert.equal(state.length, 1);
  assert.equal(state[0].e, 1);
  assert.equal(state[0].q, 0);
});

test('Omega composes multiple capabilities only through an explicit process bridge', async () => {
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
  const kernel = new OASISMathKernelV1({ world, capabilities, maxSelfInterventions: 0, initialBudget: { maxDepth: 3, maxPrimitive: 16, maxCompositions: 32, verificationPasses: 1 } });
  const d = await kernel.deliberate();
  const composites = d.rounds[0].possibilities.filter(p => p.sigma.length > 1);
  assert.ok(composites.some(p => p.sigma.map(s => s.id).join('>') === 'gather-wood>build-shelter'));
});

test('multiple admissible possibilities without Choice Axis policy end in non-intervention, never implicit argmax', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a', 'b'], participants: [{ id: 'agent' }] }]);
  const capability = {
    id: 'touch',
    instantiate: () => [
      { id: 'touch-a', actor: 'agent', action: 'touch', target: 'a' },
      { id: 'touch-b', actor: 'agent', action: 'touch', target: 'b' }
    ]
  };
  const kernel = new OASISMathKernelV1({ world, capabilities: [capability], maxSelfInterventions: 1 });
  const d = await kernel.deliberate();
  assert.equal(d.status, 'nonintervention');
  assert.equal(d.realizedPossibility, null);
  assert.equal(world.observations, 2, 'self-intervention must re-observe latest reality');
});

test('explicit Choice Axis policy can close exactly one possibility and W stores only realized experience', async () => {
  const world = makeWorld([
    { id: 'before', entities: ['a', 'b'], participants: [{ id: 'agent' }] },
    { id: 'after', entities: ['a', 'b'], participants: [{ id: 'agent' }], relations: [{ id: 'r1', from: 'agent', to: 'a', kind: 'contact' }] }
  ]);
  const capability = {
    id: 'touch',
    instantiate: () => [
      { id: 'touch-a', actor: 'agent', action: 'touch', target: 'a', relations: [{ id: 'r-choice', from: 'agent', to: 'a', kind: 'contact' }] },
      { id: 'touch-b', actor: 'agent', action: 'touch', target: 'b' }
    ]
  };
  const kernel = new OASISMathKernelV1({
    world,
    capabilities: [capability],
    choicePolicy: ({ admissible }) => admissible.find(p => p.sigma[0].id === 'touch-a').id,
    maxSelfInterventions: 0
  });
  const result = await kernel.step();
  assert.equal(result.status, 'realized');
  assert.equal(world.executed, 'c:touch-a');
  assert.equal(kernel.state.history.length, 1);
  assert.equal(kernel.state.history[0].choice.id, 'c:touch-a');
  assert.equal(kernel.state.history.some(x => x.choice?.id === 'c:touch-b'), false);
});

test('W appends realized experience and preserves previous history', () => {
  const world = makeWorld([{ id: 'y0' }]);
  const kernel = new OASISMathKernelV1({ world, capabilities: [] });
  kernel.wIncorporate({ id: 'e1', processRelations: [], choice: { R_c: [], sigma: [] }, outcomeObservation: { relations: [] } });
  kernel.wIncorporate({ id: 'e2', processRelations: [], choice: { R_c: [], sigma: [] }, outcomeObservation: { relations: [] } });
  assert.deepEqual(kernel.state.history.map(x => x.id), ['e1', 'e2']);
});

test('self-intervention re-observes newer reality and recomputes Gamma/Omega against that reality', async () => {
  const world = makeWorld([
    { id: 'y0', entities: ['a', 'b'], participants: [{ id: 'agent' }] },
    { id: 'y1', entities: ['only'], participants: [{ id: 'agent' }] }
  ]);
  const capability = {
    id: 'react',
    instantiate: ({ observation }) => observation.id === 'y0'
      ? [{ id: 'p1', actor: 'agent', action: 'x' }, { id: 'p2', actor: 'agent', action: 'y' }]
      : [{ id: 'p3', actor: 'agent', action: 'z' }]
  };
  const kernel = new OASISMathKernelV1({ world, capabilities: [capability], maxSelfInterventions: 1 });
  const d = await kernel.deliberate();
  assert.equal(d.status, 'chosen');
  assert.equal(d.rounds.length, 2);
  assert.equal(d.rounds[0].observation.id, 'y0');
  assert.equal(d.rounds[1].observation.id, 'y1');
  assert.equal(d.realizedPossibility.id, 'c:p3');
});

test('generic danger field is not interpreted as Responsibility Axis', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a'], participants: [{ id: 'agent' }], danger: 1, meta: { danger: 1 } }]);
  const kernel = new OASISMathKernelV1({ world, capabilities: [observeCapability], maxSelfInterventions: 0 });
  const d = await kernel.deliberate();
  const rho = Object.values(d.rounds[0].responsibilityById)[0];
  assert.equal(rho.uncertainty, 0);
  assert.equal(rho.lifeSafetyImpact, 0);
});

test('explicit life-value violation is filtered before realization', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a'], participants: [{ id: 'agent' }] }]);
  const capability = {
    id: 'unsafe',
    instantiate: () => [{ id: 'unsafe-step', actor: 'agent', action: 'unsafe', lifeViolation: true }]
  };
  const kernel = new OASISMathKernelV1({ world, capabilities: [capability], maxSelfInterventions: 0 });
  const d = await kernel.deliberate();
  assert.equal(d.status, 'nonintervention');
  assert.equal(d.rounds[0].life.rejected[0].reason, 'explicit-life-value-violation');
});

test('P distribution is normalized but does not decide D', async () => {
  const world = makeWorld([{ id: 'y0', entities: ['a', 'b'], participants: [{ id: 'agent' }] }]);
  const capability = {
    id: 'pick',
    instantiate: () => [
      { id: 'low', actor: 'agent', action: 'pick', target: 'a' },
      { id: 'high', actor: 'agent', action: 'pick', target: 'b' }
    ]
  };
  const kernel = new OASISMathKernelV1({
    world,
    capabilities: [capability],
    potentialModel: ({ possibility }) => possibility.id === 'c:high' ? 100 : 0,
    maxSelfInterventions: 0
  });
  const d = await kernel.deliberate();
  const sum = d.rounds[0].distribution.reduce((s, x) => s + x.probability, 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
  assert.ok(d.rounds[0].distribution.find(x => x.possibilityId === 'c:high').probability > 0.99);
  assert.equal(d.status, 'nonintervention', 'high P must not become an implicit argmax choice');
});

test('historical relations have no time-based expiry', async () => {
  const frames = Array.from({ length: 20 }, (_, i) => ({ id: `y${i}`, time: i * 1000000, entities: ['unrelated'], participants: [{ id: 'agent' }] }));
  const world = makeWorld(frames);
  const kernel = new OASISMathKernelV1({ world, capabilities: [], maxSelfInterventions: 0 });
  kernel.wIncorporate({
    id: 'old',
    processRelations: [{ id: 'ancient', from: 'x', to: 'y', kind: 'bond' }],
    choice: { R_c: [], sigma: [] },
    outcomeObservation: { relations: [] }
  });
  for (let i = 0; i < 20; i++) await kernel.observe();
  assert.equal(kernel.relationState()[0].e, 1);
});
