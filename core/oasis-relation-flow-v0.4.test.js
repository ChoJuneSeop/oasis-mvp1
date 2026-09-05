import assert from 'node:assert/strict';
import { RelationalFlowTracker, relationKey } from './oasis-relation-flow-v0.4.js';

const obs = (t, relations = []) => ({ t, relations });
const r = (relationType, roles, state, evidence) => ({ relationType, roles, state, evidence });
const absent = (relationType, roles, evidence) => ({ relationType, roles, present: false, evidence });

// 1. Relation identity preserves direction/roles.
{
  const ab = relationKey(r('proximity', { actor: 'A', target: 'B' }, 'approaching'));
  const ba = relationKey(r('proximity', { actor: 'B', target: 'A' }, 'approaching'));
  assert.notEqual(ab, ba);
}

// 2. Object key order does not create a false new relation.
{
  const a = relationKey(r('proximity', { actor: 'A', target: 'B' }, 'approaching'));
  const b = relationKey(r('proximity', { target: 'B', actor: 'A' }, 'approaching'));
  assert.equal(a, b);
}

// 3. First observation creates an emerged relational flow.
{
  const t = new RelationalFlowTracker();
  const out = t.ingestObservation(obs(1, [r('proximity', { actor: 'A', target: 'B' }, 'approaching')]));
  assert.equal(out.transitions[0].kind, 'emerged');
  assert.equal(out.activeFlows.length, 1);
}

// 4. Numeric evidence can fluctuate without becoming a semantic relation transition.
{
  const t = new RelationalFlowTracker();
  t.ingestObservation(obs(0, [r('proximity', { actor: 'A', target: 'B' }, 'approaching', { distance: 10.001 })]));
  const out = t.ingestObservation(obs(1, [r('proximity', { actor: 'A', target: 'B' }, 'approaching', { distance: 9.998 })]));
  assert.equal(out.transitions[0].kind, 'continued');
  assert.equal(out.transitions[0].toState, 'approaching');
}

// 5. A semantic relation-state change remains in the same flow and preserves order.
{
  const t = new RelationalFlowTracker();
  const first = t.ingestObservation(obs(0, [r('proximity', { actor: 'A', target: 'B' }, 'approaching')]));
  const id = first.activeFlows[0].flowId;
  const out = t.ingestObservation(obs(1, [r('proximity', { actor: 'A', target: 'B' }, 'contact')]));
  assert.equal(out.transitions[0].kind, 'transitioned');
  assert.equal(out.transitions[0].flowId, id);
  assert.deepEqual(out.activeFlows[0].path.map(x => x.toState), ['approaching', 'contact']);
}

// 6. Elapsed time alone does not terminate an observed relation.
{
  const t = new RelationalFlowTracker();
  t.ingestObservation(obs(0, [r('attention', { observer: 'X', target: 'fire' }, 'watching')]));
  const out = t.ingestObservation(obs(1_000_000, [r('attention', { observer: 'X', target: 'fire' }, 'watching')]));
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.endedFlows.length, 0);
}

// 7. Missing from an observation means unknown/unobserved, not relational cessation.
{
  const t = new RelationalFlowTracker();
  t.ingestObservation(obs(0, [r('attention', { observer: 'X', target: 'fire' }, 'watching')]));
  const out = t.ingestObservation(obs(1, []));
  assert.equal(out.activeFlows.length, 1);
  assert.equal(out.transitions.length, 0);
}

// 8. Explicitly observed absence ends the relational flow without a timeout.
{
  const t = new RelationalFlowTracker();
  t.ingestObservation(obs(0, [r('contact', { actor: 'A', target: 'B' }, 'touching')]));
  const out = t.ingestObservation(obs(1, [absent('contact', { actor: 'A', target: 'B' })]));
  assert.equal(out.transitions[0].kind, 'ceased');
  assert.equal(out.activeFlows.length, 0);
  assert.equal(out.endedFlows.length, 1);
}

// 9. Reappearance after explicit cessation creates a new flow generation.
{
  const t = new RelationalFlowTracker();
  const first = t.ingestObservation(obs(0, [r('contact', { actor: 'A', target: 'B' }, 'touching')]));
  const firstId = first.activeFlows[0].flowId;
  t.ingestObservation(obs(1, [absent('contact', { actor: 'A', target: 'B' })]));
  const again = t.ingestObservation(obs(2, [r('contact', { actor: 'A', target: 'B' }, 'touching')]));
  assert.notEqual(again.activeFlows[0].flowId, firstId);
  assert.equal(again.activeFlows[0].generation, 2);
}

// 10. Concurrent relations evolve independently.
{
  const t = new RelationalFlowTracker();
  t.ingestObservation(obs(0, [
    r('proximity', { actor: 'A', target: 'B' }, 'approaching'),
    r('attention', { observer: 'X', target: 'fire' }, 'watching')
  ]));
  const out = t.ingestObservation(obs(1, [
    r('proximity', { actor: 'A', target: 'B' }, 'contact'),
    r('attention', { observer: 'X', target: 'fire' }, 'watching')
  ]));
  assert.deepEqual(out.transitions.map(x => x.kind).sort(), ['continued', 'transitioned']);
  assert.equal(out.activeFlows.length, 2);
}

console.log('oasis-relation-flow-v0.4: 10/10 tests passed');
