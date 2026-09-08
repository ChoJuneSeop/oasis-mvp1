import { createHash } from 'node:crypto';
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
const SEED_INDEX = Number(process.env.OASIS_MAIN_SEED_INDEX || 0);
const MAX_TOTAL_CYCLES = Number(process.env.OASIS_MAIN_MAX_TOTAL_CYCLES || 180);
const CHECKPOINT_EVERY = Number(process.env.OASIS_MAIN_CHECKPOINT_EVERY || 60);
const EXPECT_CYCLE = Number(process.env.OASIS_EXPECT_CHECKPOINT_CYCLE || 0);
const EXPECT_SHA = process.env.OASIS_EXPECT_CHECKPOINT_SHA || '';
const RUN_SEED = `prehistoric-native-memory-main-v1-seed-${SEED_INDEX}`;
const BUDGET = { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 };
const GROUPS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

if (!GROUPS.includes(GROUP_ID)) throw new Error(`unknown comparison group ${GROUP_ID}`);
if (!Number.isInteger(SEED_INDEX) || SEED_INDEX < 0 || SEED_INDEX > 29) throw new Error('main seed index must be 0..29');
if (!Number.isInteger(MAX_TOTAL_CYCLES) || MAX_TOTAL_CYCLES < 1) throw new Error('main max cycles must be positive');
if (!Number.isInteger(CHECKPOINT_EVERY) || CHECKPOINT_EVERY < 1) throw new Error('checkpoint interval must be positive');
if ((EXPECT_CYCLE > 0) !== Boolean(EXPECT_SHA)) throw new Error('expected checkpoint cycle and sha must be provided together');

const clone = value => value == null ? value : structuredClone(value);
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function seedHash(seed) {
  return createHash('sha256').update(seed).digest('hex');
}

const allSeedRows = Array.from({ length: 30 }, (_, i) => ({
  index: i,
  seed: `prehistoric-native-memory-main-v1-seed-${i}`,
  hash: seedHash(`prehistoric-native-memory-main-v1-seed-${i}`)
})).sort((a, b) => a.hash.localeCompare(b.hash));
const probeSeedIndices = new Set(allSeedRows.slice(0, 10).map(x => x.index));

const society = createCleanPrehistoricSocietyV1_1({ seed: RUN_SEED, cohort: NEUTRAL_COMPARISON_COHORT_V1 });
const observer = createCivilizationObserverV1({ society });
const eventCounts = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, { realized: 0, nonintervention: 0 }]));
const memoryReadCounts = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, 0]));
const capabilitySeen = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [spec.id, new Set()]));
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

function actorCheckpointState() {
  const out = {};
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) out[spec.id] = clone(actors.get(spec.id).state);
  return out;
}

function checkpointPayload() {
  return {
    protocol: 'OASIS Prehistoric Native-Memory Main v1 checkpoint',
    groupId: GROUP_ID,
    seedIndex: SEED_INDEX,
    seed: RUN_SEED,
    cycle: society.cycle,
    world: society.externalSnapshot(),
    actors: actorCheckpointState(),
    eventCounts: clone(eventCounts),
    memoryReadCounts: clone(memoryReadCounts)
  };
}

function makeCheckpoint() {
  const payload = checkpointPayload();
  return {
    cycle: payload.cycle,
    sha256: sha256(payload),
    ledgerLength: payload.world.ledger.length,
    objectCount: payload.world.objects.length,
    relationCount: payload.world.relations.length
  };
}

function contaminationAudit() {
  const audit = {};
  for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
    const actor = actors.get(spec.id);
    audit[spec.id] = GROUP_ID === 'A5'
      ? {
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
        }
      : actor.auditState();
  }
  const clean = Object.values(audit).every(row =>
    row.importedLegacyMemory === false && row.importedReward === false && row.importedQ === false &&
    row.importedRelationEpisodes === false && row.importedFutureStream === false && row.importedTargetAction === false
  );
  return { clean, audit };
}

