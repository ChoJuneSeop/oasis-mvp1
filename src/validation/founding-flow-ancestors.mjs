import { OASISReferenceCore } from '../oasis-reference-core.mjs';
import {
  actionKey,
  decodeRealitySnapshot,
  enumeratePrimitiveActions,
  spatialRelations
} from './founding-flow-world.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash32(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function contingentPick(actions, seed, context) {
  if (!actions.length) return { action: null, tieBreakUsed: false };
  if (actions.length === 1) return { action: clone(actions[0]), tieBreakUsed: false };
  const ranked = actions.map(action => ({
    action,
    token: hash32(`${seed}|${context}|${actionKey(action)}`)
  })).sort((a,b) => a.token - b.token || actionKey(a.action).localeCompare(actionKey(b.action)));
  return { action: clone(ranked[0].action), tieBreakUsed: true };
}

function currentSubjects(snapshot) {
  return new Set([
    ...(snapshot?.deltaSubjects ?? []),
    ...arr(snapshot?.currentPersistentClaims).flatMap(c => c.subjects ?? [])
  ]);
}

function deltaTargetedActions(snapshot, legal) {
  const delta = new Set(snapshot?.deltaSubjects ?? []);
  return legal.filter(a => a.op === 'touch' && delta.has(a.target));
}

function goalForSeed(seed) {
  const pool = ['resource-A','resource-B','marker-M','other-O'];
  return pool[hash32(`goal|${seed}`) % pool.length];
}

function manhattan(a,b) {
  return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
}

class IndependentAncestorBase {
  constructor(id, seed) {
    this.id = id;
    this.seed = seed >>> 0;
    this.reset();
  }

  reset() {
    this.snapshot = null;
    this.history = [];
    this.deliberationCount = 0;
    this.lastProposal = null;
  }

  async observe(snapshot) {
    this.snapshot = clone(snapshot);
    this.history.push(clone(snapshot));
  }

  legal() {
    return enumeratePrimitiveActions(this.snapshot, 'founder');
  }

  pick(actions, label) {
    return contingentPick(actions, this.seed, `${this.id}|${this.deliberationCount}|${label}|${this.snapshot?.realityHash}`);
  }

  finish(action, extra = {}) {
    const out = {
      architecture: this.id,
      action: clone(action),
      actionKey: actionKey(action),
      ...clone(extra)
    };
    this.lastProposal = clone(out);
    this.deliberationCount += 1;
    return out;
  }
}

export class ReactiveAncestorNode extends IndependentAncestorBase {
  constructor(seed) { super('reactive', seed); }

