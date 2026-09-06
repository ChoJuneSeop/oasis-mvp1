import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4194','--bind','127.0.0.1'],{stdio:'ignore'});
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

function informationSummary(samples,coarseKey,orderKey){
  if(!samples.length)return{samples:0,hNextGivenCoarse:0,hNextGivenCoarseAndOrder:0,cmiBits:0,coarseGroups:0,collisionGroups:0,informativeCollisionGroups:0};
  const hC=conditionalEntropy(samples,coarseKey,s=>s.nextEvent);
  const hCO=conditionalEntropy(samples,s=>`${coarseKey(s)}||ORDER=${orderKey(s)}`,s=>s.nextEvent);
  const groups=new Map();
  for(const s of samples){
    const k=coarseKey(s);
    if(!groups.has(k))groups.set(k,{orders:new Set(),next:new Set(),n:0});
    const g=groups.get(k);g.orders.add(orderKey(s));g.next.add(s.nextEvent);g.n++;
  }
  const collisionGroups=[...groups.values()].filter(g=>g.orders.size>1);
  const informativeCollisionGroups=collisionGroups.filter(g=>g.next.size>1);
  return{
    samples:samples.length,
    hNextGivenCoarse:hC,
    hNextGivenCoarseAndOrder:hCO,
    cmiBits:Math.max(0,hC-hCO),
    coarseGroups:groups.size,
    collisionGroups:collisionGroups.length,
    informativeCollisionGroups:informativeCollisionGroups.length
  };
}

