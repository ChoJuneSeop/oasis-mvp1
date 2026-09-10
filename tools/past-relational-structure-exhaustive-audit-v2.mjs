import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const HORIZON=Number(process.env.HORIZON||120000);
const PORT=4410+(OFFSET%200);
const REPORT=`past-relational-structure-audit-v2-${LABEL}.json`;

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(500);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof outcome==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();
  await page.addScriptTag({url:`http://127.0.0.1:${PORT}/past-relational-structure-v1.js`});

  const result=await page.evaluate(({OFFSET,HORIZON,LABEL})=>{
    const savedE=E;
    const productionOutcome=outcome;
    const world=mkW('full');
    E={tick:0,worlds:{full:world},paused:true};
    const ledger=[];
    let seq=0;

    outcome=function(S,P,id){
      if(S!==world){productionOutcome(S,P,id);return;}
      const prs=ensurePastRelationalStructure(P);
      const beforeExp=prs.realizedExperiences.length;
      const beforeFacts=prs.relationFacts.length;
      const beforeRel=P.relationHistory.length;
      const beforeVis=P.vis[id]||0;
      const expectedNpcCount=npcs.filter(n=>n[1]===id).length;
      productionOutcome(S,P,id);
      const addedExp=prs.realizedExperiences.slice(beforeExp);
      const addedFacts=prs.relationFacts.slice(beforeFacts);
      const addedRel=P.relationHistory.slice(beforeRel);
      const experience=addedExp[0]||null;
      const incorporated=addedExp.length===1&&experience?.t===E.tick&&experience?.place===id&&experience?.kind==='realized_experience';
      const relationFactsCorrect=addedFacts.length===expectedNpcCount&&addedFacts.every(x=>x.experienceId===experience?.id&&x.t===E.tick&&x.place===id&&x.kind==='npc_relation_fact');
      const noFabricatedRelation=expectedNpcCount!==0||(addedFacts.length===0&&addedRel.length===0);
      const relationHistoryCompatible=addedRel.length===expectedNpcCount;
      const productionProjectionPresent=P.disc.has(id)&&(P.vis[id]||0)===beforeVis+1;
      ledger.push({
        seq:++seq,
        tick:E.tick,
        partyId:P.id,
        target:id,
        expectedNpcCount,
        incorporated,
        experienceDelta:addedExp.length,
        relationFactDelta:addedFacts.length,
        relationHistoryDelta:addedRel.length,
        relationFactsCorrect,
        noFabricatedRelation,
        relationHistoryCompatible,
        productionProjectionPresent,
        experienceId:experience?.id||null
      });
    };

    for(let t=1;t<=HORIZON;t++){
      E.tick=t;
      tickW(world,env(t+OFFSET));
    }
    outcome=productionOutcome;

    const included=ledger.filter(x=>x.incorporated);
    const missing=ledger.filter(x=>!x.incorporated);
    const parties={};
    const targets={};
    for(const r of ledger){
      const p=parties[r.partyId]||(parties[r.partyId]={realizations:0,incorporated:0,missing:0,relationFacts:0});
      p.realizations++;p.relationFacts+=r.relationFactDelta;r.incorporated?p.incorporated++:p.missing++;
      const q=targets[r.target]||(targets[r.target]={realizations:0,incorporated:0,missing:0,relationFacts:0,relationHistoryEntries:0});
      q.realizations++;q.relationFacts+=r.relationFactDelta;q.relationHistoryEntries+=r.relationHistoryDelta;r.incorporated?q.incorporated++:q.missing++;
    }

    const totalStored=world.parties.reduce((s,P)=>s+ensurePastRelationalStructure(P).realizedExperiences.length,0);
    const summary={
      label:LABEL,
      offset:OFFSET,
      horizon:HORIZON,
      totalRealizations:ledger.length,
      incorporatedIntoPastRelationalStructure:included.length,
      missingFromPastRelationalStructure:missing.length,
      incorporationRate:ledger.length?included.length/ledger.length:null,
      totalStoredRealizedExperiences:totalStored,
      relationHistoryEntries:ledger.reduce((s,x)=>s+x.relationHistoryDelta,0),
      relationFactsStored:ledger.reduce((s,x)=>s+x.relationFactDelta,0),
      zeroNpcRealizations:ledger.filter(x=>x.expectedNpcCount===0).length,
      zeroNpcRealizationsStillIncorporated:ledger.filter(x=>x.expectedNpcCount===0&&x.incorporated).length,
      integrity:{
        partitionComplete:ledger.length===included.length+missing.length,
        exactlyOneExperiencePerRealization:ledger.every(x=>x.experienceDelta===1),
        allExperienceProvenanceMatches:missing.length===0,
        relationFactsMatchActualNpcRelations:ledger.every(x=>x.relationFactsCorrect&&x.relationHistoryCompatible),
        noFabricatedNpcRelations:ledger.every(x=>x.noFabricatedRelation),
        productionProjectionPresentForEveryRealization:ledger.every(x=>x.productionProjectionPresent),
        totalStoredMatchesLedger:totalStored===ledger.length
      },
      parties,
      targets
    };

    E=savedE;
    return {
      experiment:'Past Relational Structure Realization Incorporation Exhaustive Audit',
      version:'v2',
      scope:'Every production outcome in one uninterrupted Full-OASIS 120k stream. Primary endpoint is realized experience incorporation into canonical Past Relational Structure; NPC relation facts are a separate secondary record.',
      rule:'No NPC relation is fabricated for a realization without an NPC. relationHistory is not treated as the whole Past Relational Structure.',
      summary,
      ledger
    };
  },{OFFSET,HORIZON,LABEL});

  await writeFile(REPORT,JSON.stringify(result,null,2),'utf8');
  console.log('OASIS-PRS-EXHAUSTIVE-AUDIT-V2',JSON.stringify(result.summary));
  if(!Object.values(result.summary.integrity).every(Boolean))process.exitCode=1;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
