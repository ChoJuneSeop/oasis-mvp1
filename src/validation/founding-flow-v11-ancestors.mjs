import {
  OASISRelationRoleCore,
  OASISAncestorV9Node,
  roleAwareRelationKey,
  sharedGoalForSeedV9
} from './founding-flow-v9-ancestors.mjs';
import {
  ReactiveAncestorNode,
  StateMemoryAncestorNode
} from './founding-flow-ancestors.mjs';
import {
  EpisodicAncestorV2Node,
  PredictiveWorldModelAncestorV2Node,
  GoalUtilityAncestorV2Node
} from './founding-flow-v2-ancestors.mjs';
import { TemporalRelationalAncestorV4Node } from './founding-flow-v4-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];

function canonicalRelationSortKey(relation) {
  return [
    roleAwareRelationKey(relation),
    relation?.id ?? '',
    relation?.sourceEventId ?? '',
    relation?.from ?? '',
    relation?.to ?? '',
    relation?.kind ?? '',
    relation?.context ?? ''
  ].join('|');
}

function canonicalSort(relations) {
  return arr(relations)
    .map(clone)
    .sort((a, b) => canonicalRelationSortKey(a).localeCompare(canonicalRelationSortKey(b)));
}

export function canonicalizeCurrentRelations(relations) {
  return canonicalSort(relations);
}

export function canonicalizeProcessRelations(relations) {
  const context = [];
  const choice = [];
  const outcome = [];
  const legacy = [];

  for (const relation of arr(relations)) {
    if (relation?.processRole === 'current-state' || relation?.processRole === 'derived-observation') {
      context.push(clone(relation));
    } else if (relation?.processRole === 'choice-relation') {
      // Choice-step ordering may carry actual process order, so preserve it.
      choice.push(clone(relation));
    } else if (relation?.processRole === 'outcome-mutation') {
      // Multiple mutations from one actual outcome are an unordered set unless
      // explicit sub-event order is represented elsewhere.
      outcome.push(clone(relation));
    } else {
      // Unknown/legacy order is left untouched rather than guessed away.
      legacy.push(clone(relation));
    }
  }

  return [
    ...canonicalSort(context),
    ...choice,
    ...canonicalSort(outcome),
    ...legacy
  ];
}

export class OASISConcurrentCanonicalCore extends OASISRelationRoleCore {
  reconstituteAffinityField() {
    const field = super.reconstituteAffinityField();

    // Reactivated experience sequence itself remains untouched. Only the relation
    // set inside each completed experience is normalized where order is not explicit.
    const reactivated = arr(field.reactivated).map(exp => ({
      ...clone(exp),
      relations: canonicalizeProcessRelations(exp.relations)
    }));

    const historicalRelations = reactivated.flatMap(exp => exp.relations.map(clone));
    const currentRelations = canonicalizeCurrentRelations(field.currentRelations);
    const relations = [...historicalRelations, ...currentRelations];

    return {
      ...field,
      reactivated,
      currentRelations,
      historicalRelations,
      relations,
      relationSignature: relations.map(roleAwareRelationKey)
    };
  }

  actualize(choiceId, rawOutcomeEvent) {
    const returned = super.actualize(choiceId, rawOutcomeEvent);
    const stored = this.state.closedExperiences.at(-1);
    if (!stored || stored.id !== returned.id) return returned;

    // Normalize representation only. No relation is added, deleted or reinterpreted.
    stored.processRelations = canonicalizeProcessRelations(stored.processRelations);
    return clone(stored);
  }
}

export class OASISAncestorV11Node extends OASISAncestorV9Node {
  reset() {
    this.core = new OASISConcurrentCanonicalCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }
}

export function createFoundingV11AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV4Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorV11Node(seed)
  ];
}

export function sharedGoalForSeedV11(seed) {
  return sharedGoalForSeedV9(seed);
}
