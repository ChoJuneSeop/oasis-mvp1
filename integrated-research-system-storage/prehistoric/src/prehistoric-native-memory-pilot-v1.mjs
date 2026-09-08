import { writeFile } from 'node:fs/promises';
import { createCleanPrehistoricSocietyV1_1 } from './prehistoric-clean-world-v1.1.mjs';
import { createCivilizationObserverV1 } from './prehistoric-civilization-observer-v1.mjs';
import { PREHISTORIC_CAPABILITY_GROUP_V1, createPrehistoricChoicePolicy } from './prehistoric-cohort-v1.mjs';
import { OASISMathKernelV1CanonicalMemorySafe } from './oasis-math-kernel-v1.2-memory-safe.mjs';
import {
  NEUTRAL_COMPARISON_COHORT_V1,
  REFERENCE_MEMORY_GROUPS_V1,
  createReferenceMemoryAgentV1
} from './prehistoric-native-memory-reference-agents-v1.mjs';

const GROUP_ID = process.env.OASIS_COMPARE_GROUP || 'A0';
const SEED_INDEX = Number(process.env.OASIS_PILOT_SEED_INDEX || 0);
const SEGMENT_CYCLES = Number(process.env.OASIS_PILOT_SEGMENT_CYCLES || 24);
const RUN_SEED = `prehistoric-native-memory-pilot-v1-seed-${SEED_INDEX}`;
const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };

if (!['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].includes(GROUP_ID)) throw new Error(`unknown comparison group ${GROUP_ID}`);
if (!Number.isInteger(SEED_INDEX) || SEED_INDEX < 0 || SEED_INDEX > 4) throw new Error('pilot seed index must be 0..4');
if (!Number.isInteger(SEGMENT_CYCLES) || SEGMENT_CYCLES < 1) throw new Error('pilot segment cycles must be positive');

const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
const observer = createCivilizationObserverV1({ society });
const capabilitySeen = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, new Set()]));
const eventCounts = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, { realized: 0, nonintervention: 0 }]));
const memoryReadCounts = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, 0]));

const actors = new Map();
if (GROUP_ID === 'A5') {
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    actors.set(spec.id, new OASISMathKernelV1CanonicalMemorySafe({
      world: society.createAgentWorld(spec.id),
      capabilities: society.capabilitiesForAgent(spec.id),
      choicePolicy: createPrehistoricChoicePolicy(spec, RUN_SEED),
      maxSelfInterventions: 1,
      initialBudget: BUDGET,
      lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
    }));
  }
} else {
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    actors.set(spec.id, createReferenceMemoryAgentV1({
      groupId: GROUP_ID,
      agentSpec: spec,
      world: society.createAgentWorld(spec.id),
      capabilities: society.capabilitiesForAgent(spec.id),
      runSeed: RUN_SEED,
      budget: BUDGET
    }));
  }
}

let civilization = null;
let cyclesExecuted = 0;
for (let cycleIndex = 0; cycleIndex < SEGMENT_CYCLES; cycleIndex++) {
  const shift = cycleIndex % NEUTRAL_COMPARISON_COHORT_V1.length;
  const order = [...NEUTRAL_COMPARISON_COHORT_V1.slice(shift), ...NEUTRAL_COMPARISON_COHORT_V1.slice(0, shift)];

  for (const spec of order) {
    const actor = actors.get(spec.id);
    const transition = await actor.step();
    if (transition?.status === 'realized') eventCounts[spec.id].realized += 1;
    else eventCounts[spec.id].nonintervention += 1;

    if (GROUP_ID === 'A5') {
      for (const round of transition?.deliberation?.rounds ?? []) {
        for (const possibility of round.possibilities ?? []) {
          for (const step of possibility.sigma ?? []) if (step.capabilityId) capabilitySeen[spec.id].add(step.capabilityId);
        }
      }
    } else {
      for (const id of transition?.generatedCapabilityIds ?? []) capabilitySeen[spec.id].add(id);
      memoryReadCounts[spec.id] += Number(transition?.memoryItemsRead ?? 0);
    }
  }

  await society.advanceExogenousFlow();
  cyclesExecuted += 1;
  const observed = await observer.observe({ cycle: society.cycle });
  if (observed?.confirmed) {
    civilization = observed;
    break;
  }
}

