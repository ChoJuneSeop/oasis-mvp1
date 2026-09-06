import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4203, MAX_TICK=30000, SURROGATE_COUNT=127;
const REPORT='o3-danger-path-deconfounding-report.json';
const PHASES=[0.25,0.50,0.75];
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600); browser=await chromium.launch({headless:true});
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch(); let src=await response.text();

    const oldDecl="const rfOldMkP=mkP, rfOldMkW=mkW, rfOldOutcome=outcome, rfOldParticipants=participants, rfOldMemberRank=memberRank, rfOldHiddenReady=hiddenReady, rfOldChoose=choose, rfOldRender=render;";
    const newDecl=oldDecl+"\nfunction __oasisDecisionDanger(S){const x=globalThis.__OASIS_DECISION_DANGER_OVERRIDE;return Number.isFinite(x)?x:S.danger}\nfunction __oasisDecisionState(S){const d=__oasisDecisionDanger(S);return d===S.danger?S:{...S,danger:d}}\nfunction __oasisRetrievalDanger(S){const x=globalThis.__OASIS_RETRIEVAL_DANGER_OVERRIDE;return Number.isFinite(x)?x:S.danger}";
    if(!src.includes(oldDecl))throw new Error('relation-field declaration target missing'); src=src.replace(oldDecl,newDecl);

    const reps=[
      ["for(const id of ep.places)if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push(`danger:${id}`);","for(const id of ep.places)if(Math.abs((places[id]?.r||0)-__oasisRetrievalDanger(S))<=0.18)reasons.push(`danger:${id}`);"],
      ["const center=Math.round(S.danger*100);","const center=Math.round(__oasisRetrievalDanger(S)*100);"],
      ["const L=ensureLatent(P),cacheKey=`${E.tick}|${currentPlace(P)}|${P.target}|${Math.round(S.danger*1000)}|${L.byId.size}`;","const L=ensureLatent(P),cacheKey=`${E.tick}|${currentPlace(P)}|${P.target}|${Math.round(__oasisRetrievalDanger(S)*1000)}|${L.byId.size}`;"],
      ["if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldParticipants(S,P,useRel);","if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldParticipants(__oasisDecisionState(S),P,useRel);"],
      ["const set=rfOldParticipants(S,P,0);","const set=rfOldParticipants(__oasisDecisionState(S),P,0);"],
      ["if(S.danger>=0.38){set.add('전사');set.add('치유사')}else set.add('정찰자');","if(__oasisDecisionDanger(S)>=0.38){set.add('전사');set.add('치유사')}else set.add('정찰자');"],
      ["if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(S,P,m,id,useRel);","if(!(useRel&&MODELS[S.key].kind==='oasis'&&MODELS[S.key].rel))return rfOldMemberRank(__oasisDecisionState(S),P,m,id,useRel);"],
      ["const base=rfOldMemberRank(S,P,m,id,0);","const base=rfOldMemberRank(__oasisDecisionState(S),P,m,id,0);"],
    ];
    for(const [a,b] of reps){if(!src.includes(a))throw new Error(`danger-path transform target missing: ${a.slice(0,70)}`);src=src.replace(a,b)}

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

  const result=await page.evaluate(({MAX_TICK,SURROGATE_COUNT,PHASES})=>{
    const savedE=E,I=globalThis.__OASIS_SHADOW_INTERNALS,productionChoose=choose;
    const copy=x=>JSON.parse(JSON.stringify(x));

    // Pass 1: record the canonical danger flow at each actual production decision.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const dangerTape={};
    choose=function(S0,P){if(S0===S)(dangerTape[P.id]??=[]).push(S.danger);productionChoose(S0,P)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=productionChoose;

    // Pass 2: replay the exact canonical world. Only shadow evaluations get phase-shifted danger paths.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const parties=Object.keys(dangerTape),decisionIndex=Object.fromEntries(parties.map(p=>[p,0]));
    const conditions=['canonical',...PHASES.flatMap(f=>[`decisionShift${Math.round(f*100)}`,`retrievalShift${Math.round(f*100)}`,`bothShift${Math.round(f*100)}`])];
    const records=Object.fromEntries(conditions.map(c=>[c,Object.fromEntries(parties.map(p=>[p,[]]))]));
    const gateStates=new Map();
    const stateFor=(key,P)=>{const k=`${key}|${P.id}`;if(!gateStates.has(k))gateStates.set(k,{active:new Set(),lastExit:new Map()});return gateStates.get(k)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    const completedEligible=(P,ep,since)=>{const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if((oldEnds.has(q.a)||oldEnds.has(q.b))&&currentEpisode(P,q))return true}return false};
    function completedIds(key,P,retrieved){const st=stateFor(key,P),prev=new Set(st.active),now=new Set();for(const {id,ep} of retrieved){const d=direct(P,ep);let admitted=false;if(prev.has(id))admitted=d;else if(d){const since=st.lastExit.get(id)??ep.t;admitted=completedEligible(P,ep,since)}if(admitted)now.add(id)}for(const id of prev)if(!now.has(id))st.lastExit.set(id,E.tick);st.active=now;return [...now]}
    function candidates(P,retrievalDanger){if(Number.isFinite(retrievalDanger))globalThis.__OASIS_RETRIEVAL_DANGER_OVERRIDE=retrievalDanger;else delete globalThis.__OASIS_RETRIEVAL_DANGER_OVERRIDE;try{return I.candidates(S,P)}finally{delete globalThis.__OASIS_RETRIEVAL_DANGER_OVERRIDE}}
    function evalRows(P,ids,decisionDanger){const F=P.relationField,L=F?.latent;if(!L)return copy(evalP(S,P,1));const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,audit:[...L.audit],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target,events:[...S.events]};globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};if(Number.isFinite(decisionDanger))globalThis.__OASIS_DECISION_DANGER_OVERRIDE=decisionDanger;let out;try{out=copy(evalP(S,P,1))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;delete globalThis.__OASIS_DECISION_DANGER_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(0,L.audit.length,...saved.audit);S.c.relationFieldActivation=saved.sAct;P.target=saved.target;S.events.splice(0,S.events.length,...saved.events)}return out}
    function label(P,ids,decisionDanger){const noRows=evalRows(P,[],decisionDanger),yesRows=evalRows(P,ids,decisionDanger),a=sig(yesRows),b=sig(noRows);return{choiceDiff:a.choice!==b.choice,decisionDiff:changedSig(a,b)}}
    const phaseValue=(p,idx,f)=>{const a=dangerTape[p],N=a.length,off=Math.max(1,Math.min(N-1,Math.round(N*f)));return a[(idx+off)%N]};

    choose=function(S0,P){
      if(S0===S&&MODELS[S0.key].kind==='oasis'){
        const idx=decisionIndex[P.id]++,currentDanger=S.danger;
        const canonicalIds=completedIds('canonical',P,candidates(P,null));
        const base=label(P,canonicalIds,null);records.canonical[P.id].push({danger:currentDanger,...base});
        for(const f of PHASES){
          const pct=Math.round(f*100),shifted=phaseValue(P.id,idx,f);
          const dKey=`decisionShift${pct}`,rKey=`retrievalShift${pct}`,bKey=`bothShift${pct}`;
          const dIds=completedIds(dKey,P,candidates(P,null));
          records[dKey][P.id].push({danger:currentDanger,...label(P,dIds,shifted)});
          const rIds=completedIds(rKey,P,candidates(P,shifted));
          records[rKey][P.id].push({danger:currentDanger,...label(P,rIds,null)});
          const bIds=completedIds(bKey,P,candidates(P,shifted));
          records[bKey][P.id].push({danger:currentDanger,...label(P,bIds,shifted)});
        }
      }
      productionChoose(S0,P)
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=productionChoose;

    function auc(rows){const pos=rows.filter(r=>r.choiceDiff),neg=rows.filter(r=>!r.choiceDiff);if(!pos.length||!neg.length)return .5;let win=0,tie=0;for(const p of pos)for(const n of neg){if(p.danger>n.danger)win++;else if(p.danger===n.danger)tie++}return (win+.5*tie)/(pos.length*neg.length)}
    const shiftOffset=(N,k)=>Math.max(1,Math.min(N-1,Math.round(N*k/(SURROGATE_COUNT+1))));
    function stat(cond){const byParty=records[cond],flat=parties.flatMap(p=>byParty[p]),obs=auc(flat),nulls=[];for(let k=1;k<=SURROGATE_COUNT;k++){const shifted=[];for(const p of parties){const rs=byParty[p],N=rs.length,off=shiftOffset(N,k);for(let i=0;i<N;i++)shifted.push({...rs[i],choiceDiff:rs[(i+off)%N].choiceDiff})}nulls.push(auc(shifted))}nulls.sort((a,b)=>a-b);const exceed=nulls.filter(x=>x>=obs).length,p=(exceed+1)/(SURROGATE_COUNT+1);return{records:flat.length,choiceDiffs:flat.filter(r=>r.choiceDiff).length,decisionDiffs:flat.filter(r=>r.decisionDiff).length,auc:obs,positiveMean:flat.filter(r=>r.choiceDiff).reduce((a,r)=>a+r.danger,0)/Math.max(1,flat.filter(r=>r.choiceDiff).length),negativeMean:flat.filter(r=>!r.choiceDiff).reduce((a,r)=>a+r.danger,0)/Math.max(1,flat.filter(r=>!r.choiceDiff).length),nullMedian:nulls[Math.floor(nulls.length/2)],nullP95:nulls[Math.floor(.95*(nulls.length-1))],nullMax:Math.max(...nulls),exceed,empiricalP:p}}
    const stats=Object.fromEntries(conditions.map(c=>[c,stat(c)]));
    const median=a=>{const x=[...a].sort((p,q)=>p-q);return x[Math.floor(x.length/2)]};
    function pathSummary(prefix){const xs=PHASES.map(f=>stats[`${prefix}${Math.round(f*100)}`]);return{aucMedian:median(xs.map(x=>x.auc)),aucMin:Math.min(...xs.map(x=>x.auc)),aucMax:Math.max(...xs.map(x=>x.auc)),choiceDiffMedian:median(xs.map(x=>x.choiceDiffs)),surviveTemporalNull:xs.filter(x=>x.empiricalP<.05/3).length,phaseResults:PHASES.map((f,i)=>({phase:f,...xs[i]}))}}
    const summary={maxTick:MAX_TICK,parties,dangerTapeLengths:Object.fromEntries(parties.map(p=>[p,dangerTape[p].length])),canonical:stats.canonical,paths:{decision:pathSummary('decisionShift'),retrieval:pathSummary('retrievalShift'),both:pathSummary('bothShift')},world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination}};
    E=savedE;delete globalThis.__OASIS_SHADOW_INTERNALS;delete globalThis.__OASIS_DECISION_DANGER_OVERRIDE;delete globalThis.__OASIS_RETRIEVAL_DANGER_OVERRIDE;return summary;
  },{MAX_TICK,SURROGATE_COUNT,PHASES});

  // Exact adapter-equivalence guard against the established 30k canonical discovery result.
  const expected={records:463,choiceDiffs:28,decisionDiffs:33,auc:0.6500821018062397};
  if(result.canonical.records!==expected.records||result.canonical.choiceDiffs!==expected.choiceDiffs||result.canonical.decisionDiffs!==expected.decisionDiffs||Math.abs(result.canonical.auc-expected.auc)>1e-12)throw new Error(`canonical shadow mismatch ${JSON.stringify(result.canonical)}`);
  const report={design:{purpose:'test whether the long-run danger/O3 association is structurally induced by direct danger paths in O3 retrieval and/or decision ranking',worldPolicy:'production world remains canonical; interventions occur only in same-current shadow evaluations',pathCuts:{decision:'replace current danger only inside participant/ranking path with phase-shifted values from the same canonical danger flow',retrieval:'replace current danger only inside latent O3 risk-clue retrieval/relevance with phase-shifted values from the same canonical danger flow',both:'apply both shadow path cuts'},phaseControls:PHASES,null:'127 per-party circular shifts of choice-difference labels for each condition',futureUse:'phase shifts may reference later values but only in offline shadow controls; production choice never sees them',candidatePolicy:false,causalClaim:false},...result};
  console.log('O3-DANGER-PATH-DECONFOUND '+JSON.stringify(report));await writeFile(REPORT,JSON.stringify(report,null,2));await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