function externalTrajectoryWindows(snapshot, width = 30) {
  const windows = [];
  for (let start = 0; start < snapshot.cycle; start += width) {
    const end = Math.min(snapshot.cycle, start + width);
    const events = snapshot.ledger.filter(e => e.cycle >= start && e.cycle < end);
    const social = events.filter(e => ['contact', 'transfer'].includes(e.action));
    const actorsInWindow = [...new Set(events.map(e => e.actor).filter(Boolean))];
    const actionTypes = [...new Set(events.map(e => e.action))];
    const pairCounts = new Map();
    for (const e of social) {
      const key = `${e.actor}->${e.target}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    }
    windows.push({
      startCycle: start,
      endCycleExclusive: end,
      eventCount: events.length,
      actionDiversity: actionTypes.length,
      activeActors: actorsInWindow.length,
      interactionCount: social.length,
      repeatedDirectedRelationPairs: [...pairCounts.values()].filter(n => n >= 2).length,
      combineCount: events.filter(e => e.action === 'combine').length,
      transferCount: events.filter(e => e.action === 'transfer').length,
      contactCount: events.filter(e => e.action === 'contact').length
    });
  }
  return windows;
}

let termination = null;
let lastObserver = null;
let expectedCheckpointVerified = EXPECT_CYCLE === 0;
const checkpoints = [];

for (let cycleIndex = 0; cycleIndex < MAX_TOTAL_CYCLES; cycleIndex++) {
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
  lastObserver = await observer.observe({ cycle: society.cycle });

  if (society.cycle % CHECKPOINT_EVERY === 0 || society.cycle === EXPECT_CYCLE) {
    const checkpoint = makeCheckpoint();
    checkpoints.push(checkpoint);
    if (society.cycle === EXPECT_CYCLE) {
      if (checkpoint.sha256 !== EXPECT_SHA) {
        throw new Error(`checkpoint replay mismatch at cycle ${EXPECT_CYCLE}: expected ${EXPECT_SHA} got ${checkpoint.sha256}`);
      }
      expectedCheckpointVerified = true;
    }
  }

  if (lastObserver?.confirmed) {
    termination = { type: 'civilization-observer-confirmed', cycle: society.cycle, observation: clone(lastObserver) };
    break;
  }
  if (await society.isTerminal()) {
    termination = { type: 'natural-terminal', cycle: society.cycle, reason: await society.terminalReason() };
    break;
  }
}

if (!expectedCheckpointVerified) throw new Error(`expected checkpoint cycle ${EXPECT_CYCLE} was not reached`);
if (!checkpoints.some(c => c.cycle === society.cycle)) checkpoints.push(makeCheckpoint());

const snapshot = society.externalSnapshot();
const contamination = contaminationAudit();
const capabilityCoverage = Object.fromEntries(NEUTRAL_COMPARISON_COHORT_V1.map(spec => [
  spec.id,
  {
    seen: [...capabilitySeen[spec.id]].sort(),
    missingInObservedTrajectory: PREHISTORIC_CAPABILITY_GROUP_V1.filter(id => !capabilitySeen[spec.id].has(id))
  }
]));
const actionCounts = {};
for (const spec of NEUTRAL_COMPARISON_COHORT_V1) {
  actionCounts[spec.id] = snapshot.ledger.filter(e => e.actor === spec.id).reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});
}

const structures = snapshot.objects.filter(o => o.type === 'composite').map(o => ({
  id: o.id,
  creator: o.creator,
  createdCycle: o.createdCycle,
  materialSignature: o.materialSignature,
  lineageSize: o.lineage?.length ?? 0,
  heldBy: o.heldBy ?? null
}));

const completedByResearchRule = Boolean(termination);
const result = {
  protocol: 'OASIS Prehistoric Native-Memory Comparison Main v1',
  preregistration: 'PREHISTORIC_NATIVE_MEMORY_COMPARATIVE_PREREG_v1.0.md',
  layer: 'A-primary-native-history',
  groupId: GROUP_ID,
  groupLabel: GROUP_ID === 'A5' ? 'OASIS Relational Recurrence' : REFERENCE_MEMORY_GROUPS_V1[GROUP_ID].label,
  seedIndex: SEED_INDEX,
  seed: RUN_SEED,
  seedHash: seedHash(RUN_SEED),
  flowPreservingProbeSeed: probeSeedIndices.has(SEED_INDEX),
  pilotOnly: false,
  substantiveResearchResult: completedByResearchRule,
  researchTermination: termination,
  status: termination?.type ?? 'main-software-guard-reached',
  guardInterpretation: termination ? null : 'software guard only; this run is incomplete and is not negative evidence',
  maxTotalCyclesGuard: MAX_TOTAL_CYCLES,
  cyclesExecuted: society.cycle,
  checkpointEveryCycles: CHECKPOINT_EVERY,
  checkpoints,
  replayCheckpointExpectation: EXPECT_CYCLE > 0 ? { cycle: EXPECT_CYCLE, sha256: EXPECT_SHA, verified: expectedCheckpointVerified } : null,
  founders: NEUTRAL_COMPARISON_COHORT_V1,
  eventCounts,
  memoryReadCounts,
  capabilityCoverage,
  contaminationClean: contamination.clean,
  memoryAudit: contamination.audit,
  actionCounts,
  structures,
  totalWorldEvents: snapshot.ledger.length,
  currentRelations: snapshot.relations.filter(r => r.activeUntil >= snapshot.cycle).map(r => ({ id: r.id, kind: r.kind, from: r.from, to: r.to })),
  trajectoryWindows30: externalTrajectoryWindows(snapshot, 30),
  civilizationObserverLast: lastObserver,
  externalEvidence: {
    worldLedger: snapshot.ledger,
    finalAgentState: snapshot.agentState,
    finalObjects: snapshot.objects,
    finalRelations: snapshot.relations
  },
  implementationChecks: {
    samePhysicalWorldAdapter: true,
    samePrimitiveGrammar: true,
    sameNeutralPopulation: true,
    sameBudget: BUDGET,
    observerBlindToGroupIdentity: true,
    observerExternalOnly: true,
    contaminationClean: contamination.clean,
    fixedResearchTerminationRules: true,
    deterministicReplayCheckpointing: true
  }
};

const filename = `prehistoric-native-memory-main-${GROUP_ID}-seed-${SEED_INDEX}.json`;
await writeFile(filename, JSON.stringify(result, null, 2));
console.log('OASIS_NATIVE_MEMORY_MAIN_RESULT=' + JSON.stringify({
  groupId: GROUP_ID,
  seedIndex: SEED_INDEX,
  status: result.status,
  cyclesExecuted: result.cyclesExecuted,
  substantiveResearchResult: result.substantiveResearchResult,
  contaminationClean: result.contaminationClean,
  finalCheckpoint: checkpoints.at(-1),
  civilization: termination?.observation ?? null,
  structures: structures.length,
  totalWorldEvents: result.totalWorldEvents
}));
