import assert from 'node:assert/strict';
import { OasisFlowCore } from './oasis-flow-core-v0.3.js';

function makeCore() {
  return new OasisFlowCore({
    relationExtractor: (O) => O.meta.transitions ?? [],
    // Test-only closure signal: closure is caused by relational completion
    // supplied by the environment adapter, never by elapsed time.
    closureDetector: (_flow, _O, tr) => tr.relationallyClosed
      ? { closed: true, reason: tr.closureReason ?? 'relational-closure' }
      : { closed: false }
  });
}

function step(core, t, transitions = [], values = {}) {
  return core.step({ t, values, meta: { transitions } });
}

// 1. Measurement and observation remain distinct layers.
{
  const core = makeCore();
  const out = step(core, 0, [], { temperature: 21 });
  assert.equal(out.M.values.temperature, 21);
  assert.equal(out.O.values.temperature, 21);
  assert.notEqual(out.M, out.O);
}

// 2. A flow remains open for arbitrarily long elapsed time if the relation continues.
{
  const core = makeCore();
  step(core, 0, [{ flowId: 'A-B', relation: 'approaching', participants: ['A', 'B'] }]);
  step(core, 10_000, [{ flowId: 'A-B', relation: 'approaching', participants: ['A', 'B'] }]);
  const out = step(core, 1_000_000, [{ flowId: 'A-B', relation: 'approaching', participants: ['A', 'B'] }]);
  assert.equal(out.openFlows.length, 1);
  assert.equal(out.emittedEvents.length, 0);
  assert.equal(out.openFlows[0].startedAt, 0);
  assert.equal(out.openFlows[0].lastObservedAt, 1_000_000);
}

// 3. Time alone never closes a flow.
{
  const core = makeCore();
  step(core, 0, [{ flowId: 'fire-X', relation: 'observing', participants: ['X', 'fire'] }]);
  const out = step(core, 99_999_999, []);
  assert.equal(out.history.length, 0);
  assert.equal(out.openFlows.length, 1);
}

// 4. Relational closure emits one completed event into ordered history.
{
  const core = makeCore();
  step(core, 1, [{ flowId: 'A-B', relation: 'approach', participants: ['A', 'B'] }]);
  step(core, 2, [{
    flowId: 'A-B',
    relation: 'contact',
    participants: ['A', 'B'],
    possibilitySnapshot: { C: ['continue', 'withdraw'], P: [0.6, 0.4] },
    realization: { cStar: 'withdraw' }
  }]);
  const out = step(core, 3, [{
    flowId: 'A-B',
    relation: 'separated',
    participants: ['A', 'B'],
    result: { state: 'distance-restored' },
    relationallyClosed: true,
    closureReason: 'interaction-resolved'
  }]);

  assert.equal(out.emittedEvents.length, 1);
  assert.equal(out.history.length, 1);
  assert.deepEqual(out.history[0].relationalPath.map(x => x.relation), ['approach', 'contact', 'separated']);
  assert.equal(out.history[0].realizations[0].cStar, 'withdraw');
  assert.equal(out.history[0].results[0].state, 'distance-restored');
  assert.equal(out.openFlows.length, 0);
}

// 5. Ordered history preserves completion order and does not collapse events into a set.
{
  const core = makeCore();
  step(core, 1, [{ flowId: 'first', relation: 'start' }]);
  step(core, 2, [{ flowId: 'first', relation: 'finish', relationallyClosed: true }]);
  step(core, 3, [{ flowId: 'second', relation: 'start' }]);
  const out = step(core, 4, [{ flowId: 'second', relation: 'finish', relationallyClosed: true }]);
  assert.deepEqual(out.history.map(e => e.flowId), ['first', 'second']);
}

// 6. Multiple relational processes can coexist inside the same broader reality flow.
{
  const core = makeCore();
  step(core, 1, [
    { flowId: 'A-B', relation: 'approach', participants: ['A', 'B'] },
    { flowId: 'X-Y', relation: 'observe', participants: ['X', 'Y'] }
  ]);
  const out = step(core, 2, [
    { flowId: 'A-B', relation: 'separate', relationallyClosed: true, participants: ['A', 'B'] },
    { flowId: 'X-Y', relation: 'observe', participants: ['X', 'Y'] }
  ]);
  assert.equal(out.emittedEvents.length, 1);
  assert.equal(out.openFlows.length, 1);
  assert.equal(out.openFlows[0].flowId, 'X-Y');
}

// 7. Closing one event does not terminate unrelated open flows.
{
  const core = makeCore();
  step(core, 0, [
    { flowId: 'long', relation: 'ongoing' },
    { flowId: 'short', relation: 'start' }
  ]);
  const out = step(core, 1, [
    { flowId: 'long', relation: 'ongoing' },
    { flowId: 'short', relation: 'resolved', relationallyClosed: true }
  ]);
  assert.deepEqual(out.openFlows.map(f => f.flowId), ['long']);
  assert.deepEqual(out.history.map(e => e.flowId), ['short']);
}

// 8. A completed event preserves its own duration, but duration is descriptive, not a closure rule.
{
  const core = makeCore();
  step(core, 10, [{ flowId: 'duration-test', relation: 'start' }]);
  const out = step(core, 42, [{ flowId: 'duration-test', relation: 'resolved', relationallyClosed: true }]);
  assert.equal(out.history[0].duration, 32);
}

console.log('oasis-flow-core-v0.3: 8/8 tests passed');
