import { writeFile } from 'node:fs/promises';
import { OASISMathKernelV1Canonical } from '../../executable/src/oasis-math-kernel-v1-canonical.mjs';
import { PREHISTORIC_COHORT_V1, PREHISTORIC_CAPABILITY_GROUP_V1, createPrehistoricChoicePolicy } from './prehistoric-cohort-v1.mjs';
import { runPrehistoricUntilCivilizationV1 } from './prehistoric-continuous-runner-v1.mjs';
import { createCleanPrehistoricSocietyV1_1 } from './prehistoric-clean-world-v1.1.mjs';
import { createCivilizationObserverV1 } from './prehistoric-civilization-observer-v1.mjs';

const RUN_SEED = process.env.OASIS_RUN_SEED || 'prehistoric-civilization-v1-run0';
const MAX_CYCLES = Number(process.env.OASIS_MAX_CYCLES || 400);
let activeSociety = null;

const eventCounts = Object.fromEntries(PREHISTORIC_COHORT_V1.map(a => [a.id, { realized: 0, nonintervention: 0 }]));
const capabilitySeen = Object.fromEntries(PREHISTORIC_COHORT_V1.map(a => [a.id, new Set()]));

const result = await runPrehistoricUntilCivilizationV1({
  cohort: PREHISTORIC_COHORT_V1,
  seedForRun: runIndex => runIndex === 0 ? RUN_SEED : `${RUN_SEED}:repeat:${runIndex}`,
  maxRuns: 1,
  maxCyclesPerRun: MAX_CYCLES,
  createSociety: async ({ seed, cohort }) => {
    activeSociety = createCleanPrehistoricSocietyV1_1({ seed, cohort });
    return activeSociety;
  },
  createKernelForAgent: async ({ agentSpec, society, seed }) => new OASISMathKernelV1Canonical({
    world: society.createAgentWorld(agentSpec.id),
    capabilities: society.capabilitiesForAgent(agentSpec.id),
    choicePolicy: createPrehistoricChoicePolicy(agentSpec, seed),
    maxSelfInterventions: 1,
    initialBudget: { maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 },
    lifeConstraint: ({ possibility }) => possibility.lifeViolation !== true
  }),
  createCivilizationObserver: async ({ society }) => createCivilizationObserverV1({ society }),
  onEvent: async ({ agentId, transition }) => {
    if (transition?.status === 'realized') eventCounts[agentId].realized += 1;
    else eventCounts[agentId].nonintervention += 1;
    for (const round of transition?.deliberation?.rounds ?? []) {
      for (const possibility of round.possibilities ?? []) {
        for (const step of possibility.sigma ?? []) if (step.capabilityId) capabilitySeen[agentId].add(step.capabilityId);
      }
    }
  }
});

const snapshot = activeSociety.externalSnapshot();
const ledger = snapshot.ledger;
const actionCounts = {};
for (const spec of PREHISTORIC_COHORT_V1) {
  const rows = ledger.filter(e => e.actor === spec.id);
  actionCounts[spec.id] = rows.reduce((acc, row) => {
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

const coverage = Object.fromEntries(PREHISTORIC_COHORT_V1.map(spec => [
  spec.id,
  {
    seen: [...capabilitySeen[spec.id]].sort(),
    missing: PREHISTORIC_CAPABILITY_GROUP_V1.filter(id => !capabilitySeen[spec.id].has(id))
  }
]));

const compact = {
  protocol: 'OASIS Prehistoric Full-Flow Civilization Experiment v1.1 Corrected',
  correction: 'remove ordered maxPrimitive starvation; preserve same seed/world/cohort/math kernel',
  seed: RUN_SEED,
  status: result.status,
  researchInterpretation: result.status === 'civilization-confirmed'
    ? 'civilization-emergence-confirmed-by-external-structural-observer'
    : 'software-guard-only-no-negative-conclusion',
  cyclesObserved: snapshot.cycle,
  civilization: result.civilization ?? null,
  founders: PREHISTORIC_COHORT_V1.map(spec => ({ id: spec.id, label: spec.label, disposition: spec.disposition })),
  eventCounts,
  capabilityCoverage: coverage,
  actionCounts,
  currentStructures: structures,
  totalWorldEvents: ledger.length,
  currentRelations: snapshot.relations.filter(r => r.activeUntil >= snapshot.cycle).map(r => ({ id: r.id, kind: r.kind, from: r.from, to: r.to })),
  contaminationBoundary: {
    importedLegacyMemory: false,
    reward: false,
    Q: false,
    relationEpisodes: false,
    futureStream: false,
    targetAction: false,
    civilizationFeedbackToAgents: false
  }
};

await writeFile('prehistoric-experiment-v1.1-result.json', JSON.stringify(compact, null, 2));
console.log('OASIS_PREHISTORIC_EXPERIMENT_V1_1_RESULT=' + JSON.stringify(compact));
