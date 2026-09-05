// OASIS responsibility <-> participation coupling v0.8
// Scope: responsibility movement + current functional demands -> participation state u_t.
//
// IMPORTANT:
// - This module does NOT compute canonical rho_t.
// - It consumes a responsibility movement already produced by an upstream responsibility process.
// - Participant names/classes do not decide participation; functional capabilities do.
// - No reward, utility score, absolute responsibility threshold, timeout, or RPG class rule is used.

const VALID_MOVEMENTS = new Set(['initial', 'rise', 'fall', 'same', 'incomparable']);
const VALID_DEMANDS = new Set(['action', 'recovery', 'oversight']);
const DEMAND_CAPABILITY = Object.freeze({
  action: 'act',
  recovery: 'recover',
  oversight: 'oversee'
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function assertParticipant(p) {
  if (!p || typeof p !== 'object') throw new Error('participant must be an object');
  if (!p.id) throw new Error('participant.id is required');
  if (!Array.isArray(p.capabilities) || p.capabilities.length === 0) {
    throw new Error('participant.capabilities must be a non-empty array');
  }
}

function assertInput({ t, responsibilityMovement, demands }) {
  if (!Number.isFinite(t)) throw new Error('t must be finite');
  if (!VALID_MOVEMENTS.has(responsibilityMovement)) {
    throw new Error(`invalid responsibility movement: ${responsibilityMovement}`);
  }
  if (!Array.isArray(demands)) throw new Error('demands must be an array');
  for (const demand of demands) {
    if (!VALID_DEMANDS.has(demand)) throw new Error(`unknown functional demand: ${demand}`);
  }
}

export class ResponsibilityParticipationCoupler {
  constructor({ participants }) {
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('participants must be a non-empty array');
    }

    const ids = new Set();
    this.participants = participants.map((p) => {
      assertParticipant(p);
      if (ids.has(p.id)) throw new Error(`duplicate participant id: ${p.id}`);
      ids.add(p.id);
      return Object.freeze({
        id: p.id,
        capabilities: Object.freeze([...new Set(p.capabilities)]),
        meta: Object.freeze(clone(p.meta) ?? {})
      });
    });

    this.previousActive = new Map();
    this.oversightLatched = new Set();
    this.history = [];
  }

  ingest({ t, responsibilityMovement = 'same', demands = [], context = {} }) {
    assertInput({ t, responsibilityMovement, demands });
    const demandSet = new Set(demands);

    // Supervisory participation is admitted by a renewed responsibility rise
    // while an oversight-relevant demand is actually present. Once admitted,
    // it remains participating while that current demand remains present.
    if (demandSet.has('oversight') && responsibilityMovement === 'rise') {
      for (const p of this.participants) {
        if (p.capabilities.includes(DEMAND_CAPABILITY.oversight)) {
          this.oversightLatched.add(p.id);
        }
      }
    }
    if (!demandSet.has('oversight')) this.oversightLatched.clear();

    const active = new Map();

    for (const p of this.participants) {
      const modes = [];

      // Companion-like participation: direct action in the current flow.
      if (demandSet.has('action') && p.capabilities.includes(DEMAND_CAPABILITY.action)) {
        modes.push('action-participation');
      }

      // Healer-like participation: recovery / mitigation in the current flow.
      if (demandSet.has('recovery') && p.capabilities.includes(DEMAND_CAPABILITY.recovery)) {
        modes.push('recovery-participation');
      }

      // Goddess-like participation: higher-order observation / supervision.
      if (
        demandSet.has('oversight') &&
        this.oversightLatched.has(p.id) &&
        p.capabilities.includes(DEMAND_CAPABILITY.oversight)
      ) {
        modes.push('supervisory-participation');
      }

      if (modes.length > 0) {
        active.set(p.id, Object.freeze({
          id: p.id,
          capabilities: p.capabilities,
          modes: Object.freeze(modes),
          meta: p.meta
        }));
      }
    }

    const entered = [];
    const exited = [];
    const changed = [];

    for (const [id, now] of active) {
      const before = this.previousActive.get(id);
      if (!before) entered.push(now);
      else if (JSON.stringify(before.modes) !== JSON.stringify(now.modes)) {
        changed.push(Object.freeze({ id, fromModes: before.modes, toModes: now.modes }));
      }
    }
    for (const [id, before] of this.previousActive) {
      if (!active.has(id)) exited.push(before);
    }

    const sample = Object.freeze({
      t,
      responsibilityMovement,
      demands: Object.freeze([...demandSet]),
      participants: Object.freeze([...active.values()]),
      entered: Object.freeze(entered),
      exited: Object.freeze(exited),
      changed: Object.freeze(changed),
      context: Object.freeze(clone(context) ?? {})
    });

    this.previousActive = active;
    this.history.push(sample);
    return sample;
  }

  all() {
    return [...this.history];
  }
}

export const FunctionalParticipation = Object.freeze({
  companion: Object.freeze({ capability: 'act', mode: 'action-participation' }),
  healer: Object.freeze({ capability: 'recover', mode: 'recovery-participation' }),
  goddess: Object.freeze({ capability: 'oversee', mode: 'supervisory-participation' })
});
