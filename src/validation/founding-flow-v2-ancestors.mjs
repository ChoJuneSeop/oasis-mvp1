import {
  ReactiveAncestorNode,
  StateMemoryAncestorNode,
  OASISAncestorNode,
  sharedGoalForSeed
} from './founding-flow-ancestors.mjs';
import {
  actionKey,
  decodeRealitySnapshot,
  enumeratePrimitiveActions,
  spatialRelations
} from './founding-flow-world.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

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
  })).sort((a, b) => a.token - b.token || actionKey(a.action).localeCompare(actionKey(b.action)));
  return { action: clone(ranked[0].action), tieBreakUsed: true };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

class IndependentAncestorV2Base {
  constructor(id, seed) {
    this.id = id;
    this.seed = seed >>> 0;
    this.snapshot = null;
    this.history = [];
    this.deliberationCount = 0;
    this.lastProposal = null;
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
    return contingentPick(
      actions,
      this.seed,
      `${this.id}|${this.deliberationCount}|${label}|${this.snapshot?.realityHash}`
    );
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

function relationCounterpartsForFounder(relation) {
  if (relation.from === 'founder' && relation.to) return [relation.to];
  if (relation.to === 'founder' && relation.from) return [relation.from];
  return [];
}

export class TemporalRelationalAncestorV2Node extends IndependentAncestorV2Base {
  constructor(seed) {
    super('temporal-relational', seed);
    this.relationHistory = [];
  }

  reset() {
    super.reset();
    this.relationHistory = [];
  }

  async observe(snapshot) {
    const delta = new Set(snapshot?.deltaSubjects ?? []);
    const explicit = arr(snapshot?.deltaClaims)
      .filter(c => c.kind === 'relation')
      .map(c => ({
        sequence: snapshot.sequence,
        from: c.payload.from,
        to: c.payload.to,
        kind: c.payload.kind,
        source: c.id,
        origin: 'explicit-delta'
      }));

    // Spatial relations are admitted only when the current reality delta changes
    // one of their endpoints. This prevents the entire persistent world from being
    // reinserted as an equally new relation on every observation.
    const spatial = spatialRelations(snapshot)
      .filter(r => delta.has(r.from) || delta.has(r.to))
      .map(r => ({
        sequence: snapshot.sequence,
        from: r.from,
        to: r.to,
        kind: r.kind,
        source: r.id,
        origin: 'delta-grounded-spatial'
      }));

    this.relationHistory.push(...explicit, ...spatial);
    await super.observe(snapshot);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const founderRelations = this.relationHistory.filter(r =>
      r.from === 'founder' || r.to === 'founder'
    );

    const latestSequence = founderRelations.length
      ? Math.max(...founderRelations.map(r => r.sequence))
      : null;
    const latestRelations = latestSequence == null
      ? []
      : founderRelations.filter(r => r.sequence === latestSequence);

    // All equally recent relation targets are preserved as a set. Array insertion
    // order is never a semantic preference.
    const relationTargets = [...new Set(
      latestRelations.flatMap(relationCounterpartsForFounder)
    )].sort();

    const candidateMap = new Map();
    for (const target of relationTargets) {
      for (const action of legal.filter(a => a.op === 'touch' && a.target === target)) {
        candidateMap.set(actionKey(action), action);
      }
      const targetPos = world.positions.get(target);
      if (!founder || !targetPos) continue;
      const currentDistance = manhattan(founder, targetPos);
      for (const action of legal.filter(a => a.op === 'step')) {
        const after = {
          x: founder.x + action.dx,
          y: founder.y + action.dy
        };
        if (manhattan(after, targetPos) < currentDistance) {
          candidateMap.set(actionKey(action), action);
        }
      }
    }

    let pool = [...candidateMap.values()];
    if (!pool.length) {
      const delta = new Set(this.snapshot?.deltaSubjects ?? []);
      const targeted = legal.filter(a => a.op === 'touch' && delta.has(a.target));
      pool = targeted.length ? targeted : legal;
    }

    pool.sort((a, b) => actionKey(a).localeCompare(actionKey(b)));
    const picked = this.pick(pool, 'latest-directed-relation-set');
    return this.finish(picked.action, {
      principle: 'directed-temporal-relation-history-without-insertion-order-preference',
      latestRelationSequence: latestSequence,
      latestRelations: clone(latestRelations),
      relationTargets,
      relationHistoryLength: this.relationHistory.length,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed,
      tieBreakMeaning: picked.tieBreakUsed
        ? 'Contingent realization among equally recent relation-supported primitive actions.'
        : null
    });
  }
}

function localCurrentSubjects(snapshot) {
  const world = decodeRealitySnapshot(snapshot);
  const founder = world.positions.get('founder');
  const out = new Set((snapshot?.deltaSubjects ?? []).filter(s => s !== 'founder'));

  if (founder) {
    for (const [entity, position] of world.positions) {
      if (entity === 'founder') continue;
      if (manhattan(founder, position) <= 1) out.add(entity);
    }
  }

  for (const claim of snapshot?.deltaClaims ?? []) {
    if (claim.kind !== 'relation') continue;
    for (const subject of claim.subjects ?? []) {
      if (subject !== 'founder') out.add(subject);
    }
  }
  return [...out].sort();
}

function jaccard(aValues, bValues) {
  const a = new Set(aValues);
  const b = new Set(bValues);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection += 1;
  return intersection / union.size;
}

export class EpisodicAncestorV2Node extends IndependentAncestorV2Base {
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
        outcomeSubjects: uniq((snapshot.deltaSubjects ?? []).filter(s => s !== 'founder')),
        outcomePersistentChange: arr(snapshot.deltaClaims).some(c => c.temporality === 'persistent')
      });
      this.pendingEpisode = null;
    }
    await super.observe(snapshot);
  }

  async deliberate() {
    const legal = this.legal();
    const legalKeys = new Set(legal.map(actionKey));
    const currentLocal = localCurrentSubjects(this.snapshot);
    const currentDelta = new Set((this.snapshot?.deltaSubjects ?? []).filter(s => s !== 'founder'));

    const candidates = this.episodes
      .map((episode, index) => {
        if (!legalKeys.has(episode.actionKey)) return null;
        const relevanceSubjects = uniq([
          ...episode.contextSubjects,
          ...episode.outcomeSubjects
        ]);
        const deltaIntersection = relevanceSubjects.filter(s => currentDelta.has(s)).length;
        const similarity = jaccard(relevanceSubjects, currentLocal);
        return { episode, index, deltaIntersection, similarity };
      })
      .filter(Boolean)
      .filter(row => row.deltaIntersection > 0 || row.similarity > 0);

    let recalledRows = [];
    if (candidates.length) {
      const maxDelta = Math.max(...candidates.map(r => r.deltaIntersection));
      const deltaFrontier = candidates.filter(r => r.deltaIntersection === maxDelta);
      const maxSimilarity = Math.max(...deltaFrontier.map(r => r.similarity));
      recalledRows = deltaFrontier.filter(r => r.similarity === maxSimilarity);
    }

    let pool;
    let picked;
    if (recalledRows.length) {
      const keys = new Set(recalledRows.map(r => r.episode.actionKey));
      pool = legal.filter(action => keys.has(actionKey(action)));
      picked = this.pick(pool, 'equally-relevant-episode-actions');
    } else {
      const deltaTargets = legal.filter(a => a.op === 'touch' && currentDelta.has(a.target));
      pool = deltaTargets.length ? deltaTargets : legal;
      picked = this.pick(pool, 'episodic-local-fallback');
    }

    const proposal = this.finish(picked.action, {
      principle: 'episodic-retrieval-by-delta-and-local-current-context',
      currentLocalSubjects: currentLocal,
      recalledEpisodeIndices: recalledRows.map(r => r.index),
      recalledEvidence: recalledRows.map(r => ({
        index: r.index,
        deltaIntersection: r.deltaIntersection,
        jaccard: r.similarity,
        actionKey: r.episode.actionKey
      })),
      episodeCount: this.episodes.length,
      candidateKeys: pool.map(actionKey).sort(),
      tieBreakUsed: picked.tieBreakUsed,
      tieBreakMeaning: picked.tieBreakUsed
        ? 'Contingent realization among equally relevant remembered actions.'
        : null
    });

    this.pendingEpisode = {
      contextSubjects: currentLocal,
      action: clone(proposal.action),
      actionKey: proposal.actionKey
    };
    return proposal;
  }
}

