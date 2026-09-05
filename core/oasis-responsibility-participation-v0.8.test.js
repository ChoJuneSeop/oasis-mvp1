import assert from 'node:assert/strict';
import { ResponsibilityParticipationCoupler } from './oasis-responsibility-participation-v0.8.js';

function makeCoupler(names = ['P1', 'P2', 'P3']) {
  return new ResponsibilityParticipationCoupler({
    participants: [
      { id: names[0], capabilities: ['act'], meta: { label: 'companion-like' } },
      { id: names[1], capabilities: ['recover'], meta: { label: 'healer-like' } },
      { id: names[2], capabilities: ['oversee'], meta: { label: 'goddess-like' } }
    ]
  });
}

// 1. Direct action demand engages only action-capable participant.
{
  const c = makeCoupler();
  const out = c.ingest({ t: 1, responsibilityMovement: 'same', demands: ['action'] });
  assert.deepEqual(out.participants.map(x => x.id), ['P1']);
  assert.deepEqual(out.participants[0].modes, ['action-participation']);
}

// 2. Recovery demand engages recovery-capable participant without requiring responsibility escalation.
{
  const c = makeCoupler();
  const out = c.ingest({ t: 1, responsibilityMovement: 'same', demands: ['recovery'] });
  assert.deepEqual(out.participants.map(x => x.id), ['P2']);
  assert.deepEqual(out.participants[0].modes, ['recovery-participation']);
}

// 3. Oversight demand alone does not automatically summon supervisory participation.
{
  const c = makeCoupler();
  const out = c.ingest({ t: 1, responsibilityMovement: 'same', demands: ['oversight'] });
  assert.equal(out.participants.length, 0);
}

// 4. Responsibility rise while oversight is relevant admits supervisory participant.
{
  const c = makeCoupler();
  const out = c.ingest({ t: 1, responsibilityMovement: 'rise', demands: ['oversight'] });
  assert.deepEqual(out.participants.map(x => x.id), ['P3']);
  assert.deepEqual(out.participants[0].modes, ['supervisory-participation']);
}

// 5. Once admitted, supervisory participant remains while the same oversight demand remains active.
{
  const c = makeCoupler();
  c.ingest({ t: 1, responsibilityMovement: 'rise', demands: ['oversight'] });
  const out = c.ingest({ t: 2, responsibilityMovement: 'fall', demands: ['oversight'] });
  assert.deepEqual(out.participants.map(x => x.id), ['P3']);
  assert.equal(out.exited.length, 0);
}

// 6. Supervisory participant exits when the oversight-relevant current demand disappears.
{
  const c = makeCoupler();
  c.ingest({ t: 1, responsibilityMovement: 'rise', demands: ['oversight'] });
  const out = c.ingest({ t: 2, responsibilityMovement: 'fall', demands: [] });
  assert.equal(out.participants.length, 0);
  assert.deepEqual(out.exited.map(x => x.id), ['P3']);
}

// 7. Action, recovery, and oversight participation can coexist in one current participation state.
{
  const c = makeCoupler();
  const out = c.ingest({
    t: 1,
    responsibilityMovement: 'rise',
    demands: ['action', 'recovery', 'oversight']
  });
  assert.deepEqual(out.participants.map(x => x.id), ['P1', 'P2', 'P3']);
}

// 8. Participant identity/name does not determine function; capabilities do.
{
  const c = makeCoupler(['여신', '동료', '힐러']);
  const out = c.ingest({
    t: 1,
    responsibilityMovement: 'rise',
    demands: ['action', 'recovery', 'oversight']
  });
  assert.equal(out.participants.find(x => x.id === '여신').modes[0], 'action-participation');
  assert.equal(out.participants.find(x => x.id === '동료').modes[0], 'recovery-participation');
  assert.equal(out.participants.find(x => x.id === '힐러').modes[0], 'supervisory-participation');
}

// 9. One participant may contribute through multiple functional modes.
{
  const c = new ResponsibilityParticipationCoupler({
    participants: [{ id: 'multi', capabilities: ['act', 'recover', 'oversee'] }]
  });
  const out = c.ingest({
    t: 1,
    responsibilityMovement: 'rise',
    demands: ['action', 'recovery', 'oversight']
  });
  assert.deepEqual(out.participants[0].modes, [
    'action-participation',
    'recovery-participation',
    'supervisory-participation'
  ]);
}

// 10. Mode changes are explicit transitions in u_t, not silent replacements.
{
  const c = new ResponsibilityParticipationCoupler({
    participants: [{ id: 'A', capabilities: ['act', 'recover'] }]
  });
  c.ingest({ t: 1, responsibilityMovement: 'same', demands: ['action'] });
  const out = c.ingest({ t: 2, responsibilityMovement: 'same', demands: ['action', 'recovery'] });
  assert.equal(out.changed.length, 1);
  assert.deepEqual(out.changed[0].fromModes, ['action-participation']);
  assert.deepEqual(out.changed[0].toModes, ['action-participation', 'recovery-participation']);
}

// 11. No current demand means no participant is forced into the judgment state.
{
  const c = makeCoupler();
  const out = c.ingest({ t: 1, responsibilityMovement: 'rise', demands: [] });
  assert.equal(out.participants.length, 0);
}

// 12. Unknown semantic demand is rejected rather than silently interpreted.
{
  const c = makeCoupler();
  assert.throws(
    () => c.ingest({ t: 1, responsibilityMovement: 'rise', demands: ['win-task'] }),
    /unknown functional demand/
  );
}

console.log('oasis-responsibility-participation-v0.8: 12/12 tests passed');
