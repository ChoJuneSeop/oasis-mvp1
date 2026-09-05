// OASIS flow core v0.3
// Scope: M -> O -> f -> e -> h only.
// Excludes a_t, C_t, Psi, probability selection, responsibility, and safety logic.

export class OrderedHistory {
  constructor() {
    this.events = [];
  }

  append(event) {
    this.events.push(event);
  }

  all() {
    return [...this.events];
  }
}

export class OasisFlowCore {
  constructor({ relationExtractor, closureDetector }) {
    if (typeof relationExtractor !== 'function') {
      throw new Error('relationExtractor is required');
    }
    if (typeof closureDetector !== 'function') {
      throw new Error('closureDetector is required');
    }

    this.relationExtractor = relationExtractor;
    this.closureDetector = closureDetector;
    this.history = new OrderedHistory();
    this.measurements = [];
    this.observations = [];
    this.openFlows = new Map();
    this.nextEventId = 1;
  }

  ingestMeasurement(measurement) {
    // M_t: preserve raw measurement as supplied by the environment interface.
    const M = Object.freeze({ ...measurement });
    this.measurements.push(M);
    return M;
  }

  observe(measurement) {
    // O_t: observation state is composed from current measurement only.
    // No OASIS preference/value judgement is introduced here.
    const O = Object.freeze({
      t: measurement.t,
      entities: measurement.entities ?? [],
      values: measurement.values ?? {},
      meta: measurement.meta ?? {}
    });
    this.observations.push(O);
    return O;
  }

  updateFlow(observation) {
    // f_t: open relational processes derived from observed relation changes.
    // No fixed recent-N window, timeout, similarity threshold, or score.
    const transitions = this.relationExtractor(observation, this.observations);
    const emittedEvents = [];

    for (const tr of transitions) {
      if (!tr || !tr.flowId) continue;

      let flow = this.openFlows.get(tr.flowId);
      if (!flow) {
        flow = {
          flowId: tr.flowId,
          startedAt: observation.t,
          lastObservedAt: observation.t,
          status: 'open',
          transitions: [],
          participants: new Set(),
          possibilitySnapshots: [],
          realizations: [],
          results: []
        };
        this.openFlows.set(tr.flowId, flow);
      }

      flow.lastObservedAt = observation.t;
      flow.transitions.push(Object.freeze({ ...tr, t: observation.t }));
      for (const p of tr.participants ?? []) flow.participants.add(p);

      if (tr.possibilitySnapshot) {
        flow.possibilitySnapshots.push(Object.freeze({ ...tr.possibilitySnapshot, t: observation.t }));
      }
      if (tr.realization) {
        flow.realizations.push(Object.freeze({ ...tr.realization, t: observation.t }));
      }
      if (tr.result) {
        flow.results.push(Object.freeze({ ...tr.result, t: observation.t }));
      }

      const closure = this.closureDetector(flow, observation, tr);
      if (closure?.closed) {
        const event = this.closeFlow(flow, observation.t, closure);
        emittedEvents.push(event);
      }
    }

    return {
      t: observation.t,
      openFlows: this.getOpenFlows(),
      emittedEvents
    };
  }

  closeFlow(flow, closedAt, closure) {
    // e_i: completed relational event. It preserves process order and any
    // possibility/realization/result information observed during the flow.
    const event = Object.freeze({
      eventId: `e_${this.nextEventId++}`,
      flowId: flow.flowId,
      startedAt: flow.startedAt,
      closedAt,
      duration: closedAt - flow.startedAt,
      participants: [...flow.participants],
      relationalPath: [...flow.transitions],
      possibilitySnapshots: [...flow.possibilitySnapshots],
      realizations: [...flow.realizations],
      results: [...flow.results],
      closure: Object.freeze({ ...closure })
    });

    flow.status = 'closed';
    this.openFlows.delete(flow.flowId);
    this.history.append(event);
    return event;
  }

  step(measurement) {
    const M = this.ingestMeasurement(measurement);
    const O = this.observe(M);
    const flowState = this.updateFlow(O);
    return { M, O, ...flowState, history: this.history.all() };
  }

  getOpenFlows() {
    return [...this.openFlows.values()].map((f) => ({
      flowId: f.flowId,
      startedAt: f.startedAt,
      lastObservedAt: f.lastObservedAt,
      status: f.status,
      transitions: [...f.transitions],
      participants: [...f.participants],
      possibilitySnapshots: [...f.possibilitySnapshots],
      realizations: [...f.realizations],
      results: [...f.results]
    }));
  }
}
