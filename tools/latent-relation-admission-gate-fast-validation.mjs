import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, appendFile } from 'node:fs/promises';

const PORT=4187, MAX_TICK=120000, CHUNK=1000;
const AUDIT_FILE='latent-relation-admission-fast-audit.jsonl';
const CF_FILE='latent-relation-admission-fast-counterfactual.jsonl';
const REPORT_FILE='latent-relation-admission-fast-report.json';
const BASELINE={reactivations:969111,noncurrent:961790,counterfactual:297,choiceDifferences:204,leaderDifferences:284,candidateDifferences:0,elapsedMs:301868};
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let browser;

const replacement=String.raw`function relevantReasons(S,P,ep){
  const here=currentPlace(P),target=P.target,reasons=[];
  if(ep.places.includes(here))reasons.push('here:'+here);
  if(ep.places.includes(target))reasons.push('target:'+target);
  for(const id of ep.places)if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push('danger:'+id);
  const gate=places[target]?.gate;if(gate&&(ep.a===gate||ep.b===gate))reasons.push('gate:'+gate);
  return [...new Set(reasons)];
}
function currentRelationEvidence(S,P,ep){
  const here=currentPlace(P),target=P.target,gate=places[target]?.gate,recent=recentRelations(P);
  const directHere=ep.places.includes(here),directTarget=ep.places.includes(target),gateMatch=!!gate&&(ep.a===gate||ep.b===gate);
  const npcAnchor=recent.some(r=>r.npc===ep.a||r.npc===ep.b),placeAnchor=recent.some(r=>ep.places.includes(r.place));
  const reasons=[];if(directHere)reasons.push('direct-here:'+here);if(directTarget)reasons.push('direct-target:'+target);if(gateMatch)reasons.push('direct-gate:'+gate);if(npcAnchor)reasons.push('process-npc-anchor');if(placeAnchor)reasons.push('process-place-anchor');
  return {valid:(directHere||directTarget||gateMatch)&&npcAnchor,reasons};
}
function latentCandidates(S,P){
  const L=ensureLatent(P),ids=new Set(),here=currentPlace(P),target=P.target,gate=places[target]?.gate;
  const add=k=>{const b=L.byClue.get(k);if(b)for(const id of b)ids.add(id)};add('place:'+here);add('place:'+target);if(gate)add('npc:'+gate);
  const center=Math.round(S.danger*100);for(let b=Math.max(0,center-18);b<=Math.min(100,center+18);b++)add('risk:'+b);
  return [...ids].map(id=>[id,L.byId.get(id)]).filter(x=>x[1]);
}
function gateHash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h}
function gateStats(L){return L.gateStats||(L.gateStats={evaluations:0,retrievedAdds:0,retrievedReleases:0,rejectedAdds:0,retrievalAddXor:0,retrievalReleaseXor:0,rejectXor:0})}
function latentActive(S,P){
  if(!latentEnabled())return [];moveAgedToLatent(P);
  const L=ensureLatent(P),G=gateStats(L),last=P.relationHistory.at(-1);if(!L.retrievedIds)L.retrievedIds=[];
  const cacheKey=[E.tick,currentPlace(P),P.target,Math.round(S.danger*1000),L.byId.size,P.relationHistory.length,last?.t,last?.npc,last?.place].join('|');
  if(L.cacheKey===cacheKey)return L.cacheEpisodes;G.evaluations++;
  const retrieved=[];for(const [id,ep] of latentCandidates(S,P)){const reasons=relevantReasons(S,P,ep);if(reasons.length)retrieved.push({id,ep,reasons});}
  const prevRetrieved=new Set(L.retrievedIds||[]),nowRetrieved=new Set(retrieved.map(x=>x.id));
  for(const x of retrieved)if(!prevRetrieved.has(x.id)){G.retrievedAdds++;G.retrievalAddXor=(G.retrievalAddXor^gateHash(x.id))>>>0;}
  for(const id of prevRetrieved)if(!nowRetrieved.has(id)){G.retrievedReleases++;G.retrievalReleaseXor=(G.retrievalReleaseXor^gateHash(id))>>>0;}
  const active=[];for(const x of retrieved){const evidence=currentRelationEvidence(S,P,x.ep);if(evidence.valid)active.push({...x,evidence});else if(!prevRetrieved.has(x.id)){G.rejectedAdds++;G.rejectXor=(G.rejectXor^gateHash(x.id))>>>0;}}
  const prev=new Set(L.activeIds||[]),now=new Set(active.map(x=>x.id));
  for(const x of active)if(!prev.has(x.id))audit(P,'reactivate',{episodeId:x.id,key:x.ep.key,createdTick:x.ep.t,age:E.tick-x.ep.t,retrievalReasons:x.reasons,evidenceReasons:x.evidence.reasons,from:[...(x.ep.from||[])],places:[...x.ep.places]});
  for(const id of prev)if(!now.has(id)){const ep=L.byId.get(id);audit(P,'noncurrent',{episodeId:id,key:ep?.key||null,createdTick:ep?.t??null,age:ep?E.tick-ep.t:null,reason:nowRetrieved.has(id)?'admission-failed':'candidate-released'});}
  L.retrievedIds=[...nowRetrieved];L.activeIds=[...now];L.cacheKey=cacheKey;L.cacheEpisodes=active.map(x=>x.ep);return L.cacheEpisodes;
}`;

