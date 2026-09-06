import { OASISReferenceCore } from '../oasis-reference-core.mjs';
import {
  ReactiveAncestorNode,
  StateMemoryAncestorNode,
  OASISAncestorNode,
  sharedGoalForSeed
} from './founding-flow-ancestors.mjs';
import {
  TemporalRelationalAncestorV2Node,
  EpisodicAncestorV2Node,
  PredictiveWorldModelAncestorV2Node,
  GoalUtilityAncestorV2Node
} from './founding-flow-v2-ancestors.mjs';
import {
  actionKey,
  enumeratePrimitiveActions,
  spatialRelations
} from './founding-flow-world.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const intersects = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (bs.has(x)) return true;
  return false;
};

function relationEntities(r) { return uniq([r?.from, r?.to, ...arr(r?.entities)]); }
function consequenceEntities(c) { return uniq([c?.entity, c?.from, c?.to, ...arr(c?.entities), ...arr(c?.affects)]); }
function affordanceEntities(a) {
  return uniq([
    a?.actor, a?.target,
    ...arr(a?.entities), ...arr(a?.requiresEntities), ...arr(a?.createsEntities), ...arr(a?.removesEntities),
    ...arr(a?.relations).flatMap(relationEntities), ...arr(a?.consequences).flatMap(consequenceEntities)
  ]);
}
function experienceProcessRelations(exp) { return arr(exp?.processRelations).map(clone); }
function experienceEntities(exp) {
  return uniq([
    ...arr(exp?.participation?.current).map(x => typeof x === 'string' ? x : x?.id),
    ...arr(exp?.participation?.historical).map(x => typeof x === 'string' ? x : x?.id),
    ...experienceProcessRelations(exp).flatMap(relationEntities),
    ...arr(exp?.choice?.entities), ...arr(exp?.outcome?.affectedEntities),
    ...arr(exp?.before?.changedEntities), ...arr(exp?.after?.changedEntities)
  ]);
}
function relationKey(r) { return `${r?.from}->${r?.to}:${r?.kind ?? 'rel'}:${r?.context ?? ''}`; }
function relationOccurrenceKey(r) { return `${r?.id ?? ''}|${relationKey(r)}`; }
function semanticActionId(step) { return step?.meta?.originalStepId ?? step?.id ?? null; }

export class OASISSelectiveRelationalCore extends OASISReferenceCore {
  constructor(options = {}) {
    super(options);
    this._validationLegalActionIds = new Set();
    this._anchorEntityId = options.anchorEntityId ?? 'founder';
  }

  _currentSeeds() {
    const latest = this.state.flow.at(-1);
    return new Set(latest?.changedEntities ?? []);
  }

  deriveParticipation(field) {
    const base = super.deriveParticipation(field);
    const related = new Set(field.participatingEntities);
    const current = base.current.filter(p => p.id === this._anchorEntityId || related.has(p.id));
    return { ...base, current };
  }

  setValidationPrimitiveAffordances(affordances) {
    this._validationLegalActionIds = new Set(affordances.map(a => a.meta?.originalStepId ?? a.id));
    this.state.world.affordances = new Map(affordances.map(a => [a.id, clone(a)]));
  }

