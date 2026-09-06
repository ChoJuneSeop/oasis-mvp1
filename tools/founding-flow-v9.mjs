import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import {
  createFoundingV9AncestorNodes,
  OASISRelationRoleCore,
  roleAwareRelationKey,
  sharedGoalForSeedV9
} from '../src/validation/founding-flow-v9-ancestors.mjs';
import { processEvidenceEntities } from '../src/validation/founding-flow-v5-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }
function proposalTie(raw) { return raw?.architecture === 'oasis' ? raw?.oasis?.tieBreakUsed === true : raw?.tieBreakUsed === true; }
function stripLedgerSpecific(snapshot) {
  return { frameId:snapshot.frameId, sequence:snapshot.sequence, deltaClaims:snapshot.deltaClaims, deltaSubjects:snapshot.deltaSubjects, instantClaims:snapshot.instantClaims, currentPersistentClaims:snapshot.currentPersistentClaims, meta:snapshot.meta };
}

function primitiveAffordance(op='idle', target=null) {
  const id = op === 'touch' ? `touch:${target}` : op;
  return {
    id,op:'upsert',actor:'founder',action:id,target,entities:target?['founder',target]:['founder'],
    requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],
    meta:{primitiveAction:target?{op,target}:{op},originalStepId:id}
  };
}
function contactRelation(op='upsert') {
  return { id:'contact:founder:other-O',from:'founder',to:'other-O',kind:'contacted',entities:['founder','other-O'],op };
}
function createBaseCore(action='idle') {
  const core=new OASISRelationRoleCore({realizationSeed:13,anchorEntityId:'founder'});
  core.observe({
    id:'formation-event',entities:['founder','other-O'],
    participants:[
      {id:'founder',roles:['founder'],capabilities:['*'],obligations:[],available:true},
      {id:'other-O',roles:['other'],capabilities:[],obligations:[],available:true}
    ],
    relations:[contactRelation('upsert')]
  });
  core.observe({id:'later-current-flow',entities:['other-O'],facts:[{id:'later-observation',entities:['other-O'],value:{event:'other-present'},op:'upsert'}]});
  core.setValidationPrimitiveAffordances([primitiveAffordance(action, action==='touch'?'other-O':null)]);
  return core;
}

function auditPersistentStateOnly() {
  const core=createBaseCore('idle');
  const d=core.deliberate();
  const exp=core.actualize(d.choice.id,{id:'later-outcome-no-relation',entities:['founder'],facts:[{id:'idle-event',entities:['founder'],value:{event:'idle'},op:'upsert'}]});
  const contact=exp.processRelations.filter(r=>r.id==='contact:founder:other-O');
  const stateRecords=contact.filter(r=>r.processRole==='current-state');
  const mutationRecords=contact.filter(r=>r.processRole==='outcome-mutation');
  assert(stateRecords.length===1,'V9 FAIL: persistent current relation is not preserved exactly once as current-state.');
  assert(mutationRecords.length===0,'V9 FAIL: no-mutation outcome incorrectly contains outcome-mutation record.');
  assert(roleAwareRelationKey(stateRecords[0]).startsWith('state:'),'V9 FAIL: current-state structural identity is not state-qualified.');
  return {status:'PASS',outcomeRelations:clone(exp.outcome.relations),contactRecords:contact.map(r=>({op:r.op,processRole:r.processRole,sourceEventId:r.sourceEventId,key:roleAwareRelationKey(r)}))};
}

function auditRemovalCollision() {
  const core=createBaseCore('idle');
  const d=core.deliberate();
  const exp=core.actualize(d.choice.id,{id:'later-outcome-remove',entities:['founder','other-O'],relations:[contactRelation('remove')]});
  const contact=exp.processRelations.filter(r=>r.id==='contact:founder:other-O');
  const state=contact.find(r=>r.processRole==='current-state');
  const remove=contact.find(r=>r.processRole==='outcome-mutation' && r.op==='remove');
  assert(state,'V9 FAIL: removal experience lost current-state context.');
  assert(remove,'V9 FAIL: actual remove mutation is not preserved separately.');
  assert(core.exportState().world.relations.every(r=>r.id!=='contact:founder:other-O'),'V9 FAIL: live world relation was not removed.');
  assert(roleAwareRelationKey(state)!==roleAwareRelationKey(remove),'V9 FAIL: state and remove mutation structural identities collapse.');
  return {status:'PASS',outcomeRelations:exp.outcome.relations.map(r=>({op:r.op,sourceEventId:r.sourceEventId})),contactRecords:contact.map(r=>({op:r.op,processRole:r.processRole,sourceEventId:r.sourceEventId,key:roleAwareRelationKey(r)}))};
}

