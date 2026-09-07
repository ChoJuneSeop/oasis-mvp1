import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREHISTORIC_CAPABILITY_GROUP_V1,
  PREHISTORIC_COHORT_V1,
  buildPrehistoricAgentSpecsV1,
  createPrehistoricPersonalityChoicePolicy
} from '../src/prehistoric-cohort-v1.mjs';

test('cohort contains one neutral OASIS and five distinct personality OASIS agents', () => {
  assert.equal(PREHISTORIC_COHORT_V1.length, 6);
  assert.equal(PREHISTORIC_COHORT_V1.filter(x => x.disposition === 'neutral').length, 1);
  assert.equal(new Set(PREHISTORIC_COHORT_V1.map(x => x.disposition)).size, 6);
});

test('all six agents receive the same capability group', () => {
  const agents = buildPrehistoricAgentSpecsV1();
  for (const agent of agents) {
    assert.deepEqual(agent.capabilities, [...PREHISTORIC_CAPABILITY_GROUP_V1]);
  }
});

test('clean initialization imports no legacy memory, reward, Q, relation episodes, future stream, or target action', () => {
  const agents = buildPrehistoricAgentSpecsV1();
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

test('neutral personality does not invent a semantic winner when multiple possibilities remain', () => {
  const policy = createPrehistoricPersonalityChoicePolicy(PREHISTORIC_COHORT_V1[0]);
  const result = policy({
    admissible: [
      { id: 'a', A_c: ['OASIS-N0'], R_c: [], sigma: [{}] },
      { id: 'b', A_c: ['OASIS-N0'], R_c: [], sigma: [{}] }
    ],
    activeRelations: []
  });
  assert.equal(result, null);
});

test('personality policies remain fail-closed when their own disposition cannot uniquely distinguish candidates', () => {
  for (const spec of PREHISTORIC_COHORT_V1.slice(1)) {
    const policy = createPrehistoricPersonalityChoicePolicy(spec);
    const result = policy({
      admissible: [
        { id: 'a', A_c: [spec.id], R_c: [], sigma: [{}] },
        { id: 'b', A_c: [spec.id], R_c: [], sigma: [{}] }
      ],
      activeRelations: []
    });
    assert.equal(result, null, spec.id);
  }
});
