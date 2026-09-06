import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4197','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

function conditionalEntropy(samples,xKey,yKey){
  const byX=new Map();
  for(const s of samples){
    const x=xKey(s),y=yKey(s);
    if(!byX.has(x))byX.set(x,new Map());
    const m=byX.get(x);m.set(y,(m.get(y)||0)+1);
  }
  const n=samples.length||1;
  let h=0;
  for(const counts of byX.values()){
    const nx=[...counts.values()].reduce((a,b)=>a+b,0);
    let hx=0;
    for(const c of counts.values()){
      const p=c/nx;hx-=p*Math.log2(p);
    }
    h+=(nx/n)*hx;
  }
  return h;
}

function cmi(samples,coarseKey,historyKey){
  if(!samples.length)return 0;
  const h0=conditionalEntropy(samples,coarseKey,s=>s.nextBatch);
  const h1=conditionalEntropy(samples,s=>`${coarseKey(s)}||H=${historyKey(s)}`,s=>s.nextBatch);
  return Math.max(0,h0-h1);
}

function informationSummary(samples,coarseKey,historyKey){
  if(!samples.length)return{samples:0,hNextGivenCoarse:0,hNextGivenCoarseAndHistory:0,cmiBits:0,coarseGroups:0,historyCollisionGroups:0,outcomeVariableGroups:0};
  const h0=conditionalEntropy(samples,coarseKey,s=>s.nextBatch);
  const h1=conditionalEntropy(samples,s=>`${coarseKey(s)}||H=${historyKey(s)}`,s=>s.nextBatch);
  const groups=new Map();
  for(const s of samples){
    const k=coarseKey(s);
    if(!groups.has(k))groups.set(k,{histories:new Set(),next:new Set(),n:0});
    const g=groups.get(k);g.histories.add(historyKey(s));g.next.add(s.nextBatch);g.n++;
  }
  const vals=[...groups.values()];
  return{
    samples:samples.length,
    hNextGivenCoarse:h0,
    hNextGivenCoarseAndHistory:h1,
    cmiBits:Math.max(0,h0-h1),
    coarseGroups:groups.size,
    historyCollisionGroups:vals.filter(g=>g.histories.size>1).length,
    outcomeVariableGroups:vals.filter(g=>g.next.size>1).length,
    informativeMatchedGroups:vals.filter(g=>g.histories.size>1&&g.next.size>1).length
  };
}

