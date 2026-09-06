import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// Long-horizon O2/O3 diagnostic for the six blue-party relation episodes created
// at tick 3595 in the established A=18/80/12000 trajectory.
// No future trigger, timer, or random reactivation is injected. The persistent
// variant changes only post-3595 retention/age so 'never reactivated' is not
// confounded with eviction. Production relation-field.js remains unchanged.

const PORT=4180;
const GENERATION_TICK=3595;
const BASE_AGE=1200;
const PRE_AGE=12000;
const MAX_TICK=120000;
const canonicalSource=await readFile('relation-field.js','utf8');
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const VARIANTS=[
  {name:'persistent-after-3595',persistent:true},
  {name:'production-window-control',persistent:false}
];

function patchSource(source,cfg){
  let out=source;
  const ageFrom='if(E.tick-ep.t>1200)return false';
  const ageTo='if(E.tick-ep.t>(globalThis.__RF_TEST_AGE_OVERRIDE??1200))return false';
  if(!out.includes(ageFrom))throw new Error('canonical age gate not found');
  out=out.replace(ageFrom,ageTo);
  if(cfg.persistent){
    const keepFrom='P.relationField.episodes=P.relationField.episodes.slice(-80)';
    const keepTo=`P.relationField.episodes=E.tick<${GENERATION_TICK}?P.relationField.episodes.slice(-80):P.relationField.episodes`;
    if(!out.includes(keepFrom))throw new Error('canonical episode retention gate not found');
    out=out.replace(keepFrom,keepTo);
  }
  return out;
}

