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
  return tracker.update({ t, relations: [relation] });
}

// 1. Initial measurement is observationally indeterminate, not guessed.
{
  const out = feed(0, 10.0, 0.2);
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.activeFlows[0].currentState, 'indeterminate');
}

// 2. Sensor fluctuation inside uncertainty remains the same semantic state.
{
  const out = feed(1, 9.95, 0.2);
  assert.equal(out.activeFlows[0].currentState, 'indeterminate');
  assert.equal(out.activeFlows[0].transitions.length, 1);
}

// 3. Once measurement intervals are strictly ordered, approaching emerges.
{
  const out = feed(2, 9.0, 0.2);
  assert.equal(out.activeFlows[0].currentState, 'approaching');
  assert.deepEqual(out.activeFlows[0].transitions.map(x => x.state), ['indeterminate', 'approaching']);
}

// 4. Continued approaching evidence preserves one persistent flow rather than creating a new flow each tick.
{
  const out = feed(3, 8.0, 0.2);
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.activeFlows[0].currentState, 'approaching');
  assert.equal(out.activeFlows[0].transitions.length, 2);
}

// 5. A clear reversal becomes a new ordered state transition inside that flow.
{
  const out = feed(4, 9.0, 0.2);
  assert.equal(out.activeFlows[0].currentState, 'receding');
  assert.deepEqual(out.activeFlows[0].transitions.map(x => x.state), ['indeterminate', 'approaching', 'receding']);
}

console.log('oasis M->O->f integration v0.5: 5/5 tests passed');
