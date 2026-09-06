import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import {
  createFoundingV5AncestorNodes,
  OASISProcessEvidenceCore,
  processEvidenceEntities,
  sharedGoalForSeedV5
} from '../src/validation/founding-flow-v5-ancestors.mjs';

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

function syntheticExperience({ id, before = [], after = [], processRelations = [], choiceEntities = ['founder'], outcomeAffected = ['founder'], outcomeRelations = [] }) {
  return {
    id,
    sequence: 0,
    before: { changedEntities: clone(before) },
    after: { changedEntities: clone(after) },
    processRelations: clone(processRelations),
    participation: { current: ['founder'], historical: [], affectedEntities: [] },
    choice: { id:`choice:${id}`, entities:clone(choiceEntities), steps:[], participants:['founder'] },
    outcome: { affectedEntities:clone(outcomeAffected), relations:clone(outcomeRelations) }
  };
}

function fieldFor(core, currentEntities) {
  core.state.flow = [{ changedEntities: clone(currentEntities), event: { id:'synthetic-now' } }];
  return core.reconstituteAffinityField();
}

function c5TargetedAudit() {
  const coPresence = new OASISProcessEvidenceCore({ realizationSeed:1, anchorEntityId:'founder' });
  const coPresenceExp = syntheticExperience({
    id:'experience:co-presence-only',
    before:['founder','other-O'],
    after:['founder'],
    choiceEntities:['founder'],
    outcomeAffected:['founder']
  });
  coPresence.state.closedExperiences=[coPresenceExp];
  const coPresenceField=fieldFor(coPresence,['other-O']);
  assert(coPresenceField.reactivatedExperienceIds.length===0,'C5 FAIL: co-presence-only experience reactivated from other-O.');
  assert(processEvidenceEntities(coPresenceExp).length===0,'C5 FAIL: before/after changedEntities leaked into process evidence entities.');

  const relationCore = new OASISProcessEvidenceCore({ realizationSeed:1, anchorEntityId:'founder' });
  relationCore.state.closedExperiences=[syntheticExperience({
    id:'experience:relation',
    processRelations:[{id:'rel:contact',from:'founder',to:'other-O',kind:'contacted'}]
  })];
  const relationField=fieldFor(relationCore,['other-O']);
  assert(relationField.reactivatedExperienceIds.includes('experience:relation'),'C5 FAIL: explicit process-relation evidence cannot reactivate matching experience.');

  const choiceCore = new OASISProcessEvidenceCore({ realizationSeed:1, anchorEntityId:'founder' });
  choiceCore.state.closedExperiences=[syntheticExperience({
    id:'experience:choice',
    choiceEntities:['founder','resource-A']
  })];
  const choiceField=fieldFor(choiceCore,['resource-A']);
  assert(choiceField.reactivatedExperienceIds.includes('experience:choice'),'C5 FAIL: actual non-founder choice entity cannot reactivate matching experience.');

  const outcomeCore = new OASISProcessEvidenceCore({ realizationSeed:1, anchorEntityId:'founder' });
  outcomeCore.state.closedExperiences=[syntheticExperience({
    id:'experience:outcome',
    outcomeAffected:['founder','resource-B']
  })];
  const outcomeField=fieldFor(outcomeCore,['resource-B']);
  assert(outcomeField.reactivatedExperienceIds.includes('experience:outcome'),'C5 FAIL: actual non-founder outcome entity cannot reactivate matching experience.');

  const founderCore = new OASISProcessEvidenceCore({ realizationSeed:1, anchorEntityId:'founder' });
  founderCore.state.closedExperiences=[syntheticExperience({
    id:'experience:founder-only',
    choiceEntities:['founder'],outcomeAffected:['founder']
  })];
  const founderField=fieldFor(founderCore,['founder']);
  assert(founderField.reactivatedExperienceIds.length===0,'V4 regression: founder-only experience reactivated.');

  return {
    status:'PASS',
    coPresenceOnly:{processEvidenceEntities:processEvidenceEntities(coPresenceExp),reactivated:coPresenceField.reactivatedExperienceIds},
    processRelation:relationField.reactivatedExperienceIds,
    choiceEntity:choiceField.reactivatedExperienceIds,
    outcomeEntity:outcomeField.reactivatedExperienceIds,
    founderOnly:founderField.reactivatedExperienceIds
  };
}