async function runVariant(browser,cfg){
  const context=await browser.newContext();
  const page=await context.newPage();
  const patched=patchSource(canonicalSource,cfg);
  await page.route('**/relation-field.js',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:patched}));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({cfg,generationTick,baseAge,preAge,maxTick})=>{
    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    let tracked=[];
    const states=new Map();
    const decisionContributions=[];
    const activationTimeline=[];
    let blueChoice3304=null;
    let blueChoice3595=null;

    const oldChoose=choose;
    const oldOutcome=outcome;

    function epId(ep){return `${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`}
    function pureRelevant(P,ep){
      const here=currentPlace(P),target=P.target,reasons=[];
      if(ep.places.includes(here))reasons.push(`here:${here}`);
      if(ep.places.includes(target))reasons.push(`target:${target}`);
      for(const id of ep.places)if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push(`danger:${id}`);
      const gate=places[target]?.gate;
      if(gate&&(ep.a===gate||ep.b===gate))reasons.push(`gate:${gate}`);
      return {relevant:reasons.length>0,reasons:[...new Set(reasons)]};
    }
    function cloneRows(rows){return rows.map(r=>({id:r.id,votes:r.votes,voices:(r.voices||[]).map(v=>[v[0],v[1]])}))}
    function evalFiltered(P,filter=null){
      const F=P.relationField;
      const saved={episodes:F.episodes,active:[...(F.active||[])],activations:F.activations,lastActivationTick:F.lastActivationTick,sAct:S.c.relationFieldActivation};
      let oldLog=null,logWritable=false;
      try{oldLog=log;log=()=>{};logWritable=true}catch{}
      try{
        if(filter)F.episodes=F.episodes.filter(filter);
        const rows=cloneRows(evalP(S,P,1));
        return {sig:sig(rows),rows};
      }finally{
        F.episodes=saved.episodes;F.active=saved.active;F.activations=saved.activations;F.lastActivationTick=saved.lastActivationTick;S.c.relationFieldActivation=saved.sAct;
        if(logWritable)try{log=oldLog}catch{}
      }
    }
    function findTracked(P,id){return (P.relationField?.episodes||[]).find(ep=>epId(ep)===id)}
    function trackTick(P){
      if(!tracked.length)return;
      for(const meta of tracked){
        const st=states.get(meta.id),ep=findTracked(P,meta.id);
        if(!ep){
          if(st.evictedTick==null)st.evictedTick=E.tick;
          if(st.prevRelevant===true){st.transitions.push({type:'non-current',tick:E.tick,reason:'episode-evicted'});st.nonCurrentStart=E.tick}
          st.prevRelevant=false;
          continue;
        }
        st.presentThrough=E.tick;
        const x=pureRelevant(P,ep);
        if(x.relevant)st.relevantTicks++;
        else st.nonCurrentTicks++;
        if(st.prevRelevant==null){
          st.initialRelevant=x.relevant;st.initialReasons=x.reasons;st.prevRelevant=x.relevant;
          if(!x.relevant)st.nonCurrentStart=E.tick;
          continue;
        }
        if(st.prevRelevant&&!x.relevant){
          st.nonCurrentStart=E.tick;
          st.transitions.push({type:'non-current',tick:E.tick});
        }else if(!st.prevRelevant&&x.relevant){
          const gap=st.nonCurrentStart==null?null:E.tick-st.nonCurrentStart;
          const evt={type:'reactivated',tick:E.tick,gap,reasons:x.reasons,currentPlace:currentPlace(P),target:P.target,danger:S.danger};
          st.transitions.push(evt);st.reactivations++;st.maxNonCurrentGap=Math.max(st.maxNonCurrentGap,gap||0);
          if(st.firstReactivationTick==null)st.firstReactivationTick=E.tick;
          activationTimeline.push({episode:meta.id,key:meta.key,...evt});
          st.nonCurrentStart=null;
        }
        st.prevRelevant=x.relevant;
      }
    }
    function decisionDiagnostic(P){
      if(!tracked.length)return;
      const present=tracked.filter(m=>findTracked(P,m.id));
      const relevant=present.filter(m=>pureRelevant(P,findTracked(P,m.id)).relevant);
      if(!relevant.length)return;
      const ids=new Set(tracked.map(x=>x.id));
      const full=evalFiltered(P);
      const withoutTracked=evalFiltered(P,ep=>!ids.has(epId(ep)));
      const groupDiff=changedSig(full.sig,withoutTracked.sig);
      const individual=[];
      for(const m of relevant){
        const x=evalFiltered(P,ep=>epId(ep)!==m.id);
        if(changedSig(full.sig,x.sig))individual.push({id:m.id,key:m.key,without:x.sig});
      }
      if(groupDiff||individual.length){
        decisionContributions.push({tick:E.tick,party:P.id,targetBefore:P.target,currentPlace:currentPlace(P),danger:S.danger,relevantTracked:relevant.map(x=>x.id),full:full.sig,withoutTracked:withoutTracked.sig,groupDiff,individual});
      }
    }

    outcome=function(S0,P,id){
      const beforeLen=P.relationField?.episodes?.length||0;
      oldOutcome(S0,P,id);
      if(S0===S&&P.id==='blue'&&E.tick===generationTick&&id==='road'&&!tracked.length){
        const created=P.relationField.episodes.slice(beforeLen).filter(ep=>ep.t===generationTick&&ep.from?.[1]===generationTick);
        tracked=created.map(ep=>({id:epId(ep),t:ep.t,key:ep.key,a:ep.a,b:ep.b,places:[...ep.places],from:[...ep.from]}));
        for(const m of tracked)states.set(m.id,{...m,initialRelevant:null,initialReasons:[],prevRelevant:null,nonCurrentStart:null,firstReactivationTick:null,reactivations:0,maxNonCurrentGap:0,relevantTicks:0,nonCurrentTicks:0,evictedTick:null,presentThrough:generationTick,transitions:[]});
      }
    };
    choose=function(S0,P){
      if(S0===S&&P.id==='blue'){
        if(E.tick===3304)blueChoice3304=evalFiltered(P).sig.choice;
        if(E.tick===generationTick)blueChoice3595=evalFiltered(P).sig.choice;
        decisionDiagnostic(P);
      }
      oldChoose(S0,P);
    };

    for(let t=1;t<=maxTick;t++){
      E.tick=t;
      globalThis.__RF_TEST_AGE_OVERRIDE=t<generationTick?preAge:(cfg.persistent?maxTick+1:preAge);
      tickW(S,env(t));
      const P=S.parties.find(x=>x.id==='blue');
      if(t>=generationTick)trackTick(P);
    }

    choose=oldChoose;outcome=oldOutcome;
    const finalP=S.parties.find(x=>x.id==='blue');
    const stateRows=[...states.values()].map(st=>{
      if(st.nonCurrentStart!=null&&st.evictedTick==null)st.maxNonCurrentGap=Math.max(st.maxNonCurrentGap,maxTick-st.nonCurrentStart);
      return st;
    });
    const out={
      design:{variant:cfg.name,persistentAfter3595:cfg.persistent,generationTick,maxTick,preGenerationAge:preAge,productionAge:baseAge,canonicalProductionUnchanged:true,noFutureTriggerInjected:true,diagnosticsDoNotRewriteRealizedTrajectory:true},
      reproduction:{blueChoice3304,blueChoice3595,trackedCount:tracked.length,tracked},
      states:stateRows,
      activationTimeline,
      decisionContributions,
      summary:{
        completedTick:E.tick,
        trackedCount:tracked.length,
        episodesWithReactivation:stateRows.filter(x=>x.reactivations>0).length,
        totalReactivations:stateRows.reduce((a,x)=>a+x.reactivations,0),
        neverReactivated:stateRows.filter(x=>x.reactivations===0).map(x=>x.id),
        evicted:stateRows.filter(x=>x.evictedTick!=null).map(x=>({id:x.id,tick:x.evictedTick})),
        groupDecisionContributionEvents:decisionContributions.filter(x=>x.groupDiff).length,
        individualDecisionContributionEvents:decisionContributions.filter(x=>x.individual.length).length,
        relationFieldActivations:S.c.relationFieldActivation,
        relationRecombinations:S.c.relationRecombination,
        actions:S.c.actions,
        finalEpisodes:finalP.relationField.episodes.length
      }
    };
    E=savedE;
    return out;
  },{cfg,generationTick:GENERATION_TICK,baseAge:BASE_AGE,preAge:PRE_AGE,maxTick:MAX_TICK});

  await context.close();
  return result;
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const results=[];
  for(const cfg of VARIANTS){
    const r=await runVariant(browser,cfg);
    results.push(r);
    console.log(`VARIANT ${cfg.name}`);
    console.log(`reproduce tick3304=${r.reproduction.blueChoice3304} tick3595=${r.reproduction.blueChoice3595} tracked=${r.reproduction.trackedCount}`);
    console.log(`reactivatedEpisodes=${r.summary.episodesWithReactivation}/${r.summary.trackedCount} totalReactivations=${r.summary.totalReactivations} evicted=${r.summary.evicted.length}`);
    console.log(`groupDecisionContributionEvents=${r.summary.groupDecisionContributionEvents} individualDecisionContributionEvents=${r.summary.individualDecisionContributionEvents}`);
    for(const s of r.states)console.log(`${s.id} reactivations=${s.reactivations} first=${s.firstReactivationTick??'none'} maxGap=${s.maxNonCurrentGap} evicted=${s.evictedTick??'no'}`);
  }
  const persistent=results.find(x=>x.design.persistentAfter3595);
  if(persistent.reproduction.blueChoice3304!=='road')throw new Error(`reproduction failed at tick3304: ${persistent.reproduction.blueChoice3304}`);
  if(persistent.reproduction.trackedCount!==6)throw new Error(`expected 6 tick-3595 episodes, got ${persistent.reproduction.trackedCount}`);
  const report={
    purpose:'Track the six second-generation relation episodes created at tick 3595 without pre-scheduling reactivation; separate contextual reactivation from actual decision contribution.',
    priorArtBoundary:['Long-delay memory influence and context-dependent retrieval are not claimed as OASIS-unique.','The test targets the combined OASIS mechanism: actual relation-process formation -> non-current interval -> current-context re-entry -> possible decision participation -> subsequent relation-process formation.'],
    results
  };
  await writeFile('second-generation-reactivation-report.json',JSON.stringify(report,null,2));
  console.log('RESULT: second-generation long-horizon reactivation trace completed.');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
