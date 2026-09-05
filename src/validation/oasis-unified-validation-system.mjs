const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];

const CLAIM_KINDS = new Set(['fact', 'relation', 'event', 'participant_state', 'constraint']);
const TEMPORALITY = new Set(['instant', 'persistent']);
const OPERATIONS = new Set(['assert', 'retract']);
const MODES = new Set(['historical-replay', 'interactive-actualization']);

const FORBIDDEN_REALITY_KEYS = new Set([
  'affordance',
  'affordances',
  'action_menu',
  'actionMenu',
  'candidate_actions',
  'candidateActions',
  'recommended_action',
  'recommendedAction',
  'preferred_action',
  'preferredAction',
  'reward',
  'score',
  'success_target',
  'successTarget',
  'winner'
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash32(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function scanForbiddenRealityKeys(value, path = '$', seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...scanForbiddenRealityKeys(item, `${path}[${index}]`, seen)));
    return hits;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_REALITY_KEYS.has(key)) hits.push(`${path}.${key}`);
    hits.push(...scanForbiddenRealityKeys(child, `${path}.${key}`, seen));
  }
  return hits;
}

function normalizeProvenance(claim) {
  invariant(claim.source != null && claim.source !== '', `Reality claim ${claim.id ?? '<unknown>'} is missing source provenance.`);
  invariant(claim.observed_at != null && claim.observed_at !== '', `Reality claim ${claim.id ?? '<unknown>'} is missing observed_at.`);
  invariant(claim.available_at != null && claim.available_at !== '', `Reality claim ${claim.id ?? '<unknown>'} is missing available_at.`);
  const accessibleTo = uniq(arr(claim.accessible_to));
  invariant(accessibleTo.length > 0, `Reality claim ${claim.id ?? '<unknown>'} is missing accessible_to.`);
  return {
    source: clone(claim.source),
    observed_at: clone(claim.observed_at),
    available_at: clone(claim.available_at),
    accessible_to: accessibleTo
  };
}

function normalizeClaim(rawClaim, frameId, index) {
  const claim = clone(rawClaim ?? {});
  claim.id = claim.id ?? `${frameId}:claim:${index}`;
  invariant(CLAIM_KINDS.has(claim.kind), `Unsupported reality claim kind at ${claim.id}: ${claim.kind}`);

  claim.temporality = claim.temporality ?? (claim.kind === 'event' ? 'instant' : null);
  invariant(TEMPORALITY.has(claim.temporality), `Reality claim ${claim.id} requires temporality=instant|persistent.`);
  if (claim.kind === 'event') invariant(claim.temporality === 'instant', `Event claim ${claim.id} must be instant.`);

  claim.op = claim.op ?? 'assert';
  invariant(OPERATIONS.has(claim.op), `Reality claim ${claim.id} has unsupported op=${claim.op}.`);
  if (claim.temporality === 'instant') invariant(claim.op === 'assert', `Instant claim ${claim.id} cannot be retracted; represent the later reality explicitly.`);

  claim.subjects = uniq(arr(claim.subjects));
  invariant(claim.subjects.length > 0, `Reality claim ${claim.id} requires at least one subject.`);

  claim.payload = clone(claim.payload ?? {});
  claim.provenance = normalizeProvenance(claim);

  delete claim.source;
  delete claim.observed_at;
  delete claim.available_at;
  delete claim.accessible_to;

  return claim;
}

function normalizeFrame(rawFrame, sequence) {
  const frame = clone(rawFrame ?? {});
  frame.id = frame.id ?? `reality:${sequence}`;
  frame.sequence = sequence;
  frame.claims = arr(frame.claims).map((claim, index) => normalizeClaim(claim, frame.id, index));
  invariant(frame.claims.length > 0, `Reality frame ${frame.id} contains no claims.`);
  frame.meta = clone(frame.meta ?? {});

  const forbidden = scanForbiddenRealityKeys(frame);
  invariant(forbidden.length === 0, `Reality frame ${frame.id} contains forbidden possibility/evaluation fields: ${forbidden.join(', ')}`);
  return frame;
}

function publicClaim(claim) {
  return {
    id: claim.id,
    kind: claim.kind,
    temporality: claim.temporality,
    op: claim.op,
    subjects: clone(claim.subjects),
    payload: clone(claim.payload),
    provenance: clone(claim.provenance)
  };
}

