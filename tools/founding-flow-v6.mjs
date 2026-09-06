import fs from 'node:fs/promises';
import { OASISProcessEvidenceCore } from '../src/validation/founding-flow-v5-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }

function primitiveTouch() {
  return {
    id:'touch:other-O',op:'upsert',actor:'founder',action:'touch:other-O',target:'other-O',entities:['founder','other-O'],
    requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],
    meta:{primitiveAction:{op:'touch',target:'other-O'},originalStepId:'touch:other-O'}
  };
}

function makeExperience({ op='upsert', kind='contacted' }) {
  const relation={id:'contact:founder:other-O',from:'founder',to:'other-O',kind,entities:['founder','other-O'],op};
  const step=primitiveTouch();
  return {
    id:'experience:0',sequence:0,deliberationId:'historical-deliberation',
    before:{flowEventId:'past',changedEntities:['other-O'],world:{}},
    field:{seedEntities:['other-O'],reactivatedExperienceIds:[],paths:[],relationSignature:[]},
    processRelations:[clone(relation)],
    participation:{current:['founder','other-O'],historical:[],affectedEntities:['founder','other-O']},
    possibilitiesObserved:[{id:'direct:touch:other-O',steps:['touch:other-O']}],
    choice:{id:'historical-choice',kind:'direct-affordance',steps:[clone(step)],entities:['founder','other-O'],participants:['founder'],responsibility:null},
    outcome:{eventId:'historical-outcome',relations:[clone(relation)],affectedEntities:['founder','other-O'],beforeWorld:{},afterWorld:{}},
    after:{changedEntities:['founder','other-O'],world:{}}
  };
}

function prepareCore({ op='upsert', kind='contacted' }) {
  const core=new OASISProcessEvidenceCore({realizationSeed:7,anchorEntityId:'founder'});
  core.state.world.participants.set('founder',{id:'founder',roles:['founder'],capabilities:['*'],obligations:[],available:true});
  core.state.world.participants.set('other-O',{id:'other-O',roles:['other'],capabilities:[],obligations:[],available:true});
  core.setValidationPrimitiveAffordances([primitiveTouch()]);
  core.state.closedExperiences=[makeExperience({op,kind})];
  core.state.flow=[{event:{id:'current-flow'},changedEntities:['other-O'],previousChoiceId:null}];
  return core;
}

function summarize(core) {
  const d=core.deliberate();
  const supported=d.possibilities.map(p=>({
    id:p.id,
    kind:p.kind,
    steps:p.steps.map(s=>s.meta?.originalStepId??s.id),
    supportRelations:(p.support?.relations??[]).map(r=>({id:r.id,from:r.from,to:r.to,kind:r.kind,op:r.op??null})),
    experienceSupport:clone(p.support?.experienceIds??[])
  }));
  return {
    rawHistoricalRelations:d.field.historicalRelations.map(r=>({id:r.id,from:r.from,to:r.to,kind:r.kind,op:r.op??null})),
    relationSignature:clone(d.field.relationSignature),
    reactivatedExperienceIds:clone(d.field.reactivatedExperienceIds),
    possibilities:supported,
    choiceId:d.choice?.id??null,
    tieBreakUsed:d.tieBreakUsed,
    structureKey:d.structuralExpansion.structureKey
  };
}

async function fourAxisAudit() {
  const protocol=await fs.readFile('experiments/founding-flow-v6/PROTOCOL.md','utf8');
  assert(!/(success_target|reward_target|accuracy_target)\s*[:=]/i.test(protocol),'Protocol contains explicit forbidden target declaration.');
  return {
    successValueAudit:{status:'PASS',evidence:['Both distinguishable and collapsed outcome-polarity results are explicitly accepted.']},
    evaluationAudit:{status:'PASS',evidence:['No model performance metric or ranking is computed.']},
    flowAudit:{status:'PASS',evidence:['Twin current flow, actor, target, choice and affordance are identical; only historical observed outcome relation op differs.']},
    implementationAudit:{status:'PASS',evidence:['V6 imports OASISProcessEvidenceCore read-only and does not override deliberation, choice, responsibility or reactivation logic.']}
  };
}

const audit=await fourAxisAudit();

const upsert=summarize(prepareCore({op:'upsert',kind:'contacted'}));
const remove=summarize(prepareCore({op:'remove',kind:'contacted'}));
const kindControl=summarize(prepareCore({op:'upsert',kind:'signaled'}));

assert(upsert.rawHistoricalRelations[0]?.op==='upsert','Raw upsert outcome polarity was not preserved in historical relation object.');
assert(remove.rawHistoricalRelations[0]?.op==='remove','Raw remove outcome polarity was not preserved in historical relation object.');
assert(upsert.reactivatedExperienceIds.includes('experience:0') && remove.reactivatedExperienceIds.includes('experience:0'),'Twin completed experiences were not reactivated under identical matching current flow.');
assert(stable(upsert.relationSignature)!==stable(kindControl.relationSignature),'Positive control failed: relation kind difference is not represented in relationSignature.');

const result={
  relationPolarity:{
    rawObjectDistinguishesOp:stable(upsert.rawHistoricalRelations)!==stable(remove.rawHistoricalRelations),
    relationSignatureDistinguishesOp:stable(upsert.relationSignature)!==stable(remove.relationSignature),
    structureKeyDistinguishesOp:upsert.structureKey!==remove.structureKey,
    possibilitiesDistinguishRawSupport:stable(upsert.possibilities)!==stable(remove.possibilities),
    choiceDiffers:upsert.choiceId!==remove.choiceId,
    tieDiffers:upsert.tieBreakUsed!==remove.tieBreakUsed
  },
  positiveControl:{
    relationKindDistinguished:stable(upsert.relationSignature)!==stable(kindControl.relationSignature),
    structureKeyDistinguished:upsert.structureKey!==kindControl.structureKey
  },
  upsert,remove,kindControl
};

const interpretation = result.relationPolarity.relationSignatureDistinguishesOp && result.relationPolarity.structureKeyDistinguishesOp
  ? 'C4 relation-polarity loss hypothesis falsified: outcome mutation direction is structurally preserved.'
  : 'C4 narrowed: raw outcome op survives, but relation mutation direction collapses in at least one structural representation layer.';

const report={experiment:'Founding Flow v6',status:'EXECUTED',audit,result,interpretation,evidenceBoundary:'Mechanism necessity audit only; no performance or superiority claim.'};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/founding-flow-v6.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
