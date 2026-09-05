import { OASISIntegratedCore } from './oasis-integrated-core.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

function consequenceEntities(c) {
  return uniq([c.entity, c.from, c.to, ...arr(c.entities), ...arr(c.affects)]);
}

export class OASISReferenceCore extends OASISIntegratedCore {
  _responsibilityFor(possibility, participation) {
    const participants = new Map(participation.current.map(p => [p.id, p]));
    const obligations = new Set(possibility.obligations);
    for (const c of possibility.consequences) {
      for (const o of arr(c.obligations)) obligations.add(o);
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
        if (String(cap).startsWith('resolve:')) add(capable, String(cap).slice('resolve:'.length), id);
      }
    }

    for (const c of possibility.consequences) {
      for (const o of arr(c.obligations)) {
        for (const id of arr(c.responsibleBy)) {
          if (participants.has(id)) add(assigned, o, id);
        }
      }
    }

    // Having an assigned/capable participant is not the same as actually resolving
    // the obligation. Only an executed possibility carrying an explicit `resolves`
    // relation closes an obligation in this deliberation.
    const unresolved = new Set([...obligations].filter(o => !resolved.has(o)));

    const invariantViolations = new Set(
      possibility.violations.filter(v => this.options.invariants.includes(v))
    );
    for (const c of possibility.consequences) {
      for (const tag of arr(c.tags)) {
        if (this.options.invariants.includes(tag)) invariantViolations.add(tag);
      }
    }

    const affectedEntities = new Set(possibility.entities);
    for (const c of possibility.consequences) {
      for (const e of consequenceEntities(c)) affectedEntities.add(e);
    }

    return {
      obligations: [...obligations],
      resolved: [...resolved],
      unresolved: [...unresolved],
      assigned: Object.fromEntries([...assigned.entries()]),
      capable: Object.fromEntries([...capable.entries()]),
      invariantViolations: [...invariantViolations],
      affectedEntities: [...affectedEntities]
    };
  }

  _candidateView(possibility, responsibility, participation) {
    const view = super._candidateView(possibility, responsibility, participation);
    const latestChanged = new Set(this.state.flow.at(-1)?.changedEntities ?? []);

    // Current flow can be expressed by a changed fact, participant, affordance or
    // relation. Do not require a new relation edge to exist before the change can
    // participate in the present decision.
    for (const entity of possibility.entities) {
      if (latestChanged.has(entity)) view.currentFlowSupport.add(`current-entity:${entity}`);
    }

    return view;
  }
}

export function createOASIS(options = {}) {
  return new OASISReferenceCore(options);
}