function majority(rows){
  const counts=new Map();
  for(const r of rows)counts.set(r.nextBatch,(counts.get(r.nextBatch)||0)+1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;
}

function looSummary(samples,coarseKey,historyKey){
  let commonEvaluable=0,baselineCorrect=0,historyCorrect=0;
  for(let i=0;i<samples.length;i++){
    const s=samples[i],c=coarseKey(s),h=historyKey(s);
    const baseTrain=[],historyTrain=[];
    for(let j=0;j<samples.length;j++){
      if(i===j)continue;
      const r=samples[j];
      if(coarseKey(r)===c){
        baseTrain.push(r);
        if(historyKey(r)===h)historyTrain.push(r);
      }
    }
    if(!baseTrain.length||!historyTrain.length)continue;
    commonEvaluable++;
    if(majority(baseTrain)===s.nextBatch)baselineCorrect++;
    if(majority(historyTrain)===s.nextBatch)historyCorrect++;
  }
  return{
    commonEvaluable,
    baselineAccuracy:commonEvaluable?baselineCorrect/commonEvaluable:null,
    historyAccuracy:commonEvaluable?historyCorrect/commonEvaluable:null,
    delta:commonEvaluable?(historyCorrect-baselineCorrect)/commonEvaluable:null
  };
}

function rng(seed){
  let x=seed>>>0;
  return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296};
}
function shuffle(a,r){
  const out=[...a];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
function permutationReference(samples,coarseKey,historyKey,nPerm=199){
  const observed=cmi(samples,coarseKey,historyKey);
  const grouped=new Map();
  samples.forEach((s,i)=>{const k=coarseKey(s);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i)});
  const nulls=[];
  for(let p=0;p<nPerm;p++){
    const r=rng(0x5eed0000+p);
    const permHistory=samples.map(historyKey);
    for(const idxs of grouped.values()){
      const vals=shuffle(idxs.map(i=>permHistory[i]),r);
      idxs.forEach((idx,j)=>{permHistory[idx]=vals[j]});
    }
    const h0=conditionalEntropy(samples,coarseKey,s=>s.nextBatch);
    const h1=conditionalEntropy(samples,(s,i)=>`${coarseKey(s)}||H=${permHistory[i]}`,s=>s.nextBatch);
    // conditionalEntropy does not expose index; compute permuted joint directly below.
    const pseudo=samples.map((s,i)=>({...s,__permHistory:permHistory[i]}));
    const hp=conditionalEntropy(pseudo,s=>`${coarseKey(s)}||H=${s.__permHistory}`,s=>s.nextBatch);
    nulls.push(Math.max(0,h0-hp));
  }
  const mean=nulls.reduce((a,b)=>a+b,0)/(nulls.length||1);
  const ge=nulls.filter(x=>x>=observed-1e-12).length;
  return{
    permutations:nPerm,
    observedCmiBits:observed,
    nullMeanCmiBits:mean,
    observedMinusNullMean:observed-mean,
    referenceTailFraction:(ge+1)/(nPerm+1),
    warning:'Within-coarse permutation is a finite-sample sensitivity reference only; temporally dependent live samples are not assumed IID, so this is not used as a formal significance test.'
  };
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4197/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  await page.evaluate(()=>{
    window.__stage27CoreRefs={
      actionableIds,
      activeEpisodes:OASISRealityFlowTopology.activeEpisodes,
      currentGateAuthority:OASISRelationAuthority.currentGateAuthority,
      participants,
      evalP,
      tickW
    };
  });
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.addScriptTag({path:path.resolve('reality-flow-observation-anchor.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation?.batchedSnapshot&&!!window.OASISFlowObservationAnchor);

  const live=await page.evaluate(()=>{
    reset();E.paused=true;
    const S=E.worlds.full;
    const horizon=14400;
    const samples=[];
    let relationEvents=0,relationBatches=0,noDepartureBatches=0,multiEventBatches=0,multiTimestampAppendSteps=0;

    const token=e=>`${e.npc}@${e.place}`;
    const batchToken=events=>`[${[...events].sort((a,b)=>a.npc.localeCompare(b.npc)||a.place.localeCompare(b.place)).map(token).join('&')}]`;
    function inventorySignature(batches){
      const counts=new Map();
      for(const b of batches)for(const e of b.events){const k=token(e);counts.set(k,(counts.get(k)||0)+1)}
      return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n])=>`${k}#${n}`).join('|');
    }
    function transitionSet(batches){
      const pairs=new Set();
      const bt=batches.map(b=>batchToken(b.events));
      for(let i=1;i<bt.length;i++)pairs.add(`${bt[i-1]}=>${bt[i]}`);
      return [...pairs].sort().join('|');
    }
    function contextFor(P,departure){
      if(!departure)return null;
      const w=OASISRelationContinuation.batchedSnapshot(P,departure.t);
      return{
        departureTick:departure.t,
        topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        frontier:batchToken(w.currentRelationalFrontier),
        unorderedInventory:inventorySignature(w.batches),
        fullHistory:w.signature,
        transitionSet:transitionSet(w.batches),
        batchDepth:w.batches.length
      };
    }
    function latestDeparture(){
      const xs=OASISFlowObservationAnchor.structuralCrossings(S);
      return xs.length?xs[xs.length-1]:null;
    }

    let departure=latestDeparture();
    let contexts=new Map(S.parties.map(P=>[P.id,contextFor(P,departure)]));
    let lastIndex=new Map(S.parties.map(P=>[P.id,(P.relationHistory||[]).length]));

    for(let step=0;step<horizon;step++){
      const beforeContexts=new Map(contexts);
      const beforeIndex=new Map(lastIndex);
      E.tick++;const e=env(E.tick);tickW(S,e);

      for(const P of S.parties){
        const from=beforeIndex.get(P.id)||0;
        const newEvents=(P.relationHistory||[]).slice(from).map(x=>({t:x.t,npc:x.npc,place:x.place}));
        lastIndex.set(P.id,(P.relationHistory||[]).length);
        if(!newEvents.length)continue;
        relationEvents+=newEvents.length;
        const byTime=new Map();
        for(const x of newEvents){if(!byTime.has(x.t))byTime.set(x.t,[]);byTime.get(x.t).push(x)}
        if(byTime.size>1)multiTimestampAppendSteps++;
        for(const [t,events] of [...byTime.entries()].sort((a,b)=>a[0]-b[0])){
          relationBatches++;
          if(events.length>1)multiEventBatches++;
          const ctx=beforeContexts.get(P.id);
          if(!ctx){noDepartureBatches++;continue}
          samples.push({party:P.id,observedAtTick:E.tick,eventTime:t,...ctx,nextBatch:batchToken(events)});
        }
      }

      departure=latestDeparture();
      contexts=new Map(S.parties.map(P=>[P.id,contextFor(P,departure)]));
    }

    const refs=window.__stage27CoreRefs;
    return{
      horizon,
      samples,
      diagnostics:{
        relationEvents,relationBatches,noDepartureBatches,multiEventBatches,multiTimestampAppendSteps,
        structuralCrossings:OASISFlowObservationAnchor.structuralCrossings(S).length,
        actions:S.c.actions||0,
        noCoreFunctionReplacement:refs.actionableIds===actionableIds&&refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&refs.participants===participants&&refs.evalP===evalP&&refs.tickW===tickW
      }
    };
  });

  const samples=live.samples;
  const coarseFrontier=s=>`${s.topologyKey}||FRONTIER=${s.frontier}`;
  const coarseInventory=s=>`${coarseFrontier(s)}||INVENTORY=${s.unorderedInventory}`;
  const fullHistory=s=>s.fullHistory;
  const transitionSet=s=>s.transitionSet;

  function model(coarseKey,historyKey){
    return{
      information:informationSummary(samples,coarseKey,historyKey),
      leaveOneOut:looSummary(samples,coarseKey,historyKey),
      permutationReference:permutationReference(samples,coarseKey,historyKey)
    };
  }
  const models={
    frontier:{fullHistory:model(coarseFrontier,fullHistory),transitionSet:model(coarseFrontier,transitionSet)},
    frontierPlusInventory:{fullHistory:model(coarseInventory,fullHistory),transitionSet:model(coarseInventory,transitionSet)}
  };
  const all=[models.frontier.fullHistory,models.frontier.transitionSet,models.frontierPlusInventory.fullHistory,models.frontierPlusInventory.transitionSet];
  const matched=all.filter(m=>m.information.informativeMatchedGroups>0);
  const replicated=all.filter(m=>m.leaveOneOut.commonEvaluable>0);
  const descriptiveGain=all.filter(m=>m.leaveOneOut.delta!=null&&m.leaveOneOut.delta>0&&m.permutationReference.observedMinusNullMean>0);

  const checks={
    cleanPage:errors.length===0,
    liveActionsOccurred:live.diagnostics.actions>0,
    relationBatchesObserved:live.diagnostics.relationBatches>0,
    simultaneousBatchesIncluded:live.diagnostics.multiEventBatches>0,
    flowDerivedDepartureObserved:live.diagnostics.structuralCrossings>0,
    analyzableSamplesExist:samples.length>0,
    noCoreFunctionReplacement:live.diagnostics.noCoreFunctionReplacement
  };

  let interpretation;
  if(!Object.values(checks).every(Boolean))interpretation='STAGE27_DIAGNOSTIC_CONTROL_FAILURE';
  else if(!matched.length)interpretation='STAGE27_UNDERPOWERED_NO_MATCHED_HISTORY_OUTCOME_VARIATION';
  else if(!replicated.length)interpretation='STAGE27_MATCHED_VARIATION_EXISTS_BUT_HISTORY_PATTERNS_DO_NOT_REPEAT';
  else if(descriptiveGain.length)interpretation='STAGE27_BATCHED_RELATIONAL_HISTORY_SHOWS_DESCRIPTIVE_ADDITIONAL_NEXT_BATCH_INFORMATION';
  else interpretation='STAGE27_NO_REPLICATED_ADDITIONAL_NEXT_BATCH_INFORMATION_OBSERVED';

  const report={
    question:'After correcting same-tick order aliasing, does the time-batched relational process carry additional information about the next realized relation batch beyond the current scalar topology and current relational frontier?',
    scope:'Observation-only future-information diagnostic on the live full OASIS world. Same-tick relation events are represented as one unordered target batch. No authority, actionability, participant, ranking, choice, outcome, or environment rule is changed. The 14400-tick horizon is only a computational observation budget, not a semantic threshold.',
    priorArtBoundary:'Temporal event-set prediction, relational-event history models, transition features, entropy, and conditional mutual information are established prior art. This stage makes no novelty claim for these mathematical tools; it tests whether the repaired OASIS observation representation contains future-relevant information in the present implementation.',
    mathematicalModel:{
      cmi:'I(History; NextBatch | CoarsePresent) = H(NextBatch | CoarsePresent) - H(NextBatch | CoarsePresent, History)',
      korean:'현재 scalar topology와 최신 관계 frontier를 동일하게 본 조건에서, 그 이전 관계과정의 순서를 알면 다음 관계사건 묶음의 불확실성이 추가로 감소하는지 측정한다.',
      transitionSet:'Transition set = 구조적 departure 이후 인접한 관계배치 사이에서 실제 관측된 방향성 전이들의 집합. 고정 길이 window를 사용하지 않는다.',
      permutationReference:'같은 coarse 상태 내부에서 history 표지만 섞어 관측 CMI가 희소 표본 자체로 생기는 정도와 비교하는 민감도 기준. 시간표본의 IID를 가정하지 않으므로 공식 유의성 검정으로 사용하지 않는다.',
      leaveOneOut:'동일 coarse + 동일 history 표현이 과거에도 반복된 경우에만 하나를 제외하고 다음 batch를 예측하여 재현성을 확인한다.',
      warning:'정보성은 인과성, Application Authority, Verification Authority, Execution Authority를 의미하지 않는다.'
    },
    controls:{
      horizonTicks:live.horizon,
      timeBatchedObservation:true,
      simultaneousEventsDiscarded:false,
      fixedSemanticThreshold:false,
      fixedHistoryWindow:false,
      newAuthorityRule:false,
      newOutcomeRule:false,
      futureLabelInjected:false,
      samplesUseOnlyPreBatchContext:true
    },
    diagnostics:live.diagnostics,
    sampleCount:samples.length,
    models,
    checks,
    interpretation,
    oasisInterpretation:interpretation==='STAGE27_BATCHED_RELATIONAL_HISTORY_SHOWS_DESCRIPTIVE_ADDITIONAL_NEXT_BATCH_INFORMATION'
      ?'At least one repaired, matched representation shows both repeatable leave-one-out gain and more observed CMI than its within-coarse shuffled-history reference. This is descriptive future relevance only. It still does not justify execution authority; the next question would be whether such evidence can qualify for Application Authority revalidation without changing action execution.'
      :interpretation==='STAGE27_NO_REPLICATED_ADDITIONAL_NEXT_BATCH_INFORMATION_OBSERVED'
        ?'Under the repaired observation layer and this live-world scope, no replicated additional next-batch information from relational history was observed beyond the coarse present context. Do not promote relational history into authority. Inspect world simplicity, relational event generation, and whether the tested representation captures the OASIS relation process.'
        :interpretation.includes('UNDERPOWERED')||interpretation.includes('DO_NOT_REPEAT')||interpretation.includes('DO_NOT_REPEAT')
          ?'The repaired observation is valid, but the live data still do not contain enough matched repeated contexts to decide future relevance. Treat this as a sampling/representation limit, not as evidence for or against the theory.'
          :interpretation==='STAGE27_MATCHED_VARIATION_EXISTS_BUT_HISTORY_PATTERNS_DO_NOT_REPEAT'
            ?'Matched current contexts and different outcomes exist, but identical history representations do not repeat enough for out-of-sample evaluation. The result remains underpowered.'
            :'The diagnostic controls failed; no theoretical conclusion is permitted.'
  };

  report.errors=errors;
  console.log('\nSTAGE 27 — TIME-BATCHED RELATIONAL FUTURE-INFORMATION DIAGNOSTIC');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  assert(interpretation!=='STAGE27_DIAGNOSTIC_CONTROL_FAILURE','Stage 27 produces a valid repaired observation-only future-information diagnosis');
  await writeFile('reality-flow-time-batched-future-information-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