  reconstituteAffinityField() {
    const anchor = this._anchorEntityId;
    const seeds = this._currentSeeds();
    const currentRelations = [...this.state.world.relations.values()];
    const frontier = new Set(seeds);
    const currentRelevant = [];
    const selectedCurrent = new Set();
    let currentChanged = true;

    while (currentChanged) {
      currentChanged = false;
      for (const r of currentRelations) {
        const key = relationOccurrenceKey(r);
        if (selectedCurrent.has(key)) continue;
        if (!intersects(relationEntities(r), frontier)) continue;
        selectedCurrent.add(key);
        currentRelevant.push(clone(r));
        for (const e of relationEntities(r)) {
          if (!frontier.has(e)) { frontier.add(e); currentChanged = true; }
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
        const entities = experienceEntities(exp);
        const touchedNonAnchor = entities.filter(e => e !== anchor && frontier.has(e));
        if (!touchedNonAnchor.length) continue;
        reactivated.push({
          experienceId: exp.id,
          sequence: exp.sequence,
          touchedEntities: touchedNonAnchor,
          relations: clone(experienceProcessRelations(exp)),
          choice: clone(exp.choice),
          outcome: clone(exp.outcome)
        });
        paths.push({ fromCurrentEntities: touchedNonAnchor, toExperienceId: exp.id, sequence: exp.sequence });
        for (const e of entities) frontier.add(e);
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

  _supportForAffordance(affordance, field) {
    const anchor = this._anchorEntityId;
    const actionEntities = new Set(affordanceEntities(affordance).filter(e => e !== anchor));
    const relationSupport = field.relations.filter(r => {
      const relational = relationEntities(r).filter(e => e !== anchor);
      return actionEntities.size > 0 && intersects(relational, actionEntities);
    });
    const experienceSupport = field.reactivated.filter(exp => {
      const ee = uniq([
        ...arr(exp.relations).flatMap(relationEntities),
        ...arr(exp.choice?.entities),
        ...arr(exp.outcome?.affectedEntities)
      ]).filter(e => e !== anchor);
      return actionEntities.size > 0 && intersects(ee, actionEntities);
    }).map(x => x.experienceId);
    if (affordance.meta?.reactivatedExperienceId && field.reactivated.some(e => e.experienceId === affordance.meta.reactivatedExperienceId)) {
      experienceSupport.push(affordance.meta.reactivatedExperienceId);
    }
    return { relations: relationSupport.map(clone), experienceIds: uniq(experienceSupport) };
  }

  _reactivatedAffordances(field, participation) {
    return super._reactivatedAffordances(field, participation).filter(a =>
      this._validationLegalActionIds.has(a.meta?.originalStepId ?? a.id)
    );
  }
}

function corePrimitiveAffordance(action) {
  const id = actionKey(action);
  return {
    id,
    op: 'upsert',
    actor: 'founder',
    action: id,
    target: action.op === 'touch' ? action.target : null,
    entities: action.op === 'touch' ? ['founder', action.target] : ['founder'],
    requires: [], provides: [], requiresEntities: [], createsEntities: [], removesEntities: [],
    relations: [], consequences: [], obligations: [], resolves: [], violates: [],
    meta: { primitiveAction: clone(action), originalStepId: id }
  };
}

export class OASISAncestorV4Node extends OASISAncestorNode {
  reset() {
    this.core = new OASISSelectiveRelationalCore({ realizationSeed: this.seed, anchorEntityId: 'founder' });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }

  _installDerivedCurrent(snapshot) {
    for (const r of spatialRelations(snapshot).filter(r => r.kind === 'adjacent-to')) {
      this.core.state.world.relations.set(r.id, clone(r));
    }
    const primitive = enumeratePrimitiveActions(snapshot).map(corePrimitiveAffordance);
    this.core.setValidationPrimitiveAffordances(primitive);
    for (const claim of snapshot.deltaClaims ?? []) {
      if (claim.temporality === 'instant' && claim.kind !== 'relation' && claim.kind !== 'participant_state') {
        this.lastInstantFactIds.add(claim.id);
      }
    }
  }
}

export class TemporalRelationalAncestorV4Node extends TemporalRelationalAncestorV2Node {
  async observe(snapshot) {
    await super.observe(snapshot);
    this.relationHistory = this.relationHistory.filter(r =>
      !(r.origin === 'delta-grounded-spatial' && r.kind === 'located-relative-to')
    );
  }
}

export function createFoundingV4AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV4Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorV4Node(seed)
  ];
}

export function sharedGoalForSeedV4(seed) { return sharedGoalForSeed(seed); }