try{
  await writeFile(AUDIT_FILE,'');await writeFile(CF_FILE,'');await sleep(600);
  browser=await chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{const response=await route.fetch();let src=await response.text();const re=/function relevantReasons\(S,P,ep\)\{[\s\S]*?function latentActive\(S,P\)\{[\s\S]*?return L\.cacheEpisodes;\n\}/;if(!re.test(src))throw new Error('gate transform target not found');src=src.replace(re,replacement.trim());await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();
  await page.evaluate(()=>{
    const savedE=E;E={tick:0,worlds:{full:mkW('full')},paused:true};const S=E.worlds.full,originalChoose=choose;
    const T=globalThis.__LATENT_GATE_FAST={savedE,S,originalChoose,counterfactual:[],checkpoints:[],maxActiveEpisodes:0};const copy=x=>JSON.parse(JSON.stringify(x));
    function diagnostic(P){const F=P.relationField,L=F?.latent;if(!L||!L.activeIds?.length)return;const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],retrieved:[...(L.retrievedIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;let full,noLat;try{globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;full=copy(sig(evalP(S,P,1)));F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.retrievedIds=[...saved.retrieved];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];S.c.relationFieldActivation=saved.sAct;P.target=saved.target;globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=true;noLat=copy(sig(evalP(S,P,1)));}finally{globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.retrievedIds=[...saved.retrieved];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target;}if(changedSig(full,noLat))T.counterfactual.push({tick:E.tick,party:P.id,currentPlace:currentPlace(P),targetBefore:saved.target,danger:S.danger,latentActiveIds:[...saved.latentActive],full,noLat});}
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis')diagnostic(P);originalChoose(S0,P)};
  });
  const started=Date.now(),counts={};let totalAudit=0,cfCount=0,firstCF=null,lastCF=null,maxActiveEpisodes=0,choiceDifferences=0,leaderDifferences=0,candidateDifferences=0;const checkpoints=[];
  for(let start=1;start<=MAX_TICK;start+=CHUNK){const end=Math.min(MAX_TICK,start+CHUNK-1);const chunk=await page.evaluate(({start,end})=>{const T=globalThis.__LATENT_GATE_FAST,S=T.S;for(let t=start;t<=end;t++){E.tick=t;tickW(S,env(t));for(const P of S.parties)T.maxActiveEpisodes=Math.max(T.maxActiveEpisodes,P.relationField?.episodes?.length||0);if(t===4000||t===40000||t===120000)T.checkpoints.push({tick:t,parties:S.parties.map(P=>({id:P.id,activeEpisodes:P.relationField?.episodes?.length||0,latentProcesses:P.relationField?.latent?.byId?.size||0,retrieved:P.relationField?.latent?.retrievedIds?.length||0,currentized:P.relationField?.latent?.activeIds?.length||0,activeKeys:[...(P.relationField?.active||[])]}))});}const audit=[];for(const P of S.parties){const L=P.relationField?.latent;if(!L)continue;for(const e of L.audit)audit.push({...e,partyName:P.name});L.audit.length=0;}return{audit,counterfactual:T.counterfactual.splice(0),checkpoints:T.checkpoints.splice(0),maxActiveEpisodes:T.maxActiveEpisodes};},{start,end});maxActiveEpisodes=Math.max(maxActiveEpisodes,chunk.maxActiveEpisodes);if(chunk.audit.length){for(const e of chunk.audit){counts[e.type]=(counts[e.type]||0)+1;totalAudit++;}await appendFile(AUDIT_FILE,chunk.audit.map(JSON.stringify).join('\n')+'\n');}if(chunk.counterfactual.length){for(const x of chunk.counterfactual){if(x.full.choice!==x.noLat.choice)choiceDifferences++;if(x.full.leader!==x.noLat.leader)leaderDifferences++;if(x.full.cands!==x.noLat.cands)candidateDifferences++;}cfCount+=chunk.counterfactual.length;if(!firstCF)firstCF=chunk.counterfactual[0];lastCF=chunk.counterfactual.at(-1);await appendFile(CF_FILE,chunk.counterfactual.map(JSON.stringify).join('\n')+'\n');}checkpoints.push(...chunk.checkpoints);if(end%10000===0)console.log(`PROGRESS tick=${end} currentize=${counts.reactivate||0} cf=${cfCount}`);}
  const final=await page.evaluate(()=>{const T=globalThis.__LATENT_GATE_FAST,S=T.S;choose=T.originalChoose;const parties=S.parties.map(P=>{const L=P.relationField?.latent,G=L?.gateStats||{};return{id:P.id,name:P.name,activeEpisodes:P.relationField?.episodes?.length||0,latentProcesses:L?.byId?.size||0,retrieved:L?.retrievedIds?.length||0,currentized:L?.activeIds?.length||0,gateStats:{...G},recombinations:P.relationField?.recombinations||0,spirals:P.relationField?.spirals||0}});const completedTick=E.tick;E=T.savedE;delete globalThis.__LATENT_GATE_FAST;return{completedTick,parties};});
  const retrievalTotals=final.parties.reduce((o,p)=>{for(const [k,v] of Object.entries(p.gateStats||{}))o[k]=(o[k]||0)+(Number(v)||0);return o;},{}),elapsedMs=Date.now()-started;
  const summary={completedTick:final.completedTick,maxActiveEpisodes,totalLatentProcesses:final.parties.reduce((a,p)=>a+p.latentProcesses,0),totalAuditEvents:totalAudit,totalLatentizations:counts.latentize||0,totalCandidateRetrievals:retrievalTotals.retrievedAdds||0,totalCandidateReleases:retrievalTotals.retrievedReleases||0,totalCandidateRejects:retrievalTotals.rejectedAdds||0,totalGateEvaluations:retrievalTotals.evaluations||0,totalReactivations:counts.reactivate||0,totalNonCurrent:counts.noncurrent||0,totalSelectParticipation:counts['select-participation']||0,totalOutcomes:counts.outcome||0,totalComposes:counts.compose||0,totalFieldSpirals:counts['field-spiral']||0,directCounterfactualDifferences:cfCount,choiceDifferences,leaderDifferences,candidateDifferences,firstCounterfactual:firstCF,lastCounterfactual:lastCF,elapsedMs,retrievalDigests:{addXor:retrievalTotals.retrievalAddXor||0,releaseXor:retrievalTotals.retrievalReleaseXor||0,rejectXor:retrievalTotals.rejectXor||0},baseline:BASELINE};
  const report={design:{purpose:'efficient exact separation of latent retrieval from actual current relation admission',realityEngineModified:false,productionRelationFieldModified:false,gate:'direct current place/target/gate clue AND recent-18 NPC process anchor',candidateLogging:'exact counts + deterministic XOR digests; episode-level raw logs preserved for admitted reactivation/noncurrent/selection/outcome',maxTick:MAX_TICK},summary,checkpoints,parties:final.parties,files:{audit:AUDIT_FILE,counterfactual:CF_FILE}};
  if(summary.completedTick!==MAX_TICK)throw new Error('incomplete');if(summary.maxActiveEpisodes>80)throw new Error('active cap');if(summary.totalCandidateRetrievals<=0)throw new Error('no retrieval');if(summary.totalReactivations<=0)throw new Error('no currentization');if(summary.totalReactivations>=BASELINE.reactivations)throw new Error('churn not reduced');
  console.log(`PASS active-window-cap=${summary.maxActiveEpisodes}`);console.log(`PASS candidate-retrievals=${summary.totalCandidateRetrievals}`);console.log(`PASS admitted-currentizations=${summary.totalReactivations}`);console.log(`INFO candidate-rejects=${summary.totalCandidateRejects}`);console.log(`INFO admission-ratio=${(summary.totalReactivations/summary.totalCandidateRetrievals).toFixed(6)}`);console.log(`INFO counterfactual=${cfCount} choice=${choiceDifferences} leader=${leaderDifferences} candidates=${candidateDifferences}`);console.log(`INFO elapsed-ms=${elapsedMs}`);if(firstCF)console.log(`FIRST-COUNTERFACTUAL ${JSON.stringify(firstCF)}`);for(const c of checkpoints)console.log(`CHECKPOINT ${c.tick} ${JSON.stringify(c.parties)}`);console.log('RESULT fast admission-gate validation completed; production and reality engine unchanged.');
  await writeFile(REPORT_FILE,JSON.stringify(report,null,2));await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
