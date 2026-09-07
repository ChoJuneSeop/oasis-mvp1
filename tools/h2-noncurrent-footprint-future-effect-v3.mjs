import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4219;
const HARVEST_MAX_TICK=110000;
const FIRST_CHECKPOINT=15000;
const CHECKPOINT_GAP=25000;
const CHECKPOINT_COUNT=3;
const FOLLOW_HORIZON=15000;
const TARGET_PARTY='blue';
const REPORT='h2-noncurrent-footprint-future-effect-v3-report.json';

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
    const response=await route.fetch();
    let src=await response.text();
    const tail='reset();\n})();';
    const exposed='globalThis.__OASIS_H2F_INTERNALS={activeField};\n\nreset();\n})();';
    if(!src.includes(tail))throw new Error('H2F exposure target missing');
    src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function'&&globalThis.__OASIS_H2F_INTERNALS,null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY})=>{
    const savedE=E;
    const productionChoose=choose;
    const I=globalThis.__OASIS_H2F_INTERNALS;
    const clone=x=>structuredClone(x);
    const party=(S,id)=>S.parties.find(p=>p.id===id);
    const latent=(S,id)=>party(S,id)?.relationField?.latent||null;
    const footprint=ep=>`${ep.key}|${[...(ep.places||[])].sort().join(',')}`;

    function behaviorState(S,id){
      const P=party(S,id);
      return {danger:S.danger,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),members:P.members.map(m=>[m.name,m.x,m.y,m.hp])};
    }
    const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

    function worldObservable(S){
      return {
        danger:S.danger,
        counters:{actions:S.c.actions,rel:S.c.rel,recomb:S.c.relationRecombination,act:S.c.relationFieldActivation},
        parties:S.parties.map(P=>({
          id:P.id,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),
          relationHistoryLength:P.relationHistory.length,
          recent:(P.relationField?.episodes||[]).map(ep=>[ep.t,footprint(ep)]),
          latent:[...(P.relationField?.latent?.byId||new Map()).entries()].map(([id,ep])=>[id,footprint(ep)]),
          activeIds:[...(P.relationField?.latent?.activeIds||[])].sort(),
          members:P.members.map(m=>[m.name,m.x,m.y,m.hp])
        }))
      };
    }

    function storedEpisodes(S,id){
      const P=party(S,id),L=latent(S,id);
      const out=[...(P?.relationField?.episodes||[])];
      if(L)for(const ep of L.byId.values())out.push(ep);
      return out;
    }

    function activeEpisodes(S,id){
      const P=party(S,id);
      return I.activeField(S,P).map(ep=>ep);
    }

    function ablateFootprints(S,id,removedFootprints){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      if(!F)return {removedRecentEpisodes:0,removedLatentEpisodes:0};
      const beforeRecent=F.episodes.length;
      F.episodes=F.episodes.filter(ep=>!removedFootprints.has(footprint(ep)));
      let removedLatentEpisodes=0;
      if(L){
        for(const [episodeId,ep] of [...L.byId.entries()])if(removedFootprints.has(footprint(ep))){L.byId.delete(episodeId);removedLatentEpisodes++}
        const nextByClue=new Map();
        for(const [clue,ids] of L.byClue){
          const next=new Set([...ids].filter(episodeId=>L.byId.has(episodeId)));
          if(next.size)nextByClue.set(clue,next);
        }
        L.byClue=nextByClue;
        L.activeIds=(L.activeIds||[]).filter(episodeId=>L.byId.has(episodeId));
        L.cacheKey=null;L.cacheEpisodes=[];
      }
      return {removedRecentEpisodes:beforeRecent-F.episodes.length,removedLatentEpisodes};
    }

    // Phase 1: harvest autonomous checkpoints where an active key also has stored but currently nonactive footprints.
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    let canonical=E.worlds.full;
    let targetDecisionThisTick=false;
    choose=function(S,P){productionChoose(S,P);if(S===canonical&&P.id===TARGET_PARTY)targetDecisionThisTick=true};
    const checkpoints=[];
    let nextCheckpoint=FIRST_CHECKPOINT;
    for(let t=1;t<=HARVEST_MAX_TICK&&checkpoints.length<CHECKPOINT_COUNT;t++){
      E.tick=t;targetDecisionThisTick=false;tickW(canonical,env(t));
      if(!targetDecisionThisTick||t<nextCheckpoint)continue;
      const active=activeEpisodes(canonical,TARGET_PARTY);
      const activeF=new Set(active.map(footprint));
      const activeKeys=new Set(active.map(ep=>ep.key));
      const stored=storedEpisodes(canonical,TARGET_PARTY);
      const storedF=new Map();
      for(const ep of stored){const f=footprint(ep);if(!storedF.has(f))storedF.set(f,ep)}
      const treatment=[...storedF.entries()].filter(([f,ep])=>activeKeys.has(ep.key)&&!activeF.has(f)).map(([f])=>f);
      if(!activeF.size||!treatment.length)continue;
      const P=party(canonical,TARGET_PARTY);
      checkpoints.push({
        checkpointTick:t,snapshot:clone(canonical),target:P.target,leader:P.leader,currentPlace:currentPlace(P),
        activeFootprints:[...activeF],activeKeys:[...activeKeys],treatmentFootprints:treatment,
        storedFootprintCount:storedF.size,latentCount:latent(canonical,TARGET_PARTY)?.byId?.size||0
      });
      nextCheckpoint=t+CHECKPOINT_GAP;
    }
    choose=productionChoose;

    const experiments=[];
    let totalTwinMismatch=0,pairsWithTreatmentFootprintReactivation=0,pairsWithBehaviorDivergence=0,pairsWithReactivationBeforeDivergence=0,pairsWithAblatedRegeneration=0;

    for(const cp of checkpoints){
      const full=clone(cp.snapshot),twin=clone(cp.snapshot),ablated=clone(cp.snapshot);
      const removed=new Set(cp.treatmentFootprints);
      const fullInitialWorld=worldObservable(full),twinInitialWorld=worldObservable(twin);
      const fullInitialBehavior=behaviorState(full,TARGET_PARTY),ablatedBehaviorPre=behaviorState(ablated,TARGET_PARTY);
      const activeBefore=new Set(activeEpisodes(ablated,TARGET_PARTY).map(footprint));
      const ablation=ablateFootprints(ablated,TARGET_PARTY,removed);
      const activeAfter=new Set(activeEpisodes(ablated,TARGET_PARTY).map(footprint));
      const ablatedBehaviorPost=behaviorState(ablated,TARGET_PARTY);
      const activePreserved=activeBefore.size===activeAfter.size&&[...activeBefore].every(f=>activeAfter.has(f));
      const initialBehaviorPreserved=equal(fullInitialBehavior,ablatedBehaviorPost)&&equal(ablatedBehaviorPre,ablatedBehaviorPost);

      let twinMismatchCount=0,firstTwinMismatchTick=null;
      let firstRemovedFootprintReactivationTick=null,firstAblatedRegenerationTick=null;
      const reactivated=new Set(),regenerated=new Set();
      let firstBehaviorDivergenceTick=null,firstTargetDivergenceTick=null,firstLeaderDivergenceTick=null,firstCandidateSignatureDivergenceTick=null,firstCurrentPlaceDivergenceTick=null;
      const examples=[];

      for(let dt=1;dt<=FOLLOW_HORIZON;dt++){
        const t=cp.checkpointTick+dt;E.tick=t;const ex=env(t);
        tickW(full,clone(ex));tickW(twin,clone(ex));tickW(ablated,clone(ex));
        if(!equal(worldObservable(full),worldObservable(twin))){twinMismatchCount++;if(firstTwinMismatchTick===null)firstTwinMismatchTick=t}

        const fullActiveF=new Set(activeEpisodes(full,TARGET_PARTY).map(footprint));
        const reactivatedNow=[...removed].filter(f=>fullActiveF.has(f));
        if(reactivatedNow.length){if(firstRemovedFootprintReactivationTick===null)firstRemovedFootprintReactivationTick=t;for(const f of reactivatedNow)reactivated.add(f)}

        const abStoredF=new Set(storedEpisodes(ablated,TARGET_PARTY).map(footprint));
        const regeneratedNow=[...removed].filter(f=>abStoredF.has(f));
        if(regeneratedNow.length){if(firstAblatedRegenerationTick===null)firstAblatedRegenerationTick=t;for(const f of regeneratedNow)regenerated.add(f)}

        const Pf=party(full,TARGET_PARTY),Pa=party(ablated,TARGET_PARTY);
        const targetDiff=Pf.target!==Pa.target,leaderDiff=Pf.leader!==Pa.leader,candDiff=Pf.last!==Pa.last,placeDiff=currentPlace(Pf)!==currentPlace(Pa);
        if(targetDiff&&firstTargetDivergenceTick===null)firstTargetDivergenceTick=t;
        if(leaderDiff&&firstLeaderDivergenceTick===null)firstLeaderDivergenceTick=t;
        if(candDiff&&firstCandidateSignatureDivergenceTick===null)firstCandidateSignatureDivergenceTick=t;
        if(placeDiff&&firstCurrentPlaceDivergenceTick===null)firstCurrentPlaceDivergenceTick=t;
        if((targetDiff||leaderDiff||candDiff)&&firstBehaviorDivergenceTick===null)firstBehaviorDivergenceTick=t;

        if(examples.length<10&&(reactivatedNow.length||regeneratedNow.length||targetDiff||leaderDiff||candDiff))examples.push({
          tick:t,reactivatedRemovedFootprints:reactivatedNow,regeneratedRemovedFootprints:regeneratedNow,
          full:{target:Pf.target,leader:Pf.leader,last:Pf.last,currentPlace:currentPlace(Pf),activeFootprints:[...fullActiveF]},
          ablated:{target:Pa.target,leader:Pa.leader,last:Pa.last,currentPlace:currentPlace(Pa),activeFootprints:activeEpisodes(ablated,TARGET_PARTY).map(footprint)}
        });
      }

      const reactivationBeforeDivergence=firstRemovedFootprintReactivationTick!==null&&firstBehaviorDivergenceTick!==null&&firstRemovedFootprintReactivationTick<=firstBehaviorDivergenceTick;
      totalTwinMismatch+=twinMismatchCount;
      if(firstRemovedFootprintReactivationTick!==null)pairsWithTreatmentFootprintReactivation++;
      if(firstBehaviorDivergenceTick!==null)pairsWithBehaviorDivergence++;
      if(reactivationBeforeDivergence)pairsWithReactivationBeforeDivergence++;
      if(firstAblatedRegenerationTick!==null)pairsWithAblatedRegeneration++;

      experiments.push({
        checkpoint:{tick:cp.checkpointTick,target:cp.target,leader:cp.leader,currentPlace:cp.currentPlace,latentCount:cp.latentCount,storedFootprintCount:cp.storedFootprintCount,activeKeyCount:cp.activeKeys.length,activeFootprintCount:cp.activeFootprints.length,treatmentFootprintCount:cp.treatmentFootprints.length,activeKeys:cp.activeKeys,treatmentFootprints:cp.treatmentFootprints.slice(0,30)},
        initialization:{source:'structured clone of autonomous canonical snapshot, treated as new experiment initial condition',treatment:'remove stored but currently nonactive key+sorted-place-set footprints whose relation key remains represented by at least one currently active footprint',removedRecentEpisodes:ablation.removedRecentEpisodes,removedLatentEpisodes:ablation.removedLatentEpisodes,activeFootprintsPreserved:activePreserved,initialBehaviorPreserved,fullEqualsTwinBeforeRun:equal(fullInitialWorld,twinInitialWorld),experimenterInterventionCountAfterInitialization:0},
        validity:{twinMismatchCount,firstTwinMismatchTick},
        result:{firstRemovedFootprintReactivationTick,distinctRemovedFootprintsReactivated:reactivated.size,firstAblatedRegenerationTick,distinctRemovedFootprintsRegeneratedInAblatedBranch:regenerated.size,firstBehaviorDivergenceTick,firstTargetDivergenceTick,firstLeaderDivergenceTick,firstCandidateSignatureDivergenceTick,firstCurrentPlaceDivergenceTick,reactivationBeforeOrAtBehaviorDivergence:reactivationBeforeDivergence,behaviorDivergenceObserved:firstBehaviorDivergenceTick!==null,targetDivergenceObserved:firstTargetDivergenceTick!==null},
        examples
      });
    }

    const validityPass=checkpoints.length===CHECKPOINT_COUNT&&totalTwinMismatch===0&&experiments.every(x=>x.initialization.activeFootprintsPreserved&&x.initialization.initialBehaviorPreserved&&x.initialization.fullEqualsTwinBeforeRun&&x.initialization.experimenterInterventionCountAfterInitialization===0);
    let grade;
    if(!validityPass)grade='INVALID';
    else if(pairsWithReactivationBeforeDivergence>0)grade='SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_NONCURRENT_RELATIONAL_FOOTPRINT_FUTURE_BEHAVIOR_EFFECT';
    else if(pairsWithTreatmentFootprintReactivation>0)grade='NOT_SUPPORTED_FOR_RELATIONAL_FOOTPRINT_BEHAVIOR_DIVERGENCE_WITHIN_TESTED_HORIZON';
    else grade='INCONCLUSIVE_REMOVED_FOOTPRINTS_NOT_REACTIVATED_WITHIN_HORIZON';

    const out={
      system:{name:'OASIS Causal Research System',version:'3.0',hypothesis:'H2 noncurrent relational-footprint future effect'},
      question:'Can stored but currently nonactive relational footprints within relation keys that remain active later re-enter the current reality and change autonomous behavior under identical exogenous conditions?',
      design:{harvestMaxTick:HARVEST_MAX_TICK,checkpointCountRequested:CHECKPOINT_COUNT,checkpointCountObserved:checkpoints.length,checkpointGap:CHECKPOINT_GAP,followHorizon:FOLLOW_HORIZON,targetParty:TARGET_PARTY,unit:'relational decision footprint = relation key + sorted place/context coverage',treatmentBoundary:'only nonactive footprints inside relation keys that remain active are removed at initialization',noExperimenterInterventionAfterInitialization:true,nonAnticipatory:true,divergedRealitiesNotReset:true},
      validity:{validityPass,totalTwinMismatch},
      summary:{pairs:experiments.length,pairsWithTreatmentFootprintReactivation,pairsWithBehaviorDivergence,pairsWithReactivationBeforeOrAtBehaviorDivergence:pairsWithReactivationBeforeDivergence,pairsWithAblatedRegeneration,grade},
      evidence:{noncurrentRelationalFootprintFutureBehaviorEffectObserved:validityPass&&pairsWithReactivationBeforeDivergence>0,wholePastRelationalStructureJointNecessityValidated:false,wholePastRelationalStructureJointSufficiencyValidated:false,realWorldGeneralization:false},
      experiments
    };
    E=savedE;choose=productionChoose;delete globalThis.__OASIS_H2F_INTERNALS;return out;
  },{HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY});

  if(!result.validity.validityPass)throw new Error(`H2 noncurrent-footprint validity failed: ${JSON.stringify(result.validity)}`);
  console.log('OASIS-H2-NONCURRENT-FOOTPRINT-FUTURE-EFFECT '+JSON.stringify(result.summary));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
