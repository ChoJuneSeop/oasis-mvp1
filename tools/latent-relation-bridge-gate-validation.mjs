import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-admission-gate-fast-validation.mjs';
const TMP='tools/.tmp-oasis-latent-bridge-validation.mjs';
const MAX_TICK=Number(process.env.OASIS_BRIDGE_MAX_TICK||30000);
const FIRST_GATE_30K=46612;
let src=await readFile(BASE,'utf8');

const oldEvidence=`function currentRelationEvidence(S,P,ep){
  const here=currentPlace(P),target=P.target,gate=places[target]?.gate,recent=recentRelations(P);
  const directHere=ep.places.includes(here),directTarget=ep.places.includes(target),gateMatch=!!gate&&(ep.a===gate||ep.b===gate);
  const npcAnchor=recent.some(r=>r.npc===ep.a||r.npc===ep.b),placeAnchor=recent.some(r=>ep.places.includes(r.place));
  const reasons=[];if(directHere)reasons.push('direct-here:'+here);if(directTarget)reasons.push('direct-target:'+target);if(gateMatch)reasons.push('direct-gate:'+gate);if(npcAnchor)reasons.push('process-npc-anchor');if(placeAnchor)reasons.push('process-place-anchor');
  return {valid:(directHere||directTarget||gateMatch)&&npcAnchor,reasons};
}`;
const newEvidence=`function currentRelationEvidence(S,P,ep,id,L){
  const here=currentPlace(P),target=P.target,gate=places[target]?.gate;
  const directHere=ep.places.includes(here),directTarget=ep.places.includes(target),gateMatch=!!gate&&(ep.a===gate||ep.b===gate),direct=directHere||directTarget||gateMatch;
  const since=L.lastExit?.get(id)??ep.t;let bridge=null;
  for(let i=P.relationHistory.length-1;i>=0;i--){const r=P.relationHistory[i];if((r.t??-1)<=since)break;if(r.npc===ep.a||r.npc===ep.b||ep.places.includes(r.place)||(gate&&r.npc===gate)){bridge=r;break;}}
  const reasons=[];if(directHere)reasons.push('direct-here:'+here);if(directTarget)reasons.push('direct-target:'+target);if(gateMatch)reasons.push('direct-gate:'+gate);if(bridge)reasons.push('new-process-bridge:'+bridge.t+':'+bridge.npc+':'+bridge.place);
  return {direct,bridgeValid:!!bridge,bridgeTick:bridge?.t??null,reasons};
}`;
if(!src.includes(oldEvidence))throw new Error('evidence transform target missing');
src=src.replace(oldEvidence,newEvidence);

const oldStats="function gateStats(L){return L.gateStats||(L.gateStats={evaluations:0,retrievedAdds:0,retrievedReleases:0,rejectedAdds:0,retrievalAddXor:0,retrievalReleaseXor:0,rejectXor:0})}";
const newStats="function gateStats(L){return L.gateStats||(L.gateStats={evaluations:0,retrievedAdds:0,retrievedReleases:0,rejectedAdds:0,bridgeBlocked:0,retrievalAddXor:0,retrievalReleaseXor:0,rejectXor:0})}";
if(!src.includes(oldStats))throw new Error('stats transform target missing');
src=src.replace(oldStats,newStats);

const oldInit="const L=ensureLatent(P),G=gateStats(L),last=P.relationHistory.at(-1);if(!L.retrievedIds)L.retrievedIds=[];";
const newInit="const L=ensureLatent(P),G=gateStats(L),last=P.relationHistory.at(-1);if(!L.retrievedIds)L.retrievedIds=[];if(!L.lastExit)L.lastExit=new Map();";
if(!src.includes(oldInit))throw new Error('init transform target missing');
src=src.replace(oldInit,newInit);

const oldActive="const active=[];for(const x of retrieved){const evidence=currentRelationEvidence(S,P,x.ep);if(evidence.valid)active.push({...x,evidence});else if(!prevRetrieved.has(x.id)){G.rejectedAdds++;G.rejectXor=(G.rejectXor^gateHash(x.id))>>>0;}}\n  const prev=new Set(L.activeIds||[]),now=new Set(active.map(x=>x.id));";
const newActive="const prev=new Set(L.activeIds||[]),active=[];for(const x of retrieved){const evidence=currentRelationEvidence(S,P,x.ep,x.id,L);const admitted=prev.has(x.id)?evidence.direct:(evidence.direct&&evidence.bridgeValid);if(admitted)active.push({...x,evidence,admissionMode:prev.has(x.id)?'retain':'bridge-entry'});else{if(evidence.direct&&!evidence.bridgeValid&&!prev.has(x.id))G.bridgeBlocked++;if(!prevRetrieved.has(x.id)){G.rejectedAdds++;G.rejectXor=(G.rejectXor^gateHash(x.id))>>>0;}}}\n  const now=new Set(active.map(x=>x.id));";
if(!src.includes(oldActive))throw new Error('active transform target missing');
src=src.replace(oldActive,newActive);

