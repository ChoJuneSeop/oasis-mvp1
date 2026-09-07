import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREHISTORIC_CAPABILITY_GROUP_V1,
  PREHISTORIC_COHORT_V1,
  buildPrehistoricAgentSpecsV1,
  createPrehistoricChoicePolicy
} from '../src/prehistoric-cohort-v1.mjs';

test('cohort contains one neutral OASIS and five distinct personality OASIS agents', () => {
  assert.equal(PREHISTORIC_COHORT_V1.length, 6);
  assert.equal(PREHISTORIC_COHORT_V1.filter(x => x.disposition === 'neutral').length, 1);
  assert.equal(new Set(PREHISTORIC_COHORT_V1.map(x => x.disposition)).size, 6);
});

test('all six agents receive the same capability group', () => {
  const agents = buildPrehistoricAgentSpecsV1('seed-a');
  for (const agent of agents) {
    assert.deepEqual(agent.capabilities, [...PREHISTORIC_CAPABILITY_GROUP_V1]);
  }
});

test('clean initialization imports no legacy memory, reward, Q, relation episodes, future stream, or target action', () => {
  const agents = buildPrehistoricAgentSpecsV1('seed-a');
  for (const agent of agents) {
    assert.deepEqual(agent.initialState.history, []);
    assert.deepEqual(agent.initialState.historyRelations, []);
    assert.deepEqual(agent.initialState.realizations, []);
    assert.equal(agent.initialState.importedLegacyMemory, false);
    assert.equal(agent.initialState.importedReward, false);
    assert.equal(agent.initialState.importedQ, false);
    assert.equal(agent.initialState.importedRelationEpisodes, false);
    assert.equal(agent.initialState.importedFutureStream, false);
    assert.equal(agent.initialState.importedTargetAction, false);
  }
});

test('neutral OASIS closes among already admissible possibilities without argmax', () => {
  const spec = PREHISTORIC_COHORT_V1[0];
  const policy = createPrehistoricChoicePolicy(spec, 'seed-a');
  const admissible = [
    { id: 'a', A_c: [spec.id], R_c: [], sigma: [{}] },
    { id: 'b', A_c: [spec.id], R_c: [], sigma: [{}] }
  ];
  const chosen = policy({
    admissible,
    activeRelations: [],
    distribution: [
      { possibilityId: 'a', probability: 0.99 },
      { possibilityId: 'b', probability: 0.01 }
    ],
    observation: { id: 'obs-0' },
    round: 0
  });
  assert.ok(['a', 'b'].includes(chosen));
});

test('choice is reproducible for the same run seed and observation', () => {
  const spec = PREHISTORIC_COHORT_V1[0];
  const context = {
    admissible: [
      { id: 'a', A_c: [spec.id], R_c: [], sigma: [{}] },
      { id: 'b', A_c: [spec.id], R_c: [], sigma: [{}] }
    ],
    activeRelations: [],
    distribution: [
      { possibilityId: 'a', probability: 0.5 },
      { possibilityId: 'b', probability: 0.5 }
    ],
    observation: { id: 'obs-1' },
    round: 0
  };
  assert.equal(
    createPrehistoricChoicePolicy(spec, 'same-seed')(context),
    createPrehistoricChoicePolicy(spec, 'same-seed')(context)
  );
});

test('compositional personality restricts choice to the deepest valid composition', () => {
  const spec = PREHISTORIC_COHORT_V1.find(x => x.disposition === 'compositional');
  const policy = createPrehistoricChoicePolicy(spec, 'seed-c');
  const chosen = policy({
    admissible: [
      { id: 'one', A_c: [spec.id], R_c: [], sigma: [{}] },
      { id: 'two', A_c: [spec.id], R_c: [], sigma: [{}, {}] }
    ],
    activeRelations: [],
    distribution: [
      { possibilityId: 'one', probability: 0.9 },
      { possibilityId: 'two', probability: 0.1 }
    ],
    observation: { id: 'obs-c' },
    round: 0
  });
  assert.equal(chosen, 'two');
});
