import assert from 'node:assert/strict';
import { RelationalFlowTracker } from './oasis-relation-flow-v0.4.js';
import {
  OrderedExperienceHistory,
  completedEventFromEndedFlow,
  isStructurallyClosedRelationalFlow
} from './oasis-relational-closure-v0.6.js';

function rel({ relationType = 'interaction', actor = 'A', target = 'B', state, present = true, evidence }) {
  return {
    relationType,
    roles: { actor, target },
    present,
    ...(present ? { state } : {}),
    ...(evidence ? { evidence } : {})
  };
}

function ingest(tracker, history, t, relations) {
  const tracked = tracker.ingestObservation({ t, relations });
  const completed = history.ingestTrackerOutput(tracked);
  return { tracked, completed };
}

// 1. Emergence alone is open, not a completed experience.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  const out = ingest(tracker, history, 1, [rel({ state: 'engaged' })]);
  assert.equal(out.completed.emittedEvents.length, 0);
  assert.equal(out.completed.history.length, 0);
}

// 2. Continuing or transitioning relation states remain in the same open lifecycle.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ state: 'approaching' })]);
  ingest(tracker, history, 2, [rel({ state: 'contact' })]);
  const out = ingest(tracker, history, 3, [rel({ state: 'receding' })]);
  assert.equal(out.completed.history.length, 0);
  assert.equal(out.tracked.activeFlows.length, 1);
  assert.deepEqual(out.tracked.activeFlows[0].path.map(x => x.kind), ['emerged', 'transitioned', 'transitioned']);
}

// 3. Time alone never creates a completed event.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 0, [rel({ state: 'ongoing' })]);
  const out = ingest(tracker, history, 1_000_000_000, []);
  assert.equal(out.completed.history.length, 0);
  assert.equal(out.tracked.activeFlows.length, 1);
}

// 4. Missing observation is unknown, not closure.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ state: 'ongoing' })]);
  const out = ingest(tracker, history, 2, []);
  assert.equal(out.tracked.endedFlows.length, 0);
  assert.equal(out.completed.history.length, 0);
}

// 5. Explicitly observed cessation closes the minimal relational event.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ state: 'approaching' })]);
  ingest(tracker, history, 2, [rel({ state: 'contact' })]);
  const out = ingest(tracker, history, 3, [rel({ present: false, evidence: { source: 'direct-observation' } })]);

  assert.equal(out.tracked.endedFlows.length, 1);
  assert.equal(out.completed.emittedEvents.length, 1);
  assert.equal(out.completed.history.length, 1);
  assert.deepEqual(out.completed.history[0].relationalPath.map(x => x.kind), ['emerged', 'transitioned', 'ceased']);
  assert.equal(out.completed.history[0].closure.kind, 'explicit-relational-cessation');
}

// 6. The event preserves directional roles; A->B is not rewritten as B->A.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ actor: 'A', target: 'B', state: 'engaged' })]);
  const out = ingest(tracker, history, 2, [rel({ actor: 'A', target: 'B', present: false })]);
  assert.deepEqual(out.completed.history[0].roles, { actor: 'A', target: 'B' });
}

// 7. A second generation of the same relation becomes a distinct completed event.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ state: 'engaged' })]);
  ingest(tracker, history, 2, [rel({ present: false })]);
  ingest(tracker, history, 3, [rel({ state: 'engaged-again' })]);
  const out = ingest(tracker, history, 4, [rel({ present: false })]);

  assert.equal(out.completed.history.length, 2);
  assert.notEqual(out.completed.history[0].sourceFlowId, out.completed.history[1].sourceFlowId);
  assert.deepEqual(out.completed.history.map(e => e.generation), [1, 2]);
}

// 8. Re-ingesting the same ended flow cannot duplicate history.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [rel({ state: 'engaged' })]);
  const tracked = tracker.ingestObservation({ t: 2, relations: [rel({ present: false })] });
  const first = history.ingestTrackerOutput(tracked);
  const second = history.ingestTrackerOutput(tracked);
  assert.equal(first.emittedEvents.length, 1);
  assert.equal(second.emittedEvents.length, 0);
  assert.equal(second.history.length, 1);
}

// 9. Concurrent relations close independently and preserve completion order.
{
  const tracker = new RelationalFlowTracker();
  const history = new OrderedExperienceHistory();
  ingest(tracker, history, 1, [
    rel({ actor: 'A', target: 'B', state: 'engaged' }),
    rel({ actor: 'X', target: 'Y', state: 'engaged' })
  ]);
  ingest(tracker, history, 2, [rel({ actor: 'X', target: 'Y', present: false })]);
  const out = ingest(tracker, history, 3, [rel({ actor: 'A', target: 'B', present: false })]);

  assert.deepEqual(out.completed.history.map(e => e.roles.actor), ['X', 'A']);
}

// 10. A malformed flow without emerged->...->ceased structure is rejected as completed experience.
{
  const malformed = {
    flowId: 'bad', relationKey: 'bad', relationType: 'x', roles: { actor: 'A', target: 'B' },
    generation: 1, active: false, startedAt: 1, endedAt: 2, duration: 1,
    path: [{ kind: 'transitioned' }, { kind: 'ceased' }]
  };
  assert.equal(isStructurallyClosedRelationalFlow(malformed), false);
  assert.throws(() => completedEventFromEndedFlow(malformed));
}

console.log('oasis-relational-closure-v0.6: 10/10 tests passed');