  async deliberate() {
    const legal = this.legal();
    const targeted = deltaTargetedActions(this.snapshot, legal);
    const pool = targeted.length ? targeted : legal;
    const picked = this.pick(pool, targeted.length ? 'latest-delta-target' : 'current-reflex');
    return this.finish(picked.action, {
      principle: 'latest-current-change-only',
      usedMemory: false,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
  }
}

export class StateMemoryAncestorNode extends IndependentAncestorBase {
  constructor(seed) {
    super('state-memory', seed);
    this.lastActionChangedPersistentState = null;
  }

  reset() {
    super.reset();
    this.lastActionChangedPersistentState = null;
  }

  async observe(snapshot) {
    if (snapshot?.meta?.phase === 'actualization' && this.lastProposal) {
      this.lastActionChangedPersistentState = arr(snapshot.deltaClaims).some(c => c.temporality === 'persistent');
    }
    await super.observe(snapshot);
  }

  async deliberate() {
    let legal = this.legal();
    const targeted = deltaTargetedActions(this.snapshot, legal);
    let pool = targeted.length ? targeted : legal;
    if (this.lastProposal && this.lastActionChangedPersistentState === false) {
      const alternative = pool.filter(a => actionKey(a) !== this.lastProposal.actionKey);
      if (alternative.length) pool = alternative;
    }
    const picked = this.pick(pool, 'state-memory-reflex');
    return this.finish(picked.action, {
      principle: 'current-state-plus-last-action-result',
      lastActionChangedPersistentState: this.lastActionChangedPersistentState,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
  }
}

export class TemporalRelationalAncestorNode extends IndependentAncestorBase {
  constructor(seed) {
    super('temporal-relational', seed);
    this.relationHistory = [];
  }

  reset() {
    super.reset();
    this.relationHistory = [];
  }

  async observe(snapshot) {
    const explicit = arr(snapshot?.deltaClaims).filter(c => c.kind === 'relation').map(c => ({
      sequence: snapshot.sequence,
      from: c.payload.from,
      to: c.payload.to,
      kind: c.payload.kind,
      source: c.id
    }));
    const spatial = spatialRelations(snapshot).map(r => ({
      sequence: snapshot.sequence,
      from: r.from,
      to: r.to,
      kind: r.kind,
      source: r.id
    }));
    this.relationHistory.push(...explicit, ...spatial);
    await super.observe(snapshot);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const ordered = [...this.relationHistory].sort((a,b) => b.sequence-a.sequence);
    const relationTargets = uniq(ordered.flatMap(r => {
      if (r.from === 'founder') return [r.to];
      if (r.to === 'founder') return [r.from];
      return [];
    }));

    let pool = [];
    for (const target of relationTargets) {
      const direct = legal.filter(a => a.op === 'touch' && a.target === target);
      if (direct.length) { pool = direct; break; }
      const targetPos = world.positions.get(target);
      if (!founder || !targetPos) continue;
      const steps = legal.filter(a => a.op === 'step');
      const currentDistance = manhattan(founder, targetPos);
      const toward = steps.filter(a => manhattan({x:founder.x+a.dx,y:founder.y+a.dy}, targetPos) < currentDistance);
      if (toward.length) { pool = toward; break; }
    }
    if (!pool.length) {
      const targeted = deltaTargetedActions(this.snapshot, legal);
      pool = targeted.length ? targeted : legal;
    }
    const picked = this.pick(pool, 'temporal-relation-path');
    return this.finish(picked.action, {
      principle: 'directed-temporal-relation-history',
      relationTargets: relationTargets.slice(0, 8),
      relationHistoryLength: this.relationHistory.length,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
  }
}

export class EpisodicAncestorNode extends IndependentAncestorBase {
  constructor(seed) {
    super('episodic', seed);
    this.episodes = [];
    this.pendingEpisode = null;
  }

  reset() {
    super.reset();
    this.episodes = [];
    this.pendingEpisode = null;
  }

  async observe(snapshot) {
    if (snapshot?.meta?.phase === 'actualization' && this.pendingEpisode) {
      this.episodes.push({
        ...clone(this.pendingEpisode),
        outcomeSubjects: uniq(snapshot.deltaSubjects ?? []),
        outcomePersistentChange: arr(snapshot.deltaClaims).some(c => c.temporality === 'persistent')
      });
      this.pendingEpisode = null;
    }
    await super.observe(snapshot);
  }

  async deliberate() {
    const legal = this.legal();
    const legalKeys = new Set(legal.map(actionKey));
    const subjects = currentSubjects(this.snapshot);
    let recalled = null;
    let bestOverlap = -1;
    for (let i = this.episodes.length - 1; i >= 0; i--) {
      const ep = this.episodes[i];
      const overlap = ep.contextSubjects.filter(s => subjects.has(s)).length;
      if (overlap > bestOverlap && legalKeys.has(ep.actionKey)) {
        bestOverlap = overlap;
        recalled = ep;
      }
    }

    let picked;
    let pool;
    if (recalled && bestOverlap > 0) {
      pool = legal.filter(a => actionKey(a) === recalled.actionKey);
      picked = { action: clone(pool[0]), tieBreakUsed: false };
    } else {
      const targeted = deltaTargetedActions(this.snapshot, legal);
      pool = targeted.length ? targeted : legal;
      picked = this.pick(pool, 'episodic-fallback');
    }

    const proposal = this.finish(picked.action, {
      principle: 'episode-retrieval-by-current-subject-overlap',
      recalledEpisodeIndex: recalled ? this.episodes.indexOf(recalled) : null,
      recalledOverlap: recalled ? bestOverlap : 0,
      episodeCount: this.episodes.length,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
    this.pendingEpisode = {
      contextSubjects: [...subjects],
      action: clone(proposal.action),
      actionKey: proposal.actionKey
    };
    return proposal;
  }
}

export class PredictiveWorldModelAncestorNode extends IndependentAncestorBase {
  constructor(seed) {
    super('predictive-world-model', seed);
    this.goal = goalForSeed(seed);
  }

  reset() {
    super.reset();
    this.goal = goalForSeed(this.seed ?? 0);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const goal = world.positions.get(this.goal);
    let pool = [];
    let predicted = [];
    if (goal && founder) {
      const touch = legal.filter(a => a.op === 'touch' && a.target === this.goal);
      if (touch.length) {
        pool = touch;
        predicted = touch.map(a => ({ actionKey: actionKey(a), predicted: 'goal-contact' }));
      } else {
        const steps = legal.filter(a => a.op === 'step');
        const rows = steps.map(a => ({
          action: a,
          distance: manhattan({x:founder.x+a.dx,y:founder.y+a.dy}, goal)
        }));
        const min = Math.min(...rows.map(r => r.distance));
        pool = rows.filter(r => r.distance === min).map(r => r.action);
        predicted = rows.map(r => ({ actionKey: actionKey(r.action), predictedDistance: r.distance }));
      }
    }
    if (!pool.length) pool = legal;
    const picked = this.pick(pool, 'predicted-transition');
    return this.finish(picked.action, {
      principle: 'explicit-forward-transition-model',
      internalGoal: this.goal,
      predicted,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
  }
}

export class GoalUtilityAncestorNode extends IndependentAncestorBase {
  constructor(seed) {
    super('goal-utility', seed);
    this.goal = goalForSeed(seed);
  }

  reset() {
    super.reset();
    this.goal = goalForSeed(this.seed ?? 0);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const goal = world.positions.get(this.goal);
    const utilities = legal.map(action => {
      let utility = 0;
      if (goal && founder) {
        const before = manhattan(founder, goal);
        if (action.op === 'touch' && action.target === this.goal) utility = 4;
        else if (action.op === 'step') {
          const after = manhattan({x:founder.x+action.dx,y:founder.y+action.dy}, goal);
          utility = after < before ? 2 : after === before ? 0 : -1;
        } else if (action.op === 'emit' && before <= 2) utility = 1;
      }
      return { action, utility };
    });
    const max = Math.max(...utilities.map(r => r.utility));
    const pool = utilities.filter(r => r.utility === max).map(r => r.action);
    const picked = this.pick(pool, 'direct-utility');
    return this.finish(picked.action, {
      principle: 'explicit-current-utility',
      internalGoal: this.goal,
      internalUtilities: utilities.map(r => ({ actionKey: actionKey(r.action), utility: r.utility })),
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed
    });
  }
}

function relationEntities(r) {
  return uniq([r.from, r.to, ...arr(r.entities)]);
}

class OASISUnifiedCore extends OASISReferenceCore {
  constructor(options = {}) {
    super(options);
    this._validationLegalActionIds = new Set();
  }

  _currentSeeds() {
    const latest = this.state.flow.at(-1);
    return new Set(latest?.changedEntities ?? []);
  }

  deriveParticipation(field) {
    const base = super.deriveParticipation(field);
    const related = new Set(field.participatingEntities);
    const current = base.current.filter(p => p.id === 'founder' || related.has(p.id));
    return { ...base, current };
  }

  setValidationPrimitiveAffordances(affordances) {
    this._validationLegalActionIds = new Set(affordances.map(a => a.meta?.originalStepId ?? a.id));
    this.state.world.affordances = new Map(affordances.map(a => [a.id, clone(a)]));
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
    requires: [],
    provides: [],
    requiresEntities: [],
    createsEntities: [],
    removesEntities: [],
    relations: [],
    consequences: [],
    obligations: [],
    resolves: [],
    violates: [],
    meta: { primitiveAction: clone(action), originalStepId: id }
  };
}

function coreEventFromSnapshot(snapshot) {
  const facts = [];
  const relations = [];
  const participants = [];
  for (const claim of snapshot?.deltaClaims ?? []) {
    if (claim.kind === 'relation') {
      relations.push({
        id: claim.id,
        from: claim.payload.from,
        to: claim.payload.to,
        kind: claim.payload.kind,
        entities: clone(claim.subjects),
        op: claim.op === 'retract' ? 'remove' : 'upsert',
        meta: { provenance: clone(claim.provenance) }
      });
    } else if (claim.kind === 'participant_state') {
      participants.push({
        id: claim.subjects[0],
        roles: clone(claim.payload.roles ?? []),
        capabilities: claim.subjects[0] === 'founder' ? ['*'] : [],
        obligations: [],
        available: claim.payload.available !== false,
        meta: { provenance: clone(claim.provenance) }
      });
    } else {
      facts.push({
        id: claim.id,
        entities: clone(claim.subjects),
        value: clone(claim.payload),
        op: claim.op === 'retract' ? 'remove' : 'upsert',
        meta: { kind: claim.kind, temporality: claim.temporality, provenance: clone(claim.provenance) }
      });
    }
  }
  return {
    id: snapshot.frameId,
    time: snapshot.sequence,
    entities: clone(snapshot.deltaSubjects ?? []),
    facts,
    relations,
    participants,
    affordances: [],
    meta: { unifiedRealityHash: snapshot.realityHash, phase: snapshot.meta?.phase ?? null }
  };
}

export class OASISAncestorNode {
  constructor(seed) {
    this.id = 'oasis';
    this.seed = seed >>> 0;
    this.reset();
  }

  reset() {
    this.core = new OASISUnifiedCore({ realizationSeed: this.seed });
    this.snapshot = null;
    this.pendingChoice = null;
    this.lastInstantFactIds = new Set();
  }

  _clearAdapterEphemera() {
    for (const id of this.lastInstantFactIds) this.core.state.world.facts.delete(id);
    this.lastInstantFactIds.clear();
    for (const key of [...this.core.state.world.relations.keys()]) {
      if (String(key).startsWith('spatial:')) this.core.state.world.relations.delete(key);
    }
    this.core.state.world.affordances.clear();
  }

  _installDerivedCurrent(snapshot) {
    for (const r of spatialRelations(snapshot)) {
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

  async observe(snapshot) {
    this._clearAdapterEphemera();
    const event = coreEventFromSnapshot(snapshot);
    if (snapshot?.meta?.phase === 'actualization' && this.pendingChoice) {
      this.core.actualize(this.pendingChoice.id, event);
      this.pendingChoice = null;
    } else {
      this.core.observe(event);
    }
    this.snapshot = clone(snapshot);
    this._installDerivedCurrent(snapshot);
  }

  async deliberate() {
    const d = this.core.deliberate();
    if (!d.choice) {
      return {
        architecture: this.id,
        action: null,
        actionKey: 'none',
        continuationRequired: true,
        oasis: {
          reactivatedExperienceIds: clone(d.field.reactivatedExperienceIds),
          participatingEntities: clone(d.field.participatingEntities),
          possibilities: d.possibilities.map(p => p.id),
          responsibility: clone(d.responsibility),
          tieBreakUsed: d.tieBreakUsed
        }
      };
    }
    const step = d.choice.steps[0];
    const action = clone(step.meta?.primitiveAction ?? null);
    if (!action) throw new Error(`OASIS choice ${d.choice.id} is not backed by the primitive actuator contract.`);
    this.pendingChoice = clone(d.choice);
    return {
      architecture: this.id,
      action,
      actionKey: actionKey(action),
      continuationRequired: false,
      oasis: {
        changedEntities: clone(d.currentFlow.changedEntities),
        seedEntities: clone(d.field.seedEntities),
        reactivatedExperienceIds: clone(d.field.reactivatedExperienceIds),
        participatingEntities: clone(d.field.participatingEntities),
        currentRelations: d.field.currentRelations.map(r => ({ id: r.id, from: r.from, to: r.to, kind: r.kind, context: r.context })),
        historicalRelations: d.field.historicalRelations.map(r => ({ id: r.id, from: r.from, to: r.to, kind: r.kind, context: r.context })),
        participation: {
          current: d.participation.current.map(p => p.id),
          historical: clone(d.participation.historical)
        },
        possibilities: d.possibilities.map(p => ({
          id: p.id,
          kind: p.kind,
          steps: p.steps.map(s => s.meta?.originalStepId ?? s.id),
          experienceSupport: clone(p.support?.experienceIds ?? [])
        })),
        choiceId: d.choice.id,
        responsibility: clone(d.responsibility),
        tieBreakUsed: d.tieBreakUsed,
        structuralExpansion: clone(d.structuralExpansion)
      }
    };
  }

  exportState() {
    return this.core.exportState();
  }
}

export function createFoundingAncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorNode(seed),
    new EpisodicAncestorNode(seed),
    new PredictiveWorldModelAncestorNode(seed),
    new GoalUtilityAncestorNode(seed),
    new OASISAncestorNode(seed)
  ];
}

export function sharedGoalForSeed(seed) {
  return goalForSeed(seed);
}
