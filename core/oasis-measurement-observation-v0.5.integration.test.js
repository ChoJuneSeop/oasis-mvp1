import assert from 'node:assert/strict';
import { MeasurementObservationAdapter } from './oasis-measurement-observation-v0.5.js';
import { RelationalFlowTracker } from './oasis-relation-flow-v0.4.js';

const adapter = new MeasurementObservationAdapter();
const tracker = new RelationalFlowTracker();

function feed(t, value, uncertainty) {
  const relation = adapter.observeProximity({
    actor: 'A',
    target: 'B',
    measurement: { t, value, uncertainty }
  });
  return tracker.ingestObservation({ t, relations: [relation] });
}

// 1. Initial measurement is observationally indeterminate, not guessed.
{
  const out = feed(0, 10.0, 0.2);
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.activeFlows[0].state, 'indeterminate');
  assert.equal(out.activeFlows[0].path.length, 1);
  assert.equal(out.activeFlows[0].path[0].kind, 'emerged');
}

// 2. Sensor fluctuation inside uncertainty remains the same semantic state.
{
  const out = feed(1, 9.95, 0.2);
  assert.equal(out.activeFlows[0].state, 'indeterminate');
  assert.equal(out.activeFlows[0].path.length, 2);
  assert.equal(out.activeFlows[0].path[1].kind, 'continued');
}

// 3. Once measurement intervals are strictly ordered, approaching emerges as an ordered transition.
{
  const out = feed(2, 9.0, 0.2);
  assert.equal(out.activeFlows[0].state, 'approaching');
  assert.equal(out.activeFlows[0].path[2].kind, 'transitioned');
  assert.equal(out.activeFlows[0].path[2].fromState, 'indeterminate');
  assert.equal(out.activeFlows[0].path[2].toState, 'approaching');
}

// 4. Continued approaching evidence preserves one persistent flow rather than creating a new flow each tick.
{
  const out = feed(3, 8.0, 0.2);
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.activeFlows[0].state, 'approaching');
  assert.equal(out.activeFlows[0].generation, 1);
  assert.equal(out.activeFlows[0].path[3].kind, 'continued');
}

// 5. A clear reversal becomes a new ordered state transition inside that same flow.
{
  const out = feed(4, 9.0, 0.2);
  assert.equal(out.activeFlows[0].state, 'receding');
  assert.equal(out.activeFlows[0].generation, 1);
  assert.equal(out.activeFlows[0].path[4].kind, 'transitioned');
  assert.equal(out.activeFlows[0].path[4].fromState, 'approaching');
  assert.equal(out.activeFlows[0].path[4].toState, 'receding');
}

console.log('oasis M->O->f integration v0.5: 5/5 tests passed');
