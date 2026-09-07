const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

export const PREHISTORIC_CAPABILITY_GROUP_V1 = Object.freeze([
  'observe',
  'move',
  'contact',
  'grasp',
  'carry',
  'release',
  'consume',
  'transfer',
  'strike',
  'combine',
  'rest'
]);

export const PREHISTORIC_COHORT_V1 = Object.freeze([
  Object.freeze({ id: 'OASIS-N0', label: '무개성', disposition: 'neutral' }),
  Object.freeze({ id: 'OASIS-P1', label: '탐색형', disposition: 'explorer' }),
  Object.freeze({ id: 'OASIS-P2', label: '협력형', disposition: 'cooperative' }),
  Object.freeze({ id: 'OASIS-P3', label: '자립형', disposition: 'self-reliant' }),
  Object.freeze({ id: 'OASIS-P4', label: '지속형', disposition: 'continuity' }),
  Object.freeze({ id: 'OASIS-P5', label: '구성형', disposition: 'compositional' })
]);

export const CLEAN_INITIAL_OASIS_STATE_V1 = Object.freeze({
  history: Object.freeze([]),
  historyRelations: Object.freeze([]),
  realizations: Object.freeze([]),
  importedLegacyMemory: false,
  importedReward: false,
  importedQ: false,
  importedRelationEpisodes: false,
  importedFutureStream: false,
  importedTargetAction: false
});

function activeRelationIds(activeRelations) {
  return new Set(activeRelations.map(record => record?.relation?.id).filter(Boolean));
}

function otherParticipantCount(possibility, agentId) {
  return uniq(possibility.A_c ?? []).filter(id => id !== agentId).length;
}

function activeRelationUseCount(possibility, activeRelations) {
  const active = activeRelationIds(activeRelations);
  return uniq(possibility.R_c ?? []).filter(relation => active.has(relation.id)).length;
}

function relationExpansionCount(possibility, activeRelations) {
  const active = activeRelationIds(activeRelations);
  return uniq(possibility.R_c ?? []).filter(relation => !active.has(relation.id)).length;
}

function compositionalDepth(possibility) {
  return Array.isArray(possibility.sigma) ? possibility.sigma.length : 0;
}

function hashUnit(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function distributionMap(distribution) {
  return new Map((distribution ?? []).map(row => [row.possibilityId, Number(row.probability) || 0]));
}

function weightedSample(candidates, distribution, randomUnit) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].id;

  const weights = distributionMap(distribution);
  const rows = candidates.map(candidate => ({
    candidate,
    weight: Math.max(0, weights.get(candidate.id) ?? 0)
  }));
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (!(total > 0)) {
    return rows[Math.min(rows.length - 1, Math.floor(randomUnit * rows.length))].candidate.id;
  }

  let target = randomUnit * total;
  for (const row of rows) {
    target -= row.weight;
    if (target <= 0) return row.candidate.id;
  }
  return rows.at(-1).candidate.id;
}

function extremePool(admissible, metric, direction) {
  const rows = admissible.map(possibility => ({ possibility, value: Number(metric(possibility)) || 0 }));
  const extreme = direction === 'min'
    ? Math.min(...rows.map(row => row.value))
    : Math.max(...rows.map(row => row.value));
  return rows.filter(row => row.value === extreme).map(row => row.possibility);
}

/**
 * Experiment-specific Choice-Axis policy.
 *
 * Common neutral layer:
 * - closes one already-constructed admissible possibility by stochastic sampling from P_t;
 * - never uses argmax P_t;
 * - never imports reward, success criteria, or a target action.
 *
 * Personality layer:
 * - changes only the admissible candidate pool according to an explicit structural disposition;
 * - sampling within that pool still uses P_t;
 * - personality is an experimental independent variable, not a universal OASIS law.
 */
export function createPrehistoricChoicePolicy(agentSpec, runSeed = 'prehistoric-run-0') {
  if (!agentSpec || !agentSpec.id || !agentSpec.disposition) {
    throw new TypeError('valid prehistoric agentSpec is required');
  }

  return ({ admissible, activeRelations, distribution, observation, round }) => {
    if (!Array.isArray(admissible) || admissible.length === 0) return null;
    if (admissible.length === 1) return admissible[0].id;

    let pool = admissible;
    switch (agentSpec.disposition) {
      case 'neutral':
        break;
      case 'explorer':
        pool = extremePool(admissible, p => relationExpansionCount(p, activeRelations), 'max');
        break;
      case 'cooperative':
        pool = extremePool(admissible, p => otherParticipantCount(p, agentSpec.id), 'max');
        break;
      case 'self-reliant':
        pool = extremePool(admissible, p => otherParticipantCount(p, agentSpec.id), 'min');
        break;
      case 'continuity':
        pool = extremePool(admissible, p => activeRelationUseCount(p, activeRelations), 'max');
        break;
      case 'compositional':
        pool = extremePool(admissible, compositionalDepth, 'max');
        break;
      default:
        throw new Error(`unknown prehistoric disposition: ${agentSpec.disposition}`);
    }

    const randomUnit = hashUnit(`${runSeed}|${agentSpec.id}|${observation?.id ?? 'no-observation'}|${round ?? 0}`);
    return weightedSample(pool, distribution, randomUnit);
  };
}

// Backward-compatible name for the experiment-specific disposition factory.
export const createPrehistoricPersonalityChoicePolicy = createPrehistoricChoicePolicy;

export function buildPrehistoricAgentSpecsV1(runSeed = 'prehistoric-run-0') {
  return PREHISTORIC_COHORT_V1.map(agent => ({
    ...agent,
    capabilities: [...PREHISTORIC_CAPABILITY_GROUP_V1],
    initialState: {
      history: [],
      historyRelations: [],
      realizations: [],
      importedLegacyMemory: false,
      importedReward: false,
      importedQ: false,
      importedRelationEpisodes: false,
      importedFutureStream: false,
      importedTargetAction: false
    },
    choicePolicy: createPrehistoricChoicePolicy(agent, runSeed)
  }));
}
