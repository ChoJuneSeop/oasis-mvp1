import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4218;
const HARVEST_MAX_TICK=90000;
const FIRST_CHECKPOINT=15000;
const CHECKPOINT_GAP=25000;
const CHECKPOINT_COUNT=3;
const FOLLOW_HORIZON=15000;
const TARGET_PARTY='blue';
const REPORT='h2-noncurrent-key-future-effect-v3-report.json';

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
    const intersect=(a,b)=>[...a].filter(x=>b.has(x));

    function behaviorState(S,id){
      const P=party(S,id);
      return {
        danger:S.danger,
        target:P.target,
        leader:P.leader,
        last:P.last,
        currentPlace:currentPlace(P),
        members:P.members.map(m=>[m.name,m.x,m.y,m.hp])
      };
    }
    const behaviorEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

    function fullWorldObservable(S){
      return {
        danger:S.danger,
        c:{...S.c},
        parties:S.parties.map(P=>({
          id:P.id,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),
          relationHistoryLength:P.relationHistory.length,
          recentEpisodes:(P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,[...(ep.places||[])] ]),
          latent:[...(P.relationField?.latent?.byId||new Map()).entries()].map(([id,ep])=>[id,ep.key]),
          activeIds:[...(P.relationField?.latent?.activeIds||[])].sort(),
          activeKeys:[...(P.relationField?.active||[])].sort(),
          choiceHistoryLength:P.choiceHistory.length,
          members:P.members.map(m=>[m.name,m.x,m.y,m.hp])
        }))
      };
    }
    const worldEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

    function storedRelationKeys(S,id){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      const keys=new Set((F?.episodes||[]).map(ep=>ep.key));
      if(L)for(const ep of L.byId.values())keys.add(ep.key);
      return keys;
    }

    function ablateNoncurrentOnlyKeys(S,id,removedKeys){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      if(!F)return {removedRecentEpisodes:0,removedLatentEpisodes:0};
      const beforeRecent=F.episodes.length;
      F.episodes=F.episodes.filter(ep=>!removedKeys.has(ep.key));
      let removedLatentEpisodes=0;
      if(L){
        for(const [episodeId,ep] of [...L.byId.entries()])if(removedKeys.has(ep.key)){L.byId.delete(episodeId);removedLatentEpisodes++}
        const nextByClue=new Map();
        for(const [clue,ids] of L.byClue){
          const next=new Set([...ids].filter(episodeId=>L.byId.has(episodeId)));
          if(next.size)nextByClue.set(clue,next);
        }
        L.byClue=nextByClue;
        L.activeIds=(L.activeIds||[]).filter(episodeId=>L.byId.has(episodeId));
        L.cacheKey=null;
        L.cacheEpisodes=[];
      }
      return {removedRecentEpisodes:beforeRecent-F.episodes.length,removedLatentEpisodes};
    }

    function currentlyActiveKeys(S,id){
      return new Set(party(S,id)?.relationField?.active||[]);
    }

    // Phase 1: autonomous snapshot harvest.
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
      const activeKeys=currentlyActiveKeys(canonical,TARGET_PARTY);
      const storedKeys=storedRelationKeys(canonical,TARGET_PARTY);
      const noncurrentOnlyKeys=new Set([...storedKeys].filter(k=>!activeKeys.has(k)));
      if(activeKeys.size<1||noncurrentOnlyKeys.size<1)continue;
      const P=party(canonical,TARGET_PARTY),L=latent(canonical,TARGET_PARTY);
      checkpoints.push({
        checkpointTick:t,
        snapshot:clone(canonical),
        activeKeys:[...activeKeys],
        storedKeys:[...storedKeys],
        noncurrentOnlyKeys:[...noncurrentOnlyKeys],
        latentCount:L?.byId?.size||0,
        target:P.target,
        leader:P.leader,
        currentPlace:currentPlace(P)
      });
      nextCheckpoint=t+CHECKPOINT_GAP;
    }
    choose=productionChoose;

    const experiments=[];
    let totalTwinMismatch=0;
    let pairsWithRemovedKeyReactivation=0;
    let pairsWithBehaviorDivergence=0;
    let pairsWithReactivationBeforeDivergence=0;
    let pairsWithAblatedKeyRegeneration=0;

    for(const cp of checkpoints){
      const full=clone(cp.snapshot);
      const twin=clone(cp.snapshot);
      const ablated=clone(cp.snapshot);
      const removedKeys=new Set(cp.noncurrentOnlyKeys);

      const fullInitialWorld=fullWorldObservable(full);
      const twinInitialWorld=fullWorldObservable(twin);
      const ablatedInitialBehaviorPre=behaviorState(ablated,TARGET_PARTY);
      const fullInitialBehavior=behaviorState(full,TARGET_PARTY);
      const activeKeysBefore=currentlyActiveKeys(ablated,TARGET_PARTY);
      const ablation=ablateNoncurrentOnlyKeys(ablated,TARGET_PARTY,removedKeys);
      const activeKeysAfter=currentlyActiveKeys(ablated,TARGET_PARTY);
      const ablatedInitialBehaviorPost=behaviorState(ablated,TARGET_PARTY);

      let twinMismatchCount=0,firstTwinMismatchTick=null;
      let firstRemovedKeyReactivationTick=null;
      const removedKeysReactivated=new Set();
      let firstAblatedRemovedKeyRegenerationTick=null;
      const regeneratedRemovedKeys=new Set();
      let firstBehaviorDivergenceTick=null;
      let firstTargetDivergenceTick=null;
      let firstLeaderDivergenceTick=null;
      let firstCandidateSignatureDivergenceTick=null;
      let firstCurrentPlaceDivergenceTick=null;
      const examples=[];

      for(let dt=1;dt<=FOLLOW_HORIZON;dt++){
        const t=cp.checkpointTick+dt;
        E.tick=t;
        const ex=env(t);
        tickW(full,clone(ex));
        tickW(twin,clone(ex));
        tickW(ablated,clone(ex));

        if(!worldEqual(fullWorldObservable(full),fullWorldObservable(twin))){
          twinMismatchCount++;
          if(firstTwinMismatchTick===null)firstTwinMismatchTick=t;
        }

        const fullActiveKeys=currentlyActiveKeys(full,TARGET_PARTY);
        const reactivated=intersect(fullActiveKeys,removedKeys);
        if(reactivated.length){
          if(firstRemovedKeyReactivationTick===null)firstRemovedKeyReactivationTick=t;
          for(const k of reactivated)removedKeysReactivated.add(k);
        }

        const abStored=storedRelationKeys(ablated,TARGET_PARTY);
        const regenerated=intersect(abStored,removedKeys);
        if(regenerated.length){
          if(firstAblatedRemovedKeyRegenerationTick===null)firstAblatedRemovedKeyRegenerationTick=t;
          for(const k of regenerated)regeneratedRemovedKeys.add(k);
        }

        const Pf=party(full,TARGET_PARTY),Pa=party(ablated,TARGET_PARTY);
        const targetDiff=Pf.target!==Pa.target;
        const leaderDiff=Pf.leader!==Pa.leader;
        const candDiff=Pf.last!==Pa.last;
        const placeDiff=currentPlace(Pf)!==currentPlace(Pa);
        if(targetDiff&&firstTargetDivergenceTick===null)firstTargetDivergenceTick=t;
        if(leaderDiff&&firstLeaderDivergenceTick===null)firstLeaderDivergenceTick=t;
        if(candDiff&&firstCandidateSignatureDivergenceTick===null)firstCandidateSignatureDivergenceTick=t;
        if(placeDiff&&firstCurrentPlaceDivergenceTick===null)firstCurrentPlaceDivergenceTick=t;
        if((targetDiff||leaderDiff||candDiff)&&firstBehaviorDivergenceTick===null)firstBehaviorDivergenceTick=t;

        if(examples.length<10&&(reactivated.length||regenerated.length||targetDiff||leaderDiff||candDiff)){
          examples.push({
            tick:t,
            reactivatedRemovedKeys:reactivated,
            regeneratedRemovedKeys:regenerated,
            full:{target:Pf.target,leader:Pf.leader,last:Pf.last,currentPlace:currentPlace(Pf),activeKeys:[...fullActiveKeys]},
            ablated:{target:Pa.target,leader:Pa.leader,last:Pa.last,currentPlace:currentPlace(Pa),activeKeys:[...currentlyActiveKeys(ablated,TARGET_PARTY)]}
          });
        }
      }

      const activeKeysPreserved=[...activeKeysBefore].sort().join('|')===[...activeKeysAfter].sort().join('|');
      const initialBehaviorPreserved=behaviorEqual(fullInitialBehavior,ablatedInitialBehaviorPost)&&behaviorEqual(ablatedInitialBehaviorPre,ablatedInitialBehaviorPost);
      const reactivationBeforeDivergence=firstRemovedKeyReactivationTick!==null&&firstBehaviorDivergenceTick!==null&&firstRemovedKeyReactivationTick<=firstBehaviorDivergenceTick;

      totalTwinMismatch+=twinMismatchCount;
      if(firstRemovedKeyReactivationTick!==null)pairsWithRemovedKeyReactivation++;
      if(firstBehaviorDivergenceTick!==null)pairsWithBehaviorDivergence++;
      if(reactivationBeforeDivergence)pairsWithReactivationBeforeDivergence++;
      if(firstAblatedRemovedKeyRegenerationTick!==null)pairsWithAblatedKeyRegeneration++;

      experiments.push({
        checkpoint:{
          tick:cp.checkpointTick,target:cp.target,leader:cp.leader,currentPlace:cp.currentPlace,
          latentCount:cp.latentCount,activeKeyCount:cp.activeKeys.length,storedKeyCount:cp.storedKeys.length,
          noncurrentOnlyKeyCount:cp.noncurrentOnlyKeys.length,
          activeKeys:cp.activeKeys,noncurrentOnlyKeys:cp.noncurrentOnlyKeys
        },
        initialization:{
          source:'structured clone of autonomous canonical snapshot, treated as new experiment initial condition',
          treatment:'remove every relation-field recent/latent episode whose relation key was absent from the checkpoint active-key set; preserve all active keys and all episode multiplicity belonging to active keys',
          removedRecentEpisodes:ablation.removedRecentEpisodes,
          removedLatentEpisodes:ablation.removedLatentEpisodes,
          activeKeysPreserved,
          initialBehaviorPreserved,
          fullEqualsTwinBeforeRun:worldEqual(fullInitialWorld,twinInitialWorld),
          experimenterInterventionCountAfterInitialization:0
        },
        validity:{twinMismatchCount,firstTwinMismatchTick},
        result:{
          firstRemovedKeyReactivationTick,
          distinctRemovedKeysReactivated:removedKeysReactivated.size,
          firstAblatedRemovedKeyRegenerationTick,
          distinctRemovedKeysRegeneratedInAblatedBranch:regeneratedRemovedKeys.size,
          firstBehaviorDivergenceTick,firstTargetDivergenceTick,firstLeaderDivergenceTick,
          firstCandidateSignatureDivergenceTick,firstCurrentPlaceDivergenceTick,
          reactivationBeforeOrAtBehaviorDivergence:reactivationBeforeDivergence,
          behaviorDivergenceObserved:firstBehaviorDivergenceTick!==null,
          targetDivergenceObserved:firstTargetDivergenceTick!==null
        },
        examples
      });
    }

    const validityPass=checkpoints.length===CHECKPOINT_COUNT&&totalTwinMismatch===0&&experiments.every(x=>x.initialization.activeKeysPreserved&&x.initialization.initialBehaviorPreserved&&x.initialization.fullEqualsTwinBeforeRun&&x.initialization.experimenterInterventionCountAfterInitialization===0);
    let grade;
    if(!validityPass)grade='INVALID';
    else if(pairsWithReactivationBeforeDivergence>0)grade='SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_NONCURRENT_RELATION_KEY_FUTURE_BEHAVIOR_EFFECT';
    else if(pairsWithRemovedKeyReactivation>0)grade='NOT_SUPPORTED_FOR_RELATION_KEY_BEHAVIOR_DIVERGENCE_WITHIN_TESTED_HORIZON';
    else grade='INCONCLUSIVE_REMOVED_KEYS_NOT_REACTIVATED_WITHIN_HORIZON';

    const out={
      system:{name:'OASIS Causal Research System',version:'3.0',hypothesis:'H2 noncurrent relation-key structural future effect'},
      question:'If relation keys absent from the current active relational set are removed only as an initial structural condition, can their later natural reappearance in the full branch change subsequent autonomous behavioral trajectory under identical exogenous conditions?',
      design:{
        harvestMaxTick:HARVEST_MAX_TICK,checkpointCountRequested:CHECKPOINT_COUNT,checkpointCountObserved:checkpoints.length,
        checkpointGap:CHECKPOINT_GAP,followHorizon:FOLLOW_HORIZON,targetParty:TARGET_PARTY,
        unit:'relation key within relation-field Past Relational Structure representation',
        noExperimenterInterventionAfterInitialization:true,nonAnticipatory:true,divergedRealitiesNotReset:true,
        boundary:'tests noncurrent-only relation-key structural relevance; does not claim the entire Past Relational Structure is simultaneously active, jointly necessary, or jointly sufficient'
      },
      validity:{validityPass,totalTwinMismatch},
      summary:{
        pairs:experiments.length,pairsWithRemovedKeyReactivation,pairsWithBehaviorDivergence,
        pairsWithReactivationBeforeOrAtBehaviorDivergence:pairsWithReactivationBeforeDivergence,
        pairsWithAblatedKeyRegeneration,grade
      },
      evidence:{
        noncurrentRelationKeyFutureBehaviorEffectObserved:validityPass&&pairsWithReactivationBeforeDivergence>0,
        wholePastRelationalStructureJointNecessityValidated:false,
        wholePastRelationalStructureJointSufficiencyValidated:false,
        realWorldGeneralization:false
      },
      experiments
    };
    E=savedE;
    choose=productionChoose;
    return out;
  },{HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY});

  if(!result.validity.validityPass)throw new Error(`H2 noncurrent-key validity failed: ${JSON.stringify(result.validity)}`);
  console.log('OASIS-H2-NONCURRENT-KEY-FUTURE-EFFECT '+JSON.stringify(result.summary));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
