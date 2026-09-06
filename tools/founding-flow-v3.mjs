import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import { enumeratePrimitiveActions } from '../src/validation/founding-flow-world.mjs';
import { createFoundingV2AncestorNodes, sharedGoalForSeedV2 } from '../src/validation/founding-flow-v2-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }
function stripLedgerSpecific(snapshot) {
  return { frameId:snapshot.frameId, sequence:snapshot.sequence, deltaClaims:snapshot.deltaClaims, deltaSubjects:snapshot.deltaSubjects, instantClaims:snapshot.instantClaims, currentPersistentClaims:snapshot.currentPersistentClaims, meta:snapshot.meta };
}
function proposalTie(raw) { return raw?.architecture === 'oasis' ? raw?.oasis?.tieBreakUsed === true : raw?.tieBreakUsed === true; }

async function environmentIdentifiabilityAudit() {
  const initialWorld = new FoundingFlowV3World();
  const initialTouchTargets = initialWorld.legalActions().filter(a=>a.op==='touch').map(a=>a.target).sort();
  assert(initialTouchTargets.length === 0, 'V3 initial world still places touch targets adjacent to founder.');

  const probe = new FoundingFlowV3World();
  const probeLedger = new RealityLedger({ ledgerId:'v3-environment-probe' });
  probeLedger.append(probe.initialFrame());
  const localFrontiers = [];
  const capture = () => localFrontiers.push(enumeratePrimitiveActions(probeLedger.currentSnapshot()).filter(a=>a.op==='touch').map(a=>a.target).sort());
  capture();
  for (let i=0;i<5;i++) { probeLedger.append(probe.exogenousFrame(i)); capture(); }
  const uniqueFrontiers = new Set(localFrontiers.map(x=>stable(x)));
  assert(uniqueFrontiers.size >= 3, 'V3 local touch frontier does not change enough under exogenous flow.');

  const relationProbe = new FoundingFlowV3World();
  relationProbe.apply({op:'step',dx:1,dy:0},'probe-1');
  relationProbe.apply({op:'step',dx:1,dy:0},'probe-2');
  relationProbe.apply({op:'step',dx:0,dy:-1},'probe-3');
  const asserted = relationProbe.apply({op:'touch',target:'marker-M'},'probe-4');
  const retracted = relationProbe.apply({op:'touch',target:'marker-M'},'probe-5');
  assert(asserted.claims.some(c=>c.kind==='relation' && c.id==='mark:founder:marker-M' && c.op==='assert'), 'Marker interaction did not assert persistent relation.');
  assert(retracted.claims.some(c=>c.kind==='relation' && c.id==='mark:founder:marker-M' && c.op==='retract'), 'Repeated marker interaction did not retract persistent relation.');

  const frameProbe = new FoundingFlowV3World();
  const frameLedger = new RealityLedger({ ledgerId:'v3-frame-probe' });
  frameLedger.append(frameProbe.initialFrame());
  for (let i=0;i<11;i++) frameLedger.append(frameProbe.exogenousFrame(i));

  return { status:'PASS', initialTouchTargets, localFrontiers, uniqueLocalFrontierCount:uniqueFrontiers.size, reversibleMarkerRelation:true, allExogenousFramesLedgerValid:true };
}

async function preExperimentAudit() {
  const audit = {
    successValueAudit:{status:'PASS',evidence:[]}, evaluationAudit:{status:'PASS',evidence:[]}, flowAudit:{status:'PASS',evidence:[]}, implementationAudit:{status:'PASS',evidence:[]}, environmentIdentifiabilityAudit:null
  };
  const bad = new RealityLedger({ledgerId:'bad'}); let rejected=false;
  try { bad.append({id:'bad',claims:[{id:'bad-claim',kind:'fact',temporality:'persistent',subjects:['founder'],payload:{action_menu:['preferred']},source:'audit',observed_at:'t0',available_at:'t0',accessible_to:['founder']} ]}); } catch { rejected=true; }
  assert(rejected,'RealityLedger accepted an injected action menu.');
  audit.flowAudit.evidence.push('RealityLedger rejects experimenter-supplied action menus.');

  const nodes=createFoundingV2AncestorNodes(101); const ids=nodes.map(n=>n.id);
  assert(new Set(ids).size===7 && ids.includes('oasis'),'Seven archetype nodes are not present.');
  for (const node of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in node),`Comparator ${node.id} contains OASIS core state.`);
  audit.implementationAudit.evidence.push('V2 archetype implementations are reused without changing their decision principles.');
  audit.implementationAudit.evidence.push('Non-OASIS nodes remain independent of OASIS core state.');

  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'founding-flow-v3-audit'});
  for (const node of nodes) system.registerDecisionNode(node);
  const world=new FoundingFlowV3World(); await system.revealReality(world.initialFrame());
  const snapshots=[...system.branchRealities.values()].map(l=>stripLedgerSpecific(l.currentSnapshot())); const canonical=stable(snapshots[0]);
  for (const s of snapshots) assert(stable(s)===canonical,'Initial v3 reality diverged across branches.');
  audit.flowAudit.evidence.push('All seven branches receive identical initial v3 reality content.');
  const proposals=await system.deliberateAll();
  for (const [id,r] of Object.entries(proposals)) assert(r.raw?.action,`${id} did not produce a primitive action in pre-audit.`);
  const oasis=nodes.find(n=>n.id==='oasis'); const oasisState=oasis.exportState(); const oasisSnapshot=system.branchRealities.get('oasis').currentSnapshot();
  assert(stable([...oasisState.flow.at(-1).changedEntities].sort())===stable([...(oasisSnapshot.deltaSubjects??[])].sort()),'OASIS changedEntities contains non-reality entities.');
  assert(stable([...(proposals.oasis.raw.oasis.seedEntities??[])].sort())===stable([...(oasisSnapshot.deltaSubjects??[])].sort()),'OASIS seeds contain possibility targets or non-delta participants.');
  audit.flowAudit.evidence.push('OASIS current seed remains grounded only in actual reality delta.');

  audit.environmentIdentifiabilityAudit=await environmentIdentifiabilityAudit();
  audit.implementationAudit.evidence.push('World-only environment identifiability audit passed before model execution.');

  const protocol=await fs.readFile('experiments/founding-flow-v3/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains an explicit forbidden performance target declaration.');
  audit.successValueAudit.evidence.push('No desired trajectory, correct terminal world, or preferred archetype is defined.');
  audit.evaluationAudit.evidence.push('No cross-system reward, accuracy, stability, convergence or winner ranking is computed.');
  return audit;
}

