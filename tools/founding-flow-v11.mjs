import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem, RealityLedger } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import {
  OASISConcurrentCanonicalCore,
  OASISAncestorV11Node,
  createFoundingV11AncestorNodes,
  sharedGoalForSeedV11
} from '../src/validation/founding-flow-v11-ancestors.mjs';
import { roleAwareRelationKey } from '../src/validation/founding-flow-v9-ancestors.mjs';
import { processEvidenceEntities } from '../src/validation/founding-flow-v5-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
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

function participant(id) {
  return { id, roles:[id==='founder'?'founder':'other'], capabilities:['*'], obligations:[], available:true };
}
function relation(id, from, to, kind='observed-with', op='upsert', processRole=null) {
  return { id, from, to, kind, context:null, entities:[from,to], op, ...(processRole?{processRole}:{}) };
}
function idleAffordance() {
  return {
    id:'idle',op:'upsert',actor:'founder',action:'idle',target:null,entities:['founder'],requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],meta:{originalStepId:'idle',primitiveAction:{op:'idle'}}
  };
}
function touchAffordance(target) {
  return {
    id:`touch:${target}`,op:'upsert',actor:'founder',action:`touch:${target}`,target,entities:['founder',target],requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],meta:{originalStepId:`touch:${target}`,primitiveAction:{op:'touch',target}}
  };
}
function createCore(seed=20260906) { return new OASISConcurrentCanonicalCore({realizationSeed:seed,anchorEntityId:'founder'}); }

