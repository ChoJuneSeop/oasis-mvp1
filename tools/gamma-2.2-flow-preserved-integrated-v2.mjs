import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4222;
const HARVEST_MAX_TICK=90000;
const FIRST_CHECKPOINT=15000;
const CHECKPOINT_GAP=25000;
const CHECKPOINT_COUNT=3;
const FOLLOW_HORIZON=15000;
const TARGET_PARTY='blue';
const REPORT='gamma-2.2-flow-preserved-integrated-v2-report.json';

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
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function'&&typeof choose==='function'&&typeof outcome==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY})=>{
    const savedE=E;
    const productionChoose=choose;
    const productionOutcome=outcome;
    const clone=x=>structuredClone(x);
    const party=(S,id)=>S.parties.find(p=>p.id===id);
    const currentActiveKeys=(S,id)=>new Set(party(S,id)?.relationField?.active||[]);
    const latent=(S,id)=>party(S,id)?.relationField?.latent||null;
    const sorted=a=>[...a].sort();
    const stable=x=>JSON.stringify(x);

    function storedRelationKeys(S,id){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      const keys=new Set((F?.episodes||[]).map(ep=>ep.key));
      if(L)for(const ep of L.byId.values())keys.add(ep.key);
      return keys;
    }

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

    function prsSignature(S,id){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      return {
        relationHistoryLength:P?.relationHistory?.length||0,
        recentEpisodes:sorted((F?.episodes||[]).map(ep=>`${ep.t}|${ep.key}|${(ep.from||[]).join(':')}`)),
        latentEpisodes:sorted(L?[...L.byId.entries()].map(([eid,ep])=>`${eid}|${ep.key}`):[]),
        activeKeys:sorted(F?.active||[])
      };
    }

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

    function ablateOneNoncurrentKey(S,id,key){
      const P=party(S,id),F=P?.relationField,L=F?.latent;
      if(!F)return {removedRecentEpisodes:0,removedLatentEpisodes:0};
      const beforeRecent=F.episodes.length;
      F.episodes=F.episodes.filter(ep=>ep.key!==key);
      let removedLatentEpisodes=0;
      if(L){
        for(const [episodeId,ep] of [...L.byId.entries()]){
          if(ep.key!==key)continue;
          L.byId.delete(episodeId);
          removedLatentEpisodes++;
        }
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

    // Phase A: autonomous harvest only. No treatment is applied during production flow.
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
      const active=currentActiveKeys(canonical,TARGET_PARTY);
      const stored=storedRelationKeys(canonical,TARGET_PARTY);
      const noncurrent=sorted([...stored].filter(k=>!active.has(k)));
      if(active.size<1||noncurrent.length<1)continue;
      const P=party(canonical,TARGET_PARTY);
      checkpoints.push({
        checkpointTick:t,
        snapshot:clone(canonical),
        activeKeys:sorted(active),
        storedKeys:sorted(stored),
        noncurrentOnlyKeys:noncurrent,
        target:P.target,
        leader:P.leader,
        currentPlace:currentPlace(P)
      });
      nextCheckpoint=t+CHECKPOINT_GAP;
    }
    choose=productionChoose;

    const experiments=[];
    let totalTwinMismatch=0;
    let validPairs=0;
    let pairsWithNaturalReactivation=0;
    let pairsWithObservedTrajectoryDivergence=0;
    let pairsWithOrderedFlowLineage=0;

    for(const cp of checkpoints){
      const full=clone(cp.snapshot);
      const twin=clone(cp.snapshot);
      const ablated=clone(cp.snapshot);
      const removedKey=cp.noncurrentOnlyKeys[0];
      const initialFullBehavior=behaviorState(full,TARGET_PARTY);
      const initialAblatedBehaviorPre=behaviorState(ablated,TARGET_PARTY);
      const initialFullPRS=prsSignature(full,TARGET_PARTY);
      const activeBefore=currentActiveKeys(ablated,TARGET_PARTY);
      const ablation=ablateOneNoncurrentKey(ablated,TARGET_PARTY,removedKey);
      const activeAfter=currentActiveKeys(ablated,TARGET_PARTY);
      const initialAblatedBehaviorPost=behaviorState(ablated,TARGET_PARTY);

      const branchLabels=new Map([[full,'full'],[twin,'twin'],[ablated,'ablated']]);
      const ledgers={full:[],twin:[],ablated:[]};
      const pendingDecision={full:null,twin:null,ablated:null};
      let decisionSeq=0;

      choose=function(S,P){
        const label=branchLabels.get(S);
        const isTarget=label&&P.id===TARGET_PARTY;
        const pre=isTarget?{
          tick:E.tick,
          episodeIndex:++decisionSeq,
          branch:label,
          phase:'decision',
          preReality:{danger:S.danger,currentPlace:currentPlace(P),target:P.target,leader:P.leader},
          prePRS:prsSignature(S,TARGET_PARTY),
          preActiveKeys:sorted(currentActiveKeys(S,TARGET_PARTY)),
          preLatentActiveIds:sorted(latent(S,TARGET_PARTY)?.activeIds||[]),
          implementedPossibilityProjectionBefore:sig(evalP(S,P,1))
        }:null;
        productionChoose(S,P);
        if(isTarget){
          pre.postChoice={target:P.target,leader:P.leader,candidateSignature:P.last};
          pre.postActiveKeys=sorted(currentActiveKeys(S,TARGET_PARTY));
          pre.implementedPossibilityProjectionAfter=sig(evalP(S,P,1));
          ledgers[label].push(pre);
          pendingDecision[label]=pre;
        }
      };

      outcome=function(S,P,id){
        const label=branchLabels.get(S);
        const isTarget=label&&P.id===TARGET_PARTY;
        const before=isTarget?{
          relationHistoryLength:P.relationHistory.length,
          prs:prsSignature(S,TARGET_PARTY),
          activeKeys:sorted(currentActiveKeys(S,TARGET_PARTY))
        }:null;
        productionOutcome(S,P,id);
        if(isTarget){
          const after={
            relationHistoryLength:P.relationHistory.length,
            prs:prsSignature(S,TARGET_PARTY),
            activeKeys:sorted(currentActiveKeys(S,TARGET_PARTY))
          };
          const rec={
            tick:E.tick,
            episodeIndex:pendingDecision[label]?.episodeIndex??null,
            branch:label,
            phase:'outcome',
            realizedTarget:id,
            relationHistoryAdded:after.relationHistoryLength-before.relationHistoryLength,
            prsChanged:stable(before.prs)!==stable(after.prs),
            before,
            after
          };
          ledgers[label].push(rec);
          pendingDecision[label]=null;
        }
      };

      let twinMismatchCount=0;
      let firstTwinMismatchTick=null;
      let firstFullReactivationTick=null;
      let firstFullDecisionWithRemovedKeyTick=null;
      let firstOutcomeAfterRemovedKeyParticipationTick=null;
      let firstIncorporationAfterRemovedKeyParticipationTick=null;
      let firstNextDecisionAfterIncorporationTick=null;
      let firstTrajectoryDivergenceTick=null;
      let firstTargetDivergenceTick=null;
      let firstLeaderDivergenceTick=null;
      let firstCandidateSignatureDivergenceTick=null;
      let firstCurrentPlaceDivergenceTick=null;
      let firstPRSdivergenceTick=null;
      let firstAblatedKeyRegenerationTick=null;
      let sawRemovedKeyParticipation=false;
      let sawIncorporationAfterParticipation=false;

      for(let dt=1;dt<=FOLLOW_HORIZON;dt++){
        const t=cp.checkpointTick+dt;
        E.tick=t;
        const ex=env(t);
        tickW(full,clone(ex));
        tickW(twin,clone(ex));
        tickW(ablated,clone(ex));

        if(stable(fullWorldObservable(full))!==stable(fullWorldObservable(twin))){
          twinMismatchCount++;
          if(firstTwinMismatchTick===null)firstTwinMismatchTick=t;
        }

        const Pf=party(full,TARGET_PARTY),Pa=party(ablated,TARGET_PARTY);
        const fullActive=currentActiveKeys(full,TARGET_PARTY);
        if(fullActive.has(removedKey)&&firstFullReactivationTick===null)firstFullReactivationTick=t;

        const fullDecision=ledgers.full.length?ledgers.full[ledgers.full.length-1]:null;
        if(fullDecision?.tick===t&&fullDecision.phase==='decision'&&fullDecision.postActiveKeys?.includes(removedKey)){
          sawRemovedKeyParticipation=true;
          if(firstFullDecisionWithRemovedKeyTick===null)firstFullDecisionWithRemovedKeyTick=t;
        }
        const fullOutcome=ledgers.full.length?ledgers.full[ledgers.full.length-1]:null;
        if(sawRemovedKeyParticipation&&fullOutcome?.tick===t&&fullOutcome.phase==='outcome'){
          if(firstOutcomeAfterRemovedKeyParticipationTick===null)firstOutcomeAfterRemovedKeyParticipationTick=t;
          if(fullOutcome.prsChanged||fullOutcome.relationHistoryAdded>0){
            sawIncorporationAfterParticipation=true;
            if(firstIncorporationAfterRemovedKeyParticipationTick===null)firstIncorporationAfterRemovedKeyParticipationTick=t;
          }
        }
        if(sawIncorporationAfterParticipation&&fullDecision?.tick===t&&fullDecision.phase==='decision'&&firstNextDecisionAfterIncorporationTick===null&&t>firstIncorporationAfterRemovedKeyParticipationTick){
          firstNextDecisionAfterIncorporationTick=t;
        }

        if(storedRelationKeys(ablated,TARGET_PARTY).has(removedKey)&&firstAblatedKeyRegenerationTick===null)firstAblatedKeyRegenerationTick=t;

        const targetDiff=Pf.target!==Pa.target;
        const leaderDiff=Pf.leader!==Pa.leader;
        const candDiff=Pf.last!==Pa.last;
        const placeDiff=currentPlace(Pf)!==currentPlace(Pa);
        const prsDiff=stable(prsSignature(full,TARGET_PARTY))!==stable(prsSignature(ablated,TARGET_PARTY));
        if(targetDiff&&firstTargetDivergenceTick===null)firstTargetDivergenceTick=t;
        if(leaderDiff&&firstLeaderDivergenceTick===null)firstLeaderDivergenceTick=t;
        if(candDiff&&firstCandidateSignatureDivergenceTick===null)firstCandidateSignatureDivergenceTick=t;
        if(placeDiff&&firstCurrentPlaceDivergenceTick===null)firstCurrentPlaceDivergenceTick=t;
        if(prsDiff&&firstPRSdivergenceTick===null)firstPRSdivergenceTick=t;
        if((targetDiff||leaderDiff||candDiff||placeDiff)&&firstTrajectoryDivergenceTick===null)firstTrajectoryDivergenceTick=t;
      }

      choose=productionChoose;
      outcome=productionOutcome;

      const activePreserved=stable(sorted(activeBefore))===stable(sorted(activeAfter));
      const initialBehaviorPreserved=stable(initialFullBehavior)===stable(initialAblatedBehaviorPre)&&stable(initialFullBehavior)===stable(initialAblatedBehaviorPost);
      const fullEqualsTwinBeforeRun=stable(fullWorldObservable(cp.snapshot))===stable(fullWorldObservable(clone(cp.snapshot)));
      const treatmentActuallyRemoved=(ablation.removedRecentEpisodes+ablation.removedLatentEpisodes)>0;
      const validityPass=activePreserved&&initialBehaviorPreserved&&fullEqualsTwinBeforeRun&&treatmentActuallyRemoved&&twinMismatchCount===0;
      if(validityPass)validPairs++;
      if(firstFullReactivationTick!==null)pairsWithNaturalReactivation++;
      if(firstTrajectoryDivergenceTick!==null)pairsWithObservedTrajectoryDivergence++;
      const orderedFlowLineage=firstFullDecisionWithRemovedKeyTick!==null&&firstOutcomeAfterRemovedKeyParticipationTick!==null&&firstIncorporationAfterRemovedKeyParticipationTick!==null&&firstNextDecisionAfterIncorporationTick!==null;
      if(orderedFlowLineage)pairsWithOrderedFlowLineage++;
      totalTwinMismatch+=twinMismatchCount;

      experiments.push({
        checkpoint:{
          tick:cp.checkpointTick,target:cp.target,leader:cp.leader,currentPlace:cp.currentPlace,
          activeKeys:cp.activeKeys,storedKeyCount:cp.storedKeys.length,noncurrentOnlyKeyCount:cp.noncurrentOnlyKeys.length
        },
        initialization:{
          source:'structured clone of an autonomously harvested production checkpoint',
          treatment:'remove one relation key that is stored in Past Relational Structure representation but noncurrent at initialization; no intervention after initialization',
          removedKey,
          removedRecentEpisodes:ablation.removedRecentEpisodes,
          removedLatentEpisodes:ablation.removedLatentEpisodes,
          activeKeysPreserved:activePreserved,
          initialBehaviorPreserved,
          treatmentActuallyRemoved,
          initialFullPRS,
          experimenterInterventionCountAfterInitialization:0
        },
        validity:{validityPass,twinMismatchCount,firstTwinMismatchTick},
        flow:{
          firstFullReactivationTick,
          firstFullDecisionWithRemovedKeyTick,
          firstOutcomeAfterRemovedKeyParticipationTick,
          firstIncorporationAfterRemovedKeyParticipationTick,
          firstNextDecisionAfterIncorporationTick,
          orderedFlowLineageObserved:orderedFlowLineage,
          firstAblatedKeyRegenerationTick
        },
        divergence:{
          firstTrajectoryDivergenceTick,
          firstTargetDivergenceTick,
          firstLeaderDivergenceTick,
          firstCandidateSignatureDivergenceTick,
          firstCurrentPlaceDivergenceTick,
          firstPRSdivergenceTick
        },
        flowLedger:{full:ledgers.full,ablated:ledgers.ablated}
      });
    }

    const overallValidity=checkpoints.length===CHECKPOINT_COUNT&&validPairs===checkpoints.length&&totalTwinMismatch===0;
    let grade='INVALID';
    if(overallValidity){
      if(pairsWithOrderedFlowLineage>0)grade='FLOW_LINEAGE_OBSERVED_WITHIN_CANONICAL_HARNESS';
      else if(pairsWithNaturalReactivation>0)grade='NATURAL_REACTIVATION_OBSERVED_BUT_ORDERED_FLOW_LINEAGE_NOT_COMPLETED_WITHIN_HORIZON';
      else grade='INCONCLUSIVE_NO_REMOVED_KEY_REACTIVATION_WITHIN_HORIZON';
    }

    const out={
      experiment:{
        name:'OASIS Gamma 2.2 Flow-Preserved Integrated Trajectory Test',
        version:'v2 LOCKED',
        scope:'within current canonical game harness only'
      },
      design:{
        harvestMaxTick:HARVEST_MAX_TICK,
        checkpointCountRequested:CHECKPOINT_COUNT,
        checkpointCountObserved:checkpoints.length,
        checkpointGap:CHECKPOINT_GAP,
        followHorizon:FOLLOW_HORIZON,
        targetParty:TARGET_PARTY,
        flowUnit:'continuous production trajectory with decision/outcome episode ledger',
        interventionUnit:'one actually implemented relation key, modified only at experiment initialization',
        noExperimenterInterventionAfterInitialization:true,
        nonAnticipatory:true,
        divergedRealitiesNotReset:true,
        semanticTwinValidityControl:true,
        implementedPossibilityProjectionOnly:true
      },
      interpretationBoundary:{
        theoreticalPossibilityCompositionValidated:false,
        responsibilityAxisIsolated:false,
        selfInterventionIsolated:false,
        wholePastRelationalStructureNecessityValidated:false,
        wholePastRelationalStructureSufficiencyValidated:false,
        reappearanceAloneIsBehaviorEffect:false,
        externalGeneralization:false,
        note:'The ledger records production-observable relational participation, implemented possibility projection, choice, realized outcome, incorporation signals, and subsequent flow. It must not be interpreted as direct validation of unimplemented theoretical variables.'
      },
      validity:{overallValidity,totalTwinMismatch,validPairs},
      summary:{
        pairs:experiments.length,
        pairsWithNaturalReactivation,
        pairsWithOrderedFlowLineage,
        pairsWithObservedTrajectoryDivergence,
        grade
      },
      experiments
    };

    E=savedE;
    choose=productionChoose;
    outcome=productionOutcome;
    return out;
  },{HARVEST_MAX_TICK,FIRST_CHECKPOINT,CHECKPOINT_GAP,CHECKPOINT_COUNT,FOLLOW_HORIZON,TARGET_PARTY});

  if(!result.validity.overallValidity)throw new Error(`Gamma 2.2 validity failed: ${JSON.stringify(result.validity)}`);
  console.log('OASIS-GAMMA-2.2 '+JSON.stringify(result.summary));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  await context.close();
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
