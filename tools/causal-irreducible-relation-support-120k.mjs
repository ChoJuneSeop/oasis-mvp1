import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4214,MAX_TICK=120000;
const REPORT='causal-irreducible-relation-support-120k-report.json';
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
    const repl="function latentActive(S,P){\n  if(globalThis.__OASIS_CR03_OVERRIDE&&globalThis.__OASIS_CR03_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_CR03_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('CR03 latentActive patch target missing');src=src.replace(head,repl);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_CR03_INTERNALS={activeField,currentPlace,refreshHidden};\n\nreset();\n})();`;
    if(!src.includes(tail))throw new Error('CR03 exposure target missing');src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_CR03_INTERNALS,null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate((MAX_TICK)=>{
    const savedE=E,I=globalThis.__OASIS_CR03_INTERNALS,baseChoose=choose;
    const clone=x=>JSON.parse(JSON.stringify(x));
    const same=(a,b)=>!changedSig(a,b);
    const fnv=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

    // Pass 1: freeze actual production target tape.
    E={tick:0,worlds:{full:mkW('full')},paused:true};let S=E.worlds.full;
    const targetTape={};
    choose=function(S0,P){baseChoose(S0,P);if(S0===S&&MODELS[S0.key].kind==='oasis')(targetTape[P.id]??=[]).push(P.target)};
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t))}
    choose=baseChoose;

    // Pass 2: same production world, analysis-only shadows.
    E={tick:0,worlds:{full:mkW('full')},paused:true};S=E.worlds.full;
    const replayIndex={};let replayMismatch=0,fullShadowTargetMismatch=0,representativeEquivalenceViolations=0,minimalityViolations=0;
    const summary={
      decisionsWithLatent:0,jointDecisionEffectMoments:0,jointActualTargetEffectMoments:0,
      decisionInteractionOnlyMoments:0,targetInteractionOnlyMoments:0,
      decisionMomentsWithSupport:0,targetMomentsWithSupport:0,
      distinctDecisionSupportSets:0,distinctTargetSupportSets:0,
      alternativeDecisionSetMoments:0,alternativeTargetSetMoments:0,
      shadowEvaluations:0
    };
    const records=[];

    const choiceTarget=(P,g)=>{if(g?.choice?.startsWith('hidden:')&&MODELS[S.key].rel){const h=hiddenDefs.find(x=>x.id===g.choice.slice(7));return h?.places?.[h.places.length-1]||g.choice}return g?.choice||actionableIds(S,P,1)[0]||'road'};
    const choiceDifferent=(P,a,b)=>choiceTarget(P,a)!==choiceTarget(P,b);
    const footprint=(L,id)=>{const ep=L.byId.get(id);return `${ep?.key||'missing'}|${[...(ep?.places||[])].sort().join(',')}`};
    const groupFootprints=(L,ids)=>{const m=new Map();for(const id of ids){const f=footprint(L,id);if(!m.has(f))m.set(f,[]);m.get(f).push(id)}return m};

    function evalFactory(P){
      const F=P.relationField,L=F?.latent,cache=new Map();
      function evalIds(ids){
        const normalized=[...ids].sort();const ck=normalized.join('\u001f');if(cache.has(ck))return cache.get(ck);
        if(!L){const out=clone(sig(evalP(S,P,1)));cache.set(ck,out);return out}
        const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation,hiddenCandidates:[...(P.hiddenCandidates||[])],hiddenDone:[...(P.hiddenDone||[])],sHidden:S.c.hidden,sCand:S.c.cand,events:S.events.map(x=>({...x}))};
        globalThis.__OASIS_CR03_OVERRIDE={party:P.id,ids:normalized};let out;
        try{I.refreshHidden(S,P);out=clone(sig(evalP(S,P,1)))}finally{
          delete globalThis.__OASIS_CR03_OVERRIDE;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];P.target=saved.target;S.c.relationFieldActivation=saved.sAct;P.hiddenCandidates.clear();for(const id of saved.hiddenCandidates)P.hiddenCandidates.add(id);P.hiddenDone.clear();for(const id of saved.hiddenDone)P.hiddenDone.add(id);S.c.hidden=saved.sHidden;S.c.cand=saved.sCand;S.events=saved.events;
        }
        summary.shadowEvaluations++;cache.set(ck,out);return out;
      }
      return evalIds;
    }

    const orderings=(L,reps)=>({
      createdAsc:[...reps].sort((a,b)=>(L.byId.get(a)?.t??0)-(L.byId.get(b)?.t??0)||a.localeCompare(b)),
      createdDesc:[...reps].sort((a,b)=>(L.byId.get(b)?.t??0)-(L.byId.get(a)?.t??0)||a.localeCompare(b)),
      relationKey:[...reps].sort((a,b)=>(L.byId.get(a)?.key||'').localeCompare(L.byId.get(b)?.key||'')||(L.byId.get(a)?.t??0)-(L.byId.get(b)?.t??0)||a.localeCompare(b)),
      fnvHash:[...reps].sort((a,b)=>fnv(a)-fnv(b)||a.localeCompare(b))
    });

    function shrink1Minimal(start,ordered,predicate){
      let work=[...start],changed=true;
      while(changed){
        changed=false;
        for(const id of ordered){
          if(!work.includes(id))continue;
          const cand=work.filter(x=>x!==id);
          if(predicate(cand)){work=cand;changed=true}
        }
      }
      for(const id of work)if(predicate(work.filter(x=>x!==id)))minimalityViolations++;
      return work;
    }

    function metadata(L,byFoot,setIds){
      return setIds.map(id=>{const ep=L.byId.get(id),f=footprint(L,id),eq=byFoot.get(f)||[id];return{representative:id,equivalentProcessIds:[...eq],equivalenceCount:eq.length,createdTick:ep?.t??null,key:ep?.key??null,places:[...(ep?.places||[])],from:[...(ep?.from||[])]}});
    }

    function analyze(P,fullIds,full,noLat,evalIds){
      const L=P.relationField.latent,byFoot=groupFootprints(L,fullIds),reps=[...byFoot.values()].map(ids=>ids[0]);
      const repFull=evalIds(reps);
      if(!same(repFull,full)){representativeEquivalenceViolations++;throw new Error(`CR03 representative equivalence violated tick=${E.tick} party=${P.id}`)}
      const individualDecisionSufficient=reps.filter(id=>same(evalIds([id]),full));
      const fullTarget=choiceTarget(P,full),noLatTarget=choiceTarget(P,noLat),targetEffect=fullTarget!==noLatTarget;
      const individualTargetSufficient=targetEffect?reps.filter(id=>choiceTarget(P,evalIds([id]))===fullTarget):[];
      const decisionInteraction=individualDecisionSufficient.length===0;
      const targetInteraction=targetEffect&&individualTargetSufficient.length===0;
      if(decisionInteraction)summary.decisionInteractionOnlyMoments++;
      if(targetInteraction)summary.targetInteractionOnlyMoments++;
      if(!decisionInteraction&&!targetInteraction)return;

      const ords=orderings(L,reps),decisionSets=new Map(),targetSets=new Map();
      if(decisionInteraction){
        const pred=ids=>same(evalIds(ids),full);
        for(const [name,ord] of Object.entries(ords)){
          const set=shrink1Minimal(reps,ord,pred),key=[...set].sort().join('|');
          if(!decisionSets.has(key))decisionSets.set(key,{ids:set,orders:[]});decisionSets.get(key).orders.push(name);
        }
        if(decisionSets.size)summary.decisionMomentsWithSupport++;
        if(decisionSets.size>1)summary.alternativeDecisionSetMoments++;
        summary.distinctDecisionSupportSets+=decisionSets.size;
      }
      if(targetInteraction){
        const pred=ids=>choiceTarget(P,evalIds(ids))===fullTarget;
        for(const [name,ord] of Object.entries(ords)){
          const set=shrink1Minimal(reps,ord,pred),key=[...set].sort().join('|');
          if(!targetSets.has(key))targetSets.set(key,{ids:set,orders:[]});targetSets.get(key).orders.push(name);
        }
        if(targetSets.size)summary.targetMomentsWithSupport++;
        if(targetSets.size>1)summary.alternativeTargetSetMoments++;
        summary.distinctTargetSupportSets+=targetSets.size;
      }
      records.push({
        tick:E.tick,party:P.id,currentPlace:I.currentPlace(P),targetBefore:P.target,danger:S.danger,
        activeIdentityCount:fullIds.length,distinctFootprintCount:reps.length,
        full,noLat,resolvedFullTarget:fullTarget,resolvedNoLatTarget:noLatTarget,
        individualDecisionSufficientRepresentatives:individualDecisionSufficient,
        individualTargetSufficientRepresentatives:individualTargetSufficient,
        decisionSupportSets:[...decisionSets.values()].map(x=>({orders:x.orders,members:metadata(L,byFoot,x.ids)})),
        targetSupportSets:[...targetSets.values()].map(x=>({orders:x.orders,members:metadata(L,byFoot,x.ids)}))
      });
    }

    choose=function(S0,P){
      if(S0!==S||MODELS[S0.key].kind!=='oasis'){baseChoose(S0,P);return}
      const idx=replayIndex[P.id]||0;I.activeField(S,P);
      const L=P.relationField?.latent,fullIds=[...(L?.activeIds||[])];let predictedFull=null;
      if(fullIds.length){
        summary.decisionsWithLatent++;const evalIds=evalFactory(P),full=evalIds(fullIds),noLat=evalIds([]);predictedFull=full;
        if(changedSig(full,noLat)){summary.jointDecisionEffectMoments++;if(choiceDifferent(P,full,noLat))summary.jointActualTargetEffectMoments++;analyze(P,fullIds,full,noLat,evalIds)}
      }
      baseChoose(S0,P);
      if(targetTape[P.id]?.[idx]!==P.target)replayMismatch++;
      if(predictedFull&&choiceTarget(P,predictedFull)!==P.target)fullShadowTargetMismatch++;
      replayIndex[P.id]=idx+1;
    };
    for(let t=1;t<=MAX_TICK;t++){E.tick=t;tickW(S,env(t));if(t%10000===0)console.log(`CR03-PROGRESS ${t} joint=${summary.jointDecisionEffectMoments} interaction=${summary.decisionInteractionOnlyMoments} supports=${summary.distinctDecisionSupportSets}`)}
    choose=baseChoose;
    const out={
      design:{maxTick:MAX_TICK,productionReplay:true,shadowOnly:true,dependency:'CR-02 v2 validity must pass before this experiment is accepted',supportDefinition:'1-minimal under single-member deletion; not claimed globally minimum',searchOrders:['createdAsc','createdDesc','relationKey','fnvHash'],identityCompression:'same key + sorted place-set footprints are represented by one identity only after representative-only reproduces full signature',choiceSemantics:'resolved actual production target; hidden:* token is internal only',causalBoundary:'same-current irreducible joint support in current implementation only'},
      validity:{replayMismatch,fullShadowTargetMismatch,representativeEquivalenceViolations,minimalityViolations},summary,records,
      world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination,fieldSpirals:S.c.relationFieldSpiral}
    };
    E=savedE;delete globalThis.__OASIS_CR03_INTERNALS;return out;
  },MAX_TICK);

  if(result.validity.replayMismatch!==0)throw new Error(`CR03 production replay mismatch ${result.validity.replayMismatch}`);
  if(result.validity.fullShadowTargetMismatch!==0)throw new Error(`CR03 full shadow target mismatch ${result.validity.fullShadowTargetMismatch}`);
  if(result.validity.representativeEquivalenceViolations!==0)throw new Error(`CR03 representative equivalence violations ${result.validity.representativeEquivalenceViolations}`);
  if(result.validity.minimalityViolations!==0)throw new Error(`CR03 1-minimality violations ${result.validity.minimalityViolations}`);
  console.log('OASIS-CR03-IRREDUCIBLE-SUPPORT '+JSON.stringify({validity:result.validity,summary:result.summary}));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
