import {
  OASISProcessEvidenceCore,
  OASISAncestorV5Node
} from './founding-flow-v5-ancestors.mjs';
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

export function mutationAwareRelationKey(relation) {
  const op = relation?.op ?? 'observe';
  return `${op}:${relation?.from}->${relation?.to}:${relation?.kind ?? 'rel'}:${relation?.context ?? ''}`;
}

export class OASISMutationPolarityCore extends OASISProcessEvidenceCore {
  reconstituteAffinityField() {
    const field = super.reconstituteAffinityField();
    return {
      ...field,
      relationSignature: field.relations.map(mutationAwareRelationKey)
    };
  }
}

export class OASISAncestorV7Node extends OASISAncestorV5Node {
  reset() {
    this.core = new OASISMutationPolarityCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }
}

export function createFoundingV7AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV4Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorV7Node(seed)
  ];
}

export function sharedGoalForSeedV7(seed) { return sharedGoalForSeed(seed); }

export function cloneRelationWithMutationIdentity(relation) {
  return { ...clone(relation), structuralMutationKey: mutationAwareRelationKey(relation) };
}
