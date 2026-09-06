import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4202, MAX_TICK=30000, SURROGATE_COUNT=127;
const REPORT='o3-responsibility-signal-discovery-report.json';
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
    const copy=x=>JSON.parse(JSON.stringify(x)),gateState=new Map(),records={},lastDanger={};
    const stateFor=P=>{if(!gateState.has(P.id))gateState.set(P.id,{active:new Set(),lastExit:new Map()});return gateState.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(P,retrieved){const st=stateFor(P),prev=new Set(st.active),now=new Set();for(const {id,ep} of retrieved){const d=direct(P,ep);let admitted=false;if(prev.has(id))admitted=d;else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}if(admitted)now.add(id)}for(const id of prev)if(!now.has(id))st.lastExit.set(id,E.tick);st.active=now;return [...now]}
    function evalRows(P,ids){const F=P.relationField,L=F?.latent;if(!L)return copy(evalP(S,P,1));const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;try{out=copy(evalP(S,P,1))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}return out}
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis'){const prev=lastDanger[P.id],delta=prev==null?0:S.danger-prev;lastDanger[P.id]=S.danger;const L=P.relationField?.latent;let choiceDiff=false,decisionDiff=false,margin=0;if(L&&L.byId?.size){const ids=completedIds(P,I.candidates(S,P)),noRows=evalRows(P,[]),yesRows=evalRows(P,ids),a=sig(yesRows),b=sig(noRows);choiceDiff=a.choice!==b.choice;decisionDiff=changedSig(a,b);const top=yesRows[0]?.votes??0,second=yesRows[1]?.votes??top;margin=top-second}(records[P.id]??=[]).push({danger:S.danger,dangerDelta:delta,uncertainty:-margin,choiceDiff,decisionDiff})}baseChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}choose=baseChoose;

    const parties=Object.keys(records),features=['danger','dangerDelta','uncertainty'];
    function auc(rows,feature,labelKey='choiceDiff'){const pos=rows.filter(r=>r[labelKey]),neg=rows.filter(r=>!r[labelKey]);if(!pos.length||!neg.length)return .5;let win=0,tie=0;for(const p of pos)for(const n of neg){if(p[feature]>n[feature])win++;else if(p[feature]===n[feature])tie++}return (win+.5*tie)/(pos.length*neg.length)}
    const flat=parties.flatMap(p=>records[p]),observed=Object.fromEntries(features.map(f=>[f,{auc:auc(flat,f),positiveMean:flat.filter(r=>r.choiceDiff).reduce((a,r)=>a+r[f],0)/Math.max(1,flat.filter(r=>r.choiceDiff).length),negativeMean:flat.filter(r=>!r.choiceDiff).reduce((a,r)=>a+r[f],0)/Math.max(1,flat.filter(r=>!r.choiceDiff).length)}]));
    const shiftOffset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1)))),nulls=Object.fromEntries(features.map(f=>[f,[]])),tuples=[];
    for(let k=1;k<=SURROGATE_COUNT;k++){const shifted=[];const tuple=[];for(const p of parties){const rs=records[p],N=rs.length,off=shiftOffset(N,k);tuple.push(`${p}:${off}`);for(let i=0;i<N;i++)shifted.push({...rs[i],choiceDiff:rs[(i+off)%N].choiceDiff})}tuples.push(tuple.join('|'));for(const f of features)nulls[f].push(auc(shifted,f))}
    const stats={};for(const f of features){const ns=[...nulls[f]].sort((a,b)=>a-b),obs=observed[f].auc,exceed=ns.filter(x=>x>=obs).length,p=(exceed+1)/(SURROGATE_COUNT+1);stats[f]={...observed[f],nullMedian:ns[Math.floor(ns.length/2)],nullP95:ns[Math.floor(.95*(ns.length-1))],nullMax:Math.max(...ns),exceed,empiricalP:p,bonferroniP3:Math.min(1,p*3),survivesThreeSignalCorrection:p*3<.05}}
    const summary={maxTick:MAX_TICK,parties,records:flat.length,choiceDiffs:flat.filter(r=>r.choiceDiff).length,decisionDiffs:flat.filter(r=>r.decisionDiff).length,uniqueOffsetTuples:new Set(tuples).size,signals:stats,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};E=savedE;delete globalThis.__OASIS_SHADOW_INTERNALS;return summary;
  },{MAX_TICK,SURROGATE_COUNT});

  if(result.uniqueOffsetTuples!==SURROGATE_COUNT)throw new Error(`non-unique offsets ${result.uniqueOffsetTuples}/${SURROGATE_COUNT}`);
  if(result.choiceDiffs<=0)throw new Error('no O3 choice-difference labels');
  const survivors=Object.entries(result.signals).filter(([_,s])=>s.survivesThreeSignalCorrection).map(([k])=>k);
  const report={design:{purpose:'discover whether existing current-flow signals can plausibly serve as responsibility-allocation proxies after O3 is fixed',o3Policy:'completed-process O3 fixed; no signal gates reactivation',signals:{danger:'current S.danger level',dangerDelta:'change in S.danger since the same party previous decision',uncertainty:'negative top-two vote margin under completed-process O3; larger means less separation'},primaryStatistic:'AUC for discriminating completed-process O3 choice-difference events',null:'127 per-party circular shifts of the choice-difference label sequence',multipleComparison:'Bonferroni x3 fixed before run',candidatePolicy:false},...result,verdict:{survivors,anySupported:survivors.length>0}};
  console.log('O3-RESPONSIBILITY-SIGNAL-DISCOVERY '+JSON.stringify(report));await writeFile(REPORT,JSON.stringify(report,null,2));await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
