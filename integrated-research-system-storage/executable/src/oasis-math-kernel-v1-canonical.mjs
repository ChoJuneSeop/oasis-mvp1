import { OASISMathKernelV1 } from './oasis-math-kernel-v1.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const intersects = (a, b) => {
  const right = b instanceof Set ? b : new Set(b);
  return [...a].some(x => right.has(x));
};

function relationEntities(relation) {
  return uniq([relation.from, relation.to, ...arr(relation.entities)]);
}

function uniqById(values) {
  const map = new Map();
  for (const value of values) map.set(value.id ?? JSON.stringify(value), clone(value));
  return [...map.values()];
}

// Fail-closed reference Γ: shared actor/endpoint alone is not sufficient.
function canonicalRelationPredicate({ historyRelation, observation }) {
  return observation.relations.some(current =>
    current.id === historyRelation.id ||
    (current.from === historyRelation.from &&
      current.to === historyRelation.to &&
      current.kind === historyRelation.kind)
  );
}

function currentFactIds(observation) {
  return new Set(observation.facts.map(f => typeof f === 'string' ? f : f?.id).filter(Boolean));
}

function canStartStep(step, observation) {
  const facts = currentFactIds(observation);
  if (!step.requires.every(req => facts.has(req))) return false;
  if (!step.requiresEntities.every(entity => observation.entities.includes(entity))) return false;
  const currentRelationKinds = new Set(observation.relations.map(r => r.kind));
  if (!step.requiresRelationKinds.every(kind => currentRelationKinds.has(kind))) return false;
  // Explicit bridge requirements mean this step is not independently executable.
  if (step.requiresBridgeKeys.length) return false;
  return true;
}

function relevantRelations(step, activeRelations, observation, priorPossibility = null) {
  const entities = new Set([
    ...step.entities,
    ...(priorPossibility ? priorPossibility.sigma.flatMap(s => s.entities) : [])
  ]);
  const current = observation.relations.filter(r =>
    step.relations.some(sr => sr.id === r.id) ||
    step.requiresRelationKinds.includes(r.kind) ||
    intersects(relationEntities(r), entities)
  );
  const historical = activeRelations.filter(record =>
    step.relations.some(sr => sr.id === record.relation.id) ||
    step.requiresRelationKinds.includes(record.relation.kind) ||
    intersects(relationEntities(record.relation), entities)
  ).map(record => record.relation);
  return uniqById([...current, ...historical, ...step.relations]);
}

function atomicPossibility(step, activeRelations, observation) {
  return {
    id: `c:${step.id}`,
    A_c: uniq([step.actor, ...step.participants]),
    R_c: relevantRelations(step, activeRelations, observation),
    B_c: [step.capabilityId],
    sigma: [clone(step)],
    K_c: {
      observationId: observation.id,
      requires: clone(step.requires),
      requiresEntities: clone(step.requiresEntities),
      requiresRelationKinds: clone(step.requiresRelationKinds),
      conditions: clone(step.conditions)
    },
    lifeViolation: step.lifeViolation,
    requiresLifeAssessment: step.requiresLifeAssessment,
    trace: { source: 'canonical-current-capability-instantiation', observationId: observation.id }
  };
}

