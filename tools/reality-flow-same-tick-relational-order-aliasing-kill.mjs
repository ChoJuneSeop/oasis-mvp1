import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4195','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4195/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation);

  const report=await page.evaluate(()=>{
    const A={relationHistory:[
      {t:99,npc:'prior',place:'road'},
      {t:100,npc:'alpha',place:'road'},
      {t:100,npc:'beta',place:'road'}
    ]};
    const B={relationHistory:[
      {t:99,npc:'prior',place:'road'},
      {t:100,npc:'beta',place:'road'},
      {t:100,npc:'alpha',place:'road'}
    ]};

    const a=OASISRelationContinuation.snapshot(A,100);
    const b=OASISRelationContinuation.snapshot(B,100);
    const eventMultiset=x=>x.events.map(e=>`${e.t}|${e.npc}@${e.place}`).sort();
    const timestampMultiset=x=>x.events.map(e=>e.t).sort((u,v)=>u-v);
    const unorderedSameTick=x=>x.events.filter(e=>e.t===100).map(e=>`${e.npc}@${e.place}`).sort();

    const checks={
      sameTimestampMultiset:JSON.stringify(timestampMultiset(a))===JSON.stringify(timestampMultiset(b)),
      sameTimestampedEventMultiset:JSON.stringify(eventMultiset(a))===JSON.stringify(eventMultiset(b)),
      sameUnorderedSameTickEvents:JSON.stringify(unorderedSameTick(a))===JSON.stringify(unorderedSameTick(b)),
      observerSignatureChangesUnderArrayPermutation:a.signature!==b.signature,
      observerEndpointChangesUnderArrayPermutation:JSON.stringify(a.currentRelationalEndpoint)!==JSON.stringify(b.currentRelationalEndpoint),
      noPhysicalTimeOrderAvailableInsideTie:a.events.every(e=>e.t===100)&&b.events.every(e=>e.t===100)
    };

    return{
      question:'Does the current relation-continuation observer create different relational order witnesses when events with the same observed timestamp are merely permuted in array order?',
      scope:'Observation validity kill only. Two histories contain the identical timestamped event multiset; only the in-memory array order of events tied at the same tick differs. No authority, action, outcome, or world dynamics are involved.',
      priorArtBoundary:'Relational-event methods assume exact or ordinal event order. When timestamps are tied and no finer event order is observed, an implementation must not silently convert storage order into temporal evidence. Handling tied/simultaneous events is not an OASIS novelty claim.',
      english:{
        tiedTimestamp:'동일한 관측 시각을 가진 사건들로, 더 미세한 시간정보가 없다면 사건 간 선후를 관측했다고 말할 수 없음',
        arrayOrderAliasing:'실제 시간정보가 아닌 메모리 배열 순서를 시간적 관계순서로 오인하는 현상',
        simultaneity:'현재 시간해상도에서 동시에 관측되어 내부 선후관계가 식별되지 않는 상태'
      },
      arms:{arrayAlphaBeta:a,arrayBetaAlpha:b},
      checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE25_SAME_TICK_ARRAY_ORDER_ALIASING_CONFIRMED':'STAGE25_SAME_TICK_ARRAY_ORDER_ALIASING_NOT_CONFIRMED',
      oasisInterpretation:'If confirmed, the Stage 21 observer preserves more order than the live clock can justify. The correction should preserve ordering across distinguishable times while representing same-tick relations as an unordered observational batch; it must remain observation-only.'
    };
  });

  report.errors=errors;
  report.cleanPage=errors.length===0;
  console.log('\nSTAGE 25 — SAME-TICK RELATIONAL ORDER ALIASING KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.cleanPage,'no page errors');
  assert(report.interpretation==='STAGE25_SAME_TICK_ARRAY_ORDER_ALIASING_CONFIRMED','same-tick array order is not valid temporal evidence');
  await writeFile('reality-flow-same-tick-relational-order-aliasing-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
