import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4201, MAX_TICK=30000, SURROGATE_COUNT=127;
const REPORT='o3-post-reactivation-verification-allocation-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
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
    const copy=x=>JSON.parse(JSON.stringify(x));
    const gateState=new Map(), records={}, lastDanger={};
    const stateFor=P=>{if(!gateState.has(P.id))gateState.set(P.id,{active:new Set(),lastExit:new Map()});return gateState.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(P,retrieved){
      const st=stateFor(P),prev=new Set(st.active),now=new Set();
      for(const {id,ep} of retrieved){
        const d=direct(P,ep); let admitted=false;
        if(prev.has(id))admitted=d;
        else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}
        if(admitted)now.add(id);
      }
      let entries=0,exits=0;
      for(const id of now)if(!prev.has(id))entries++;
      for(const id of prev)if(!now.has(id)){exits++;st.lastExit.set(id,E.tick)}
      st.active=now; return {ids:[...now],entries,exits};
    }
    function evalIds(P,ids){
      const F=P.relationField,L=F?.latent;if(!L)return copy(sig(evalP(S,P,1)));
      const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};
      globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;
      try{out=copy(sig(evalP(S,P,1)))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}
      return out;
    }
    choose=function(S0,P){
      if(S0===S&&MODELS[S0.key].kind==='oasis'){
        const rise=lastDanger[P.id]!=null&&S.danger>lastDanger[P.id]; lastDanger[P.id]=S.danger;
        const L=P.relationField?.latent;
        if(L&&L.byId?.size){
          const retrieved=I.candidates(S,P),g=completedIds(P,retrieved),noLat=evalIds(P,[]),withO3=evalIds(P,g.ids);
          const rec={tick:E.tick,rise,entries:g.entries,exits:g.exits,active:g.ids.length,decisionDiff:changedSig(withO3,noLat),choiceDiff:withO3.choice!==noLat.choice};
          (records[P.id]??=[]).push(rec);
        }else (records[P.id]??=[]).push({tick:E.tick,rise,entries:0,exits:0,active:0,decisionDiff:false,choiceDiff:false});
      }
      baseChoose(S0,P);
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    const parties=Object.keys(records), total=a=>parties.reduce((z,p)=>z+records[p].filter(a).length,0);
    const audits=total(r=>r.rise), totalChoiceDiff=total(r=>r.choiceDiff), totalDecisionDiff=total(r=>r.decisionDiff);
    const capturedChoice=total(r=>r.rise&&r.choiceDiff), capturedDecision=total(r=>r.rise&&r.decisionDiff);
    const shiftOffset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1))));
    const nullRows=[]; const tuples=[];
    for(let k=1;k<=SURROGATE_COUNT;k++){
      let a=0,c=0,d=0; const tuple=[];
      for(const p of parties){const rs=records[p],N=rs.length,off=shiftOffset(N,k);tuple.push(`${p}:${off}`);for(let i=0;i<N;i++){if(rs[(i+off)%N].rise){a++;if(rs[i].choiceDiff)c++;if(rs[i].decisionDiff)d++;}}}
      tuples.push(tuple.join('|')); nullRows.push({k,audits:a,capturedChoice:c,capturedDecision:d});
    }
    const nullChoice=nullRows.map(x=>x.capturedChoice).sort((a,b)=>a-b),nullDecision=nullRows.map(x=>x.capturedDecision).sort((a,b)=>a-b);
    const q=(a,p)=>a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];
    const exceedChoice=nullChoice.filter(x=>x>=capturedChoice).length,empiricalPChoice=(exceedChoice+1)/(SURROGATE_COUNT+1);
    const exceedDecision=nullDecision.filter(x=>x>=capturedDecision).length,empiricalPDecision=(exceedDecision+1)/(SURROGATE_COUNT+1);
    const summary={
      maxTick:MAX_TICK,parties,uniqueOffsetTuples:new Set(tuples).size,
      o3:{evaluations:parties.reduce((z,p)=>z+records[p].length,0),entries:parties.reduce((z,p)=>z+records[p].reduce((a,r)=>a+r.entries,0),0),exits:parties.reduce((z,p)=>z+records[p].reduce((a,r)=>a+r.exits,0),0),meanActive:parties.reduce((z,p)=>z+records[p].reduce((a,r)=>a+r.active,0),0)/Math.max(1,parties.reduce((z,p)=>z+records[p].length,0)),totalChoiceDiff,totalDecisionDiff},
      audit:{audits,capturedChoice,capturedDecision,choiceCoverage:totalChoiceDiff?capturedChoice/totalChoiceDiff:0,decisionCoverage:totalDecisionDiff?capturedDecision/totalDecisionDiff:0,choicePrecision:audits?capturedChoice/audits:0,decisionPrecision:audits?capturedDecision/audits:0},
      null:{count:SURROGATE_COUNT,auditCountMin:Math.min(...nullRows.map(x=>x.audits)),auditCountMax:Math.max(...nullRows.map(x=>x.audits)),choiceMedian:q(nullChoice,.5),choiceP95:q(nullChoice,.95),choiceMax:Math.max(...nullChoice),exceedChoice,empiricalPChoice,decisionMedian:q(nullDecision,.5),decisionP95:q(nullDecision,.95),decisionMax:Math.max(...nullDecision),exceedDecision,empiricalPDecision},
      world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}
    };
    E=savedE; delete globalThis.__OASIS_SHADOW_INTERNALS; return summary;
  },{MAX_TICK,SURROGATE_COUNT});

  if(result.uniqueOffsetTuples!==SURROGATE_COUNT)throw new Error(`non-unique offsets ${result.uniqueOffsetTuples}/${SURROGATE_COUNT}`);
  if(result.o3.totalChoiceDiff<=0)throw new Error('no completed-process O3 choice-difference events');
  if(result.audit.audits<=0)throw new Error('no danger-rise audit events');
  if(result.null.auditCountMin!==result.audit.audits||result.null.auditCountMax!==result.audit.audits)throw new Error('null audit budget mismatch');
  const verdict={dangerFlowAuditAboveNullP95:result.audit.capturedChoice>result.null.choiceP95,empiricalPChoice:result.null.empiricalPChoice,supportsDangerFlowAsPostReactivationAllocator:result.null.empiricalPChoice<0.05};
  const report={design:{purpose:'separate O3 reactivation from responsibility-like verification allocation',o3Policy:'completed-process relation gate fixed for every decision',auditPolicy:'current danger-rise only; audit does not change reactivation, choice, outcome, or world',null:'127 circular shifts of the same per-party danger-rise sequence; exact audit count preserved',primaryStatistic:'number of completed-process O3 choice-difference events captured under a fixed audit budget',interpretation:'danger rise is only a responsibility-axis proxy because current production has no independent responsibility operator',candidatePolicy:false,usesFutureOnlyForNullControl:true},...result,verdict};
  console.log('O3-POST-REACTIVATION-VERIFY '+JSON.stringify(report));
  await writeFile(REPORT,JSON.stringify(report,null,2));
  await context.close();
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