function canCompose(possibility, step, observation) {
  const usedStepIds = new Set(possibility.sigma.map(s => s.id));
  if (!step.repeatable && usedStepIds.has(step.id)) return false;

  const facts = currentFactIds(observation);
  const providedTokens = new Set([...facts, ...possibility.sigma.flatMap(s => s.provides)]);
  if (!step.requires.every(req => providedTokens.has(req))) return false;

  const createdEntities = new Set(possibility.sigma.flatMap(s => s.createsEntities));
  if (!step.requiresEntities.every(entity => observation.entities.includes(entity) || createdEntities.has(entity))) return false;

  const currentRelationKinds = observation.relations.map(r => r.kind);
  const providedRelationKinds = new Set([
    ...currentRelationKinds,
    ...possibility.sigma.flatMap(s => s.providesRelationKinds),
    ...possibility.R_c.map(r => r.kind)
  ]);
  if (!step.requiresRelationKinds.every(kind => providedRelationKinds.has(kind))) return false;

  const providedBridgeKeys = new Set(possibility.sigma.flatMap(s => s.bridgeKeys));
  if (!step.requiresBridgeKeys.every(key => providedBridgeKeys.has(key))) return false;

  const tokenBridge = step.requires.some(req => possibility.sigma.some(s => s.provides.includes(req)));
  const entityBridge = step.requiresEntities.some(entity => createdEntities.has(entity));
  const relationBridge = step.requiresRelationKinds.some(kind =>
    possibility.sigma.some(s => s.providesRelationKinds.includes(kind)) || possibility.R_c.some(r => r.kind === kind)
  );
  const explicitBridge = step.requiresBridgeKeys.some(key => providedBridgeKeys.has(key));

  // Entity co-membership alone is deliberately insufficient.
  return tokenBridge || entityBridge || relationBridge || explicitBridge;
}

function mergePossibility(left, step, activeRelations, observation) {
  const sigma = [...left.sigma.map(clone), clone(step)];
  return {
    id: `c:${sigma.map(s => s.id).join('>')}`,
    A_c: uniq([...left.A_c, step.actor, ...step.participants]),
    R_c: uniqById([...left.R_c, ...relevantRelations(step, activeRelations, observation, left)]),
    B_c: uniq([...left.B_c, step.capabilityId]),
    sigma,
    K_c: {
      observationId: observation.id,
      requires: uniq([...arr(left.K_c.requires), ...step.requires]),
      requiresEntities: uniq([...arr(left.K_c.requiresEntities), ...step.requiresEntities]),
      requiresRelationKinds: uniq([...arr(left.K_c.requiresRelationKinds), ...step.requiresRelationKinds]),
      conditions: { ...clone(left.K_c.conditions ?? {}), ...clone(step.conditions) }
    },
    lifeViolation: left.lifeViolation || step.lifeViolation,
    requiresLifeAssessment: left.requiresLifeAssessment || step.requiresLifeAssessment,
    trace: {
      source: 'canonical-relational-sequential-composition',
      parents: [left.id, step.id],
      observationId: observation.id
    }
  };
}

export class OASISMathKernelV1Canonical extends OASISMathKernelV1 {
  constructor(options = {}) {
    super({
      ...options,
      relationPredicate: options.relationPredicate ?? canonicalRelationPredicate
    });
  }

  omega(observation, participation, activeRelations, budget) {
    const steps = this.instantiateCapabilities(observation, participation, activeRelations, budget);
    const byId = new Map();
    let frontier = [];

    for (const step of steps) {
      if (!canStartStep(step, observation)) continue;
      const possibility = atomicPossibility(step, activeRelations, observation);
      byId.set(possibility.id, possibility);
      frontier.push(possibility);
    }

    let depth = 1;
    let compositions = 0;
    while (frontier.length && depth < (budget.maxDepth ?? 1) && compositions < (budget.maxCompositions ?? Infinity)) {
      const next = [];
      for (const possibility of frontier) {
        for (const step of steps) {
          if (!canCompose(possibility, step, observation)) continue;
          const candidate = mergePossibility(possibility, step, activeRelations, observation);
          if (byId.has(candidate.id)) continue;
          byId.set(candidate.id, candidate);
          next.push(candidate);
          compositions += 1;
          if (compositions >= (budget.maxCompositions ?? Infinity)) break;
        }
        if (compositions >= (budget.maxCompositions ?? Infinity)) break;
      }
      frontier = next;
      depth += 1;
    }

    return [...byId.values()];
  }
}

export function createOASISMathKernelV1Canonical(options = {}) {
  return new OASISMathKernelV1Canonical(options);
}
