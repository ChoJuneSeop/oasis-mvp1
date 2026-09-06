import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4206, MAX_TICK=120000, SURROGATE_COUNT=127;
const REPORT='o3-danger-matching-sensitivity-120k-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600); browser=await chromium.launch({headless:true});
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch();let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const replacement="function latentActive(S,P){\n  if(globalThis.__OASIS_SHADOW_OVERRIDE&&globalThis.__OASIS_SHADOW_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_SHADOW_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('latentActive insertion target missing');src=src.replace(head,replacement);
    const tail='reset();\n})();',exposed=`globalThis.__OASIS_SHADOW_INTERNALS={ensureLatent,candidates:(S,P)=>latentCandidates(S,P).map(([id,ep])=>({id,ep,reasons:relevantReasons(S,P,ep)})).filter(x=>x.reasons.length),currentPlace};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('internals insertion target missing');src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_SHADOW_INTERNALS&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({MAX_TICK,SURROGATE_COUNT})=>{
    const savedE=E,I=globalThis.__OASIS_SHADOW_INTERNALS,baseChoose=choose;
    E={tick:0,worlds:{full:mkW('full')},paused:true};const S=E.worlds.full;
    const copy=x=>JSON.parse(JSON.stringify(x)),gateState=new Map(),records=[];
    const npcNames=npcs.map(x=>x[0]),placeIds=Object.keys(places);
    const stateFor=P=>{if(!gateState.has(P.id))gateState.set(P.id,{active:new Set(),lastExit:new Map()});return gateState.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(P,retrieved){const st=stateFor(P),prev=new Set(st.active),now=new Set();for(const {id,ep} of retrieved){const d=direct(P,ep);let admitted=false;if(prev.has(id))admitted=d;else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}if(admitted)now.add(id)}for(const id of prev)if(!now.has(id))st.lastExit.set(id,E.tick);st.active=now;return [...now]}
    function evalRows(P,ids){const F=P.relationField,L=F?.latent;if(!L)return copy(evalP(S,P,1));const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;try{out=copy(evalP(S,P,1))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}return out}
    const normHist=(arr,labels,keyfn)=>{const o=Object.fromEntries(labels.map(x=>[x,0]));for(const x of arr){const k=keyfn(x);if(k in o)o[k]++}const z=Math.max(1,arr.length);return labels.map(k=>o[k]/z)};
    function structural(P,ids){const F=P.relationField,L=F?.latent,recent=P.relationHistory.slice(-18),activeKeys=[...(F?.active||[])].sort();const last=P.choiceHistory.at(-1);return{tick:E.tick,party:P.id,here:I.currentPlace(P),target:P.target,danger:S.danger,disc:P.disc.size,routes:P.routes.size,seenNPC:P.seenNPC.size,relationHistory:P.relationHistory.length,episodes:F?.episodes?.length||0,latentCount:L?.byId?.size||0,eligibleCount:ids.length,activeKeyCount:activeKeys.length,activeKeys,hiddenCandidates:P.hiddenCandidates.size,decisionIndex:P.choiceHistory.length,decisionGap:last?E.tick-last.t:0,visits:placeIds.map(id=>P.vis[id]||0),recentNpc:normHist(recent,npcNames,e=>e.npc),recentPlace:normHist(recent,placeIds,e=>e.place)}};
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis'){const L=P.relationField?.latent;let ids=[],choiceDiff=false,decisionDiff=false;if(L&&L.byId?.size){ids=completedIds(P,I.candidates(S,P));const noRows=evalRows(P,[]),yesRows=evalRows(P,ids),a=sig(yesRows),b=sig(noRows);choiceDiff=a.choice!==b.choice;decisionDiff=changedSig(a,b)}const r=structural(P,ids);r.choiceDiff=choiceDiff;r.decisionDiff=decisionDiff;records.push(r)}baseChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}choose=baseChoose;

    records.forEach((r,i)=>r._id=i);
    const byParty={};for(const r of records)(byParty[r.party]??=[]).push(r);for(const rs of Object.values(byParty))rs.forEach((r,i)=>r._partyIndex=i);
    const scalarKeys=['disc','routes','seenNPC','relationHistory','episodes','latentCount','eligibleCount','activeKeyCount','hiddenCandidates','decisionIndex','decisionGap','tick'];
    const flat=(r)=>[...scalarKeys.map(k=>r[k]),...r.visits,...r.recentNpc,...r.recentPlace];
    const X=records.map(flat),D=X[0].length;
    const means=Array(D).fill(0),sds=Array(D).fill(0),mins=Array(D).fill(Infinity),maxs=Array(D).fill(-Infinity);
    for(const x of X)for(let j=0;j<D;j++){means[j]+=x[j];mins[j]=Math.min(mins[j],x[j]);maxs[j]=Math.max(maxs[j],x[j])}for(let j=0;j<D;j++)means[j]/=X.length;for(const x of X)for(let j=0;j<D;j++)sds[j]+=(x[j]-means[j])**2;for(let j=0;j<D;j++)sds[j]=Math.sqrt(sds[j]/Math.max(1,X.length-1))||1;
    const rankVec=Array(records.length);for(let i=0;i<records.length;i++)rankVec[i]=Array(D).fill(0);for(let j=0;j<D;j++){const a=records.map((_,i)=>i).sort((u,v)=>X[u][j]-X[v][j]||u-v);let p=0;while(p<a.length){let q=p+1;while(q<a.length&&X[a[q]][j]===X[a[p]][j])q++;const rank=(p+q-1)/2/Math.max(1,a.length-1);for(let z=p;z<q;z++)rankVec[a[z]][j]=rank;p=q}}
    const jaccard=(a,b)=>{const A=new Set(a),B=new Set(b),u=new Set([...A,...B]);if(!u.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;return 1-inter/u.size};
    const rangeL1=(a,b)=>{const xa=X[a._id],xb=X[b._id];let s=0;for(let j=0;j<D;j++)s+=Math.abs(xa[j]-xb[j])/Math.max(1e-9,maxs[j]-mins[j]);return s/D+jaccard(a.activeKeys,b.activeKeys)};
    const zL2=(a,b)=>{const xa=X[a._id],xb=X[b._id];let s=0;for(let j=0;j<D;j++)s+=((xa[j]-xb[j])/sds[j])**2;return Math.sqrt(s/D)+jaccard(a.activeKeys,b.activeKeys)};
    const rankL1=(a,b)=>{const xa=rankVec[a._id],xb=rankVec[b._id];let s=0;for(let j=0;j<D;j++)s+=Math.abs(xa[j]-xb[j]);return s/D+jaccard(a.activeKeys,b.activeKeys)};
    const pos=records.filter(r=>r.choiceDiff),neg=records.filter(r=>!r.choiceDiff);
    const candidates=p=>neg.filter(n=>n.party===p.party&&n.here===p.here&&n.target===p.target);
    const scarcity=[...pos].sort((a,b)=>candidates(a).length-candidates(b).length||a.tick-b.tick);
    function seqMatch(dist,order=scarcity,replace=false){const used=new Set(),pairs=[];for(const p of order){let best=null;for(const n of candidates(p)){if(!replace&&used.has(n._id))continue;const d=dist(p,n);if(!best||d<best.d)best={n,d}}if(best){if(!replace)used.add(best.n._id);pairs.push({p,c:best.n,distance:best.d})}}return pairs}
    function globalGreedy(dist){const edges=[];for(const p of pos)for(const n of candidates(p))edges.push({p,n,d:dist(p,n)});edges.sort((a,b)=>a.d-b.d||a.p.tick-b.p.tick||a.n.tick-b.n.tick);const up=new Set(),un=new Set(),pairs=[];for(const e of edges)if(!up.has(e.p._id)&&!un.has(e.n._id)){up.add(e.p._id);un.add(e.n._id);pairs.push({p:e.p,c:e.n,distance:e.d});if(up.size===pos.length)break}return pairs}
    const specs={rangeL1:seqMatch(rangeL1),zL2:seqMatch(zL2),rankL1:seqMatch(rankL1),rangeL1WithReplacement:seqMatch(rangeL1,scarcity,true),rangeL1GlobalGreedy:globalGreedy(rangeL1)};
    const mean=xs=>xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0};
    const offset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1))));
    function smd(a,b){const ma=mean(a),mb=mean(b),va=mean(a.map(x=>(x-ma)**2)),vb=mean(b.map(x=>(x-mb)**2)),sd=Math.sqrt((va+vb)/2);return sd>1e-12?(ma-mb)/sd:0}
    function summarize(name,pairs){const diffs=pairs.map(x=>x.p.danger-x.c.danger),obs=mean(diffs),nulls=[];for(let k=1;k<=SURROGATE_COUNT;k++){const ds=[];for(const x of pairs){const rp=byParty[x.p.party],rc=byParty[x.c.party],dp=rp[(x.p._partyIndex+offset(rp.length,k))%rp.length].danger,dc=rc[(x.c._partyIndex+offset(rc.length,k))%rc.length].danger;ds.push(dp-dc)}nulls.push(mean(ds))}const ns=[...nulls].sort((a,b)=>a-b),exceed=ns.filter(x=>x>=obs).length;const smds=[];for(let j=0;j<D;j++){smds.push(Math.abs(smd(pairs.map(x=>X[x.p._id][j]),pairs.map(x=>X[x.c._id][j]))))}smds.sort((a,b)=>a-b);return{name,pairs:pairs.length,uniqueControls:new Set(pairs.map(x=>x.c._id)).size,meanDistance:mean(pairs.map(x=>x.distance)),maxAbsSMD:Math.max(...smds),medianAbsSMD:median(smds),smdOver01:smds.filter(x=>x>0.1).length,activeKeyJaccardMean:mean(pairs.map(x=>jaccard(x.p.activeKeys,x.c.activeKeys))),observedMeanDangerDifference:obs,observedMedianDangerDifference:median(diffs),positiveHigherFraction:pairs.filter(x=>x.p.danger>x.c.danger).length/Math.max(1,pairs.length),nullMedian:ns[Math.floor(ns.length/2)],nullP95:ns[Math.floor(.95*(ns.length-1))],nullMax:Math.max(...ns),exceed,empiricalP:(exceed+1)/(SURROGATE_COUNT+1)}}
    const summaries=Object.fromEntries(Object.entries(specs).map(([k,p])=>[k,summarize(k,p)]));
    const allMatched=Object.values(summaries).every(s=>s.pairs===pos.length);
    const signConsistent=Object.values(summaries).every(s=>s.observedMeanDangerDifference>0);
    const allPBelow05=Object.values(summaries).every(s=>s.empiricalP<.05);
    const summary={maxTick:MAX_TICK,records:records.length,choiceDiffs:pos.length,decisionDiffs:records.filter(r=>r.decisionDiff).length,allMatched,signConsistent,allPBelow05,specs:summaries,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};
    E=savedE;delete globalThis.__OASIS_SHADOW_INTERNALS;return summary;
  },{MAX_TICK,SURROGATE_COUNT});
  if(result.records!==1997||result.choiceDiffs!==164||result.decisionDiffs!==197)throw new Error(`120k canonical mismatch ${JSON.stringify({records:result.records,choiceDiffs:result.choiceDiffs,decisionDiffs:result.decisionDiffs})}`);
  if(!result.allMatched)throw new Error('at least one sensitivity matching specification failed to match all positive events');
  const report={design:{purpose:'test whether the 120k residual danger association depends on one arbitrary structural matching distance or matching algorithm',worldPolicy:'same production trajectory; danger never used in matching',exactStrata:'same party + same current place + same current target required for every pair',specifications:{rangeL1:'range-normalized L1 plus active-key Jaccard; no replacement',zL2:'standardized Euclidean plus active-key Jaccard; no replacement',rankL1:'empirical-rank L1 plus active-key Jaccard; no replacement',rangeL1WithReplacement:'range-L1 nearest neighbor with control reuse',rangeL1GlobalGreedy:'global distance-sorted greedy one-to-one assignment'},balanceDiagnostics:'max/median absolute standardized mean difference across expanded structural covariates plus active-key Jaccard',null:'127 within-party circular shifts of danger after pairs are frozen',causalClaim:false,candidatePolicy:false},...result};
  console.log('O3-DANGER-MATCHING-SENSITIVITY-120K '+JSON.stringify(report));await writeFile(REPORT,JSON.stringify(report,null,2));await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