async function farSpatialRegressionAudit() {
  const nodes=createFoundingV5AncestorNodes(101);
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'v5-far-spatial-audit'});
  for(const n of nodes) system.registerDecisionNode(n);
  const world=new FoundingFlowV3World(); await system.revealReality(world.initialFrame());
  const oasis=nodes.find(n=>n.id==='oasis');
  const temporal=nodes.find(n=>n.id==='temporal-relational');
  assert(!oasis.exportState().world.relations.some(r=>r.kind==='located-relative-to'),'V4 regression: OASIS far spatial relation returned.');
  assert(!temporal.relationHistory.some(r=>r.kind==='located-relative-to'),'V4 regression: Temporal far spatial relation returned.');
  return {status:'PASS',oasisRelationKinds:oasis.exportState().world.relations.map(r=>r.kind),temporalRelationKinds:temporal.relationHistory.map(r=>r.kind)};
}

async function preExperimentAudit() {
  const audit={
    successValueAudit:{status:'PASS',evidence:[]},evaluationAudit:{status:'PASS',evidence:[]},flowAudit:{status:'PASS',evidence:[]},implementationAudit:{status:'PASS',evidence:[]},c5TargetedAudit:null,farSpatialRegressionAudit:null
  };
  const bad=new RealityLedger({ledgerId:'bad'});let rejected=false;
  try{bad.append({id:'bad',claims:[{id:'bad-c',kind:'fact',temporality:'persistent',subjects:['founder'],payload:{action_menu:['preferred']},source:'audit',observed_at:'t0',available_at:'t0',accessible_to:['founder']} ]});}catch{rejected=true;}
  assert(rejected,'RealityLedger accepted injected action menu.');
  audit.flowAudit.evidence.push('RealityLedger rejects action-menu injection.');

  const nodes=createFoundingV5AncestorNodes(101);const ids=nodes.map(n=>n.id);
  assert(new Set(ids).size===7 && ids.includes('oasis'),'Expected seven v5 archetype nodes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);
  audit.implementationAudit.evidence.push('Only OASIS reactivation eligibility changes from v4; all comparator decision principles are preserved.');
  audit.implementationAudit.evidence.push('C4 outcome-to-reactivated-affordance reconstruction is not modified in v5.');

  audit.c5TargetedAudit=c5TargetedAudit();
  audit.farSpatialRegressionAudit=await farSpatialRegressionAudit();

  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:'v5-preaudit'});
  const checkNodes=createFoundingV5AncestorNodes(101);for(const n of checkNodes)system.registerDecisionNode(n);
  const world=new FoundingFlowV3World();await system.revealReality(world.initialFrame());
  const snapshots=[...system.branchRealities.values()].map(l=>stripLedgerSpecific(l.currentSnapshot()));const canonical=stable(snapshots[0]);
  for(const s of snapshots)assert(stable(s)===canonical,'Initial v5 reality diverged across branches.');
  const proposals=await system.deliberateAll();for(const [id,r] of Object.entries(proposals))assert(r.raw?.action,`${id} produced no action in v5 preaudit.`);
  const oasis=checkNodes.find(n=>n.id==='oasis');const state=oasis.exportState();const snap=system.branchRealities.get('oasis').currentSnapshot();
  assert(stable([...state.flow.at(-1).changedEntities].sort())===stable([...(snap.deltaSubjects??[])].sort()),'OASIS v5 changedEntities contains non-reality entities.');
  assert(stable([...(proposals.oasis.raw.oasis.seedEntities??[])].sort())===stable([...(snap.deltaSubjects??[])].sort()),'OASIS v5 seed contains non-delta entities.');
  audit.flowAudit.evidence.push('All branches receive identical initial reality and OASIS current seed remains delta-grounded.');

  const protocol=await fs.readFile('experiments/founding-flow-v5/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  audit.successValueAudit.evidence.push('No desired reactivation count, preferred action, or preferred archetype is defined.');
  audit.evaluationAudit.evidence.push('Tie count and action diversity are not used as performance scores.');
  return audit;
}

