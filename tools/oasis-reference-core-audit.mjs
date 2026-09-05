import assert from 'node:assert/strict';
import { createOASIS } from '../src/oasis-reference-core.mjs';

function event(id, extra = {}) {
  return { id, ...extra };
}

// Assigned responsibility must not count as already resolved.
{
  const o = createOASIS({ invariants: [] });
  o.observe(event('responsibility-not-auto-resolved', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', obligations: ['repair:B'] }],
    affordances: [{ id: 'leave', actor: 'A', action: 'leave', target: 'B', obligations: ['repair:B'] }]
  }));
  const d = o.deliberate();
  assert.equal(d.responsibility.unresolved.includes('repair:B'), true);
  assert.deepEqual(d.responsibility.assigned['repair:B'], ['A']);
}

// An actually resolving action can dominate an otherwise unresolved possibility.
{
  const o = createOASIS({ invariants: [] });
  o.observe(event('responsibility-resolution', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', obligations: ['repair:B'] }],
    affordances: [
      { id: 'leave', actor: 'A', action: 'leave', target: 'B', obligations: ['repair:B'] },
      { id: 'repair', actor: 'A', action: 'repair', target: 'B', resolves: ['repair:B'] }
    ]
  }));
  const d = o.deliberate();
  assert.notEqual(d.choice.steps[0].id, 'leave');
  assert.equal(d.responsibility.unresolved.length, 0);
}

// A current fact/participant change must anchor the present even without a newly added relation edge.
{
  const o = createOASIS({ invariants: [] });
  o.observe(event('stale-options', {
    entities: ['A', 'Z'],
    participants: [{ id: 'OASIS', capabilities: ['act'] }],
    affordances: [
      { id: 'act-A', actor: 'OASIS', action: 'act', target: 'A' },
      { id: 'act-Z', actor: 'OASIS', action: 'act', target: 'Z' }
    ]
  }));
  o.observe(event('fact-change-A', {
    facts: [{ id: 'fact:A:changed', entities: ['A'], value: 'changed' }]
  }));
  const d = o.deliberate();
  assert.equal(d.currentFlowAnchoringUsed, true);
  assert.equal(d.choice.steps[0].target, 'A');
}

// Past action re-participation requires current ability and current relational participation.
{
  const o = createOASIS({ invariants: [] });
  o.observe(event('past-action', {
    entities: ['OASIS', 'A'],
    participants: [{ id: 'OASIS', capabilities: ['observe'] }],
    relations: [{ id: 'oa', from: 'OASIS', to: 'A', kind: 'observes' }],
    affordances: [{ id: 'observe-A-once', actor: 'OASIS', action: 'observe', target: 'A' }]
  }));
  const d1 = o.deliberate();
  o.actualize(d1.choice.id, event('past-action-result', {
    entities: ['A'],
    relations: [{ id: 'ao-result', from: 'A', to: 'OASIS', kind: 'became-known' }],
    affordances: [{ id: 'observe-A-once', op: 'remove' }]
  }));

  o.observe(event('current-return', {
    entities: ['A'],
    participants: [{ id: 'OASIS', capabilities: ['observe'] }]
  }));
  const d2 = o.deliberate();
  assert.equal(d2.field.reactivatedExperienceIds.includes('experience:0'), true);
  assert.equal(d2.possibilities.some(p => p.kind === 'reactivated-experience-template'), true);
}

// If current capability is absent, historical action must not be replayed merely because memory exists.
{
  const o = createOASIS({ invariants: [] });
  o.observe(event('past-capability', {
    entities: ['OASIS', 'A'],
    participants: [{ id: 'OASIS', capabilities: ['observe'] }],
    relations: [{ id: 'cap-rel', from: 'OASIS', to: 'A', kind: 'observes' }],
    affordances: [{ id: 'observe-cap', actor: 'OASIS', action: 'observe', target: 'A' }]
  }));
  const d1 = o.deliberate();
  o.actualize(d1.choice.id, event('past-capability-result', {
    entities: ['A'],
    affordances: [{ id: 'observe-cap', op: 'remove' }]
  }));
  o.observe(event('capability-lost', {
    entities: ['A'],
    participants: [{ id: 'OASIS', capabilities: [] }]
  }));
  const d2 = o.deliberate();
  assert.equal(d2.field.reactivatedExperienceIds.includes('experience:0'), true);
  assert.equal(d2.possibilities.some(p => p.kind === 'reactivated-experience-template'), false);
}

// Explicit invariant remains non-tradeable.
{
  const o = createOASIS();
  o.observe(event('invariant', {
    entities: ['A', 'B'],
    participants: [{ id: 'A' }],
    affordances: [{ id: 'fatal', actor: 'A', action: 'fatal', target: 'B', violates: ['irreversible-loss-of-life'] }]
  }));
  const d = o.deliberate();
  assert.equal(d.choice, null);
  assert.equal(d.continuationRequired, true);
}

// No automatic baseline injection is allowed inside the core.
{
  const o = createOASIS();
  o.observe(event('no-action', { entities: ['A'] }));
  const d = o.deliberate();
  assert.equal(d.choice, null);
  assert.equal(d.continuationRequired, true);
  assert.equal(o.exportState().closedExperiences.length, 0);
}

const fs = await import('node:fs/promises');
const source = [
  '../src/oasis-core.mjs',
  '../src/oasis-integrated-core.mjs',
  '../src/oasis-reference-core.mjs'
].map(p => new URL(p, import.meta.url));
const joined = (await Promise.all(source.map(u => fs.readFile(u, 'utf8')))).join('\n');
for (const forbidden of [
  'danger >=',
  'riskThreshold',
  'relationExpiry',
  'timeToLive',
  'possibilities[0]',
  'weightedScore',
  'argmax'
]) {
  assert.equal(joined.includes(forbidden), false, `forbidden algorithm pattern present: ${forbidden}`);
}

console.log('PASS oasis-reference-core audit');
