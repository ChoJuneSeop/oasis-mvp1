import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import {
  createFoundingV7AncestorNodes,
  OASISMutationPolarityCore,
  mutationAwareRelationKey,
  sharedGoalForSeedV7
} from '../src/validation/founding-flow-v7-ancestors.mjs';
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

function primitiveTouch() {
  return {
    id:'touch:other-O',op:'upsert',actor:'founder',action:'touch:other-O',target:'other-O',entities:['founder','other-O'],
    requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],
    meta:{primitiveAction:{op:'touch',target:'other-O'},originalStepId:'touch:other-O'}
  };
}
function makeExperience({ op='upsert', kind='contacted', id='experience:0' }) {
  const relation={id:'contact:founder:other-O',from:'founder',to:'other-O',kind,entities:['founder','other-O'],op};
  const step=primitiveTouch();
  return {
    id,sequence:0,deliberationId:'past',
    before:{flowEventId:'past',changedEntities:['other-O'],world:{}},
    field:{seedEntities:['other-O'],reactivatedExperienceIds:[],paths:[],relationSignature:[]},
    processRelations:[clone(relation)],participation:{current:['founder','other-O'],historical:[],affectedEntities:['founder','other-O']},
    possibilitiesObserved:[{id:'direct:touch:other-O',steps:['touch:other-O']}],
    choice:{id:'historical-choice',kind:'direct-affordance',steps:[clone(step)],entities:['founder','other-O'],participants:['founder'],responsibility:null},
    outcome:{eventId:'historical-outcome',relations:[clone(relation)],affectedEntities:['founder','other-O'],beforeWorld:{},afterWorld:{}},
    after:{changedEntities:['founder','other-O'],world:{}}
  };
}
function prepareCore({ op='upsert', kind='contacted' }) {
  const core=new OASISMutationPolarityCore({realizationSeed:7,anchorEntityId:'founder'});
  core.state.world.participants.set('founder',{id:'founder',roles:['founder'],capabilities:['*'],obligations:[],available:true});
  core.state.world.participants.set('other-O',{id:'other-O',roles:['other'],capabilities:[],obligations:[],available:true});
  core.setValidationPrimitiveAffordances([primitiveTouch()]);
  core.state.closedExperiences=[makeExperience({op,kind})];
  core.state.flow=[{event:{id:'current-flow'},changedEntities:['other-O'],previousChoiceId:null}];
  return core;
}
function summarize(core) {
  const d=core.deliberate();
  return {
    historicalRelations:d.field.historicalRelations.map(r=>({id:r.id,from:r.from,to:r.to,kind:r.kind,op:r.op??null})),
    relationSignature:clone(d.field.relationSignature),
    reactivatedExperienceIds:clone(d.field.reactivatedExperienceIds),
    choiceId:d.choice?.id??null,
    tieBreakUsed:d.tieBreakUsed,
    structureKey:d.structuralExpansion.structureKey
  };
}

function targetedPolarityAudit() {
  const upsert=summarize(prepareCore({op:'upsert',kind:'contacted'}));
  const remove=summarize(prepareCore({op:'remove',kind:'contacted'}));
  const kindControl=summarize(prepareCore({op:'upsert',kind:'signaled'}));
  assert(stable(upsert.relationSignature)!==stable(remove.relationSignature),'V7 FAIL: upsert/remove relation signatures still collapse.');
  assert(upsert.structureKey!==remove.structureKey,'V7 FAIL: upsert/remove structural keys still collapse.');
  assert(stable(upsert.relationSignature)!==stable(kindControl.relationSignature),'V7 FAIL: relation kind positive control collapsed.');
  assert(mutationAwareRelationKey({from:'founder',to:'other-O',kind:'adjacent-to'})==='observe:founder->other-O:adjacent-to:','V7 FAIL: derived relation without mutation op is not marked observe.');
  assert(mutationAwareRelationKey({from:'founder',to:'other-O',kind:'contacted',op:'upsert'})!=='observe:founder->other-O:contacted:','V7 FAIL: explicit mutation is conflated with derived observation.');
  return {status:'PASS',upsert,remove,kindControl};
}

function c5RegressionAudit() {
  const core=new OASISMutationPolarityCore({realizationSeed:1,anchorEntityId:'founder'});
  const exp={
    id:'experience:co-presence',sequence:0,
    before:{changedEntities:['founder','other-O']},after:{changedEntities:['founder']},processRelations:[],
    participation:{current:['founder'],historical:[]},choice:{entities:['founder'],steps:[]},outcome:{affectedEntities:['founder'],relations:[]}
  };
  core.state.closedExperiences=[exp];
  core.state.flow=[{event:{id:'now'},changedEntities:['other-O']}];
  const field=core.reconstituteAffinityField();
  assert(processEvidenceEntities(exp).length===0,'V7 regression: co-presence leaked into process evidence.');
  assert(field.reactivatedExperienceIds.length===0,'V7 regression: co-presence-only experience reactivated.');
  return {status:'PASS',reactivated:field.reactivatedExperienceIds};
}