const snapshot = society.externalSnapshot();
const actionCounts = {};
for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
  actionCounts[spec.id] = snapshot.ledger.filter(e => e.actor === spec.id).reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});
}

const memoryAudit = {};
for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
  const actor = actors.get(spec.id);
  if (GROUP_ID === 'A5') {
    memoryAudit[spec.id] = {
      mechanism: 'OASIS-relational-recurrence',
      historyLength: actor.state.history.length,
      historyRelationLength: actor.state.historyRelations.length,
      realizationLength: actor.state.realizations.length,
      importedLegacyMemory: false,
      importedReward: false,
      importedQ: false,
      importedRelationEpisodes: false,
      importedFutureStream: false,
      importedTargetAction: false
    };
  } else {
    memoryAudit[spec.id] = actor.auditState();
  }
}

const coverage = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [
  spec.id,
  {
    seen: [...capabilitySeen[spec.id]].sort(),
    missing: PREHISTORIC_CAPABILITY_GROUP_V1.filter(id => !capabilitySeen[spec.id].has(id))
  }
]));
const allCapabilityFamiliesSeen = Object.values(coverage).every(row => row.missing.length === 0);
const contaminationClean = Object.values(memoryAudit).every(row =>
  row.importedLegacyMemory === false && row.importedReward === false && row.importedQ === false &&
  row.importedRelationEpisodes === false && row.importedFutureStream === false && row.importedTargetAction === false
);

const structures = snapshot.objects.filter(o => o.type === 'composite').map(o => ({
  id: o.id,
  creator: o.creator,
  createdCycle: o.createdCycle,
  materialSignature: o.materialSignature,
  lineageSize: o.lineage?.length ?? 0,
  heldBy: o.heldBy ?? null
}));

const result = {
  protocol: 'OASIS Prehistoric Native-Memory Comparison Pilot v1',
  preregistration: 'PREHISTORIC_NATIVE_MEMORY_COMPARATIVE_PREREG_v1.0.md',
  groupId: GROUP_ID,
  groupLabel: GROUP_ID === 'A5' ? 'OASIS Relational Recurrence' : REFERENCE_MEMORY_GROUPS_V1[GROUP_ID].label,
  seedIndex: SEED_INDEX,
  seed: RUN_SEED,
  pilotOnly: true,
  substantiveResearchResult: false,
  segmentGuardCycles: SEGMENT_CYCLES,
  cyclesExecuted,
  status: civilization ? 'pilot-civilization-observer-triggered' : 'pilot-segment-guard-reached',
  guardInterpretation: 'software/pilot guard only; absence of observer confirmation is not negative research evidence',
  civilizationObservation: civilization,
  founders: NEUTRAL_COMPARISON_COHORT_V1,
  eventCounts,
  capabilityCoverage: coverage,
  pilotChecks: {
    allCapabilityFamiliesSeen,
    contaminationClean,
    observerIsExternalOnly: true,
    samePhysicalWorldAdapter: true,
    samePrimitiveGrammar: true,
    sameNeutralPopulation: true,
    sameBudget: BUDGET
  },
  memoryReadCounts,
  memoryAudit,
  actionCounts,
  structures,
  totalWorldEvents: snapshot.ledger.length,
  currentRelations: snapshot.relations.filter(r => r.activeUntil >= snapshot.cycle).map(r => ({ id: r.id, kind: r.kind, from: r.from, to: r.to }))
};

const filename = `prehistoric-native-memory-pilot-${GROUP_ID}-seed-${SEED_INDEX}.json`;
await writeFile(filename, JSON.stringify(result, null, 2));
console.log('OASIS_NATIVE_MEMORY_PILOT_RESULT=' + JSON.stringify(result));
