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

function chooseUniqueExtreme(admissible, metric, direction) {
  const rows = admissible.map(possibility => ({ possibility, value: Number(metric(possibility)) || 0 }));
  const extreme = direction === 'min'
    ? Math.min(...rows.map(row => row.value))
    : Math.max(...rows.map(row => row.value));
  const winners = rows.filter(row => row.value === extreme);
  return winners.length === 1 ? winners[0].possibility.id : null;
}

/**
 * Experiment-specific Choice-Axis disposition.
 * This is not a universal OASIS decision law and never converts personality into reward.
 * If the declared disposition does not uniquely distinguish one admissible possibility,
 * the policy returns null so the canonical kernel remains fail-closed.
 */
export function createPrehistoricPersonalityChoicePolicy(agentSpec) {
  if (!agentSpec || !agentSpec.id || !agentSpec.disposition) {
    throw new TypeError('valid prehistoric agentSpec is required');
  }

  return ({ admissible, activeRelations }) => {
    if (!Array.isArray(admissible) || admissible.length <= 1) {
      return admissible?.[0]?.id ?? null;
    }

    switch (agentSpec.disposition) {
      case 'neutral':
        return null;
      case 'explorer':
        return chooseUniqueExtreme(
          admissible,
          possibility => relationExpansionCount(possibility, activeRelations),
          'max'
        );
      case 'cooperative':
        return chooseUniqueExtreme(
          admissible,
          possibility => otherParticipantCount(possibility, agentSpec.id),
          'max'
        );
      case 'self-reliant':
        return chooseUniqueExtreme(
          admissible,
          possibility => otherParticipantCount(possibility, agentSpec.id),
          'min'
        );
      case 'continuity':
        return chooseUniqueExtreme(
          admissible,
          possibility => activeRelationUseCount(possibility, activeRelations),
          'max'
        );
      case 'compositional':
        return chooseUniqueExtreme(admissible, compositionalDepth, 'max');
      default:
        throw new Error(`unknown prehistoric disposition: ${agentSpec.disposition}`);
    }
  };
}

export function buildPrehistoricAgentSpecsV1() {
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
    choicePolicy: createPrehistoricPersonalityChoicePolicy(agent)
  }));
}
