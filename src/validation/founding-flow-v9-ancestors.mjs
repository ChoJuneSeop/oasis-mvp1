import {
  OASISMutationPolarityCore,
  OASISAncestorV7Node
} from './founding-flow-v7-ancestors.mjs';
import {
  ReactiveAncestorNode,
  StateMemoryAncestorNode,
  sharedGoalForSeed
} from './founding-flow-ancestors.mjs';
import {
  EpisodicAncestorV2Node,
  PredictiveWorldModelAncestorV2Node,
  GoalUtilityAncestorV2Node
} from './founding-flow-v2-ancestors.mjs';
import { TemporalRelationalAncestorV4Node } from './founding-flow-v4-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];

function baseRelationIdentity(relation) {
  return `${relation?.from}->${relation?.to}:${relation?.kind ?? 'rel'}:${relation?.context ?? ''}`;
}

export function roleAwareRelationKey(relation) {
  const role = relation?.processRole ?? null;
  if (role === 'current-state') return `state:${baseRelationIdentity(relation)}`;
  if (role === 'derived-observation') return `observe:${baseRelationIdentity(relation)}`;
  if (role === 'choice-relation') return `choice:${baseRelationIdentity(relation)}`;
  if (role === 'outcome-mutation') return `${relation?.op ?? 'unknown-mutation'}:${baseRelationIdentity(relation)}`;
  if (relation?.meta?.derivedFromGeometry) return `observe:${baseRelationIdentity(relation)}`;
  return `legacy-${relation?.op ?? 'observe'}:${baseRelationIdentity(relation)}`;
}

function tagCurrentRelation(relation) {
  return {
    ...clone(relation),
    processRole: relation?.meta?.derivedFromGeometry ? 'derived-observation' : 'current-state'
  };
}

function tagChoiceRelation(relation) {
  return { ...clone(relation), processRole: 'choice-relation' };
}

function tagOutcomeRelation(relation) {
  return { ...clone(relation), processRole: 'outcome-mutation' };
}

function processRecordKey(relation) {
  return [
    relation?.processRole ?? 'unknown-role',
    relation?.op ?? '',
    relation?.id ?? '',
    relation?.from ?? '',
    relation?.to ?? '',
    relation?.kind ?? '',
    relation?.context ?? '',
    relation?.sourceEventId ?? ''
  ].join('|');
}

export class OASISRelationRoleCore extends OASISMutationPolarityCore {
  reconstituteAffinityField() {
    const field = super.reconstituteAffinityField();
    const historicalRelations = arr(field.historicalRelations).map(clone);
    const currentRelations = arr(field.currentRelations).map(tagCurrentRelation);
    const relations = [...historicalRelations, ...currentRelations];
    return {
      ...field,
      currentRelations,
      historicalRelations,
      relations,
      relationSignature: relations.map(roleAwareRelationKey)
    };
  }

  actualize(choiceId, rawOutcomeEvent) {
    const deliberationBeforeActualize = clone(this.state.lastDeliberation);
    const returned = super.actualize(choiceId, rawOutcomeEvent);
    const stored = this.state.closedExperiences.at(-1);
    if (!stored || stored.id !== returned.id) return returned;

    const records = [
      ...arr(deliberationBeforeActualize?.field?.currentRelations).map(tagCurrentRelation),
      ...arr(deliberationBeforeActualize?.choice?.steps).flatMap(step => arr(step?.relations)).map(tagChoiceRelation),
      ...arr(stored?.outcome?.relations).map(tagOutcomeRelation)
    ];

    const seen = new Set();
    const processRelations = [];
    for (const relation of records) {
      const key = processRecordKey(relation);
      if (seen.has(key)) continue;
      seen.add(key);
      processRelations.push(clone(relation));
    }
    stored.processRelations = processRelations;
    return clone(stored);
  }
}

export class OASISAncestorV9Node extends OASISAncestorV7Node {
  reset() {
    this.core = new OASISRelationRoleCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }
}

export function createFoundingV9AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV4Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorV9Node(seed)
  ];
}

export function sharedGoalForSeedV9(seed) { return sharedGoalForSeed(seed); }
