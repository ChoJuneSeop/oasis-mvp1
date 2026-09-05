import { OASISIntegratedCore } from './oasis-integrated-core.mjs';

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

function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function hash32(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function consequenceEntities(c) {
  return uniq([c.entity, c.from, c.to, ...arr(c.entities), ...arr(c.affects)]);
}

function semanticActionId(step) {
  return step?.meta?.originalStepId ?? step?.id ?? null;
}

export class OASISReferenceCore extends OASISIntegratedCore {
  constructor(options = {}) {
    const realizationSeed = Number.isInteger(options.realizationSeed)
      ? options.realizationSeed >>> 0
      : randomSeed();
    super({ ...options, deterministicTieBreak: 'contingent-flow-realization' });
    this.options.realizationMode = 'contingent-flow-realization';
    this.options.realizationSeed = realizationSeed;
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
            originalStepId: semanticActionId(step),
            reactivatedExperienceId: exp.experienceId,
            reactivatedFromChoiceId: exp.choice?.id ?? null
          }
        });
      }
    }
    return out;
  }

  _canAppend(possibility, affordance) {
    const usedSemanticActions = new Set(possibility.steps.map(semanticActionId).filter(Boolean));
    const nextSemanticAction = semanticActionId(affordance);
    if (nextSemanticAction && usedSemanticActions.has(nextSemanticAction)) return false;

    const availableTokens = new Set([
      ...possibility.provides,
      ...possibility.resolves,
      ...this.state.world.facts.keys()
    ]);
    if (!arr(affordance.requires).every(req => availableTokens.has(req))) return false;

    // Structural composition must have an explicit process bridge. Merely touching the
    // same entity does not make two actions a meaningful OASIS possibility process.
    const tokenBridge = arr(affordance.requires).some(req =>
      possibility.provides.includes(req) || possibility.resolves.includes(req)
    );
    const responsibilityBridge = arr(affordance.resolves).some(o =>
      possibility.obligations.includes(o)
    );
    const createdEntities = new Set(
      possibility.steps.flatMap(step => arr(step.createsEntities))
    );
    const createdEntityBridge = arr(affordance.requiresEntities).some(e =>
      createdEntities.has(e)
    );

    return tokenBridge || responsibilityBridge || createdEntityBridge;
  }

  _responsibilityFor(possibility, participation) {
    const participants = new Map(participation.current.map(p => [p.id, p]));
    const affectedEntities = new Set(possibility.entities);
    const involvedParticipantIds = new Set();

    for (const entity of possibility.entities) {
      if (participants.has(entity)) involvedParticipantIds.add(entity);
    }
    for (const step of possibility.steps) {
      if (step.actor && participants.has(step.actor)) involvedParticipantIds.add(step.actor);
      if (step.target && participants.has(step.target)) involvedParticipantIds.add(step.target);
    }
    for (const c of possibility.consequences) {
      for (const e of consequenceEntities(c)) {
        affectedEntities.add(e);
        if (participants.has(e)) involvedParticipantIds.add(e);
      }
      for (const id of arr(c.responsibleBy)) {
        if (participants.has(id)) involvedParticipantIds.add(id);
      }
    }

    const obligations = new Set(possibility.obligations);
    for (const c of possibility.consequences) {
      for (const o of arr(c.obligations)) obligations.add(o);
    }
    for (const id of involvedParticipantIds) {
      for (const o of participants.get(id)?.obligations ?? []) obligations.add(o);
    }

    const resolved = new Set(possibility.resolves);
    for (const c of possibility.consequences) {
      for (const o of arr(c.resolves)) resolved.add(o);
    }

    const assigned = new Map();
    const capable = new Map();
    const add = (map, obligation, id) => {
      if (!map.has(obligation)) map.set(obligation, []);
      if (!map.get(obligation).includes(id)) map.get(obligation).push(id);
    };

    for (const [id, p] of participants) {
      for (const o of p.obligations ?? []) add(assigned, o, id);
      for (const cap of p.capabilities ?? []) {
        add(capable, String(cap), id);
        if (String(cap).startsWith('resolve:')) {
          add(capable, String(cap).slice('resolve:'.length), id);
        }
      }
    }

    for (const c of possibility.consequences) {
      for (const o of arr(c.obligations)) {
        for (const id of arr(c.responsibleBy)) {
          if (participants.has(id)) add(assigned, o, id);
        }
      }
    }

    const unresolved = new Set([...obligations].filter(o => !resolved.has(o)));

    const invariantViolations = new Set(
      possibility.violations.filter(v => this.options.invariants.includes(v))
    );
    for (const c of possibility.consequences) {
      for (const tag of arr(c.tags)) {
        if (this.options.invariants.includes(tag)) invariantViolations.add(tag);
      }
    }

    return {
      obligations: [...obligations],
      resolved: [...resolved],
      unresolved: [...unresolved],
      assigned: Object.fromEntries([...assigned.entries()]),
      capable: Object.fromEntries([...capable.entries()]),
      involvedParticipantIds: [...involvedParticipantIds],
      invariantViolations: [...invariantViolations],
      affectedEntities: [...affectedEntities]
    };
  }

  _candidateView(possibility, responsibility, participation) {
    const view = super._candidateView(possibility, responsibility, participation);
    const latestChanged = new Set(this.state.flow.at(-1)?.changedEntities ?? []);
    for (const entity of possibility.entities) {
      if (latestChanged.has(entity)) view.currentFlowSupport.add(`current-entity:${entity}`);
    }
    return view;
  }

  _dominatesByResponsibility(a, b) {
    if (!subset(a.violations, b.violations)) return false;
    if (!subset(a.unresolved, b.unresolved)) return false;
    return strictSubset(a.violations, b.violations) || strictSubset(a.unresolved, b.unresolved);
  }

  _flowFingerprint() {
    return keyOf(this.state.flow.map(entry => ({
      event: {
        time: entry.event.time,
        facts: entry.event.facts,
        relations: entry.event.relations,
        participants: entry.event.participants,
        affordances: entry.event.affordances,
        entities: entry.event.entities,
        intervention: entry.event.intervention
      },
      changedEntities: entry.changedEntities,
      previousChoiceId: entry.previousChoiceId
    })));
  }

  _contingentRealize(selectionPool) {
    const flowFingerprint = this._flowFingerprint();
    const seed = this.options.realizationSeed >>> 0;
    const rows = selectionPool.map(view => {
      const structuralIdentity = keyOf({
        steps: view.possibility.steps.map(semanticActionId),
        currentFlowSupport: [...view.currentFlowSupport].sort(),
        experienceSupport: [...view.experienceSupport].sort(),
        unresolved: [...view.unresolved].sort()
      });
      return {
        view,
        token: hash32(`${seed}|${flowFingerprint}|${structuralIdentity}`),
        structuralIdentity
      };
    });
    rows.sort((a, b) => a.token - b.token || a.structuralIdentity.localeCompare(b.structuralIdentity));
    return rows[0].view;
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

    const contingentRealizationUsed = selectionPool.length > 1;
    const chosen = contingentRealizationUsed
      ? this._contingentRealize(selectionPool)
      : selectionPool[0];

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
      tieBreakUsed: contingentRealizationUsed,
      tieBreakMeaning: contingentRealizationUsed
        ? 'Contingent realization among responsibility-equivalent, current-flow-equivalent possibilities. The recorded realization seed and the complete current flow determine reproducible realization; this is not a semantic score or preference.'
        : null
    };
  }
}

export function createOASIS(options = {}) {
  return new OASISReferenceCore(options);
}
