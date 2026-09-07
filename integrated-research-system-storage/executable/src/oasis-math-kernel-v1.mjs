const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const clamp01 = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : 0;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const keyOf = value => stable(value);
const intersects = (a, b) => {
  const right = b instanceof Set ? b : new Set(b);
  return [...a].some(x => right.has(x));
};

function relationEntities(relation) {
  return uniq([relation.from, relation.to, ...arr(relation.entities)]);
}

function normalizeRelation(relation, fallbackId) {
  return {
    id: relation.id ?? fallbackId,
    from: relation.from ?? null,
    to: relation.to ?? null,
    kind: relation.kind ?? 'relates',
    context: relation.context ?? null,
    entities: uniq(arr(relation.entities)),
    meta: clone(relation.meta ?? {})
  };
}

function normalizeParticipant(participant) {
  if (typeof participant === 'string') {
    return { id: participant, capabilities: [], available: true, meta: {} };
  }
  return {
    id: participant.id,
    capabilities: uniq(arr(participant.capabilities)),
    available: participant.available !== false,
    meta: clone(participant.meta ?? {})
  };
}

function normalizeObservation(raw, sequence) {
  const value = raw ?? {};
  const relations = arr(value.relations).map((r, i) => normalizeRelation(r, `Y${sequence}:r${i}`));
  const participants = arr(value.participants).map(normalizeParticipant).filter(p => p.id);
  const entities = uniq([
    ...arr(value.entities),
    ...participants.map(p => p.id),
    ...relations.flatMap(relationEntities)
  ]);
  return {
    id: value.id ?? `Y:${sequence}`,
    sequence,
    time: value.time ?? sequence,
    facts: clone(arr(value.facts)),
    relations,
    participants,
    entities,
    responsibilitySignals: clone(value.responsibilitySignals ?? {}),
    relationalProcess: clone(value.relationalProcess ?? value.process ?? []),
    meta: clone(value.meta ?? {})
  };
}

function normalizeStep(step, capabilityId, observationId, index) {
  return {
    id: step.id ?? `${capabilityId}:${observationId}:${index}`,
    capabilityId,
    actor: step.actor ?? null,
    action: step.action ?? capabilityId,
    target: step.target ?? null,
    participants: uniq(arr(step.participants)),
    entities: uniq([step.actor, step.target, ...arr(step.entities)]),
    requires: uniq(arr(step.requires)),
    provides: uniq(arr(step.provides)),
    requiresEntities: uniq(arr(step.requiresEntities)),
    createsEntities: uniq(arr(step.createsEntities)),
    requiresRelationKinds: uniq(arr(step.requiresRelationKinds)),
    providesRelationKinds: uniq(arr(step.providesRelationKinds)),
    bridgeKeys: uniq(arr(step.bridgeKeys)),
    requiresBridgeKeys: uniq(arr(step.requiresBridgeKeys)),
    relations: arr(step.relations).map((r, i) => normalizeRelation(r, `${capabilityId}:${observationId}:${index}:r${i}`)),
    conditions: clone(step.conditions ?? {}),
    responsibility: clone(step.responsibility ?? {}),
    lifeViolation: step.lifeViolation === true,
    requiresLifeAssessment: step.requiresLifeAssessment === true,
    repeatable: step.repeatable === true,
    meta: clone(step.meta ?? {})
  };
}

function possibilityFromStep(step, activeRelations, observation) {
  const relationIds = new Set(step.relations.map(r => r.id));
  const relevantActive = activeRelations.filter(r => {
    if (relationIds.has(r.relation.id)) return true;
    if (step.requiresRelationKinds.includes(r.relation.kind)) return true;
    return intersects(relationEntities(r.relation), new Set(step.entities));
  });
  return {
    id: `c:${step.id}`,
    A_c: uniq([step.actor, ...step.participants]),
    R_c: relevantActive.map(r => clone(r.relation)),
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
    trace: { source: 'current-capability-instantiation', observationId: observation.id }
  };
}