const oldReact="for(const x of active)if(!prev.has(x.id))audit(P,'reactivate',{episodeId:x.id,key:x.ep.key,createdTick:x.ep.t,age:E.tick-x.ep.t,retrievalReasons:x.reasons,evidenceReasons:x.evidence.reasons,from:[...(x.ep.from||[])],places:[...x.ep.places]});";
const newReact="for(const x of active)if(!prev.has(x.id))audit(P,'reactivate',{episodeId:x.id,key:x.ep.key,createdTick:x.ep.t,age:E.tick-x.ep.t,retrievalReasons:x.reasons,evidenceReasons:x.evidence.reasons,admissionMode:x.admissionMode,bridgeTick:x.evidence.bridgeTick,from:[...(x.ep.from||[])],places:[...x.ep.places]});";
if(!src.includes(oldReact))throw new Error('reactivation transform target missing');
src=src.replace(oldReact,newReact);

const oldNon="for(const id of prev)if(!now.has(id)){const ep=L.byId.get(id);audit(P,'noncurrent',{episodeId:id,key:ep?.key||null,createdTick:ep?.t??null,age:ep?E.tick-ep.t:null,reason:nowRetrieved.has(id)?'admission-failed':'candidate-released'});}";
const newNon="for(const id of prev)if(!now.has(id)){L.lastExit.set(id,E.tick);const ep=L.byId.get(id);audit(P,'noncurrent',{episodeId:id,key:ep?.key||null,createdTick:ep?.t??null,age:ep?E.tick-ep.t:null,reason:nowRetrieved.has(id)?'admission-failed':'candidate-released',lastExitTick:E.tick});}";
if(!src.includes(oldNon))throw new Error('noncurrent transform target missing');
src=src.replace(oldNon,newNon);

src=src
  .replace("const PORT=4187, MAX_TICK=120000, CHUNK=1000;",`const PORT=4189, MAX_TICK=${MAX_TICK}, CHUNK=1000;`)
  .replace("const AUDIT_FILE='latent-relation-admission-fast-audit.jsonl';","const AUDIT_FILE='latent-relation-bridge-audit.jsonl';")
  .replace("const CF_FILE='latent-relation-admission-fast-counterfactual.jsonl';","const CF_FILE='latent-relation-bridge-counterfactual.jsonl';")
  .replace("const REPORT_FILE='latent-relation-admission-fast-report.json';","const REPORT_FILE='latent-relation-bridge-report.json';")
  .replace("totalGateEvaluations:retrievalTotals.evaluations||0,","totalGateEvaluations:retrievalTotals.evaluations||0,totalBridgeBlocked:retrievalTotals.bridgeBlocked||0,")
  .replace("purpose:'efficient exact separation of latent retrieval from actual current relation admission'","purpose:'reactivate a non-current process only after a newly formed relational bridge since its last exit'")
  .replace("gate:'direct current place/target/gate clue AND recent-18 NPC process anchor'","gate:'direct current structural clue AND new relation-history bridge formed after last non-current exit; active relation retained while direct clue persists'")
  .replace("if(summary.completedTick!==MAX_TICK)throw new Error('incomplete');","await writeFile(REPORT_FILE,JSON.stringify(report,null,2));\n  if(summary.completedTick!==MAX_TICK)throw new Error('incomplete');")
  .replace("if(summary.totalReactivations>=BASELINE.reactivations)throw new Error('churn not reduced');","if(MAX_TICK===30000&&summary.totalReactivations>=46612)throw new Error('bridge churn not reduced vs first-gate-30k');if(MAX_TICK===120000&&summary.totalReactivations>=1158806)throw new Error('bridge churn not reduced vs first-gate-120k');if(summary.directCounterfactualDifferences<=0)throw new Error('no retained decision contribution');")
  .replace("console.log('RESULT fast admission-gate validation completed; production and reality engine unchanged.');","console.log('RESULT relational-bridge gate validation completed; production and reality engine unchanged.');");

for(const marker of ['lastExit=new Map','bridgeBlocked','new-process-bridge','bridge-entry'])if(!src.includes(marker))throw new Error('missing transformed marker '+marker);
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
