// OASIS relational participation state machine v0.9
// Scope: current relational flow f_t + responsibility movement -> participation state u_t.
//
// This restores the earlier OASIS participation idea as a relational state transition:
// non-participating <-> candidate <-> participating.
//
// It deliberately removes the v0.8 scripted functional-demand input.
// Participant admission is driven by the current relation graph and responsibility movement.
// Capabilities describe what an admitted participant can contribute later to C_t;
// capabilities do not themselves force admission.
//
// No reward, utility, role-name rule, fixed danger threshold, timeout, recent-N window,
// similarity score, or task-success label is used here.

const VALID_MOVEMENTS = new Set(['initial', 'rise', 'fall', 'same', 'incomparable']);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function assertParticipant(p) {
  if (!p || typeof p !== 'object') throw new Error('participant must be an object');
  if (!p.id) throw new Error('participant.id is required');
  if (!Array.isArray(p.capabilities)) throw new Error('participant.capabilities must be an array');
}

function roleValues(roles) {
  const out = [];
  for (const value of Object.values(roles ?? {})) {
    if (Array.isArray(value)) {
      for (const v of value) if (v !== null && v !== undefined) out.push(String(v));
    } else if (value !== null && value !== undefined) {
      out.push(String(value));
    }
  }
  return [...new Set(out)];
}

function ensureNode(graph, id) {
  if (!graph.has(id)) graph.set(id, new Set());
}

export function buildCurrentRelationGraph(activeFlows = []) {
  if (!Array.isArray(activeFlows)) throw new Error('activeFlows must be an array');

  const graph = new Map();
  const evidenceByEntity = new Map();

  for (const flow of activeFlows) {
    if (!flow || typeof flow !== 'object') continue;
    if (flow.active === false) continue;
    if (!flow.roles || typeof flow.roles !== 'object') continue;

    const ids = roleValues(flow.roles);
    if (ids.length === 0) continue;

    for (const id of ids) {
      ensureNode(graph, id);
      if (!evidenceByEntity.has(id)) evidenceByEntity.set(id, []);
      evidenceByEntity.get(id).push(Object.freeze({
        flowId: flow.flowId,
        relationType: flow.relationType,
        roles: Object.freeze(clone(flow.roles)),
        state: clone(flow.state)
      }));
    }

    // A relation observation is treated as one current relational hyperedge for
    // participation connectivity. Direction/role assignment is NOT discarded:
    // the original role bindings are preserved in evidenceByEntity and flow data.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        graph.get(ids[i]).add(ids[j]);
        graph.get(ids[j]).add(ids[i]);
      }
    }
  }

  return { graph, evidenceByEntity };
}

export function reachableFrom(graph, startId) {
  if (!(graph instanceof Map)) throw new Error('graph must be a Map');
  const start = String(startId);
  const seen = new Set([start]);
  const queue = [start];

  while (queue.length) {
    const id = queue.shift();
    for (const next of graph.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function functionalAliases(capabilities) {
  const aliases = [];
  if (capabilities.includes('act')) aliases.push('companion-like');
  if (capabilities.includes('recover')) aliases.push('healer-like');
  if (capabilities.includes('oversee')) aliases.push('goddess-like');
  return aliases;
}

export class RelationalParticipationStateMachine {
  constructor({ selfId, participants }) {
    if (!selfId) throw new Error('selfId is required');
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('participants must be a non-empty array');
    }

    this.selfId = String(selfId);
    this.participants = new Map();
    for (const raw of participants) {
      assertParticipant(raw);
      const id = String(raw.id);
      if (id === this.selfId) throw new Error('participants must not duplicate selfId');
      if (this.participants.has(id)) throw new Error(`duplicate participant id: ${id}`);
      this.participants.set(id, Object.freeze({
        id,
        capabilities: Object.freeze([...new Set(raw.capabilities)]),
        meta: Object.freeze(clone(raw.meta) ?? {})
      }));
    }

    this.expandedActive = new Set();
    this.previousStates = new Map();
    this.history = [];
  }

  ingest({ t, activeFlows = [], responsibilityMovement = 'same', context = {} }) {
    if (!Number.isFinite(t)) throw new Error('t must be finite');
    if (!VALID_MOVEMENTS.has(responsibilityMovement)) {
      throw new Error(`invalid responsibility movement: ${responsibilityMovement}`);
    }

    const { graph, evidenceByEntity } = buildCurrentRelationGraph(activeFlows);
    const reachable = reachableFrom(graph, this.selfId);
    reachable.delete(this.selfId);

    const direct = new Set(
      [...(graph.get(this.selfId) ?? [])].filter(id => this.participants.has(id))
    );
    const reachableParticipants = new Set(
      [...reachable].filter(id => this.participants.has(id))
    );

    // Expanded participation is always constrained by the current relation graph.
    for (const id of [...this.expandedActive]) {
      if (!reachableParticipants.has(id) || direct.has(id)) this.expandedActive.delete(id);
    }

    // Patent-stage responsibility logic allows increased responsibility to widen
    // search/verification/participation. Here the widening is purely relational:
    // only already-currently-reachable candidates can be admitted.
    if (responsibilityMovement === 'rise') {
      for (const id of reachableParticipants) {
        if (!direct.has(id)) this.expandedActive.add(id);
      }
    }

    // Responsibility relaxation removes only the expanded layer. Direct current
    // relational participants remain participating because their relation persists.
    if (responsibilityMovement === 'fall') {
      this.expandedActive.clear();
    }

    const states = new Map();
    for (const [id, p] of this.participants) {
      let status = 'non-participating';
      let basis = 'not-currently-related';

      if (direct.has(id)) {
        status = 'participating';
        basis = 'direct-current-relation';
      } else if (this.expandedActive.has(id)) {
        status = 'participating';
        basis = 'responsibility-expanded-current-relation';
      } else if (reachableParticipants.has(id)) {
        status = 'candidate';
        basis = 'indirect-current-relation';
      }

      states.set(id, Object.freeze({
        id,
        status,
        basis,
        capabilities: p.capabilities,
        functionalAliases: Object.freeze(functionalAliases(p.capabilities)),
        relationEvidence: Object.freeze([...(evidenceByEntity.get(id) ?? [])]),
        meta: p.meta
      }));
    }

    const transitions = [];
    for (const [id, now] of states) {
      const before = this.previousStates.get(id);
      const from = before?.status ?? 'non-participating';
      if (from !== now.status || (before && before.basis !== now.basis)) {
        transitions.push(Object.freeze({
          id,
          from,
          to: now.status,
          fromBasis: before?.basis ?? null,
          toBasis: now.basis
        }));
      }
    }

    const sample = Object.freeze({
      t,
      responsibilityMovement,
      participants: Object.freeze([...states.values()]),
      participating: Object.freeze([...states.values()].filter(x => x.status === 'participating')),
      candidates: Object.freeze([...states.values()].filter(x => x.status === 'candidate')),
      nonParticipating: Object.freeze([...states.values()].filter(x => x.status === 'non-participating')),
      transitions: Object.freeze(transitions),
      context: Object.freeze(clone(context) ?? {})
    });

    this.previousStates = states;
    this.history.push(sample);
    return sample;
  }

  all() {
    return [...this.history];
  }
}

export const FunctionalParticipationAliases = Object.freeze({
  companion: Object.freeze({ capability: 'act', meaning: 'direct-action-capability' }),
  healer: Object.freeze({ capability: 'recover', meaning: 'recovery-or-mitigation-capability' }),
  goddess: Object.freeze({ capability: 'oversee', meaning: 'higher-order-observation-or-supervision-capability' })
});
