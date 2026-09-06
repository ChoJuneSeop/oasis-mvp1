import fs from 'node:fs/promises';
import {
  OASISUnifiedValidationSystem,
  RealityLedger
} from '../src/validation/oasis-unified-validation-system.mjs';
import {
  OASISRelationRoleCore,
  OASISAncestorV9Node,
  createFoundingV9AncestorNodes,
  roleAwareRelationKey
} from '../src/validation/founding-flow-v9-ancestors.mjs';
import {
  FoundingFlowV3World,
  actionKey
} from '../src/validation/founding-flow-v3-world.mjs';
import { processEvidenceEntities } from '../src/validation/founding-flow-v5-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectThrow(fn, contains = null) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  assert(error, `Expected throw${contains ? ` containing ${contains}` : ''}.`);
  if (contains) assert(String(error.message).includes(contains), `Unexpected error: ${error.message}`);
}

function participant(id = 'founder') {
  return { id, roles: [id === 'founder' ? 'founder' : 'other'], capabilities: ['*'], obligations: [], available: true };
}

function relation(id, from, to, kind = 'related', op = 'upsert', extra = {}) {
  return { id, from, to, kind, entities: [from, to], op, ...clone(extra) };
}

function primitiveAffordance(op = 'idle', target = null) {
  const id = op === 'touch' ? `touch:${target}` : op;
  return {
    id,
    op: 'upsert',
    actor: 'founder',
    action: id,
    target,
    entities: target ? ['founder', target] : ['founder'],
    requires: [],
    provides: [],
    requiresEntities: [],
    createsEntities: [],
    removesEntities: [],
    relations: [],
    consequences: [],
    obligations: [],
    resolves: [],
    violates: [],
    meta: { originalStepId: id, primitiveAction: target ? { op, target } : { op } }
  };
}

function createCore(seed = 777) {
  return new OASISRelationRoleCore({ realizationSeed: seed, anchorEntityId: 'founder' });
}

function auditNoAutomaticBaselineInjection() {
  const core = createCore();
  core.observe({
    id: 'baseline-empty-current',
    entities: ['founder'],
    participants: [participant('founder')]
  });
  core.setValidationPrimitiveAffordances([]);
  const d = core.deliberate();
  assert(d.choice == null, 'Core injected a choice when no affordance existed.');
  assert(d.continuationRequired === true, 'Core did not expose continuationRequired when no possibility existed.');
  return { status: 'PASS', continuationRequired: d.continuationRequired };
}

function auditFounderOnlyAndCoPresence() {
  const founderOnly = createCore();
  founderOnly.state.closedExperiences = [{
    id: 'experience:founder-only',
    sequence: 0,
    before: { changedEntities: ['founder'] },
    after: { changedEntities: ['founder'] },
    processRelations: [],
    participation: { current: ['founder'], historical: [] },
    choice: { entities: ['founder'], steps: [] },
    outcome: { affectedEntities: ['founder'], relations: [] }
  }];
  founderOnly.state.flow = [{ event: { id: 'now-founder' }, changedEntities: ['founder'] }];
  const founderField = founderOnly.reconstituteAffinityField();
  assert(founderField.reactivatedExperienceIds.length === 0, 'Founder-only commonality reactivated a completed experience.');

  const coPresence = createCore();
  const exp = {
    id: 'experience:co-presence',
    sequence: 0,
    before: { changedEntities: ['founder', 'other-O'] },
    after: { changedEntities: ['founder'] },
    processRelations: [],
    participation: { current: ['founder'], historical: [] },
    choice: { entities: ['founder'], steps: [] },
    outcome: { affectedEntities: ['founder'], relations: [] }
  };
  coPresence.state.closedExperiences = [exp];
  coPresence.state.flow = [{ event: { id: 'now-other' }, changedEntities: ['other-O'] }];
  const coField = coPresence.reconstituteAffinityField();
  assert(processEvidenceEntities(exp).length === 0, 'Raw co-presence leaked into process evidence entities.');
  assert(coField.reactivatedExperienceIds.length === 0, 'Co-presence-only experience reactivated.');

  const processMatch = createCore();
  processMatch.state.closedExperiences = [{
    id: 'experience:process-match',
    sequence: 0,
    before: { changedEntities: ['founder'] },
    after: { changedEntities: ['founder', 'resource-A'] },
    processRelations: [relation('holds:founder:resource-A', 'founder', 'resource-A', 'holds', 'upsert', { processRole: 'outcome-mutation' })],
    participation: { current: ['founder', 'resource-A'], historical: [] },
    choice: { entities: ['founder', 'resource-A'], steps: [] },
    outcome: { affectedEntities: ['founder', 'resource-A'], relations: [] }
  }];
  processMatch.state.flow = [{ event: { id: 'now-resource-A' }, changedEntities: ['resource-A'] }];
  const matchField = processMatch.reconstituteAffinityField();
  assert(matchField.reactivatedExperienceIds.includes('experience:process-match'), 'Actual process-evidence experience could not reactivate on matching current entity.');

  return {
    status: 'PASS',
    founderOnly: founderField.reactivatedExperienceIds,
    coPresenceOnly: coField.reactivatedExperienceIds,
    processMatch: matchField.reactivatedExperienceIds
  };
}

