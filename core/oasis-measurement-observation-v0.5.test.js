import assert from 'node:assert/strict';
import {
  intervalFromMeasurement,
  compareIntervals,
  relationStateFromScalarTrend,
  pairwiseDistanceMeasurement,
  MeasurementObservationAdapter
} from './oasis-measurement-observation-v0.5.js';

// 1. Uncertainty is supplied by the measurement interface, not invented internally.
{
  const i = intervalFromMeasurement({ value: 10, uncertainty: 0.5 });
  assert.deepEqual(i, { lower: 9.5, upper: 10.5, source: 'uncertainty' });
}

// 2. Missing uncertainty does not silently become an arbitrary tolerance.
{
  assert.equal(intervalFromMeasurement({ value: 10 }), null);
}

// 3. Exact measurements are only exact when explicitly declared.
{
  const i = intervalFromMeasurement({ value: 3, exact: true });
  assert.deepEqual(i, { lower: 3, upper: 3, source: 'exact' });
}

// 4. Strictly separated intervals establish a qualitative decrease.
{
  assert.equal(
    compareIntervals({ lower: 9, upper: 10 }, { lower: 7, upper: 8 }),
    'decreasing'
  );
}

// 5. Overlapping uncertainty stays indeterminate rather than forcing a semantic state.
{
  assert.equal(
    compareIntervals({ lower: 9, upper: 11 }, { lower: 10, upper: 12 }),
    'indeterminate'
  );
}

// 6. Distance decrease maps transparently to approaching while preserving evidence.
{
  const r = relationStateFromScalarTrend({
    relationType: 'proximity-change',
    roles: { actor: 'A', target: 'B' },
    previousMeasurement: { value: 10, uncertainty: 0.2 },
    currentMeasurement: { value: 8, uncertainty: 0.2 },
    decreasingState: 'approaching',
    increasingState: 'receding'
  });
  assert.equal(r.state, 'approaching');
  assert.equal(r.evidence.trend, 'decreasing');
  assert.deepEqual(r.roles, { actor: 'A', target: 'B' });
}

// 7. Small numeric changes inside measurement uncertainty do not become a false relation transition.
{
  const adapter = new MeasurementObservationAdapter();
  const a = adapter.observeProximity({
    actor: 'A', target: 'B', measurement: { value: 10.0, uncertainty: 0.2 }
  });
  const b = adapter.observeProximity({
    actor: 'A', target: 'B', measurement: { value: 9.95, uncertainty: 0.2 }
  });
  assert.equal(a.state, 'indeterminate');
  assert.equal(b.state, 'indeterminate');
}

// 8. Large change is not enough by itself; it must exceed uncertainty by interval ordering.
{
  const adapter = new MeasurementObservationAdapter();
  adapter.observeProximity({
    actor: 'A', target: 'B', measurement: { value: 10, uncertainty: 5 }
  });
  const out = adapter.observeProximity({
    actor: 'A', target: 'B', measurement: { value: 7, uncertainty: 5 }
  });
  assert.equal(out.state, 'indeterminate');
}

// 9. Directional roles remain directional.
{
  const adapter = new MeasurementObservationAdapter();
  adapter.observeProximity({ actor: 'A', target: 'B', measurement: { value: 10, exact: true } });
  const ab = adapter.observeProximity({ actor: 'A', target: 'B', measurement: { value: 9, exact: true } });
  const ba = adapter.observeProximity({ actor: 'B', target: 'A', measurement: { value: 9, exact: true } });
  assert.equal(ab.state, 'approaching');
  assert.equal(ba.state, 'indeterminate');
}

// 10. Pairwise distance preserves raw geometric measurement separately from semantics.
{
  const m = pairwiseDistanceMeasurement({
    t: 1,
    actor: 'A',
    target: 'B',
    positions: { A: { x: 0, y: 0 }, B: { x: 3, y: 4 } },
    uncertaintyByEntity: { A: 0.1, B: 0.2 }
  });
  assert.equal(m.value, 5);
  assert.equal(m.uncertainty, 0.30000000000000004);
  assert.equal(m.metric, 'euclidean-distance');
}

// 11. No uncertainty means no inferred interval and therefore no forced trend.
{
  const adapter = new MeasurementObservationAdapter();
  adapter.observeProximity({ actor: 'A', target: 'B', measurement: { value: 10 } });
  const out = adapter.observeProximity({ actor: 'A', target: 'B', measurement: { value: 8 } });
  assert.equal(out.state, 'indeterminate');
}

// 12. No reward, task success, future state, or historical answer is required by the adapter API.
{
  const adapter = new MeasurementObservationAdapter();
  const out = adapter.observeProximity({
    actor: 'X', target: 'fire', measurement: { value: 2, exact: true }
  });
  assert.deepEqual(Object.keys(out).sort(), ['evidence', 'present', 'relationType', 'roles', 'state']);
}

console.log('oasis-measurement-observation-v0.5: 12/12 tests passed');
