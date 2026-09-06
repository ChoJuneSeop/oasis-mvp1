import {
  OASISRelationRoleCore,
  OASISAncestorV9Node,
  roleAwareRelationKey,
  sharedGoalForSeedV9
} from './founding-flow-v9-ancestors.mjs';
import { processEvidenceEntities } from './founding-flow-v5-ancestors.mjs';
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
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const intersects = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (bs.has(x)) return true;
  return false;
};

function relationEntities(relation) {
  return uniq([relation?.from, relation?.to, ...arr(relation?.entities)]);
}

function tagCurrentRelation(relation) {
  return {
    ...clone(relation),
    processRole: relation?.meta?.derivedFromGeometry ? 'derived-observation' : 'current-state'
  };
}

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
  return canonicalSort(arr(relations).map(tagCurrentRelation));
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
      // Multiple mutations from one observed outcome are treated as one concurrent
      // mutation set unless explicit sub-event ordering exists elsewhere.
      outcome.push(clone(relation));
    } else {
      // Unknown/legacy order is not guessed away.
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

function canonicalEntitySet(values) {
  return uniq(values).sort((a, b) => String(a).localeCompare(String(b)));
}

export class OASISConcurrentCanonicalCore extends OASISRelationRoleCore {
  reconstituteAffinityField() {
    const anchor = this._anchorEntityId ?? 'founder';
    const seedEntities = canonicalEntitySet([...this._currentSeeds()]);
    const frontier = new Set(seedEntities);

    // Preserve the v9 relation-role semantics first, then canonicalize the current
    // simultaneous relation set BEFORE traversal so serialization order cannot alter
    // frontier expansion order.
    const currentRelations = canonicalizeCurrentRelations([...this.state.world.relations.values()]);
    const currentRelevant = [];
    const selectedCurrent = new Set();
    let changed = true;

    while (changed) {
      changed = false;
      for (const relation of currentRelations) {
        const occurrence = `${relation?.id ?? ''}|${roleAwareRelationKey(relation)}`;
        if (selectedCurrent.has(occurrence)) continue;
        if (!intersects(relationEntities(relation), frontier)) continue;
        selectedCurrent.add(occurrence);
        currentRelevant.push(clone(relation));
        for (const entity of canonicalEntitySet(relationEntities(relation))) {
          if (!frontier.has(entity)) {
            frontier.add(entity);
            changed = true;
          }
        }
      }
    }

    // Experience sequence remains temporal and is NOT globally sorted away.
    const reactivated = [];
    const paths = [];
    let upperBound = this.state.closedExperiences.length;
    while (upperBound > 0) {
      let found = false;
      for (let i = upperBound - 1; i >= 0; i--) {
        const exp = this.state.closedExperiences[i];
        const evidenceEntities = canonicalEntitySet(processEvidenceEntities(exp, anchor));
        const touched = evidenceEntities.filter(entity => frontier.has(entity));
        if (!touched.length) continue;

        const relations = canonicalizeProcessRelations(exp.processRelations);
        reactivated.push({
          experienceId: exp.id,
          sequence: exp.sequence,
          touchedEntities: touched,
          relations,
          choice: clone(exp.choice),
          outcome: clone(exp.outcome)
        });
        paths.push({
          fromCurrentEntities: touched,
          toExperienceId: exp.id,
          sequence: exp.sequence,
          evidenceBasis: 'process-relations-choice-outcome'
        });

        for (const entity of evidenceEntities) frontier.add(entity);
        upperBound = i;
        found = true;
        break;
      }
      if (!found) break;
    }

    reactivated.reverse();
    paths.reverse();

    const historicalRelations = reactivated.flatMap(exp => exp.relations.map(clone));
    const canonicalCurrentRelevant = canonicalSort(currentRelevant);
    const relations = [...historicalRelations, ...canonicalCurrentRelevant];

    return {
      seedEntities,
      participatingEntities: canonicalEntitySet([...frontier]),
      reactivatedExperienceIds: reactivated.map(exp => exp.experienceId),
      reactivated,
      paths,
      currentRelations: canonicalCurrentRelevant,
      historicalRelations,
      relations,
      relationSignature: relations.map(roleAwareRelationKey)
    };
  }

  actualize(choiceId, rawOutcomeEvent) {
    const returned = super.actualize(choiceId, rawOutcomeEvent);
    const stored = this.state.closedExperiences.at(-1);
    if (!stored || stored.id !== returned.id) return returned;

    // Representation-only normalization. Contents and temporal experience sequence
    // are unchanged.
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