function auditCommonActorSupport() {
  const core = createCore();
  const field = {
    relations: [relation('rel:e1', 'founder', 'resource-A', 'holds', 'upsert', { processRole: 'outcome-mutation' })],
    reactivated: [{
      experienceId: 'e1',
      relations: [relation('rel:e1', 'founder', 'resource-A', 'holds', 'upsert', { processRole: 'outcome-mutation' })],
      choice: { entities: ['founder', 'resource-A'] },
      outcome: { affectedEntities: ['founder', 'resource-A'] }
    }]
  };
  const idle = core._supportForAffordance(primitiveAffordance('idle'), field);
  const touch = core._supportForAffordance(primitiveAffordance('touch', 'resource-A'), field);
  assert(idle.experienceIds.length === 0, 'Founder-only overlap gave unrelated idle past-experience support.');
  assert(touch.experienceIds.includes('e1'), 'Matching non-founder target lost legitimate past-experience support.');
  return { status: 'PASS', idleSupport: idle, targetSupport: touch };
}

function auditDirectionality() {
  const make = (rel) => {
    const core = createCore(10);
    core.observe({
      id: 'direction-frame',
      entities: ['founder', 'other-O'],
      participants: [participant('founder'), participant('other-O')],
      relations: [rel]
    });
    core.setValidationPrimitiveAffordances([primitiveAffordance('idle')]);
    return core.deliberate();
  };
  const forward = make(relation('r', 'founder', 'other-O', 'contacted'));
  const reverse = make(relation('r', 'other-O', 'founder', 'contacted'));
  assert(stable(forward.field.relationSignature) !== stable(reverse.field.relationSignature), 'Relation direction A→B and B→A collapsed.');
  assert(forward.structuralExpansion.structureKey !== reverse.structuralExpansion.structureKey, 'Directed relation difference did not reach structural identity.');
  return {
    status: 'PASS',
    forward: forward.field.relationSignature,
    reverse: reverse.field.relationSignature
  };
}

