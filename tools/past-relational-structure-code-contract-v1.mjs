import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4391;
const REPORT='past-relational-structure-code-contract-v1.json';
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
  await page.waitForFunction(()=>typeof mkW==='function'&&typeof outcome==='function'&&typeof relationExists==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(()=>{
    const savedE=E;
    const rows=[];
    const ids=Object.keys(places);
    for(let i=0;i<ids.length;i++){
      const id=ids[i];
      const S=mkW('full');
      E={tick:1000+i,worlds:{full:S},paused:true};
      const P=S.parties[0];
      P.target=id;
      P.leader='세라';
      P.last='contract';
      const prs=ensurePastRelationalStructure(P);
      const beforeExp=prs.realizedExperiences.length;
      const beforeFacts=prs.relationFacts.length;
      const beforeRel=P.relationHistory.length;
      const expectedNpcCount=npcs.filter(n=>n[1]===id).length;
      outcome(S,P,id);
      const addedExp=prs.realizedExperiences.slice(beforeExp);
      const addedFacts=prs.relationFacts.slice(beforeFacts);
      const addedRel=P.relationHistory.slice(beforeRel);
      const experience=addedExp[0]||null;
      rows.push({
        place:id,
        expectedNpcCount,
        experienceDelta:addedExp.length,
        relationFactDelta:addedFacts.length,
        relationHistoryDelta:addedRel.length,
        exactExperience:addedExp.length===1&&experience.t===E.tick&&experience.place===id&&experience.kind==='realized_experience',
        exactRelationFacts:addedFacts.length===expectedNpcCount&&addedFacts.every(x=>x.experienceId===experience?.id&&x.t===E.tick&&x.place===id&&x.kind==='npc_relation_fact'),
        noFabricatedNpcRelation:expectedNpcCount!==0||((addedFacts.length===0)&&(addedRel.length===0)),
        relationHistoryCompatibility:addedRel.length===expectedNpcCount,
        projectionPresent:P.disc.has(id)&&(P.vis[id]||0)===1
      });
    }

    const S=mkW('full');
    E={tick:9999,worlds:{full:S},paused:true};
    const P=S.parties[0];
    const prs=ensurePastRelationalStructure(P);
    P.relationHistory=[];
    prs.relationFacts.push({experienceId:'synthetic-contract',t:1,npc:'엘리',place:'forest',kind:'npc_relation_fact'});
    const prsRelationAccessible=relationExists(P,'엘리')===true;
    const gateAccessible=availableOasis(S,P,1).includes('ruin');
    const clone=structuredClone(P);
    const clonePreservesStructure=clone.pastRelationalStructure?.relationFacts?.some(x=>x.npc==='엘리')===true;

    E=savedE;
    const pass=rows.every(r=>r.experienceDelta===1&&r.exactExperience&&r.exactRelationFacts&&r.noFabricatedNpcRelation&&r.relationHistoryCompatibility&&r.projectionPresent)&&prsRelationAccessible&&gateAccessible&&clonePreservesStructure;
    return {pass,rows,productionAccessibility:{prsRelationAccessible,gateAccessible,clonePreservesStructure}};
  });

  await writeFile(REPORT,JSON.stringify(result,null,2),'utf8');
  console.log('OASIS-PRS-CODE-CONTRACT',JSON.stringify(result));
  if(!result.pass)process.exitCode=1;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
