const clone = value => value == null ? value : structuredClone(value);

const SOURCE = 'founding-flow-world-v1';
const ACCESS = ['founder'];
const SIZE = 5;

function claimBase(id, kind, subjects, payload, time, temporality = 'persistent') {
  return {
    id,
    kind,
    temporality,
    subjects,
    payload,
    source: SOURCE,
    observed_at: time,
    available_at: time,
    accessible_to: ACCESS
  };
}

function posClaim(entity, x, y, time) {
  return claimBase(`pos:${entity}`, 'fact', [entity], { x, y }, time, 'persistent');
}

function typeClaim(entity, type, time) {
  return claimBase(`type:${entity}`, 'fact', [entity], { type }, time, 'persistent');
}

function participantClaim(entity, roles, time) {
  return claimBase(`participant:${entity}`, 'participant_state', [entity], {
    roles,
    available: true
  }, time, 'persistent');
}

function eventClaim(id, subjects, event, time, extra = {}) {
  return claimBase(id, 'event', subjects, { event, ...extra }, time, 'instant');
}

function relationClaim(id, from, to, kind, time) {
  return claimBase(id, 'relation', [from, to], { from, to, kind }, time, 'persistent');
}

export function actionKey(action) {
  if (!action) return 'none';
  if (action.op === 'step') return `step:${action.dx}:${action.dy}`;
  if (action.op === 'touch') return `touch:${action.target}`;
  return action.op;
}

function inside(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class FoundingFlowWorld {
  constructor() {
    this.reset();
  }

  reset() {
    this.tick = 0;
    this.positions = new Map([
      ['founder', { x: 2, y: 2 }],
      ['resource-A', { x: 1, y: 2 }],
      ['resource-B', { x: 3, y: 2 }],
      ['marker-M', { x: 2, y: 1 }],
      ['other-O', { x: 2, y: 3 }]
    ]);
    this.types = new Map([
      ['founder', 'founder'],
      ['resource-A', 'resource'],
      ['resource-B', 'resource'],
      ['marker-M', 'marker'],
      ['other-O', 'other']
    ]);
    this.heldBy = new Map();
    this.contacts = new Set();
    this.marks = new Set();
  }

  initialFrame() {
    const time = 't0';
    return {
      id: 'founding-flow:init',
      claims: [
        participantClaim('founder', ['founder'], time),
        participantClaim('other-O', ['other'], time),
        ...[...this.positions].map(([id, p]) => posClaim(id, p.x, p.y, time)),
        ...[...this.types].map(([id, type]) => typeClaim(id, type, time))
      ],
      meta: { phase: 'initial', tick: 0 }
    };
  }

  legalActions() {
    const founder = this.positions.get('founder');
    const actions = [];
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      if (inside(founder.x + dx, founder.y + dy)) actions.push({ op: 'step', dx, dy });
    }
    for (const [id, p] of this.positions) {
      if (id === 'founder') continue;
      if (distance(founder, p) <= 1) actions.push({ op: 'touch', target: id });
    }
    actions.push({ op: 'emit' });
    actions.push({ op: 'idle' });
    return actions;
  }

  _assertLegal(action) {
    const legal = new Set(this.legalActions().map(actionKey));
    const key = actionKey(action);
    if (!legal.has(key)) throw new Error(`Illegal primitive action: ${key}`);
  }

  apply(action, proposalRecordId) {
    this._assertLegal(action);
    this.tick += 1;
    const time = `a${this.tick}`;
    const claims = [];
    const founder = this.positions.get('founder');

    if (action.op === 'step') {
      const next = { x: founder.x + action.dx, y: founder.y + action.dy };
      this.positions.set('founder', next);
      claims.push(posClaim('founder', next.x, next.y, time));
      for (const [entity, holder] of this.heldBy) {
        if (holder === 'founder') {
          this.positions.set(entity, clone(next));
          claims.push(posClaim(entity, next.x, next.y, time));
        }
      }
      claims.push(eventClaim(`event:${time}:move`, ['founder'], 'moved', time, { dx: action.dx, dy: action.dy }));
    } else if (action.op === 'touch') {
      const target = action.target;
      const type = this.types.get(target);
      if (type === 'resource' && !this.heldBy.has(target)) {
        this.heldBy.set(target, 'founder');
        claims.push(relationClaim(`holds:founder:${target}`, 'founder', target, 'holds', time));
      } else if (type === 'other') {
        this.contacts.add(target);
        claims.push(relationClaim(`contact:founder:${target}`, 'founder', target, 'contacted', time));
      } else if (type === 'marker') {
        this.marks.add(target);
        claims.push(relationClaim(`mark:founder:${target}`, 'founder', target, 'touched-marker', time));
      }
      claims.push(eventClaim(`event:${time}:touch:${target}`, ['founder', target], 'touched', time, { target }));
    } else if (action.op === 'emit') {
      claims.push(eventClaim(`event:${time}:emit`, ['founder'], 'emitted-signal', time));
    } else {
      claims.push(eventClaim(`event:${time}:idle`, ['founder'], 'remained', time));
    }

    return {
      id: `founding-flow:actualization:${this.tick}`,
      claims,
      meta: {
        phase: 'actualization',
        actualization: true,
        proposalRecordId,
        primitiveAction: clone(action),
        actionKey: actionKey(action),
        tick: this.tick
      }
    };
  }

  exogenousFrame(index) {
    const n = index + 1;
    const time = `x${n}`;
    const claims = [];

    if (n === 1) {
      this.positions.set('other-O', { x: 2, y: 4 });
      claims.push(posClaim('other-O', 2, 4, time));
      claims.push(eventClaim('event:x1:other-move', ['other-O'], 'other-moved', time));
    } else if (n === 2) {
      this.positions.set('resource-C', { x: 0, y: 2 });
      this.types.set('resource-C', 'resource');
      claims.push(posClaim('resource-C', 0, 2, time));
      claims.push(typeClaim('resource-C', 'resource', time));
      claims.push(eventClaim('event:x2:new-resource', ['resource-C'], 'resource-appeared', time));
    } else if (n === 3) {
      claims.push(eventClaim('event:x3:west', ['env-west'], 'west-environment-event', time));
    } else if (n === 4) {
      claims.push(eventClaim('event:x4:other-signal', ['other-O'], 'other-emitted-signal', time));
    } else if (n === 5) {
      this.positions.set('resource-D', { x: 4, y: 4 });
      this.types.set('resource-D', 'resource');
      claims.push(posClaim('resource-D', 4, 4, time));
      claims.push(typeClaim('resource-D', 'resource', time));
      claims.push(eventClaim('event:x5:new-resource', ['resource-D'], 'resource-appeared', time));
    } else if (n === 6) {
      claims.push(claimBase('condition:light', 'constraint', ['environment'], { condition: 'light-changed' }, time, 'persistent'));
      claims.push(eventClaim('event:x6:light', ['environment'], 'light-condition-changed', time));
    } else {
      throw new Error(`No exogenous frame ${n}`);
    }

    return {
      id: `founding-flow:exogenous:${n}`,
      claims,
      meta: { phase: 'exogenous', index: n, tick: this.tick }
    };
  }

  snapshotState() {
    return {
      tick: this.tick,
      positions: Object.fromEntries([...this.positions].map(([k,v]) => [k, clone(v)])),
      types: Object.fromEntries(this.types),
      heldBy: Object.fromEntries(this.heldBy),
      contacts: [...this.contacts],
      marks: [...this.marks]
    };
  }
}