function auditSimultaneousPermutation() {
  const run = relations => {
    const core = createCore(22);
    core.observe({
      id: 'same-time-relations',
      time: 'T0',
      entities: ['founder', 'A', 'B'],
      participants: [participant('founder'), participant('A'), participant('B')],
      relations
    });
    core.setValidationPrimitiveAffordances([primitiveAffordance('idle')]);
    return core.deliberate();
  };
  const rA = relation('rA', 'founder', 'A', 'adjacent-to', 'upsert', { meta: { derivedFromGeometry: true } });
  const rB = relation('rB', 'founder', 'B', 'adjacent-to', 'upsert', { meta: { derivedFromGeometry: true } });
  const first = run([rA, rB]);
  const second = run([rB, rA]);

  assert(
    stable([...first.field.relationSignature].sort()) === stable([...second.field.relationSignature].sort()),
    'Permutation fixture does not contain the same semantic relation set.'
  );
  assert(first.choice?.id === second.choice?.id, 'Same-time relation array permutation changed the proposal.');
  assert(
    first.structuralExpansion.structureKey === second.structuralExpansion.structureKey,
    'Same-time relation array permutation changed structural identity; serialization order became a hidden semantic condition.'
  );
  return {
    status: 'PASS',
    firstSignature: first.field.relationSignature,
    secondSignature: second.field.relationSignature,
    structureKey: first.structuralExpansion.structureKey
  };
}

function auditHistoricalOrderPreserved() {
  const run = order => {
    const core = createCore(33);
    for (let i = 0; i < order.length; i++) {
      const target = order[i];
      core.observe({
        id: `history-${i}-${target}`,
        time: `T${i}`,
        entities: ['founder', target],
        participants: [participant('founder'), participant(target)],
        relations: [relation(`rel-${target}`, 'founder', target, 'observed-with')]
      });
    }
    return core.exportState().flow.map(entry => ({
      sequence: entry.event.sequence,
      eventId: entry.event.id,
      relationTargets: entry.event.relations.map(r => r.to)
    }));
  };
  const ab = run(['A', 'B']);
  const ba = run(['B', 'A']);
  assert(stable(ab) !== stable(ba), 'Distinct temporal relation histories were normalized into the same flow history.');
  assert(ab[0].relationTargets[0] === 'A' && ab[1].relationTargets[0] === 'B', 'A→B history order was not preserved.');
  assert(ba[0].relationTargets[0] === 'B' && ba[1].relationTargets[0] === 'A', 'B→A history order was not preserved.');
  return { status: 'PASS', ab, ba };
}

async function auditFarSpatialAndComparatorIndependence() {
  const world = new FoundingFlowV3World();
  const ledger = new RealityLedger({ ledgerId: 'overall-far-spatial' });
  const snapshot = ledger.append(world.initialFrame());
  const nodes = createFoundingV9AncestorNodes(101);
  assert(nodes.length === 7 && new Set(nodes.map(n => n.id)).size === 7, 'Expected seven distinct archetype nodes.');
  for (const node of nodes.filter(n => n.id !== 'oasis')) {
    assert(!('core' in node), `Comparator ${node.id} contains OASIS core state.`);
    await node.observe(snapshot);
  }
  const oasis = nodes.find(n => n.id === 'oasis');
  await oasis.observe(snapshot);
  const state = oasis.exportState();
  assert(!state.world.relations.some(r => r.kind === 'located-relative-to'), 'OASIS far located-relative-to bridge regressed.');
  const temporal = nodes.find(n => n.id === 'temporal-relational');
  assert(!arr(temporal.relationHistory).some(r => r.kind === 'located-relative-to'), 'Temporal comparator far located-relative-to bridge regressed.');
  return { status: 'PASS', nodeIds: nodes.map(n => n.id) };
}

function contactRelation(op = 'upsert') {
  return relation('contact:founder:other-O', 'founder', 'other-O', 'contacted', op);
}

function createRoleAuditCore() {
  const core = createCore(44);
  core.observe({
    id: 'formation-event',
    entities: ['founder', 'other-O'],
    participants: [participant('founder'), participant('other-O')],
    relations: [contactRelation('upsert')]
  });
  core.observe({
    id: 'later-current-flow',
    entities: ['other-O'],
    facts: [{ id: 'other-present', entities: ['other-O'], value: { present: true }, op: 'upsert' }]
  });
  core.setValidationPrimitiveAffordances([primitiveAffordance('idle')]);
  return core;
}

