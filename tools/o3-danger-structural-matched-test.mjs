import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4205;
const MAX_TICK=Number(process.env.MAX_TICK||30000);
const SURROGATE_COUNT=127;
const REPORT=`o3-danger-structural-matched-${MAX_TICK}-report.json`;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext(), page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch(); let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const replacement="function latentActive(S,P){\n  if(globalThis.__OASIS_SHADOW_OVERRIDE&&globalThis.__OASIS_SHADOW_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_SHADOW_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('latentActive insertion target missing');
    src=src.replace(head,replacement);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_SHADOW_INTERNALS={ensureLatent,candidates:(S,P)=>latentCandidates(S,P).map(([id,ep])=>({id,ep,reasons:relevantReasons(S,P,ep)})).filter(x=>x.reasons.length),currentPlace};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('internals insertion target missing');
    src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_SHADOW_INTERNALS&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle'); if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({MAX_TICK,SURROGATE_COUNT})=>{
    const savedE=E,I=globalThis.__OASIS_SHADOW_INTERNALS,baseChoose=choose;
    E={tick:0,worlds:{full:mkW('full')},paused:true}; const S=E.worlds.full;
    const copy=x=>JSON.parse(JSON.stringify(x)), gateState=new Map(), records=[];
    const npcNames=npcs.map(x=>x[0]), placeIds=Object.keys(places);
    const stateFor=P=>{if(!gateState.has(P.id))gateState.set(P.id,{active:new Set(),lastExit:new Map()});return gateState.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(P,retrieved){const st=stateFor(P),prev=new Set(st.active),now=new Set();for(const {id,ep} of retrieved){const d=direct(P,ep);let admitted=false;if(prev.has(id))admitted=d;else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}if(admitted)now.add(id)}for(const id of prev)if(!now.has(id))st.lastExit.set(id,E.tick);st.active=now;return [...now]}
    function evalRows(P,ids){const F=P.relationField,L=F?.latent;if(!L)return copy(evalP(S,P,1));const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;try{out=copy(evalP(S,P,1))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}return out}
    const normHist=(arr,labels,keyfn)=>{const o=Object.fromEntries(labels.map(x=>[x,0]));for(const x of arr){const k=keyfn(x);if(k in o)o[k]++}const z=Math.max(1,arr.length);return labels.map(k=>o[k]/z)};
    function structural(P,ids){const F=P.relationField,L=F?.latent,recent=P.relationHistory.slice(-18),activeKeys=[...(F?.active||[])].sort();const last=P.choiceHistory.at(-1);return{tick:E.tick,party:P.id,here:I.currentPlace(P),target:P.target,danger:S.danger,disc:P.disc.size,routes:P.routes.size,seenNPC:P.seenNPC.size,relationHistory:P.relationHistory.length,episodes:F?.episodes?.length||0,latentCount:L?.byId?.size||0,eligibleCount:ids.length,activeKeyCount:activeKeys.length,activeKeys,hiddenCandidates:P.hiddenCandidates.size,decisionIndex:P.choiceHistory.length,decisionGap:last?E.tick-last.t:0,visits:placeIds.map(id=>P.vis[id]||0),recentNpc:normHist(recent,npcNames,e=>e.npc),recentPlace:normHist(recent,placeIds,e=>e.place)}};
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis'){const L=P.relationField?.latent;let ids=[],choiceDiff=false,decisionDiff=false;if(L&&L.byId?.size){ids=completedIds(P,I.candidates(S,P));const noRows=evalRows(P,[]),yesRows=evalRows(P,ids),a=sig(yesRows),b=sig(noRows);choiceDiff=a.choice!==b.choice;decisionDiff=changedSig(a,b)}const r=structural(P,ids);r.choiceDiff=choiceDiff;r.decisionDiff=decisionDiff;records.push(r)}baseChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))} choose=baseChoose;

    records.forEach((r,i)=>r._id=i);
    const byParty={}; for(const r of records)(byParty[r.party]??=[]).push(r); for(const rs of Object.values(byParty))rs.forEach((r,i)=>r._partyIndex=i);
    const numKeys=['disc','routes','seenNPC','relationHistory','episodes','latentCount','eligibleCount','activeKeyCount','hiddenCandidates','decisionIndex','decisionGap','tick'];
    const ranges={}; for(const k of numKeys){const xs=records.map(r=>r[k]);ranges[k]=Math.max(1e-9,Math.max(...xs)-Math.min(...xs))}
    const l1=(a,b)=>a.reduce((s,x,i)=>s+Math.abs(x-b[i]),0)/Math.max(1,a.length);
    const jaccard=(a,b)=>{const A=new Set(a),B=new Set(b),u=new Set([...A,...B]);if(!u.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;return 1-inter/u.size};
    function distance(a,b,full){const numeric=numKeys.reduce((s,k)=>s+Math.abs(a[k]-b[k])/ranges[k],0)/numKeys.length;const visit=l1(a.visits,b.visits),recentPlace=l1(a.recentPlace,b.recentPlace);if(!full)return numeric+visit+recentPlace;return numeric+visit+recentPlace+l1(a.recentNpc,b.recentNpc)+jaccard(a.activeKeys,b.activeKeys)}
    const tier=(a,b)=>a.here===b.here&&a.target===b.target?0:a.here===b.here?1:a.target===b.target?2:3;
    function match(full){const pos=records.filter(r=>r.choiceDiff),neg=records.filter(r=>!r.choiceDiff),used=new Set(),pairs=[];const ordered=[...pos].sort((a,b)=>{const ca=neg.filter(n=>n.party===a.party&&tier(a,n)===0).length,cb=neg.filter(n=>n.party===b.party&&tier(b,n)===0).length;return ca-cb||a.tick-b.tick});for(const p of ordered){let best=null;for(const n of neg){if(used.has(n._id)||n.party!==p.party)continue;const t=tier(p,n),d=distance(p,n,full),score=t*10+d;if(!best||score<best.score)best={n,t,d,score}}if(best){used.add(best.n._id);pairs.push({p,c:best.n,tier:best.t,distance:best.d})}}return pairs}
    const mean=xs=>xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length); const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0};
    const offset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1))));
    function summarize(pairs){const diffs=pairs.map(x=>x.p.danger-x.c.danger),obs=mean(diffs),nulls=[];for(let k=1;k<=SURROGATE_COUNT;k++){const ds=[];for(const x of pairs){const rp=byParty[x.p.party],rc=byParty[x.c.party],dp=rp[(x.p._partyIndex+offset(rp.length,k))%rp.length].danger,dc=rc[(x.c._partyIndex+offset(rc.length,k))%rc.length].danger;ds.push(dp-dc)}nulls.push(mean(ds))}const ns=[...nulls].sort((a,b)=>a-b),exceed=ns.filter(x=>x>=obs).length;const tierCounts=Object.fromEntries([0,1,2,3].map(t=>[t,pairs.filter(x=>x.tier===t).length]));return{pairs:pairs.length,tierCounts,exactHereTargetFraction:(tierCounts[0]||0)/Math.max(1,pairs.length),sameHereOrTargetFraction:((tierCounts[0]||0)+(tierCounts[1]||0)+(tierCounts[2]||0))/Math.max(1,pairs.length),meanStructuralDistance:mean(pairs.map(x=>x.distance)),observedMeanDangerDifference:obs,observedMedianDangerDifference:median(diffs),positiveHigherFraction:pairs.filter(x=>x.p.danger>x.c.danger).length/Math.max(1,pairs.length),nullMedian:ns[Math.floor(ns.length/2)],nullP95:ns[Math.floor(.95*(ns.length-1))],nullMax:Math.max(...ns),exceed,empiricalP:(exceed+1)/(SURROGATE_COUNT+1)}}
    const core=summarize(match(false)),full=summarize(match(true));
    const summary={maxTick:MAX_TICK,records:records.length,choiceDiffs:records.filter(r=>r.choiceDiff).length,decisionDiffs:records.filter(r=>r.decisionDiff).length,parties:Object.fromEntries(Object.entries(byParty).map(([p,rs])=>[p,rs.length])),matching:{core,full},world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};
    E=savedE; delete globalThis.__OASIS_SHADOW_INTERNALS; return summary;
  },{MAX_TICK,SURROGATE_COUNT});

  if(MAX_TICK===30000){if(result.records!==463||result.choiceDiffs!==28||result.decisionDiffs!==33)throw new Error(`canonical mismatch ${JSON.stringify({records:result.records,choiceDiffs:result.choiceDiffs,decisionDiffs:result.decisionDiffs})}`)}
  if(result.matching.core.pairs!==result.choiceDiffs||result.matching.full.pairs!==result.choiceDiffs)throw new Error('not all positive O3 choice-difference events were matched');
  const report={design:{purpose:'test whether current danger adds association with O3 choice-contribution after matching on current structural flow state',worldPolicy:'production trajectory unchanged; matching and danger surrogates are offline shadow analysis only',o3Policy:'completed-process O3 fixed',matching:'1:1 without replacement within party; hierarchy same here+target, same here, same target, party-only; nearest structural state chosen without using danger',coreCovariates:'visit history, discovered/routes/seen counts, relation-history size, episode/latent/eligible counts, active-key count, hidden count, decision index/gap, tick, recent-place composition',fullAdds:'recent-NPC composition and active relation-key Jaccard distance',null:'127 within-party circular shifts of the observed danger-at-decision sequence after matches are frozen',causalClaim:false,candidatePolicy:false},...result};
  console.log('O3-DANGER-STRUCTURAL-MATCHED '+JSON.stringify(report)); await writeFile(REPORT,JSON.stringify(report,null,2)); await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
