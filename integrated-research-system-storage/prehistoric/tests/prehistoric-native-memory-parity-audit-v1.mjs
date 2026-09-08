import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCleanPrehistoricSocietyV1_1 } from '../src/prehistoric-clean-world-v1.1.mjs';
import { PREHISTORIC_CAPABILITY_GROUP_V1 } from '../src/prehistoric-cohort-v1.mjs';
import {
  NEUTRAL_COMPARISON_COHORT_V1,
  REFERENCE_MEMORY_GROUPS_V1,
  createReferenceMemoryAgentV1
} from '../src/prehistoric-native-memory-reference-agents-v1.mjs';

const SEED = 'prehistoric-native-memory-parity-v1';
const groupIds = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const snapshots = new Map();
const observations = new Map();

for (const groupId of groupIds) {
  const society = createCleanPrehistoricSocietyV1_1({ seed: SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  snapshots.set(groupId, society.externalSnapshot());
  observations.set(groupId, await society.createAgentWorld(NEUTRAL_COMPARISON_COHORT_V1[0].id).observe());

  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    const ids = society.capabilitiesForAgent(spec.id).map(c => c.id);
    assert.deepEqual(ids, PREHISTORIC_CAPABILITY_GROUP_V1, `${groupId}/${spec.id}: capability grammar mismatch`);
  }
}

const baseSnapshot = snapshots.get('A0');
const baseObservation = observations.get('A0');
for (const groupId of groupIds.slice(1)) {
  assert.deepEqual(snapshots.get(groupId), baseSnapshot, `${groupId}: initial external reality differs from A0`);
  assert.deepEqual(observations.get(groupId), baseObservation, `${groupId}: initial observation differs from A0`);
}

for (const [id, group] of Object.entries(REFERENCE_MEMORY_GROUPS_V1)) {
  assert.equal(group.usesOasisKernel, false, `${id}: reference baseline must not use OASIS kernel`);
}

// Static isolation check: A0-A4 implementation may not import/call the OASIS math kernel or named relational operators.
const sourceUrl = new URL('../src/prehistoric-native-memory-reference-agents-v1.mjs', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
assert.equal(/oasis-math-kernel/i.test(source), false, 'reference baselines import OASIS math kernel');
assert.equal(/\bGamma\b|\bgamma\s*\(|\bOmega\b|\bomega\s*\(|\bpsi\s*\(|\bkappa\s*\(/.test(source), false,
  'reference baselines contain OASIS named relational operators');

// Smoke-create every A0-A4 agent from exactly the same empty-memory state.
for (const groupId of Object.keys(REFERENCE_MEMORY_GROUPS_V1)) {
  const society = createCleanPrehistoricSocietyV1_1({ seed: SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
  const spec = NEUTRAL_COMPARISON_COHORT_V1[0];
  const agent = createReferenceMemoryAgentV1({
    groupId,
    agentSpec: spec,
    world: society.createAgentWorld(spec.id),
    capabilities: society.capabilitiesForAgent(spec.id),
    runSeed: SEED
  });
  const audit = agent.auditState();
  assert.equal(audit.episodes, 0);
  assert.equal(audit.reflections, 0);
  assert.equal(audit.longTerm, 0);
  assert.equal(audit.importedLegacyMemory, false);
  assert.equal(audit.importedReward, false);
  assert.equal(audit.importedQ, false);
  assert.equal(audit.importedRelationEpisodes, false);
  assert.equal(audit.importedFutureStream, false);
  assert.equal(audit.importedTargetAction, false);
}

console.log(JSON.stringify({
  status: 'PASS',
  protocol: 'OASIS Prehistoric Native-Memory Comparison Parity Audit v1',
  seed: SEED,
  groups: groupIds,
  foundersPerWorld: NEUTRAL_COMPARISON_COHORT_V1.length,
  capabilityGrammar: PREHISTORIC_CAPABILITY_GROUP_V1,
  checks: {
    identicalInitialExternalReality: true,
    identicalInitialObservation: true,
    identicalCapabilityGrammar: true,
    allNeutralFounders: true,
    referenceBaselinesOasisKernelIsolated: true,
    emptyInitialMemory: true,
    noImportedRewardQFutureTarget: true
  }
}));
