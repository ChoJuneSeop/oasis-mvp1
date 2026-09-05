const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const keyOf = value => stable(value);
const intersects = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (bs.has(x)) return true;
  return false;
};
const subset = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (!bs.has(x)) return false;
  return true;
};
const strictSubset = (a, b) => subset(a, b) && a.size < b.size;
const strictSuperset = (a, b) => strictSubset(b, a);

function relationKey(r) {
  return `${r.from}->${r.to}:${r.kind ?? 'rel'}:${r.context ?? ''}`;
}
function relationOccurrenceKey(r) {
  return `${r.id ?? ''}|${relationKey(r)}`;
}
function relationEntities(r) {
  return uniq([r.from, r.to, ...arr(r.entities)]);
}
function consequenceEntities(c) {
  return uniq([c.entity, c.from, c.to, ...arr(c.entities), ...arr(c.affects)]);
}
function affordanceEntities(a) {
  return uniq([
    a.actor, a.target,
    ...arr(a.entities),
    ...arr(a.requiresEntities),
    ...arr(a.createsEntities),
    ...arr(a.removesEntities),
    ...arr(a.relations).flatMap(relationEntities),
    ...arr(a.consequences).flatMap(consequenceEntities)
  ]);
}
function experienceProcessRelations(exp) {
  return arr(exp.processRelations).map(clone);
}
function experienceEntities(exp) {
  return uniq([
    ...arr(exp.participation?.current).map(x => typeof x === 'string' ? x : x.id),
    ...arr(exp.participation?.historical).map(x => typeof x === 'string' ? x : x.id),
    ...experienceProcessRelations(exp).flatMap(relationEntities),
    ...arr(exp.choice?.entities),
    ...arr(exp.outcome?.affectedEntities),
    ...arr(exp.before?.changedEntities),
    ...arr(exp.after?.changedEntities)
  ]);
}
function normalizeParticipant(p) {
  if (typeof p === 'string') return { id: p, roles: [], capabilities: [], obligations: [], available: true, meta: {} };
  return {
    id: p.id,
    roles: uniq(arr(p.roles)),
    capabilities: uniq(arr(p.capabilities)),
    obligations: uniq(arr(p.obligations)),
    available: p.available !== false,
    meta: clone(p.meta ?? {})
  };
}
function normalizeRelation(r, sourceEventId, index) {
  return {
    id: r.id ?? `${sourceEventId}:rel:${index}`,
    from: r.from,
    to: r.to,
    kind: r.kind ?? 'relates',
    context: r.context ?? null,
    entities: uniq(arr(r.entities)),
    op: r.op ?? 'upsert',
    sourceEventId,
    meta: clone(r.meta ?? {})
  };
}
function normalizeAffordance(a, sourceEventId, index) {
  return {
    id: a.id ?? `${sourceEventId}:aff:${index}`,
    op: a.op ?? 'upsert',
    actor: a.actor ?? null,
    action: a.action ?? a.kind ?? 'act',
    target: a.target ?? null,
    entities: uniq(arr(a.entities)),
    requires: uniq(arr(a.requires)),
    provides: uniq(arr(a.provides)),
    requiresEntities: uniq(arr(a.requiresEntities)),
    createsEntities: uniq(arr(a.createsEntities)),
    removesEntities: uniq(arr(a.removesEntities)),
    relations: arr(a.relations).map((r, i) => normalizeRelation(r, `${sourceEventId}:${a.id ?? index}`, i)),
    consequences: arr(a.consequences).map(c => ({
      ...clone(c),
      tags: uniq(arr(c.tags)),
      obligations: uniq(arr(c.obligations)),
      responsibleBy: uniq(arr(c.responsibleBy)),
      affects: uniq(arr(c.affects))
    })),
    obligations: uniq(arr(a.obligations)),
    resolves: uniq(arr(a.resolves)),
    violates: uniq(arr(a.violates)),
    meta: clone(a.meta ?? {})
  };
}
function normalizeEvent(event, sequence) {
  const id = event.id ?? `flow:${sequence}`;
  return {
    id,
    sequence,
    time: event.time ?? sequence,
    facts: arr(event.facts).map((f, i) => ({ id: f.id ?? `${id}:fact:${i}`, ...clone(f) })),
    relations: arr(event.relations).map((r, i) => normalizeRelation(r, id, i)),
    participants: arr(event.participants).map(normalizeParticipant),
    affordances: arr(event.affordances).map((a, i) => normalizeAffordance(a, id, i)),
    entities: uniq(arr(event.entities)),
    source: clone(event.source ?? null),
    intervention: clone(event.intervention ?? null),
    meta: clone(event.meta ?? {})
  };
}

