import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4184;
const MAX_TICK=120000;
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&typeof choose==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const report=await page.evaluate(({maxTick})=>{
    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    const originalChoose=choose;
    const counterfactual=[];
    const checkpoints=[];
    let maxActiveEpisodes=0;

    function copySig(x){return JSON.parse(JSON.stringify(x))}
    function diagnostic(P){
      const F=P.relationField,L=F?.latent;
      if(!L||!L.activeIds?.length)return;
      const saved={
        active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,
        latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,
        sAct:S.c.relationFieldActivation,target:P.target
      };
      globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
      let full,noLat;
      try{
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;
        full=copySig(sig(evalP(S,P,1)));
        F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];S.c.relationFieldActivation=saved.sAct;P.target=saved.target;
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=true;
        noLat=copySig(sig(evalP(S,P,1)));
      }finally{
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;
        globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;
        F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target;
      }
      if(changedSig(full,noLat))counterfactual.push({
        tick:E.tick,party:P.id,currentPlace:currentPlace(P),targetBefore:saved.target,danger:S.danger,
        latentActiveIds:[...saved.latentActive],full,noLat
      });
    }
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis')diagnostic(P);originalChoose(S0,P)};

    for(let t=1;t<=maxTick;t++){
      E.tick=t;
      tickW(S,env(t));
      for(const P of S.parties)maxActiveEpisodes=Math.max(maxActiveEpisodes,P.relationField?.episodes?.length||0);
      if(t===4000||t===40000||t===120000){
        checkpoints.push({tick:t,parties:S.parties.map(P=>({
          id:P.id,activeEpisodes:P.relationField?.episodes?.length||0,
          latentProcesses:P.relationField?.latent?.byId?.size||0,
          auditEvents:P.relationField?.latent?.audit?.length||0,
          activeKeys:[...(P.relationField?.active||[])]
        }))});
      }
    }
    choose=originalChoose;

    const parties=S.parties.map(P=>{
      const F=P.relationField,L=F?.latent;
      const audit=[...(L?.audit||[])];
      const byType=audit.reduce((o,e)=>(o[e.type]=(o[e.type]||0)+1,o),{});
      return {
        id:P.id,name:P.name,
        activeEpisodes:F?.episodes?.length||0,
        latentProcesses:L?.byId?.size||0,
        latentIndexClues:L?.byClue?.size||0,
        relationFieldActivations:F?.activations||0,
        recombinations:F?.recombinations||0,
        spirals:F?.spirals||0,
        auditCount:audit.length,
        auditByType:byType,
        firstAudit:audit.slice(0,20),
        lastAudit:audit.slice(-20),
        audit
      };
    });
    const summary={
      completedTick:E.tick,maxActiveEpisodes,
      totalLatentProcesses:parties.reduce((a,p)=>a+p.latentProcesses,0),
      totalAuditEvents:parties.reduce((a,p)=>a+p.auditCount,0),
      totalReactivations:parties.reduce((a,p)=>a+(p.auditByType.reactivate||0),0),
      totalNonCurrent:parties.reduce((a,p)=>a+(p.auditByType.noncurrent||0),0),
      totalSelectParticipation:parties.reduce((a,p)=>a+(p.auditByType['select-participation']||0),0),
      totalOutcomes:parties.reduce((a,p)=>a+(p.auditByType.outcome||0),0),
      totalComposes:parties.reduce((a,p)=>a+(p.auditByType.compose||0),0),
      totalLatentizations:parties.reduce((a,p)=>a+(p.auditByType.latentize||0),0),
      totalFieldSpirals:parties.reduce((a,p)=>a+(p.auditByType['field-spiral']||0),0),
      directCounterfactualDecisionDifferences:counterfactual.length,
      firstCounterfactual:counterfactual[0]||null,
      lastCounterfactual:counterfactual.at(-1)||null
    };
    E=savedE;
    return {design:{featureFlag:'OASIS_LATENT_RELATION_STORE',featureEnabled:true,maxTick,canonicalActiveEpisodeCap:80,canonicalAgeWindow:1200,realityEngineModified:false,diagnosticCounterfactual:'same current state; latent layer enabled vs temporarily disabled before choose'},summary,checkpoints,counterfactual,parties};
  },{maxTick:MAX_TICK});

  if(report.summary.completedTick!==MAX_TICK)throw new Error(`incomplete run: ${report.summary.completedTick}`);
  if(report.summary.maxActiveEpisodes>80)throw new Error(`active episode cap violated: ${report.summary.maxActiveEpisodes}`);
  if(report.summary.totalLatentProcesses<=0)throw new Error('no latent processes created');
  if(report.summary.totalReactivations<=0)throw new Error('no contextual reactivations observed');
  if(report.summary.totalLatentizations<=0)throw new Error('no latentization observed');

  console.log(`PASS active-window-cap max=${report.summary.maxActiveEpisodes}`);
  console.log(`PASS latent-processes total=${report.summary.totalLatentProcesses}`);
  console.log(`PASS latentizations=${report.summary.totalLatentizations}`);
  console.log(`PASS reactivations=${report.summary.totalReactivations}`);
  console.log(`INFO noncurrent=${report.summary.totalNonCurrent}`);
  console.log(`INFO select-participation=${report.summary.totalSelectParticipation}`);
  console.log(`INFO outcomes=${report.summary.totalOutcomes}`);
  console.log(`INFO composes=${report.summary.totalComposes}`);
  console.log(`INFO field-spirals=${report.summary.totalFieldSpirals}`);
  console.log(`INFO direct-counterfactual-decision-differences=${report.summary.directCounterfactualDecisionDifferences}`);
  if(report.summary.firstCounterfactual)console.log(`FIRST-COUNTERFACTUAL ${JSON.stringify(report.summary.firstCounterfactual)}`);
  for(const c of report.checkpoints)console.log(`CHECKPOINT ${c.tick} ${JSON.stringify(c.parties)}`);
  console.log('RESULT latent relation store validation completed; reality engine unchanged, OASIS relation-memory layer only.');

  await writeFile('latent-relation-store-validation-report.json',JSON.stringify(report,null,2));
  await context.close();
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