function mergePossibility(left, step, activeRelations, observation) {
  const relevantActive = activeRelations.filter(r => {
    const entities = new Set([...left.sigma.flatMap(s => s.entities), ...step.entities]);
    return intersects(relationEntities(r.relation), entities) || step.requiresRelationKinds.includes(r.relation.kind);
  });
  const sigma = [...left.sigma.map(clone), clone(step)];
  return {
    id: `c:${sigma.map(s => s.id).join('>')}`,
    A_c: uniq([...left.A_c, step.actor, ...step.participants]),
    R_c: uniqById([...left.R_c, ...relevantActive.map(r => r.relation), ...step.relations]),
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
    trace: { source: 'relational-sequential-composition', parents: [left.id, step.id], observationId: observation.id }
  };
}

function uniqById(values) {
  const map = new Map();
  for (const value of values) map.set(value.id ?? keyOf(value), clone(value));
  return [...map.values()];
}

function defaultRelationPredicate({ historyRelation, observation }) {
  const currentEntities = new Set(observation.entities);
  if (intersects(relationEntities(historyRelation), currentEntities)) return true;
  const currentRelationEndpoints = new Set(observation.relations.flatMap(relationEntities));
  return intersects(relationEntities(historyRelation), currentRelationEndpoints);
}

function defaultResponsibilityVector(possibility, observation) {
  // Only explicit responsibility signals are consumed. A generic `danger` field is intentionally ignored.
  const out = {
    uncertainty: 0,
    irreversibility: 0,
    affectedScope: 0,
    recoverability: 1,
    lifeSafetyImpact: 0,
    structuralImpact: 0
  };
  const sources = [observation.responsibilitySignals ?? {}, ...possibility.sigma.map(s => s.responsibility ?? {})];
  for (const source of sources) {
    for (const key of Object.keys(out)) {
      if (source[key] == null) continue;
      if (key === 'recoverability') out[key] = Math.min(out[key], clamp01(source[key]));
      else out[key] = Math.max(out[key], clamp01(source[key]));
    }
  }
  return out;
}

function aggregateResponsibility(vectors) {
  if (!vectors.length) return defaultResponsibilityVector({ sigma: [] }, { responsibilitySignals: {} });
  const aggregate = {
    uncertainty: 0,
    irreversibility: 0,
    affectedScope: 0,
    recoverability: 1,
    lifeSafetyImpact: 0,
    structuralImpact: 0
  };
  for (const vector of vectors) {
    for (const key of Object.keys(aggregate)) {
      if (key === 'recoverability') aggregate[key] = Math.min(aggregate[key], clamp01(vector[key]));
      else aggregate[key] = Math.max(aggregate[key], clamp01(vector[key]));
    }
  }
  return aggregate;
}

function referenceResourcePolicy({ responsibility, previousBudget }) {
  const pressure = (
    clamp01(responsibility.uncertainty) +
    clamp01(responsibility.irreversibility) +
    clamp01(responsibility.affectedScope) +
    (1 - clamp01(responsibility.recoverability)) +
    clamp01(responsibility.lifeSafetyImpact) +
    clamp01(responsibility.structuralImpact)
  ) / 6;
  const base = previousBudget ?? { maxDepth: 2, maxPrimitive: 64, maxCompositions: 256, verificationPasses: 1 };
  // Discrete limits are runtime resource units, not theoretical danger/decision thresholds.
  return {
    maxDepth: Math.max(base.maxDepth ?? 2, Math.ceil(1 + pressure * 3)),
    maxPrimitive: Math.max(base.maxPrimitive ?? 64, Math.ceil(32 + pressure * 96)),
    maxCompositions: Math.max(base.maxCompositions ?? 256, Math.ceil(128 + pressure * 512)),
    verificationPasses: Math.max(base.verificationPasses ?? 1, Math.ceil(1 + pressure * 3)),
    pressure
  };
}

function broadenBudget(budget) {
  return {
    ...budget,
    maxDepth: Math.max(1, Math.ceil((budget.maxDepth ?? 2) * 1.5)),
    maxPrimitive: Math.max(1, Math.ceil((budget.maxPrimitive ?? 64) * 1.5)),
    maxCompositions: Math.max(1, Math.ceil((budget.maxCompositions ?? 256) * 1.5)),
    verificationPasses: Math.max(1, Math.ceil((budget.verificationPasses ?? 1) * 1.5))
  };
}

