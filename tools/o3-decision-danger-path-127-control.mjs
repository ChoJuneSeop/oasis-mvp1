import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4204, MAX_TICK=30000, SHIFT_COUNT=127;
const REPORT='o3-decision-danger-path-127-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600); browser=await chromium.launch({headless:true});
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch();let src=await response.text();
    const oldDecl="const rfOldMkP=mkP, rfOldMkW=mkW, rfOldOutcome=outcome, rfOldParticipants=participants, rfOldMemberRank=memberRank, rfOldHiddenReady=hiddenReady, rfOldChoose=choose, rfOldRender=render;";
    const newDecl=oldDecl+"\nfunction __oasisDecisionDanger(S){const x=globalThis.__OASIS_DECISION_DANGER_OVERRIDE;return Number.isFinite(x)?x:S.danger}\nfunction __oasisDecisionState(S){const d=__oasisDecisionDanger(S);return d===S.danger?S:{...S,danger:d}}";
    if(!src.includes(oldDecl))throw new Error('relation-field declaration target missing');src=src.replace(oldDecl,newDecl);
    const reps=[
      ["if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldParticipants(S,P,useRel);","if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldParticipants(__oasisDecisionState(S),P,useRel);"],
      ["const set=rfOldParticipants(S,P,0);","const set=rfOldParticipants(__oasisDecisionState(S),P,0);"],
      ["if(S.danger>=0.38){set.add('전사');set.add('치유사')}else set.add('정찰자');","if(__oasisDecisionDanger(S)>=0.38){set.add('전사');set.add('치유사')}else set.add('정찰자');"],
      ["if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(S,P,m,id,useRel);","if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(__oasisDecisionState(S),P,m,id,useRel);"],
      ["const base=rfOldMemberRank(S,P,m,id,0);","const base=rfOldMemberRank(__oasisDecisionState(S),P,m,id,0);"],
    ];
    for(const [a,b] of reps){if(!src.includes(a))throw new Error(`decision-path transform target missing: ${a.slice(0,70)}`);src=src.replace(a,b)}
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

  const result=await page.evaluate(({MAX_TICK,SHIFT_COUNT})=>{
    const savedE=E,I=globalThis.__OASIS_SHADOW_INTERNALS,productionChoose=choose,copy=x=>JSON.parse(JSON.stringify(x));
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const dangerTape={};choose=function(S0,P){if(S0===S)(dangerTape[P.id]??=[]).push(S.danger);productionChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}choose=productionChoose;

    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const parties=Object.keys(dangerTape),decisionIndex=Object.fromEntries(parties.map(p=>[p,0])),gateState=new Map();
    const canonical=Object.fromEntries(parties.map(p=>[p,[]]));
    const shifted=Array.from({length:SHIFT_COUNT},()=>Object.fromEntries(parties.map(p=>[p,[]])));
    const stateFor=P=>{if(!gateState.has(P.id))gateState.set(P.id,{active:new Set(),lastExit:new Map()});return gateState.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(P,retrieved){const st=stateFor(P),prev=new Set(st.active),now=new Set();for(const {id,ep} of retrieved){const d=direct(P,ep);let admitted=false;if(prev.has(id))admitted=d;else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}if(admitted)now.add(id)}for(const id of prev)if(!now.has(id))st.lastExit.set(id,E.tick);st.active=now;return [...now]}
    function evalRows(P,ids,decisionDanger){const F=P.relationField,L=F?.latent;if(!L)return copy(evalP(S,P,1));const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,audit:[...L.audit],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target,events:[...S.events]};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};if(Number.isFinite(decisionDanger))globalThis.__OASIS_DECISION_DANGER_OVERRIDE=decisionDanger;let out;try{out=copy(evalP(S,P,1))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;delete globalThis.__OASIS_DECISION_DANGER_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(0,L.audit.length,...saved.audit);S.c.relationFieldActivation=saved.sAct;P.target=saved.target;S.events.splice(0,S.events.length,...saved.events)}return out}
    function label(P,ids,d){const a=sig(evalRows(P,ids,d)),b=sig(evalRows(P,[],d));return{choiceDiff:a.choice!==b.choice,decisionDiff:changedSig(a,b)}}
    const offset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SHIFT_COUNT+1))));

    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis'){
      const idx=decisionIndex[P.id]++,actual=S.danger,ids=completedIds(P,I.candidates(S,P));
      canonical[P.id].push({danger:actual,pathDanger:actual,...label(P,ids,null)});
      const tape=dangerTape[P.id],N=tape.length;
      for(let k=1;k<=SHIFT_COUNT;k++){const d=tape[(idx+offset(N,k))%N];shifted[k-1][P.id].push({danger:actual,pathDanger:d,...label(P,ids,d)})}
    }productionChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}choose=productionChoose;

    function auc(rows){const pos=rows.filter(r=>r.choiceDiff),neg=rows.filter(r=>!r.choiceDiff);if(!pos.length||!neg.length)return .5;let win=0,tie=0;for(const p of pos)for(const n of neg){if(p.danger>n.danger)win++;else if(p.danger===n.danger)tie++}return(win+.5*tie)/(pos.length*neg.length)}
    function corr(rows){const n=rows.length,mx=rows.reduce((a,r)=>a+r.danger,0)/n,my=rows.reduce((a,r)=>a+r.pathDanger,0)/n;let sxy=0,sx=0,sy=0;for(const r of rows){const x=r.danger-mx,y=r.pathDanger-my;sxy+=x*y;sx+=x*x;sy+=y*y}return sx&&sy?sxy/Math.sqrt(sx*sy):0}
    function stat(byParty){const flat=parties.flatMap(p=>byParty[p]);return{records:flat.length,choiceDiffs:flat.filter(r=>r.choiceDiff).length,decisionDiffs:flat.filter(r=>r.decisionDiff).length,auc:auc(flat),pathDangerCorrelation:corr(flat)}}
    const canon=stat(canonical),surrogates=shifted.map((x,i)=>({k:i+1,...stat(x),offsets:Object.fromEntries(parties.map(p=>[p,offset(dangerTape[p].length,i+1)]))}));
    const a=surrogates.map(x=>x.auc).sort((x,y)=>x-y),c=surrogates.map(x=>x.choiceDiffs).sort((x,y)=>x-y),exceed=surrogates.filter(x=>x.auc>=canon.auc).length,p=(exceed+1)/(SHIFT_COUNT+1);
    const lowCorr=surrogates.filter(x=>Math.abs(x.pathDangerCorrelation)<=0.1),lowA=lowCorr.map(x=>x.auc).sort((x,y)=>x-y);
    const summary={maxTick:MAX_TICK,parties,dangerTapeLengths:Object.fromEntries(parties.map(p=>[p,dangerTape[p].length])),canonical:canon,surrogate:{count:surrogates.length,uniqueOffsetTuples:new Set(surrogates.map(x=>parties.map(p=>`${p}:${x.offsets[p]}`).join('|'))).size,aucMedian:a[Math.floor(a.length/2)],aucP05:a[Math.floor(.05*(a.length-1))],aucP95:a[Math.floor(.95*(a.length-1))],aucMin:a[0],aucMax:a[a.length-1],choiceDiffMedian:c[Math.floor(c.length/2)],choiceDiffMin:c[0],choiceDiffMax:c[c.length-1],exceedCanonicalAuc:exceed,empiricalPathRandomizationP:p,correlationMedian:[...surrogates].sort((x,y)=>x.pathDangerCorrelation-y.pathDangerCorrelation)[Math.floor(surrogates.length/2)].pathDangerCorrelation,lowAbsCorrelationCount:lowCorr.length,lowAbsCorrelationAucMedian:lowA.length?lowA[Math.floor(lowA.length/2)]:null,lowAbsCorrelationAucMax:lowA.length?lowA[lowA.length-1]:null},world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};
    E=savedE;delete globalThis.__OASIS_SHADOW_INTERNALS;delete globalThis.__OASIS_DECISION_DANGER_OVERRIDE;return summary;
  },{MAX_TICK,SHIFT_COUNT});

  const expected={records:463,choiceDiffs:28,decisionDiffs:33,auc:0.6500821018062397};
  if(result.canonical.records!==expected.records||result.canonical.choiceDiffs!==expected.choiceDiffs||result.canonical.decisionDiffs!==expected.decisionDiffs||Math.abs(result.canonical.auc-expected.auc)>1e-12)throw new Error(`canonical mismatch ${JSON.stringify(result.canonical)}`);
  if(result.surrogate.uniqueOffsetTuples!==SHIFT_COUNT)throw new Error(`non-unique shift tuples ${result.surrogate.uniqueOffsetTuples}/${SHIFT_COUNT}`);
  const report={design:{purpose:'target whether current alignment of the danger-to-participant/ranking path explains the observed danger/O3 choice-difference association',worldPolicy:'canonical production trajectory unchanged; only shadow decision-danger path is phase shifted',o3Policy:'completed-process O3 retrieval remains canonical and identical across all 127 controls',surrogate:'127 distribution-preserving circular shifts of each party canonical danger-at-decision tape',primaryStatistic:'canonical danger AUC relative to the 127 path-randomized AUC values',futureUse:'shifted values are offline shadow controls only; production policy never reads them',statisticalCaveat:'circular shifts preserve empirical temporal structure but are not treated as a general causal p-value under possible nonstationarity',candidatePolicy:false},...result};
  console.log('O3-DECISION-DANGER-PATH-127 '+JSON.stringify(report));await writeFile(REPORT,JSON.stringify(report,null,2));await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
