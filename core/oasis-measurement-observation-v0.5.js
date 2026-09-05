// OASIS measurement -> observation adapter v0.5
// Scope: M_t -> O_t relational representation only.
// Goal: derive qualitative relational observations from raw measurements
// without OASIS reward/preference, future information, fixed recent-N windows,
// or arbitrary semantic thresholds inside the OASIS core.

function assertFiniteNumber(x, name) {
  if (!Number.isFinite(x)) throw new Error(`${name} must be a finite number`);
}

export function intervalFromMeasurement(m) {
  // Measurement uncertainty must come from the measurement/perception interface.
  // The adapter does not invent a tolerance.
  if (!m || typeof m !== 'object') throw new Error('measurement object required');
  assertFiniteNumber(m.value, 'measurement.value');

  if (Number.isFinite(m.lower) && Number.isFinite(m.upper)) {
    if (m.lower > m.upper) throw new Error('measurement.lower must be <= measurement.upper');
    return Object.freeze({ lower: m.lower, upper: m.upper, source: 'bounds' });
  }

  if (Number.isFinite(m.uncertainty)) {
    if (m.uncertainty < 0) throw new Error('measurement.uncertainty must be >= 0');
    return Object.freeze({
      lower: m.value - m.uncertainty,
      upper: m.value + m.uncertainty,
      source: 'uncertainty'
    });
  }

  // Exact measurements are allowed when the interface genuinely supplies them.
  // This is not treated as zero-noise estimation by the adapter; it is an explicit input contract.
  if (m.exact === true) {
    return Object.freeze({ lower: m.value, upper: m.value, source: 'exact' });
  }

  return null;
}

export function compareIntervals(previous, current) {
  // Strict interval ordering only. No epsilon/threshold is introduced here.
  if (!previous || !current) return 'indeterminate';
  if (current.upper < previous.lower) return 'decreasing';
  if (current.lower > previous.upper) return 'increasing';
  return 'indeterminate';
}

export function relationStateFromScalarTrend({
  relationType,
  roles,
  previousMeasurement,
  currentMeasurement,
  decreasingState,
  increasingState,
  indeterminateState = 'indeterminate'
}) {
  const prev = intervalFromMeasurement(previousMeasurement);
  const curr = intervalFromMeasurement(currentMeasurement);
  const trend = compareIntervals(prev, curr);

  let state = indeterminateState;
  if (trend === 'decreasing') state = decreasingState;
  if (trend === 'increasing') state = increasingState;

  return Object.freeze({
    relationType,
    roles: Object.freeze({ ...roles }),
    state,
    present: true,
    evidence: Object.freeze({
      previous: previousMeasurement,
      current: currentMeasurement,
      previousInterval: prev,
      currentInterval: curr,
      trend
    })
  });
}

export function pairwiseDistanceMeasurement({ t, actor, target, positions, uncertaintyByEntity = {} }) {
  const a = positions?.[actor];
  const b = positions?.[target];
  if (!a || !b) return null;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const value = Math.hypot(dx, dy);

  // Position uncertainty propagation is deliberately conservative and supplied
  // from interface uncertainty, not a hand-tuned semantic threshold.
  // If uncertainty is unavailable, return a measurement without inferred bounds.
  const ua = uncertaintyByEntity?.[actor];
  const ub = uncertaintyByEntity?.[target];
  let uncertainty;
  if (Number.isFinite(ua) && Number.isFinite(ub) && ua >= 0 && ub >= 0) {
    uncertainty = ua + ub;
  }

  return Object.freeze({
    t,
    value,
    ...(Number.isFinite(uncertainty) ? { uncertainty } : {}),
    metric: 'euclidean-distance',
    participants: Object.freeze({ actor, target })
  });
}

export class MeasurementObservationAdapter {
  constructor() {
    this.previousByRelation = new Map();
  }

  key(relationType, roles) {
    const entries = Object.entries(roles ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return `${relationType}|${entries.map(([k, v]) => `${k}=${String(v)}`).join('|')}`;
  }

  observeScalarRelation({
    relationType,
    roles,
    measurement,
    decreasingState,
    increasingState,
    indeterminateState = 'indeterminate'
  }) {
    const key = this.key(relationType, roles);
    const previousMeasurement = this.previousByRelation.get(key);
    this.previousByRelation.set(key, measurement);

    if (!previousMeasurement) {
      return Object.freeze({
        relationType,
        roles: Object.freeze({ ...roles }),
        state: indeterminateState,
        present: true,
        evidence: Object.freeze({
          previous: null,
          current: measurement,
          previousInterval: null,
          currentInterval: intervalFromMeasurement(measurement),
          trend: 'indeterminate'
        })
      });
    }

    return relationStateFromScalarTrend({
      relationType,
      roles,
      previousMeasurement,
      currentMeasurement: measurement,
      decreasingState,
      increasingState,
      indeterminateState
    });
  }

  observeProximity({ actor, target, measurement }) {
    // Semantic mapping is minimal and transparent:
    // decreasing distance -> approaching; increasing distance -> receding.
    // Overlapping uncertainty -> indeterminate.
    return this.observeScalarRelation({
      relationType: 'proximity-change',
      roles: { actor, target },
      measurement,
      decreasingState: 'approaching',
      increasingState: 'receding',
      indeterminateState: 'indeterminate'
    });
  }
}