function canCompose(possibility, step, observation) {
  const usedStepIds = new Set(possibility.sigma.map(s => s.id));
  if (!step.repeatable && usedStepIds.has(step.id)) return false;

  const currentFactIds = new Set(observation.facts.map(f => typeof f === 'string' ? f : f.id).filter(Boolean));
  const providedTokens = new Set([...possibility.sigma.flatMap(s => s.provides), ...currentFactIds]);
  if (!step.requires.every(req => providedTokens.has(req))) return false;

  const createdEntities = new Set(possibility.sigma.flatMap(s => s.createsEntities));
  if (!step.requiresEntities.every(entity => observation.entities.includes(entity) || createdEntities.has(entity))) return false;

  const providedRelationKinds = new Set([
    ...possibility.sigma.flatMap(s => s.providesRelationKinds),
    ...possibility.R_c.map(r => r.kind)
  ]);
  if (!step.requiresRelationKinds.every(kind => providedRelationKinds.has(kind))) return false;

  const providedBridgeKeys = new Set(possibility.sigma.flatMap(s => s.bridgeKeys));
  if (!step.requiresBridgeKeys.every(key => providedBridgeKeys.has(key))) return false;

  const tokenBridge = step.requires.some(req => possibility.sigma.some(s => s.provides.includes(req)));
  const entityBridge = step.requiresEntities.some(entity => createdEntities.has(entity));
  const relationBridge = step.requiresRelationKinds.some(kind => possibility.sigma.some(s => s.providesRelationKinds.includes(kind)) || possibility.R_c.some(r => r.kind === kind));
  const explicitBridge = step.requiresBridgeKeys.some(key => providedBridgeKeys.has(key));

  // Shared entity membership alone is not sufficient to create a composite possibility.
  return tokenBridge || entityBridge || relationBridge || explicitBridge;
}

export class OASISMathKernelV1 {
  constructor(options = {}) {
    if (!options.world || typeof options.world.observe !== 'function') {
      throw new TypeError('world.observe() is required');
    }
    this.world = options.world;
    this.capabilities = arr(options.capabilities).filter(c => c && c.id && typeof c.instantiate === 'function');
    this.relationPredicate = options.relationPredicate ?? defaultRelationPredicate;
    this.potentialModel = options.potentialModel ?? null;
    this.responsibilityModel = options.responsibilityModel ?? null;
    this.resourcePolicy = options.resourcePolicy ?? referenceResourcePolicy;
    this.choicePolicy = options.choicePolicy ?? null;
    this.selfInterventionPolicy = options.selfInterventionPolicy ?? null;
    this.lifeConstraint = options.lifeConstraint ?? null;
    this.maxSelfInterventions = Number.isInteger(options.maxSelfInterventions) ? Math.max(0, options.maxSelfInterventions) : 2;
    this.initialBudget = clone(options.initialBudget ?? { maxDepth: 2, maxPrimitive: 64, maxCompositions: 256, verificationPasses: 1 });
    this.reset();
  }

  reset() {
    this.state = {
      observations: [],
      history: [],
      historyRelations: [],
      deliberations: [],
      realizations: [],
      selfInterventions: [],
      currentObservation: null
    };
  }

  async observe() {
    const raw = await this.world.observe();
    const observation = normalizeObservation(raw, this.state.observations.length);
    this.state.observations.push(clone(observation));
    this.state.currentObservation = clone(observation);
    return clone(observation);
  }

  relationState() {
    return this.state.historyRelations.map(record => ({
      occurrenceId: record.occurrenceId,
      relation: clone(record.relation),
      e: record.e,
      q: record.q,
      sourceExperienceId: record.sourceExperienceId,
      order: record.order
    }));
  }

  gamma(observation, participation) {
    const active = [];
    for (const record of this.state.historyRelations) {
      record.q = 0;
      if (record.e !== 1) continue;
      const current = !!this.relationPredicate({
        historyRelation: clone(record.relation),
        observation: clone(observation),
        participation: clone(participation),
        sourceExperienceId: record.sourceExperienceId
      });
      if (!current) continue;
      record.q = 1;
      active.push({
        occurrenceId: record.occurrenceId,
        relation: clone(record.relation),
        sourceExperienceId: record.sourceExperienceId,
        order: record.order
      });
    }
    return active;
  }