function setFrom(values) { return new Set(uniq(values)); }
function relationSignature(relations) { return relations.map(relationKey); }

export class OASISCore {
  constructor(options = {}) {
    this.options = {
      agentId: options.agentId ?? 'OASIS',
      invariants: uniq(arr(options.invariants ?? ['irreversible-loss-of-life'])),
      deterministicTieBreak: options.deterministicTieBreak ?? 'structural-key'
    };
    this.reset();
  }

  reset() {
    this.state = {
      flow: [],
      world: {
        facts: new Map(),
        relations: new Map(),
        participants: new Map(),
        affordances: new Map()
      },
      closedExperiences: [],
      actualizations: [],
      spiralLineage: [],
      seenStructures: new Set(),
      lastDeliberation: null,
      lastActualizedChoiceId: null
    };
  }

  observe(rawEvent) {
    const event = normalizeEvent(rawEvent, this.state.flow.length);
    const before = this._worldDigest();
    const changedEntities = new Set(event.entities);
    const changedRelationKeys = [];

    for (const f of event.facts) {
      if (f.op === 'remove') this.state.world.facts.delete(f.id);
      else this.state.world.facts.set(f.id, clone(f));
      for (const e of arr(f.entities)) changedEntities.add(e);
    }

    for (const r of event.relations) {
      const k = r.id ?? relationKey(r);
      if (r.op === 'remove') this.state.world.relations.delete(k);
      else this.state.world.relations.set(k, clone(r));
      changedRelationKeys.push(k);
      for (const e of relationEntities(r)) changedEntities.add(e);
    }

    for (const p of event.participants) {
      if (!p.id) continue;
      this.state.world.participants.set(p.id, clone(p));
      changedEntities.add(p.id);
    }

    for (const a of event.affordances) {
      if (a.op === 'remove') this.state.world.affordances.delete(a.id);
      else this.state.world.affordances.set(a.id, clone(a));
      for (const e of affordanceEntities(a)) changedEntities.add(e);
    }

    const after = this._worldDigest();
    const flowEntry = {
      event,
      before,
      after,
      changedEntities: [...changedEntities],
      changedRelationKeys,
      previousChoiceId: this.state.lastActualizedChoiceId
    };
    this.state.flow.push(flowEntry);
    return clone(flowEntry);
  }

  _worldDigest() {
    return {
      facts: [...this.state.world.facts.values()].map(clone),
      relations: [...this.state.world.relations.values()].map(clone),
      participants: [...this.state.world.participants.values()].map(clone),
      affordances: [...this.state.world.affordances.values()].map(clone)
    };
  }

  _currentSeeds() {
    const latest = this.state.flow.at(-1);
    const seeds = new Set(latest?.changedEntities ?? []);
    for (const p of this.state.world.participants.values()) if (p.available !== false) seeds.add(p.id);
    if (this.state.lastDeliberation?.choice?.entities) {
      for (const e of this.state.lastDeliberation.choice.entities) seeds.add(e);
    }
    return seeds;
  }

