import assert from 'node:assert/strict';
import {
  RelationalParticipationStateMachine,
  buildCurrentRelationGraph,
  reachableFrom
} from './oasis-relational-participation-v0.9.js';

function flow(flowId, roles, state = 'active', relationType = 'rel') {
  return { flowId, active: true, relationType, roles, state };
}

function mk() {
  return new RelationalParticipationStateMachine({
    selfId: 'self',
    participants: [
      { id: 'A', capabilities: ['act'] },
      { id: 'B', capabilities: ['recover'] },
      { id: 'C', capabilities: ['oversee'] },
      { id: 'D', capabilities: ['act', 'recover', 'oversee'] },
      { id: '여신', capabilities: ['act'] }
    ]
  });
}

// 1. Direct current relation creates current participation without a scripted demand.
{
  const sm = mk();
  const out = sm.ingest({ t: 1, activeFlows: [flow('f1', { actor: 'self', target: 'A' })] });
  assert.equal(out.participating.map(x => x.id).includes('A'), true);
}

// 2. Indirect current relation creates a candidate, not automatic participation.
{
  const sm = mk();
  const out = sm.ingest({ t: 1, activeFlows: [
    flow('f1', { actor: 'self', target: 'A' }),
    flow('f2', { actor: 'A', target: 'B' })
  ] });
  assert.equal(out.candidates.map(x => x.id).includes('B'), true);
  assert.equal(out.participating.map(x => x.id).includes('B'), false);
}

// 3. Responsibility rise expands participation only to currently reachable candidates.
{
  const sm = mk();
  const flows = [
    flow('f1', { actor: 'self', target: 'A' }),
    flow('f2', { actor: 'A', target: 'B' }),
    flow('f3', { actor: 'B', target: 'C' })
  ];
  sm.ingest({ t: 1, activeFlows: flows, responsibilityMovement: 'same' });
  const out = sm.ingest({ t: 2, activeFlows: flows, responsibilityMovement: 'rise' });
  assert.deepEqual(new Set(out.participating.map(x => x.id)), new Set(['A', 'B', 'C']));
}

// 4. Isolated participants are not admitted by responsibility rise alone.
{
  const sm = mk();
  const out = sm.ingest({
    t: 1,
    activeFlows: [flow('f1', { actor: 'self', target: 'A' })],
    responsibilityMovement: 'rise'
  });
  assert.equal(out.participating.map(x => x.id).includes('C'), false);
  assert.equal(out.participating.map(x => x.id).includes('D'), false);
}

// 5. Expanded participation persists while the relation remains current and responsibility is stable.
{
  const sm = mk();
  const flows = [flow('f1', { actor: 'self', target: 'A' }), flow('f2', { actor: 'A', target: 'B' })];
  sm.ingest({ t: 1, activeFlows: flows, responsibilityMovement: 'rise' });
  const out = sm.ingest({ t: 2, activeFlows: flows, responsibilityMovement: 'same' });
  assert.equal(out.participating.map(x => x.id).includes('B'), true);
}

// 6. Responsibility fall removes only expanded participation; direct participation remains.
{
  const sm = mk();
  const flows = [flow('f1', { actor: 'self', target: 'A' }), flow('f2', { actor: 'A', target: 'B' })];
  sm.ingest({ t: 1, activeFlows: flows, responsibilityMovement: 'rise' });
  const out = sm.ingest({ t: 2, activeFlows: flows, responsibilityMovement: 'fall' });
  assert.equal(out.participating.map(x => x.id).includes('A'), true);
  assert.equal(out.candidates.map(x => x.id).includes('B'), true);
}

// 7. Relation disconnection removes participation/candidacy regardless of elapsed time or name.
{
  const sm = mk();
  sm.ingest({ t: 1, activeFlows: [flow('f1', { actor: 'self', target: 'A' })] });
  const out = sm.ingest({ t: 999999999, activeFlows: [] });
  const a = out.participants.find(x => x.id === 'A');
  assert.equal(a.status, 'non-participating');
}

// 8. Participant name does not determine function.
{
  const sm = mk();
  const out = sm.ingest({ t: 1, activeFlows: [flow('f1', { actor: 'self', target: '여신' })] });
  const namedGoddess = out.participants.find(x => x.id === '여신');
  assert.deepEqual(namedGoddess.functionalAliases, ['companion-like']);
}

// 9. A healer-like capability can be participating without a scripted recovery-demand label.
{
  const sm = mk();
  const out = sm.ingest({ t: 1, activeFlows: [flow('f1', { actor: 'self', target: 'B' })] });
  const b = out.participants.find(x => x.id === 'B');
  assert.equal(b.status, 'participating');
  assert.deepEqual(b.functionalAliases, ['healer-like']);
}

// 10. A goddess-like capability can enter by relational reachability + responsibility expansion,
// not by an explicit oversight-demand flag.
{
  const sm = mk();
  const flows = [flow('f1', { actor: 'self', target: 'A' }), flow('f2', { actor: 'A', target: 'C' })];
  const before = sm.ingest({ t: 1, activeFlows: flows, responsibilityMovement: 'same' });
  assert.equal(before.candidates.map(x => x.id).includes('C'), true);
  const after = sm.ingest({ t: 2, activeFlows: flows, responsibilityMovement: 'rise' });
  const c = after.participants.find(x => x.id === 'C');
  assert.equal(c.status, 'participating');
  assert.deepEqual(c.functionalAliases, ['goddess-like']);
}

// 11. One participant may carry multiple functional capabilities without creating multiple entities.
{
  const sm = mk();
  const out = sm.ingest({ t: 1, activeFlows: [flow('f1', { actor: 'self', target: 'D' })] });
  const d = out.participants.find(x => x.id === 'D');
  assert.equal(d.status, 'participating');
  assert.deepEqual(d.functionalAliases, ['companion-like', 'healer-like', 'goddess-like']);
}

// 12. Direction/role bindings remain preserved as evidence even though connectivity uses the relation hyperedge.
{
  const sm = mk();
  const out = sm.ingest({
    t: 1,
    activeFlows: [flow('f1', { observer: 'self', observed: 'A' }, 'watching', 'observation')]
  });
  const a = out.participants.find(x => x.id === 'A');
  assert.deepEqual(a.relationEvidence[0].roles, { observer: 'self', observed: 'A' });
}

// 13. Multi-party relation is a hyperedge; all directly related known participants participate.
{
  const sm = mk();
  const out = sm.ingest({
    t: 1,
    activeFlows: [flow('f1', { actor: 'self', companions: ['A', 'B'] }, 'together', 'group-relation')]
  });
  assert.deepEqual(new Set(out.participating.map(x => x.id)), new Set(['A', 'B']));
}

// 14. Graph reachability has no fixed hop threshold.
{
  const { graph } = buildCurrentRelationGraph([
    flow('1', { a: 'self', b: 'A' }),
    flow('2', { a: 'A', b: 'x1' }),
    flow('3', { a: 'x1', b: 'x2' }),
    flow('4', { a: 'x2', b: 'x3' }),
    flow('5', { a: 'x3', b: 'C' })
  ]);
  assert.equal(reachableFrom(graph, 'self').has('C'), true);
}

console.log('oasis-relational-participation-v0.9: 14/14 tests passed');