export function goalCompletion(snapshot, target) {
  const world = decodeRealitySnapshot(snapshot);
  const type = world.types.get(target);
  const completedKinds = type === 'resource'
    ? new Set(['holds'])
    : type === 'marker'
      ? new Set(['touched-marker'])
      : type === 'other'
        ? new Set(['contacted'])
        : new Set();

  const matchingRelation = world.relations.find(claim =>
    claim.payload?.from === 'founder' &&
    claim.payload?.to === target &&
    completedKinds.has(claim.payload?.kind)
  );

  return {
    target,
    type: type ?? null,
    completed: Boolean(matchingRelation),
    relationId: matchingRelation?.id ?? null
  };
}

export class PredictiveWorldModelAncestorV2Node extends IndependentAncestorV2Base {
  constructor(seed) {
    super('predictive-world-model', seed);
    this.goal = sharedGoalForSeed(seed);
  }

  reset() {
    super.reset();
    this.goal = sharedGoalForSeed(this.seed ?? 0);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const goalPos = world.positions.get(this.goal);
    const completion = goalCompletion(this.snapshot, this.goal);
    let pool = [];
    let predicted = [];

    if (!completion.completed && goalPos && founder) {
      const touch = legal.filter(a => a.op === 'touch' && a.target === this.goal);
      if (touch.length) {
        pool = touch;
        predicted = touch.map(a => ({
          actionKey: actionKey(a),
          predicted: 'establish-goal-relation',
          terminalAfterPredictedTransition: true
        }));
      } else {
        const steps = legal.filter(a => a.op === 'step');
        const rows = steps.map(a => ({
          action: a,
          distance: manhattan({ x: founder.x + a.dx, y: founder.y + a.dy }, goalPos)
        }));
        const min = Math.min(...rows.map(r => r.distance));
        pool = rows.filter(r => r.distance === min).map(r => r.action);
        predicted = rows.map(r => ({
          actionKey: actionKey(r.action),
          predictedDistance: r.distance,
          terminalAfterPredictedTransition: false
        }));
      }
    }

    if (!pool.length) pool = legal;
    pool.sort((a, b) => actionKey(a).localeCompare(actionKey(b)));
    const picked = this.pick(pool, completion.completed ? 'completed-goal-no-active-target' : 'predicted-transition');
    return this.finish(picked.action, {
      principle: 'forward-transition-model-with-explicit-terminal-goal-semantics',
      internalGoal: this.goal,
      goalCompletion: completion,
      predicted,
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed,
      tieBreakMeaning: picked.tieBreakUsed
        ? (completion.completed
          ? 'Goal is already terminal; no further target preference is defined.'
          : 'Contingent realization among equally predicted transitions.')
        : null
    });
  }
}