export class RealityLedger {
  constructor({ ledgerId = 'reality' } = {}) {
    this.ledgerId = ledgerId;
    this.frames = [];
    this.persistentClaims = new Map();
    this.claimHistory = [];
  }

  append(rawFrame) {
    const frame = normalizeFrame(rawFrame, this.frames.length);
    const deltaSubjects = new Set();
    const instantClaims = [];

    for (const claim of frame.claims) {
      for (const subject of claim.subjects) deltaSubjects.add(subject);
      this.claimHistory.push(clone(claim));

      if (claim.temporality === 'instant') {
        instantClaims.push(clone(claim));
        continue;
      }

      if (claim.op === 'retract') this.persistentClaims.delete(claim.id);
      else this.persistentClaims.set(claim.id, clone(claim));
    }

    this.frames.push(clone(frame));

    const snapshot = {
      ledgerId: this.ledgerId,
      frameId: frame.id,
      sequence: frame.sequence,
      deltaClaims: frame.claims.map(publicClaim),
      deltaSubjects: [...deltaSubjects],
      instantClaims: instantClaims.map(publicClaim),
      currentPersistentClaims: [...this.persistentClaims.values()].map(publicClaim),
      meta: clone(frame.meta)
    };
    snapshot.realityHash = hash32(stable(snapshot));
    return deepFreeze(snapshot);
  }

  currentSnapshot() {
    if (!this.frames.length) return null;
    const last = this.frames.at(-1);
    const snapshot = {
      ledgerId: this.ledgerId,
      frameId: last.id,
      sequence: last.sequence,
      deltaClaims: last.claims.map(publicClaim),
      deltaSubjects: uniq(last.claims.flatMap(claim => claim.subjects)),
      instantClaims: last.claims.filter(claim => claim.temporality === 'instant').map(publicClaim),
      currentPersistentClaims: [...this.persistentClaims.values()].map(publicClaim),
      meta: clone(last.meta)
    };
    snapshot.realityHash = hash32(stable(snapshot));
    return deepFreeze(snapshot);
  }

  export() {
    return clone({
      ledgerId: this.ledgerId,
      frames: this.frames,
      persistentClaims: [...this.persistentClaims.values()],
      claimHistory: this.claimHistory
    });
  }
}

export class ObserverLedger {
  constructor() {
    this.entries = [];
  }

  record(type, data) {
    invariant(!['winner', 'score', 'ranking'].includes(type), `ObserverLedger cannot create evaluative entry type=${type}.`);
    const entry = {
      index: this.entries.length,
      type,
      data: clone(data)
    };
    this.entries.push(entry);
    return clone(entry);
  }

  export() {
    return clone(this.entries);
  }
}

function assertDecisionNode(node) {
  invariant(node && typeof node === 'object', 'Decision node must be an object.');
  invariant(typeof node.id === 'string' && node.id.length > 0, 'Decision node requires a stable id.');
  invariant(typeof node.reset === 'function', `Decision node ${node.id} requires reset().`);
  invariant(typeof node.observe === 'function', `Decision node ${node.id} requires observe(realitySnapshot).`);
  invariant(typeof node.deliberate === 'function', `Decision node ${node.id} requires deliberate().`);
}

export class OASISUnifiedValidationSystem {
  constructor({ mode = 'historical-replay', systemId = 'oasis-unified-validation-system-v1' } = {}) {
    invariant(MODES.has(mode), `Unsupported validation mode: ${mode}`);
    this.mode = mode;
    this.systemId = systemId;
    this.nodes = new Map();
    this.observer = new ObserverLedger();
    this.sharedReality = mode === 'historical-replay' ? new RealityLedger({ ledgerId: 'shared-history' }) : null;
    this.branchRealities = new Map();
    this.activeProposalRecords = new Map();
    this.started = false;
  }

  registerDecisionNode(node) {
    invariant(!this.started, 'Decision nodes must be registered before reality flow starts.');
    assertDecisionNode(node);
    invariant(!this.nodes.has(node.id), `Duplicate decision node id: ${node.id}`);
    node.reset();
    this.nodes.set(node.id, node);
    if (this.mode === 'interactive-actualization') {
      this.branchRealities.set(node.id, new RealityLedger({ ledgerId: `branch:${node.id}` }));
    }
    this.observer.record('node-registered', { nodeId: node.id });
  }