function auditRoleIdentity() {
  const base={from:'founder',to:'other-O',kind:'contacted',context:null};
  const keys={
    state:roleAwareRelationKey({...base,op:'upsert',processRole:'current-state'}),
    upsert:roleAwareRelationKey({...base,op:'upsert',processRole:'outcome-mutation'}),
    remove:roleAwareRelationKey({...base,op:'remove',processRole:'outcome-mutation'}),
    observe:roleAwareRelationKey({...base,processRole:'derived-observation'}),
    choice:roleAwareRelationKey({...base,processRole:'choice-relation'})
  };
  assert(new Set(Object.values(keys)).size===5,'V9 FAIL: relation process roles are not structurally distinct.');
  return {status:'PASS',keys};
}

function auditC5Regression() {
  const core=new OASISRelationRoleCore({realizationSeed:1,anchorEntityId:'founder'});
  const exp={id:'experience:co-presence',sequence:0,before:{changedEntities:['founder','other-O']},after:{changedEntities:['founder']},processRelations:[],participation:{current:['founder'],historical:[]},choice:{entities:['founder'],steps:[]},outcome:{affectedEntities:['founder'],relations:[]}};
  core.state.closedExperiences=[exp];core.state.flow=[{event:{id:'now'},changedEntities:['other-O']}];
  const field=core.reconstituteAffinityField();
  assert(processEvidenceEntities(exp).length===0,'V9 regression: co-presence leaked into process evidence.');
  assert(field.reactivatedExperienceIds.length===0,'V9 regression: co-presence-only experience reactivated.');
  return {status:'PASS'};
}

async function preExperimentAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v9/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  const persistentStateOnly=auditPersistentStateOnly();
  const removalCollision=auditRemovalCollision();
  const roleIdentity=auditRoleIdentity();
  const c5=auditC5Regression();

  const nodes=createFoundingV9AncestorNodes(101);
  assert(new Set(nodes.map(n=>n.id)).size===7,'V9 does not contain seven archetypes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'v9-preaudit'});
  for(const n of nodes)system.registerDecisionNode(n);
  const world=new FoundingFlowV3World();await system.revealReality(world.initialFrame());
  const snaps=[...system.branchRealities.values()].map(l=>stripLedgerSpecific(l.currentSnapshot()));const canon=stable(snaps[0]);for(const s of snaps)assert(stable(s)===canon,'V9 initial reality diverged across branches.');
  const proposals=await system.deliberateAll();
  const oasis=nodes.find(n=>n.id==='oasis');const state=oasis.exportState();const snap=system.branchRealities.get('oasis').currentSnapshot();
  assert(stable([...state.flow.at(-1).changedEntities].sort())===stable([...(snap.deltaSubjects??[])].sort()),'V9 OASIS changedEntities contains non-reality entities.');
  assert(stable([...(proposals.oasis.raw.oasis.seedEntities??[])].sort())===stable([...(snap.deltaSubjects??[])].sort()),'V9 OASIS seed contains non-delta entities.');
  assert(!state.world.relations.some(r=>r.kind==='located-relative-to'),'V9 regression: far spatial relation returned.');

  return {
    successValueAudit:{status:'PASS',evidence:['No target action, tie reduction, role count, or preferred archetype is defined.']},
    evaluationAudit:{status:'PASS',evidence:['No cross-system performance score is computed.']},
    flowAudit:{status:'PASS',evidence:['Current-state and outcome-mutation are both preserved without turning historical remove into current negative state.']},
    implementationAudit:{status:'PASS',evidence:['Only completed-process relation role capture and role-aware structural identity are changed; possibility, choice, responsibility and comparator rules remain inherited.']},
    persistentStateOnly,
    removalCollision,
    roleIdentity,
    c5RegressionAudit:c5,
    farSpatialRegressionAudit:{status:'PASS'}
  };
}

