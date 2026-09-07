import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4217;
const HARVEST_MAX_TICK=90000;
const FIRST_CHECKPOINT=15000;
const CHECKPOINT_GAP=25000;
const CHECKPOINT_COUNT=3;
const FOLLOW_HORIZON=15000;
const TARGET_PARTY='blue';
const REPORT='h2-noncurrent-past-future-effect-v3-report.json';

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
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY})=>{
    const savedE=E;
    const productionChoose=choose;
    const clone=x=>structuredClone(x);
    const party=(S,id)=>S.parties.find(p=>p.id===id);
    const latent=(S,id)=>party(S,id)?.relationField?.latent||null;
    const setEq=(a,b)=>a.size===b.size&&[...a].every(x=>b.has(x));

    function branchObservable(S){
      return {
        danger:S.danger,
        counters:{
          actions:S.c.actions,
          rel:S.c.rel,
          recombinations:S.c.relationRecombination,
          activations:S.c.relationFieldActivation
        },
        parties:S.parties.map(P=>({
          id:P.id,
          target:P.target,
          leader:P.leader,
          last:P.last,
          currentPlace:currentPlace(P),
          relationHistoryLength:P.relationHistory.length,
          recentEpisodeCount:P.relationField?.episodes?.length||0,
          latentCount:P.relationField?.latent?.byId?.size||0,
          latentActiveIds:[...(P.relationField?.latent?.activeIds||[])].sort(),
          choiceHistoryLength:P.choiceHistory.length,
          members:P.members.map(m=>[m.name,m.x,m.y,m.hp])
        }))
      };
    }
    const obsEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

    function pruneCurrentlyInactiveLatent(S,id,keepActiveIds){
      const P=party(S,id),L=P?.relationField?.latent;
      if(!L)return {removedIds:[],keptIds:[]};
      const keep=new Set(keepActiveIds);
      const removedIds=[];
      for(const k of [...L.byId.keys()])if(!keep.has(k)){removedIds.push(k);L.byId.delete(k)}
      const nextByClue=new Map();
      for(const [clue,ids] of L.byClue){
        const next=new Set([...ids].filter(k=>keep.has(k)&&L.byId.has(k)));
        if(next.size)nextByClue.set(clue,next);
      }
      L.byClue=nextByClue;
      L.activeIds=(L.activeIds||[]).filter(k=>keep.has(k)&&L.byId.has(k));
      L.cacheKey=null;
      L.cacheEpisodes=[];
      return {removedIds,keptIds:[...L.byId.keys()]};
    }

    // Phase 1 — harvest real autonomous canonical snapshots. No intervention is made.
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    let canonical=E.worlds.full;
    let targetDecisionThisTick=false;
    choose=function(S,P){
      productionChoose(S,P);
      if(S===canonical&&P.id===TARGET_PARTY)targetDecisionThisTick=true;
    };
    const checkpoints=[];
    let nextCheckpoint=FIRST_CHECKPOINT;
    for(let t=1;t<=HARVEST_MAX_TICK&&checkpoints.length<CHECKPOINT_COUNT;t++){
      E.tick=t;
      targetDecisionThisTick=false;
      tickW(canonical,env(t));
      if(!targetDecisionThisTick||t<nextCheckpoint)continue;
      const P=party(canonical,TARGET_PARTY),L=P?.relationField?.latent;
      if(!L)continue;
      const activeIds=[...(L.activeIds||[])].filter(id=>L.byId.has(id));
      const inactiveCount=L.byId.size-activeIds.length;
      if(activeIds.length<1||inactiveCount<50)continue;
      checkpoints.push({
        checkpointTick:t,
        snapshot:clone(canonical),
        activeLatentIds:activeIds,
        totalLatent:L.byId.size,
        inactiveLatent:inactiveCount,
        target:P.target,
        leader:P.leader,
        currentPlace:currentPlace(P)
      });
      nextCheckpoint=t+CHECKPOINT_GAP;
    }
    choose=productionChoose;

    const experiments=[];
    let totalTwinMismatch=0;
    let totalPairsWithRemovedReactivation=0;
    let totalPairsWithBehaviorDivergence=0;
    let totalPairsWithReactivationBeforeDivergence=0;

    for(const cp of checkpoints){
      const full=clone(cp.snapshot);
      const twin=clone(cp.snapshot);
      const ablated=clone(cp.snapshot);
      full.__h2Branch='full-past';
      twin.__h2Branch='full-twin';
      ablated.__h2Branch='inactive-latent-ablated';

      const initialFullObs=branchObservable(full);
      const initialTwinObs=branchObservable(twin);
      const initialAblatedPre=branchObservable(ablated);
      const prune=pruneCurrentlyInactiveLatent(ablated,TARGET_PARTY,cp.activeLatentIds);
      const initialAblatedPost=branchObservable(ablated);
      const removedSet=new Set(prune.removedIds);

      const initialActiveFull=new Set(latent(full,TARGET_PARTY)?.activeIds||[]);
      const initialActiveAblated=new Set(latent(ablated,TARGET_PARTY)?.activeIds||[]);
      const activeSetPreservedAtInitialization=setEq(initialActiveFull,initialActiveAblated);

      let firstRemovedReactivationTick=null;
      const reactivatedRemovedIds=new Set();
      let firstTargetDivergenceTick=null;
      let firstLeaderDivergenceTick=null;
      let firstCandidateSignatureDivergenceTick=null;
      let firstBehaviorDivergenceTick=null;
      let firstCurrentPlaceDivergenceTick=null;
      let twinMismatchCount=0;
      let firstTwinMismatchTick=null;
      const examples=[];

      for(let dt=1;dt<=FOLLOW_HORIZON;dt++){
        const t=cp.checkpointTick+dt;
        E.tick=t;
        const ex=env(t);
        tickW(full,clone(ex));
        tickW(twin,clone(ex));
        tickW(ablated,clone(ex));

        const fullObs=branchObservable(full),twinObs=branchObservable(twin);
        if(!obsEqual(fullObs,twinObs)){
          twinMismatchCount++;
          if(firstTwinMismatchTick===null)firstTwinMismatchTick=t;
        }

        const Pf=party(full,TARGET_PARTY),Pa=party(ablated,TARGET_PARTY);
        const Lf=latent(full,TARGET_PARTY);
        const newlyActive=(Lf?.activeIds||[]).filter(id=>removedSet.has(id));
        if(newlyActive.length){
          if(firstRemovedReactivationTick===null)firstRemovedReactivationTick=t;
          for(const id of newlyActive)reactivatedRemovedIds.add(id);
        }

        const targetDiff=Pf.target!==Pa.target;
        const leaderDiff=Pf.leader!==Pa.leader;
        const candDiff=Pf.last!==Pa.last;
        const placeDiff=currentPlace(Pf)!==currentPlace(Pa);
        if(targetDiff&&firstTargetDivergenceTick===null)firstTargetDivergenceTick=t;
        if(leaderDiff&&firstLeaderDivergenceTick===null)firstLeaderDivergenceTick=t;
        if(candDiff&&firstCandidateSignatureDivergenceTick===null)firstCandidateSignatureDivergenceTick=t;
        if(placeDiff&&firstCurrentPlaceDivergenceTick===null)firstCurrentPlaceDivergenceTick=t;
        if((targetDiff||leaderDiff||candDiff)&&firstBehaviorDivergenceTick===null)firstBehaviorDivergenceTick=t;

        if(examples.length<8&&(newlyActive.length||targetDiff||leaderDiff||candDiff)){
          examples.push({
            tick:t,
            removedReactivatedNow:newlyActive.slice(0,12),
            full:{target:Pf.target,leader:Pf.leader,last:Pf.last,currentPlace:currentPlace(Pf),latentActiveCount:Lf?.activeIds?.length||0},
            ablated:{target:Pa.target,leader:Pa.leader,last:Pa.last,currentPlace:currentPlace(Pa),latentActiveCount:latent(ablated,TARGET_PARTY)?.activeIds?.length||0}
          });
        }
      }

      totalTwinMismatch+=twinMismatchCount;
      if(firstRemovedReactivationTick!==null)totalPairsWithRemovedReactivation++;
      if(firstBehaviorDivergenceTick!==null)totalPairsWithBehaviorDivergence++;
      const reactivationBeforeDivergence=firstRemovedReactivationTick!==null&&firstBehaviorDivergenceTick!==null&&firstRemovedReactivationTick<=firstBehaviorDivergenceTick;
      if(reactivationBeforeDivergence)totalPairsWithReactivationBeforeDivergence++;

      experiments.push({
        checkpoint:{
          tick:cp.checkpointTick,
          target:cp.target,
          leader:cp.leader,
          currentPlace:cp.currentPlace,
          totalLatent:cp.totalLatent,
          activeLatent:cp.activeLatentIds.length,
          inactiveLatent:cp.inactiveLatent
        },
        initialization:{
          source:'structured clone of autonomous canonical snapshot, treated as new experiment initial condition',
          changedOnlyBeforeFollowRun:true,
          treatment:'remove only latent past-relation episode identities that were non-active at the checkpoint; preserve currently active latent identities and recent relation-field episodes',
          removedInactiveLatentCount:prune.removedIds.length,
          keptActiveLatentCount:prune.keptIds.length,
          activeSetPreservedAtInitialization,
          fullEqualsTwinBeforeRun:obsEqual(initialFullObs,initialTwinObs),
          preAblationCloneEqualsFull:obsEqual(initialFullObs,initialAblatedPre),
          ablationChangesStructure:!obsEqual(initialAblatedPre,initialAblatedPost),
          experimenterInterventionCountAfterInitialization:0
        },
        validity:{
          twinMismatchCount,
          firstTwinMismatchTick
        },
        result:{
          firstRemovedReactivationTick,
          distinctRemovedEpisodesReactivated:reactivatedRemovedIds.size,
          firstBehaviorDivergenceTick,
          firstTargetDivergenceTick,
          firstLeaderDivergenceTick,
          firstCandidateSignatureDivergenceTick,
          firstCurrentPlaceDivergenceTick,
          reactivationBeforeOrAtBehaviorDivergence:reactivationBeforeDivergence,
          behaviorDivergenceObserved:firstBehaviorDivergenceTick!==null,
          targetDivergenceObserved:firstTargetDivergenceTick!==null
        },
        examples
      });
    }

    const validityPass=checkpoints.length===CHECKPOINT_COUNT&&totalTwinMismatch===0&&experiments.every(x=>x.initialization.activeSetPreservedAtInitialization&&x.initialization.fullEqualsTwinBeforeRun&&x.initialization.preAblationCloneEqualsFull&&x.initialization.experimenterInterventionCountAfterInitialization===0);
    let grade;
    if(!validityPass)grade='INVALID';
    else if(totalPairsWithReactivationBeforeDivergence>0)grade='SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_NONCURRENT_PAST_RELATIONAL_COMPONENT_FUTURE_BEHAVIOR_EFFECT';
    else if(totalPairsWithRemovedReactivation>0)grade='NOT_SUPPORTED_FOR_BEHAVIOR_DIVERGENCE_WITHIN_TESTED_HORIZON';
    else grade='INCONCLUSIVE_NOT_REACTIVATED_WITHIN_HORIZON';

    const out={
      system:{name:'OASIS Causal Research System',version:'3.0',hypothesis:'H2/H3 noncurrent past relational future effect'},
      question:'If currently nonparticipating old relational episodes are removed only at the initial condition, can their later natural reappearance in the full branch change subsequent autonomous behavioral trajectory under identical exogenous conditions?',
      design:{
        harvestMaxTick:HARVEST_MAX_TICK,
        checkpointCountRequested:CHECKPOINT_COUNT,
        checkpointCountObserved:checkpoints.length,
        checkpointGap:CHECKPOINT_GAP,
        followHorizon:FOLLOW_HORIZON,
        targetParty:TARGET_PARTY,
        branches:['full past relational store','identical full twin validity control','initially inactive latent past-relation ablation'],
        noExperimenterInterventionAfterInitialization:true,
        nonAnticipatory:true,
        divergedRealitiesNotReset:true,
        boundary:'tests future causal relevance of initially noncurrent old relational components; does not assert that all Past Relational Structure elements are simultaneously active or jointly necessary'
      },
      validity:{validityPass,totalTwinMismatch},
      summary:{
        pairs:experiments.length,
        pairsWithRemovedRelationReactivation:totalPairsWithRemovedReactivation,
        pairsWithBehaviorDivergence:totalPairsWithBehaviorDivergence,
        pairsWithReactivationBeforeOrAtBehaviorDivergence:totalPairsWithReactivationBeforeDivergence,
        grade
      },
      evidence:{
        noncurrentPastComponentFutureBehaviorEffectObserved:validityPass&&totalPairsWithReactivationBeforeDivergence>0,
        wholePastRelationalStructureJointNecessityValidated:false,
        wholePastRelationalStructureJointSufficiencyValidated:false,
        allPastRelationsSimultaneouslyActive:false,
        realWorldGeneralization:false
      },
      experiments
    };
    E=savedE;
    choose=productionChoose;
    return out;
  },{HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY});

  if(!result.validity.validityPass)throw new Error(`H2 noncurrent-past validity failed: ${JSON.stringify(result.validity)}`);
  console.log('OASIS-H2-NONCURRENT-PAST-FUTURE-EFFECT '+JSON.stringify(result.summary));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
