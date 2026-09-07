import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4215, MAX_TICK=120000;
const REPORT='causal-redundancy-source-120k-report.json';
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
    const repl="function latentActive(S,P){\n  if(globalThis.__OASIS_CR03R_OVERRIDE&&globalThis.__OASIS_CR03R_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_CR03R_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('CR03R latentActive patch target missing');src=src.replace(head,repl);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_CR03R_INTERNALS={activeField,currentPlace,refreshHidden};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('CR03R exposure target missing');src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_CR03R_INTERNALS,null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate((MAX_TICK)=>{
    const savedE=E,I=globalThis.__OASIS_CR03R_INTERNALS,baseChoose=choose;
    const clone=x=>JSON.parse(JSON.stringify(x));
    const same=(a,b)=>!changedSig(a,b);

    // Pass 1: production target tape.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const targetTape={};
    choose=function(S0,P){baseChoose(S0,P);if(S0===S&&MODELS[S0.key].kind==='oasis')(targetTape[P.id]??=[]).push(P.target)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    // Pass 2: exact production replay + same-current shadows.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const replayIndex={};
    const validity={replayMismatch:0,fullShadowTargetMismatch:0,representativeCompressionMismatch:0};
    const classes=['CROSS_KEY_OVERDETERMINATION','WITHIN_KEY_ALTERNATIVE_FOOTPRINTS','SINGLE_SUFFICIENT_KEY_NECESSARY','SINGLE_SUFFICIENT_KEY_PLUS_COALITION','NO_SUFFICIENT_KEY'];
    const blankClass=()=>Object.fromEntries(classes.map(k=>[k,0]));
    const agg={
      decisionsWithLatent:0,jointDecisionEffects:0,jointTargetEffects:0,shadowEvaluations:0,
      decision:blankClass(),target:blankClass(),
      momentsWithDuplicateIdentities:0,momentsWithMultipleFootprintsPerKey:0,
      decisionMomentsWith2PlusSufficientKeys:0,targetMomentsWith2PlusSufficientKeys:0,
      decisionMaxSufficientKeys:0,targetMaxSufficientKeys:0,
      sufficientDecisionFootprints:0,sufficientTargetFootprints:0,
      sufficientDecisionFootprintsWithDuplicateIds:0,sufficientTargetFootprintsWithDuplicateIds:0
    };
    const moments=[];

    const choiceTarget=(P,g)=>{
      if(g?.choice?.startsWith('hidden:')&&MODELS[S.key].rel){const h=hiddenDefs.find(x=>x.id===g.choice.slice(7));return h?.places?.[h.places.length-1]||g.choice}
      return g?.choice||actionableIds(S,P,1)[0]||'road';
    };
    const choiceDifferent=(P,a,b)=>choiceTarget(P,a)!==choiceTarget(P,b);
    const groupBy=(ids,fn)=>{const m=new Map();for(const id of ids){const k=fn(id);if(!m.has(k))m.set(k,[]);m.get(k).push(id)}return m};

    function makeEval(P){
      const F=P.relationField,L=F?.latent,cache=new Map();
      return function evalIds(ids){
        const norm=[...ids].sort(),ck=norm.join('\u001f');if(cache.has(ck))return cache.get(ck);
        if(!L){const out=clone(sig(evalP(S,P,1)));cache.set(ck,out);return out}
        const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation,hiddenCandidates:[...(P.hiddenCandidates||[])],hiddenDone:[...(P.hiddenDone||[])],sHidden:S.c.hidden,sCand:S.c.cand,events:S.events.map(x=>({...x}))};
        globalThis.__OASIS_CR03R_OVERRIDE={party:P.id,ids:norm};let out;
        try{I.refreshHidden(S,P);out=clone(sig(evalP(S,P,1)))}finally{
          delete globalThis.__OASIS_CR03R_OVERRIDE;
          F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];P.target=saved.target;S.c.relationFieldActivation=saved.sAct;
          P.hiddenCandidates.clear();for(const id of saved.hiddenCandidates)P.hiddenCandidates.add(id);P.hiddenDone.clear();for(const id of saved.hiddenDone)P.hiddenDone.add(id);S.c.hidden=saved.sHidden;S.c.cand=saved.sCand;S.events=saved.events;
        }
        agg.shadowEvaluations++;cache.set(ck,out);return out;
      }
    }

    function classify(sufKeys,necKeys,sufFoot,footToKey){
      if(sufKeys.length>=2)return 'CROSS_KEY_OVERDETERMINATION';
      if(sufKeys.length===0)return 'NO_SUFFICIENT_KEY';
      const k=sufKeys[0];
      const sf=sufFoot.filter(f=>footToKey.get(f)===k);
      if(sf.length>=2)return 'WITHIN_KEY_ALTERNATIVE_FOOTPRINTS';
      return necKeys.includes(k)?'SINGLE_SUFFICIENT_KEY_NECESSARY':'SINGLE_SUFFICIENT_KEY_PLUS_COALITION';
    }

    function analyze(P,fullIds,full,noLat,evalIds){
      const L=P.relationField.latent;
      const footOf=id=>{const ep=L.byId.get(id);return `${ep?.key||'missing'}|${[...(ep?.places||[])].sort().join(',')}`};
      const byFoot=groupBy(fullIds,footOf),byKey=groupBy(fullIds,id=>L.byId.get(id)?.key||`missing:${id}`);
      const reps=[...byFoot.values()].map(ids=>ids[0]);
      if(!same(evalIds(reps),full))validity.representativeCompressionMismatch++;
      if([...byFoot.values()].some(ids=>ids.length>1))agg.momentsWithDuplicateIdentities++;
      const keyFootCount=new Map();for(const f of byFoot.keys()){const id=byFoot.get(f)[0],k=L.byId.get(id)?.key||'missing';keyFootCount.set(k,(keyFootCount.get(k)||0)+1)}
      if([...keyFootCount.values()].some(n=>n>1))agg.momentsWithMultipleFootprintsPerKey++;

      const suffFootD=[],necFootD=[],suffFootT=[],necFootT=[];
      const suffKeyD=[],necKeyD=[],suffKeyT=[],necKeyT=[];
      const fullTarget=choiceTarget(P,full),noLatTarget=choiceTarget(P,noLat),targetEffect=fullTarget!==noLatTarget;
      const footToKey=new Map();
      const footDetails=[];
      for(const [f,ids] of byFoot){
        const ep=L.byId.get(ids[0]),k=ep?.key||'missing';footToKey.set(f,k);
        const set=new Set(ids),only=evalIds(ids),minus=evalIds(fullIds.filter(id=>!set.has(id)));
        const sd=same(only,full),nd=!same(minus,full),st=targetEffect&&choiceTarget(P,only)===fullTarget,nt=targetEffect&&choiceTarget(P,minus)!==fullTarget;
        if(sd)suffFootD.push(f);if(nd)necFootD.push(f);if(st)suffFootT.push(f);if(nt)necFootT.push(f);
        if(sd){agg.sufficientDecisionFootprints++;if(ids.length>1)agg.sufficientDecisionFootprintsWithDuplicateIds++}
        if(st){agg.sufficientTargetFootprints++;if(ids.length>1)agg.sufficientTargetFootprintsWithDuplicateIds++}
        footDetails.push({footprint:f,key:k,identityCount:ids.length,representativeEpisodeId:ids[0],sufficientDecision:sd,necessaryDecision:nd,sufficientTarget:st,necessaryTarget:nt,createdTick:ep?.t??null,places:[...(ep?.places||[])]});
      }
      const keyDetails=[];
      for(const [k,ids] of byKey){
        const set=new Set(ids),only=evalIds(ids),minus=evalIds(fullIds.filter(id=>!set.has(id)));
        const sd=same(only,full),nd=!same(minus,full),st=targetEffect&&choiceTarget(P,only)===fullTarget,nt=targetEffect&&choiceTarget(P,minus)!==fullTarget;
        if(sd)suffKeyD.push(k);if(nd)necKeyD.push(k);if(st)suffKeyT.push(k);if(nt)necKeyT.push(k);
        keyDetails.push({key:k,identityCount:ids.length,footprintCount:keyFootCount.get(k)||0,sufficientDecision:sd,necessaryDecision:nd,sufficientTarget:st,necessaryTarget:nt});
      }
      const decisionClass=classify(suffKeyD,necKeyD,suffFootD,footToKey);agg.decision[decisionClass]++;
      agg.decisionMaxSufficientKeys=Math.max(agg.decisionMaxSufficientKeys,suffKeyD.length);if(suffKeyD.length>=2)agg.decisionMomentsWith2PlusSufficientKeys++;
      let targetClass=null;
      if(targetEffect){targetClass=classify(suffKeyT,necKeyT,suffFootT,footToKey);agg.target[targetClass]++;agg.targetMaxSufficientKeys=Math.max(agg.targetMaxSufficientKeys,suffKeyT.length);if(suffKeyT.length>=2)agg.targetMomentsWith2PlusSufficientKeys++}
      moments.push({tick:E.tick,party:P.id,currentPlace:I.currentPlace(P),danger:S.danger,activeIdentityCount:fullIds.length,relationKeyCount:byKey.size,footprintCount:byFoot.size,full,noLat,resolvedFullTarget:fullTarget,resolvedNoLatTarget:noLatTarget,decisionClass,targetClass,sufficientDecisionKeys:suffKeyD,necessaryDecisionKeys:necKeyD,sufficientTargetKeys:suffKeyT,necessaryTargetKeys:necKeyT,footprints:footDetails,keys:keyDetails});
    }

    choose=function(S0,P){
      if(S0!==S||MODELS[S0.key].kind!=='oasis'){baseChoose(S0,P);return}
      const idx=replayIndex[P.id]||0;I.activeField(S,P);
      const L=P.relationField?.latent,fullIds=[...(L?.activeIds||[])];let predicted=null;
      if(fullIds.length){
        agg.decisionsWithLatent++;const evalIds=makeEval(P),full=evalIds(fullIds),noLat=evalIds([]);predicted=full;
        if(changedSig(full,noLat)){agg.jointDecisionEffects++;if(choiceDifferent(P,full,noLat))agg.jointTargetEffects++;analyze(P,fullIds,full,noLat,evalIds)}
      }
      baseChoose(S0,P);
      if(targetTape[P.id]?.[idx]!==P.target)validity.replayMismatch++;
      if(predicted&&choiceTarget(P,predicted)!==P.target)validity.fullShadowTargetMismatch++;
      replayIndex[P.id]=idx+1;
    };

    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t));if(t%10000===0)console.log(`CR03R-PROGRESS ${t} joint=${agg.jointDecisionEffects} crossKeyD=${agg.decision.CROSS_KEY_OVERDETERMINATION} crossKeyT=${agg.target.CROSS_KEY_OVERDETERMINATION}`)}
    choose=baseChoose;
    const out={design:{maxTick:MAX_TICK,productionReplay:true,shadowOnly:true,groupLevels:['key+sorted-place-set footprint','relation key'],choiceSemantics:'resolved production target',primaryQuestion:'duplicate identity multiplicity versus distinct relation-structure alternative sufficiency',causalBoundary:'same-current mechanism only'},validity,aggregate:agg,moments,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination,fieldSpirals:S.c.relationFieldSpiral}};
    E=savedE;delete globalThis.__OASIS_CR03R_INTERNALS;return out;
  },MAX_TICK);

  if(result.validity.replayMismatch!==0)throw new Error(`CR03R replay mismatch ${result.validity.replayMismatch}`);
  if(result.validity.fullShadowTargetMismatch!==0)throw new Error(`CR03R full shadow target mismatch ${result.validity.fullShadowTargetMismatch}`);
  if(result.validity.representativeCompressionMismatch!==0)throw new Error(`CR03R representative compression mismatch ${result.validity.representativeCompressionMismatch}`);
  if(result.aggregate.jointDecisionEffects!==297)throw new Error(`CR03R expected 297 joint decision effects, got ${result.aggregate.jointDecisionEffects}`);
  if(result.aggregate.jointTargetEffects!==204)throw new Error(`CR03R expected 204 joint target effects, got ${result.aggregate.jointTargetEffects}`);
  console.log('OASIS-CR03R-REDUNDANCY-SOURCE '+JSON.stringify({validity:result.validity,aggregate:result.aggregate}));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
