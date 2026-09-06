import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowWorld, actionKey } from '../src/validation/founding-flow-world.mjs';
import {
  createFoundingV2AncestorNodes,
  TemporalRelationalAncestorV2Node,
  EpisodicAncestorV2Node,
  PredictiveWorldModelAncestorV2Node,
  GoalUtilityAncestorV2Node,
  goalCompletion,
  sharedGoalForSeedV2
} from '../src/validation/founding-flow-v2-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
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

function stripLedgerSpecific(snapshot) {
  return {
    frameId: snapshot.frameId,
    sequence: snapshot.sequence,
    deltaClaims: snapshot.deltaClaims,
    deltaSubjects: snapshot.deltaSubjects,
    instantClaims: snapshot.instantClaims,
    currentPersistentClaims: snapshot.currentPersistentClaims,
    meta: snapshot.meta
  };
}

function reverseClaimOrder(snapshot) {
  const out = clone(snapshot);
  out.deltaClaims = [...(out.deltaClaims ?? [])].reverse();
  out.instantClaims = [...(out.instantClaims ?? [])].reverse();
  out.currentPersistentClaims = [...(out.currentPersistentClaims ?? [])].reverse();
  return out;
}

async function temporalInsertionOrderAudit(snapshot) {
  const a = new TemporalRelationalAncestorV2Node(101);
  const b = new TemporalRelationalAncestorV2Node(101);
  await a.observe(snapshot);
  await b.observe(reverseClaimOrder(snapshot));
  const pa = await a.deliberate();
  const pb = await b.deliberate();
  assert(
    stable(pa.candidateKeys) === stable(pb.candidateKeys),
    'Temporal-Relational v2 candidate frontier changes under equivalent claim insertion order.'
  );
  assert(
    pa.actionKey === pb.actionKey,
    'Temporal-Relational v2 realized primitive changes under equivalent claim insertion order.'
  );
  return {
    status: 'PASS',
    candidateKeys: pa.candidateKeys,
    actionKey: pa.actionKey
  };
}

async function episodicLocalityAudit(snapshot) {
  const node = new EpisodicAncestorV2Node(101);
  node.episodes = [{
    contextSubjects: ['far-Z'],
    outcomeSubjects: [],
    action: { op: 'emit' },
    actionKey: 'emit'
  }];

  const test = clone(snapshot);
  test.deltaSubjects = ['env-west'];
  test.deltaClaims = [{
    id: 'event:audit:west',
    kind: 'event',
    temporality: 'instant',
    subjects: ['env-west'],
    payload: { event: 'audit-west' },
    source: 'founding-flow-v2-audit',
    observed_at: 'audit',
    available_at: 'audit',
    accessible_to: ['founder']
  }];
  test.instantClaims = clone(test.deltaClaims);
  test.currentPersistentClaims = [
    ...(test.currentPersistentClaims ?? []),
    {
      id: 'pos:far-Z',
      kind: 'fact',
      temporality: 'persistent',
      subjects: ['far-Z'],
      payload: { x: 0, y: 0 },
      source: 'founding-flow-v2-audit',
      observed_at: 'audit',
      available_at: 'audit',
      accessible_to: ['founder']
    },
    {
      id: 'type:far-Z',
      kind: 'fact',
      temporality: 'persistent',
      subjects: ['far-Z'],
      payload: { type: 'resource' },
      source: 'founding-flow-v2-audit',
      observed_at: 'audit',
      available_at: 'audit',
      accessible_to: ['founder']
    }
  ];

  await node.observe(test);
  const proposal = await node.deliberate();
  assert(
    proposal.recalledEpisodeIndices.length === 0,
    'Episodic v2 recalled an episode solely because an unrelated persistent subject existed globally.'
  );
  return {
    status: 'PASS',
    recalledEpisodeIndices: proposal.recalledEpisodeIndices,
    currentLocalSubjects: proposal.currentLocalSubjects
  };
}