  reconstituteAffinityField() {
    const seeds = this._currentSeeds();
    const currentRelations = [...this.state.world.relations.values()];
    const frontier = new Set(seeds);
    const currentRelevant = [];
    const selectedCurrent = new Set();
    let currentChanged = true;
    while (currentChanged) {
      currentChanged = false;
      for (const r of currentRelations) {
        const k = relationOccurrenceKey(r);
        if (selectedCurrent.has(k)) continue;
        if (!intersects(relationEntities(r), frontier)) continue;
        selectedCurrent.add(k);
        currentRelevant.push(clone(r));
        for (const e of relationEntities(r)) {
          if (!frontier.has(e)) {
            frontier.add(e);
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
        const entities = experienceEntities(exp);
        if (!intersects(entities, frontier)) continue;
        const touched = entities.filter(e => frontier.has(e));
        reactivated.push({
          experienceId: exp.id,
          sequence: exp.sequence,
          touchedEntities: touched,
          relations: clone(experienceProcessRelations(exp)),
          choice: clone(exp.choice),
          outcome: clone(exp.outcome)
        });
        paths.push({ fromCurrentEntities: touched, toExperienceId: exp.id, sequence: exp.sequence });
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
      relationSignature: relationSignature(relations)
    };
  }

  deriveParticipation(field) {
    const current = [...this.state.world.participants.values()].filter(p => p.available !== false).map(clone);
    const currentIds = new Set(current.map(p => p.id));
    const historicalIds = new Set();
    const affected = new Set(field.participatingEntities);

    for (const exp of field.reactivated) {
      for (const p of arr(exp.choice?.participants)) if (!currentIds.has(p)) historicalIds.add(p);
      for (const e of experienceEntities(exp)) affected.add(e);
    }

    const responsibilityCarriers = current.filter(p => p.obligations.length || p.capabilities.length).map(p => p.id);
    return {
      current,
      historical: [...historicalIds],
      affectedEntities: [...affected],
      responsibilityCarriers
    };
  }

  _supportForAffordance(affordance, field) {
    const entities = setFrom(affordanceEntities(affordance));
    const relationSupport = field.relations.filter(r => intersects(relationEntities(r), entities));
    const experienceSupport = field.reactivated.filter(exp => {
      const ee = setFrom([
        ...exp.relations.flatMap(relationEntities),
        ...arr(exp.choice?.entities),
        ...arr(exp.outcome?.affectedEntities)
      ]);
      return intersects(ee, entities);
    }).map(x => x.experienceId);
    return {
      relations: relationSupport.map(clone),
      experienceIds: uniq(experienceSupport)
    };
  }

  _directPossibilities(field) {
    return [...this.state.world.affordances.values()].map((a, index) => {
      const support = this._supportForAffordance(a, field);
      return {
        id: `direct:${a.id}`,
        kind: 'direct-affordance',
        steps: [clone(a)],
        entities: affordanceEntities(a),
        requires: clone(a.requires),
        provides: clone(a.provides),
        obligations: clone(a.obligations),
        resolves: clone(a.resolves),
        violations: clone(a.violates),
        consequences: clone(a.consequences),
        support,
        emergence: { source: 'current-flow', eventId: this.state.flow.at(-1)?.event.id ?? null, order: index }
      };
    });
  }

  _canAppend(possibility, affordance) {
    const used = new Set(possibility.steps.map(s => s.id));
    if (used.has(affordance.id)) return false;
    const availableTokens = new Set([
      ...possibility.provides,
      ...possibility.resolves,
      ...this.state.world.facts.keys()
    ]);
    if (!affordance.requires.every(req => availableTokens.has(req))) return false;
    const possEntities = setFrom(possibility.entities);
    const nextEntities = setFrom(affordanceEntities(affordance));
    const tokenBridge = affordance.requires.some(req => possibility.provides.includes(req));
    const responsibilityBridge = affordance.resolves.some(o => possibility.obligations.includes(o));
    return intersects(possEntities, nextEntities) || tokenBridge || responsibilityBridge;
  }

  _appendPossibility(possibility, affordance, field) {
    const steps = [...possibility.steps, clone(affordance)];
    const support = this._supportForAffordance(affordance, field);
    return {
      id: `composite:${steps.map(s => s.id).join('>')}`,
      kind: 'structural-combination',
      steps,
      entities: uniq([...possibility.entities, ...affordanceEntities(affordance)]),
      requires: uniq([...possibility.requires, ...affordance.requires]),
      provides: uniq([...possibility.provides, ...affordance.provides]),
      obligations: uniq([...possibility.obligations, ...affordance.obligations]),
      resolves: uniq([...possibility.resolves, ...affordance.resolves]),
      violations: uniq([...possibility.violations, ...affordance.violates]),
      consequences: [...possibility.consequences.map(clone), ...affordance.consequences.map(clone)],
      support: {
        relations: [...possibility.support.relations.map(clone), ...support.relations.map(clone)],
        experienceIds: uniq([...possibility.support.experienceIds, ...support.experienceIds])
      },
      emergence: {
        source: 'relational-structural-closure',
        eventId: this.state.flow.at(-1)?.event.id ?? null,
        parents: [possibility.id, `direct:${affordance.id}`]
      }
    };
  }

  generatePossibilities(field) {
    const direct = this._directPossibilities(field);
    const byKey = new Map(direct.map(p => [keyOf(p.steps.map(s => s.id)), p]));
    let frontier = [...direct];
    const affordances = [...this.state.world.affordances.values()];

    while (frontier.length) {
      const next = [];
      for (const p of frontier) {
        for (const a of affordances) {
          if (!this._canAppend(p, a)) continue;
          const candidate = this._appendPossibility(p, a, field);
          const k = keyOf(candidate.steps.map(s => s.id));
          if (byKey.has(k)) continue;
          byKey.set(k, candidate);
          next.push(candidate);
        }
      }
      frontier = next;
    }
    return [...byKey.values()];
  }

  _responsibilityFor(possibility, participation) {
    const participants = new Map(participation.current.map(p => [p.id, p]));
    const obligations = new Set(possibility.obligations);
    for (const c of possibility.consequences) for (const o of arr(c.obligations)) obligations.add(o);

    const resolved = new Set(possibility.resolves);
    const carriers = new Map();
    for (const [id, p] of participants) {
      for (const o of p.obligations) {
        if (!carriers.has(o)) carriers.set(o, []);
        carriers.get(o).push(id);
      }
      for (const cap of p.capabilities) {
        if (!carriers.has(cap)) carriers.set(cap, []);
        carriers.get(cap).push(id);
      }
    }

    for (const o of obligations) if (carriers.has(o)) resolved.add(o);
    for (const c of possibility.consequences) {
      for (const id of arr(c.responsibleBy)) {
        if (participants.has(id)) for (const o of arr(c.obligations)) resolved.add(o);
      }
    }

    const unresolved = new Set([...obligations].filter(o => !resolved.has(o)));
    const invariantViolations = new Set(possibility.violations.filter(v => this.options.invariants.includes(v)));
    for (const c of possibility.consequences) {
      for (const tag of arr(c.tags)) if (this.options.invariants.includes(tag)) invariantViolations.add(tag);
    }

    const affectedEntities = new Set(possibility.entities);
    for (const c of possibility.consequences) for (const e of consequenceEntities(c)) affectedEntities.add(e);

    return {
      obligations: [...obligations],
      resolved: [...resolved],
      unresolved: [...unresolved],
      invariantViolations: [...invariantViolations],
      carriers: Object.fromEntries([...carriers.entries()]),
      affectedEntities: [...affectedEntities]
    };
  }

  _candidateView(possibility, responsibility, participation) {
    const currentParticipantIds = new Set(participation.current.map(p => p.id));
    const involvedParticipants = new Set(possibility.entities.filter(e => currentParticipantIds.has(e)));
    for (const step of possibility.steps) if (step.actor && currentParticipantIds.has(step.actor)) involvedParticipants.add(step.actor);
    return {
      possibility,
      responsibility,
      relationSupport: new Set(possibility.support.relations.map(relationOccurrenceKey)),
      experienceSupport: new Set(possibility.support.experienceIds),
      involvedParticipants,
      unresolved: new Set(responsibility.unresolved),
      violations: new Set(responsibility.invariantViolations)
    };
  }

  _dominates(a, b) {
    if (!subset(a.violations, b.violations)) return false;
    if (!subset(a.unresolved, b.unresolved)) return false;
    if (!subset(b.relationSupport, a.relationSupport)) return false;
    if (!subset(b.experienceSupport, a.experienceSupport)) return false;
    if (!subset(b.involvedParticipants, a.involvedParticipants)) return false;
    return strictSubset(a.violations, b.violations) ||
      strictSubset(a.unresolved, b.unresolved) ||
      strictSuperset(a.relationSupport, b.relationSupport) ||
      strictSuperset(a.experienceSupport, b.experienceSupport) ||
      strictSuperset(a.involvedParticipants, b.involvedParticipants);
  }

  choose(possibilities, participation) {
    if (!possibilities.length) {
      return {
        choice: null,
        frontier: [],
        continuationRequired: true,
        reason: 'No executable or structurally generated possibility is available. Core does not inject a baseline condition automatically.'
      };
    }

    const views = possibilities.map(p => this._candidateView(p, this._responsibilityFor(p, participation), participation));
    const noInvariantViolation = views.filter(v => v.violations.size === 0);
    if (!noInvariantViolation.length) {
      return {
        choice: null,
        frontier: views.map(v => ({
          id: v.possibility.id,
          unresolved: [...v.unresolved],
          invariantViolations: [...v.violations],
          relationSupport: [...v.relationSupport],
          experienceSupport: [...v.experienceSupport],
          involvedParticipants: [...v.involvedParticipants]
        })),
        continuationRequired: true,
        reason: 'Every currently executable possibility conflicts with an explicit system invariant. The core does not cross the invariant by ranking one violation as acceptable.'
      };
    }
    const pool = noInvariantViolation;
    const frontier = pool.filter((candidate, i) => !pool.some((other, j) => i !== j && this._dominates(other, candidate)));

    const ordered = [...frontier].sort((a, b) => keyOf({
      event: a.possibility.emergence?.eventId,
      steps: a.possibility.steps.map(s => s.id),
      support: [...a.experienceSupport]
    }).localeCompare(keyOf({
      event: b.possibility.emergence?.eventId,
      steps: b.possibility.steps.map(s => s.id),
      support: [...b.experienceSupport]
    })));

    const chosen = ordered[0];
    return {
      choice: clone(chosen.possibility),
      responsibility: clone(chosen.responsibility),
      frontier: frontier.map(v => ({
        id: v.possibility.id,
        unresolved: [...v.unresolved],
        invariantViolations: [...v.violations],
        relationSupport: [...v.relationSupport],
        experienceSupport: [...v.experienceSupport],
        involvedParticipants: [...v.involvedParticipants]
      })),
      continuationRequired: false,
      tieBreakUsed: frontier.length > 1,
      tieBreakMeaning: frontier.length > 1 ? 'Deterministic structural key only; it is not a semantic preference and must not be interpreted as OASIS superiority.' : null
    };
  }

  deliberate() {
    if (!this.state.flow.length) throw new Error('No current flow. Call observe(event) first.');
    const field = this.reconstituteAffinityField();
    const participation = this.deriveParticipation(field);
    const possibilities = this.generatePossibilities(field);
    const choiceResult = this.choose(possibilities, participation);

    const structure = {
      field: field.relationSignature,
      reactivated: field.reactivatedExperienceIds,
      participation: {
        current: participation.current.map(p => p.id),
        historical: participation.historical,
        affected: participation.affectedEntities
      },
      possibilities: possibilities.map(p => ({ id: p.id, steps: p.steps.map(s => s.id) })),
      choice: choiceResult.choice?.id ?? null
    };
    const structureKey = keyOf(structure);
    const novelStructure = !this.state.seenStructures.has(structureKey);
    this.state.seenStructures.add(structureKey);

    const trace = {
      id: `deliberation:${this.state.actualizations.length}:${this.state.flow.length - 1}`,
      flowEventId: this.state.flow.at(-1).event.id,
      currentFlow: {
        changedEntities: clone(this.state.flow.at(-1).changedEntities),
        previousChoiceId: this.state.flow.at(-1).previousChoiceId,
        world: this._worldDigest()
      },
      field,
      participation,
      possibilities: clone(possibilities),
      choice: clone(choiceResult.choice),
      responsibility: clone(choiceResult.responsibility ?? null),
      frontier: clone(choiceResult.frontier),
      continuationRequired: choiceResult.continuationRequired,
      tieBreakUsed: choiceResult.tieBreakUsed ?? false,
      tieBreakMeaning: choiceResult.tieBreakMeaning ?? null,
      structuralExpansion: {
        novelStructure,
        structureKey
      }
    };
    this.state.lastDeliberation = trace;
    return clone(trace);
  }

  actualize(choiceId, rawOutcomeEvent) {
    const d = this.state.lastDeliberation;
    if (!d) throw new Error('No deliberation to actualize.');
    if (!d.choice) throw new Error('Deliberation has no internally available choice. Provide a baseline event externally, observe it, then deliberate again.');
    if (choiceId !== d.choice.id) throw new Error(`Only the single deliberated choice may be actualized. expected=${d.choice.id} received=${choiceId}`);
    if (this.state.lastActualizedChoiceId === choiceId && this.state.actualizations.at(-1)?.deliberationId === d.id) {
      throw new Error('This deliberation has already been actualized.');
    }

    const beforeOutcome = this._worldDigest();
    this.state.lastActualizedChoiceId = choiceId;
    const outcomeFlowEntry = this.observe({ ...clone(rawOutcomeEvent), meta: { ...(rawOutcomeEvent?.meta ?? {}), actualizesChoiceId: choiceId } });
    const afterOutcome = this._worldDigest();
    const processRelations = [];
    const seenProcessRelations = new Set();
    for (const r of [
      ...arr(d.field.currentRelations),
      ...arr(d.choice.steps).flatMap(step => arr(step.relations)),
      ...arr(outcomeFlowEntry.event.relations)
    ]) {
      const k = relationOccurrenceKey(r);
      if (seenProcessRelations.has(k)) continue;
      seenProcessRelations.add(k);
      processRelations.push(clone(r));
    }

    const exp = {
      id: `experience:${this.state.closedExperiences.length}`,
      sequence: this.state.closedExperiences.length,
      deliberationId: d.id,
      before: {
        flowEventId: d.flowEventId,
        changedEntities: clone(d.currentFlow.changedEntities),
        world: clone(d.currentFlow.world)
      },
      field: {
        seedEntities: clone(d.field.seedEntities),
        reactivatedExperienceIds: clone(d.field.reactivatedExperienceIds),
        paths: clone(d.field.paths),
        relationSignature: clone(d.field.relationSignature)
      },
      processRelations,
      participation: {
        current: d.participation.current.map(p => p.id),
        historical: clone(d.participation.historical),
        affectedEntities: clone(d.participation.affectedEntities)
      },
      possibilitiesObserved: d.possibilities.map(p => ({ id: p.id, steps: p.steps.map(s => s.id) })),
      choice: {
        id: d.choice.id,
        kind: d.choice.kind,
        steps: clone(d.choice.steps),
        entities: clone(d.choice.entities),
        participants: d.participation.current.map(p => p.id),
        responsibility: clone(d.responsibility)
      },
      outcome: {
        eventId: outcomeFlowEntry.event.id,
        relations: clone(outcomeFlowEntry.event.relations),
        affectedEntities: clone(outcomeFlowEntry.changedEntities),
        beforeWorld: beforeOutcome,
        afterWorld: afterOutcome
      },
      after: {
        changedEntities: clone(outcomeFlowEntry.changedEntities),
        world: afterOutcome
      }
    };

    this.state.closedExperiences.push(exp);
    this.state.actualizations.push({
      deliberationId: d.id,
      choiceId,
      experienceId: exp.id,
      outcomeEventId: outcomeFlowEntry.event.id
    });
    for (const parent of d.field.reactivatedExperienceIds) {
      this.state.spiralLineage.push({
        fromExperienceId: parent,
        toExperienceId: exp.id,
        viaChoiceId: choiceId,
        outcomeEventId: outcomeFlowEntry.event.id
      });
    }

    return clone(exp);
  }

  exportState() {
    return {
      options: clone(this.options),
      flow: clone(this.state.flow),
      world: this._worldDigest(),
      closedExperiences: clone(this.state.closedExperiences),
      actualizations: clone(this.state.actualizations),
      spiralLineage: clone(this.state.spiralLineage),
      seenStructures: [...this.state.seenStructures],
      lastDeliberation: clone(this.state.lastDeliberation),
      lastActualizedChoiceId: this.state.lastActualizedChoiceId
    };
  }
}

export function createOASIS(options = {}) {
  return new OASISCore(options);
}
