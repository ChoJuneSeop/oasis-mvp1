import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {instrumentWorld,routeWorld} from '../src/oasis-gamma-v2.1-instrumentation.mjs';
import {createCleanPrehistoricSocietyV1_1 as OriginalWorld} from '../src/prehistoric-clean-world-v1.1.mjs';
import {createCleanPrehistoricSocietyV1_1 as AuditedWorld} from '../src/prehistoric-clean-world-v1.1-gamma-v2.1-audited.mjs';
import {createPrehistoricChoicePolicy} from '../src/prehistoric-cohort-v1.mjs';
import {NEUTRAL_COMPARISON_COHORT_V1 as cohort} from '../src/prehistoric-native-memory-reference-agents-v1.mjs';
import {OASISGammaV2Kernel as V2, OASISGammaV2OffKernel as DefectiveV2, classifyGammaV2Recurrence,buildHistoricalProcessBridgeCandidatesV2, GammaV2TestHelpers as H} from '../src/oasis-gamma-v2-kernel.mjs';
import {OASISGammaV21Kernel as G0,OASISGammaV21OffKernel as G1,OASISGammaV21OrderScrambledKernel as G2,OASISGammaV21CandidateMatchedShamKernel as G3,bundle,assertCommon} from '../src/oasis-gamma-v2.1-kernel.mjs';
const clone=x=>structuredClone(x);
const budget={maxDepth:1,maxPrimitive:512,maxCompositions:384,verificationPasses:1};
const observation={id:'AUDIT:CURRENT',sequence:0,time:0,facts:[],relations:[],participants:[{id:'A',available:true},{id:'B',available:true}],entities:['A','B'],responsibilitySignals:{},relationalProcess:[],meta:{}};
const record={occurrenceId:'AUDIT:R0',sourceExperienceId:'AUDIT:E0',order:0,e:1,q:0,relation:{id:'contact:A->B',kind:'contact',from:'A',to:'B'},sourceSigmaActions:['move','contact'],sourceParticipantIds:['A','B']};
const steps=[{id:'move:B',actor:'A',action:'move',target:'B',participants:['B'],entities:['A','B'],provides:['near:B']},{id:'contact:B',actor:'A',action:'contact',target:'B',participants:['B'],entities:['A','B'],requires:['near:B']},{id:'rest:A',actor:'A',action:'rest'},{id:'observe:A',actor:'A',action:'observe'}];
const options={world:{observe:async()=>clone(observation),execute:async()=>({ok:true})},capabilities:steps.map(s=>({id:s.action,instantiate:()=>[clone(s)]})),choicePolicy:({admissible})=>admissible[0].id,initialBudget:budget,lifeConstraint:({possibility})=>!possibility.lifeViolation};
function make(K,history=[record]){const k=new K(options);k.state.historyRelations=clone(history);k.setGammaV2Intervention(true);return k;}
const reports=[];
function check(name,fn){fn();reports.push(name);}
const on=make(G0),off=make(G1);
const a=bundle(on,observation,budget),b=bundle(off,observation,budget);
check('deep-common-candidate-and-choice-input-parity',()=>assertCommon(a,b));
check('synthetic-positive-nonvacuous',()=>{assert(a.possibilities.length>b.possibilities.length);assert(b.possibilities.some(p=>p.R_c.length>0));assert(a.life.admissible.length>b.life.admissible.length);});
check('actual-choice-boundary',()=>{on.choiceAxis(a.choiceInput);off.choiceAxis(b.choiceInput);assert.equal(on.auditCount,1);assert.equal(off.auditCount,1);});
check('v2-activeRelations-empty-regression-rejected',()=>assert.throws(()=>assertCommon(a,bundle(make(DefectiveV2),observation,budget))));
let mutationCount=0;
for(const field of ['A_c','R_c','B_c','sigma','K_c']) check('mutation-'+field,()=>{const m=clone(b);m.possibilities[0][field]=null;assert.throws(()=>assertCommon(a,m));mutationCount++;});
for(const field of ['participation','activeRelations','historyRelations','primitives']) check('mutation-'+field,()=>{const m=clone(b);m[field]=null;assert.throws(()=>assertCommon(a,m));mutationCount++;});
for(const field of ['kappaById','psiById','responsibilityById']) check('mutation-'+field,()=>{const m=clone(b);m[field][b.possibilities[0].id]='tampered';assert.throws(()=>assertCommon(a,m));mutationCount++;});
check('mutation-life',()=>{const m=clone(b);m.life.admissible=[];assert.throws(()=>assertCommon(a,m));mutationCount++;});
for(const field of ['observation','participation','activeRelations','round','admissible','responsibilityById','distribution']) check('mutation-choice-'+field,()=>{const m=clone(b);m.choiceInput[field]=null;assert.throws(()=>assertCommon(a,m));mutationCount++;});
check('extra-candidate-rejected',()=>{const m=clone(b);m.possibilities.push({...clone(m.possibilities[0]),id:'forged'});assert.throws(()=>assertCommon(a,m));});
check('empty-history-equivalence',()=>assert.deepStrictEqual(bundle(make(G0,[]),observation,budget).possibilities,bundle(make(G1,[]),observation,budget).possibilities));
check('continuity-no-extra',()=>{const o={...clone(observation),relations:[record.relation]};assert.deepStrictEqual(bundle(make(G0),o,budget).possibilities,bundle(make(G1),o,budget).possibilities);});
check('missing-endpoint-no-recurrence',()=>assert.equal(classifyGammaV2Recurrence([record],{...observation,participants:[observation.participants[0]],entities:['A']}).length,0));
check('wrong-adjacency-and-physical-prerequisite-block',()=>{
  const active=classifyGammaV2Recurrence([record],observation), primitives=a.primitives;
  assert.equal(buildHistoricalProcessBridgeCandidatesV2({observation,activeRelations:[{...active[0],sourceSigmaActions:['contact','move']}],steps:primitives,canonicalPossibilities:[]}).length,0);
  const broken=primitives.map(s=>({...s,provides:[]}));
  assert.equal(buildHistoricalProcessBridgeCandidatesV2({observation,activeRelations:active,steps:broken,canonicalPossibilities:[]}).length,0);
});
check('G2-only-source-action-order',()=>{
  const k=make(G2),v=bundle(k,observation,budget);
  assert.deepStrictEqual(v.activeRelations,a.activeRelations);assert.deepStrictEqual(v.historyRelations,a.historyRelations);assert.deepStrictEqual(v.participation,a.participation);
  assert.deepStrictEqual(v.possibilities.filter(p=>p.trace.source!=='gamma-v2-historical-process-bridge'),b.possibilities);
  assert.deepStrictEqual(H.deterministicScramble(['move','move','contact'],'x').sort(),['move','move','contact'].sort());
});
check('G3-nonvacuous-count-depth-physical-admissible',()=>{
  const v=bundle(make(G3),observation,budget), extras=v.possibilities.filter(p=>p.trace.source==='gamma-v2-candidate-count-sham');
  assert(extras.length>0);assert.equal(v.possibilities.length,a.possibilities.length);assert.equal(v.life.admissible.length,a.life.admissible.length);
  assert(extras.every(p=>p.sigma.length===2));
  assert(extras.every(p=>JSON.stringify(p.sigma.map(s=>s.action))!==JSON.stringify(record.sourceSigmaActions)));
});
check('sham-shortage-fails-closed',()=>{
  // Restrict the pool to the sole historical adjacency; no substitute is valid.
  const k=make(G3);k.capabilities=options.capabilities.slice(0,2);
  assert.throws(()=>bundle(k,observation,budget),/SHAM_MATCH_NOT_AVAILABLE/);
});
const read=async name=>(await readFile(new URL('../src/'+name,import.meta.url),'utf8')).replaceAll('\r\n','\n');
assert.equal(await read('prehistoric-clean-world-v1-gamma-v2.1-audited.mjs'),instrumentWorld(await read('prehistoric-clean-world-v1.mjs')));
assert.equal(await read('prehistoric-clean-world-v1.1-gamma-v2.1-audited.mjs'),routeWorld(await read('prehistoric-clean-world-v1.1.mjs')));
reports.push('world-source-exact-read-only-instrumentation');
const seed='oasis-gamma-v2.1-audit:prefix';
const states=[];
for(const K of [V2,G0,G1,G2,G3]) {
  const original=OriginalWorld({seed,cohort}),audited=AuditedWorld({seed,cohort});
  const ks=[original,audited].map(s=>cohort.map(spec=>new K({world:s.createAgentWorld(spec.id),capabilities:s.capabilitiesForAgent(spec.id),choicePolicy:createPrehistoricChoicePolicy(spec,seed),initialBudget:{...budget,maxDepth:5},maxSelfInterventions:1,lifeConstraint:({possibility})=>!possibility.lifeViolation})));
  for(let cycle=0;cycle<2;cycle++) {
    for(let i=0;i<cohort.length;i++){assert.deepStrictEqual(await ks[0][i].step(),await ks[1][i].step());}
    await original.advanceExogenousFlow();await audited.advanceExogenousFlow();
    assert.deepStrictEqual(original.externalSnapshot(),audited.externalSnapshot());
  }
  const pre=audited.auditSnapshot();assert.deepStrictEqual(audited.auditSnapshot(),pre);
  states.push({world:pre,actors:ks[1].map(k=>k.state)});
}
for(const state of states)assert.deepStrictEqual(state,states[0]);
reports.push('original-world-dynamic-equivalence-and-all-branches-preactivation-world-actor-RNG');
for(const K of [G0,G1,G2,G3]) {
  const s=AuditedWorld({seed:'oasis-gamma-v2.1-audit:active-choice',cohort}),spec=cohort[0];
  const k=new K({world:s.createAgentWorld(spec.id),capabilities:s.capabilitiesForAgent(spec.id),choicePolicy:createPrehistoricChoicePolicy(spec,seed),initialBudget:{...budget,maxDepth:5},maxSelfInterventions:1,lifeConstraint:({possibility})=>!possibility.lifeViolation});
  k.setGammaV2Intervention(true);await k.step();assert(k.auditCount>0);
}
reports.push('actual-natural-world-step-active-choice-boundary-all-four-arms');
const codeSha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const result={protocol:'OASIS Gamma v2.1 conformance audit',pass:true,codeSha,checks:reports,mutationCount,confirmatorySeedsUsed:0,scope:'Synthetic nonvacuous tests + separate audit namespace prefix; actual runtime checks remain fail-closed.'};
if(process.env.OASIS_GAMMA_V21_AUDIT_OUTPUT)await writeFile(process.env.OASIS_GAMMA_V21_AUDIT_OUTPUT,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
