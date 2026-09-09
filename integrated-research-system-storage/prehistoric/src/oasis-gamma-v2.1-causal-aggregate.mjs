import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.env.OASIS_GAMMA_V21_RESULTS_ROOT||'gamma-v2.1-results';
const hash=x=>createHash('sha256').update(x).digest('hex');
const seeds=Array.from({length:40},(_,i)=>`oasis-gamma-causal-v2.1:${String(i).padStart(3,'0')}`).sort((a,b)=>hash(a).localeCompare(hash(b))||a.localeCompare(b));
async function collect(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await collect(p));else if(/^oasis-gamma-v2\.1-causal-probe-seed-slot-\d+\.json$/.test(e.name))out.push(p);}return out;}
const files=await collect(root);
assert.equal(files.length,40,'BLIND_BARRIER_EXACTLY_40_COMPLETED_ENVELOPES');
const rows=[];
for(const file of files)rows.push(JSON.parse(await readFile(file,'utf8')));
rows.sort((a,b)=>a.seedSlot-b.seedSlot);
for(let i=0;i<40;i++){const r=rows[i];assert.equal(r.seedSlot,i);assert.equal(r.seed,seeds[i]);assert.equal(r.seedHash,hash(seeds[i]));assert.equal(r.protocol,'OASIS Gamma Causal Probe v2.1');assert(['completed','failed'].includes(r.status));assert.match(r.codeSha,/^[0-9a-f]{40}$/);}
assert.equal(new Set(rows.map(r=>r.codeSha)).size,1,'CODE_SHA_PARITY');
if(process.env.GITHUB_SHA)assert.equal(rows[0].codeSha,process.env.GITHUB_SHA);
const completed=rows.filter(r=>r.status==='completed'),failed=rows.filter(r=>r.status==='failed');
const reached=completed.filter(r=>r.onset.reached),valid=reached.filter(r=>r.interventionValidity?.primaryValid===true);
for(const r of valid){assert.equal(r.branches.length,4);assert.deepStrictEqual(r.branches.map(b=>b.branchId),['G0','G1','G2','G3']);assert.equal(new Set(r.branches.map(b=>b.preInterventionDigest)).size,1);assert(r.branches.every(b=>b.conformanceAuditCount>0));assert.equal(r.interventionValidity.shamMatchAvailable,true);}
const primary=[['plus10','eventSequenceAlignedMismatchCount'],['plus30','eventSequenceAlignedMismatchCount'],['plus10','relationGraphSymmetricDifference'],['plus30','relationGraphSymmetricDifference'],['plus30','structureRootSetSymmetricDifference'],['plus30','crossAgentReuseDifference']];
const median=v=>{if(!v.length)return null;const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function ci(v){if(!v.length)return[null,null];const random=rng(0x6712a45d^v.length),boot=[];for(let k=0;k<5000;k++)boot.push(median(v.map(()=>v[Math.floor(random()*v.length)])));boot.sort((a,b)=>a-b);return[boot[Math.floor(.025*(boot.length-1))],boot[Math.floor(.975*(boot.length-1))]];}
function summarize(v){assert(v.every(Number.isFinite),'MISSING_OR_NONFINITE_METRIC');return{n:v.length,mean:mean(v),median:median(v),medianBootstrap95CI:ci(v),min:v.length?Math.min(...v):null,max:v.length?Math.max(...v):null};}
function signFlip(values){if(!values.length)return null;const v=values.filter(x=>x!==0);if(!v.length)return 1;const observed=Math.abs(mean(v));let extreme=0;if(v.length<=16){for(let mask=0;mask<2**v.length;mask++){let sum=0;v.forEach((x,i)=>{sum+=((mask>>i)&1?1:-1)*x;});if(Math.abs(sum/v.length)>=observed-1e-12)extreme++;}return extreme/(2**v.length);}const random=rng(0x27d4eb2d^v.length);extreme=1;for(let r=0;r<20000;r++){let sum=0;for(const x of v)sum+=(random()<.5?-1:1)*x;if(Math.abs(sum/v.length)>=observed-1e-12)extreme++;}return extreme/20001;}
function incidence(k,n){if(!n)return{n,divergentN:k,rate:null,wilson95CI:[null,null]};const z=1.959963984540054,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return{n,divergentN:k,rate:p,wilson95CI:[Math.max(0,c-h),Math.min(1,c+h)]};}
const names=['eventSequenceAlignedMismatchCount','relationGraphSymmetricDifference','structureRootSetSymmetricDifference','survivingStructureCountDifference','crossAgentReuseDifference','participationBreadthDifference'];
const pairSummaries={};
for(const pair of ['G1_vs_G0','G2_vs_G0','G3_vs_G0']){
 const ps=valid.map(r=>r.pairedDivergence[pair]),latencies=ps.map(p=>p.firstExternalTransitionDivergenceIndex).filter(x=>x!==null);
 const summary={firstExternalTransitionDivergence:{...incidence(latencies.length,ps.length),latencyAmongDivergent:summarize(latencies)},metrics:{}};
 for(const h of ['plus10','plus30','plus100']){summary.metrics[h]={};for(const m of names)summary.metrics[h][m]=summarize(ps.map(p=>p.horizons[h][m]));summary.metrics[h].eventSequenceDivergenceIncidence=incidence(ps.filter(p=>p.horizons[h].eventSequenceDifferent).length,ps.length);}
 pairSummaries[pair]=summary;
}
const tests=[];
function test(key,values){const row={key,...summarize(values),twoSidedSignFlipP:signFlip(values)};tests.push(row);return row;}
test('G1_vs_G0.plus30.crossAgentReuseDifference',valid.map(r=>r.pairedDivergence.G1_vs_G0.horizons.plus30.crossAgentReuseDifference));
for(const control of ['G2_vs_G0','G3_vs_G0'])for(const [h,m]of primary)test(`G1_minus_${control}.${h}.${m}`,valid.map(r=>r.pairedDivergence.G1_vs_G0.horizons[h][m]-r.pairedDivergence[control].horizons[h][m]));
let adjusted=0;
for(const [i,t]of [...tests].sort((a,b)=>(a.twoSidedSignFlipP??1)-(b.twoSidedSignFlipP??1)).entries()){adjusted=Math.max(adjusted,Math.min(1,(13-i)*(t.twoSidedSignFlipP??1)));t.holmAdjustedP=t.twoSidedSignFlipP===null?null:adjusted;}
const failuresByReason={};for(const r of failed){const key=r.error?.message||'UNSPECIFIED';failuresByReason[key]=(failuresByReason[key]||0)+1;}
const aggregate={protocol:'OASIS Gamma Causal Probe v2.1 Blind Aggregate',codeSha:rows[0].codeSha,inputResultCount:40,expectedResultCount:40,allSlotsAndNamespaceVerified:true,
 runStatus:failed.length||valid.length!==reached.length?'INVALID_CONFIRMATORY_AUDIT_OR_EXECUTION_FAILURE':'COMPLETED',
 eligibility:{completed:completed.length,failed:failed.length,reached:reached.length,notReached:completed.length-reached.length,validDecisionRelevant:valid.length,denominator:40,lowReachUnderpowered:valid.length<20},
 conformance:{allCompletedValidPass:valid.every(r=>r.branches.every(b=>b.conformanceAuditCount>0)),runtimeAuditCount:valid.reduce((n,r)=>n+r.branches.reduce((n,b)=>n+b.conformanceAuditCount,0),0),failuresByReason},
 pairSummaries,inferentialFamily:{alpha:.05,method:'Two-sided sign flip conditional on sign exchangeability; Holm across 13 prespecified signed contrasts; no p-values for nonnegative raw distances',tests},
 blindness:{individualOutcomesPrinted:false,all40EnvelopesRequired:true,interpretation:'Analyst did not inspect individual seed outcomes before aggregate; labels are disclosed here, not double-blind allocation.'},
 interpretationGuard:'Within the fixed simulation only. Failed seeds invalidate full confirmatory conformance; complete-case summaries are then diagnostic only. Ineligible seeds are not null evidence. No direction is superior. Control effects are competing explanations, not proof of OASIS superiority.'};
await writeFile('oasis-gamma-v2.1-causal-aggregate.json',JSON.stringify(aggregate,null,2));
console.log(JSON.stringify(aggregate));
