import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowWorld, actionKey } from '../src/validation/founding-flow-world.mjs';
import { createFoundingAncestorNodes, sharedGoalForSeed } from '../src/validation/founding-flow-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
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

async function preExperimentAudit() {
  const audit = {
    successValueAudit: { status: 'PASS', evidence: [] },
    evaluationAudit: { status: 'PASS', evidence: [] },
    flowAudit: { status: 'PASS', evidence: [] },
    implementationAudit: { status: 'PASS', evidence: [] }
  };

  // Reality input must reject experimenter-supplied high-level action menus.
  const ledger = new RealityLedger({ ledgerId: 'audit' });
  let rejectedActionMenu = false;
  try {
    ledger.append({
      id: 'bad-frame',
      claims: [{
        id: 'bad', kind: 'fact', temporality: 'persistent', subjects: ['founder'],
        payload: { action_menu: ['win'] },
        source: 'audit', observed_at: 't0', available_at: 't0', accessible_to: ['founder']
      }]
    });
  } catch {
    rejectedActionMenu = true;
  }
  assert(rejectedActionMenu, 'Reality contract failed to reject an injected action menu.');
  audit.flowAudit.evidence.push('RealityLedger rejects action-menu injection.');

  const seed = 101;
  const nodes = createFoundingAncestorNodes(seed);
  const ids = nodes.map(n => n.id);
  assert(new Set(ids).size === 7, 'Expected seven distinct ancestor nodes.');
  assert(ids.includes('oasis'), 'OASIS node missing.');
  audit.implementationAudit.evidence.push(`Independent ancestor ids: ${ids.join(', ')}`);

  // Confirm comparator prototypes do not inherit from OASIS node/core by testing cross-instance properties.
  for (const node of nodes.filter(n => n.id !== 'oasis')) {
    assert(!('core' in node), `Comparator ${node.id} unexpectedly contains OASIS core state.`);
    assert(typeof node.exportState !== 'function', `Comparator ${node.id} unexpectedly exposes OASIS exportState().`);
  }
  audit.implementationAudit.evidence.push('Non-OASIS ancestors are independent implementations, not OASIS subclasses.');

  const system = new OASISUnifiedValidationSystem({ mode: 'interactive-actualization', systemId: 'audit' });
  for (const node of nodes) system.registerDecisionNode(node);
  const initialWorld = new FoundingFlowWorld();
  await system.revealReality(initialWorld.initialFrame());

  const branchSnapshots = [...system.branchRealities.values()].map(ledger => stripLedgerSpecific(ledger.currentSnapshot()));
  const canonical = stable(branchSnapshots[0]);
  for (const s of branchSnapshots) assert(stable(s) === canonical, 'Initial reality content diverged across branches.');
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
  assert(stable([...latestChanged].sort()) === stable([...(oasisSnapshot.deltaSubjects ?? [])].sort()),
    'OASIS changedEntities contains entities not present in the actual reality delta.');
  audit.flowAudit.evidence.push('OASIS current changedEntities equals reality delta subjects; primitive affordance targets are not injected into current change.');

  const oasisChoice = proposals.oasis.raw.oasis;
  assert(oasisChoice && Array.isArray(oasisChoice.seedEntities), 'OASIS audit trace missing seedEntities.');
  assert(stable([...oasisChoice.seedEntities].sort()) === stable([...(oasisSnapshot.deltaSubjects ?? [])].sort()),
    'OASIS current seeds contain non-delta participants/possibility targets.');
  audit.implementationAudit.evidence.push('OASIS current seed excludes automatic all-participant and unrealized-possibility injection.');

  const protocolText = await fs.readFile('experiments/founding-flow-v1/PROTOCOL.md', 'utf8');
  assert(!/success score|accuracy target|reward target/i.test(protocolText), 'Protocol contains a forbidden evaluation target.');
  audit.successValueAudit.evidence.push('Protocol declares no target outcome, winner or return state.');
  audit.evaluationAudit.evidence.push('No cross-system reward/accuracy/stability/convergence metric is computed by the runner.');

  return audit;
}

async function runSeed(seed, preAudit) {
  const system = new OASISUnifiedValidationSystem({
    mode: 'interactive-actualization',
    systemId: `founding-flow-v1:${seed}`
  });
  const nodes = createFoundingAncestorNodes(seed);
  const worlds = new Map();
  for (const node of nodes) {
    system.registerDecisionNode(node);
    worlds.set(node.id, new FoundingFlowWorld());
  }

  const initialFrames = [...worlds.values()].map(w => w.initialFrame());
  const initCanonical = stable(initialFrames[0]);
  for (const frame of initialFrames) assert(stable(frame) === initCanonical, `Seed ${seed}: initial worlds diverged before start.`);
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
        externalReceipt: { world: 'founding-flow-world-v1', actionKey: actionKey(action) }
      });
      roundRecord.actualizations[nodeId] = clone(observed);
      roundRecord.worldAfter[nodeId] = world.snapshotState();
    }

    if (round < 6) {
      const exogenousFrames = [...worlds.values()].map(world => world.exogenousFrame(round));
      const canonical = stable(exogenousFrames[0]);
      for (const frame of exogenousFrames) {
        assert(stable(frame) === canonical, `Seed ${seed} round ${round}: exogenous world forcing diverged across branches.`);
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

  return {
    seed,
    sharedGoalForPredictiveAndUtility: sharedGoalForSeed(seed),
    preExperimentAudit: clone(preAudit),
    rounds,
    actionSequences: Object.fromEntries(nodes.map(node => [
      node.id,
      rounds.map(r => r.proposals[node.id].raw.actionKey)
    ])),
    nodeStates,
    auditTrail: system.exportAuditTrail()
  };
}

const audit = await preExperimentAudit();
if (process.argv.includes('--audit-only')) {
  console.log(JSON.stringify({ experiment: 'Founding Flow v1', audit }, null, 2));
  process.exit(0);
}

const seeds = [101, 211, 307, 401, 503];
const runs = [];
for (const seed of seeds) runs.push(await runSeed(seed, audit));

const report = {
  experiment: 'Founding Flow v1',
  status: 'EXECUTED',
  evidenceBoundary: 'Descriptive founding-flow evidence only; no superiority, cultural-evolution or generational claim.',
  noCrossSystemPerformanceMetric: true,
  seeds,
  systems: ['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],
  preExperimentAudit: audit,
  runs
};

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/founding-flow-v1.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  experiment: report.experiment,
  status: report.status,
  audit,
  runs: runs.map(run => ({
    seed: run.seed,
    goal: run.sharedGoalForPredictiveAndUtility,
    actionSequences: run.actionSequences,
    oasisClosedExperiences: run.nodeStates.oasis.closedExperienceCount
  }))
}, null, 2));