function auditStateMutationRoleSeparation() {
  const noMutation = createRoleAuditCore();
  const d1 = noMutation.deliberate();
  const exp1 = noMutation.actualize(d1.choice.id, {
    id: 'no-relation-outcome',
    entities: ['founder'],
    facts: [{ id: 'idle-event', entities: ['founder'], value: { idle: true }, op: 'upsert' }]
  });
  const records1 = exp1.processRelations.filter(r => r.id === 'contact:founder:other-O');
  assert(records1.filter(r => r.processRole === 'current-state').length === 1, 'Persistent relation not preserved exactly once as current-state.');
  assert(records1.filter(r => r.processRole === 'outcome-mutation').length === 0, 'No-mutation outcome fabricated outcome-mutation relation.');

  const removal = createRoleAuditCore();
  const d2 = removal.deliberate();
  const exp2 = removal.actualize(d2.choice.id, {
    id: 'remove-outcome',
    entities: ['founder', 'other-O'],
    relations: [contactRelation('remove')]
  });
  const records2 = exp2.processRelations.filter(r => r.id === 'contact:founder:other-O');
  const state = records2.find(r => r.processRole === 'current-state');
  const remove = records2.find(r => r.processRole === 'outcome-mutation' && r.op === 'remove');
  assert(state && remove, 'State/remove collision lost either current-state or actual remove mutation.');
  assert(roleAwareRelationKey(state) !== roleAwareRelationKey(remove), 'State and remove mutation structural identities collapsed.');
  assert(removal.exportState().world.relations.every(r => r.id !== 'contact:founder:other-O'), 'Historical remove was not applied correctly to live current state.');

  const keys = new Set([
    roleAwareRelationKey({ from: 'founder', to: 'other-O', kind: 'contacted', processRole: 'current-state', op: 'upsert' }),
    roleAwareRelationKey({ from: 'founder', to: 'other-O', kind: 'contacted', processRole: 'outcome-mutation', op: 'upsert' }),
    roleAwareRelationKey({ from: 'founder', to: 'other-O', kind: 'contacted', processRole: 'outcome-mutation', op: 'remove' }),
    roleAwareRelationKey({ from: 'founder', to: 'other-O', kind: 'contacted', processRole: 'derived-observation' }),
    roleAwareRelationKey({ from: 'founder', to: 'other-O', kind: 'contacted', processRole: 'choice-relation' })
  ]);
  assert(keys.size === 5, 'Relation process roles are not structurally distinct.');
  return {
    status: 'PASS',
    noMutationRecords: records1,
    removalRecords: records2,
    roleKeys: [...keys]
  };
}

async function auditFutureLeakageSingleActualizationAndNextPresent() {
  const node = new OASISAncestorV9Node(77);
  const system = new OASISUnifiedValidationSystem({ mode: 'interactive-actualization', systemId: 'overall-future-boundary' });
  system.registerDecisionNode(node);
  const world = new FoundingFlowV3World();
  await system.revealReality(world.initialFrame());
  const proposals = await system.deliberateAll();
  const record = proposals.oasis;
  assert(record?.raw?.action, 'OASIS produced no primitive action in future-boundary audit.');

  const before = node.exportState();
  const outcome = world.apply(record.raw.action, record.proposalRecordId);
  assert(!stable(before.flow).includes(outcome.id), 'Externally generated future outcome already existed in OASIS flow before actualization.');
  assert(before.closedExperiences.length === 0, 'Completed experience existed before first actualization.');

  const snapshot = await system.actualize({
    nodeId: 'oasis',
    proposalRecordId: record.proposalRecordId,
    outcomeFrame: outcome,
    externalReceipt: { audit: 'pre-main-overall' }
  });
  const after = node.exportState();
  assert(after.closedExperiences.length === 1, 'Actualized outcome did not create exactly one completed experience.');
  const exp = after.closedExperiences[0];
  assert(exp.outcome.eventId === outcome.id, 'Completed experience outcome provenance does not point to actual outcome frame.');
  assert(after.flow.at(-1).event.id === outcome.id, 'Actual outcome did not become the next OASIS current flow event.');
  assert(snapshot.frameId === outcome.id, 'Branch RealityLedger did not advance to actual outcome frame.');
  for (const outcomeRelation of exp.outcome.relations ?? []) {
    assert(
      exp.processRelations.some(r => r.processRole === 'outcome-mutation' && r.id === outcomeRelation.id && r.op === outcomeRelation.op),
      `Actual outcome relation ${outcomeRelation.id}/${outcomeRelation.op} missing from outcome-mutation record.`
    );
  }
  await expectThrow(() => system.actualize({
    nodeId: 'oasis',
    proposalRecordId: record.proposalRecordId,
    outcomeFrame: outcome
  }), 'No active proposal');

  return {
    status: 'PASS',
    actionKey: actionKey(record.raw.action),
    outcomeFrameId: outcome.id,
    completedExperienceId: exp.id
  };
}

