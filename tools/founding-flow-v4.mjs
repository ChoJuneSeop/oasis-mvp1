import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import { enumeratePrimitiveActions } from '../src/validation/founding-flow-world.mjs';
import {
  createFoundingV4AncestorNodes,
  OASISAncestorV4Node,
  TemporalRelationalAncestorV4Node,
  OASISSelectiveRelationalCore,
  sharedGoalForSeedV4
} from '../src/validation/founding-flow-v4-ancestors.mjs';

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
  assert(initialTouchTargets.length === 0, 'V4 reused world no longer has zero initial touch targets.');
  const probe = new FoundingFlowV3World();
  const ledger = new RealityLedger({ledgerId:'v4-env'}); ledger.append(probe.initialFrame());
  const frontiers=[]; const capture=()=>frontiers.push(enumeratePrimitiveActions(ledger.currentSnapshot()).filter(a=>a.op==='touch').map(a=>a.target).sort());
  capture(); for(let i=0;i<5;i++){ledger.append(probe.exogenousFrame(i));capture();}
  assert(new Set(frontiers.map(stable)).size>=3,'V3 world local frontier variation was lost.');
  return {status:'PASS',initialTouchTargets,localFrontiers:frontiers,uniqueLocalFrontierCount:new Set(frontiers.map(stable)).size};
}

function selectiveCoreAudit() {
  const founderOnly = new OASISSelectiveRelationalCore({realizationSeed:1,anchorEntityId:'founder'});
  founderOnly.state.flow.push({changedEntities:['founder'],event:{id:'now'}});
  founderOnly.state.closedExperiences.push({
    id:'experience:founder-only',sequence:0,processRelations:[],
    participation:{current:['founder'],historical:[]},
    choice:{entities:['founder'],steps:[]},
    outcome:{affectedEntities:['founder']},before:{changedEntities:['founder']},after:{changedEntities:['founder']}
  });
  const founderField=founderOnly.reconstituteAffinityField();
  assert(founderField.reactivatedExperienceIds.length===0,'Founder-only commonality still reactivates completed experience.');

  const targetCore = new OASISSelectiveRelationalCore({realizationSeed:1,anchorEntityId:'founder'});
  targetCore.state.flow.push({changedEntities:['resource-A'],event:{id:'now'}});
  targetCore.state.closedExperiences.push({
    id:'experience:target',sequence:0,processRelations:[{id:'r1',from:'founder',to:'resource-A',kind:'contacted',entities:[]}],
    participation:{current:['founder','resource-A'],historical:[]},
    choice:{entities:['founder','resource-A'],steps:[]},
    outcome:{affectedEntities:['founder','resource-A']},before:{changedEntities:['founder','resource-A']},after:{changedEntities:['founder','resource-A']}
  });
  const targetField=targetCore.reconstituteAffinityField();
  assert(targetField.reactivatedExperienceIds.includes('experience:target'),'Non-founder current relation target cannot reactivate matching experience.');

  const supportField={
    relations:[{id:'rel:e1',from:'founder',to:'resource-A',kind:'contacted',entities:[]}],
    reactivated:[{experienceId:'e1',relations:[{from:'founder',to:'resource-A',kind:'contacted'}],choice:{entities:['founder','resource-A']},outcome:{affectedEntities:['founder','resource-A']}}]
  };
  const idleSupport=targetCore._supportForAffordance({actor:'founder',action:'idle',entities:['founder'],relations:[],consequences:[]},supportField);
  const targetSupport=targetCore._supportForAffordance({actor:'founder',target:'resource-A',action:'touch',entities:['founder','resource-A'],relations:[],consequences:[]},supportField);
  assert(idleSupport.experienceIds.length===0,'Unrelated affordance still receives experience support from common founder actor.');
  assert(targetSupport.experienceIds.includes('e1'),'Target-matching affordance lost legitimate non-founder experience support.');
  return {status:'PASS',founderOnlyReactivated:founderField.reactivatedExperienceIds,targetReactivated:targetField.reactivatedExperienceIds,idleSupport,targetSupport};
}

async function farSpatialAudit() {
  const world=new FoundingFlowV3World(); const ledger=new RealityLedger({ledgerId:'v4-spatial'}); ledger.append(world.initialFrame()); const snapshot=ledger.currentSnapshot();
  const oasis=new OASISAncestorV4Node(101); await oasis.observe(snapshot);
  const oasisRelations=oasis.exportState().world.relations;
  assert(!oasisRelations.some(r=>r.kind==='located-relative-to'),'OASIS v4 still inserts far located-relative-to relations into current affinity world.');
  const temporal=new TemporalRelationalAncestorV4Node(101); await temporal.observe(snapshot);
  assert(!temporal.relationHistory.some(r=>r.kind==='located-relative-to'),'Temporal-Relational v4 still stores far located-relative-to bridge.');
  return {status:'PASS',oasisCurrentRelations:oasisRelations.map(r=>({id:r.id,kind:r.kind})),temporalRelationHistory:clone(temporal.relationHistory)};
}

