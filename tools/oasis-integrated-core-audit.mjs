import assert from 'node:assert/strict';
import { createOASIS } from '../src/oasis-core.mjs';

function event(id, extra = {}) {
  return { id, ...extra };
}

{
  const o = createOASIS();
  o.observe(event('empty', { entities: ['A'] }));
  const d = o.deliberate();
  assert.equal(d.choice, null);
  assert.equal(d.continuationRequired, true);
  assert.equal(o.exportState().closedExperiences.length, 0);
}

{
  const o = createOASIS();
  o.observe(event('start', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', capabilities: ['care:B'] }],
    relations: [{ id: 'r1', from: 'A', to: 'B', kind: 'knows' }],
    affordances: [
      { id: 'safe', actor: 'A', action: 'assist', target: 'B', obligations: ['care:B'] },
      { id: 'harm', actor: 'A', action: 'harm', target: 'B', violates: ['irreversible-loss-of-life'] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(d.choice.steps[0].id, 'safe');
  assert.deepEqual(d.responsibility.invariantViolations, []);
  assert.equal(d.possibilities.length >= 2, true);

  assert.throws(() => o.actualize('direct:harm', event('bad-outcome')), /Only the single deliberated choice/);
  const exp = o.actualize(d.choice.id, event('outcome-1', {
    entities: ['A', 'B'],
    relations: [{ id: 'r2', from: 'B', to: 'A', kind: 'trusts' }]
  }));
  assert.equal(exp.id, 'experience:0');
  assert.equal(o.exportState().closedExperiences.length, 1);
  assert.equal(o.exportState().world.relations.some(r => r.id === 'r2'), true);
}

{
  const o = createOASIS();
  o.observe(event('compose', {
    entities: ['A', 'B', 'C'],
    participants: [{ id: 'A' }],
    affordances: [
      { id: 'open', actor: 'A', action: 'open', target: 'B', provides: ['open:B'], entities: ['B'] },
      { id: 'enter', actor: 'A', action: 'enter', target: 'B', requires: ['open:B'], entities: ['B'], provides: ['inside:B'] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(d.possibilities.some(p => p.kind === 'structural-combination' && p.steps.map(s => s.id).join('>') === 'open>enter'), true);
}

{
  const o = createOASIS();
  o.observe(event('first', {
    entities: ['A', 'B'],
    participants: [{ id: 'A' }],
    relations: [{ id: 'ab', from: 'A', to: 'B', kind: 'supports' }],
    affordances: [{ id: 'act1', actor: 'A', action: 'engage', target: 'B' }]
  }));
  const d1 = o.deliberate();
  o.actualize(d1.choice.id, event('result1', {
    entities: ['B', 'C'],
    relations: [{ id: 'bc', from: 'B', to: 'C', kind: 'opens' }]
  }));

  for (let i = 0; i < 25; i++) {
    o.observe(event(`unrelated-${i}`, { entities: [`X${i}`] }));
  }

  o.observe(event('return', {
    entities: ['C'],
    participants: [{ id: 'A' }],
    affordances: [{ id: 'act2', actor: 'A', action: 'follow', target: 'C' }]
  }));
  const d2 = o.deliberate();
  assert.equal(d2.field.reactivatedExperienceIds.includes('experience:0'), true);
  const exp2 = o.actualize(d2.choice.id, event('result2', {
    entities: ['C', 'D'],
    relations: [{ id: 'cd', from: 'C', to: 'D', kind: 'changes' }]
  }));
  assert.equal(exp2.id, 'experience:1');
  assert.equal(o.exportState().spiralLineage.some(e => e.fromExperienceId === 'experience:0' && e.toExperienceId === 'experience:1'), true);
}

{
  const o = createOASIS();
  o.observe(event('direction', {
    entities: ['A', 'B'],
    participants: [{ id: 'A' }],
    relations: [
      { id: 'forward', from: 'A', to: 'B', kind: 'requests' },
      { id: 'backward', from: 'B', to: 'A', kind: 'responds' }
    ],
    affordances: [{ id: 'reply', actor: 'A', action: 'reply', target: 'B' }]
  }));
  const d = o.deliberate();
  assert.equal(d.field.relationSignature.includes('A->B:requests:'), true);
  assert.equal(d.field.relationSignature.includes('B->A:responds:'), true);
  assert.notEqual(d.field.relationSignature.indexOf('A->B:requests:'), d.field.relationSignature.indexOf('B->A:responds:'));
}

{
  const o = createOASIS({ invariants: [] });
  o.observe(event('responsibility', {
    entities: ['A', 'B'],
    participants: [{ id: 'A', obligations: ['repair:B'] }],
    relations: [{ id: 'ab2', from: 'A', to: 'B', kind: 'responsible-for' }],
    affordances: [
      { id: 'leave', actor: 'A', action: 'leave', target: 'B', obligations: ['repair:B'] },
      { id: 'repair', actor: 'A', action: 'repair', target: 'B', resolves: ['repair:B'] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(Array.isArray(d.frontier), true);
  assert.equal(d.responsibility.unresolved.length, 0);
}

{
  const o = createOASIS();
  o.observe(event('all-invariant', {
    entities: ['A', 'B'],
    participants: [{ id: 'A' }],
    affordances: [
      { id: 'v1', actor: 'A', action: 'x', target: 'B', violates: ['irreversible-loss-of-life'] },
      { id: 'v2', actor: 'A', action: 'y', target: 'B', consequences: [{ tags: ['irreversible-loss-of-life'] }] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(d.choice, null);
  assert.equal(d.continuationRequired, true);
}

{
  const o = createOASIS({ invariants: [] });
  o.observe(event('responsibility-composition', {
    entities: ['A', 'B'],
    participants: [{ id: 'A' }],
    affordances: [
      { id: 'cause', actor: 'A', action: 'change', target: 'B', obligations: ['restore:B'] },
      { id: 'restore', actor: 'A', action: 'restore', target: 'B', resolves: ['restore:B'] }
    ]
  }));
  const d = o.deliberate();
  assert.equal(
    d.possibilities.some(p => p.kind === 'structural-combination' && p.steps.map(s => s.id).join('>') === 'cause>restore'),
    true
  );
}

const source = await (await import('node:fs/promises')).readFile(new URL('../src/oasis-core.mjs', import.meta.url), 'utf8');
for (const forbidden of [
  'danger >=',
  'riskThreshold',
  'relationExpiry',
  'timeToLive',
  'possibilities[0]',
  'Math.max(...rows',
  'weightedScore',
  'argmax'
]) {
  assert.equal(source.includes(forbidden), false, `forbidden algorithm pattern present: ${forbidden}`);
}

console.log('PASS oasis-integrated-core audit');