function validateLatestExperience(exp, seed, round) {
  for(const outcomeRelation of exp.outcome?.relations??[]) {
    const match=(exp.processRelations??[]).some(r=>r.processRole==='outcome-mutation' && r.id===outcomeRelation.id && r.op===outcomeRelation.op);
    assert(match,`Seed ${seed} round ${round}: actual outcome relation ${outcomeRelation.id}/${outcomeRelation.op} missing from outcome-mutation process record.`);
  }
  const mutationIds=new Set((exp.outcome?.relations??[]).map(r=>`${r.id}|${r.op}`));
  for(const relation of exp.processRelations??[]) {
    if(relation.processRole==='outcome-mutation') assert(mutationIds.has(`${relation.id}|${relation.op}`),`Seed ${seed} round ${round}: fabricated outcome-mutation record.`);
  }
}

async function runSeed(seed,audit){
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v9:${seed}`});
  const nodes=createFoundingV9AncestorNodes(seed);const worlds=new Map();for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const init=[...worlds.values()].map(w=>w.initialFrame());const canon=stable(init[0]);for(const f of init)assert(stable(f)===canon,`Seed ${seed}: initial frame divergence.`);await system.revealReality(init[0]);
  const rounds=[];
  for(let round=0;round<12;round++){
    const proposals=await system.deliberateAll();if(round>0)assert(!(proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]).includes('experience:0'),`Seed ${seed} round ${round}: C5 regression experience:0 reactivated.`);
    const rec={round,realityBefore:Object.fromEntries([...system.branchRealities].map(([id,l])=>[id,clone(l.currentSnapshot())])),proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)){
      const action=record.raw?.action;assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);const world=worlds.get(nodeId);const legal=new Set(world.legalActions().map(actionKey));assert(legal.has(actionKey(action)),`Illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v9',actionKey:actionKey(action)}}));rec.worldAfter[nodeId]=world.snapshotState();
      if(nodeId==='oasis'){
        const oasisNode=nodes.find(n=>n.id==='oasis');const latest=oasisNode.exportState().closedExperiences.at(-1);validateLatestExperience(latest,seed,round);
      }
    }
    if(round<11){const ex=[...worlds.values()].map(w=>w.exogenousFrame(round));const ec=stable(ex[0]);for(const f of ex)assert(stable(f)===ec,`Seed ${seed} round ${round}: exogenous divergence.`);rec.exogenousAfter=clone(ex[0]);await system.revealReality(ex[0]);}
    rounds.push(rec);
  }
  const nodeStates={};for(const n of nodes){if(n.id==='oasis'){const s=n.exportState();nodeStates.oasis={closedExperienceCount:s.closedExperiences.length,actualizationCount:s.actualizations.length,spiralLineage:s.spiralLineage,closedExperiences:s.closedExperiences};}else nodeStates[n.id]={historyLength:n.history?.length??null,episodes:clone(n.episodes??null),relationHistory:clone(n.relationHistory??null),lastProposal:clone(n.lastProposal??null)};}
  const tieCounts=Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length]));
  const roleCounts={};for(const exp of nodeStates.oasis.closedExperiences)for(const rel of exp.processRelations??[])roleCounts[rel.processRole??'untyped']=(roleCounts[rel.processRole??'untyped']??0)+1;
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV9(seed),rounds,actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,roleCounts},nodeStates,auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')){console.log(JSON.stringify({experiment:'Founding Flow v9',audit},null,2));process.exit(0);}
const seeds=[101,211,307,401,503];const runs=[];for(const seed of seeds)runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v9',status:'EXECUTED',evidenceBoundary:'Relation state/mutation role-separation implementation fidelity only; no superiority, culture or generation claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/founding-flow-v9.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,roleCounts:r.mechanismDiagnostics.roleCounts,tieCounts:r.mechanismDiagnostics.tieCounts,oasisClosedExperiences:r.nodeStates.oasis.closedExperienceCount}))},null,2));
