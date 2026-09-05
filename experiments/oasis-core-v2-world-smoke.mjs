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
for(const f of ['prehistoric-society-v3-core.js','prehistoric-society-v3-decisions.js','prehistoric-society-v3-world.js','prehistoric-singularity-v4.js','prehistoric-cooperation-v4.js','prehistoric-late-paleolithic-v5.js','prehistoric-exposure-v6.js','prehistoric-ritual-observer-v6.js','oasis-core-v2.js','oasis-core-v2-stability.js'])vm.runInThisContext(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
vm.runInThisContext(`
const first={};for(let i=0;i<25;i++){tick(1);for(const id of Object.keys(FOUNDERS)){const a=E.people[id];if(!first[id]&&a.lastAction)first[id]={tick:E.tick,action:a.lastAction,why:a.lastWhy}}}
tick(975);
const O=E.people.oasis,V=O.oasisV2||{};
const generatedUses=Object.values(V.generatedUses||{}).reduce((a,b)=>a+b,0);
const result={tick:E.tick,population:living().length,births:E.births,deaths:E.deaths,maxGeneration:E.maxGeneration,firstActions:first,oasis:{actions:O.actions,relationEpisodes:O.relationEpisodes.length,activeNow:O.activeRelations.length,generatedUses,generatedPatterns:Object.keys(V.generatedUses||{}).length,relationGraphEdges:Object.keys(V.relationGraph||{}).length,relationUse:O.metrics.relationUse,lastAction:O.lastAction,lastWhy:O.lastWhy,health:+O.health.toFixed(2),energy:+O.energy.toFixed(2),water:+O.water.toFixed(2)},founders:Object.fromEntries(Object.keys(FOUNDERS).map(id=>[id,{actions:E.people[id].actions,children:E.people[id].metrics.births,topAction:topAction(E.people[id])}]))};
globalThis.__SMOKE__=result;
`);
console.log(JSON.stringify(globalThis.__SMOKE__,null,2));
