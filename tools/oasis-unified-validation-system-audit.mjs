import {
  OASISUnifiedValidationSystem,
  RealityLedger
} from '../src/validation/oasis-unified-validation-system.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectThrow(fn, contains) {
  let thrown = null;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `Expected error containing: ${contains}`);
  if (contains) assert(String(thrown.message).includes(contains), `Unexpected error: ${thrown.message}`);
}

class ProbeNode {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.received = [];
    this.mutationBlocked = [];
    this.round = 0;
  }

  observe(snapshot) {
    this.received.push(snapshot);
    let blocked = false;
    try {
      snapshot.deltaSubjects.push('illegal-mutation');
    } catch {
      blocked = true;
    }
    this.mutationBlocked.push(blocked);
  }

  deliberate() {
    this.round += 1;
    return {
      trace: { round: this.round, noticedSubjects: [...(this.received.at(-1)?.deltaSubjects ?? [])] },
      proposal: { verb: `probe-${this.id}-${this.round}` }
    };
  }
}

const provenance = {
  source: 'audit-fixture',
  observed_at: 'T0',
  available_at: 'T0',
  accessible_to: ['all-nodes']
};

const frame0 = {
  id: 'frame-0',
  claims: [
    {
      id: 'relation:A:B',
      kind: 'relation',
      temporality: 'persistent',
      op: 'assert',
      subjects: ['A', 'B'],
      payload: { from: 'A', to: 'B', relation: 'connected' },
      ...provenance
    },
    {
      id: 'event:E0',
      kind: 'event',
      temporality: 'instant',
      subjects: ['A'],
      payload: { verb: 'arrived' },
      ...provenance
    }
  ]
};

const frame1 = {
  id: 'frame-1',
  claims: [
    {
      id: 'relation:A:B',
      kind: 'relation',
      temporality: 'persistent',
      op: 'retract',
      subjects: ['A', 'B'],
      payload: { reason: 'externally-observed-end' },
      source: 'audit-fixture',
      observed_at: 'T1',
      available_at: 'T1',
      accessible_to: ['all-nodes']
    },
    {
      id: 'event:E1',
      kind: 'event',
      temporality: 'instant',
      subjects: ['B'],
      payload: { verb: 'departed' },
      source: 'audit-fixture',
      observed_at: 'T1',
      available_at: 'T1',
      accessible_to: ['all-nodes']
    }
  ]
};

// 1. Reality contract rejects experimenter-authored action menus/evaluation fields.
{
  const ledger = new RealityLedger();
  await expectThrow(() => ledger.append({
    id: 'bad-affordance',
    claims: [{
      id: 'bad-claim',
      kind: 'fact',
      temporality: 'instant',
      subjects: ['A'],
      payload: { affordances: ['hold', 'withdraw'] },
      ...provenance
    }]
  }), 'forbidden possibility/evaluation fields');

  await expectThrow(() => ledger.append({
    id: 'bad-provenance',
    claims: [{
      id: 'missing-source',
      kind: 'fact',
      temporality: 'instant',
      subjects: ['A'],
      payload: { state: 'known' },
      observed_at: 'T0',
      available_at: 'T0',
      accessible_to: ['all-nodes']
    }]
  }), 'missing source provenance');
}

// 2. Historical replay: same canonical reality, isolated immutable copies, no proposal->reality leakage.
{
  const a = new ProbeNode('A-node');
  const b = new ProbeNode('B-node');
  const system = new OASISUnifiedValidationSystem({ mode: 'historical-replay' });
  system.registerDecisionNode(a);
  system.registerDecisionNode(b);

  const snap0 = await system.revealReality(frame0);
  assert(a.received.length === 1 && b.received.length === 1, 'Both nodes must receive frame0.');
  assert(a.received[0] !== b.received[0], 'Decision nodes must receive independent snapshot objects.');
  assert(a.received[0].realityHash === b.received[0].realityHash, 'Decision nodes must receive the same canonical reality hash.');
  assert(a.received[0].realityHash === snap0.realityHash, 'Delivered reality hash must equal shared ledger hash.');
  assert(a.mutationBlocked[0] && b.mutationBlocked[0], 'Delivered reality snapshots must be immutable.');
  assert(snap0.currentPersistentClaims.some(c => c.id === 'relation:A:B'), 'Persistent relation must be current after assertion.');
  assert(!snap0.currentPersistentClaims.some(c => c.id === 'event:E0'), 'Instant event must never become persistent current state.');

  const proposals = await system.deliberateAll();
  const realityBefore = JSON.stringify(system.exportAuditTrail().reality);
  assert(!realityBefore.includes('probe-A-node-1') && !realityBefore.includes('probe-B-node-1'), 'Unrealized proposals must not enter Reality Ledger.');

  await expectThrow(() => system.actualize({
    nodeId: 'A-node',
    proposalRecordId: proposals['A-node'].proposalRecordId,
    outcomeFrame: frame1
  }), 'Historical replay forbids');

  const snap1 = await system.revealReality(frame1);
  assert(!snap1.currentPersistentClaims.some(c => c.id === 'relation:A:B'), 'Retracted persistent relation must not remain current.');
  assert(!snap1.currentPersistentClaims.some(c => c.id === 'event:E1'), 'New instant event must not persist.');

  const trail = system.exportAuditTrail();
  const closed = trail.observer.filter(entry => entry.type === 'proposal-closed-unactualized');
  assert(closed.length === 2, 'Historical proposals must be explicitly closed before the next exogenous reality reveal.');
  const realityAfter = JSON.stringify(trail.reality);
  assert(!realityAfter.includes('probe-A-node-1') && !realityAfter.includes('probe-B-node-1'), 'Closed historical proposals must remain outside Reality Ledger.');
  assert(!trail.observer.some(entry => ['winner', 'score', 'ranking'].includes(entry.type)), 'Observer must not create winner/score/ranking records.');
}

// 3. Interactive actualization: identical initial reality, then independent causal branches.
{
  const a = new ProbeNode('interactive-A');
  const b = new ProbeNode('interactive-B');
  const system = new OASISUnifiedValidationSystem({ mode: 'interactive-actualization' });
  system.registerDecisionNode(a);
  system.registerDecisionNode(b);

  const hashes = await system.revealReality(frame0);
  assert(hashes['interactive-A'] === hashes['interactive-B'], 'Interactive branches must start from the same canonical reality hash.');

  const proposals = await system.deliberateAll();
  const outcome = {
    id: 'A-outcome',
    claims: [{
      id: 'event:A-actualized',
      kind: 'event',
      temporality: 'instant',
      subjects: ['A'],
      payload: { verb: 'externally-observed-consequence' },
      source: 'independent-environment',
      observed_at: 'T1',
      available_at: 'T1',
      accessible_to: ['interactive-A']
    }]
  };

  await system.actualize({
    nodeId: 'interactive-A',
    proposalRecordId: proposals['interactive-A'].proposalRecordId,
    outcomeFrame: outcome,
    externalReceipt: { environment: 'audit-independent-environment' }
  });

  const trail = system.exportAuditTrail();
  assert(trail.reality['interactive-A'].frames.length === 2, 'Actualized branch must receive the observed outcome reality.');
  assert(trail.reality['interactive-B'].frames.length === 1, 'Non-actualized branch must not receive another system\'s outcome.');
  assert(a.received.length === 2, 'Actualized node must observe its new reality.');
  assert(b.received.length === 1, 'Other node must remain isolated from the actualized branch.');
}

console.log('PASS OASIS unified validation system contamination-boundary audit');