  _closeHistoricalProposalsBeforeNextReality() {
    if (this.mode !== 'historical-replay' || !this.activeProposalRecords.size) return;
    for (const [nodeId, record] of this.activeProposalRecords) {
      this.observer.record('proposal-closed-unactualized', {
        nodeId,
        proposalRecordId: record.proposalRecordId,
        reason: 'Historical continuation is exogenous to the hypothetical proposal.'
      });
    }
    this.activeProposalRecords.clear();
  }

  async revealReality(rawFrame) {
    invariant(this.nodes.size > 0, 'Register at least one decision node before revealing reality.');
    this.started = true;

    if (this.mode === 'historical-replay') {
      this._closeHistoricalProposalsBeforeNextReality();
      const snapshot = this.sharedReality.append(rawFrame);
      this.observer.record('reality-revealed', {
        mode: this.mode,
        frameId: snapshot.frameId,
        sequence: snapshot.sequence,
        realityHash: snapshot.realityHash,
        deltaSubjects: snapshot.deltaSubjects
      });

      for (const [nodeId, node] of this.nodes) {
        const isolatedInput = deepFreeze(clone(snapshot));
        await node.observe(isolatedInput);
        this.observer.record('reality-delivered', {
          nodeId,
          frameId: snapshot.frameId,
          realityHash: snapshot.realityHash
        });
      }
      return clone(snapshot);
    }

    const delivered = {};
    for (const [nodeId, node] of this.nodes) {
      const ledger = this.branchRealities.get(nodeId);
      const snapshot = ledger.append(rawFrame);
      const isolatedInput = deepFreeze(clone(snapshot));
      await node.observe(isolatedInput);
      delivered[nodeId] = snapshot.realityHash;
      this.observer.record('reality-delivered', {
        nodeId,
        frameId: snapshot.frameId,
        realityHash: snapshot.realityHash
      });
    }
    this.observer.record('reality-revealed', {
      mode: this.mode,
      frameId: rawFrame.id ?? null,
      delivered
    });
    return clone(delivered);
  }

  async deliberateAll() {
    invariant(this.started, 'Reveal reality before deliberation.');
    const out = {};
    for (const [nodeId, node] of this.nodes) {
      const raw = await node.deliberate();
      const proposalRecordId = `${nodeId}:proposal:${this.observer.entries.length}`;
      const record = {
        proposalRecordId,
        nodeId,
        raw: clone(raw)
      };
      this.activeProposalRecords.set(nodeId, record);
      this.observer.record('deliberation-observed', record);
      out[nodeId] = clone(record);
    }
    return out;
  }

  async actualize({ nodeId, proposalRecordId, outcomeFrame, externalReceipt = null }) {
    invariant(this.mode === 'interactive-actualization', 'Historical replay forbids proposal actualization into the historical reality stream.');
    invariant(this.nodes.has(nodeId), `Unknown decision node: ${nodeId}`);
    const active = this.activeProposalRecords.get(nodeId);
    invariant(active, `No active proposal exists for ${nodeId}.`);
    invariant(active.proposalRecordId === proposalRecordId, `Proposal record mismatch for ${nodeId}.`);
    invariant(outcomeFrame && typeof outcomeFrame === 'object', 'Actualization requires an externally observed outcomeFrame.');

    this.observer.record('actualization-boundary', {
      nodeId,
      proposalRecordId,
      externalReceipt: clone(externalReceipt)
    });

    const ledger = this.branchRealities.get(nodeId);
    const snapshot = ledger.append(outcomeFrame);
    const node = this.nodes.get(nodeId);
    await node.observe(deepFreeze(clone(snapshot)));
    this.activeProposalRecords.delete(nodeId);

    this.observer.record('actualized-reality-observed', {
      nodeId,
      proposalRecordId,
      frameId: snapshot.frameId,
      realityHash: snapshot.realityHash
    });
    return clone(snapshot);
  }

  exportAuditTrail() {
    return clone({
      systemId: this.systemId,
      mode: this.mode,
      nodes: [...this.nodes.keys()],
      reality: this.sharedReality?.export() ?? Object.fromEntries(
        [...this.branchRealities.entries()].map(([id, ledger]) => [id, ledger.export()])
      ),
      observer: this.observer.export(),
      activeProposalRecords: [...this.activeProposalRecords.values()].map(clone)
    });
  }
}

export const UnifiedValidationContract = Object.freeze({
  claimKinds: [...CLAIM_KINDS],
  temporalities: [...TEMPORALITY],
  forbiddenRealityKeys: [...FORBIDDEN_REALITY_KEYS],
  modes: [...MODES]
});
