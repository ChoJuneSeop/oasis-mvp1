// OASIS relational closure detector v0.6
// Scope: persistent relational flow f_t -> completed relational event e_i.
//
// Design rule:
// A relational event is completed from the flow itself when a relation that
// actually emerged has an explicitly observed cessation. Time, reward, task
// success, similarity, and hand-tuned duration thresholds are not closure rules.
//
// This module intentionally treats one directional relation lifecycle as the
// minimal completed relational event. Larger multi-relation event composition
// remains a later layer and is not inferred here from co-occurrence alone.

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function assertEndedFlow(flow) {
  if (!flow || typeof flow !== 'object') throw new Error('ended flow is required');
  if (flow.active !== false) throw new Error('flow must be explicitly ended');
  if (!Array.isArray(flow.path) || flow.path.length === 0) {
    throw new Error('ended flow must preserve a non-empty relational path');
  }
  if (flow.path[0]?.kind !== 'emerged') {
    throw new Error('completed relation must begin with an emerged transition');
  }
  if (flow.path.at(-1)?.kind !== 'ceased') {
    throw new Error('completed relation must end with an explicitly observed cessation');
  }
}

export function isStructurallyClosedRelationalFlow(flow) {
  if (!flow || flow.active !== false || !Array.isArray(flow.path) || flow.path.length === 0) {
    return false;
  }

  return flow.path[0]?.kind === 'emerged' && flow.path.at(-1)?.kind === 'ceased';
}

export function completedEventFromEndedFlow(flow, { eventId } = {}) {
  assertEndedFlow(flow);

  const event = Object.freeze({
    eventId: eventId ?? `e:${flow.flowId}`,
    sourceFlowId: flow.flowId,
    relationKey: flow.relationKey,
    relationType: flow.relationType,
    roles: clone(flow.roles),
    generation: flow.generation,
    startedAt: flow.startedAt,
    closedAt: flow.endedAt,
    duration: flow.duration,
    relationalPath: Object.freeze(flow.path.map(step => Object.freeze(clone(step)))),
    closure: Object.freeze({
      kind: 'explicit-relational-cessation',
      observedAt: flow.endedAt
    })
  });

  return event;
}

export class OrderedExperienceHistory {
  constructor() {
    this.events = [];
    this.seenFlowIds = new Set();
  }

  appendFromEndedFlow(flow) {
    if (!isStructurallyClosedRelationalFlow(flow)) return null;
    if (this.seenFlowIds.has(flow.flowId)) return null;

    const event = completedEventFromEndedFlow(flow, {
      eventId: `e_${this.events.length + 1}`
    });
    this.events.push(event);
    this.seenFlowIds.add(flow.flowId);
    return event;
  }

  ingestTrackerOutput(trackerOutput) {
    const emittedEvents = [];
    for (const flow of trackerOutput?.endedFlows ?? []) {
      const event = this.appendFromEndedFlow(flow);
      if (event) emittedEvents.push(event);
    }

    return {
      t: trackerOutput?.t,
      emittedEvents,
      history: this.all()
    };
  }

  all() {
    return [...this.events];
  }
}
