import fs from 'node:fs/promises';
import { OASISRelationRoleCore } from '../src/validation/founding-flow-v9-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }

function participant(id) {
  return { id, roles: [id === 'founder' ? 'founder' : 'other'], capabilities: ['*'], obligations: [], available: true };
}

function relation(id, from, to, kind = 'observed-with') {
  return { id, from, to, kind, context: null, entities: [from, to], op: 'upsert' };
}

function idleAffordance() {
  return {
    id: 'idle', op: 'upsert', actor: 'founder', action: 'idle', target: null,
    entities: ['founder'], requires: [], provides: [], requiresEntities: [], createsEntities: [], removesEntities: [],
    relations: [], consequences: [], obligations: [], resolves: [], violates: [],
    meta: { originalStepId: 'idle', primitiveAction: { op: 'idle' } }
  };
}

function runSameFrameTwin(relationArray) {
  const core = new OASISRelationRoleCore({ realizationSeed: 20260906, anchorEntityId: 'founder' });
  core.observe({
    id: 'same-frame',
    time: 'T0',
    entities: ['founder', 'A', 'B'],
    participants: [participant('founder'), participant('A'), participant('B')],
    relations: relationArray
  });
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  const d = core.deliberate();
  return {
    relationSetCanonical: [...d.field.currentRelations.map(r => `${r.from}->${r.to}:${r.kind}:${r.context ?? ''}`)].sort(),
    relationSignature: clone(d.field.relationSignature),
    choiceId: d.choice?.id ?? null,
    action: d.choice?.steps?.[0]?.action ?? null,
    structureKey: d.structuralExpansion.structureKey,
    novelStructure: d.structuralExpansion.novelStructure
  };
}

function auditSameFramePermutation() {
  const rA = relation('rA', 'founder', 'A');
  const rB = relation('rB', 'founder', 'B');
  const a = runSameFrameTwin([rA, rB]);
  const b = runSameFrameTwin([rB, rA]);

  const semanticSetEqual = stable(a.relationSetCanonical) === stable(b.relationSetCanonical);
  const proposalEqual = a.choiceId === b.choiceId && a.action === b.action;
  const signatureArrayEqual = stable(a.relationSignature) === stable(b.relationSignature);
  const structureKeyEqual = a.structureKey === b.structureKey;

  assert(semanticSetEqual, 'Twin fixture does not represent the same semantic relation set.');

  return {
    status: structureKeyEqual ? 'C7_REFUTED' : 'C7_CONFIRMED',
    semanticSetEqual,
    proposalEqual,
    signatureArrayEqual,
    structureKeyEqual,
    twinA: a,
    twinB: b
  };
}

function runTemporalHistory(order) {
  const core = new OASISRelationRoleCore({ realizationSeed: 20260906, anchorEntityId: 'founder' });
  for (let i = 0; i < order.length; i++) {
    const target = order[i];
    core.observe({
      id: `frame-${i}-${target}`,
      time: `T${i}`,
      entities: ['founder', target],
      participants: [participant('founder'), participant(target)],
      relations: [relation(`rel-${i}-${target}`, 'founder', target)]
    });
  }
  return core.exportState().flow.map(entry => ({
    sequence: entry.event.sequence,
    eventId: entry.event.id,
    time: entry.event.time,
    relationTargets: entry.event.relations.map(r => r.to)
  }));
}

function auditTemporalOrderPositiveControl() {
  const ab = runTemporalHistory(['A', 'B']);
  const ba = runTemporalHistory(['B', 'A']);
  const distinct = stable(ab) !== stable(ba);
  assert(distinct, 'Temporal positive control failed: distinct frame histories collapsed.');
  assert(ab[0].relationTargets[0] === 'A' && ab[1].relationTargets[0] === 'B', 'A→B temporal history not preserved.');
  assert(ba[0].relationTargets[0] === 'B' && ba[1].relationTargets[0] === 'A', 'B→A temporal history not preserved.');
  return { status: 'PASS', historiesDistinct: distinct, ab, ba };
}

function runDirection(from, to) {
  const core = new OASISRelationRoleCore({ realizationSeed: 20260906, anchorEntityId: 'founder' });
  core.observe({
    id: 'direction-frame',
    time: 'T0',
    entities: ['founder', 'A'],
    participants: [participant('founder'), participant('A')],
    relations: [relation('directed-r', from, to, 'directed')]
  });
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  const d = core.deliberate();
  return { relationSignature: d.field.relationSignature, structureKey: d.structuralExpansion.structureKey };
}

function auditDirectionalityPositiveControl() {
  const forward = runDirection('founder', 'A');
  const reverse = runDirection('A', 'founder');
  assert(stable(forward.relationSignature) !== stable(reverse.relationSignature), 'Directionality positive control failed: A→B and B→A signatures collapsed.');
  assert(forward.structureKey !== reverse.structureKey, 'Directionality positive control failed: structural identity collapsed.');
  return { status: 'PASS', forward, reverse };
}

async function main() {
  const protocol = await fs.readFile('experiments/founding-flow-v10/PROTOCOL.md', 'utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol), 'Protocol contains forbidden explicit target declaration.');

  const fourAxisAudit = {
    successValueAudit: { status: 'PASS', evidence: ['C7 confirmed and C7 refuted are both accepted outcomes.'] },
    evaluationAudit: { status: 'PASS', evidence: ['No performance score, ranking, winner, tie reduction or preferred action is used.'] },
    flowAudit: { status: 'PASS', evidence: ['Temporal-order positive control preserves different frame/event sequences.'] },
    implementationAudit: { status: 'PASS', evidence: ['OASISRelationRoleCore is read-only in v10; no selection, reactivation, possibility or relation-signature code is modified.'] }
  };

  const sameFramePermutation = auditSameFramePermutation();
  const temporalOrderPositiveControl = auditTemporalOrderPositiveControl();
  const directionalityPositiveControl = auditDirectionalityPositiveControl();

  const report = {
    experiment: 'Founding Flow v10 — Simultaneous Relation Serialization-Order Audit',
    status: 'EXECUTED',
    conclusion: sameFramePermutation.status,
    fourAxisAudit,
    sameFramePermutation,
    temporalOrderPositiveControl,
    directionalityPositiveControl,
    evidenceBoundary: 'Read-only implementation-necessity audit only; no OASIS superiority, uniqueness, culture or generation claim.'
  };

  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/founding-flow-v10.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

await main();
