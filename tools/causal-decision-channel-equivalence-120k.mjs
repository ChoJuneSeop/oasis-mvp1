import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4216,MAX_TICK=120000;
const REPORT='causal-decision-channel-equivalence-120k-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch();let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const repl="function latentActive(S,P){\n  if(globalThis.__OASIS_CR03C_OVERRIDE&&globalThis.__OASIS_CR03C_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_CR03C_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('CR03C latentActive patch target missing');src=src.replace(head,repl);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_CR03C_INTERNALS={activeField,currentPlace,refreshHidden,participants,fieldRelevantToPlace,fieldTouchesNPC,hiddenReady,memberRank};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('CR03C exposure target missing');src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_CR03C_INTERNALS,null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate((MAX_TICK)=>{
    const savedE=E,I=globalThis.__OASIS_CR03C_INTERNALS,baseChoose=choose;
    const clone=x=>JSON.parse(JSON.stringify(x));
    const same=(a,b)=>!changedSig(a,b);
    const stable=x=>JSON.stringify(x);

    // Pass 1: exact production target tape.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const targetTape={};
    choose=function(S0,P){baseChoose(S0,P);if(S0===S&&MODELS[S0.key].kind==='oasis')(targetTape[P.id]??=[]).push(P.target)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    // Pass 2: replay + downstream-channel shadows.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const replayIndex={};
    const validity={replayMismatch:0,fullShadowTargetMismatch:0};
    const blankVariation=()=>({participants:0,actionable:0,placeRelevance:0,hiddenReadiness:0,hiddenCandidates:0,memberRankMatrix:0});
    const agg={
      decisionsWithLatent:0,jointDecisionEffects:0,jointTargetEffects:0,shadowEvaluations:0,
      crossKeyDecisionMoments:0,crossKeyTargetMoments:0,
      decisionChannelEquivalent:0,decisionChannelEquifinal:0,targetChannelEquivalent:0,targetChannelEquifinal:0,
      decisionMaxUniqueChannels:0,targetMaxUniqueChannels:0,
      decisionVariation:blankVariation(),targetVariation:blankVariation()
    };
    const moments=[];
    const npcNames=[...new Set(npcs.map(x=>x[0]))];

    const choiceTarget=(P,g)=>{
      if(g?.choice?.startsWith('hidden:')&&MODELS[S.key].rel){const h=hiddenDefs.find(x=>x.id===g.choice.slice(7));return h?.places?.[h.places.length-1]||g.choice}
      return g?.choice||actionableIds(S,P,1)[0]||'road';
    };
    const groupByKey=(L,ids)=>{const m=new Map();for(const id of ids){const k=L.byId.get(id)?.key||`missing:${id}`;if(!m.has(k))m.set(k,[]);m.get(k).push(id)}return m};
    const componentKeys=['participants','actionable','placeRelevance','hiddenReadiness','hiddenCandidates','memberRankMatrix'];

    function makeEval(P){
      const F=P.relationField,L=F?.latent,cache=new Map();
      return function evalIds(ids){
        const norm=[...ids].sort(),ck=norm.join('\u001f');if(cache.has(ck))return cache.get(ck);
        if(!L){const out={sig:clone(sig(evalP(S,P,1))),target:null,channel:null,rawTouchedNPCs:[]};out.target=choiceTarget(P,out.sig);cache.set(ck,out);return out}
        const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation,hiddenCandidates:[...(P.hiddenCandidates||[])],hiddenDone:[...(P.hiddenDone||[])],sHidden:S.c.hidden,sCand:S.c.cand,events:S.events.map(x=>({...x}))};
        globalThis.__OASIS_CR03C_OVERRIDE={party:P.id,ids:norm};let out;
        try{
          I.refreshHidden(S,P);
          const actionable=[...actionableIds(S,P,1)].sort();
          const roles=[...I.participants(S,P,1)].sort();
          const relevance=Object.fromEntries(actionable.map(id=>[id,!!I.fieldRelevantToPlace(S,P,id)]));
          const hiddenReadiness=Object.fromEntries(hiddenDefs.map(h=>[h.id,!!I.hiddenReady(S,P,h)]));
          const hiddenCandidates=[...P.hiddenCandidates].sort();
          const activeMembers=P.members.filter(m=>roles.includes(m.role)).slice().sort((a,b)=>a.name.localeCompare(b.name));
          const rankMatrix={};for(const m of activeMembers)rankMatrix[m.name]=Object.fromEntries(actionable.map(id=>[id,I.memberRank(S,P,m,id,1)]));
          const channel={participants:roles,actionable,placeRelevance:relevance,hiddenReadiness,hiddenCandidates,memberRankMatrix:rankMatrix};
          const rawTouchedNPCs=npcNames.filter(n=>I.fieldTouchesNPC(S,P,n)).sort();
          const sg=clone(sig(evalP(S,P,1)));
          out={sig:sg,target:choiceTarget(P,sg),channel,rawTouchedNPCs};
        }finally{
          delete globalThis.__OASIS_CR03C_OVERRIDE;
          F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];P.target=saved.target;S.c.relationFieldActivation=saved.sAct;
          P.hiddenCandidates.clear();for(const id of saved.hiddenCandidates)P.hiddenCandidates.add(id);P.hiddenDone.clear();for(const id of saved.hiddenDone)P.hiddenDone.add(id);S.c.hidden=saved.sHidden;S.c.cand=saved.sCand;S.events=saved.events;
        }
        agg.shadowEvaluations++;cache.set(ck,out);return out;
      }
    }

    function variation(traces,bucket){
      for(const c of componentKeys){const u=new Set(traces.map(t=>stable(t.channel[c])));if(u.size>1)bucket[c]++}
    }

    function analyze(P,fullIds,full,noLat,evalIds){
      const L=P.relationField.latent,byKey=groupByKey(L,fullIds),fullTarget=full.target,noLatTarget=noLat.target,targetEffect=fullTarget!==noLatTarget;
      const sufficientDecision=[],sufficientTarget=[];
      const details=[];
      for(const [key,ids] of byKey){
        const one=evalIds(ids),sd=same(one.sig,full.sig),st=targetEffect&&one.target===fullTarget;
        if(sd)sufficientDecision.push({key,ids,one});if(st)sufficientTarget.push({key,ids,one});
        details.push({key,identityCount:ids.length,sufficientDecision:sd,sufficientTarget:st});
      }
      let decisionClass=null,targetClass=null;
      if(sufficientDecision.length>=2){
        agg.crossKeyDecisionMoments++;const traces=sufficientDecision.map(x=>x.one),u=new Set(traces.map(x=>stable(x.channel)));
        decisionClass=u.size===1?'CHANNEL_EQUIVALENT':'CHANNEL_EQUIFINAL';agg[decisionClass==='CHANNEL_EQUIVALENT'?'decisionChannelEquivalent':'decisionChannelEquifinal']++;agg.decisionMaxUniqueChannels=Math.max(agg.decisionMaxUniqueChannels,u.size);variation(traces,agg.decisionVariation);
      }
      if(sufficientTarget.length>=2){
        agg.crossKeyTargetMoments++;const traces=sufficientTarget.map(x=>x.one),u=new Set(traces.map(x=>stable(x.channel)));
        targetClass=u.size===1?'CHANNEL_EQUIVALENT':'CHANNEL_EQUIFINAL';agg[targetClass==='CHANNEL_EQUIVALENT'?'targetChannelEquivalent':'targetChannelEquifinal']++;agg.targetMaxUniqueChannels=Math.max(agg.targetMaxUniqueChannels,u.size);variation(traces,agg.targetVariation);
      }
      if(decisionClass||targetClass)moments.push({
        tick:E.tick,party:P.id,currentPlace:I.currentPlace(P),danger:S.danger,full:full.sig,noLat:noLat.sig,resolvedFullTarget:fullTarget,resolvedNoLatTarget:noLatTarget,decisionClass,targetClass,
        sufficientDecisionKeys:sufficientDecision.map(x=>x.key),sufficientTargetKeys:sufficientTarget.map(x=>x.key),
        keyDetails:details,
        decisionKeyChannels:sufficientDecision.map(x=>({key:x.key,channel:x.one.channel,rawTouchedNPCs:x.one.rawTouchedNPCs})),
        targetKeyChannels:sufficientTarget.map(x=>({key:x.key,channel:x.one.channel,rawTouchedNPCs:x.one.rawTouchedNPCs}))
      });
    }

    choose=function(S0,P){
      if(S0!==S||MODELS[S0.key].kind!=='oasis'){baseChoose(S0,P);return}
      const idx=replayIndex[P.id]||0;I.activeField(S,P);
      const L=P.relationField?.latent,fullIds=[...(L?.activeIds||[])];let predicted=null;
      if(fullIds.length){
        agg.decisionsWithLatent++;const evalIds=makeEval(P),full=evalIds(fullIds),noLat=evalIds([]);predicted=full;
        if(changedSig(full.sig,noLat.sig)){agg.jointDecisionEffects++;if(full.target!==noLat.target)agg.jointTargetEffects++;analyze(P,fullIds,full,noLat,evalIds)}
      }
      baseChoose(S0,P);
      if(targetTape[P.id]?.[idx]!==P.target)validity.replayMismatch++;
      if(predicted&&predicted.target!==P.target)validity.fullShadowTargetMismatch++;
      replayIndex[P.id]=idx+1;
    };

    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t));if(t%10000===0)console.log(`CR03C-PROGRESS ${t} crossD=${agg.crossKeyDecisionMoments} eqfD=${agg.decisionChannelEquifinal} crossT=${agg.crossKeyTargetMoments} eqfT=${agg.targetChannelEquifinal}`)}
    choose=baseChoose;
    const out={design:{maxTick:MAX_TICK,primaryChannel:['participants','actionable','placeRelevance','hiddenReadiness','hiddenCandidates','memberRankMatrix'],rawTouchedNPCs:'secondary diagnostic only; excluded from classification',choiceSemantics:'resolved production target',causalBoundary:'same-current consumed-interface equivalence only'},validity,aggregate:agg,moments,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination,fieldSpirals:S.c.relationFieldSpiral}};
    E=savedE;delete globalThis.__OASIS_CR03C_INTERNALS;return out;
  },MAX_TICK);

  if(result.validity.replayMismatch!==0)throw new Error(`CR03C replay mismatch ${result.validity.replayMismatch}`);
  if(result.validity.fullShadowTargetMismatch!==0)throw new Error(`CR03C full shadow target mismatch ${result.validity.fullShadowTargetMismatch}`);
  if(result.aggregate.jointDecisionEffects!==297||result.aggregate.jointTargetEffects!==204)throw new Error(`CR03C CR02 effect reproduction failed ${result.aggregate.jointDecisionEffects}/${result.aggregate.jointTargetEffects}`);
  if(result.aggregate.crossKeyDecisionMoments!==165||result.aggregate.crossKeyTargetMoments!==77)throw new Error(`CR03C CR03R cross-key reproduction failed ${result.aggregate.crossKeyDecisionMoments}/${result.aggregate.crossKeyTargetMoments}`);
  console.log('OASIS-CR03C-CHANNEL-EQUIVALENCE '+JSON.stringify({validity:result.validity,aggregate:result.aggregate}));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
