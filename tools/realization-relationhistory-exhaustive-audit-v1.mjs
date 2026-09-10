import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const HORIZON=Number(process.env.HORIZON||120000);
const PORT=4310+(OFFSET%200);
const REPORT=`realization-relationhistory-audit-v1-${LABEL}.json`;

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(500);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function'&&typeof outcome==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({OFFSET,HORIZON,LABEL})=>{
    const originalE=E;
    const productionOutcome=outcome;
    const world=mkW('full');
    E={tick:0,worlds:{full:world},paused:true};

    const ledger=[];
    let seq=0;

    outcome=function(S,P,id){
      if(S!==world){productionOutcome(S,P,id);return;}
      const before=P.relationHistory.length;
      const beforeTail=before?P.relationHistory[before-1]:null;
      productionOutcome(S,P,id);
      const after=P.relationHistory.length;
      const added=P.relationHistory.slice(before).map(e=>({t:e.t,npc:e.npc,place:e.place}));
      const included=added.length>0;
      const exactSameRealization=added.every(e=>e.t===E.tick&&e.place===id);
      ledger.push({
        seq:++seq,
        tick:E.tick,
        partyId:P.id,
        target:id,
        relationHistoryBefore:before,
        relationHistoryAfter:after,
        addedCount:added.length,
        includedInRelationHistory:included,
        exactSameRealization:included?exactSameRealization:null,
        added,
        previousTail:beforeTail?{t:beforeTail.t,npc:beforeTail.npc,place:beforeTail.place}:null
      });
    };

    for(let t=1;t<=HORIZON;t++){
      E.tick=t;
      tickW(world,env(t+OFFSET));
    }

    outcome=productionOutcome;

    const included=ledger.filter(x=>x.includedInRelationHistory);
    const notIncluded=ledger.filter(x=>!x.includedInRelationHistory);
    const mismatchedIncluded=included.filter(x=>x.exactSameRealization!==true);
    const parties={};
    const targets={};
    for(const r of ledger){
      const p=parties[r.partyId]||(parties[r.partyId]={realizations:0,included:0,notIncluded:0,entriesAdded:0});
      p.realizations++;p.entriesAdded+=r.addedCount;r.includedInRelationHistory?p.included++:p.notIncluded++;
      const q=targets[r.target]||(targets[r.target]={realizations:0,included:0,notIncluded:0,entriesAdded:0});
      q.realizations++;q.entriesAdded+=r.addedCount;r.includedInRelationHistory?q.included++:q.notIncluded++;
    }

    const summary={
      label:LABEL,
      offset:OFFSET,
      horizon:HORIZON,
      totalRealizations:ledger.length,
      includedInRelationHistory:included.length,
      notIncludedInRelationHistory:notIncluded.length,
      inclusionRate:ledger.length?included.length/ledger.length:null,
      relationHistoryEntriesAdded:included.reduce((s,x)=>s+x.addedCount,0),
      includedButNotExactSameRealization:mismatchedIncluded.length,
      integrity:{
        partitionComplete:ledger.length===included.length+notIncluded.length,
        allIncludedHavePositiveDelta:included.every(x=>x.addedCount>0&&x.relationHistoryAfter>x.relationHistoryBefore),
        allNotIncludedHaveZeroDelta:notIncluded.every(x=>x.addedCount===0&&x.relationHistoryAfter===x.relationHistoryBefore),
        allAddedEntriesMatchOutcomeTickAndTarget:mismatchedIncluded.length===0
      },
      parties,
      targets
    };

    const output={
      experiment:'Realization-to-relationHistory Exhaustive Audit',
      version:'v1',
      scope:'Every production outcome/realization in one uninterrupted 120k full-OASIS stream; relationHistory only.',
      rule:'No other storage field is counted as incorporation. No missing realization is force-added or reclassified.',
      summary,
      ledger
    };
    E=originalE;
    return output;
  },{OFFSET,HORIZON,LABEL});

  await writeFile(REPORT,JSON.stringify(result,null,2),'utf8');
  console.log('OASIS-REALIZATION-RELATIONHISTORY-AUDIT',JSON.stringify(result.summary));
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
