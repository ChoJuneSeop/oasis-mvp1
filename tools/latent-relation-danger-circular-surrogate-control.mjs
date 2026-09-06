import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4200, MAX_TICK=30000, SURROGATE_COUNT=127;
const REPORT_FILE='latent-relation-danger-circular-surrogate-control-report.json';
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
    const response=await route.fetch();let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const replacement="function latentActive(S,P){\n  if(globalThis.__OASIS_SHADOW_OVERRIDE&&globalThis.__OASIS_SHADOW_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_SHADOW_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('latentActive insertion target missing');src=src.replace(head,replacement);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_SHADOW_INTERNALS={ensureLatent,candidates:(S,P)=>latentCandidates(S,P).map(([id,ep])=>({id,ep,reasons:relevantReasons(S,P,ep)})).filter(x=>x.reasons.length),currentPlace};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('internals insertion target missing');src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_SHADOW_INTERNALS&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({MAX_TICK,SURROGATE_COUNT})=>{
    const savedE=E,I=globalThis.__OASIS_SHADOW_INTERNALS,baseChoose=choose;

    // Pass 1: record actual danger-rise sequences and production choices.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const riseSeq={},choiceSeq={},lastDanger={};
    choose=function(S0,P){
      if(S0===S&&MODELS[S0.key].kind==='oasis'){
        (riseSeq[P.id]??=[]).push(lastDanger[P.id]!=null&&S.danger>lastDanger[P.id]);
        lastDanger[P.id]=S.danger;
      }
      baseChoose(S0,P);
      if(S0===S&&MODELS[S0.key].kind==='oasis')(choiceSeq[P.id]??=[]).push(P.target);
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;
    const preCounts=Object.fromEntries(Object.entries(riseSeq).map(([id,a])=>[id,{decisions:a.length,rises:a.filter(Boolean).length}]));

    const surrogateNames=Array.from({length:SURROGATE_COUNT},(_,i)=>`shift${String(i+1).padStart(3,'0')}`);
    const shiftOffset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1))));
    const offsetTuples=surrogateNames.map((_,i)=>Object.entries(riseSeq).map(([id,seq])=>`${id}:${shiftOffset(seq.length,i+1)}`).join('|'));
    const uniqueOffsetTuples=new Set(offsetTuples).size;

    // Pass 2: replay identical production world; all gates are non-interventional shadows.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const names=['exactProvenance','completedProcess','lag0','lag1','lag2','lag3',...surrogateNames];
    const mkStats=()=>({evaluations:0,activeEpisodeSum:0,maxActive:0,entries:0,exits:0,decisionDiffs:0,choiceDiffs:0,leaderDiffs:0,candidateDiffs:0,completedModeEvaluations:0,exactModeEvaluations:0});
    const gateState={};for(const n of names)gateState[n]={byParty:new Map(),stats:mkStats()};
    const replayIndex={};
    const copy=x=>JSON.parse(JSON.stringify(x));
    const stateFor=(name,P)=>{const G=gateState[name];if(!G.byParty.has(P.id))G.byParty.set(P.id,{active:new Set(),lastExit:new Map()});return G.byParty.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    const exactEligible=(P,ep,since)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate,oldEnds=new Set([ep.a,ep.b]),historyByT=new Map(P.relationHistory.map(r=>[r.t,r])),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if(!oldEnds.has(q.a)||oldEnds.has(q.b))continue;const sourceT=q.from?.[1];if(!(sourceT>since))continue;const r=historyByT.get(sourceT);if(!r||r.npc!==q.b)continue;if(r.place===here||r.place===target||(gate&&r.npc===gate))return true}return false};

    function scheduledCompleted(name,P,idx){
      if(name==='completedProcess')return true;
      if(name==='exactProvenance')return false;
      const seq=riseSeq[P.id]||[],N=seq.length;if(!N)return false;
      const lag=name.match(/^lag([0-3])$/);
      if(lag){const k=Number(lag[1]);return idx>=k?!!seq[idx-k]:false}
      const sh=name.match(/^shift(\d{3})$/);
      if(!sh)return false;
      const k=Number(sh[1]),off=shiftOffset(N,k);
      return !!seq[(idx+off)%N];
    }

    function gateIds(name,P,retrieved,idx){
      const st=stateFor(name,P),prev=new Set(st.active),now=new Set(),useCompleted=scheduledCompleted(name,P,idx);
      for(const x of retrieved){
        const {id,ep}=x,d=direct(P,ep);let admitted=false;
        if(prev.has(id))admitted=d;
        else if(d){const since=st.lastExit.get(id)??ep.t;admitted=useCompleted?completedEligible(P,ep,since):exactEligible(P,ep,since)}
        if(admitted)now.add(id);
      }
      const stats=gateState[name].stats;if(useCompleted)stats.completedModeEvaluations++;else stats.exactModeEvaluations++;
      for(const id of now)if(!prev.has(id))stats.entries++;
      for(const id of prev)if(!now.has(id)){stats.exits++;st.lastExit.set(id,E.tick)}
      st.active=now;stats.evaluations++;stats.activeEpisodeSum+=now.size;stats.maxActive=Math.max(stats.maxActive,now.size);return [...now];
    }

    function evalIds(P,ids){
      const F=P.relationField,L=F?.latent;if(!L)return copy(sig(evalP(S,P,1)));
      const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};
      globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;
      try{out=copy(sig(evalP(S,P,1)))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}
      return out;
    }

    function shadow(P,idx){
      const L=P.relationField?.latent;if(!L||!L.byId?.size)return;
      const retrieved=I.candidates(S,P),noLat=evalIds(P,[]);
      for(const name of names){
        const ids=gateIds(name,P,retrieved,idx),out=evalIds(P,ids),st=gateState[name].stats;
        if(changedSig(out,noLat)){st.decisionDiffs++;if(out.choice!==noLat.choice)st.choiceDiffs++;if(out.leader!==noLat.leader)st.leaderDiffs++;if(out.cands!==noLat.cands)st.candidateDiffs++}
      }
    }

    let replayMismatch=0;
    choose=function(S0,P){
      if(S0===S&&MODELS[S0.key].kind==='oasis'){
        const idx=replayIndex[P.id]||0;shadow(P,idx);baseChoose(S0,P);if(choiceSeq[P.id]?.[idx]!==P.target)replayMismatch++;replayIndex[P.id]=idx+1;
      }else baseChoose(S0,P);
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    const gates={};
    for(const [name,g] of Object.entries(gateState)){
      const s={...g.stats};s.meanActive=s.evaluations?s.activeEpisodeSum/s.evaluations:0;s.decisionYield=s.entries?s.decisionDiffs/s.entries:0;s.choiceYield=s.entries?s.choiceDiffs/s.entries:0;gates[name]=s;
    }
    const nullChoiceYields=surrogateNames.map(n=>gates[n].choiceYield).sort((a,b)=>a-b);
    const nullChoiceDiffs=surrogateNames.map(n=>gates[n].choiceDiffs).sort((a,b)=>a-b);
    const quantile=(a,p)=>a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];
    const lag3Yield=gates.lag3.choiceYield;
    const exceedLag3=nullChoiceYields.filter(x=>x>=lag3Yield).length;
    const empiricalP=(exceedLag3+1)/(SURROGATE_COUNT+1);
    const bonferroniP=Math.min(1,empiricalP*4);
    const nullStats={
      count:SURROGATE_COUNT,
      choiceYieldMedian:quantile(nullChoiceYields,.5),
      choiceYieldP90:quantile(nullChoiceYields,.9),
      choiceYieldP95:quantile(nullChoiceYields,.95),
      choiceYieldP99:quantile(nullChoiceYields,.99),
      choiceYieldMax:Math.max(...nullChoiceYields),
      choiceDiffMedian:quantile(nullChoiceDiffs,.5),
      choiceDiffP95:quantile(nullChoiceDiffs,.95),
      choiceDiffMax:Math.max(...nullChoiceDiffs),
      exceedLag3,
      empiricalP,
      bonferroniP,
      lag3Percentile:nullChoiceYields.filter(x=>x<lag3Yield).length/SURROGATE_COUNT
    };
    const summary={preCounts,replayMismatch,uniqueOffsetTuples,gates,null:nullStats,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};
    E=savedE;delete globalThis.__OASIS_SHADOW_INTERNALS;return summary;
  },{MAX_TICK,SURROGATE_COUNT});

  if(result.replayMismatch!==0)throw new Error(`replay mismatch ${result.replayMismatch}`);
  if(result.uniqueOffsetTuples!==SURROGATE_COUNT)throw new Error(`non-unique surrogate offsets ${result.uniqueOffsetTuples}/${SURROGATE_COUNT}`);
  for(const [n,s] of Object.entries(result.gates)){if(s.evaluations<=0||s.entries<=0)throw new Error(`invalid gate ${n}`)}

  const keepNames=['exactProvenance','completedProcess','lag0','lag1','lag2','lag3'];
  const compact=Object.fromEntries(keepNames.map(n=>[n,{entries:result.gates[n].entries,meanActive:result.gates[n].meanActive,decisionDiffs:result.gates[n].decisionDiffs,choiceDiffs:result.gates[n].choiceDiffs,decisionYield:result.gates[n].decisionYield,choiceYield:result.gates[n].choiceYield,completedModeEvaluations:result.gates[n].completedModeEvaluations,exactModeEvaluations:result.gates[n].exactModeEvaluations}]));
  const verdict={
    lag3AboveNullMax:result.gates.lag3.choiceYield>result.null.choiceYieldMax,
    lag3AboveNullP95:result.gates.lag3.choiceYield>result.null.choiceYieldP95,
    empiricalP:result.null.empiricalP,
    bonferroniPForFourExploredLags:result.null.bonferroniP,
    survivesFourLagCorrection:result.null.bonferroniP<0.05
  };
  console.log('CIRCULAR-SURROGATE-127 '+JSON.stringify({preCounts:result.preCounts,replayMismatch:result.replayMismatch,uniqueOffsetTuples:result.uniqueOffsetTuples,gates:compact,null:result.null,verdict}));
  await writeFile(REPORT_FILE,JSON.stringify({design:{purpose:'two-pass 127-member circular time-shift surrogate null control for danger-rise alignment',surrogates:'127 circular shifts; each preserves each party danger-rise sequence frequency/order while breaking alignment with current decision flow',primaryStatistic:'choiceDiffs / latent-entry count (choiceYield), fixed before expansion',multipleComparisonNote:'lag3 was selected after inspecting lag0..lag3, so a conservative x4 Bonferroni correction is reported',candidatePolicy:false,usesFutureOnlyForNullControl:true,maxTick:MAX_TICK},...result,verdict},null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
