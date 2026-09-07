import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4213,MAX_TICK=120000;
const REPORT='causal-joint-individual-attribution-120k-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch();let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const repl="function latentActive(S,P){\n  if(globalThis.__OASIS_CAUSAL_OVERRIDE&&globalThis.__OASIS_CAUSAL_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_CAUSAL_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('latentActive patch target missing');
    src=src.replace(head,repl);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_CAUSAL_INTERNALS={ensureLatent,activeField,currentPlace};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('exposure target missing');
    src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_CAUSAL_INTERNALS,null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate((MAX_TICK)=>{
    const savedE=E,I=globalThis.__OASIS_CAUSAL_INTERNALS,baseChoose=choose;
    const clone=x=>JSON.parse(JSON.stringify(x));

    // Pass 1 freezes the production choice tape. It is not a shadow world.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const choiceTape={};
    choose=function(S0,P){baseChoose(S0,P);if(S0===S&&MODELS[S0.key].kind==='oasis')(choiceTape[P.id]??=[]).push(P.target)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    // Pass 2 replays the same world and performs same-current analysis-only shadows.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const replayIndex={};let replayMismatch=0,fullChoiceMismatch=0;
    const agg={
      decisionsWithLatent:0,jointDecisionDiffMoments:0,jointChoiceDiffMoments:0,
      activeIdentitySumAtJoint:0,keyGroupsTested:0,footprintGroupsTested:0,
      duplicateFootprintChecks:0,duplicateFootprintViolations:0,
      individualIdentityOccurrences:0,
      individuallyNecessaryDecisionOccurrences:0,individuallySufficientDecisionOccurrences:0,
      individuallyNecessaryChoiceOccurrences:0,individuallySufficientChoiceOccurrences:0,
      decisionMomentsWithNecessaryIndividual:0,decisionMomentsWithSufficientIndividual:0,
      decisionRedundantOrOverdeterminedMoments:0,decisionInteractionOnlyMoments:0,
      choiceMomentsWithNecessaryIndividual:0,choiceMomentsWithSufficientIndividual:0,
      choiceRedundantOrOverdeterminedMoments:0,choiceInteractionOnlyMoments:0,
      keyNecessaryDecisionOccurrences:0,keySufficientDecisionOccurrences:0,
      keyNecessaryChoiceOccurrences:0,keySufficientChoiceOccurrences:0,
      footprintNecessaryDecisionOccurrences:0,footprintSufficientDecisionOccurrences:0,
      footprintNecessaryChoiceOccurrences:0,footprintSufficientChoiceOccurrences:0
    };
    const examples=[];

    function evalIds(P,ids){
      const F=P.relationField,L=F?.latent;
      if(!L)return clone(sig(evalP(S,P,1)));
      const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation};
      globalThis.__OASIS_CAUSAL_OVERRIDE={party:P.id,ids};
      let out;
      try{out=clone(sig(evalP(S,P,1)))}finally{
        delete globalThis.__OASIS_CAUSAL_OVERRIDE;
        F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;
        L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];
        P.target=saved.target;S.c.relationFieldActivation=saved.sAct;
      }
      return out;
    }
    const same=(a,b)=>!changedSig(a,b);
    const choiceDifferent=(a,b)=>a.choice!==b.choice;
    const groupBy=(ids,fn)=>{const m=new Map();for(const id of ids){const k=fn(id);if(!m.has(k))m.set(k,[]);m.get(k).push(id)}return m};

    function decompose(P,fullIds,full,noLat){
      const L=P.relationField.latent;
      const byKey=groupBy(fullIds,id=>L.byId.get(id)?.key||`missing:${id}`);
      const footprint=id=>{const ep=L.byId.get(id);return `${ep?.key||'missing'}|${[...(ep?.places||[])].sort().join(',')}`};
      const byFoot=groupBy(fullIds,footprint);
      let nIndNecD=0,nIndSufD=0,nIndNecC=0,nIndSufC=0;
      let nKeyNecD=0,nKeySufD=0,nKeyNecC=0,nKeySufC=0;
      let nFootNecD=0,nFootSufD=0,nFootNecC=0,nFootSufC=0;
      const fullChoiceEffect=choiceDifferent(full,noLat);

      for(const ids of byKey.values()){
        agg.keyGroupsTested++;
        const set=new Set(ids),minus=fullIds.filter(id=>!set.has(id));
        const minusSig=evalIds(P,minus),onlySig=evalIds(P,ids);
        const necD=!same(full,minusSig),sufD=same(full,onlySig);
        const necC=fullChoiceEffect&&choiceDifferent(full,minusSig),sufC=fullChoiceEffect&&onlySig.choice===full.choice;
        if(necD)nKeyNecD++;if(sufD)nKeySufD++;if(necC)nKeyNecC++;if(sufC)nKeySufC++;
      }

      for(const ids of byFoot.values()){
        agg.footprintGroupsTested++;
        const set=new Set(ids),minus=fullIds.filter(id=>!set.has(id));
        const minusSig=evalIds(P,minus),onlyFoot=evalIds(P,ids);
        const necD=!same(full,minusSig),sufD=same(full,onlyFoot);
        const necC=fullChoiceEffect&&choiceDifferent(full,minusSig),sufC=fullChoiceEffect&&onlyFoot.choice===full.choice;
        if(necD)nFootNecD++;if(sufD)nFootSufD++;if(necC)nFootNecC++;if(sufC)nFootSufC++;

        if(ids.length===1){
          agg.individualIdentityOccurrences++;
          if(necD)nIndNecD++;if(sufD)nIndSufD++;if(necC)nIndNecC++;if(sufC)nIndSufC++;
        }else{
          // Same key + same place-set is decision-equivalent in the current implementation.
          // Verify that count itself is not secretly used before applying structural redundancy.
          agg.duplicateFootprintChecks++;
          const rep=ids[0],minusRep=evalIds(P,fullIds.filter(id=>id!==rep)),onlyRep=evalIds(P,[rep]);
          if(!same(full,minusRep)||!same(onlyFoot,onlyRep)){
            agg.duplicateFootprintViolations++;
            throw new Error(`duplicate decision-footprint assumption violated at tick ${E.tick} party ${P.id}`);
          }
          agg.individualIdentityOccurrences+=ids.length;
          // Every duplicate identity is individually non-necessary, but any one has the same only-one effect.
          if(same(full,onlyRep))nIndSufD+=ids.length;
          if(fullChoiceEffect&&onlyRep.choice===full.choice)nIndSufC+=ids.length;
        }
      }

      agg.individuallyNecessaryDecisionOccurrences+=nIndNecD;agg.individuallySufficientDecisionOccurrences+=nIndSufD;
      agg.individuallyNecessaryChoiceOccurrences+=nIndNecC;agg.individuallySufficientChoiceOccurrences+=nIndSufC;
      agg.keyNecessaryDecisionOccurrences+=nKeyNecD;agg.keySufficientDecisionOccurrences+=nKeySufD;
      agg.keyNecessaryChoiceOccurrences+=nKeyNecC;agg.keySufficientChoiceOccurrences+=nKeySufC;
      agg.footprintNecessaryDecisionOccurrences+=nFootNecD;agg.footprintSufficientDecisionOccurrences+=nFootSufD;
      agg.footprintNecessaryChoiceOccurrences+=nFootNecC;agg.footprintSufficientChoiceOccurrences+=nFootSufC;

      if(nIndNecD>0)agg.decisionMomentsWithNecessaryIndividual++;
      if(nIndSufD>0)agg.decisionMomentsWithSufficientIndividual++;
      if(nIndNecD===0&&nIndSufD>0)agg.decisionRedundantOrOverdeterminedMoments++;
      if(nIndSufD===0)agg.decisionInteractionOnlyMoments++;
      if(fullChoiceEffect){
        if(nIndNecC>0)agg.choiceMomentsWithNecessaryIndividual++;
        if(nIndSufC>0)agg.choiceMomentsWithSufficientIndividual++;
        if(nIndNecC===0&&nIndSufC>0)agg.choiceRedundantOrOverdeterminedMoments++;
        if(nIndSufC===0)agg.choiceInteractionOnlyMoments++;
      }
      return {activeIds:fullIds.length,keyGroups:byKey.size,footprintGroups:byFoot.size,nIndNecD,nIndSufD,nIndNecC,nIndSufC,nKeyNecD,nKeySufD,nKeyNecC,nKeySufC,nFootNecD,nFootSufD,nFootNecC,nFootSufC};
    }

    choose=function(S0,P){
      if(S0!==S||MODELS[S0.key].kind!=='oasis'){baseChoose(S0,P);return}
      const idx=replayIndex[P.id]||0;
      I.activeField(S,P);
      const L=P.relationField?.latent,fullIds=[...(L?.activeIds||[])];
      let predictedFull=null;
      if(fullIds.length){
        agg.decisionsWithLatent++;
        const full=evalIds(P,fullIds),noLat=evalIds(P,[]);predictedFull=full;
        if(changedSig(full,noLat)){
          agg.jointDecisionDiffMoments++;if(full.choice!==noLat.choice)agg.jointChoiceDiffMoments++;
          agg.activeIdentitySumAtJoint+=fullIds.length;
          const d=decompose(P,fullIds,full,noLat);
          if(examples.length<30)examples.push({tick:E.tick,party:P.id,here:I.currentPlace(P),targetBefore:P.target,danger:S.danger,full,noLat,...d});
        }
      }
      baseChoose(S0,P);
      if(choiceTape[P.id]?.[idx]!==P.target)replayMismatch++;
      if(predictedFull&&predictedFull.choice!==P.target)fullChoiceMismatch++;
      replayIndex[P.id]=idx+1;
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t));if(t%10000===0)console.log(`CR02-PROGRESS ${t} joint=${agg.jointDecisionDiffMoments} choice=${agg.jointChoiceDiffMoments}`)}
    choose=baseChoose;
    const world={actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination,fieldSpirals:S.c.relationFieldSpiral};
    const decisionClassification={
      necessaryIndividual:agg.decisionMomentsWithNecessaryIndividual,
      sufficientIndividual:agg.decisionMomentsWithSufficientIndividual,
      redundantOrOverdeterminedNoNecessary:agg.decisionRedundantOrOverdeterminedMoments,
      interactionOnlyNoIndividualSufficient:agg.decisionInteractionOnlyMoments
    };
    const choiceClassification={
      necessaryIndividual:agg.choiceMomentsWithNecessaryIndividual,
      sufficientIndividual:agg.choiceMomentsWithSufficientIndividual,
      redundantOrOverdeterminedNoNecessary:agg.choiceRedundantOrOverdeterminedMoments,
      interactionOnlyNoIndividualSufficient:agg.choiceInteractionOnlyMoments
    };
    const out={
      design:{maxTick:MAX_TICK,productionReplay:true,shadowOnly:true,unit:'same-current latent process identity',hierarchy:['relation-key','decision-footprint(key+place-set)','episode identity'],definitions:{necessary:'full minus unit changes full signature/choice',sufficient:'unit alone reproduces full signature/choice relative to no-latent state'},duplicateIdentityRule:'same key + same place-set duplicates are structurally equivalent only after representative removal/only-one equivalence is verified',causalBoundary:'same-current necessity/sufficiency and joint contribution in this implementation; not general actual-causation proof'},
      validity:{replayMismatch,fullChoiceMismatch,duplicateFootprintViolations:agg.duplicateFootprintViolations},
      aggregate:agg,decisionClassification,choiceClassification,
      meanActiveIdentitiesAtJoint:agg.jointDecisionDiffMoments?agg.activeIdentitySumAtJoint/agg.jointDecisionDiffMoments:0,
      examples,world
    };
    E=savedE;delete globalThis.__OASIS_CAUSAL_INTERNALS;return out;
  },MAX_TICK);

  if(result.validity.replayMismatch!==0)throw new Error(`production replay mismatch ${result.validity.replayMismatch}`);
  if(result.validity.fullChoiceMismatch!==0)throw new Error(`full shadow choice mismatch ${result.validity.fullChoiceMismatch}`);
  if(result.validity.duplicateFootprintViolations!==0)throw new Error(`duplicate footprint violations ${result.validity.duplicateFootprintViolations}`);
  if(result.aggregate.jointDecisionDiffMoments<=0)throw new Error('no joint latent decision differences observed');
  console.log('OASIS-CR02-JOINT-INDIVIDUAL '+JSON.stringify({validity:result.validity,jointDecisionDiffMoments:result.aggregate.jointDecisionDiffMoments,jointChoiceDiffMoments:result.aggregate.jointChoiceDiffMoments,decisionClassification:result.decisionClassification,choiceClassification:result.choiceClassification,meanActiveIdentitiesAtJoint:result.meanActiveIdentitiesAtJoint}));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
