// OASIS responsibility-cycle experience segmenter v0.7
// Scope: responsibility dynamics rho_t -> experiential cycle boundary -> e_i candidate.
//
// Core idea:
// - rho is not a scalar risk/reward score.
// - rho is represented as an ordered resource-allocation state.
// - an experience boundary is confirmed when responsibility, after having risen,
//   later descends to a relative trough and then rises again.
// - the trough is the boundary time; the later rise only confirms it retrospectively.
// - no absolute "low" threshold, timeout, reward, task goal, or relation cessation is required.

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function assertRho(rho) {
  if (!rho || typeof rho !== 'object' || Array.isArray(rho)) {
    throw new Error('rho must be a component object');
  }
  const keys = Object.keys(rho);
  if (keys.length === 0) throw new Error('rho must contain at least one component');
  for (const key of keys) {
    if (!Number.isFinite(rho[key]) || rho[key] < 0) {
      throw new Error(`rho.${key} must be a finite non-negative number`);
    }
  }
}

export function compareResponsibility(previous, current) {
  assertRho(previous);
  assertRho(current);

  const keysA = Object.keys(previous).sort();
  const keysB = Object.keys(current).sort();
  if (keysA.length !== keysB.length || keysA.some((k, i) => k !== keysB[i])) {
    throw new Error('rho component sets must match');
  }

  let anyUp = false;
  let anyDown = false;
  for (const key of keysA) {
    if (current[key] > previous[key]) anyUp = true;
    if (current[key] < previous[key]) anyDown = true;
  }

  if (!anyUp && !anyDown) return 'same';
  if (anyUp && !anyDown) return 'rise';
  if (!anyUp && anyDown) return 'fall';
  return 'incomparable';
}

function makeSample({ t, rho, context }) {
  assertRho(rho);
  if (!Number.isFinite(t)) throw new Error('t must be finite');
  return Object.freeze({ t, rho: Object.freeze({ ...rho }), context: clone(context) });
}

export class ResponsibilityCycleSegmenter {
  constructor() {
    this.previous = null;
    this.currentCycle = null;
    this.events = [];
    this.nextEventId = 1;
  }

  ingest(input) {
    const sample = makeSample(input);
    const emittedEvents = [];

    if (!this.previous) {
      this.previous = sample;
      return this.snapshot('initial', emittedEvents);
    }

    const movement = compareResponsibility(this.previous.rho, sample.rho);

    if (!this.currentCycle) {
      if (movement === 'rise') {
        this.currentCycle = {
          startedAt: sample.t,
          triggerFrom: this.previous,
          samples: [sample],
          phase: 'rising',
          trough: null
        };
      }
      this.previous = sample;
      return this.snapshot(movement, emittedEvents);
    }

    if (movement === 'rise' && (this.currentCycle.phase === 'descending' || this.currentCycle.phase === 'trough')) {
      const boundary = this.currentCycle.trough ?? this.previous;
      const event = Object.freeze({
        eventId: `e_${this.nextEventId++}`,
        kind: 'responsibility-cycle',
        startedAt: this.currentCycle.startedAt,
        closedAt: boundary.t,
        boundaryConfirmedAt: sample.t,
        triggerFrom: clone(this.currentCycle.triggerFrom),
        responsibilityPath: Object.freeze(this.currentCycle.samples.map(clone)),
        trough: clone(boundary),
        closure: Object.freeze({
          kind: 'relative-trough-followed-by-renewed-rise',
          retrospective: true
        })
      });
      this.events.push(event);
      emittedEvents.push(event);

      this.currentCycle = {
        startedAt: sample.t,
        triggerFrom: this.previous,
        samples: [sample],
        phase: 'rising',
        trough: null
      };

      this.previous = sample;
      return this.snapshot(movement, emittedEvents);
    }

    this.currentCycle.samples.push(sample);

    if (movement === 'fall') {
      this.currentCycle.phase = 'descending';
      this.currentCycle.trough = sample;
    } else if (movement === 'same' && (this.currentCycle.phase === 'descending' || this.currentCycle.phase === 'trough')) {
      this.currentCycle.phase = 'trough';
      this.currentCycle.trough = sample;
    } else if (movement === 'rise') {
      this.currentCycle.phase = 'rising';
      this.currentCycle.trough = null;
    }

    this.previous = sample;
    return this.snapshot(movement, emittedEvents);
  }

  snapshot(movement, emittedEvents) {
    return {
      movement,
      emittedEvents,
      history: [...this.events],
      currentCycle: this.currentCycle ? {
        startedAt: this.currentCycle.startedAt,
        phase: this.currentCycle.phase,
        troughAt: this.currentCycle.trough?.t ?? null,
        samples: [...this.currentCycle.samples]
      } : null
    };
  }
}
