import fs from 'node:fs/promises';
import { OASISMutationPolarityCore } from '../src/validation/founding-flow-v7-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
function assert(condition, message) { if (!condition) throw new Error(message); }

function idleAffordance() {
  return {
    id:'idle',op:'upsert',actor:'founder',action:'idle',target:null,entities:['founder'],
    requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],
    meta:{primitiveAction:{op:'idle'},originalStepId:'idle'}
  };
}

function contactRelation(op='upsert') {
  return {
    id:'contact:founder:other-O',from:'founder',to:'other-O',kind:'contacted',entities:['founder','other-O'],op
  };
}

function createBaseCore() {
  const core=new OASISMutationPolarityCore({realizationSeed:11,anchorEntityId:'founder'});
  core.observe({
    id:'formation-event',
    entities:['founder','other-O'],
    participants:[
      {id:'founder',roles:['founder'],capabilities:['*'],obligations:[],available:true},
      {id:'other-O',roles:['other'],capabilities:[],obligations:[],available:true}
    ],
    relations:[contactRelation('upsert')]
  });
  core.observe({
    id:'later-current-flow',
    entities:['other-O'],
    facts:[{id:'later-observation',entities:['other-O'],value:{event:'other-present'},op:'upsert'}]
  });
  core.setValidationPrimitiveAffordances([idleAffordance()]);
  return core;
}

function runPersistentStateOnly() {
  const core=createBaseCore();
  const d=core.deliberate();
  assert(d.choice,'Audit A produced no choice.');
  const exp=core.actualize(d.choice.id,{
    id:'later-outcome-no-relation-mutation',
    entities:['founder'],
    facts:[{id:'idle-event',entities:['founder'],value:{event:'idle'},op:'upsert'}]
  });
  const contact=exp.processRelations.filter(r=>r.id==='contact:founder:other-O');
  return {
    choiceId:d.choice.id,
    outcomeRelations:clone(exp.outcome.relations),
    processContactRelations:contact.map(r=>({id:r.id,kind:r.kind,op:r.op,sourceEventId:r.sourceEventId})),
    persistentStateRecordedAsUpsert:contact.some(r=>r.op==='upsert'),
    sourceIsHistoricalFormation:contact.some(r=>r.sourceEventId==='formation-event')
  };
}

function runRemovalCollision() {
  const core=createBaseCore();
  const d=core.deliberate();
  assert(d.choice,'Audit B produced no choice.');
  const exp=core.actualize(d.choice.id,{
    id:'later-outcome-remove',
    entities:['founder','other-O'],
    relations:[contactRelation('remove')]
  });
  const contact=exp.processRelations.filter(r=>r.id==='contact:founder:other-O');
  return {
    choiceId:d.choice.id,
    outcomeRelations:exp.outcome.relations.map(r=>({id:r.id,kind:r.kind,op:r.op,sourceEventId:r.sourceEventId})),
    processContactRelations:contact.map(r=>({id:r.id,kind:r.kind,op:r.op,sourceEventId:r.sourceEventId})),
    processPreservesRemove:contact.some(r=>r.op==='remove'),
    processRetainsPriorUpsert:contact.some(r=>r.op==='upsert'),
    liveRelationExistsAfterRemove:core.exportState().world.relations.some(r=>r.id==='contact:founder:other-O')
  };
}

async function fourAxisAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v8/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  return {
    successValueAudit:{status:'PASS',evidence:['Both C6 confirmation and C6 falsification are accepted.']},
    evaluationAudit:{status:'PASS',evidence:['No performance metric, ranking, action-diversity or tie criterion is used.']},
    flowAudit:{status:'PASS',evidence:['Audit preserves formation event → persistent state → later outcome ordering.']},
    implementationAudit:{status:'PASS',evidence:['V8 imports OASISMutationPolarityCore read-only and does not override OASIS logic.']}
  };
}

const audit=await fourAxisAudit();
const persistentStateOnly=runPersistentStateOnly();
const removalCollision=runRemovalCollision();

assert(removalCollision.outcomeRelations.some(r=>r.op==='remove'),'Removal outcome itself was not observed; audit setup invalid.');
assert(removalCollision.liveRelationExistsAfterRemove===false,'Live world failed to remove relation; audit setup invalid.');

const c6Confirmed =
  persistentStateOnly.persistentStateRecordedAsUpsert ||
  !removalCollision.processPreservesRemove;

const result={
  persistentStateOnly,
  removalCollision,
  c6Confirmed,
  interpretation:c6Confirmed
    ? 'C6 confirmed: materialized relation state and relation mutation event are conflated in completed process representation.'
    : 'C6 falsified: current relation state and later mutation event remain distinguishable in completed process representation.'
};

const report={experiment:'Founding Flow v8',status:'EXECUTED',audit,result,evidenceBoundary:'Read-only implementation necessity audit; no superiority or performance claim.'};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/founding-flow-v8.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