async function goalTerminalAudit() {
  const seed = 101;
  const target = sharedGoalForSeedV2(seed);
  const world = new FoundingFlowWorld();
  const ledger = new RealityLedger({ ledgerId: 'goal-terminal-audit' });
  ledger.append(world.initialFrame());
  const touch = world.legalActions().find(a => a.op === 'touch' && a.target === target);
  assert(touch, `Audit target ${target} is not initially touchable.`);
  ledger.append(world.apply(touch, 'audit-proposal'));
  const snapshot = ledger.currentSnapshot();
  const completion = goalCompletion(snapshot, target);
  assert(completion.completed, 'Pre-registered goal terminal relation was not recognized after actualization.');

  const predictive = new PredictiveWorldModelAncestorV2Node(seed);
  const utility = new GoalUtilityAncestorV2Node(seed);
  await predictive.observe(snapshot);
  await utility.observe(snapshot);
  const p = await predictive.deliberate();
  const u = await utility.deliberate();
  assert(p.goalCompletion.completed && u.goalCompletion.completed, 'Goal completion not propagated to both goal-based archetypes.');
  assert(p.candidateKeys.length > 1, 'Predictive World Model remains singularly target-bound after terminal goal completion.');
  assert(u.candidateKeys.length > 1, 'Goal/Utility remains singularly target-bound after terminal goal completion.');
  return {
    status: 'PASS',
    target,
    completion,
    predictiveCandidates: p.candidateKeys,
    utilityCandidates: u.candidateKeys
  };
}

async function preExperimentAudit() {
  const audit = {
    successValueAudit: { status: 'PASS', evidence: [] },
    evaluationAudit: { status: 'PASS', evidence: [] },
    flowAudit: { status: 'PASS', evidence: [] },
    implementationAudit: { status: 'PASS', evidence: [] },
    archetypeFidelityAudit: {}
  };

  const badLedger = new RealityLedger({ ledgerId: 'bad-input-audit' });
  let rejectedActionMenu = false;
  try {
    badLedger.append({
      id: 'bad-frame',
      claims: [{
        id: 'bad',
        kind: 'fact',
        temporality: 'persistent',
        subjects: ['founder'],
        payload: { action_menu: ['preferred-action'] },
        source: 'audit',
        observed_at: 't0',
        available_at: 't0',
        accessible_to: ['founder']
      }]
    });
  } catch {
    rejectedActionMenu = true;
  }
  assert(rejectedActionMenu, 'Reality contract failed to reject an injected action menu.');
  audit.flowAudit.evidence.push('RealityLedger rejects action-menu injection.');

  const seed = 101;
  const nodes = createFoundingV2AncestorNodes(seed);
  const ids = nodes.map(n => n.id);
  assert(new Set(ids).size === 7, 'Expected seven distinct ancestor nodes.');
  assert(ids.includes('oasis'), 'OASIS node missing.');
  audit.implementationAudit.evidence.push(`Ancestor ids: ${ids.join(', ')}`);

  for (const node of nodes.filter(n => n.id !== 'oasis')) {
    assert(!('core' in node), `Comparator ${node.id} unexpectedly contains OASIS core state.`);
    assert(typeof node.exportState !== 'function', `Comparator ${node.id} unexpectedly exposes OASIS exportState().`);
  }
  audit.implementationAudit.evidence.push('Non-OASIS ancestors remain independent implementations, not OASIS subclasses.');

  const system = new OASISUnifiedValidationSystem({ mode: 'interactive-actualization', systemId: 'founding-flow-v2-audit' });
  for (const node of nodes) system.registerDecisionNode(node);
  const initialWorld = new FoundingFlowWorld();
  await system.revealReality(initialWorld.initialFrame());

  const branchSnapshots = [...system.branchRealities.values()].map(ledger => stripLedgerSpecific(ledger.currentSnapshot()));
  const canonical = stable(branchSnapshots[0]);
  for (const snapshot of branchSnapshots) {
    assert(stable(snapshot) === canonical, 'Initial reality content diverged across ancestor branches.');
  }
  audit.flowAudit.evidence.push('All seven nodes receive identical initial reality content in isolated branch ledgers.');

  const proposals = await system.deliberateAll();
  assert(Object.keys(proposals).length === 7, 'Not every ancestor produced a first proposal.');
  for (const [id, record] of Object.entries(proposals)) {
    assert(record.raw?.action, `${id} did not produce a primitive action during audit.`);
  }

  const oasis = nodes.find(n => n.id === 'oasis');
  const oasisState = oasis.exportState();
  const latestChanged = oasisState.flow.at(-1).changedEntities;
  const oasisSnapshot = system.branchRealities.get('oasis').currentSnapshot();
  assert(
    stable([...latestChanged].sort()) === stable([...(oasisSnapshot.deltaSubjects ?? [])].sort()),
    'OASIS changedEntities contains entities not present in actual reality delta.'
  );
  const oasisChoice = proposals.oasis.raw.oasis;
  assert(oasisChoice && Array.isArray(oasisChoice.seedEntities), 'OASIS trace missing seedEntities.');
  assert(
    stable([...oasisChoice.seedEntities].sort()) === stable([...(oasisSnapshot.deltaSubjects ?? [])].sort()),
    'OASIS seed contains non-delta possibility targets or participants.'
  );
  audit.flowAudit.evidence.push('OASIS current seed remains grounded only in actual reality delta.');

  audit.archetypeFidelityAudit.temporalInsertionOrder = await temporalInsertionOrderAudit(branchSnapshots[0]);
  audit.archetypeFidelityAudit.episodicLocality = await episodicLocalityAudit(branchSnapshots[0]);
  audit.archetypeFidelityAudit.goalTerminal = await goalTerminalAudit();
  audit.implementationAudit.evidence.push('Temporal insertion-order invariance, episodic local relevance, and goal terminal semantics passed targeted audits.');

  const protocolText = await fs.readFile('experiments/founding-flow-v2/PROTOCOL.md', 'utf8');
  assert(!/winner|success score|accuracy target|reward target/i.test(protocolText), 'Protocol contains a forbidden performance target.');
  audit.successValueAudit.evidence.push('Protocol contains no target winner, desired trajectory or return-state requirement.');
  audit.evaluationAudit.evidence.push('Runner computes no cross-system reward, accuracy, stability or convergence ranking.');

  return audit;
}

