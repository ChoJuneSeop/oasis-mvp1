import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// OASIS long-relation genealogy trace.
// Purpose: validate decision-time (pre-choose) causal contribution of >1200-tick
// relation-field episodes under the A=18/80/12000 extension, without modifying
// production relation-field.js or any canonical experiment.

const PORT=4179;
const BASE_AGE=1200;
const EXT_AGE=12000;
const MAX_TICK=40000;
const canonicalSource=await readFile('relation-field.js','utf8');
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function patchAge(source){
  const from='if(E.tick-ep.t>1200)return false';
  const to='if(E.tick-ep.t>(globalThis.__RF_TEST_AGE_OVERRIDE??12000))return false';
  if(!source.includes(from))throw new Error('canonical age gate not found');
  return source.replace(from,to);
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  const patched=patchAge(canonicalSource);
  await page.route('**/relation-field.js',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:patched}));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const report=await page.evaluate(({baseAge,extAge,maxTick})=>{
    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    const registry=new Map();
    let focus=null;
    let tick3304=null;

    const oldChoose=choose;
    const oldOutcome=outcome;

    function epId(ep){return `${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`}
    function epRelevant(P,ep,cutoff){
      if(E.tick-ep.t>cutoff)return false;
      const here=currentPlace(P),target=P.target;
      if(ep.places.includes(here)||ep.places.includes(target))return true;
      if(ep.places.some(id=>Math.abs((places[id]?.r||0)-S.danger)<=0.18))return true;
      const gate=places[target]?.gate;
      return !!gate&&(ep.a===gate||ep.b===gate);
    }
    function candidateRelevant(ep,id){
      const gate=places[id]?.gate;
      return ep.places.includes(id)||!!gate&&(ep.a===gate||ep.b===gate);
    }
    function sourceEvents(P,ep){
      const a=P.relationHistory.filter(x=>x.t===ep.from?.[0]&&x.npc===ep.a&&x.place===ep.places?.[0]);
      const b=P.relationHistory.filter(x=>x.t===ep.from?.[1]&&x.npc===ep.b&&x.place===ep.places?.[1]);
      return {previous:a,current:b};
    }
    function cloneRows(rows){return rows.map(r=>({id:r.id,votes:r.votes,voices:(r.voices||[]).map(v=>[v[0],v[1]])}))}
    function evalWith(P,cutoff,episodeFilter=null){
      const F=P.relationField;
      const saved={episodes:F.episodes,active:[...(F.active||[])],activations:F.activations,lastActivationTick:F.lastActivationTick,sAct:S.c.relationFieldActivation};
      const prior=globalThis.__RF_TEST_AGE_OVERRIDE;
      let oldLog=null,logWritable=false;
      try{oldLog=log;log=()=>{};logWritable=true}catch{}
      try{
        if(episodeFilter)F.episodes=F.episodes.filter(episodeFilter);
        globalThis.__RF_TEST_AGE_OVERRIDE=cutoff;
        const rows=cloneRows(evalP(S,P,1));
        return {sig:sig(rows),rows};
      }finally{
        globalThis.__RF_TEST_AGE_OVERRIDE=prior;
        F.episodes=saved.episodes;F.active=saved.active;F.activations=saved.activations;F.lastActivationTick=saved.lastActivationTick;S.c.relationFieldActivation=saved.sAct;
        if(logWritable)try{log=oldLog}catch{}
      }
    }
    function trackEpisodes(P){
      const status=[];
      for(const ep of P.relationField?.episodes||[]){
        const id=epId(ep);
        let r=registry.get(id);
        if(!r){r={id,ep:{...ep,places:[...(ep.places||[])],from:[...(ep.from||[])]},firstObservedDecision:E.tick,lastRelevantExt:null,lastRelevantBase:null,relevantExtCount:0,relevantBaseCount:0};registry.set(id,r)}
        const ext=epRelevant(P,ep,extAge),base=epRelevant(P,ep,baseAge);
        const prevExt=r.lastRelevantExt,prevBase=r.lastRelevantBase;
        if(ext){r.lastRelevantExt=E.tick;r.relevantExtCount++}
        if(base){r.lastRelevantBase=E.tick;r.relevantBaseCount++}
        status.push({id,ep,ext,base,prevExt,prevBase});
      }
      return status;
    }
    function buildDecisionDiagnostic(P){
      const statuses=trackEpisodes(P);
      const full=evalWith(P,extAge);
      const recent=evalWith(P,baseAge);
      const oldActive=statuses.filter(x=>x.ext&&!x.base&&E.tick-x.ep.t>baseAge);
      const recentActive=statuses.filter(x=>x.base);
      const recentKeys=new Set(recentActive.map(x=>x.ep.key));
      const oldExclusive=oldActive.filter(x=>!recentKeys.has(x.ep.key));
      const keys=[...new Set(oldExclusive.map(x=>x.ep.key))];
      const leaveOneOut=keys.map(key=>({key,...evalWith(P,extAge,ep=>ep.key!==key)}));
      const withoutAllOldExclusive=evalWith(P,extAge,ep=>!keys.includes(ep.key));
      const episodes=oldExclusive.map(x=>{
        const r=registry.get(x.id);
        return {
          id:x.id,t:x.ep.t,age:E.tick-x.ep.t,key:x.ep.key,a:x.ep.a,b:x.ep.b,places:[...x.ep.places],from:[...x.ep.from],
          sourceEvents:sourceEvents(P,x.ep),
          previousRelevantDecisionTick:x.prevExt,
          nonCurrentDecisionGap:x.prevExt==null?E.tick-x.ep.t:E.tick-x.prevExt,
          everRelevantUnderBase:r?.relevantBaseCount>0,
          relevantExtCountBeforeOrAt:r?.relevantExtCount||0,
          relevantToFullChoice:candidateRelevant(x.ep,full.sig.choice),
          relevantToRecentChoice:candidateRelevant(x.ep,recent.sig.choice)
        };
      });
      return {
        tick:E.tick,party:P.id,partyName:P.name,preDecisionTarget:P.target,currentPlace:currentPlace(P),danger:S.danger,
        full,recent,
        choiceDiff:full.sig.choice!==recent.sig.choice,
        candidateDiff:full.sig.cands!==recent.sig.cands,
        leaderDiff:full.sig.leader!==recent.sig.leader,
        oldExclusiveKeys:keys,oldExclusiveEpisodes:episodes,
        leaveOneOut:leaveOneOut.map(x=>({key:x.key,sig:x.sig,rows:x.rows})),
        withoutAllOldExclusive
      };
    }

    choose=function(S0,P){
      if(S0===S&&P.id==='blue'){
        const d=buildDecisionDiagnostic(P);
        if(E.tick===3304)tick3304=structuredClone(d);
        if(!focus&&d.choiceDiff){
          focus={decision:structuredClone(d),actualChoiceAfterChoose:null,outcome:null,nextChoice:null};
        }
      }
      oldChoose(S0,P);
      if(S0===S&&P.id==='blue'){
        if(focus&&focus.actualChoiceAfterChoose==null&&focus.decision.tick===E.tick){
          focus.actualChoiceAfterChoose=P.target;
        }else if(focus&&focus.outcome&&!focus.nextChoice&&E.tick===focus.outcome.tick){
          focus.nextChoice={tick:E.tick,target:P.target,sig:evalWith(P,extAge).sig};
        }
      }
    };

    outcome=function(S0,P,id){
      if(S0===S&&focus&&P.id===focus.decision.party&&!focus.outcome&&E.tick>focus.decision.tick&&id===focus.actualChoiceAfterChoose){
        const before={tick:E.tick,target:id,sig:evalWith(P,extAge).sig,counters:{fieldSpiral:S.c.relationFieldSpiral,relationSpiral:S.c.relationSpiral,structural:S.c.structuralExpansion,participation:S.c.participationTransition,choice:S.c.choiceTransition},relationLen:P.relationHistory.length,episodeLen:P.relationField.episodes.length};
        oldOutcome(S0,P,id);
        const after={sig:evalWith(P,extAge).sig,counters:{fieldSpiral:S.c.relationFieldSpiral,relationSpiral:S.c.relationSpiral,structural:S.c.structuralExpansion,participation:S.c.participationTransition,choice:S.c.choiceTransition},relationLen:P.relationHistory.length,episodeLen:P.relationField.episodes.length};
        focus.outcome={tick:E.tick,id,before,after,judgmentChanged:changedSig(before.sig,after.sig),newRelationEvents:P.relationHistory.slice(before.relationLen),newEpisodes:P.relationField.episodes.slice(before.episodeLen)};
        return;
      }
      oldOutcome(S0,P,id);
    };

    for(let t=1;t<=maxTick;t++){
      E.tick=t;
      tickW(S,env(t));
      if(focus?.outcome&&focus.nextChoice)break;
    }

    choose=oldChoose;outcome=oldOutcome;
    const result={
      design:{variant:'A 18/80/12000',comparison:'decision-time 12000 vs 1200 cutoff',maxTick,canonicalProductionUnchanged:true},
      tick3304,
      firstTrueDecisionDifference:focus,
      finalTick:E.tick,
      counters:{...S.c}
    };
    E=savedE;
    return result;
  },{baseAge:BASE_AGE,extAge:EXT_AGE,maxTick:MAX_TICK});

  console.log(JSON.stringify(report,null,2));
  if(report.tick3304){
    console.log(`TICK3304 pre-choice full=${report.tick3304.full.sig.choice} recent=${report.tick3304.recent.sig.choice} diff=${report.tick3304.choiceDiff}`);
  }else console.log('TICK3304 blue decision not observed');
  if(report.firstTrueDecisionDifference){
    const f=report.firstTrueDecisionDifference;
    console.log(`FIRST TRUE PRE-CHOICE DIFF tick=${f.decision.tick} full=${f.decision.full.sig.choice} recent=${f.decision.recent.sig.choice} actual=${f.actualChoiceAfterChoose}`);
    console.log(`OLD EXCLUSIVE KEYS ${f.decision.oldExclusiveKeys.join(',')}`);
    console.log(`OUTCOME tick=${f.outcome?.tick??'none'} changed=${f.outcome?.judgmentChanged??false} next=${f.nextChoice?.target??'none'}`);
  }else console.log('NO TRUE PRE-CHOICE CHOICE DIFF FOUND');

  await writeFile('first-long-relation-choice-genealogy.json',JSON.stringify(report,null,2));
  await context.close();
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