function majority(rows){
  const counts=new Map();
  for(const r of rows)counts.set(r.nextEvent,(counts.get(r.nextEvent)||0)+1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;
}

function looSummary(samples,coarseKey,orderKey){
  let commonEvaluable=0,baselineCorrect=0,orderedCorrect=0;
  for(let i=0;i<samples.length;i++){
    const s=samples[i],c=coarseKey(s),o=orderKey(s);
    const baseTrain=[],orderTrain=[];
    for(let j=0;j<samples.length;j++){
      if(i===j)continue;
      const r=samples[j];
      if(coarseKey(r)===c){
        baseTrain.push(r);
        if(orderKey(r)===o)orderTrain.push(r);
      }
    }
    if(!baseTrain.length||!orderTrain.length)continue;
    commonEvaluable++;
    if(majority(baseTrain)===s.nextEvent)baselineCorrect++;
    if(majority(orderTrain)===s.nextEvent)orderedCorrect++;
  }
  return{
    commonEvaluable,
    baselineAccuracy:commonEvaluable?baselineCorrect/commonEvaluable:null,
    orderedAccuracy:commonEvaluable?orderedCorrect/commonEvaluable:null,
    delta:commonEvaluable?(orderedCorrect-baselineCorrect)/commonEvaluable:null
  };
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4194/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  await page.evaluate(()=>{
    window.__stage24CoreRefs={
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
  await page.waitForFunction(()=>!!window.OASISRelationContinuation&&!!window.OASISFlowObservationAnchor);

  const live=await page.evaluate(()=>{
    reset();E.paused=true;
    const S=E.worlds.full;
    const horizon=7200;
    const samples=[];
    let skippedNoDeparture=0,skippedMultiEventTick=0,totalNewRelationEvents=0,structuralDepartureContexts=0;

    function token(e){return `${e.npc}@${e.place}`}
    function multisetSignature(sequence){
      const counts=new Map();
      for(const e of sequence){const k=token(e);counts.set(k,(counts.get(k)||0)+1)}
      return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n])=>`${k}#${n}`).join('|');
    }
    function contextFor(P,departure){
      if(!departure)return null;
      const witness=OASISRelationContinuation.snapshot(P,departure.t);
      const topologyKey=OASISRealityFlowTopology.currentKeyForParty(S,P);
      const actionable=[...actionableIds(S,P,1)].sort();
      const part=[...participants(S,P,1)].sort();
      return{
        departureTick:departure.t,
        topologyKey,
        unorderedContinuation:multisetSignature(witness.sequence),
        orderedContinuation:witness.signature,
        relationalEndpoint:witness.currentRelationalEndpoint?token(witness.currentRelationalEndpoint):'∅',
        currentPlace:currentPlace(P),
        target:P.target??null,
        actionable,
        participants:part
      };
    }
    function latestDeparture(){
      const xs=OASISFlowObservationAnchor.structuralCrossings(S);
      return xs.length?xs[xs.length-1]:null;
    }

    let departure=latestDeparture();
    let contexts=new Map(S.parties.map(P=>[P.id,contextFor(P,departure)]));
    let lastRelationT=new Map(S.parties.map(P=>[P.id,Math.max(-Infinity,...(P.relationHistory||[]).map(e=>e.t))]));

    for(let i=0;i<horizon;i++){
      const beforeContexts=new Map(contexts);
      const beforeLastT=new Map(lastRelationT);
      E.tick++;const e=env(E.tick);tickW(S,e);

      for(const P of S.parties){
        const priorT=beforeLastT.get(P.id)??-Infinity;
        const newEvents=(P.relationHistory||[]).filter(x=>x.t>priorT).sort((a,b)=>a.t-b.t);
        if(newEvents.length){
          totalNewRelationEvents+=newEvents.length;
          lastRelationT.set(P.id,Math.max(priorT,...newEvents.map(x=>x.t)));
          const ctx=beforeContexts.get(P.id);
          if(!ctx){skippedNoDeparture+=newEvents.length;continue}
          structuralDepartureContexts+=newEvents.length;
          if(newEvents.length!==1){skippedMultiEventTick+=newEvents.length;continue}
          const n=newEvents[0];
          samples.push({
            party:P.id,
            observedAtTick:E.tick,
            ...ctx,
            nextEvent:token(n)
          });
        }
      }

      departure=latestDeparture();
      contexts=new Map(S.parties.map(P=>[P.id,contextFor(P,departure)]));
    }

    const refs=window.__stage24CoreRefs;
    return{
      horizon,
      samples,
      diagnostics:{
        totalNewRelationEvents,
        structuralDepartureContexts,
        skippedNoDeparture,
        skippedMultiEventTick,
        finalTopologyKey:OASISRealityFlowTopology.currentKeyForParty(S,S.parties[0]),
        structuralCrossings:OASISFlowObservationAnchor.structuralCrossings(S).length,
        actions:S.c.actions||0,
        noCoreFunctionReplacement:refs.actionableIds===actionableIds&&refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&refs.participants===participants&&refs.evalP===evalP&&refs.tickW===tickW
      }
    };
  });

  const samples=live.samples;
  const minimalCoarse=s=>`${s.topologyKey}||UNORDERED=${s.unorderedContinuation}`;
  const richCoarse=s=>`${minimalCoarse(s)}||PLACE=${s.currentPlace}||TARGET=${s.target}||ACT=${s.actionable.join(',')}||PART=${s.participants.join(',')}`;
  const fullOrder=s=>s.orderedContinuation;
  const endpoint=s=>s.relationalEndpoint;

  function model(coarseKey){
    return{
      fullOrder:{
        information:informationSummary(samples,coarseKey,fullOrder),
        leaveOneOut:looSummary(samples,coarseKey,fullOrder)
      },
      endpointProjection:{
        information:informationSummary(samples,coarseKey,endpoint),
        leaveOneOut:looSummary(samples,coarseKey,endpoint)
      }
    };
  }

  const models={minimal:model(minimalCoarse),rich:model(richCoarse)};
  const allVariants=[models.minimal.fullOrder,models.minimal.endpointProjection,models.rich.fullOrder,models.rich.endpointProjection];
  const anyCollision=allVariants.some(v=>v.information.collisionGroups>0);
  const anyOutOfSample=allVariants.some(v=>v.leaveOneOut.commonEvaluable>0);
  const anyPositiveOutOfSampleGain=allVariants.some(v=>v.leaveOneOut.delta!=null&&v.leaveOneOut.delta>0);
  const checks={
    cleanPage:errors.length===0,
    liveActionsOccurred:live.diagnostics.actions>0,
    relationEventsObserved:live.diagnostics.totalNewRelationEvents>0,
    flowDerivedDepartureObserved:live.diagnostics.structuralCrossings>0&&live.diagnostics.structuralDepartureContexts>0,
    analyzableSamplesExist:samples.length>0,
    noCoreFunctionReplacement:live.diagnostics.noCoreFunctionReplacement
  };

  let interpretation;
  if(!Object.values(checks).every(Boolean))interpretation='STAGE24_DIAGNOSTIC_CONTROL_FAILURE';
  else if(!anyCollision)interpretation='STAGE24_UNDERPOWERED_NO_MATCHED_COARSE_STATE_ORDER_COLLISIONS';
  else if(!anyOutOfSample)interpretation='STAGE24_ORDER_COLLISIONS_OBSERVED_BUT_NOT_REPEATABLE_OUT_OF_SAMPLE';
  else if(anyPositiveOutOfSampleGain)interpretation='STAGE24_RELATIONAL_ORDER_HAS_OBSERVED_ADDITIONAL_NEXT_EVENT_INFORMATION';
  else interpretation='STAGE24_NO_OUT_OF_SAMPLE_NEXT_EVENT_GAIN_FROM_RELATIONAL_ORDER_OBSERVED';

  const report={
    question:'When scalar flow topology and unordered relational continuation are held as the coarse present context, does post-departure relational order carry additional information about the next realized relation event in the live OASIS flow?',
    scope:'Observation-only future-relevance diagnostic. The live full OASIS world is allowed to evolve normally for a fixed computational observation budget. No authority, actionability, participant, ranking, choice, outcome, or environment rule is changed. A sample is formed only from information available before the next relation event.',
    priorArtBoundary:'Relational-event models, temporal point processes, temporal-network predictability, conditional information measures, and next-event forecasting are established prior art. This stage makes no novelty claim for using event order or information theory; it tests whether the currently observed OASIS relational-continuation witness contains future-relevant information under the present implementation.',
    mathematicalModel:{
      conditionalMutualInformation:'I(Order; Next | Coarse) = H(Next | Coarse) - H(Next | Coarse, Order)',
      korean:'조건부 상호정보량: 거친 현재상태를 동일하게 조건화한 뒤에도 관계 순서를 알 때 다음 관계사건의 불확실성이 추가로 줄어드는지를 비트 단위로 측정한다.',
      leaveOneOut:'Leave-one-out prediction: 각 표본 하나를 제외하고 나머지 동일 문맥 사례만으로 다음 사건을 예측해 순서 정보의 반복 가능한 추가 정보성을 점검한다.',
      warning:'CMI와 예측 정확도는 관측 정보성 지표이며 인과성 또는 실행권을 의미하지 않는다.'
    },
    controls:{
      horizonTicks:live.horizon,
      fixedSemanticThreshold:false,
      newAuthorityRule:false,
      newOutcomeRule:false,
      futureLabelInjected:false,
      samplesUseOnlyPreEventContext:true,
      multiEventSameTickSkipped:true
    },
    diagnostics:live.diagnostics,
    sampleCount:samples.length,
    models,
    checks,
    interpretation,
    oasisInterpretation:interpretation==='STAGE24_RELATIONAL_ORDER_HAS_OBSERVED_ADDITIONAL_NEXT_EVENT_INFORMATION'
      ?'The observation-only relational continuation contains repeatable next-event information in at least one controlled representation. This is still not execution authority. The next stage, if pursued, should test Application Authority eligibility and revalidation without changing action execution.'
      :interpretation==='STAGE24_NO_OUT_OF_SAMPLE_NEXT_EVENT_GAIN_FROM_RELATIONAL_ORDER_OBSERVED'
        ?'Under this live-world scope, relational order was observable but did not improve repeatable next-event prediction beyond the controlled coarse context. Do not promote the witness into authority; inspect world simplicity, relation sparsity, and representation adequacy before redesign.'
        :interpretation.includes('UNDERPOWERED')||interpretation.includes('NOT_REPEATABLE')
          ?'The current live observation budget/representation does not provide enough repeated matched contexts to decide future relevance. This is an underpowered result, not evidence for or against the OASIS hypothesis. Redesign sampling rather than encoding the desired conclusion.'
          :'The diagnostic controls failed; no theoretical conclusion is permitted.'
  };

  report.errors=errors;
  console.log('\nSTAGE 24 — RELATIONAL CONTINUATION FUTURE-INFORMATION DIAGNOSTIC');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  assert(interpretation!=='STAGE24_DIAGNOSTIC_CONTROL_FAILURE','Stage 24 produces a valid observation-only future-information diagnosis');
  await writeFile('reality-flow-relational-continuation-future-information-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
