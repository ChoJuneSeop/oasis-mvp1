import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';

const PORT=4390+Number(process.env.OFFSET||0)%100;
const HORIZON=120000;
const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const REPORT=`flow-selective-joint-response-v1.2-r3-${LABEL}.json`;
const expected={
  0:{dawn:917,star:547,blue:533},
  137:{dawn:593,star:757,blue:535},
  977:{dawn:531,star:543,blue:548},
  4099:{dawn:672,star:760,blue:577}
}[OFFSET]||null;
const checkpoints=[12000,30000,60000,90000,120000];
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  const source=await readFile('flow-selective-joint-response-v1.2.js','utf8');
  const sourceAudit={noLegacyAgeCutoff:!source.includes('1200'),noLegacyRiskThreshold:!source.includes('0.18')&&!source.includes('.18'),noLegacyTopK:!source.includes('slice(-80)')&&!source.includes('slice(0,80)'),hasFlowTransitions:source.includes('placeTransition')&&source.includes('choiceTransition')&&source.includes('dangerDirection')};
  await sleep(500);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r3-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();
  const result=await page.evaluate(({HORIZON,OFFSET,checkpoints,expected})=>{
    const stable=x=>JSON.stringify(x);E={tick:0,worlds:{full:mkW('full')},paused:true};const S=E.worlds.full;
    let mismatchCount=0,futureLeakCount=0,indexMismatchCount=0,versionMismatchCount=0,missingFlowKeyFrames=0;const snapshots=[];
    function inspect(t){const parties=[];for(const P of S.parties){
      const sel=oasisFlowSelectiveV12.selectiveRecall(S,P),ref=oasisFlowSelectiveV12.fullScanReference(S,P),frame=oasisFlowSelectiveV12.jointInputFrame(S,P),ids=sel.experiences.map(e=>e.id).sort();
      const exact=stable(ids)===stable(ref);if(!exact)mismatchCount++;
      futureLeakCount+=sel.experiences.filter(e=>e.t>t).length;if(frame.realityVersion!==t)versionMismatchCount++;
      const F=oasisFlowSelectiveV12.ensureFlowSelective(P),PRS=ensurePastRelationalStructure(P),indexExact=F.index.byId.size===PRS.realizedExperiences.length&&F.indexedRelationFactKeys.size===PRS.relationFacts.length;if(!indexExact)indexMismatchCount++;
      if(PRS.realizedExperiences.length>1&&sel.flowKeyCount===0)missingFlowKeyFrames++;
      parties.push({party:P.id,totalPast:sel.totalPast,accessed:sel.accessed,accessRatio:sel.totalPast?sel.accessed/sel.totalPast:0,flowKeyCount:sel.flowKeyCount,keyCount:sel.keys.length,selectiveEqualsFullScan:exact,indexExact});
    }snapshots.push({tick:t,parties});}
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));if(checkpoints.includes(t))inspect(t);}
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    const expectedTrajectoryCounts=expected?stable(finalCounts)===stable(expected):null;
    return {finalTick:E.tick,mismatchCount,futureLeakCount,indexMismatchCount,versionMismatchCount,missingFlowKeyFrames,snapshots,finalCounts,expectedTrajectoryCounts,final:S.parties.map(P=>({party:P.id,realizedExperiences:ensurePastRelationalStructure(P).realizedExperiences.length,relationFacts:ensurePastRelationalStructure(P).relationFacts.length,counters:{...oasisFlowSelectiveV12.ensureFlowSelective(P).counters}}))};
  },{HORIZON,OFFSET,checkpoints,expected});
  const validity={canonicalClock:result.finalTick===HORIZON,selectiveExact:result.mismatchCount===0,nonAnticipation:result.futureLeakCount===0,indexComplete:result.indexMismatchCount===0,realityVersionExact:result.versionMismatchCount===0,flowKeysPresent:result.missingFlowKeyFrames===0,legacyTrajectoryCountsPreserved:result.expectedTrajectoryCounts===true,sourceAudit:Object.values(sourceAudit).every(Boolean)};
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r3',stage:'A-longitudinal-regression',label:LABEL,offset:OFFSET,repairClass:'implementation-definition-alignment',sourceAudit,validity,pass:Object.values(validity).every(Boolean),result};
  await writeFile(REPORT,JSON.stringify(report,null,2));console.log('OASIS-FSJR-R3',JSON.stringify({label:LABEL,pass:report.pass,validity,finalCounts:result.finalCounts,snapshots:result.snapshots,final:result.final}));if(!report.pass)process.exitCode=1;
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
