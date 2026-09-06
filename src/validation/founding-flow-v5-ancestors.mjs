import {
  OASISSelectiveRelationalCore,
  OASISAncestorV4Node,
  TemporalRelationalAncestorV4Node
} from './founding-flow-v4-ancestors.mjs';
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

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const intersects = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (bs.has(x)) return true;
  return false;
};
function relationEntities(r) { return uniq([r?.from, r?.to, ...arr(r?.entities)]); }
function relationKey(r) { return `${r?.from}->${r?.to}:${r?.kind ?? 'rel'}:${r?.context ?? ''}`; }
function relationOccurrenceKey(r) { return `${r?.id ?? ''}|${relationKey(r)}`; }

export function processEvidenceEntities(exp, anchorEntityId = 'founder') {
  const evidence = uniq([
    ...arr(exp?.processRelations).flatMap(relationEntities),
    ...arr(exp?.choice?.entities),
    ...arr(exp?.outcome?.affectedEntities),
    ...arr(exp?.outcome?.relations).flatMap(relationEntities)
  ]);
  return evidence.filter(e => e !== anchorEntityId);
}

export class OASISProcessEvidenceCore extends OASISSelectiveRelationalCore {
  reconstituteAffinityField() {
    const anchor = this._anchorEntityId ?? 'founder';
    const seeds = this._currentSeeds();
    const currentRelations = [...this.state.world.relations.values()];
    const frontier = new Set(seeds);
    const currentRelevant = [];
    const selectedCurrent = new Set();
    let currentChanged = true;

    while (currentChanged) {
      currentChanged = false;
      for (const relation of currentRelations) {
        const key = relationOccurrenceKey(relation);
        if (selectedCurrent.has(key)) continue;
        if (!intersects(relationEntities(relation), frontier)) continue;
        selectedCurrent.add(key);
        currentRelevant.push(clone(relation));
        for (const entity of relationEntities(relation)) {
          if (!frontier.has(entity)) {
            frontier.add(entity);
            currentChanged = true;
          }
        }
      }
    }

    const reactivated = [];
    const paths = [];
    let upperBound = this.state.closedExperiences.length;
    while (upperBound > 0) {
      let found = false;
      for (let i = upperBound - 1; i >= 0; i--) {
        const exp = this.state.closedExperiences[i];
        const evidenceEntities = processEvidenceEntities(exp, anchor);
        const touched = evidenceEntities.filter(entity => frontier.has(entity));
        if (!touched.length) continue;
        reactivated.push({
          experienceId: exp.id,
          sequence: exp.sequence,
          touchedEntities: touched,
          relations: clone(arr(exp.processRelations)),
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
    const historicalRelations = reactivated.flatMap(x => x.relations.map(clone));
    const relations = [...historicalRelations, ...currentRelevant.map(clone)];
    return {
      seedEntities: [...seeds],
      participatingEntities: [...frontier],
      reactivatedExperienceIds: reactivated.map(x => x.experienceId),
      reactivated,
      paths,
      currentRelations: currentRelevant,
      historicalRelations,
      relations,
      relationSignature: relations.map(relationKey)
    };
  }
}

export class OASISAncestorV5Node extends OASISAncestorV4Node {
  reset() {
    this.core = new OASISProcessEvidenceCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }
}

export function createFoundingV5AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV4Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorV5Node(seed)
  ];
}

export function sharedGoalForSeedV5(seed) { return sharedGoalForSeed(seed); }
