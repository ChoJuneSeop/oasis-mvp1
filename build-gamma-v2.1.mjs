import {readFile,writeFile} from 'node:fs/promises';
import {instrumentWorld,routeWorld} from './integrated-research-system-storage/prehistoric/src/oasis-gamma-v2.1-instrumentation.mjs';
const root='integrated-research-system-storage/prehistoric/src/';
const read=async f=>(await readFile(root+f,'utf8')).replaceAll('\r\n','\n');
await writeFile(root+'prehistoric-clean-world-v1-gamma-v2.1-audited.mjs',instrumentWorld(await read('prehistoric-clean-world-v1.mjs')));
await writeFile(root+'prehistoric-clean-world-v1.1-gamma-v2.1-audited.mjs',routeWorld(await read('prehistoric-clean-world-v1.1.mjs')));
let p=await read('oasis-gamma-v2-causal-probe.mjs');
const replace=(a,b)=>{if(p.split(a).length!==2)throw Error('PROBE_TRANSFORM_DRIFT: '+a);p=p.replace(a,b);};
p=p.replaceAll('OASISGammaV2','OASISGammaV21').replaceAll('oasis-gamma-v2-kernel.mjs','oasis-gamma-v2.1-kernel.mjs');
replace('  classifyGammaV2Recurrence,\n  GammaV2TestHelpers\n','  bundle, assertCommon\n');
p="import assert from 'node:assert/strict';\nimport { execFileSync } from 'node:child_process';\nimport { classifyGammaV2Recurrence } from './oasis-gamma-v2-kernel.mjs';\n"+p;
p=p.replaceAll("'./prehistoric-clean-world-v1.1.mjs'","'./prehistoric-clean-world-v1.1-gamma-v2.1-audited.mjs'");
p=p.replaceAll('OASIS_GAMMA_V2','OASIS_GAMMA_V21').replaceAll('FIXED_GAMMA_V2_SEEDS','FIXED_GAMMA_V21_SEEDS');
p=p.replaceAll('oasis-gamma-causal-v2:', 'oasis-gamma-causal-v2.1:').replaceAll('oasis-gamma-v2-causal-probe-seed-slot-', 'oasis-gamma-v2.1-causal-probe-seed-slot-');
p=p.replaceAll('OASIS Gamma Causal Probe v2.0','OASIS Gamma Causal Probe v2.1');
replace('Number(process.env.OASIS_GAMMA_V21_ELIGIBILITY_MAX_CYCLES || 300)','300');
replace('Number(process.env.OASIS_GAMMA_V21_POST_CYCLES || 100)','100');
replace('const clone = value =>',"const CODE_SHA = process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();\nconst clone = value =>");
replace('return sha({ world: society.externalSnapshot(), actors: actorStates(actors) });','return sha({ world: society.auditSnapshot(), actors: actorStates(actors) });');
const start=p.indexOf('  const preParticipation = {',p.indexOf('function previewBundle('));
const end=p.indexOf('\n}\n\nfunction setEqual',start);
if(start<0||end<0)throw Error('preview transform');
p=p.slice(0,start)+`  const complete = bundle(scratch, observation, BUDGET);
  return {...complete, admissible:complete.life.admissible, diagnostics:clone(scratch.lastGammaV2Diagnostics)};`+p.slice(end);
replace('  const onPrimitive = new Set(on.primitives.map(stepSignature));','  assertCommon(on, off);\n  assert.equal(causalDigest(society,actors),digest,"PREVIEW_MUTATED_WORLD_ACTOR_RNG");\n  const onPrimitive = new Set(on.primitives.map(stepSignature));');
replace('    preDigest: digest,','    preDigest: digest,\n    preWorldActorRng: {world:society.auditSnapshot(), actors:actorStates(actors)},\n    primitiveInstantiation: clone(on.primitives),');
replace("  if (branchId === 'G0') return;",'  // G0 also activates read-only conformance checks.');
replace('        onsetLedgerLength = society.externalSnapshot().ledger.length;',`        assert.deepStrictEqual({world:society.auditSnapshot(),actors:actorStates(actors)},onset.preWorldActorRng,'PRE_INTERVENTION_WORLD_ACTOR_RNG_DEEP_EQUALITY');
        const preActor=actors.get(spec.id);
        const preBundle=previewBundle(definition.KernelClass,preActor,society,spec,previewObservation(society,preActor),false);
        assert.deepStrictEqual(preBundle.primitives,onset.primitiveInstantiation,'PRE_INTERVENTION_PRIMITIVE_DEEP_EQUALITY');
        onsetLedgerLength = society.externalSnapshot().ledger.length;`);
replace('    branchId: definition.id,','    conformanceAuditCount: [...actors.values()].reduce((n,a)=>n+a.auditCount,0),\n    branchId: definition.id,');
replace('const onset = await locateOnset();','async function run() {\nconst onset = await locateOnset();');
replace("  protocol: 'OASIS Gamma Causal Probe v2.1',","  protocol: 'OASIS Gamma Causal Probe v2.1',\n  status: 'completed',\n  codeSha: CODE_SHA,");
p=p.replaceAll('OASIS_GAMMA_CAUSAL_PROBE_v2_DESIGN_LOCK_2026-09-08.md','OASIS_GAMMA_V2.1_DESIGN_LOCK.md').replaceAll('OASIS_GAMMA_CAUSAL_PROBE_PREREG_v2.0.md','OASIS_GAMMA_V2.1_PREREGISTRATION.md');
const log=p.indexOf("console.log('OASIS_GAMMA_V21_RESULT='");
if(log<0)throw Error('log transform');
p=p.slice(0,log)+`}
try { await run(); }
catch(error) {
  // Seal failure without exposing seed-level diagnostic or trajectory in logs.
  await writeFile(\`oasis-gamma-v2.1-causal-probe-seed-slot-\${SEED_SLOT}.json\`,JSON.stringify({protocol:'OASIS Gamma Causal Probe v2.1',status:'failed',codeSha:CODE_SHA,seedSlot:SEED_SLOT,seedSourceIndex:seedRow.sourceIndex,seed:RUN_SEED,seedHash:seedRow.hash,error:{name:error.name,code:error.code??null,message:String(error.message).split('\\n')[0]}},null,2));
}
console.log('SEALED_SEED_TASK_COMPLETE');
`;
await writeFile(root+'oasis-gamma-v2.1-causal-probe.mjs',p);