async function auditForbiddenRegressionScan() {
  const paths = [
    'src/oasis-core.mjs',
    'src/oasis-integrated-core.mjs',
    'src/oasis-reference-core.mjs',
    'src/validation/founding-flow-v4-ancestors.mjs',
    'src/validation/founding-flow-v5-ancestors.mjs',
    'src/validation/founding-flow-v7-ancestors.mjs',
    'src/validation/founding-flow-v9-ancestors.mjs'
  ];
  const source = (await Promise.all(paths.map(async path => `${path}\n${await fs.readFile(path, 'utf8')}`))).join('\n');
  const checks = [
    ['argmax', /\bargmax\b/i],
    ['top-k', /\btop[-_ ]?k\b/i],
    ['possibilities[0]', /possibilities\s*\[\s*0\s*\]/i],
    ['reward assignment', /\breward\s*[:=]/i],
    ['score assignment', /\bscore\s*[:=]/i],
    ['numeric danger threshold', /\bdanger\s*(?:>=|<=|>|<)\s*\d/i],
    ['numeric risk threshold', /\brisk\s*(?:>=|<=|>|<)\s*\d/i],
    ['contaminated v2 harness import', /blind-historical-flow-v2/i]
  ];
  const hits = checks.filter(([, regex]) => regex.test(source)).map(([name]) => name);
  assert(hits.length === 0, `Forbidden OASIS validation regression patterns found: ${hits.join(', ')}`);
  return { status: 'PASS', scannedFiles: paths, hits };
}

async function main() {
  const protocol = await fs.readFile('experiments/pre-main-overall-audit/PROTOCOL.md', 'utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol), 'Overall audit protocol contains forbidden explicit target declaration.');

  const report = {
    audit: 'OASIS Pre-Main Overall Implementation Audit',
    status: 'RUNNING',
    checks: {}
  };

  report.checks.noAutomaticBaselineInjection = auditNoAutomaticBaselineInjection();
  report.checks.completedExperienceEligibility = auditFounderOnlyAndCoPresence();
  report.checks.commonActorSupport = auditCommonActorSupport();
  report.checks.directionality = auditDirectionality();
  report.checks.simultaneousClaimPermutation = auditSimultaneousPermutation();
  report.checks.historicalOrderPreserved = auditHistoricalOrderPreserved();
  report.checks.farSpatialAndComparatorIndependence = await auditFarSpatialAndComparatorIndependence();
  report.checks.stateMutationRoleSeparation = auditStateMutationRoleSeparation();
  report.checks.futureLeakageSingleActualizationAndNextPresent = await auditFutureLeakageSingleActualizationAndNextPresent();
  report.checks.forbiddenRegressionScan = await auditForbiddenRegressionScan();

  report.status = 'PASS';
  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/oasis-pre-main-overall-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

await main();
