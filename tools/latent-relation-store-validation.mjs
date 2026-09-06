import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, appendFile } from 'node:fs/promises';

const PORT=4184;
const MAX_TICK=120000;
const CHUNK=500;
const AUDIT_FILE='latent-relation-store-audit.jsonl';
const CF_FILE='latent-relation-store-counterfactual.jsonl';
const REPORT_FILE='latent-relation-store-validation-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await writeFile(AUDIT_FILE,'');
  await writeFile(CF_FILE,'');
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&typeof choose==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  await page.evaluate(()=>{
    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    const originalChoose=choose;
    const T=globalThis.__LATENT_VALIDATION={savedE,S,originalChoose,counterfactual:[],checkpoints:[],maxActiveEpisodes:0};

    function copySig(x){return JSON.parse(JSON.stringify(x))}
    function diagnostic(P){
      const F=P.relationField,L=F?.latent;
      if(!L||!L.activeIds?.length)return;
      const saved={
        active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,
        latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,
        cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],
        sAct:S.c.relationFieldActivation,target:P.target
      };
      globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
      let full,noLat;
      try{
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;
        full=copySig(sig(evalP(S,P,1)));
        F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];S.c.relationFieldActivation=saved.sAct;P.target=saved.target;
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=true;
        noLat=copySig(sig(evalP(S,P,1)));
      }finally{
        globalThis.__OASIS_LATENT_DIAGNOSTIC_DISABLE=false;
        globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;
        F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target;
      }
      if(changedSig(full,noLat))T.counterfactual.push({
        tick:E.tick,party:P.id,currentPlace:currentPlace(P),targetBefore:saved.target,danger:S.danger,
        latentActiveIds:[...saved.latentActive],full,noLat
      });
    }
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis')diagnostic(P);originalChoose(S0,P)};
  });

  const started=Date.now();
  const counts={};
  let totalAuditEvents=0;
  let counterfactualCount=0;
  let firstCounterfactual=null;
  let lastCounterfactual=null;
  const checkpoints=[];
  let maxActiveEpisodes=0;

  for(let start=1;start<=MAX_TICK;start+=CHUNK){
    const end=Math.min(MAX_TICK,start+CHUNK-1);
    const chunk=await page.evaluate(({start,end})=>{
      const T=globalThis.__LATENT_VALIDATION,S=T.S;
      for(let t=start;t<=end;t++){
        E.tick=t;
        tickW(S,env(t));
        for(const P of S.parties)T.maxActiveEpisodes=Math.max(T.maxActiveEpisodes,P.relationField?.episodes?.length||0);
        if(t===4000||t===40000||t===120000){
          T.checkpoints.push({tick:t,parties:S.parties.map(P=>({
            id:P.id,activeEpisodes:P.relationField?.episodes?.length||0,
            latentProcesses:P.relationField?.latent?.byId?.size||0,
            activeKeys:[...(P.relationField?.active||[])]
          }))});
        }
      }
      const audit=[];
      for(const P of S.parties){
        const L=P.relationField?.latent;
        if(!L)continue;
        for(const e of L.audit)audit.push({...e,partyName:P.name});
        L.audit.length=0;
      }
      const counterfactual=T.counterfactual.splice(0);
      const cps=T.checkpoints.splice(0);
      return {completedTick:E.tick,audit,counterfactual,checkpoints:cps,maxActiveEpisodes:T.maxActiveEpisodes};
    },{start,end});

    maxActiveEpisodes=Math.max(maxActiveEpisodes,chunk.maxActiveEpisodes);
    if(chunk.audit.length){
      for(const e of chunk.audit){counts[e.type]=(counts[e.type]||0)+1;totalAuditEvents++}
      await appendFile(AUDIT_FILE,chunk.audit.map(e=>JSON.stringify(e)).join('\n')+'\n');
    }
    if(chunk.counterfactual.length){
      counterfactualCount+=chunk.counterfactual.length;
      if(!firstCounterfactual)firstCounterfactual=chunk.counterfactual[0];
      lastCounterfactual=chunk.counterfactual.at(-1);
      await appendFile(CF_FILE,chunk.counterfactual.map(e=>JSON.stringify(e)).join('\n')+'\n');
    }
    checkpoints.push(...chunk.checkpoints);
    if(end%10000===0)console.log(`PROGRESS tick=${end} audit=${totalAuditEvents} cf=${counterfactualCount}`);
  }

  const final=await page.evaluate(()=>{
    const T=globalThis.__LATENT_VALIDATION,S=T.S;
    choose=T.originalChoose;
    const parties=S.parties.map(P=>{
      const F=P.relationField,L=F?.latent;
      return {
        id:P.id,name:P.name,
        activeEpisodes:F?.episodes?.length||0,
        latentProcesses:L?.byId?.size||0,
        latentIndexClues:L?.byClue?.size||0,
        relationFieldActivations:F?.activations||0,
        recombinations:F?.recombinations||0,
        spirals:F?.spirals||0,
        latentSeq:L?.seq||0,
        currentLatentActiveIds:[...(L?.activeIds||[])]
      };
    });
    const completedTick=E.tick;
    E=T.savedE;
    delete globalThis.__LATENT_VALIDATION;
    return {completedTick,parties};
  });

  const elapsedMs=Date.now()-started;
  const summary={
    completedTick:final.completedTick,maxActiveEpisodes,
    totalLatentProcesses:final.parties.reduce((a,p)=>a+p.latentProcesses,0),
    totalAuditEvents,
    totalLatentizations:counts.latentize||0,
    totalReactivations:counts.reactivate||0,
    totalNonCurrent:counts.noncurrent||0,
    totalSelectParticipation:counts['select-participation']||0,
    totalOutcomes:counts.outcome||0,
    totalComposes:counts.compose||0,
    totalFieldSpirals:counts['field-spiral']||0,
    directCounterfactualDecisionDifferences:counterfactualCount,
    firstCounterfactual,lastCounterfactual,
    elapsedMs
  };
  const report={
    design:{featureFlag:'OASIS_LATENT_RELATION_STORE',featureEnabled:true,maxTick:MAX_TICK,chunkTicks:CHUNK,canonicalActiveEpisodeCap:80,canonicalAgeWindow:1200,realityEngineModified:false,diagnosticCounterfactual:'same current state; latent layer enabled vs temporarily disabled before choose',auditStorage:'streamed JSONL; browser buffer cleared every chunk'},
    summary,checkpoints,parties:final.parties,files:{audit:AUDIT_FILE,counterfactual:CF_FILE}
  };

  if(summary.completedTick!==MAX_TICK)throw new Error(`incomplete run: ${summary.completedTick}`);
  if(summary.maxActiveEpisodes>80)throw new Error(`active episode cap violated: ${summary.maxActiveEpisodes}`);
  if(summary.totalLatentProcesses<=0)throw new Error('no latent processes created');
  if(summary.totalReactivations<=0)throw new Error('no contextual reactivations observed');
  if(summary.totalLatentizations<=0)throw new Error('no latentization observed');

  console.log(`PASS active-window-cap max=${summary.maxActiveEpisodes}`);
  console.log(`PASS latent-processes total=${summary.totalLatentProcesses}`);
  console.log(`PASS latentizations=${summary.totalLatentizations}`);
  console.log(`PASS reactivations=${summary.totalReactivations}`);
  console.log(`INFO noncurrent=${summary.totalNonCurrent}`);
  console.log(`INFO select-participation=${summary.totalSelectParticipation}`);
  console.log(`INFO outcomes=${summary.totalOutcomes}`);
  console.log(`INFO composes=${summary.totalComposes}`);
  console.log(`INFO field-spirals=${summary.totalFieldSpirals}`);
  console.log(`INFO direct-counterfactual-decision-differences=${summary.directCounterfactualDecisionDifferences}`);
  console.log(`INFO elapsed-ms=${summary.elapsedMs}`);
  if(summary.firstCounterfactual)console.log(`FIRST-COUNTERFACTUAL ${JSON.stringify(summary.firstCounterfactual)}`);
  for(const c of checkpoints)console.log(`CHECKPOINT ${c.tick} ${JSON.stringify(c.parties)}`);
  console.log('RESULT latent relation store validation completed; reality engine unchanged, OASIS relation-memory layer only.');

  await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
  await context.close();
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