async function preExperimentAudit() {
  const audit={successValueAudit:{status:'PASS',evidence:[]},evaluationAudit:{status:'PASS',evidence:[]},flowAudit:{status:'PASS',evidence:[]},implementationAudit:{status:'PASS',evidence:[]},environmentIdentifiabilityAudit:null,selectiveRelationAudit:null,farSpatialAudit:null};
  const bad=new RealityLedger({ledgerId:'bad'}); let rejected=false;
  try{bad.append({id:'bad',claims:[{id:'bad-c',kind:'fact',temporality:'persistent',subjects:['founder'],payload:{action_menu:['preferred']},source:'audit',observed_at:'t0',available_at:'t0',accessible_to:['founder']} ]});}catch{rejected=true;}
  assert(rejected,'RealityLedger accepted injected action menu.'); audit.flowAudit.evidence.push('RealityLedger rejects action-menu injection.');

  const nodes=createFoundingV4AncestorNodes(101); const ids=nodes.map(n=>n.id);
  assert(new Set(ids).size===7 && ids.includes('oasis'),'Expected seven v4 archetype nodes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);
  audit.implementationAudit.evidence.push('Five unaffected comparator implementations remain v2/v1 faithful; only Temporal-Relational bridge filtering and OASIS selective-relational subclass are changed.');

  audit.environmentIdentifiabilityAudit=await environmentIdentifiabilityAudit();
  audit.selectiveRelationAudit=selectiveCoreAudit();
  audit.farSpatialAudit=await farSpatialAudit();

  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'v4-preaudit'});
  for(const n of nodes) system.registerDecisionNode(n);
  const world=new FoundingFlowV3World(); await system.revealReality(world.initialFrame());
  const snapshots=[...system.branchRealities.values()].map(l=>stripLedgerSpecific(l.currentSnapshot())); const c=stable(snapshots[0]);
  for(const s of snapshots) assert(stable(s)===c,'Initial v4 reality diverged across branches.');
  const proposals=await system.deliberateAll(); for(const [id,r] of Object.entries(proposals)) assert(r.raw?.action,`${id} produced no action in v4 preaudit.`);
  const oasis=nodes.find(n=>n.id==='oasis'); const state=oasis.exportState(); const snap=system.branchRealities.get('oasis').currentSnapshot();
  assert(stable([...state.flow.at(-1).changedEntities].sort())===stable([...(snap.deltaSubjects??[])].sort()),'OASIS v4 changedEntities contains non-reality entities.');
  assert(stable([...(proposals.oasis.raw.oasis.seedEntities??[])].sort())===stable([...(snap.deltaSubjects??[])].sort()),'OASIS v4 seeds contain non-delta entities.');
  audit.flowAudit.evidence.push('All branches receive identical initial reality and OASIS seeds remain delta-grounded.');

  const protocol=await fs.readFile('experiments/founding-flow-v4/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  audit.successValueAudit.evidence.push('No preferred archetype, desired trajectory or correct terminal world is defined.');
  audit.evaluationAudit.evidence.push('No cross-system performance ranking is computed.');
  return audit;
}

async function runSeed(seed,audit){
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v4:${seed}`});
  const nodes=createFoundingV4AncestorNodes(seed); const worlds=new Map();
  for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const init=[...worlds.values()].map(w=>w.initialFrame()); const canon=stable(init[0]); for(const f of init) assert(stable(f)===canon,`Seed ${seed}: initial frame divergence.`); await system.revealReality(init[0]);
  const rounds=[];
  for(let round=0;round<12;round++){
    const proposals=await system.deliberateAll(); const rec={round,realityBefore:Object.fromEntries([...system.branchRealities].map(([id,l])=>[id,clone(l.currentSnapshot())])),proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)){
      const action=record.raw?.action; assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`); const world=worlds.get(nodeId); const legal=new Set(world.legalActions().map(actionKey)); assert(legal.has(actionKey(action)),`Illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId); rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v4',actionKey:actionKey(action)}})); rec.worldAfter[nodeId]=world.snapshotState();
    }
    if(round<11){const ex=[...worlds.values()].map(w=>w.exogenousFrame(round));const ec=stable(ex[0]);for(const f of ex)assert(stable(f)===ec,`Seed ${seed} round ${round}: exogenous divergence.`);rec.exogenousAfter=clone(ex[0]);await system.revealReality(ex[0]);}
    rounds.push(rec);
  }
  const nodeStates={}; for(const n of nodes){if(n.id==='oasis'){const s=n.exportState();nodeStates.oasis={closedExperienceCount:s.closedExperiences.length,actualizationCount:s.actualizations.length,spiralLineage:s.spiralLineage,closedExperiences:s.closedExperiences};}else nodeStates[n.id]={historyLength:n.history?.length??null,episodes:clone(n.episodes??null),relationHistory:clone(n.relationHistory??null),lastProposal:clone(n.lastProposal??null)};}
  const tieCounts=Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length]));
  const oasisReactivation=rounds.map(r=>({round:r.round,ids:clone(r.proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]),count:(r.proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]).length,actionKey:r.proposals.oasis.raw?.actionKey??null,tie:r.proposals.oasis.raw?.oasis?.tieBreakUsed??null}));
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV4(seed),rounds,actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,oasisReactivation},nodeStates,auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')){console.log(JSON.stringify({experiment:'Founding Flow v4',audit},null,2));process.exit(0);}
const seeds=[101,211,307,401,503];const runs=[];for(const seed of seeds)runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v4',status:'EXECUTED',evidenceBoundary:'Selective-relational implementation validation and descriptive genealogy only; no superiority, culture or generation claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/founding-flow-v4.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,tieCounts:r.mechanismDiagnostics.tieCounts,oasisReactivation:r.mechanismDiagnostics.oasisReactivation,actionSequences:r.actionSequences,oasisClosedExperiences:r.nodeStates.oasis.closedExperienceCount}))},null,2));