async function runSeed(seed, preAudit) {
  const system = new OASISUnifiedValidationSystem({
    mode: 'interactive-actualization',
    systemId: `founding-flow-v2:${seed}`
  });
  const nodes = createFoundingV2AncestorNodes(seed);
  const worlds = new Map();
  for (const node of nodes) {
    system.registerDecisionNode(node);
    worlds.set(node.id, new FoundingFlowWorld());
  }

  const initialFrames = [...worlds.values()].map(world => world.initialFrame());
  const initCanonical = stable(initialFrames[0]);
  for (const frame of initialFrames) {
    assert(stable(frame) === initCanonical, `Seed ${seed}: initial worlds diverged before start.`);
  }
  await system.revealReality(initialFrames[0]);

  const rounds = [];
  for (let round = 0; round < 7; round++) {
    const proposals = await system.deliberateAll();
    const roundRecord = {
      round,
      realityBefore: Object.fromEntries([...system.branchRealities].map(([id, ledger]) => [id, clone(ledger.currentSnapshot())])),
      proposals: clone(proposals),
      actualizations: {},
      worldAfter: {}
    };

    for (const [nodeId, record] of Object.entries(proposals)) {
      const action = record.raw?.action;
      assert(action, `Seed ${seed} round ${round}: ${nodeId} produced no primitive action.`);
      const world = worlds.get(nodeId);
      const legalKeys = new Set(world.legalActions().map(actionKey));
      assert(legalKeys.has(actionKey(action)), `Seed ${seed} round ${round}: ${nodeId} proposed illegal action ${actionKey(action)}.`);
      const outcomeFrame = world.apply(action, record.proposalRecordId);
      const observed = await system.actualize({
        nodeId,
        proposalRecordId: record.proposalRecordId,
        outcomeFrame,
        externalReceipt: { world: 'founding-flow-world-v1-unchanged', actionKey: actionKey(action), protocol: 'founding-flow-v2' }
      });
      roundRecord.actualizations[nodeId] = clone(observed);
      roundRecord.worldAfter[nodeId] = world.snapshotState();
    }

    if (round < 6) {
      const exogenousFrames = [...worlds.values()].map(world => world.exogenousFrame(round));
      const canonical = stable(exogenousFrames[0]);
      for (const frame of exogenousFrames) {
        assert(stable(frame) === canonical, `Seed ${seed} round ${round}: exogenous forcing diverged across branches.`);
      }
      roundRecord.exogenousAfter = clone(exogenousFrames[0]);
      await system.revealReality(exogenousFrames[0]);
    }
    rounds.push(roundRecord);
  }

  const nodeStates = {};
  for (const node of nodes) {
    if (node.id === 'oasis') {
      const state = node.exportState();
      nodeStates.oasis = {
        closedExperienceCount: state.closedExperiences.length,
        actualizationCount: state.actualizations.length,
        spiralLineage: state.spiralLineage,
        closedExperiences: state.closedExperiences
      };
    } else {
      nodeStates[node.id] = {
        historyLength: node.history?.length ?? null,
        episodes: clone(node.episodes ?? null),
        relationHistory: clone(node.relationHistory ?? null),
        lastProposal: clone(node.lastProposal ?? null)
      };
    }
  }

  const oasisTieCount = rounds.filter(r => r.proposals.oasis.raw?.oasis?.tieBreakUsed === true).length;
  const goalCompletionTransitions = {};
  for (const id of ['predictive-world-model', 'goal-utility']) {
    goalCompletionTransitions[id] = rounds.map(r => ({
      round: r.round,
      completedBeforeChoice: r.proposals[id].raw?.goalCompletion?.completed ?? null,
      actionKey: r.proposals[id].raw?.actionKey ?? null
    }));
  }

  return {
    seed,
    sharedGoalForPredictiveAndUtility: sharedGoalForSeedV2(seed),
    preExperimentAudit: clone(preAudit),
    rounds,
    actionSequences: Object.fromEntries(nodes.map(node => [
      node.id,
      rounds.map(r => r.proposals[node.id].raw.actionKey)
    ])),
    mechanismDiagnostics: {
      oasisTieCount,
      oasisSemanticChoiceCount: rounds.length - oasisTieCount,
      goalCompletionTransitions
    },
    nodeStates,
    auditTrail: system.exportAuditTrail()
  };
}

const audit = await preExperimentAudit();
if (process.argv.includes('--audit-only')) {
  console.log(JSON.stringify({ experiment: 'Founding Flow v2', audit }, null, 2));
  process.exit(0);
}

const seeds = [101, 211, 307, 401, 503];
const runs = [];
for (const seed of seeds) runs.push(await runSeed(seed, audit));

const report = {
  experiment: 'Founding Flow v2',
  status: 'EXECUTED',
  evidenceBoundary: 'Archetype-faithful baseline and mechanism diagnostics only; no superiority, cultural-evolution or generational claim.',
  world: 'FoundingFlowWorld v1 unchanged to isolate comparator corrections',
  noCrossSystemPerformanceMetric: true,
  seeds,
  systems: ['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],
  preExperimentAudit: audit,
  runs
};

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/founding-flow-v2.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  experiment: report.experiment,
  status: report.status,
  audit,
  runs: runs.map(run => ({
    seed: run.seed,
    goal: run.sharedGoalForPredictiveAndUtility,
    actionSequences: run.actionSequences,
    mechanismDiagnostics: run.mechanismDiagnostics,
    oasisClosedExperiences: run.nodeStates.oasis.closedExperienceCount
  }))
}, null, 2));
