import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4196','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4196/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  await page.evaluate(()=>{
    window.__stage26CoreRefs={
      actionableIds,
      activeEpisodes:OASISRealityFlowTopology.activeEpisodes,
      currentGateAuthority:OASISRelationAuthority.currentGateAuthority,
      participants,
      evalP
    };
  });
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation?.batchedSnapshot);

  const report=await page.evaluate(()=>{
    const sameTickA={relationHistory:[
      {t:100,npc:'alpha',place:'road'},
      {t:100,npc:'beta',place:'road'},
      {t:101,npc:'gamma',place:'camp'}
    ]};
    const sameTickB={relationHistory:[
      {t:100,npc:'beta',place:'road'},
      {t:100,npc:'alpha',place:'road'},
      {t:101,npc:'gamma',place:'camp'}
    ]};
    const acrossTimeA={relationHistory:[
      {t:100,npc:'alpha',place:'road'},
      {t:101,npc:'beta',place:'road'}
    ]};
    const acrossTimeB={relationHistory:[
      {t:100,npc:'beta',place:'road'},
      {t:101,npc:'alpha',place:'road'}
    ]};

    const a=OASISRelationContinuation.batchedSnapshot(sameTickA,100);
    const b=OASISRelationContinuation.batchedSnapshot(sameTickB,100);
    const c=OASISRelationContinuation.batchedSnapshot(acrossTimeA,100);
    const d=OASISRelationContinuation.batchedSnapshot(acrossTimeB,100);
    const legacyA=OASISRelationContinuation.snapshot(sameTickA,100);
    const legacyB=OASISRelationContinuation.snapshot(sameTickB,100);
    const refs=window.__stage26CoreRefs;

    const checks={
      sameTickPermutationInvariant:a.signature===b.signature,
      sameTickFrontierInvariant:JSON.stringify(a.currentRelationalFrontier)===JSON.stringify(b.currentRelationalFrontier),
      acrossDistinctTimesStillOrdered:c.signature!==d.signature,
      batchTimesPreserved:JSON.stringify(a.batches.map(x=>x.t))===JSON.stringify([100,101]),
      sameTickBatchContainsBothEvents:a.batches[0].events.length===2&&b.batches[0].events.length===2,
      legacyAliasingStillVisibleForAudit:legacyA.signature!==legacyB.signature,
      legacyObserverFunctionsRetained:typeof OASISRelationContinuation.snapshot==='function'&&typeof OASISRelationContinuation.signature==='function',
      noCoreFunctionReplacement:refs.actionableIds===actionableIds&&refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&refs.participants===participants&&refs.evalP===evalP
    };

    return{
      question:'Can relational continuation be represented at the actual clock resolution: unordered within a tied timestamp, but ordered across distinct timestamps, without changing any authority mechanism?',
      scope:'Observation-only candidate validation. Existing legacy observer functions are retained for audit compatibility; new time-batched functions are tested separately and do not feed authority, actionability, participants, ranking, choice, or outcomes.',
      priorArtBoundary:'Grouping simultaneous/tied events and preserving order across distinct times is established event-stream and temporal-network practice. This stage claims no novelty for batching; it tests only whether the OASIS observation layer can stop inventing order not supported by its clock.',
      english:{
        timeBatch:'동일한 관측시각의 사건들을 내부 선후 없이 하나의 묶음으로 표현한 것',
        permutationInvariant:'동일시각 사건의 저장 배열순서를 바꿔도 관측 표현이 변하지 않는 성질',
        relationalFrontier:'현재 시각해상도에서 가장 최근에 관측된 관계사건 묶음; 단일 endpoint를 강제하지 않음'
      },
      arms:{sameTickAlphaBeta:a,sameTickBetaAlpha:b,acrossTimeAlphaBeta:c,acrossTimeBetaAlpha:d},
      checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE26_TIME_BATCHED_RELATIONAL_OBSERVER_SURVIVES_MINIMAL_TEST':'STAGE26_TIME_BATCHED_RELATIONAL_OBSERVER_FAILED',
      nextBoundary:'If this survives, future-information tests should use time-batched continuation and treat the next same-tick relation set as one observed event batch rather than discarding multi-event ticks or inventing within-tick order.'
    };
  });

  report.errors=errors;report.cleanPage=errors.length===0;
  console.log('\nSTAGE 26 — TIME-BATCHED RELATIONAL OBSERVER VALIDATION');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.cleanPage,'no page errors');
  assert(report.interpretation==='STAGE26_TIME_BATCHED_RELATIONAL_OBSERVER_SURVIVES_MINIMAL_TEST','time-batched observer survives without authority leakage');
  await writeFile('reality-flow-time-batched-relational-observer-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