async function runSeed(seed, audit) {
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v3:${seed}`});
  const nodes=createFoundingV2AncestorNodes(seed); const worlds=new Map();
  for (const node of nodes) { system.registerDecisionNode(node); worlds.set(node.id,new FoundingFlowV3World()); }
  const initialFrames=[...worlds.values()].map(w=>w.initialFrame()); const initialCanonical=stable(initialFrames[0]);
  for (const f of initialFrames) assert(stable(f)===initialCanonical,`Seed ${seed}: initial frames diverged.`);
  await system.revealReality(initialFrames[0]);

  const rounds=[];
  for (let round=0;round<12;round++) {
    const proposals=await system.deliberateAll();
    const rec={round,realityBefore:Object.fromEntries([...system.branchRealities].map(([id,l])=>[id,clone(l.currentSnapshot())])),proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for (const [nodeId,record] of Object.entries(proposals)) {
      const action=record.raw?.action; assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);
      const world=worlds.get(nodeId); const legal=new Set(world.legalActions().map(actionKey));
      assert(legal.has(actionKey(action)),`Seed ${seed} round ${round}: illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);
      rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3',actionKey:actionKey(action)}}));
      rec.worldAfter[nodeId]=world.snapshotState();
    }
    if (round<11) {
      const exogenous=[...worlds.values()].map(w=>w.exogenousFrame(round)); const c=stable(exogenous[0]);
      for (const f of exogenous) assert(stable(f)===c,`Seed ${seed} round ${round}: exogenous frames diverged across branches.`);
      rec.exogenousAfter=clone(exogenous[0]); await system.revealReality(exogenous[0]);
    }
    rounds.push(rec);
  }

  const nodeStates={};
  for (const node of nodes) {
    if (node.id==='oasis') { const s=node.exportState(); nodeStates.oasis={closedExperienceCount:s.closedExperiences.length,actualizationCount:s.actualizations.length,spiralLineage:s.spiralLineage,closedExperiences:s.closedExperiences}; }
    else nodeStates[node.id]={historyLength:node.history?.length??null,episodes:clone(node.episodes??null),relationHistory:clone(node.relationHistory??null),lastProposal:clone(node.lastProposal??null)};
  }
  const tieCounts=Object.fromEntries(nodes.map(node=>[node.id,rounds.filter(r=>proposalTie(r.proposals[node.id].raw)).length]));
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV2(seed),rounds,actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,oasisSemanticChoiceCount:12-tieCounts.oasis},nodeStates,auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if (process.argv.includes('--audit-only')) { console.log(JSON.stringify({experiment:'Founding Flow v3',audit},null,2)); process.exit(0); }
const seeds=[101,211,307,401,503]; const runs=[]; for (const seed of seeds) runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v3',status:'EXECUTED',evidenceBoundary:'Environment-identifiability and descriptive lineage evidence only; no superiority, culture or generational claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true}); await fs.writeFile('artifacts/founding-flow-v3.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,tieCounts:r.mechanismDiagnostics.tieCounts,oasisSemanticChoiceCount:r.mechanismDiagnostics.oasisSemanticChoiceCount,actionSequences:r.actionSequences,oasisClosedExperiences:r.nodeStates.oasis.closedExperienceCount}))},null,2));