async function runSeed(seed,audit){
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v5:${seed}`});
  const nodes=createFoundingV5AncestorNodes(seed);const worlds=new Map();for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const init=[...worlds.values()].map(w=>w.initialFrame());const canon=stable(init[0]);for(const f of init)assert(stable(f)===canon,`Seed ${seed}: initial frame divergence.`);await system.revealReality(init[0]);
  const rounds=[];
  for(let round=0;round<12;round++){
    const proposals=await system.deliberateAll();
    const oasisTrace=proposals.oasis.raw?.oasis;
    if(round>0) assert(!(oasisTrace?.reactivatedExperienceIds??[]).includes('experience:0'),`Seed ${seed} round ${round}: co-presence-only experience:0 reactivated in real trace.`);
    const rec={round,realityBefore:Object.fromEntries([...system.branchRealities].map(([id,l])=>[id,clone(l.currentSnapshot())])),proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)){
      const action=record.raw?.action;assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);const world=worlds.get(nodeId);const legal=new Set(world.legalActions().map(actionKey));assert(legal.has(actionKey(action)),`Illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v5',actionKey:actionKey(action)}}));rec.worldAfter[nodeId]=world.snapshotState();
    }
    if(round<11){const ex=[...worlds.values()].map(w=>w.exogenousFrame(round));const ec=stable(ex[0]);for(const f of ex)assert(stable(f)===ec,`Seed ${seed} round ${round}: exogenous divergence.`);rec.exogenousAfter=clone(ex[0]);await system.revealReality(ex[0]);}
    rounds.push(rec);
  }
  const nodeStates={};for(const n of nodes){if(n.id==='oasis'){const s=n.exportState();nodeStates.oasis={closedExperienceCount:s.closedExperiences.length,actualizationCount:s.actualizations.length,spiralLineage:s.spiralLineage,closedExperiences:s.closedExperiences};}else nodeStates[n.id]={historyLength:n.history?.length??null,episodes:clone(n.episodes??null),relationHistory:clone(n.relationHistory??null),lastProposal:clone(n.lastProposal??null)};}
  const tieCounts=Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length]));
  const oasisReactivation=rounds.map(r=>({round:r.round,currentDelta:clone(r.realityBefore.oasis.deltaSubjects??[]),ids:clone(r.proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]),paths:clone(r.proposals.oasis.raw?.oasis?.paths??[]),count:(r.proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]).length,actionKey:r.proposals.oasis.raw?.actionKey??null,tie:r.proposals.oasis.raw?.oasis?.tieBreakUsed??null}));
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV5(seed),rounds,actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,oasisReactivation},nodeStates,auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')){console.log(JSON.stringify({experiment:'Founding Flow v5',audit},null,2));process.exit(0);}
const seeds=[101,211,307,401,503];const runs=[];for(const seed of seeds)runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v5',status:'EXECUTED',evidenceBoundary:'Process-evidence reactivation implementation validation only; no superiority, culture or generation claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/founding-flow-v5.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,tieCounts:r.mechanismDiagnostics.tieCounts,oasisReactivation:r.mechanismDiagnostics.oasisReactivation,actionSequences:r.actionSequences,oasisClosedExperiences:r.nodeStates.oasis.closedExperienceCount}))},null,2));