export function decodeRealitySnapshot(snapshot) {
  const persistent = snapshot?.currentPersistentClaims ?? [];
  const positions = new Map();
  const types = new Map();
  const relations = [];
  const participants = new Map();

  for (const claim of persistent) {
    if (claim.kind === 'fact' && claim.id.startsWith('pos:')) {
      positions.set(claim.subjects[0], { x: claim.payload.x, y: claim.payload.y });
    } else if (claim.kind === 'fact' && claim.id.startsWith('type:')) {
      types.set(claim.subjects[0], claim.payload.type);
    } else if (claim.kind === 'relation') {
      relations.push(claim);
    } else if (claim.kind === 'participant_state') {
      participants.set(claim.subjects[0], claim.payload);
    }
  }

  return {
    size: SIZE,
    positions,
    types,
    relations,
    participants,
    deltaSubjects: new Set(snapshot?.deltaSubjects ?? []),
    deltaClaims: snapshot?.deltaClaims ?? [],
    frameId: snapshot?.frameId ?? null,
    sequence: snapshot?.sequence ?? null
  };
}

export function enumeratePrimitiveActions(snapshot, actorId = 'founder') {
  const world = decodeRealitySnapshot(snapshot);
  const actor = world.positions.get(actorId);
  if (!actor) return [];
  const actions = [];
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    if (inside(actor.x + dx, actor.y + dy)) actions.push({ op: 'step', dx, dy });
  }
  for (const [id, p] of world.positions) {
    if (id === actorId) continue;
    if (distance(actor, p) <= 1) actions.push({ op: 'touch', target: id });
  }
  actions.push({ op: 'emit' });
  actions.push({ op: 'idle' });
  return actions;
}

export function spatialRelations(snapshot, actorId = 'founder') {
  const world = decodeRealitySnapshot(snapshot);
  const actor = world.positions.get(actorId);
  if (!actor) return [];
  const out = [];
  for (const [id, p] of world.positions) {
    if (id === actorId) continue;
    const d = distance(actor, p);
    out.push({
      id: `spatial:${actorId}:${id}`,
      from: actorId,
      to: id,
      kind: d <= 1 ? 'adjacent-to' : 'located-relative-to',
      context: `manhattan:${d}`,
      entities: [actorId, id],
      sourceEventId: snapshot.frameId,
      meta: { derivedFromGeometry: true, distance: d }
    });
  }
  return out;
}
