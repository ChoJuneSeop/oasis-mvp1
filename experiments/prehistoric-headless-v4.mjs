import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
function el(){return {textContent:'',innerHTML:'',value:'',className:'',onclick:null,onchange:null,classList:{toggle(){}},appendChild(){},getContext(){return ctx}}}
const ctx={clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},stroke(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){}};
const elements=new Map();
globalThis.document={
  getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id)},
  querySelectorAll(){return []},
  querySelector(){return el()},
  createElement(){return el()}
};
globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};

for(const f of ['prehistoric-society-v3-core.js','prehistoric-society-v3-decisions.js','prehistoric-society-v3-world.js','prehistoric-singularity-v4.js']){
  vm.runInThisContext(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
}

vm.runInThisContext(`
function observerSnapshot(){
  const pop=living(), non=pop.filter(a=>!a.founder);
  const hearths=E.nodes.filter(n=>n.kind==='hearth').length;
  const tools=pop.filter(a=>a.tool).length;
  const fireUsers=non.filter(a=>Object.keys(a.culture.actions).some(k=>k.startsWith('cook_meat:')||k.startsWith('study_fire:')||k.startsWith('preserve_fire:'))).length;
  const toolUsers=non.filter(a=>a.tool||Object.keys(a.culture.actions).some(k=>k.startsWith('gather:sharp_stone')||k.startsWith('hunt'))).length;
  const relPairs=new Set();
  for(const a of pop)for(const [bid,v] of Object.entries(a.relations))if(v>=.10&&E.people[bid]?.alive)relPairs.add([a.id,bid].sort().join('|'));
  const cultureRich=non.filter(a=>Object.keys(a.culture.actions).length>=5).length;
  return {tick:E.tick,population:pop.length,births:E.births,deaths:E.deaths,maxGeneration:E.maxGeneration,hearths,tools,fireUsers,toolUsers,relationPairs:relPairs.size,cultureRich,innovations:E.innovations,milestones:E.milestones,singularities:E.singularities};
}
function latePaleolithicReached(s){
  return s.maxGeneration>=3 && s.population>=20 && s.hearths>=1 && s.milestones.firstCookedMeat && s.milestones.firstCookedMeal && s.milestones.firstSharpTool && s.milestones.firstHearthUseByOther && s.relationPairs>=Math.max(12,Math.floor(s.population*.65)) && s.cultureRich>=Math.max(3,Math.floor(s.population*.12));
}
let reached=null, checkpoints=[];
for(let target=500;target<=50000;target+=500){
  tick(500);const s=observerSnapshot();
  if(target%2500===0||s.milestones.firstPreservedFire||s.milestones.firstSharpTool)checkpoints.push(s);
  if(latePaleolithicReached(s)){reached=s;break;}
}
const finalState=reached||observerSnapshot();
const founders={};
for(const id of Object.keys(FOUNDERS)){const a=E.people[id];founders[id]={actions:a.actions,children:a.metrics.births,relations:Object.keys(a.relations).length,relationUse:a.metrics.relationUse,memoryUse:a.metrics.memoryUse,topAction:topAction(a),health:+a.health.toFixed(2),energy:+a.energy.toFixed(2),water:+a.water.toFixed(2)};}
globalThis.__RESULT__={reached:!!reached,finalState,founders,checkpoints:checkpoints.slice(-12),recentLog:E.log.slice(0,30)};
`);
console.log(JSON.stringify(globalThis.__RESULT__,null,2));
