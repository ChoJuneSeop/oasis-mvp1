import assert from 'node:assert/strict';
import { createOASIS, OASISReferenceCore } from '../src/oasis-reference-core.mjs';

function event(id, extra = {}) {
  return { id, ...extra };
}

// Assigned responsibility must not count as already resolved, even when the candidate
// omits a redundant copy of the participant's already-existing obligation.
{
  const o = createOASIS({ invariants: [], realizationSeed: 7 });
  o.observe(event('responsibility-not-auto-resolved', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', obligations: ['repair:B'] }],
    affordances: [{ id: 'leave', actor: 'A', action: 'leave', target: 'B' }]
  }));
  const d = o.deliberate();
  assert.equal(d.responsibility.unresolved.includes('repair:B'), true);
  assert.deepEqual(d.responsibility.assigned['repair:B'], ['A']);
}

// An actually resolving action must remain distinguishable from merely carrying the duty.
{
  const o = createOASIS({ invariants: [], realizationSeed: 7 });
  o.observe(event('responsibility-resolution', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', obligations: ['repair:B'] }],
    affordances: [
      { id: 'leave', actor: 'A', action: 'leave', target: 'B' },
      { id: 'repair', actor: 'A', action: 'repair', target: 'B', resolves: ['repair:B'] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(d.choice.steps[0].id, 'repair');
  assert.equal(d.responsibility.unresolved.length, 0);
}

// A current fact/participant change must anchor the present even without a newly added relation edge.
{
  const o = createOASIS({ invariants: [], realizationSeed: 11 });
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
  const o = createOASIS({ invariants: [], realizationSeed: 13 });
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
  const o = createOASIS({ invariants: [], realizationSeed: 17 });
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

// A current copy and a reactivated copy of the same historical action may coexist as
// alternatives, but must not be concatenated into a fake two-step structural combination.
{
  const o = createOASIS({ invariants: [], realizationSeed: 19 });
  o.observe(event('dup-past', {
    entities: ['OASIS', 'A'],
    participants: [{ id: 'OASIS', capabilities: ['observe'] }],
    relations: [{ id: 'dup-rel', from: 'OASIS', to: 'A', kind: 'observes' }],
    affordances: [{ id: 'observe-A', actor: 'OASIS', action: 'observe', target: 'A' }]
  }));
  const d1 = o.deliberate();
  o.actualize(d1.choice.id, event('dup-result', {
    entities: ['A'],
    affordances: [{ id: 'observe-A', op: 'remove' }]
  }));
  o.observe(event('dup-return', {
    entities: ['A'],
    participants: [{ id: 'OASIS', capabilities: ['observe'] }],
    affordances: [{ id: 'observe-A', actor: 'OASIS', action: 'observe', target: 'A' }]
  }));
  const d2 = o.deliberate();
  for (const p of d2.possibilities) {
    const semantic = p.steps.map(s => s.meta?.originalStepId ?? s.id);
    assert.equal(new Set(semantic).size, semantic.length, `duplicate semantic action in ${p.id}`);
  }
}

// Explicit invariant remains non-tradeable.
{
  const o = createOASIS({ realizationSeed: 23 });
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
  const o = createOASIS({ realizationSeed: 29 });
  o.observe(event('no-action', { entities: ['A'] }));
  const d = o.deliberate();
  assert.equal(d.choice, null);
  assert.equal(d.continuationRequired, true);
  assert.equal(o.exportState().closedExperiences.length, 0);
}

// Semantic equivalence must not be resolved by a fixed lexical first-item rule.
// The same recorded seed + same complete flow is reproducible, while different recorded
// realization seeds can realize different members of an otherwise equivalent frontier.
{
  const run = seed => {
    const o = createOASIS({ invariants: [], realizationSeed: seed });
    assert.equal(o instanceof OASISReferenceCore, true);
    o.observe(event('equivalent-frontier', {
      entities: ['OASIS', 'A', 'B'],
      participants: [{ id: 'OASIS', capabilities: ['act'] }],
      affordances: [
        { id: 'a', actor: 'OASIS', action: 'act', target: 'A' },
        { id: 'b', actor: 'OASIS', action: 'act', target: 'B' }
      ]
    }));
    const d = o.deliberate();
    assert.equal(d.tieBreakUsed, true);
    assert.match(d.tieBreakMeaning, /Contingent realization/);
    assert.equal(o.exportState().options.realizationSeed, seed >>> 0);
    return d.choice.steps[0].id;
  };
  assert.equal(run(31), run(31));
  const choices = new Set(Array.from({ length: 24 }, (_, i) => run(i + 1)));
  assert.equal(choices.size > 1, true);
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

const referenceSource = await fs.readFile(new URL('../src/oasis-reference-core.mjs', import.meta.url), 'utf8');
assert.equal(referenceSource.includes('Deterministic structural key only'), false);
assert.equal(referenceSource.includes('ordered[0]'), false);

console.log('PASS oasis-reference-core audit');
