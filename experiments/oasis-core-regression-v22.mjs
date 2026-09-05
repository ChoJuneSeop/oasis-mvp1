import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const ctx={clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},stroke(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){}};
function el(){return{textContent:'',innerHTML:'',value:'',className:'',onclick:null,onchange:null,classList:{toggle(){}},appendChild(){},getContext(){return ctx}}}
const els=new Map();globalThis.document={getElementById(id){if(!els.has(id))els.set(id,el());return els.get(id)},querySelectorAll(){return[]},querySelector(){return el()},createElement(){return el()}};globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};
for(const f of ['prehistoric-society-v3-core.js','prehistoric-society-v3-decisions.js','prehistoric-society-v3-world.js','oasis-core-v2.js','oasis-core-v2-stability.js'])vm.runInThisContext(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
vm.runInThisContext(`
E={tick:5000,nodes:[{id:'fire',kind:'natural_fire',x:10,y:10,stock:1,max:1,regen:0},{id:'river',kind:'water',x:20,y:20,stock:999,max:999,regen:0}],people:{},nextId:1,births:0,deaths:0,events:0,relations:0,innovations:0,maxGeneration:0,temp:.5,weather:'보통',log:[],paused:0};
const A=mkPerson('oasis',0,0,'oasis',true,0,[]);A.energy=70;A.water=70;A.warmth=70;A.health=100;E.people.oasis=A;const F=mkPerson('friend',5,5,'human',false,0,[]);E.people.friend=F;
function P(){return{tick:E.tick,temp:.5,weather:'보통',self:{energy:A.energy,water:A.water,warmth:A.warmth,health:A.health,tool:0,fire:0,inventory:{food:0,stone:0,wood:0},x:0,y:0},nearNodes:[{id:'fire',kind:'natural_fire',x:10,y:10,stock:1,d:14}],nearAgents:[{id:'friend',name:'사람',x:5,y:5,d:7}]}}
const as=[{type:'observe'},{type:'interact',target:'friend'},{type:'study_fire',target:'fire',kind:'natural_fire'},{type:'wait'}];
const tests=[];function add(name,expected,actual,detail){tests.push({name,expected,actual,pass:Object.is(expected,actual),detail})}
// 7. Full raw history is preserved, but 200 structurally identical repetitions reactivate as one group.
{
 A.relationEpisodes=Array.from({length:200},(_,i)=>({t:1000+i,sequence:i+1,action:'interact',context:['agent:friend'],roles:['agent:any','agent:friend'],outcome:.5}));
 const active=activeRelations(A,P());add('repeated_relation_non_amplification',true,A.relationEpisodes.length===200&&active.length===1,{raw:A.relationEpisodes.length,active:active.length,repeatCount:active[0]?._repeatCount});
}
// 8. One active relational-process group alone cannot be called a recombination of relations.
{
 A.relationEpisodes=[{t:4900,sequence:1,action:'interact',context:['agent:friend'],roles:['agent:any','agent:friend'],outcome:.5}];A.oasisV2={sequence:1,intentSeq:0,generatedUses:{},relationGraph:{},lastIntent:null,lastGenerationSnapshot:null};
 const d=oasisDecide(A,P(),as);add('requires_multiple_active_relation_groups',true,!d.a.generated,{chosen:actionKey(d.a),active:activeRelations(A,P()).length});
}
// 9. Same structural/current-flow state with different source sequence numbers yields the same combination identity.
{
 function setup(offset){A.relationEpisodes=[{t:4900,sequence:1+offset,action:'interact',context:['agent:friend'],roles:['agent:any','agent:friend'],outcome:.5},{t:4920,sequence:2+offset,action:'study_fire',context:['node:fire'],roles:['node:fire','nodekind:fire'],outcome:.6}];A.oasisV2={sequence:2+offset,intentSeq:0,generatedUses:{},relationGraph:{},lastIntent:null,lastGenerationSnapshot:null};const d=oasisDecide(A,P(),as);return d.a.generated?d.a.comboSig:null}
 const s1=setup(0),s2=setup(100);add('stable_combination_identity_across_sequence_ids',true,!!s1&&s1===s2,{first:s1,second:s2});
}
// 10. Once a generated combination is realized, unchanged structural/current-flow state is not regenerated as new.
{
 A.relationEpisodes=[{t:4900,sequence:1,action:'interact',context:['agent:friend'],roles:['agent:any','agent:friend'],outcome:.5},{t:4920,sequence:2,action:'study_fire',context:['node:fire'],roles:['node:fire','nodekind:fire'],outcome:.6}];A.oasisV2={sequence:2,intentSeq:0,generatedUses:{},relationGraph:{},lastIntent:null,lastGenerationSnapshot:null};A.lastPerception=P();
 const p=P();const d1=oasisDecide(A,p,as);if(d1.a.generated)execute(A,p,d1.a);const d2=oasisDecide(A,p,as);add('no_new_recombination_without_flow_or_structure_change',true,!!d1.a.generated&&!d2.a.generated,{first:actionKey(d1.a),second:actionKey(d2.a),snapshot:A.oasisV2.lastGenerationSnapshot});
}
globalThis.__R__=tests;
`);
const tests=globalThis.__R__;const summary={regressionChecks:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,verdict:tests.every(t=>t.pass)?'stability-consistent':'stability-mismatch'};console.log(JSON.stringify(summary,null,2));if(summary.failed)process.exitCode=2;
