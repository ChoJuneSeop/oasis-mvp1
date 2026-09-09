const clone = value => value == null ? value : structuredClone(value);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function hash32(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seed) {
  let x = hash32(seed) || 1;
  const next = () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  next.auditState = () => x;
  return next;
}

const WORLD_SIZE = 24;
const VIEW_RADIUS = 7.5;
const NEAR_RADIUS = 1.35;
const MOVE_DISTANCE = 2.8;

function point(rng, margin = 2) {
  return {
    x: margin + rng() * (WORLD_SIZE - margin * 2),
    y: margin + rng() * (WORLD_SIZE - margin * 2)
  };
}

function relationId(kind, from, to) {
  return `${kind}:${from}->${to}`;
}

export function createCleanPrehistoricSocietyV1({ seed, cohort }) {
  const rng = rngFromSeed(seed);
  const agents = new Map();
  const objects = new Map();
  const relations = new Map();
  const ledger = [];
  let cycle = 0;
  let observationSerial = 0;
  let objectSerial = 0;

  const center = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
  cohort.forEach((spec, index) => {
    const angle = (Math.PI * 2 * index) / cohort.length;
    agents.set(spec.id, {
      id: spec.id,
      x: center.x + Math.cos(angle) * 4.5,
      y: center.y + Math.sin(angle) * 4.5,
      held: null,
      stamina: 100,
      sightBoostUntil: -1,
      founder: true,
      alive: true,
      externalDisposition: spec.disposition
    });
  });

  const materialKinds = ['stone', 'wood', 'fiber'];
  for (let i = 0; i < 21; i++) {
    const p = i < 9
      ? { x: center.x + (rng() - 0.5) * 7, y: center.y + (rng() - 0.5) * 7 }
      : point(rng);
    const kind = materialKinds[i % materialKinds.length];
    const id = `raw-${kind}-${objectSerial++}`;
    objects.set(id, {
      id, type: 'material', kind, x: p.x, y: p.y,
      portable: true, durable: true, createdCycle: 0,
      creator: null, lineage: [id], strikes: 0, heldBy: null
    });
  }

  for (let i = 0; i < 5; i++) {
    const p = point(rng);
    const id = `food-${objectSerial++}`;
    objects.set(id, { id, type: 'food', kind: 'food', x: p.x, y: p.y, portable: false, durable: false, stock: 24, createdCycle: 0, heldBy: null, lineage: [id] });
  }
  for (let i = 0; i < 3; i++) {
    const p = point(rng);
    const id = `water-${objectSerial++}`;
    objects.set(id, { id, type: 'water', kind: 'water', x: p.x, y: p.y, portable: false, durable: true, stock: Infinity, createdCycle: 0, heldBy: null, lineage: [id] });
  }

  function entity(id) {
    return agents.get(id) ?? objects.get(id) ?? null;
  }

  function log(event) {
    ledger.push({ index: ledger.length, cycle, ...clone(event) });
  }

  function activateRelation(kind, from, to, meta = {}) {
    const id = relationId(kind, from, to);
    relations.set(id, { id, kind, from, to, activeUntil: cycle + 8, meta: clone(meta) });
    return id;
  }

  function moveToward(agent, target, maxDistance = MOVE_DISTANCE) {
    const d = distance(agent, target);
    if (!(d > 0)) return 0;
    const step = Math.min(maxDistance, d);
    agent.x = clamp(agent.x + (target.x - agent.x) / d * step, 0, WORLD_SIZE);
    agent.y = clamp(agent.y + (target.y - agent.y) / d * step, 0, WORLD_SIZE);
    if (agent.held && objects.has(agent.held)) {
      const held = objects.get(agent.held);
      held.x = agent.x; held.y = agent.y;
    }
    agent.stamina = clamp(agent.stamina - 0.35 * step, 0, 100);
    return step;
  }

  function publicObject(o, self) {
    return {
      id: o.id, type: o.type, kind: o.kind,
      x: o.x, y: o.y, distance: distance(self, o),
      portable: !!o.portable, durable: !!o.durable,
      heldBy: o.heldBy ?? null,
      composite: o.type === 'composite',
      materialSignature: o.materialSignature ?? null,
      lineage: clone(o.lineage ?? [o.id]),
      stock: Number.isFinite(o.stock) ? o.stock : null
    };
  }

  function observeFor(agentId) {
    const self = agents.get(agentId);
    if (!self) throw new Error(`unknown agent ${agentId}`);
    const radius = VIEW_RADIUS + (self.sightBoostUntil >= cycle ? 3 : 0);
    const visibleAgents = [...agents.values()].filter(a => a.alive && a.id !== agentId && distance(self, a) <= radius);
    const visibleObjects = [...objects.values()].filter(o => distance(self, o) <= radius);
    const visibleIds = new Set([agentId, ...visibleAgents.map(a => a.id), ...visibleObjects.map(o => o.id)]);
    const currentRelations = [...relations.values()]
      .filter(r => r.activeUntil >= cycle && visibleIds.has(r.from) && visibleIds.has(r.to))
      .map(r => ({ id: r.id, kind: r.kind, from: r.from, to: r.to, meta: clone(r.meta) }));

    const facts = [];
    for (const other of visibleAgents) {
      if (distance(self, other) <= NEAR_RADIUS) facts.push(`near:${other.id}`);
    }
    for (const object of visibleObjects) {
      if (distance(self, object) <= NEAR_RADIUS) facts.push(`near:${object.id}`);
    }
    if (self.held) {
      facts.push(`holding:${self.held}`);
      facts.push(`near:${self.held}`);
    }
    if (self.stamina < 25) facts.push('body:low-stamina');

    const recentProcess = ledger.slice(-16).filter(e => e.actor === agentId || e.participants?.includes(agentId));
    return {
      id: `Y:${cycle}:${agentId}:${observationSerial++}`,
      time: cycle,
      facts,
      relations: currentRelations,
      participants: [
        { id: agentId, available: true, meta: { kind: 'human' } },
        ...visibleAgents.map(a => ({ id: a.id, available: true, meta: { kind: 'human' } }))
      ],
      entities: [...visibleObjects.map(o => o.id)],
      responsibilitySignals: self.stamina < 12
        ? { uncertainty: 0.2, irreversibility: 0.1, affectedScope: 0.1, recoverability: 0.8, lifeSafetyImpact: 0.5, structuralImpact: 0 }
        : {},
      relationalProcess: recentProcess.map(e => ({ cycle: e.cycle, action: e.action, actor: e.actor, target: e.target ?? null, participants: clone(e.participants ?? []) })),
      meta: {
        self: { id: self.id, x: self.x, y: self.y, stamina: self.stamina, held: self.held },
        visibleAgents: visibleAgents.map(a => ({ id: a.id, x: a.x, y: a.y, distance: distance(self, a) })),
        visibleObjects: visibleObjects.map(o => publicObject(o, self)),
        nearRadius: NEAR_RADIUS,
        moveDistance: MOVE_DISTANCE,
        cycle
      }
    };
  }

  function executeStep(agentId, step) {
    const agent = agents.get(agentId);
    const action = step.action;
    const meta = step.meta ?? {};
    const target = entity(step.target);
    const participants = [agentId, ...(step.participants ?? [])];

    if (action === 'observe') {
      agent.sightBoostUntil = cycle + 2;
      log({ action, actor: agentId, participants });
      return { action, ok: true };
    }

    if (action === 'move') {
      if (!target) return { action, ok: false, reason: 'target-missing' };
      const moved = moveToward(agent, target);
      log({ action, actor: agentId, target: step.target, moved, participants });
      return { action, ok: true, moved };
    }

    if (action === 'contact') {
      if (!target || distance(agent, target) > NEAR_RADIUS + 0.15) return { action, ok: false, reason: 'not-near' };
      const relation = activateRelation('contact', agentId, step.target);
      log({ action, actor: agentId, target: step.target, relation, participants });
      return { action, ok: true, relation };
    }

    if (action === 'grasp') {
      const object = objects.get(step.target);
      if (!object || !object.portable || object.heldBy || agent.held || distance(agent, object) > NEAR_RADIUS + 0.15) return { action, ok: false, reason: 'not-graspable' };
      agent.held = object.id; object.heldBy = agentId; object.x = agent.x; object.y = agent.y;
      log({ action, actor: agentId, target: object.id, lineage: clone(object.lineage), participants });
      return { action, ok: true, objectId: object.id };
    }

    if (action === 'carry') {
      if (!agent.held) return { action, ok: false, reason: 'nothing-held' };
      if (!target) return { action, ok: false, reason: 'target-missing' };
      const object = objects.get(agent.held);
      const moved = moveToward(agent, target);
      if (object) { object.x = agent.x; object.y = agent.y; }
      log({ action, actor: agentId, target: step.target, objectId: agent.held, lineage: clone(object?.lineage ?? []), moved, participants });
      return { action, ok: true, moved, objectId: agent.held };
    }

    if (action === 'release') {
      if (!agent.held) return { action, ok: false, reason: 'nothing-held' };
      const object = objects.get(agent.held);
      if (object) { object.heldBy = null; object.x = agent.x; object.y = agent.y; }
      const objectId = agent.held;
      agent.held = null;
      log({ action, actor: agentId, target: objectId, lineage: clone(object?.lineage ?? []), participants });
      return { action, ok: true, objectId };
    }

    if (action === 'consume') {
      const object = objects.get(step.target);
      if (!object || distance(agent, object) > NEAR_RADIUS + 0.15 || !['food', 'water'].includes(object.type)) return { action, ok: false, reason: 'not-consumable' };
      if (object.type === 'food' && object.stock <= 0) return { action, ok: false, reason: 'depleted' };
      if (object.type === 'food') object.stock -= 1;
      agent.stamina = clamp(agent.stamina + (object.type === 'food' ? 18 : 10), 0, 100);
      log({ action, actor: agentId, target: object.id, resourceType: object.type, participants });
      return { action, ok: true, stamina: agent.stamina };
    }

    if (action === 'transfer') {
      const receiver = agents.get(step.target);
      if (!receiver || !agent.held || receiver.held || distance(agent, receiver) > NEAR_RADIUS + 0.15) return { action, ok: false, reason: 'transfer-unavailable' };
      const object = objects.get(agent.held);
      if (!object) return { action, ok: false, reason: 'held-object-missing' };
      const objectId = object.id;
      receiver.held = objectId; object.heldBy = receiver.id; object.x = receiver.x; object.y = receiver.y; agent.held = null;
      const relation = activateRelation('transfer', agentId, receiver.id, { objectId });
      log({ action, actor: agentId, target: receiver.id, objectId, lineage: clone(object.lineage), relation, participants });
      return { action, ok: true, objectId, relation };
    }

    if (action === 'strike') {
      const object = objects.get(step.target);
      if (!object || !['material', 'composite'].includes(object.type) || distance(agent, object) > NEAR_RADIUS + 0.15) return { action, ok: false, reason: 'strike-unavailable' };
      object.strikes = (object.strikes ?? 0) + 1;
      object.shaped = object.strikes >= 2;
      agent.stamina = clamp(agent.stamina - 1.5, 0, 100);
      log({ action, actor: agentId, target: object.id, lineage: clone(object.lineage), shaped: object.shaped, participants });
      return { action, ok: true, shaped: object.shaped };
    }

    if (action === 'combine') {
      const componentIds = meta.componentIds ?? [];
      if (componentIds.length !== 2) return { action, ok: false, reason: 'component-count' };
      const a = objects.get(componentIds[0]);
      const b = objects.get(componentIds[1]);
      if (!a || !b || a.heldBy || b.heldBy) return { action, ok: false, reason: 'components-unavailable' };
      if (distance(agent, a) > NEAR_RADIUS + 0.25 || distance(agent, b) > NEAR_RADIUS + 0.25 || distance(a, b) > NEAR_RADIUS * 2 + 0.2) return { action, ok: false, reason: 'components-not-colocated' };
      const id = `structure-${objectSerial++}`;
      const lineage = [...new Set([...(a.lineage ?? [a.id]), ...(b.lineage ?? [b.id]), id])];
      const signature = [a.materialSignature ?? a.kind, b.materialSignature ?? b.kind].sort().join('+');
      objects.delete(a.id); objects.delete(b.id);
      const structure = {
        id, type: 'composite', kind: 'composite', x: agent.x, y: agent.y,
        portable: true, durable: true, createdCycle: cycle, creator: agentId,
        lineage, materialSignature: signature, strikes: 0, heldBy: null,
        parentIds: [a.id, b.id]
      };
      objects.set(id, structure);
      log({ action, actor: agentId, target: id, objectId: id, componentIds: [a.id, b.id], lineage: clone(lineage), materialSignature: signature, participants });
      return { action, ok: true, structureId: id, materialSignature: signature };
    }

    if (action === 'rest') {
      agent.stamina = clamp(agent.stamina + 8, 0, 100);
      log({ action, actor: agentId, participants });
      return { action, ok: true, stamina: agent.stamina };
    }

    return { action, ok: false, reason: 'unknown-action' };
  }

  async function executePossibility(agentId, possibility) {
    const results = [];
    for (const step of possibility.sigma ?? []) results.push(executeStep(agentId, step));
    return { agentId, possibilityId: possibility.id, results };
  }

  function visibleFromObservation(observation) {
    return {
      agents: observation.meta?.visibleAgents ?? [],
      objects: observation.meta?.visibleObjects ?? [],
      self: observation.meta?.self ?? {}
    };
  }

  function makeCapabilities(agentId) {
    const mk = (id, instantiate) => ({ id, instantiate });
    return [
      mk('observe', ({ observation }) => [{ id: `observe:${observation.id}`, actor: agentId, action: 'observe' }]),
      mk('move', ({ observation }) => {
        const v = visibleFromObservation(observation);
        return [...v.agents, ...v.objects].map(t => ({
          id: `move:${t.id}`, actor: agentId, action: 'move', target: t.id,
          provides: t.distance <= MOVE_DISTANCE + NEAR_RADIUS ? [`near:${t.id}`] : [],
          participants: agents.has(t.id) ? [t.id] : [],
          meta: { targetId: t.id }
        }));
      }),
      mk('contact', ({ observation }) => visibleFromObservation(observation).agents.map(t => ({
        id: `contact:${t.id}`, actor: agentId, action: 'contact', target: t.id,
        participants: [t.id], requires: [`near:${t.id}`], providesRelationKinds: ['contact']
      }))),
      mk('grasp', ({ observation }) => visibleFromObservation(observation).objects.filter(o => o.portable && !o.heldBy).map(o => ({
        id: `grasp:${o.id}`, actor: agentId, action: 'grasp', target: o.id,
        requires: [`near:${o.id}`], provides: [`holding:${o.id}`, `near:${o.id}`]
      }))),
      mk('carry', ({ observation }) => {
        const v = visibleFromObservation(observation);
        const candidates = v.objects.filter(o => o.portable && (!o.heldBy || o.heldBy === agentId));
        const targets = [...v.agents, ...v.objects];
        const out = [];
        for (const o of candidates) for (const t of targets) {
          if (o.id === t.id) continue;
          out.push({
            id: `carry:${o.id}->${t.id}`, actor: agentId, action: 'carry', target: t.id,
            participants: agents.has(t.id) ? [t.id] : [],
            requires: [`holding:${o.id}`],
            provides: [`holding:${o.id}`, `near:${o.id}`, ...(t.distance <= MOVE_DISTANCE + NEAR_RADIUS ? [`near:${t.id}`] : [])],
            meta: { objectId: o.id, targetId: t.id }
          });
        }
        return out;
      }),
      mk('release', ({ observation }) => {
        const held = observation.meta?.self?.held;
        const visiblePortable = visibleFromObservation(observation).objects.filter(o => o.portable).map(o => o.id);
        const ids = held ? [held] : visiblePortable;
        return ids.map(id => ({ id: `release:${id}`, actor: agentId, action: 'release', target: id, requires: [`holding:${id}`], provides: [`near:${id}`] }));
      }),
      mk('consume', ({ observation }) => visibleFromObservation(observation).objects.filter(o => ['food', 'water'].includes(o.type)).map(o => ({
        id: `consume:${o.id}`, actor: agentId, action: 'consume', target: o.id, requires: [`near:${o.id}`]
      }))),
      mk('transfer', ({ observation }) => {
        const held = observation.meta?.self?.held;
        const portable = visibleFromObservation(observation).objects.filter(o => o.portable).map(o => o.id);
        const objectIds = held ? [held] : portable;
        const out = [];
        for (const objectId of objectIds) for (const t of visibleFromObservation(observation).agents) {
          out.push({
            id: `transfer:${objectId}->${t.id}`, actor: agentId, action: 'transfer', target: t.id,
            participants: [t.id], requires: [`holding:${objectId}`, `near:${t.id}`],
            providesRelationKinds: ['transfer'], meta: { objectId }
          });
        }
        return out;
      }),
      mk('strike', ({ observation }) => visibleFromObservation(observation).objects.filter(o => ['material', 'composite'].includes(o.type)).map(o => ({
        id: `strike:${o.id}`, actor: agentId, action: 'strike', target: o.id, requires: [`near:${o.id}`],
        responsibility: { irreversibility: 0.1, affectedScope: 0.1, recoverability: 0.9, structuralImpact: o.composite ? 0.3 : 0.1 }
      }))),
      mk('combine', ({ observation }) => {
        const materials = visibleFromObservation(observation).objects.filter(o => ['material', 'composite'].includes(o.type) && !o.heldBy);
        const out = [];
        for (let i = 0; i < materials.length; i++) for (let j = i + 1; j < materials.length; j++) {
          const a = materials[i], b = materials[j];
          out.push({
            id: `combine:${a.id}+${b.id}`, actor: agentId, action: 'combine', target: `pair:${a.id}+${b.id}`,
            entities: [a.id, b.id], requires: [`near:${a.id}`, `near:${b.id}`],
            responsibility: { irreversibility: 0.25, affectedScope: 0.1, recoverability: 0.6, structuralImpact: 0.45 },
            meta: { componentIds: [a.id, b.id] }
          });
        }
        return out;
      }),
      mk('rest', ({ observation }) => [{ id: `rest:${observation.id}`, actor: agentId, action: 'rest' }])
    ];
  }

  async function advanceExogenousFlow() {
    cycle += 1;
    for (const agent of agents.values()) {
      agent.stamina = clamp(agent.stamina - 0.25, 0, 100);
      if (agent.stamina <= 2) agent.stamina = 18; // founder continuity: recovery, not replacement/death.
      if (agent.held && objects.has(agent.held)) {
        const held = objects.get(agent.held); held.x = agent.x; held.y = agent.y;
      }
    }
    for (const o of objects.values()) {
      if (o.type === 'food' && Number.isFinite(o.stock)) o.stock = Math.min(24, o.stock + 0.12);
    }
    if (cycle % 40 === 0) {
      const rawCount = [...objects.values()].filter(o => o.type === 'material').length;
      if (rawCount < 12) {
        const kind = materialKinds[Math.floor(rng() * materialKinds.length) % materialKinds.length];
        const p = point(rng);
        const id = `raw-${kind}-${objectSerial++}`;
        objects.set(id, { id, type: 'material', kind, x: p.x, y: p.y, portable: true, durable: true, createdCycle: cycle, creator: null, lineage: [id], strikes: 0, heldBy: null });
        log({ action: 'natural-material-entry', actor: null, target: id, participants: [] });
      }
    }
  }

  return {
    seed,
    agents,
    objects,
    relations,
    ledger,
    get cycle() { return cycle; },
    createAgentWorld(agentId) {
      return {
        observe: async () => observeFor(agentId),
        execute: async possibility => executePossibility(agentId, possibility)
      };
    },
    capabilitiesForAgent: agentId => makeCapabilities(agentId),
    advanceExogenousFlow,
    isTerminal: async () => false,
    terminalReason: async () => null,
    auditSnapshot() {
      return {seed, cycle, observationSerial, objectSerial, rngState: rng.auditState(), agents: clone([...agents]), objects: clone([...objects]), relations: clone([...relations]), ledger: clone(ledger)};
    },
    externalSnapshot() {
      return {
        cycle,
        founderIds: [...agents.keys()],
        agentState: [...agents.values()].map(a => ({ id: a.id, x: a.x, y: a.y, stamina: a.stamina, held: a.held, founder: a.founder })),
        objects: [...objects.values()].map(clone),
        relations: [...relations.values()].map(clone),
        ledger: clone(ledger)
      };
    }
  };
}