export class GoalUtilityAncestorV2Node extends IndependentAncestorV2Base {
  constructor(seed) {
    super('goal-utility', seed);
    this.goal = sharedGoalForSeed(seed);
  }

  reset() {
    super.reset();
    this.goal = sharedGoalForSeed(this.seed ?? 0);
  }

  async deliberate() {
    const legal = this.legal();
    const world = decodeRealitySnapshot(this.snapshot);
    const founder = world.positions.get('founder');
    const goalPos = world.positions.get(this.goal);
    const completion = goalCompletion(this.snapshot, this.goal);

    const utilities = legal.map(action => {
      let utility = 0;
      if (!completion.completed && goalPos && founder) {
        const before = manhattan(founder, goalPos);
        if (action.op === 'touch' && action.target === this.goal) utility = 4;
        else if (action.op === 'step') {
          const after = manhattan({ x: founder.x + action.dx, y: founder.y + action.dy }, goalPos);
          utility = after < before ? 2 : after === before ? 0 : -1;
        } else if (action.op === 'emit' && before <= 2) utility = 1;
      }
      return { action, utility };
    });

    const max = Math.max(...utilities.map(r => r.utility));
    const pool = utilities
      .filter(r => r.utility === max)
      .map(r => r.action)
      .sort((a, b) => actionKey(a).localeCompare(actionKey(b)));
    const picked = this.pick(pool, completion.completed ? 'completed-goal-zero-utility' : 'direct-utility');
    return this.finish(picked.action, {
      principle: 'explicit-current-utility-with-terminal-goal-semantics',
      internalGoal: this.goal,
      goalCompletion: completion,
      internalUtilities: utilities.map(r => ({ actionKey: actionKey(r.action), utility: r.utility })),
      candidateKeys: pool.map(actionKey),
      tieBreakUsed: picked.tieBreakUsed,
      tieBreakMeaning: picked.tieBreakUsed
        ? (completion.completed
          ? 'Goal is already terminal; all currently legal actions have equal utility.'
          : 'Contingent realization among equal-utility actions.')
        : null
    });
  }
}

export function createFoundingV2AncestorNodes(seed) {
  return [
    new ReactiveAncestorNode(seed),
    new StateMemoryAncestorNode(seed),
    new TemporalRelationalAncestorV2Node(seed),
    new EpisodicAncestorV2Node(seed),
    new PredictiveWorldModelAncestorV2Node(seed),
    new GoalUtilityAncestorV2Node(seed),
    new OASISAncestorNode(seed)
  ];
}

export function sharedGoalForSeedV2(seed) {
  return sharedGoalForSeed(seed);
}
