const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

export const REFERENCE_MEMORY_GROUPS_V1 = Object.freeze({
  A0: Object.freeze({ id: 'A0', label: 'Reactive Baseline', memoryMode: 'none', usesOasisKernel: false }),
  A1: Object.freeze({ id: 'A1', label: 'Raw Episodic Context', memoryMode: 'raw', usesOasisKernel: false }),
  A2: Object.freeze({ id: 'A2', label: 'Retrieval Episodic Memory', memoryMode: 'retrieval', usesOasisKernel: false }),
  A3: Object.freeze({ id: 'A3', label: 'Reflective Memory', memoryMode: 'reflective', usesOasisKernel: false }),
  A4: Object.freeze({ id: 'A4', label: 'Hierarchical Memory', memoryMode: 'hierarchical', usesOasisKernel: false })
});

export const NEUTRAL_COMPARISON_COHORT_V1 = Object.freeze(
  Array.from({ length: 6 }, (_, i) => Object.freeze({ id: `FOUNDER-${i}`, label: `neutral-${i}`, disposition: 'neutral' }))
);

const DEFAULT_BUDGET = Object.freeze({ maxDepth: 5, maxPrimitive: 512, maxCompositions: 384, verificationPasses: 1 });

function hashUnit(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function normStep(step, capabilityId, observationId, index) {
  return {
    ...clone(step),
    id: step.id ?? `${capabilityId}:${observationId}:${index}`,
    capabilityId,
    actor: step.actor ?? null,
    action: step.action ?? capabilityId,
    target: step.target ?? null,
    participants: uniq(arr(step.participants)),
    entities: uniq(arr(step.entities)),
    requires: uniq(arr(step.requires)),
    provides: uniq(arr(step.provides)),
    requiresEntities: uniq(arr(step.requiresEntities)),
    createsEntities: uniq(arr(step.createsEntities)),
    requiresRelationKinds: uniq(arr(step.requiresRelationKinds)),
    providesRelationKinds: uniq(arr(step.providesRelationKinds)),
    requiresBridgeKeys: uniq(arr(step.requiresBridgeKeys)),
    bridgeKeys: uniq(arr(step.bridgeKeys)),
    repeatable: step.repeatable === true,
    lifeViolation: step.lifeViolation === true,
    meta: clone(step.meta ?? {})
  };
}

function currentFactIds(observation) {
  return new Set(arr(observation.facts).map(f => typeof f === 'string' ? f : f?.id).filter(Boolean));
}

function instantiatePrimitiveSteps(capabilities, observation, budget) {
  const participation = {
    current: arr(observation.participants).filter(p => p?.available !== false).map(clone),
    historical: [],
    affectedEntities: clone(arr(observation.entities))
  };
  const groups = capabilities.map(capability => arr(capability.instantiate({
    observation: clone(observation),
    participation: clone(participation),
    activeRelations: [],
    budget: clone(budget)
  })).map((step, i) => normStep(step, capability.id, observation.id, i)));

  // Fair round-robin truncation: no ordered capability family can starve later families.
  const steps = [];
  let index = 0;
  while (steps.length < budget.maxPrimitive && groups.some(g => index < g.length)) {
    for (const group of groups) {
      if (index < group.length) steps.push(group[index]);
      if (steps.length >= budget.maxPrimitive) break;
    }
    index += 1;
  }
  return steps;
}

function executableNow(step, observation) {
  const facts = currentFactIds(observation);
  if (!step.requires.every(req => facts.has(req))) return false;
  if (!step.requiresEntities.every(id => arr(observation.entities).includes(id))) return false;
  const relationKinds = new Set(arr(observation.relations).map(r => r.kind));
  if (!step.requiresRelationKinds.every(kind => relationKinds.has(kind))) return false;
  if (step.requiresBridgeKeys.length) return false;
  return step.lifeViolation !== true;
}

function canAppend(plan, step, observation) {
  const used = new Set(plan.sigma.map(s => s.id));
  if (!step.repeatable && used.has(step.id)) return false;
  if (step.lifeViolation) return false;

  const facts = currentFactIds(observation);
  const provided = new Set([...facts, ...plan.sigma.flatMap(s => s.provides)]);
  if (!step.requires.every(req => provided.has(req))) return false;

  const createdEntities = new Set(plan.sigma.flatMap(s => s.createsEntities));
  if (!step.requiresEntities.every(id => arr(observation.entities).includes(id) || createdEntities.has(id))) return false;

  const relationKinds = new Set([
    ...arr(observation.relations).map(r => r.kind),
    ...plan.sigma.flatMap(s => s.providesRelationKinds)
  ]);
  if (!step.requiresRelationKinds.every(kind => relationKinds.has(kind))) return false;

  const bridgeKeys = new Set(plan.sigma.flatMap(s => s.bridgeKeys));
  if (!step.requiresBridgeKeys.every(key => bridgeKeys.has(key))) return false;

  // Multi-step reference plans must have an explicit dependency bridge.
  const tokenBridge = step.requires.some(req => plan.sigma.some(s => s.provides.includes(req)));
  const entityBridge = step.requiresEntities.some(id => createdEntities.has(id));
  const relationBridge = step.requiresRelationKinds.some(kind => plan.sigma.some(s => s.providesRelationKinds.includes(kind)));
  const explicitBridge = step.requiresBridgeKeys.some(key => bridgeKeys.has(key));
  return tokenBridge || entityBridge || relationBridge || explicitBridge;
}

function planFromSteps(steps) {
  const sigma = steps.map(clone);
  return {
    id: `ref:${sigma.map(s => s.id).join('>')}`,
    sigma,
    actionSequence: sigma.map(s => s.action),
    capabilitySequence: sigma.map(s => s.capabilityId),
    participants: uniq(sigma.flatMap(s => s.participants)),
    entities: uniq(sigma.flatMap(s => [s.target, ...s.entities, ...arr(s.meta?.componentIds)])),
    relationKinds: uniq(sigma.flatMap(s => s.providesRelationKinds))
  };
}

export function buildReferencePlansV1({ capabilities, observation, budget = DEFAULT_BUDGET }) {
  const steps = instantiatePrimitiveSteps(capabilities, observation, budget);
  const atomic = steps.filter(step => executableNow(step, observation)).map(step => planFromSteps([step]));
  const all = new Map(atomic.map(plan => [plan.id, plan]));
  let frontier = atomic;
  let depth = 1;
  let compositions = 0;

  while (frontier.length && depth < budget.maxDepth && compositions < budget.maxCompositions) {
    const next = [];
    for (const plan of frontier) {
      for (const step of steps) {
        if (!canAppend(plan, step, observation)) continue;
        const candidate = planFromSteps([...plan.sigma, step]);
        if (all.has(candidate.id)) continue;
        all.set(candidate.id, candidate);
        next.push(candidate);
        compositions += 1;
        if (compositions >= budget.maxCompositions) break;
      }
      if (compositions >= budget.maxCompositions) break;
    }
    frontier = next;
    depth += 1;
  }

  return {
    plans: [...all.values()],
    generatedCapabilityIds: uniq(steps.map(s => s.capabilityId)).sort()
  };
}

function observationKeys(observation) {
  return {
    entities: new Set([
      ...arr(observation.entities),
      ...arr(observation.meta?.visibleAgents).map(x => x.id),
      ...arr(observation.meta?.visibleObjects).map(x => x.id)
    ]),
    relationKinds: new Set(arr(observation.relations).map(r => r.kind)),
    facts: new Set(arr(observation.facts).map(f => typeof f === 'string' ? f : f?.id).filter(Boolean))
  };
}

function episodeKeys(episode) {
  return {
    entities: new Set(arr(episode.entities)),
    relationKinds: new Set(arr(episode.relationKinds)),
    actions: new Set(arr(episode.actions))
  };
}

function overlapCount(left, right) {
  let n = 0;
  for (const value of left) if (right.has(value)) n += 1;
  return n;
}

function currentEpisodeRelevance(episode, observation) {
  const ek = episodeKeys(episode);
  const ok = observationKeys(observation);
  return overlapCount(ek.entities, ok.entities) * 2 + overlapCount(ek.relationKinds, ok.relationKinds) * 2;
}

function planEpisodeAlignment(plan, episode) {
  const ek = episodeKeys(episode);
  return overlapCount(new Set(plan.entities), ek.entities) * 2
    + overlapCount(new Set(plan.relationKinds), ek.relationKinds) * 2
    + overlapCount(new Set(plan.actionSequence), ek.actions);
}

function summarizeEpisodes(episodes, index) {
  const counts = key => {
    const map = new Map();
    for (const ep of episodes) for (const value of arr(ep[key])) map.set(value, (map.get(value) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, 12).map(([value]) => value);
  };
  return {
    id: `reflection:${index}`,
    actions: counts('actions'),
    entities: counts('entities'),
    relationKinds: counts('relationKinds')
  };
}

function memoryViewFor(state, mode, observation) {
  if (mode === 'none') return { episodes: [], summaries: [], digest: 'none' };
  if (mode === 'raw') {
    const episodes = state.episodes.slice(-24);
    return { episodes, summaries: [], digest: `raw:${episodes.map(e => e.id).join(',')}` };
  }
  if (mode === 'retrieval') {
    const episodes = [...state.episodes]
      .map(ep => ({ ep, score: currentEpisodeRelevance(ep, observation) }))
      .sort((a, b) => b.score - a.score || b.ep.sequence - a.ep.sequence)
      .slice(0, 8).map(x => x.ep);
    return { episodes, summaries: [], digest: `retrieval:${episodes.map(e => e.id).join(',')}` };
  }
  if (mode === 'reflective') {
    const episodes = state.episodes.slice(-8);
    const summaries = state.reflections.slice(-4);
    return { episodes, summaries, digest: `reflective:${episodes.map(e => e.id).join(',')}|${summaries.map(s => s.id).join(',')}` };
  }
  if (mode === 'hierarchical') {
    const working = state.episodes.slice(-8);
    const retrieved = [...state.longTerm]
      .map(ep => ({ ep, score: currentEpisodeRelevance(ep, observation) }))
      .sort((a, b) => b.score - a.score || b.ep.sequence - a.ep.sequence)
      .slice(0, 4).map(x => x.ep);
    const episodes = [...working, ...retrieved.filter(ep => !working.some(w => w.id === ep.id))];
    return { episodes, summaries: [], digest: `hierarchical:${episodes.map(e => e.id).join(',')}` };
  }
  throw new Error(`unknown memory mode ${mode}`);
}

function memorySalience(plan, view) {
  let score = 1;
  for (const episode of view.episodes) score += planEpisodeAlignment(plan, episode);
  for (const summary of view.summaries) {
    score += overlapCount(new Set(plan.entities), new Set(summary.entities)) * 2;
    score += overlapCount(new Set(plan.relationKinds), new Set(summary.relationKinds)) * 2;
    score += overlapCount(new Set(plan.actionSequence), new Set(summary.actions));
  }
  return Math.max(1, score);
}

function weightedSample(plans, weights, randomUnit) {
  if (!plans.length) return null;
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (!(total > 0)) return plans[Math.min(plans.length - 1, Math.floor(randomUnit * plans.length))];
  let target = randomUnit * total;
  for (let i = 0; i < plans.length; i++) {
    target -= Math.max(0, weights[i]);
    if (target <= 0) return plans[i];
  }
  return plans.at(-1);
}

function episodeFromTransition(state, before, plan, execution, outcome) {
  return {
    id: `episode:${state.episodes.length}`,
    sequence: state.episodes.length,
    time: before.time,
    actions: clone(plan.actionSequence),
    capabilities: clone(plan.capabilitySequence),
    entities: uniq([
      ...plan.entities,
      ...arr(before.entities),
      ...arr(outcome.entities)
    ]),
    relationKinds: uniq([
      ...arr(before.relations).map(r => r.kind),
      ...arr(outcome.relations).map(r => r.kind),
      ...plan.relationKinds
    ]),
    participants: uniq(plan.participants),
    executionOk: arr(execution?.results).some(r => r?.ok === true)
  };
}

function incorporateMemory(state, mode, episode) {
  if (mode === 'none') return;
  state.episodes.push(episode);
  if (mode === 'reflective' && state.episodes.length % 8 === 0) {
    state.reflections.push(summarizeEpisodes(state.episodes.slice(-8), state.reflections.length));
  }
  if (mode === 'hierarchical' && state.episodes.length > 8) {
    const candidate = state.episodes.at(-9);
    if (candidate && !state.longTerm.some(ep => ep.id === candidate.id)) state.longTerm.push(candidate);
  }
}

export function createReferenceMemoryAgentV1({ groupId, agentSpec, world, capabilities, runSeed, budget = DEFAULT_BUDGET }) {
  const group = REFERENCE_MEMORY_GROUPS_V1[groupId];
  if (!group) throw new Error(`unsupported reference group ${groupId}`);
  const state = { episodes: [], reflections: [], longTerm: [], steps: 0 };

  return {
    group,
    agentSpec,
    state,
    async step() {
      const before = await world.observe();
      const built = buildReferencePlansV1({ capabilities, observation: before, budget });
      const plans = built.plans;
      if (!plans.length) {
        state.steps += 1;
        return { status: 'nonintervention', generatedCapabilityIds: built.generatedCapabilityIds, memoryItemsRead: 0 };
      }

      const view = memoryViewFor(state, group.memoryMode, before);
      const weights = plans.map(plan => group.memoryMode === 'none' ? 1 : memorySalience(plan, view));
      const u = hashUnit(`${runSeed}|${groupId}|${agentSpec.id}|${before.id}|${state.steps}|${view.digest}`);
      const choice = weightedSample(plans, weights, u);
      const execution = await world.execute({ id: choice.id, sigma: clone(choice.sigma) });
      const outcome = await world.observe();
      const episode = episodeFromTransition(state, before, choice, execution, outcome);
      incorporateMemory(state, group.memoryMode, episode);
      state.steps += 1;

      return {
        status: 'realized',
        choiceId: choice.id,
        actionSequence: clone(choice.actionSequence),
        generatedCapabilityIds: built.generatedCapabilityIds,
        memoryItemsRead: view.episodes.length + view.summaries.length,
        memoryMode: group.memoryMode,
        episodeId: group.memoryMode === 'none' ? null : episode.id
      };
    },
    auditState() {
      return {
        groupId,
        memoryMode: group.memoryMode,
        episodes: state.episodes.length,
        reflections: state.reflections.length,
        longTerm: state.longTerm.length,
        steps: state.steps,
        importedLegacyMemory: false,
        importedReward: false,
        importedQ: false,
        importedRelationEpisodes: false,
        importedFutureStream: false,
        importedTargetAction: false
      };
    }
  };
}
