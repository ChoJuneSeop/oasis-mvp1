import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.join(here,'prehistoric-headless-v4.mjs');
const temp=path.join(here,'.prehistoric-headless-v5.tmp.mjs');
let src=fs.readFileSync(base,'utf8');
src=src.replace("'prehistoric-cooperation-v4.js']","'prehistoric-cooperation-v4.js','prehistoric-human-substrate-v4.js','prehistoric-late-paleolithic-v5.js']");
src=src.replace("const cultureRich=non.filter(a=>Object.keys(a.culture.actions).length>=5).length;","const cultureRich=non.filter(a=>Object.keys(a.culture.actions).length>=5).length;\n  const advancedCarriers=non.filter(a=>a.late&&(a.late.advancedTool||a.late.boneTool)).length;\n  const symbolObservers=non.filter(a=>a.culture.knownKinds?.has('symbolic_mark')||a.culture.actions.study_symbol).length;");
src=src.replace("cultureRich,innovations:E.innovations,milestones:E.milestones,singularities:E.singularities};","cultureRich,advancedCarriers,symbolObservers,innovations:E.innovations,milestones:E.milestones,singularities:E.singularities,lateMilestones:E.lateMilestones,lateWorld:E.lateWorld,humanEvents:E.humanEvents};");
src=src.replace(/function latePaleolithicReached\(s\)\{[\s\S]*?\n\}/,`function latePaleolithicReached(s){\n  const L=s.lateMilestones||{};\n  return s.maxGeneration>=4 && s.population>=20 && s.hearths>=1 && s.milestones.firstCookedMeal && s.milestones.firstCoopHuntSuccess && L.firstCompositeTool && L.firstBoneTool && L.firstSymbol && L.firstSymbolObserved && L.firstLongTransfer && s.coopHunters>=3 && s.advancedCarriers>=3 && s.symbolObservers>=2 && s.relationPairs>=Math.max(12,Math.floor(s.population*.65)) && s.cultureRich>=Math.max(4,Math.floor(s.population*.15));\n}`);
src=src.replace('target<=50000','target<=60000');
fs.writeFileSync(temp,src);
const r=spawnSync(process.execPath,[temp],{stdio:'inherit'});
try{fs.unlinkSync(temp)}catch{}
process.exit(r.status??1);
