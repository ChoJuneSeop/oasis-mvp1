import { OASISConcurrentCanonicalCore } from '../src/validation/founding-flow-v11-ancestors.mjs';

const clone = value => value == null ? value : structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function assert(condition, message) { if (!condition) throw new Error(message); }
function participant(id) { return { id, roles:[id==='founder'?'founder':'other'], capabilities:['*'], obligations:[], available:true }; }
function relation(id,to) { return { id, from:'founder', to, kind:'observed-with', context:null, entities:['founder',to], op:'upsert' }; }
function affordance(id) {
  return { id,op:'upsert',actor:'founder',action:id,target:null,entities:['founder'],requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],meta:{originalStepId:id,primitiveAction:{op:id}} };
}
function run(order, seed) {
  const core=new OASISConcurrentCanonicalCore({realizationSeed:seed,anchorEntityId:'founder'});
  const map={A:relation('rA','A'),B:relation('rB','B')};
  core.observe({id:'same-frame',time:'T0',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')],relations:order.map(k=>map[k])});
  core.setValidationPrimitiveAffordances([affordance('idle'),affordance('emit')]);
  const fingerprint=core._flowFingerprint();
  const d=core.deliberate();
  return {fingerprint,relationSignature:clone(d.field.relationSignature),structureKey:d.structuralExpansion.structureKey,choiceId:d.choice?.id??null,step:d.choice?.steps?.[0]?.action??null,tieBreakUsed:d.tieBreakUsed};
}

const seeds=[1,2,3,5,8,13,21,34];
const rows=seeds.map(seed=>({seed,a:run(['A','B'],seed),b:run(['B','A'],seed)}));
for(const row of rows){
  assert(stable(row.a.relationSignature)===stable(row.b.relationSignature),`v11 structural canonicalization regression at seed ${row.seed}`);
  assert(row.a.structureKey===row.b.structureKey,`v11 structureKey canonicalization regression at seed ${row.seed}`);
  assert(row.a.tieBreakUsed===true&&row.b.tieBreakUsed===true,`fixture did not exercise contingent realization at seed ${row.seed}`);
}
const fingerprintEqualForAll=rows.every(r=>r.a.fingerprint===r.b.fingerprint);
const choiceEqualForAll=rows.every(r=>r.a.choiceId===r.b.choiceId&&r.a.step===r.b.step);
const choiceDivergenceSeeds=rows.filter(r=>r.a.choiceId!==r.b.choiceId||r.a.step!==r.b.step).map(r=>r.seed);
const report={
  audit:'Founding Flow v11 contingent-flow fingerprint post-audit',
  status:'EXECUTED',
  conclusion:fingerprintEqualForAll?'C7_FINGERPRINT_RESIDUAL_REFUTED':'C7_FINGERPRINT_RESIDUAL_CONFIRMED',
  primaryCriterion:{sameSemanticFrameFingerprintsEqual:fingerprintEqualForAll},
  secondaryObservation:{choicesEqualForAll:choiceEqualForAll,choiceDivergenceSeeds},
  rows
};
console.log(JSON.stringify(report,null,2));
if(!fingerprintEqualForAll) process.exitCode=3;