  deriveParticipation(observation, activeRelations) {
    const current = observation.participants.filter(p => p.available !== false).map(clone);
    const currentIds = new Set(current.map(p => p.id));
    const historical = uniq(activeRelations.flatMap(r => relationEntities(r.relation))).filter(id => !currentIds.has(id));
    return {
      current,
      historical,
      affectedEntities: uniq([...observation.entities, ...activeRelations.flatMap(r => relationEntities(r.relation))])
    };
  }

  instantiateCapabilities(observation, participation, activeRelations, budget) {
    const steps = [];
    for (const capability of this.capabilities) {
      const generated = arr(capability.instantiate({
        observation: clone(observation),
        participation: clone(participation),
        activeRelations: clone(activeRelations),
        budget: clone(budget)
      }));
      for (let i = 0; i < generated.length; i++) {
        steps.push(normalizeStep(generated[i], capability.id, observation.id, i));
        if (steps.length >= (budget.maxPrimitive ?? Infinity)) return steps;
      }
    }
    return steps;
  }

  omega(observation, participation, activeRelations, budget) {
    const steps = this.instantiateCapabilities(observation, participation, activeRelations, budget);
    const byId = new Map();
    let frontier = [];
    for (const step of steps) {
      const p = possibilityFromStep(step, activeRelations, observation);
      byId.set(p.id, p);
      frontier.push(p);
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

  kappa(possibility) {
    const combinations = [];
    for (const relation of possibility.R_c) {
      for (const participant of possibility.A_c) {
        if (relationEntities(relation).includes(participant)) {
          combinations.push({ type: 'participant-relation', participant, relationId: relation.id });
        }
      }
      for (const capabilityId of possibility.B_c) {
        combinations.push({ type: 'capability-relation', capabilityId, relationId: relation.id });
      }
    }
    for (let i = 1; i < possibility.sigma.length; i++) {
      const left = possibility.sigma[i - 1];
      const right = possibility.sigma[i];
      combinations.push({
        type: 'ordered-sequence',
        fromStepId: left.id,
        toStepId: right.id,
        tokenBridge: right.requires.filter(x => left.provides.includes(x)),
        entityBridge: right.requiresEntities.filter(x => left.createsEntities.includes(x)),
        relationBridge: right.requiresRelationKinds.filter(x => left.providesRelationKinds.includes(x)),
        explicitBridge: right.requiresBridgeKeys.filter(x => left.bridgeKeys.includes(x))
      });
    }
    return combinations;
  }

  psi(possibility, kappa, observation, participation) {
    if (!this.potentialModel) return 0;
    const value = this.potentialModel({
      possibility: clone(possibility),
      kappa: clone(kappa),
      observation: clone(observation),
      participation: clone(participation)
    });
    if (!Number.isFinite(Number(value))) throw new TypeError('potentialModel must return a finite number');
    return Number(value);
  }

  distribution(possibilities, psiValues) {
    if (!possibilities.length) return [];
    const max = Math.max(...psiValues);
    const exp = psiValues.map(v => Math.exp(v - max));
    const z = exp.reduce((a, b) => a + b, 0);
    return possibilities.map((p, i) => ({ possibilityId: p.id, probability: exp[i] / z }));
  }

  responsibilityFor(possibility, observation, activeRelations, participation) {
    if (this.responsibilityModel) {
      const vector = this.responsibilityModel({
        possibility: clone(possibility),
        observation: clone(observation),
        activeRelations: clone(activeRelations),
        participation: clone(participation)
      });
      return {
        uncertainty: clamp01(vector?.uncertainty),
        irreversibility: clamp01(vector?.irreversibility),
        affectedScope: clamp01(vector?.affectedScope),
        recoverability: vector?.recoverability == null ? 1 : clamp01(vector.recoverability),
        lifeSafetyImpact: clamp01(vector?.lifeSafetyImpact),
        structuralImpact: clamp01(vector?.structuralImpact)
      };
    }
    return defaultResponsibilityVector(possibility, observation);
  }

  allocateResources(responsibility, previousBudget) {
    const next = this.resourcePolicy({ responsibility: clone(responsibility), previousBudget: clone(previousBudget) });
    if (!next || !Number.isFinite(Number(next.maxDepth)) || Number(next.maxDepth) < 1) {
      throw new TypeError('resourcePolicy must return a valid budget');
    }
    return clone(next);
  }

  applyLifeConstraint(possibilities, context) {
    const admissible = [];
    const rejected = [];
    for (const possibility of possibilities) {
      let result;
      if (possibility.lifeViolation) {
        result = { admissible: false, reason: 'explicit-life-value-violation' };
      } else if (possibility.requiresLifeAssessment && !this.lifeConstraint) {
        result = { admissible: false, reason: 'life-assessment-required-but-unavailable' };
      } else if (this.lifeConstraint) {
        const custom = this.lifeConstraint({ possibility: clone(possibility), ...clone(context) });
        result = typeof custom === 'boolean' ? { admissible: custom, reason: custom ? null : 'life-constraint' } : custom;
      } else {
        result = { admissible: true, reason: null };
      }
      if (result?.admissible === false) rejected.push({ possibilityId: possibility.id, reason: result.reason ?? 'life-constraint' });
      else admissible.push(possibility);
    }
    return { admissible, rejected };
  }

  choiceAxis({ admissible, distribution, responsibilityById, observation, participation, activeRelations, round }) {
    if (!admissible.length) return { status: 'nonintervention', choice: null, reason: 'no-admissible-possibility' };
    if (admissible.length === 1) return { status: 'chosen', choice: admissible[0], reason: 'single-admissible-possibility' };
    if (!this.choicePolicy) return { status: 'unresolved', choice: null, reason: 'choice-axis-policy-not-specified' };

    const result = this.choicePolicy({
      admissible: clone(admissible),
      distribution: clone(distribution),
      responsibilityById: clone(responsibilityById),
      observation: clone(observation),
      participation: clone(participation),
      activeRelations: clone(activeRelations),
      round
    });
    const id = typeof result === 'string' ? result : result?.possibilityId;
    const choice = admissible.find(p => p.id === id);
    if (!choice) return { status: 'unresolved', choice: null, reason: 'choice-policy-did-not-return-valid-admissible-id' };
    return { status: 'chosen', choice, reason: 'explicit-choice-axis-policy' };
  }

  selfIntervene(context) {
    const requested = this.selfInterventionPolicy
      ? this.selfInterventionPolicy(clone(context))
      : { action: 'broaden-and-reobserve', budget: broadenBudget(context.allocatedBudget) };
    const result = requested ?? { action: 'stop' };
    this.state.selfInterventions.push({
      index: this.state.selfInterventions.length,
      round: context.round,
      action: result.action ?? 'stop',
      beforeObservationId: context.observation.id,
      beforeBudget: clone(context.budget),
      afterBudget: clone(result.budget ?? context.allocatedBudget)
    });
    return clone(result);
  }

  async deliberate() {
    let budget = clone(this.initialBudget);
    const rounds = [];

    for (let round = 0; round <= this.maxSelfInterventions; round++) {
      // Moving-time semantics: every deliberation round reads the latest observable reality.
      const observation = await this.observe();
      const preParticipation = {
        current: observation.participants.filter(p => p.available !== false).map(clone),
        historical: [],
        affectedEntities: clone(observation.entities)
      };
      const activeRelations = this.gamma(observation, preParticipation);
      const participation = this.deriveParticipation(observation, activeRelations);
      const possibilities = this.omega(observation, participation, activeRelations, budget);
      const kappaById = Object.fromEntries(possibilities.map(p => [p.id, this.kappa(p)]));
      const psiById = Object.fromEntries(possibilities.map(p => [p.id, this.psi(p, kappaById[p.id], observation, participation)]));
      const distribution = this.distribution(possibilities, possibilities.map(p => psiById[p.id]));
      const responsibilityById = Object.fromEntries(possibilities.map(p => [p.id, this.responsibilityFor(p, observation, activeRelations, participation)]));
      const aggregateRho = aggregateResponsibility(Object.values(responsibilityById));
      const allocatedBudget = this.allocateResources(aggregateRho, budget);
      const life = this.applyLifeConstraint(possibilities, { observation, participation, activeRelations, responsibilityById });
      const choice = this.choiceAxis({
        admissible: life.admissible,
        distribution,
        responsibilityById,
        observation,
        participation,
        activeRelations,
        round
      });

      const snapshot = {
        round,
        observation,
        activeRelations: clone(activeRelations),
        participation: clone(participation),
        possibilities: clone(possibilities),
        kappaById: clone(kappaById),
        psiById: clone(psiById),
        distribution: clone(distribution),
        responsibilityById: clone(responsibilityById),
        aggregateResponsibility: clone(aggregateRho),
        budget: clone(budget),
        allocatedBudget: clone(allocatedBudget),
        life: { rejected: clone(life.rejected), admissibleIds: life.admissible.map(p => p.id) },
        choice: { status: choice.status, possibilityId: choice.choice?.id ?? null, reason: choice.reason }
      };
      rounds.push(snapshot);

      if (choice.status === 'chosen') {
        const deliberation = {
          id: `deliberation:${this.state.deliberations.length}`,
          status: 'chosen',
          realizedPossibility: clone(choice.choice),
          nonIntervention: false,
          rounds
        };
        this.state.deliberations.push(clone(deliberation));
        return deliberation;
      }

      const canSelfIntervene = round < this.maxSelfInterventions;
      if (canSelfIntervene) {
        const intervention = this.selfIntervene({
          round,
          observation,
          choice,
          possibilities,
          admissible: life.admissible,
          aggregateResponsibility: aggregateRho,
          budget,
          allocatedBudget
        });
        if (intervention.action !== 'stop') {
          budget = clone(intervention.budget ?? allocatedBudget);
          continue;
        }
      }

      const deliberation = {
        id: `deliberation:${this.state.deliberations.length}`,
        status: 'nonintervention',
        realizedPossibility: null,
        nonIntervention: true,
        reason: choice.status === 'unresolved' ? 'choice-unresolved-after-self-intervention' : choice.reason,
        rounds
      };
      this.state.deliberations.push(clone(deliberation));
      return deliberation;
    }

    throw new Error('unreachable deliberation state');
  }

  wIncorporate(experience) {
    const stored = clone(experience);
    this.state.history.push(stored);
    const relations = uniqById([
      ...arr(stored.processRelations),
      ...arr(stored.choice?.R_c),
      ...arr(stored.choice?.sigma).flatMap(step => arr(step.relations)),
      ...arr(stored.outcomeObservation?.relations)
    ]);
    relations.forEach((relation, index) => {
      this.state.historyRelations.push({
        occurrenceId: `${stored.id}:r:${index}:${relation.id}`,
        relation: clone(relation),
        e: 1,
        q: 0,
        sourceExperienceId: stored.id,
        order: this.state.historyRelations.length
      });
    });
    return clone(stored);
  }

  async step() {
    const deliberation = await this.deliberate();
    if (deliberation.nonIntervention) {
      return {
        status: 'nonintervention',
        deliberation: clone(deliberation),
        historyLength: this.state.history.length
      };
    }
    if (typeof this.world.execute !== 'function') {
      throw new TypeError('world.execute(possibility) is required to realize an active possibility');
    }

    const choice = clone(deliberation.realizedPossibility);
    const beforeObservation = clone(deliberation.rounds.at(-1).observation);
    const executionResult = await this.world.execute(clone(choice));
    const outcomeObservation = await this.observe();
    const experience = {
      id: `experience:${this.state.history.length}`,
      sequence: this.state.history.length,
      beforeObservation,
      choice,
      executionResult: clone(executionResult ?? null),
      outcomeObservation,
      processRelations: clone(choice.R_c),
      relationalProcess: clone(beforeObservation.relationalProcess)
    };
    this.wIncorporate(experience);
    const realization = {
      id: `realization:${this.state.realizations.length}`,
      choiceId: choice.id,
      experienceId: experience.id,
      beforeObservationId: beforeObservation.id,
      outcomeObservationId: outcomeObservation.id
    };
    this.state.realizations.push(realization);

    return {
      status: 'realized',
      deliberation: clone(deliberation),
      realization: clone(realization),
      experience: clone(experience),
      historyLength: this.state.history.length
    };
  }

  snapshot() {
    return clone({
      observations: this.state.observations,
      history: this.state.history,
      relationState: this.relationState(),
      deliberations: this.state.deliberations,
      realizations: this.state.realizations,
      selfInterventions: this.state.selfInterventions
    });
  }
}

export function createOASISMathKernelV1(options = {}) {
  return new OASISMathKernelV1(options);
}