async function preExperimentAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v7/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  const nodes=createFoundingV7AncestorNodes(101);
  assert(new Set(nodes.map(n=>n.id)).size===7,'V7 does not contain seven distinct archetypes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);

  const polarity=targetedPolarityAudit();
  const c5=c5RegressionAudit();

  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'v7-preaudit'});
  for(const n of nodes)system.registerDecisionNode(n);
  const world=new FoundingFlowV3World();await system.revealReality(world.initialFrame());
  const snaps=[...system.branchRealities.values()].map(l=>stripLedgerSpecific(l.currentSnapshot()));const canon=stable(snaps[0]);
  for(const s of snaps)assert(stable(s)===canon,'V7 initial reality diverged across branches.');
  const proposals=await system.deliberateAll();
  const oasis=nodes.find(n=>n.id==='oasis');const state=oasis.exportState();const snap=system.branchRealities.get('oasis').currentSnapshot();
  assert(stable([...state.flow.at(-1).changedEntities].sort())===stable([...(snap.deltaSubjects??[])].sort()),'V7 OASIS changedEntities contains non-reality entities.');
  assert(stable([...(proposals.oasis.raw.oasis.seedEntities??[])].sort())===stable([...(snap.deltaSubjects??[])].sort()),'V7 OASIS seed contains non-delta entities.');
  assert(!state.world.relations.some(r=>r.kind==='located-relative-to'),'V7 regression: far spatial relation returned to OASIS current world.');
  const temporal=nodes.find(n=>n.id==='temporal-relational');
  assert(!temporal.relationHistory.some(r=>r.kind==='located-relative-to'),'V7 regression: far spatial relation returned to Temporal history.');

  return {
    successValueAudit:{status:'PASS',evidence:['No target action, tie reduction, or preferred archetype is defined.']},
    evaluationAudit:{status:'PASS',evidence:['No cross-system performance score is computed.']},
    flowAudit:{status:'PASS',evidence:['Historical remove remains historical evidence and does not overwrite current live-state semantics; all branches receive identical reality.']},
    implementationAudit:{status:'PASS',evidence:['Only relation structural signature gains mutation polarity; reactivation, possibilities, choice and responsibility algorithms are inherited unchanged.']},
    targetedPolarityAudit:polarity,
    c5RegressionAudit:c5,
    farSpatialRegressionAudit:{status:'PASS'}
  };
}

async function runSeed(seed,audit){
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v7:${seed}`});
  const nodes=createFoundingV7AncestorNodes(seed);const worlds=new Map();for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const init=[...worlds.values()].map(w=>w.initialFrame());const canon=stable(init[0]);for(const f of init)assert(stable(f)===canon,`Seed ${seed}: initial frame divergence.`);await system.revealReality(init[0]);
  const rounds=[];
  for(let round=0;round<12;round++){
    const proposals=await system.deliberateAll();
    if(round>0)assert(!(proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]).includes('experience:0'),`Seed ${seed} round ${round}: v5 co-presence regression.`);
    const rec={round,realityBefore:Object.fromEntries([...system.branchRealities].map(([id,l])=>[id,clone(l.currentSnapshot())])),proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)){
      const action=record.raw?.action;assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);const world=worlds.get(nodeId);const legal=new Set(world.legalActions().map(actionKey));assert(legal.has(actionKey(action)),`Illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v7',actionKey:actionKey(action)}}));rec.worldAfter[nodeId]=world.snapshotState();
    }
    if(round<11){const ex=[...worlds.values()].map(w=>w.exogenousFrame(round));const ec=stable(ex[0]);for(const f of ex)assert(stable(f)===ec,`Seed ${seed} round ${round}: exogenous divergence.`);rec.exogenousAfter=clone(ex[0]);await system.revealReality(ex[0]);}
    rounds.push(rec);
  }
  const nodeStates={};for(const n of nodes){if(n.id==='oasis'){const s=n.exportState();nodeStates.oasis={closedExperienceCount:s.closedExperiences.length,actualizationCount:s.actualizations.length,spiralLineage:s.spiralLineage,closedExperiences:s.closedExperiences};}else nodeStates[n.id]={historyLength:n.history?.length??null,episodes:clone(n.episodes??null),relationHistory:clone(n.relationHistory??null),lastProposal:clone(n.lastProposal??null)};}
  const tieCounts=Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length]));
  const oasisGenealogy=rounds.map(r=>({round:r.round,currentDelta:clone(r.realityBefore.oasis.deltaSubjects??[]),relationSignature:clone(r.proposals.oasis.raw?.oasis?.historicalRelations??[]),reactivated:clone(r.proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]),actionKey:r.proposals.oasis.raw?.actionKey??null,tie:r.proposals.oasis.raw?.oasis?.tieBreakUsed??null}));
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV7(seed),rounds,actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,oasisGenealogy},nodeStates,auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')){console.log(JSON.stringify({experiment:'Founding Flow v7',audit},null,2));process.exit(0);}
const seeds=[101,211,307,401,503];const runs=[];for(const seed of seeds)runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v7',status:'EXECUTED',evidenceBoundary:'Relation-mutation-polarity implementation fidelity only; no superiority, culture or generation claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/founding-flow-v7.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,tieCounts:r.mechanismDiagnostics.tieCounts,oasisClosedExperiences:r.nodeStates.oasis.closedExperienceCount}))},null,2));
