import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
function el(){return{textContent:'',innerHTML:'',value:'',className:'',onclick:null,onchange:null,classList:{toggle(){}},appendChild(){},getContext(){return ctx}}}
const ctx={clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},stroke(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){}};
const elements=new Map();
globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id)},querySelectorAll(){return[]},querySelector(){return el()},createElement(){return el()}};
globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};
for(const f of ['prehistoric-society-v3-core.js','prehistoric-society-v3-decisions.js','prehistoric-society-v3-world.js','prehistoric-singularity-v4.js','prehistoric-cooperation-v4.js','prehistoric-late-paleolithic-v5.js','prehistoric-exposure-v6.js','prehistoric-ritual-observer-v6.js'])vm.runInThisContext(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
const anchors=JSON.parse(fs.readFileSync(path.join(here,'archaeology-anchors-v6.json'),'utf8'));
vm.runInThisContext(`
function snapshot(){
 const pop=living(),non=pop.filter(a=>!a.founder),hearths=E.nodes.filter(n=>n.kind==='hearth').length;
 const relPairs=new Set();for(const a of pop)for(const [bid,v] of Object.entries(a.relations||{}))if(v>=.10&&E.people[bid]?.alive)relPairs.add([a.id,bid].sort().join('|'));
 const cultureRich=non.filter(a=>Object.keys(a.culture.actions||{}).length>=5).length;
 const advanced=non.filter(a=>a.late&&(a.late.advancedTool||a.late.boneTool)).length;
 const markObservers=non.filter(a=>a.culture.knownKinds?.has('persistent_mark')||a.culture.actions?.observe_mark).length;
 const coopHunters=non.filter(a=>(a.metrics.coopJoin||0)+(a.metrics.coopPropose||0)+(a.metrics.coopSuccess||0)>0||a.culture.actions?.coop_hunt).length;
 return{tick:E.tick,population:pop.length,births:E.births,deaths:E.deaths,maxGeneration:E.maxGeneration,hearths,relationPairs:relPairs.size,cultureRich,advanced,markObservers,coopHunters,coopHunts:E.coopHunts||0,coopHuntSuccess:E.coopHuntSuccess||0,innovations:E.innovations,milestones:E.milestones,lateMilestones:E.lateMilestones,lateWorld:E.lateWorld,exposure:E.exposure,ritualObserver:E.ritualObserver};
}
function lateReached(s){const L=s.lateMilestones||{},M=s.milestones||{};return s.maxGeneration>=4&&s.population>=8&&s.hearths>=1&&M.firstSharpTool&&M.firstCookedMeal&&M.firstCoopHuntSuccess&&(L.firstCompositeTool||L.firstBoneTool)&&L.firstMark&&L.firstMarkObserved&&s.relationPairs>=10&&s.cultureRich>=3}
let reached=null,checkpoints=[];for(let target=500;target<=60000;target+=500){tick(500);const s=snapshot();if(target%2500===0||s.milestones?.firstPreservedFire||s.lateMilestones?.firstMark)checkpoints.push(s);if(lateReached(s)){reached=s;break}}
const finalState=reached||snapshot();
function t(x){return x?.t??null}
const simMilestones={sharp_tool:t(E.milestones?.firstSharpTool),fire_preserved:t(E.milestones?.firstPreservedFire),cooking:t(E.milestones?.firstCookedMeal),coop_hunt:t(E.milestones?.firstCoopHuntSuccess),bone_tool:t(E.lateMilestones?.firstBoneTool),composite_tool:t(E.lateMilestones?.firstCompositeTool),persistent_mark:t(E.lateMilestones?.firstMark),mark_observed:t(E.lateMilestones?.firstMarkObserved),ritual_candidate:t(E.ritualObserver?.firstCandidate)};
const simSequence=Object.entries(simMilestones).filter(([,v])=>v!=null).sort((a,b)=>a[1]-b[1]).map(([key,tick],i,a)=>({key,tick,gap_from_previous:i?tick-a[i-1][1]:null}));
const founders={};for(const id of Object.keys(FOUNDERS)){const a=E.people[id];founders[id]={actions:a.actions,children:a.metrics.births,relations:Object.keys(a.relations||{}).length,relationUse:a.metrics.relationUse,memoryUse:a.metrics.memoryUse,coopPropose:a.metrics.coopPropose||0,coopJoin:a.metrics.coopJoin||0,coopSuccess:a.metrics.coopSuccess||0,topAction:topAction(a),health:+a.health.toFixed(2)}}
globalThis.__RESULT__={reached:!!reached,finalState,founders,simMilestones,simSequence,recentLog:E.log.slice(0,35),checkpoints:checkpoints.slice(-12)};
`);
const hist=anchors.map(a=>({key:a.key,label:a.label,years_before_present:a.years_before_present??null,years_before_present_range:a.years_before_present_range??null,type:a.type,note:a.note}));
globalThis.__RESULT__.historicalComparison={principle:'No tick-to-year conversion. Compare only sequence and relative interval compression after the run.',anchors:hist};
console.log(JSON.stringify(globalThis.__RESULT__,null,2));
