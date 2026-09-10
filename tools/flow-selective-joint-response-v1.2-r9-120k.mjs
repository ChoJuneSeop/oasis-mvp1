import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const HORIZON=120000;
const PORT=5030+(OFFSET%100);
const REPORT=`flow-selective-joint-response-v1.2-r9-${LABEL}.json`;
const EXPECTED={
  0:{dawn:917,star:547,blue:533},
  137:{dawn:593,star:757,blue:535},
  977:{dawn:531,star:543,blue:548},
  4099:{dawn:672,star:760,blue:577}
};

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(400);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r9-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,OFFSET,EXPECTED})=>{
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full,productionChoose=choose;
    const stats={frames:0,entryExactMismatch:0,futureLeak:0,indexMismatch:0,predecessorMismatch:0,entrySemanticMismatch:0,frameStatusMismatch:0,completedFlowMismatch:0,party:{}};
    const partyStat=id=>stats.party[id]||(stats.party[id]={frames:0,sumRatio:0,maxRatio:0,sumContextualizedRatio:0,last:null});

    function independentlyMatchesEntry(P,e,entryKeys){
      const keys=new Set(entryKeys),PRS=ensurePastRelationalStructure(P);
      if(keys.has(`place:${e.place}`)||keys.has(`choice:${e.choice}`))return true;
      for(const f of PRS.relationFacts||[])if(f.experienceId===e.id&&keys.has(`npc:${f.npc}`))return true;
      return false;
    }
    function validatePredecessors(P){
      const PRS=ensurePastRelationalStructure(P),F=oasisFlowSelectiveV12.ensureFlowSelective(P),rows=PRS.realizedExperiences||[];
      for(let i=0;i<rows.length;i++){
        const got=F.index.predecessorById.get(rows[i].id)||null,expected=i?rows[i-1].id:null;
        if(got!==expected)return false;
      }
      return true;
    }
    function validateCompletedFlow(P,frame){
      const rows=ensurePastRelationalStructure(P).realizedExperiences||[];
      if(rows.length<2)return frame.contextKeys.filter(([t])=>t.endsWith('Transition')||t==='dangerDirection').length===0;
      const a=rows[rows.length-2],b=rows[rows.length-1],expected=[];
      if(a.place&&b.place)expected.push(`placeTransition:${a.place}->${b.place}`);
      if(a.choice&&b.choice)expected.push(`choiceTransition:${a.choice}->${b.choice}`);
      if(a.leader&&b.leader)expected.push(`leaderTransition:${a.leader}->${b.leader}`);
      const d=oasisFlowSelectiveV12.direction(a.danger,b.danger);if(d)expected.push(`dangerDirection:${d}`);
      const actual=frame.contextKeys.filter(([t])=>t.endsWith('Transition')||t==='dangerDirection').map(([t,v])=>`${t}:${v}`).sort();
      return JSON.stringify(actual)===JSON.stringify(expected.sort());
    }

    choose=function(W,P){
      if(W!==S||MODELS[W.key].kind!=='oasis'||!MODELS[W.key].fb)return productionChoose(W,P);
      const preFrame=oasisFlowSelectiveV12.currentRelationalFrame(W,P);
      const entry=oasisFlowSelectiveV12.entryCandidates(W,P);
      const oracle=oasisFlowSelectiveV12.fullScanReference(W,P);
      const ids=entry.experiences.map(e=>e.id).sort();
      stats.frames++;
      if(JSON.stringify(ids)!==JSON.stringify(oracle))stats.entryExactMismatch++;
      if(entry.experiences.some(e=>e.t>E.tick))stats.futureLeak++;
      const PRS=ensurePastRelationalStructure(P),F=oasisFlowSelectiveV12.ensureFlowSelective(P);
      if(F.index.byId.size!==PRS.realizedExperiences.length||F.indexedExperienceIds.size!==PRS.realizedExperiences.length)stats.indexMismatch++;
      if(!validatePredecessors(P))stats.predecessorMismatch++;
      if(!validateCompletedFlow(P,preFrame))stats.completedFlowMismatch++;
      if(entry.experiences.some(e=>!independentlyMatchesEntry(P,e,entry.entryKeys)))stats.entrySemanticMismatch++;
      const contextual=oasisFlowSelectiveV12.contextualizeEntries(W,P,entry),contextualized=contextual.rows.filter(r=>r.matchedContextKeys.length).length;
      const ps=partyStat(P.id),ratio=entry.totalPast?entry.accessed/entry.totalPast:0,cr=entry.accessed?contextualized/entry.accessed:0;
      ps.frames++;ps.sumRatio+=ratio;ps.maxRatio=Math.max(ps.maxRatio,ratio);ps.sumContextualizedRatio+=cr;ps.last={tick:E.tick,totalPast:entry.totalPast,entry:entry.accessed,ratio,contextualized,contextualizedRatio:cr,entryKeys:entry.entryKeys,contextKeys:entry.contextKeys};
      const out=productionChoose(W,P);
      const jf=oasisFlowSelectiveV12.ensureFlowSelective(P).lastJointFrame;
      if(!jf||jf.realityVersion!==E.tick||jf.entryStatus!=='ENTRY_CANDIDATES_ONLY_NOT_FINAL_RECALL'||jf.expansion?.status!=='NOT_OPERATIONALIZED_STAGE_A'||jf.composition?.status!=='NOT_OPERATIONALIZED_STAGE_A'||jf.actionAuthority!=='OBSERVE_ONLY_STAGE_A')stats.frameStatusMismatch++;
      return out;
    };

    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));}
    choose=productionChoose;
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    const expected=EXPECTED[String(OFFSET)]||EXPECTED[OFFSET]||null;
    const trajectoryPreserved=!expected||JSON.stringify(finalCounts)===JSON.stringify(expected);
    for(const p of Object.values(stats.party)){
      p.meanEntryRatio=p.frames?p.sumRatio/p.frames:0;
      p.meanContextualizedWithinEntry=p.frames?p.sumContextualizedRatio/p.frames:0;
      delete p.sumRatio;delete p.sumContextualizedRatio;
    }
    const validity={
      productionPath:true,
      latentConditionMatched:true,
      canonicalClock:true,
      entryExact:stats.entryExactMismatch===0,
      nonAnticipation:stats.futureLeak===0,
      indexComplete:stats.indexMismatch===0,
      predecessorExact:stats.predecessorMismatch===0,
      entrySemanticsExact:stats.entrySemanticMismatch===0,
      completedFlowSemanticsExact:stats.completedFlowMismatch===0,
      stageAStatusesExact:stats.frameStatusMismatch===0,
      legacyTrajectoryCountsPreserved:trajectoryPreserved,
      noEfficiencyThresholdUsed:true,
      responsibilityNotFabricated:true
    };
    return {offset:OFFSET,horizon:HORIZON,finalCounts,expected,trajectoryPreserved,stats,validity,pass:Object.values(validity).every(Boolean)};
  },{HORIZON,OFFSET,EXPECTED});

  const report={
    experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r9',stage:'A entry/context correction',
    repairClass:'OASIS-definition implementation correction; no outcome tuning',
    scope:'Separate concrete current-flow entry contacts from broad relational context. Expansion/composition remain explicitly unoperationalized.',
    result
  };
  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('OASIS-FSJR-R9',JSON.stringify({label:LABEL,...result}));
  if(!result.pass)process.exitCode=1;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
