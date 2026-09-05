import { OASISCore } from './oasis-core.mjs';

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
const subset = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (!bs.has(x)) return false;
  return true;
};
const strictSubset = (a, b) => subset(a, b) && a.size < b.size;

function relationKey(r) {
  return `${r.from}->${r.to}:${r.kind ?? 'rel'}:${r.context ?? ''}`;
}
function relationOccurrenceKey(r) {
  return `${r.id ?? ''}|${relationKey(r)}`;
}
function consequenceEntities(c) {
  return uniq([c.entity, c.from, c.to, ...arr(c.entities), ...arr(c.affects)]);
}
function relationEntities(r) {
  return uniq([r.from, r.to, ...arr(r.entities)]);
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

export class OASISIntegratedCore extends OASISCore {
  _supportForAffordance(affordance, field) {
    const support = super._supportForAffordance(affordance, field);
    if (affordance.meta?.reactivatedExperienceId) {
      support.experienceIds = uniq([...support.experienceIds, affordance.meta.reactivatedExperienceId]);
    }
    return support;
  }

  _actorAvailable(affordance, participation) {
    if (!affordance.actor) return true;
    return participation.current.some(p => p.id === affordance.actor && p.available !== false);
  }

  _requirementsSatisfiedByCurrent(affordance) {
    const available = new Set(this.state.world.facts.keys());
    return arr(affordance.requires).every(req => available.has(req));
  }

  _reactivatedAffordances(field, participation) {
    const participants = new Map(participation.current.map(p => [p.id, p]));
    const out = [];
    for (const exp of field.reactivated) {
      for (const step of arr(exp.choice?.steps)) {
        if (!step?.action || !step.actor) continue;
        const actor = participants.get(step.actor);
        if (!actor || actor.available === false) continue;
        const capabilities = new Set(actor.capabilities ?? []);
        const allowed =
          capabilities.has('*') ||
          capabilities.has(step.action) ||
          capabilities.has(`action:${step.action}`);
        if (!allowed) continue;
        if (step.target && !field.participatingEntities.includes(step.target)) continue;
        out.push({
          ...clone(step),
          id: `reactivated:${exp.experienceId}:${step.id}`,
          meta: {
            ...(step.meta ?? {}),
            reactivatedExperienceId: exp.experienceId,
            reactivatedFromChoiceId: exp.choice?.id ?? null
          }
        });
      }
    }
    return out;
  }

  _primitivePossibilities(affordances, field, participation) {
    return affordances
      .filter(a => this._actorAvailable(a, participation) && this._requirementsSatisfiedByCurrent(a))
      .map((a, index) => {
        const support = this._supportForAffordance(a, field);
        const reactivated = !!a.meta?.reactivatedExperienceId;
        return {
          id: `${reactivated ? 'reactivated' : 'direct'}:${a.id}`,
          kind: reactivated ? 'reactivated-experience-template' : 'direct-affordance',
          steps: [clone(a)],
          entities: affordanceEntities(a),
          requires: clone(a.requires ?? []),
          provides: clone(a.provides ?? []),
          obligations: clone(a.obligations ?? []),
          resolves: clone(a.resolves ?? []),
          violations: clone(a.violates ?? []),
          consequences: clone(a.consequences ?? []),
          support,
          emergence: {
            source: reactivated ? 'reactivated-completed-experience' : 'current-flow',
            eventId: this.state.flow.at(-1)?.event.id ?? null,
            experienceId: a.meta?.reactivatedExperienceId ?? null,
            order: index
          }
        };
      });
  }

  generatePossibilities(field, participation) {
    const currentAffordances = [...this.state.world.affordances.values()]
      .filter(a => this._actorAvailable(a, participation));
    const reactivatedAffordances = this._reactivatedAffordances(field, participation);
    const affordances = [...currentAffordances, ...reactivatedAffordances];
    const primitives = this._primitivePossibilities(affordances, field, participation);

    const byKey = new Map(primitives.map(p => [keyOf(p.steps.map(s => s.id)), p]));
    let frontier = [...primitives];

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

  _candidateView(possibility, responsibility, participation) {
    const currentParticipantIds = new Set(participation.current.map(p => p.id));
    const involvedParticipants = new Set(
      possibility.entities.filter(e => currentParticipantIds.has(e))
    );
    for (const step of possibility.steps) {
      if (step.actor && currentParticipantIds.has(step.actor)) involvedParticipants.add(step.actor);
    }
    const latestEventId = this.state.flow.at(-1)?.event.id ?? null;
    const currentFlowSupport = new Set(
      possibility.support.relations
        .filter(r => r.sourceEventId === latestEventId)
        .map(relationOccurrenceKey)
    );
    return {
      possibility,
      responsibility,
      currentFlowSupport,
      experienceSupport: new Set(possibility.support.experienceIds),
      involvedParticipants,
      unresolved: new Set(responsibility.unresolved),
      violations: new Set(responsibility.invariantViolations)
    };
  }

  _dominatesByResponsibility(a, b) {
    if (!subset(a.violations, b.violations)) return false;
    if (!subset(a.unresolved, b.unresolved)) return false;
    return strictSubset(a.violations, b.violations) || strictSubset(a.unresolved, b.unresolved);
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

    const views = possibilities.map(p =>
      this._candidateView(p, this._responsibilityFor(p, participation), participation)
    );
    const noInvariantViolation = views.filter(v => v.violations.size === 0);
    if (!noInvariantViolation.length) {
      return {
        choice: null,
        frontier: views.map(v => ({
          id: v.possibility.id,
          unresolved: [...v.unresolved],
          invariantViolations: [...v.violations],
          currentFlowSupport: [...v.currentFlowSupport],
          experienceSupport: [...v.experienceSupport],
          involvedParticipants: [...v.involvedParticipants]
        })),
        continuationRequired: true,
        reason: 'Every currently executable possibility conflicts with an explicit system invariant. The core does not cross the invariant by ranking one violation as acceptable.'
      };
    }

    const responsibilityFrontier = noInvariantViolation.filter(
      (candidate, i) => !noInvariantViolation.some(
        (other, j) => i !== j && this._dominatesByResponsibility(other, candidate)
      )
    );

    const directlyInCurrentFlow = responsibilityFrontier.filter(
      v => v.currentFlowSupport.size > 0
    );
    const selectionPool = directlyInCurrentFlow.length
      ? directlyInCurrentFlow
      : responsibilityFrontier;

    const ordered = [...selectionPool].sort((a, b) => keyOf({
      event: a.possibility.emergence?.eventId,
      steps: a.possibility.steps.map(s => s.id),
      reactivatedFrom: a.possibility.emergence?.experienceId ?? null
    }).localeCompare(keyOf({
      event: b.possibility.emergence?.eventId,
      steps: b.possibility.steps.map(s => s.id),
      reactivatedFrom: b.possibility.emergence?.experienceId ?? null
    })));

    const chosen = ordered[0];
    const tieBreakUsed = selectionPool.length > 1;

    return {
      choice: clone(chosen.possibility),
      responsibility: clone(chosen.responsibility),
      frontier: responsibilityFrontier.map(v => ({
        id: v.possibility.id,
        unresolved: [...v.unresolved],
        invariantViolations: [...v.violations],
        currentFlowSupport: [...v.currentFlowSupport],
        experienceSupport: [...v.experienceSupport],
        involvedParticipants: [...v.involvedParticipants]
      })),
      continuationRequired: false,
      currentFlowAnchoringUsed: directlyInCurrentFlow.length > 0,
      tieBreakUsed,
      tieBreakMeaning: tieBreakUsed
        ? 'Deterministic structural key only after invariant, responsibility and direct-current-flow participation remain non-decisive. It is not a semantic preference.'
        : null
    };
  }

  deliberate() {
    if (!this.state.flow.length) throw new Error('No current flow. Call observe(event) first.');
    const field = this.reconstituteAffinityField();
    const participation = this.deriveParticipation(field);
    const possibilities = this.generatePossibilities(field, participation);
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
      currentFlowAnchoringUsed: choiceResult.currentFlowAnchoringUsed ?? false,
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
}

export function createOASIS(options = {}) {
  return new OASISIntegratedCore(options);
}
