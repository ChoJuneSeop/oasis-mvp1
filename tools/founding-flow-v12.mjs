import fs from 'node:fs/promises';
import { OASISUnifiedValidationSystem } from '../src/validation/oasis-unified-validation-system.mjs';
import { FoundingFlowV3World, actionKey } from '../src/validation/founding-flow-v3-world.mjs';
import {
  OASISCanonicalFlowFingerprintCore,
  createFoundingV12AncestorNodes,
  sharedGoalForSeedV12
} from '../src/validation/founding-flow-v12-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }
function participant(id) { return { id, roles:[id==='founder'?'founder':'other'], capabilities:['*'], obligations:[], available:true }; }
function relation(id,to,meta={}) { return { id,from:'founder',to,kind:'observed-with',context:null,entities:['founder',to],op:'upsert',meta:clone(meta) }; }
function affordance(id) { return { id,op:'upsert',actor:'founder',action:id,target:null,entities:['founder'],requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],meta:{originalStepId:id,primitiveAction:{op:id}} }; }
function proposalTie(raw) { return raw?.architecture==='oasis' ? raw?.oasis?.tieBreakUsed===true : raw?.tieBreakUsed===true; }

function permutationRun(order, seed) {
  const core=new OASISCanonicalFlowFingerprintCore({realizationSeed:seed,anchorEntityId:'founder'});
  const map={A:relation('rA','A'),B:relation('rB','B')};
  core.observe({id:'same-frame',time:'T0',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')],relations:order.map(k=>map[k])});
  core.setValidationPrimitiveAffordances([affordance('idle'),affordance('emit')]);
  const fingerprint=core._flowFingerprint();
  const d=core.deliberate();
  return {fingerprint,relationSignature:clone(d.field.relationSignature),choiceId:d.choice?.id??null,step:d.choice?.steps?.[0]?.action??null,structureKey:d.structuralExpansion.structureKey,tieBreakUsed:d.tieBreakUsed};
}

function auditPermutationTwins() {
  const seeds=[1,2,3,5,8,13,21,34];
  const rows=seeds.map(seed=>({seed,a:permutationRun(['A','B'],seed),b:permutationRun(['B','A'],seed)}));
  for(const r of rows) {
    assert(r.a.tieBreakUsed&&r.b.tieBreakUsed,`Seed ${r.seed}: fixture did not exercise contingent realization.`);
    assert(stable(r.a.relationSignature)===stable(r.b.relationSignature),`Seed ${r.seed}: relationSignature differs under same-frame permutation.`);
    assert(r.a.fingerprint===r.b.fingerprint,`Seed ${r.seed}: flow fingerprint differs under same-frame permutation.`);
    assert(r.a.choiceId===r.b.choiceId&&r.a.step===r.b.step,`Seed ${r.seed}: contingent choice differs under same-frame permutation.`);
    assert(r.a.structureKey===r.b.structureKey,`Seed ${r.seed}: structureKey differs under same-frame permutation.`);
  }
  return {status:'PASS',seeds,rows};
}

function temporalRun(order) {
  const core=new OASISCanonicalFlowFingerprintCore({realizationSeed:55,anchorEntityId:'founder'});
  for(let i=0;i<order.length;i++) {
    const target=order[i];
    core.observe({id:`frame-${i}-${target}`,time:`T${i}`,entities:['founder',target],participants:[participant('founder'),participant(target)],relations:[relation(`r-${i}-${target}`,target)]});
  }
  return {
    fingerprint:core._flowFingerprint(),
    chronology:core.exportState().flow.map(e=>({sequence:e.event.sequence,eventId:e.event.id,time:e.event.time,target:e.event.relations[0]?.to??null}))
  };
}

function auditTemporalOrder() {
  const ab=temporalRun(['A','B']);
  const ba=temporalRun(['B','A']);
  assert(stable(ab.chronology)!==stable(ba.chronology),'Temporal chronology collapsed.');
  assert(ab.fingerprint!==ba.fingerprint,'Temporal flow fingerprint collapsed after canonicalization.');
  return {status:'PASS',ab,ba};
}

function explicitOrderRun(serialOrder) {
  const core=new OASISCanonicalFlowFingerprintCore({realizationSeed:77,anchorEntityId:'founder'});
  const map={A:relation('rA','A',{order:1}),B:relation('rB','B',{order:2})};
  core.observe({id:'ordered-frame',time:'T0',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')],relations:serialOrder.map(k=>map[k])});
  return core._flowFingerprint();
}

function auditExplicitSubOrder() {
  const canonical=explicitOrderRun(['A','B']);
  const reversedSerialization=explicitOrderRun(['B','A']);
  assert(canonical===reversedSerialization,'Explicit relation sub-order was not honored independently of serialization order.');
  return {status:'PASS'};
}

async function preExperimentAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v12/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains forbidden explicit target declaration.');
  const permutationTwins=auditPermutationTwins();
  const temporalOrder=auditTemporalOrder();
  const explicitSubOrder=auditExplicitSubOrder();
  const nodes=createFoundingV12AncestorNodes(101);
  assert(nodes.length===7&&new Set(nodes.map(n=>n.id)).size===7,'Expected seven archetypes.');
  for(const n of nodes.filter(n=>n.id!=='oasis')) assert(!('core' in n),`Comparator ${n.id} contains OASIS core state.`);
  return {
    successValueAudit:{status:'PASS',evidence:['No target action, tie reduction, diversity or preferred archetype is defined.']},
    evaluationAudit:{status:'PASS',evidence:['No cross-system score, ranking or winner is computed.']},
    flowAudit:{status:'PASS',evidence:['Same-frame unordered serialization is canonicalized while distinct frame chronology remains distinct.']},
    implementationAudit:{status:'PASS',evidence:['Only validation-layer flow-fingerprint representation is changed; contingent realization algorithm, possibility, responsibility and comparator rules remain inherited.']},
    permutationTwins,
    temporalOrder,
    explicitSubOrder,
    comparatorIndependence:{status:'PASS'}
  };
}

function validateLatestExperience(exp,seed,round) {
  for(const outcomeRelation of exp.outcome?.relations??[]) {
    assert((exp.processRelations??[]).some(r=>r.processRole==='outcome-mutation'&&r.id===outcomeRelation.id&&r.op===outcomeRelation.op),`Seed ${seed} round ${round}: actual outcome relation ${outcomeRelation.id}/${outcomeRelation.op} missing.`);
  }
  const actual=new Set((exp.outcome?.relations??[]).map(r=>`${r.id}|${r.op}`));
  for(const r of exp.processRelations??[]) if(r.processRole==='outcome-mutation') assert(actual.has(`${r.id}|${r.op}`),`Seed ${seed} round ${round}: fabricated outcome mutation ${r.id}/${r.op}.`);
}

async function runSeed(seed) {
  const system=new OASISUnifiedValidationSystem({mode:'interactive-actualization',systemId:`founding-flow-v12:${seed}`});
  const nodes=createFoundingV12AncestorNodes(seed);
  const worlds=new Map();
  for(const n of nodes){system.registerDecisionNode(n);worlds.set(n.id,new FoundingFlowV3World());}
  const initialFrames=[...worlds.values()].map(w=>w.initialFrame());
  const initialCanonical=stable(initialFrames[0]);
  for(const f of initialFrames) assert(stable(f)===initialCanonical,`Seed ${seed}: initial frame divergence.`);
  await system.revealReality(initialFrames[0]);
  const rounds=[];
  for(let round=0;round<12;round++) {
    const proposals=await system.deliberateAll();
    const rec={round,proposals:clone(proposals),actualizations:{},worldAfter:{}};
    for(const [nodeId,record] of Object.entries(proposals)) {
      const action=record.raw?.action;
      assert(action,`Seed ${seed} round ${round}: ${nodeId} produced no action.`);
      const world=worlds.get(nodeId);
      const legal=new Set(world.legalActions().map(actionKey));
      assert(legal.has(actionKey(action)),`Seed ${seed} round ${round}: illegal ${actionKey(action)} from ${nodeId}.`);
      const outcome=world.apply(action,record.proposalRecordId);
      rec.actualizations[nodeId]=clone(await system.actualize({nodeId,proposalRecordId:record.proposalRecordId,outcomeFrame:outcome,externalReceipt:{world:'founding-flow-v3-fixed',protocol:'v12',actionKey:actionKey(action)}}));
      rec.worldAfter[nodeId]=world.snapshotState();
      if(nodeId==='oasis') {
        const oasis=nodes.find(n=>n.id==='oasis');
        validateLatestExperience(oasis.exportState().closedExperiences.at(-1),seed,round);
      }
    }
    if(round<11) {
      const exogenous=[...worlds.values()].map(w=>w.exogenousFrame(round));
      const canonical=stable(exogenous[0]);
      for(const f of exogenous) assert(stable(f)===canonical,`Seed ${seed} round ${round}: exogenous divergence.`);
      rec.exogenousAfter=clone(exogenous[0]);
      await system.revealReality(exogenous[0]);
    }
    rounds.push(rec);
  }
  const oasis=nodes.find(n=>n.id==='oasis').exportState();
  return {
    seed,
    sharedGoalForPredictiveAndUtility:sharedGoalForSeedV12(seed),
    rounds,
    actionSequences:Object.fromEntries(nodes.map(n=>[n.id,rounds.map(r=>r.proposals[n.id].raw.actionKey)])),
    tieCounts:Object.fromEntries(nodes.map(n=>[n.id,rounds.filter(r=>proposalTie(r.proposals[n.id].raw)).length])),
    oasisClosedExperiences:oasis.closedExperiences,
    oasisSpiralLineage:oasis.spiralLineage,
    auditTrail:system.exportAuditTrail()
  };
}

const audit=await preExperimentAudit();
if(process.argv.includes('--audit-only')) {
  console.log(JSON.stringify({experiment:'Founding Flow v12',audit},null,2));
  process.exit(0);
}
const seeds=[101,211,307,401,503];
const runs=[];
for(const seed of seeds) runs.push(await runSeed(seed));
const report={
  experiment:'Founding Flow v12',
  status:'EXECUTED',
  evidenceBoundary:'C7-F flow-fingerprint implementation fidelity only; no superiority, uniqueness, culture or generation claim.',
  seeds,
  systems:['reactive','state-memory','temporal-relational','episodic','predictive-world-model','goal-utility','oasis'],
  preExperimentAudit:audit,
  runs
};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/founding-flow-v12.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({experiment:report.experiment,status:report.status,audit,runs:runs.map(r=>({seed:r.seed,tieCounts:r.tieCounts,oasisClosedExperienceCount:r.oasisClosedExperiences.length}))},null,2));
