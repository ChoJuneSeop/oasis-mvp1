import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0), LABEL=process.env.LABEL||`offset${OFFSET}`, HORIZON=120000;
const PORT=4690+(OFFSET%100), REPORT=`flow-selective-joint-response-v1.2-r6-${LABEL}.json`;
const expected={0:{dawn:917,star:547,blue:533},137:{dawn:593,star:757,blue:535},977:{dawn:531,star:543,blue:548},4099:{dawn:672,star:760,blue:577}}[OFFSET]||null;
const checkpoints=[12000,30000,60000,90000,120000];
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'}); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let browser;
try{
  const source=await readFile('flow-selective-joint-response-v1.2.js','utf8');
  const sourceAudit={noLegacyAgeCutoff:!source.includes('1200'),noLegacyRiskThreshold:!source.includes('0.18')&&!source.includes('.18'),noLegacyTopK:!source.includes('slice(-80)')&&!source.includes('slice(0,80)'),tracksPreviousExperience:source.includes('previousIndexedExperienceId'),usesCompletedFlowPair:source.includes('completedFlowPair')};
  await sleep(400); browser=await chromium.launch({headless:true}); const page=await browser.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r6-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle'); if((await toggle.textContent())?.includes('일시정지'))await toggle.click();
  const result=await page.evaluate(({HORIZON,OFFSET,checkpoints,expected})=>{
    const stable=x=>JSON.stringify(x); E={tick:0,worlds:{full:mkW('full')},paused:true}; const S=E.worlds.full;
    let selectiveMismatch=0,futureLeak=0,indexMismatch=0,flowSemanticMismatch=0,flowFrames=0; const snapshots=[];
    function expectedFlowKeys(P){
      const PRS=ensurePastRelationalStructure(P),r=PRS.realizedExperiences;if(r.length<2)return [];
      const a=r[r.length-2],b=r[r.length-1],out=[];
      if(a.place&&b.place)out.push(`placeTransition:${a.place}->${b.place}`);
      if(a.choice&&b.choice)out.push(`choiceTransition:${a.choice}->${b.choice}`);
      if(a.leader&&b.leader)out.push(`leaderTransition:${a.leader}->${b.leader}`);
      const d=oasisFlowSelectiveV12.direction(a.danger,b.danger); if(d)out.push(`dangerDirection:${d}`);
      return out.sort();
    }
    function inspect(t){const parties=[]; for(const P of S.parties){
      const sel=oasisFlowSelectiveV12.selectiveRecall(S,P),ref=oasisFlowSelectiveV12.fullScanReference(S,P),ids=sel.experiences.map(e=>e.id).sort();
      if(stable(ids)!==stable(ref))selectiveMismatch++; futureLeak+=sel.experiences.filter(e=>e.t>t).length;
      const F=oasisFlowSelectiveV12.ensureFlowSelective(P),PRS=ensurePastRelationalStructure(P); if(F.index.byId.size!==PRS.realizedExperiences.length||F.indexedRelationFactKeys.size!==PRS.relationFacts.length)indexMismatch++;
      if(PRS.realizedExperiences.length>=2){flowFrames++; const actual=sel.keys.filter(k=>k.startsWith('placeTransition:')||k.startsWith('choiceTransition:')||k.startsWith('leaderTransition:')||k.startsWith('dangerDirection:')).sort(), exp=expectedFlowKeys(P); if(stable(actual)!==stable(exp))flowSemanticMismatch++;}
      parties.push({party:P.id,totalPast:sel.totalPast,accessed:sel.accessed,accessRatio:sel.totalPast?sel.accessed/sel.totalPast:0,flowKeyCount:sel.flowKeyCount});
    } snapshots.push({tick:t,parties});}
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));if(checkpoints.includes(t))inspect(t);}
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    return {finalTick:E.tick,latentStoreEnabled:globalThis.OASIS_LATENT_RELATION_STORE===true,selectiveMismatch,futureLeak,indexMismatch,flowSemanticMismatch,flowFrames,snapshots,finalCounts,expectedTrajectoryCounts:expected?stable(finalCounts)===stable(expected):null};
  },{HORIZON,OFFSET,checkpoints,expected});
  const validity={latentConditionMatched:result.latentStoreEnabled,canonicalClock:result.finalTick===HORIZON,selectiveExact:result.selectiveMismatch===0,nonAnticipation:result.futureLeak===0,indexComplete:result.indexMismatch===0,completedFlowSemanticsExact:result.flowFrames>0&&result.flowSemanticMismatch===0,legacyTrajectoryCountsPreserved:result.expectedTrajectoryCounts===true,sourceAudit:Object.values(sourceAudit).every(Boolean)};
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r6',stage:'A flow-semantics repair',repairClass:'implementation-definition-alignment',label:LABEL,offset:OFFSET,sourceAudit,validity,pass:Object.values(validity).every(Boolean),result};
  await writeFile(REPORT,JSON.stringify(report,null,2)); console.log('OASIS-FSJR-R6',JSON.stringify({label:LABEL,pass:report.pass,validity,finalCounts:result.finalCounts,snapshots:result.snapshots})); if(!report.pass)process.exitCode=1;
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
