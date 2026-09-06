import { OASISConcurrentCanonicalCore } from '../src/validation/founding-flow-v11-ancestors.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }

const participant = id => ({ id, roles:[id==='founder'?'founder':'other'], capabilities:['*'], obligations:[], available:true });
const relation = (id,to,derived=false) => ({
  id,from:'founder',to,kind:derived?'adjacent-to':'observed-with',context:null,entities:['founder',to],op:'upsert',
  ...(derived?{meta:{derivedFromGeometry:true}}:{})
});
const idle = {
  id:'idle',op:'upsert',actor:'founder',action:'idle',target:null,entities:['founder'],requires:[],provides:[],requiresEntities:[],createsEntities:[],removesEntities:[],relations:[],consequences:[],obligations:[],resolves:[],violates:[],meta:{originalStepId:'idle',primitiveAction:{op:'idle'}}
};

const core=new OASISConcurrentCanonicalCore({realizationSeed:1,anchorEntityId:'founder'});
core.observe({
  id:'role-regression-frame',entities:['founder','A','B'],participants:[participant('founder'),participant('A'),participant('B')],
  relations:[relation('explicit','A',false),relation('derived','B',true)]
});
core.setValidationPrimitiveAffordances([idle]);
const d=core.deliberate();
const signatures=d.field.relationSignature;
assert(signatures.includes('state:founder->A:observed-with:'),'V11 regression: explicit current relation lost current-state role.');
assert(signatures.includes('observe:founder->B:adjacent-to:'),'V11 regression: derived current relation lost derived-observation role.');
assert(!signatures.some(x=>x.startsWith('legacy-')),'V11 regression: current relation fell back to legacy structural role.');
console.log(JSON.stringify({status:'PASS',relationSignature:signatures},null,2));
