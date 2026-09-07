import { createCleanPrehistoricSocietyV1 } from './prehistoric-clean-world-v1.mjs';

const MOVE_DISTANCE = 2.8;
const NEAR_RADIUS = 1.35;
const hypot = (a, b) => Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
const byDistance = rows => [...rows].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || String(a.id).localeCompare(String(b.id)));

function view(observation) {
  return {
    self: observation.meta?.self ?? {},
    agents: byDistance(observation.meta?.visibleAgents ?? []),
    objects: byDistance(observation.meta?.visibleObjects ?? [])
  };
}

function makeCorrectedCapabilities(agentId) {
  const mk = (id, instantiate) => ({ id, instantiate });
  return [
    mk('observe', ({ observation }) => [{ id: `observe:${observation.id}`, actor: agentId, action: 'observe' }]),

    mk('move', ({ observation }) => {
      const v = view(observation);
      return [...v.agents, ...v.objects].map(t => ({
        id: `move:${t.id}`, actor: agentId, action: 'move', target: t.id,
        participants: v.agents.some(a => a.id === t.id) ? [t.id] : [],
        provides: (t.distance ?? Infinity) <= MOVE_DISTANCE + NEAR_RADIUS ? [`near:${t.id}`] : []
      }));
    }),

    mk('contact', ({ observation }) => view(observation).agents.map(t => ({
      id: `contact:${t.id}`, actor: agentId, action: 'contact', target: t.id,
      participants: [t.id], requires: [`near:${t.id}`], providesRelationKinds: ['contact']
    }))),

    mk('grasp', ({ observation }) => view(observation).objects
      .filter(o => o.portable && (!o.heldBy || o.heldBy === agentId))
      .map(o => ({
        id: `grasp:${o.id}`, actor: agentId, action: 'grasp', target: o.id,
        requires: [`near:${o.id}`], provides: [`holding:${o.id}`, `near:${o.id}`]
      }))),

    mk('carry', ({ observation }) => {
      const v = view(observation);
      const portable = v.objects.filter(o => o.portable && (!o.heldBy || o.heldBy === agentId));
      const targets = [...v.agents, ...v.objects.filter(o => ['material', 'composite'].includes(o.type))];
      const held = v.self?.held;
      const out = [];

      if (held) {
        for (const t of targets.filter(t => t.id !== held)) {
          out.push({
            id: `carry:${held}->${t.id}`, actor: agentId, action: 'carry', target: t.id,
            participants: v.agents.some(a => a.id === t.id) ? [t.id] : [],
            requires: [`holding:${held}`],
            provides: [`holding:${held}`, `near:${held}`, ...((t.distance ?? Infinity) <= MOVE_DISTANCE + NEAR_RADIUS ? [`near:${t.id}`] : [])],
            meta: { objectId: held, targetId: t.id }
          });
        }
        return out;
      }

      for (const object of portable) {
        const localTargets = targets
          .filter(t => t.id !== object.id && hypot(object, t) <= MOVE_DISTANCE + NEAR_RADIUS * 2)
          .sort((a, b) => hypot(object, a) - hypot(object, b) || String(a.id).localeCompare(String(b.id)));
        for (const t of localTargets.slice(0, 3)) {
          out.push({
            id: `carry:${object.id}->${t.id}`, actor: agentId, action: 'carry', target: t.id,
            participants: v.agents.some(a => a.id === t.id) ? [t.id] : [],
            requires: [`holding:${object.id}`],
            provides: [`holding:${object.id}`, `near:${object.id}`, `near:${t.id}`],
            meta: { objectId: object.id, targetId: t.id }
          });
        }
      }
      return out;
    }),

    mk('release', ({ observation }) => {
      const v = view(observation);
      const ids = v.self?.held
        ? [v.self.held]
        : v.objects.filter(o => o.portable && (!o.heldBy || o.heldBy === agentId)).map(o => o.id);
      return ids.map(id => ({
        id: `release:${id}`, actor: agentId, action: 'release', target: id,
        requires: [`holding:${id}`], provides: [`near:${id}`]
      }));
    }),

    mk('consume', ({ observation }) => view(observation).objects
      .filter(o => ['food', 'water'].includes(o.type))
      .map(o => ({ id: `consume:${o.id}`, actor: agentId, action: 'consume', target: o.id, requires: [`near:${o.id}`] }))),

    mk('transfer', ({ observation }) => {
      const v = view(observation);
      const portable = v.self?.held
        ? v.objects.filter(o => o.id === v.self.held)
        : v.objects.filter(o => o.portable && (!o.heldBy || o.heldBy === agentId));
      const out = [];
      for (const object of portable) {
        for (const t of v.agents.filter(a => hypot(object, a) <= MOVE_DISTANCE + NEAR_RADIUS * 2)) {
          out.push({
            id: `transfer:${object.id}->${t.id}`, actor: agentId, action: 'transfer', target: t.id,
            participants: [t.id], requires: [`holding:${object.id}`, `near:${t.id}`],
            providesRelationKinds: ['transfer'], meta: { objectId: object.id }
          });
        }
      }
      return out;
    }),

    mk('strike', ({ observation }) => view(observation).objects
      .filter(o => ['material', 'composite'].includes(o.type))
      .map(o => ({
        id: `strike:${o.id}`, actor: agentId, action: 'strike', target: o.id,
        requires: [`near:${o.id}`],
        responsibility: { irreversibility: 0.1, affectedScope: 0.1, recoverability: 0.9, structuralImpact: o.composite ? 0.3 : 0.1 }
      }))),

    mk('combine', ({ observation }) => {
      const materials = view(observation).objects.filter(o => ['material', 'composite'].includes(o.type) && !o.heldBy);
      const out = [];
      for (let i = 0; i < materials.length; i++) {
        for (let j = i + 1; j < materials.length; j++) {
          const a = materials[i], b = materials[j];
          if (hypot(a, b) > MOVE_DISTANCE + NEAR_RADIUS * 2) continue;
          out.push({
            id: `combine:${a.id}+${b.id}`, actor: agentId, action: 'combine', target: `pair:${a.id}+${b.id}`,
            entities: [a.id, b.id], requires: [`near:${a.id}`, `near:${b.id}`],
            responsibility: { irreversibility: 0.25, affectedScope: 0.1, recoverability: 0.6, structuralImpact: 0.45 },
            meta: { componentIds: [a.id, b.id] }
          });
        }
      }
      return out;
    }),

    mk('rest', ({ observation }) => [{ id: `rest:${observation.id}`, actor: agentId, action: 'rest' }])
  ];
}

export function createCleanPrehistoricSocietyV1_1(args) {
  const society = createCleanPrehistoricSocietyV1(args);
  society.capabilitiesForAgent = agentId => makeCorrectedCapabilities(agentId);
  society.capabilityGenerationVersion = 'v1.1-no-ordered-starvation';
  return society;
}