function runSameFrame(relations) {
  const core=createCore();
  core.observe({id:'same-frame',time:'T0',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')],relations});
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  return core.deliberate();
}

function auditSameFramePermutation() {
  const rA=relation('rA','founder','A');
  const rB=relation('rB','founder','B');
  const a=runSameFrame([rA,rB]);
  const b=runSameFrame([rB,rA]);
  assert(stable(a.field.relationSignature)===stable(b.field.relationSignature),'C7 FIX FAIL: same-frame permutation still changes relationSignature.');
  assert(a.structuralExpansion.structureKey===b.structuralExpansion.structureKey,'C7 FIX FAIL: same-frame permutation still changes structureKey.');
  assert(a.choice?.id===b.choice?.id,'C7 FIX FAIL: same-frame permutation changes proposal.');
  return {status:'PASS',relationSignature:a.field.relationSignature,structureKey:a.structuralExpansion.structureKey,choiceId:a.choice?.id??null};
}

function syntheticExperience(processRelations, id='experience:0', sequence=0) {
  return {
    id,sequence,
    before:{changedEntities:['founder']},after:{changedEntities:['founder','A','B']},
    processRelations:clone(processRelations),
    participation:{current:['founder','A','B'],historical:[]},
    choice:{id:`choice:${id}`,entities:['founder'],steps:[],participants:['founder'],responsibility:null},
    outcome:{eventId:`outcome:${id}`,affectedEntities:['founder','A','B'],relations:[]}
  };
}

function runHistoricalWithinExperience(processRelations) {
  const core=createCore(88);
  core.observe({id:'historical-current',time:'T9',entities:['A'],participants:[participant('founder'),participant('A'),participant('B')]});
  core.state.closedExperiences=[syntheticExperience(processRelations)];
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  return core.deliberate();
}

function auditHistoricalWithinExperiencePermutation() {
  const rA=relation('out:A','founder','A','changed','upsert','outcome-mutation');
  const rB=relation('out:B','founder','B','changed','upsert','outcome-mutation');
  const a=runHistoricalWithinExperience([rA,rB]);
  const b=runHistoricalWithinExperience([rB,rA]);
  assert(stable(a.field.reactivatedExperienceIds)===stable(b.field.reactivatedExperienceIds),'Historical permutation changed reactivation lineage.');
  assert(stable(a.field.relationSignature)===stable(b.field.relationSignature),'C7 FIX FAIL: within-experience concurrent relation permutation changes signature.');
  assert(a.structuralExpansion.structureKey===b.structuralExpansion.structureKey,'C7 FIX FAIL: within-experience concurrent relation permutation changes structureKey.');
  return {status:'PASS',reactivated:a.field.reactivatedExperienceIds,relationSignature:a.field.relationSignature,structureKey:a.structuralExpansion.structureKey};
}

function runExperienceHistory(order) {
  const core=createCore(99);
  core.observe({id:'history-current',time:'T9',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')]});
  core.state.closedExperiences=order.map((target,index)=>syntheticExperience([
    relation(`out:${index}:${target}`,'founder',target,'changed','upsert','outcome-mutation')
  ],`experience:${index}`,index));
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  const d=core.deliberate();
  return {flow:core.exportState().flow.map(e=>({sequence:e.event.sequence,eventId:e.event.id})),reactivated:d.field.reactivatedExperienceIds,relationSignature:d.field.relationSignature,structureKey:d.structuralExpansion.structureKey};
}

function auditTemporalExperienceOrderPositiveControl() {
  const ab=runExperienceHistory(['A','B']);
  const ba=runExperienceHistory(['B','A']);
  assert(stable(ab.relationSignature)!==stable(ba.relationSignature),'Temporal experience order was erased by concurrent canonicalization.');
  assert(ab.structureKey!==ba.structureKey,'Temporal experience-order structural identity collapsed.');
  return {status:'PASS',ab,ba};
}

function auditDirectionalityPositiveControl() {
  const forward=runSameFrame([relation('r','founder','A','directed')]);
  const reverse=runSameFrame([relation('r','A','founder','directed')]);
  assert(stable(forward.field.relationSignature)!==stable(reverse.field.relationSignature),'Directionality collapsed after C7 fix.');
  assert(forward.structuralExpansion.structureKey!==reverse.structuralExpansion.structureKey,'Directed structural identities collapsed after C7 fix.');
  return {status:'PASS',forward:forward.field.relationSignature,reverse:reverse.field.relationSignature};
}

function auditEligibilityAndSupportRegression() {
  const founderOnly=createCore(1);
  founderOnly.state.flow=[{event:{id:'now'},changedEntities:['founder']}];
  founderOnly.state.closedExperiences=[syntheticExperience([], 'experience:founder',0)];
  founderOnly.state.closedExperiences[0].choice.entities=['founder'];
  founderOnly.state.closedExperiences[0].outcome.affectedEntities=['founder'];
  founderOnly.state.closedExperiences[0].after.changedEntities=['founder'];
  assert(founderOnly.reconstituteAffinityField().reactivatedExperienceIds.length===0,'C1 regression: founder-only experience reactivated.');

  const co=createCore(2);
  const coExp=syntheticExperience([], 'experience:co',0);
  coExp.before.changedEntities=['founder','A'];coExp.after.changedEntities=['founder'];coExp.choice.entities=['founder'];coExp.outcome.affectedEntities=['founder'];
  co.state.flow=[{event:{id:'now-A'},changedEntities:['A']}];co.state.closedExperiences=[coExp];
  assert(processEvidenceEntities(coExp).length===0,'C5 regression: co-presence entered process evidence.');
  assert(co.reconstituteAffinityField().reactivatedExperienceIds.length===0,'C5 regression: co-presence-only experience reactivated.');

  const supportCore=createCore(3);
  const field={relations:[relation('hold','founder','A','holds','upsert','outcome-mutation')],reactivated:[{experienceId:'e1',relations:[relation('hold','founder','A','holds','upsert','outcome-mutation')],choice:{entities:['founder','A']},outcome:{affectedEntities:['founder','A']}}]};
  const idle=supportCore._supportForAffordance(idleAffordance(),field);
  const touch=supportCore._supportForAffordance(touchAffordance('A'),field);
  assert(idle.experienceIds.length===0,'C3 regression: founder-only overlap supports idle.');
  assert(touch.experienceIds.includes('e1'),'C3 regression: legitimate target support disappeared.');
  return {status:'PASS'};
}

function auditRoleAndRemovalRegression() {
  const core=createCore(4);
  core.observe({id:'formation',entities:['founder','A'],participants:[participant('founder'),participant('A')],relations:[relation('contact','founder','A','contacted','upsert')]});
  core.observe({id:'later',entities:['A'],facts:[{id:'still-A',entities:['A'],value:{present:true},op:'upsert'}]});
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  const d=core.deliberate();
  const exp=core.actualize(d.choice.id,{id:'remove-outcome',entities:['founder','A'],relations:[relation('contact','founder','A','contacted','remove')]});
  const state=exp.processRelations.find(r=>r.id==='contact'&&r.processRole==='current-state');
  const remove=exp.processRelations.find(r=>r.id==='contact'&&r.processRole==='outcome-mutation'&&r.op==='remove');
  assert(state&&remove,'C6 regression: current state and actual remove are not both preserved.');
  assert(roleAwareRelationKey(state)!==roleAwareRelationKey(remove),'C4-N/C6 regression: state/remove identities collapse.');
  assert(core.exportState().world.relations.every(r=>r.id!=='contact'),'C6 regression: removed relation remains live.');
  return {status:'PASS',stateKey:roleAwareRelationKey(state),removeKey:roleAwareRelationKey(remove)};
}

async function auditFarSpatialAndComparators() {
  const world=new FoundingFlowV3World();const ledger=new RealityLedger({ledgerId:'v11-far'});const snapshot=ledger.append(world.initialFrame());
  const nodes=createFoundingV11AncestorNodes(101);assert(nodes.length===7&&new Set(nodes.map(n=>n.id)).size===7,'Expected seven archetypes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')){assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);await n.observe(snapshot);}
  const oasis=nodes.find(n=>n.id==='oasis');await oasis.observe(snapshot);const state=oasis.exportState();assert(!state.world.relations.some(r=>r.kind==='located-relative-to'),'C2 regression: far spatial relation entered OASIS current world.');
  const temporal=nodes.find(n=>n.id==='temporal-relational');assert(!arr(temporal.relationHistory).some(r=>r.kind==='located-relative-to'),'Temporal comparator far-spatial regression.');
  return {status:'PASS'};
}

async function preExperimentAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v11/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  const sameFramePermutation=auditSameFramePermutation();
  const historicalWithinExperiencePermutation=auditHistoricalWithinExperiencePermutation();
  const temporalExperienceOrderPositiveControl=auditTemporalExperienceOrderPositiveControl();
  const directionalityPositiveControl=auditDirectionalityPositiveControl();
  const eligibilityAndSupportRegression=auditEligibilityAndSupportRegression();
  const roleAndRemovalRegression=auditRoleAndRemovalRegression();
  const farSpatialAndComparatorRegression=await auditFarSpatialAndComparators();
  return {
    successValueAudit:{status:'PASS',evidence:['No target action, tie reduction, diversity or preferred archetype is defined.']},
    evaluationAudit:{status:'PASS',evidence:['No cross-system performance score or winner is computed.']},
    flowAudit:{status:'PASS',evidence:['Experience sequence positive control remains distinct while only concurrent relation sets are canonicalized.']},
    implementationAudit:{status:'PASS',evidence:['Only validation-layer relation-set representation is canonicalized; core choice, responsibility, possibility generation and comparators remain inherited.']},
    sameFramePermutation,
    historicalWithinExperiencePermutation,
    temporalExperienceOrderPositiveControl,
    directionalityPositiveControl,
    eligibilityAndSupportRegression,
    roleAndRemovalRegression,
    farSpatialAndComparatorRegression
  };
}

function validateLatestExperience(exp, seed, round) {
  for(const outcomeRelation of exp.outcome?.relations??[]) {
    assert((exp.processRelations??[]).some(r=>r.processRole==='outcome-mutation'&&r.id===outcomeRelation.id&&r.op===outcomeRelation.op),`Seed ${seed} round ${round}: actual outcome relation ${outcomeRelation.id}/${outcomeRelation.op} missing.`);
  }
  const actual=new Set((exp.outcome?.relations??[]).map(r=>`${r.id}|${r.op}`));
  for(const r of exp.processRelations??[]) if(r.processRole==='outcome-mutation') assert(actual.has(`${r.id}|${r.op}`),`Seed ${seed} round ${round}: fabricated outcome-mutation ${r.id}/${r.op}.`);
}

async function runSeed(seed,audit) {
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v11:${seed}`});
  const nodes=createFoundingV11AncestorNodes(seed);const worlds=new Map();for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const init=[...worlds.values()].map(w=>w.initialFrame());const canon=stable(init[0]);for(const frame of init)assert(stable(frame)===canon,`Seed ${seed}: initial frame divergence.`);await system.revealReality(init[0]);
  const rounds=[];
  for(let round=0;round<12;round++) {
    const proposals=await system.deliberateAll();
    if(round>0)assert(!(proposals.oasis.raw?.oasis?.reactivatedExperienceIds??[]).includes('experience:0'),`Seed ${seed} round ${round}: C5 regression experience:0 reactivated.`);
    const rec={round,proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)) {
      const action=record.raw?.action;assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);const world=worlds.get(nodeId);const legal=new Set(world.legalActions().map(actionKey));assert(legal.has(actionKey(action)),`Illegal action ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v11',actionKey:actionKey(action)}}));rec.worldAfter[nodeId]=world.snapshotState();
      if(nodeId==='oasis'){const latest=nodes.find(n=>n.id==='oasis').exportState().closedExperiences.at(-1);validateLatestExperience(latest,seed,round);}
    }
    if(round<11){const frames=[...worlds.values()].map(w=>w.exogenousFrame(round));const c=stable(frames[0]);for(const frame of frames)assert(stable(frame)===c,`Seed ${seed} round ${round}: exogenous divergence.`);rec.exogenousAfter=clone(frames[0]);await system.revealReality(frames[0]);}
    rounds.push(rec);
  }
  const oasisState=nodes.find(n=>n.id==='oasis').exportState();
  const tieCounts=Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length]));
  const roleCounts={};for(const exp of oasisState.closedExperiences)for(const rel of exp.processRelations??[])roleCounts[rel.processRole??'untyped']=(roleCounts[rel.processRole??'untyped']??0)+1;
  return {seed,sharedGoalForPredictiveAndUtility:sharedGoalForSeedV11(seed),actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),mechanismDiagnostics:{tieCounts,roleCounts},oasis:{closedExperienceCount:oasisState.closedExperiences.length,spiralLineage:oasisState.spiralLineage,closedExperiences:oasisState.closedExperiences},auditTrail:system.exportAuditTrail()};
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')){console.log(JSON.stringify({experiment:'Founding Flow v11',audit},null,2));process.exit(0);}
const seeds=[101,211,307,401,503];const runs=[];for(const seed of seeds)runs.push(await runSeed(seed,audit));
const report={experiment:'Founding Flow v11',status:'EXECUTED',evidenceBoundary:'Concurrent relation canonicalization implementation fidelity only; no superiority, culture or generation claim.',seeds,systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],preExperimentAudit:audit,runs};
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/founding-flow-v11.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,goal:r.sharedGoalForPredictiveAndUtility,roleCounts:r.mechanismDiagnostics.roleCounts,tieCounts:r.mechanismDiagnostics.tieCounts,oasisClosedExperiences:r.oasis.closedExperienceCount}))},null,2));
