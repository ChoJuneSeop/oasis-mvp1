// OASIS relational-flow tracker v0.4
// Scope: O_t -> observed relational state -> relational transition -> persistent f_t.
// No fixed time windows, numeric thresholds, similarity search, reward, or task values.

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}

function assertRelationObservation(rel) {
  if (!rel || typeof rel !== 'object') throw new Error('relation observation must be an object');
  if (!rel.relationType) throw new Error('relationType is required');
  if (!rel.roles || typeof rel.roles !== 'object' || Array.isArray(rel.roles)) {
    throw new Error('roles object is required');
  }
  if (Object.keys(rel.roles).length === 0) throw new Error('roles must not be empty');
  if (rel.observed === false) {
    throw new Error('unobserved/unknown relations must be omitted, not encoded as observed:false');
  }
  if (rel.present !== false && !Object.prototype.hasOwnProperty.call(rel, 'state')) {
    throw new Error('state is required when present is not false');
  }
}

export function relationKey(rel) {
  assertRelationObservation(rel);
  // Role names are sorted only to produce deterministic serialization.
  // Role assignments themselves are preserved, so actor=A,target=B differs from actor=B,target=A.
  return `${rel.relationType}|${stable(rel.roles)}`;
}

function sameState(a, b) {
  return stable(a) === stable(b);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export class RelationalFlowTracker {
  constructor() {
    this.channels = new Map();
    this.generations = new Map();
  }

  ingestObservation(observation) {
    if (!observation || typeof observation !== 'object') throw new Error('observation is required');
    const t = observation.t;
    const relations = observation.relations ?? [];
    const transitions = [];
    const endedFlows = [];

    for (const raw of relations) {
      assertRelationObservation(raw);
      const rel = {
        relationType: raw.relationType,
        roles: clone(raw.roles),
        present: raw.present !== false,
        state: clone(raw.state),
        evidence: clone(raw.evidence),
        meta: clone(raw.meta)
      };
      const key = relationKey(rel);
      const current = this.channels.get(key);

      if (!rel.present) {
        // Explicitly observed absence ends the current relational flow.
        // Omission means unknown/not observed and does not end anything.
        if (!current?.active) continue;
        const tr = Object.freeze({
          kind: 'ceased',
          flowId: current.flowId,
          relationKey: key,
          relationType: current.relationType,
          roles: clone(current.roles),
          fromState: clone(current.state),
          toState: null,
          t,
          evidence: clone(rel.evidence),
          meta: clone(rel.meta)
        });
        current.active = false;
        current.lastObservedAt = t;
        current.endedAt = t;
        current.path.push(tr);
        transitions.push(tr);
        endedFlows.push(this.snapshotFlow(current));
        continue;
      }

      if (!current || !current.active) {
        const generation = (this.generations.get(key) ?? 0) + 1;
        this.generations.set(key, generation);
        const flow = {
          flowId: `${key}#${generation}`,
          relationKey: key,
          relationType: rel.relationType,
          roles: clone(rel.roles),
          generation,
          active: true,
          startedAt: t,
          lastObservedAt: t,
          state: clone(rel.state),
          path: []
        };
        const tr = Object.freeze({
          kind: 'emerged',
          flowId: flow.flowId,
          relationKey: key,
          relationType: rel.relationType,
          roles: clone(rel.roles),
          fromState: null,
          toState: clone(rel.state),
          t,
          evidence: clone(rel.evidence),
          meta: clone(rel.meta)
        });
        flow.path.push(tr);
        this.channels.set(key, flow);
        transitions.push(tr);
        continue;
      }

      current.lastObservedAt = t;
      const kind = sameState(current.state, rel.state) ? 'continued' : 'transitioned';
      const tr = Object.freeze({
        kind,
        flowId: current.flowId,
        relationKey: key,
        relationType: rel.relationType,
        roles: clone(rel.roles),
        fromState: clone(current.state),
        toState: clone(rel.state),
        t,
        evidence: clone(rel.evidence),
        meta: clone(rel.meta)
      });
      current.state = clone(rel.state);
      current.path.push(tr);
      transitions.push(tr);
    }

    return {
      t,
      transitions,
      activeFlows: this.getActiveFlows(),
      endedFlows
    };
  }

  snapshotFlow(flow) {
    return {
      flowId: flow.flowId,
      relationKey: flow.relationKey,
      relationType: flow.relationType,
      roles: clone(flow.roles),
      generation: flow.generation,
      active: flow.active,
      startedAt: flow.startedAt,
      lastObservedAt: flow.lastObservedAt,
      endedAt: flow.endedAt,
      duration: (flow.endedAt ?? flow.lastObservedAt) - flow.startedAt,
      state: clone(flow.state),
      path: [...flow.path]
    };
  }

  getActiveFlows() {
    return [...this.channels.values()]
      .filter(flow => flow.active)
      .map(flow => this.snapshotFlow(flow));
  }
}
