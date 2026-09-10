import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';

const PORT=4377;
const HORIZON=Number(process.env.HORIZON||12000);
const OFFSET=Number(process.env.OFFSET||0);
const REPORT=process.env.REPORT||'flow-selective-joint-response-v1.2-r1-report.json';
const checkpoints=[500,1000,2000,4000,8000,HORIZON].filter((x,i,a)=>x<=HORIZON&&a.indexOf(x)===i).sort((a,b)=>a-b);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  const source=await readFile('flow-selective-joint-response-v1.2.js','utf8');
  const sourceAudit={
    noLegacyAgeCutoff:!source.includes('1200'),
    noLegacyRiskThreshold:!source.includes('0.18')&&!source.includes('.18'),
    noLegacyTopK:!source.includes('slice(-80)')&&!source.includes('slice(0,80)'),
    noPermanentImportanceScore:!source.includes('importanceScore')&&!source.includes('importance_score')
  };
  await sleep(500);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r1-stageA',null,{timeout:60000});
  const result=await page.evaluate(({HORIZON,OFFSET,checkpoints})=>{
    const stable=x=>JSON.stringify(x);
    const world=E.worlds.full;
    const snapshots=[];
    let mismatchCount=0,futureLeakCount=0,indexMismatchCount=0,observationMutationCount=0;
    function inspect(t){
      const parties=[];
      for(const P of world.parties){
        const before=stable(sig(evalP(world,P,1)));
        const sel=oasisFlowSelectiveV12.selectiveRecall(world,P);
        const ref=oasisFlowSelectiveV12.fullScanReference(world,P);
        const after=stable(sig(evalP(world,P,1)));
        const selIds=sel.experiences.map(e=>e.id).sort();
        const exact=stable(selIds)===stable(ref);
        if(!exact)mismatchCount++;
        const future=sel.experiences.filter(e=>e.t>t).map(e=>e.id);
        futureLeakCount+=future.length;
        const F=oasisFlowSelectiveV12.ensureFlowSelective(P);
        const PRS=ensurePastRelationalStructure(P);
        const indexExact=F.index.byId.size===PRS.realizedExperiences.length&&F.indexedRelationFactKeys.size===PRS.relationFacts.length;
        if(!indexExact)indexMismatchCount++;
        const frame=oasisFlowSelectiveV12.jointInputFrame(world,P);
        const afterFrame=stable(sig(evalP(world,P,1)));
        if(before!==after||after!==afterFrame)observationMutationCount++;
        parties.push({
          party:P.id,totalPast:sel.totalPast,accessed:sel.accessed,accessRatio:sel.totalPast?sel.accessed/sel.totalPast:0,
          selectiveEqualsFullScan:exact,futureIds:future,indexExact,
          responsibilityStatus:frame.responsibility.status,actionAuthority:frame.actionAuthority,
          keyCount:sel.keys.length,keys:sel.keys
        });
      }
      snapshots.push({tick:t,parties});
    }
    for(let t=1;t<=HORIZON;t++){
      E.tick=t;
      tickW(world,env(t+OFFSET));
      if(checkpoints.includes(t))inspect(t);
    }
    const productionLoaderPresent=!!document.querySelector('script[data-oasis-module="flow-selective-joint-response-v1.2"]');
    return {
      horizon:HORIZON,offset:OFFSET,productionLoaderPresent,
      mismatchCount,futureLeakCount,indexMismatchCount,observationMutationCount,snapshots,
      final:world.parties.map(P=>({party:P.id,realizedExperiences:ensurePastRelationalStructure(P).realizedExperiences.length,relationFacts:ensurePastRelationalStructure(P).relationFacts.length,counters:{...oasisFlowSelectiveV12.ensureFlowSelective(P).counters}}))
    };
  },{HORIZON,OFFSET,checkpoints});
  const validity={
    productionPath:result.productionLoaderPresent,
    selectiveExact:result.mismatchCount===0,
    nonAnticipation:result.futureLeakCount===0,
    indexComplete:result.indexMismatchCount===0,
    observeOnlyNoDecisionMutation:result.observationMutationCount===0,
    stageAResponsibilityNotFabricated:result.snapshots.every(s=>s.parties.every(p=>p.responsibilityStatus==='NOT_OPERATIONALIZED_STAGE_A'&&p.actionAuthority==='OBSERVE_ONLY_STAGE_A')),
    sourceAudit:Object.values(sourceAudit).every(Boolean)
  };
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r1',stage:'A',sourceAudit,validity,pass:Object.values(validity).every(Boolean),result};
  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('OASIS-FSJR-R1',JSON.stringify({pass:report.pass,validity,final:result.final,snapshots:result.snapshots}));
  if(!report.pass)process.exitCode=1;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
