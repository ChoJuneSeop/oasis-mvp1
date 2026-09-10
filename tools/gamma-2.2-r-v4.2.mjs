import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4230+Number(process.env.OFFSET||0)%200;
const OFFSET=Number(process.env.OFFSET||0);
const MODE=process.env.MODE||'full';
const DISCOVERY_MAX=Number(process.env.DISCOVERY_MAX|| (MODE==='smoke'?40000:120000));
const FOLLOW_HORIZON=Number(process.env.FOLLOW_HORIZON|| (MODE==='smoke'?12000:120000));
const TARGET_PARTY=process.env.TARGET_PARTY||'blue';
const LABEL=process.env.LABEL||`${MODE}-offset${OFFSET}`;
const REPORT=`gamma-2.2-r-v4.2-${LABEL}-report.json`;

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
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function'&&typeof choose==='function'&&typeof outcome==='function'&&typeof evalP==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({OFFSET,DISCOVERY_MAX,FOLLOW_HORIZON,TARGET_PARTY,MODE})=>{
    const savedE=E;
    const productionChoose=choose;
    const productionOutcome=outcome;
    const clone=x=>structuredClone(x);
    const stable=x=>JSON.stringify(x);
    const party=(S,id)=>S.parties.find(p=>p.id===id);
    const epId=ep=>`${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`;
    const pairKey=(a,b)=>[a,b].sort().join('↔');

    function relevantReasons(S,P,ep){
      const here=currentPlace(P),target=P.target,reasons=[];
      if((ep.places||[]).includes(here))reasons.push(`here:${here}`);
      if((ep.places||[]).includes(target))reasons.push(`target:${target}`);
      for(const id of ep.places||[])if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push(`danger:${id}`);
      const gate=places[target]?.gate;
      if(gate&&(ep.a===gate||ep.b===gate))reasons.push(`gate:${gate}`);
      return [...new Set(reasons)];
    }
    function activeEpisodesReconstructed(S,P){
      const F=P.relationField||{},L=F.latent,rows=[];
      for(const ep of F.episodes||[])if(E.tick-ep.t<=1200&&relevantReasons(S,P,ep).length)rows.push({id:epId(ep),ep,source:'recent'});
      for(const id of L?.activeIds||[]){const ep=L.byId.get(id);if(ep)rows.push({id,ep,source:'latent'});}
      const byId=new Map();for(const r of rows)byId.set(r.id,r);return [...byId.values()];
    }
    function supportsTarget(ep,target){
      const gate=places[target]?.gate;
      return (ep.places||[]).includes(target)||!!(gate&&(ep.a===gate||ep.b===gate));
    }
    function supportSnapshot(S,P){
      const rows=activeEpisodesReconstructed(S,P);
      const activeKeys=[...new Set(rows.map(r=>r.ep.key))].sort();
      const targetSupport=rows.filter(r=>supportsTarget(r.ep,P.target));
      const latentTargetSupport=targetSupport.filter(r=>r.source==='latent');
      return {
        activeKeys,
        reconstructedActiveMatches:stable(activeKeys)===stable([...(P.relationField?.active||[])].sort()),
        targetSupportEpisodeIds:targetSupport.map(r=>r.id).sort(),
        targetSupportKeys:[...new Set(targetSupport.map(r=>r.ep.key))].sort(),
        latentTargetSupportEpisodeIds:latentTargetSupport.map(r=>r.id).sort(),
        latentTargetSupportKeys:[...new Set(latentTargetSupport.map(r=>r.ep.key))].sort(),
        productionPendingLatentIds:[...(P.pendingFieldLatentIds||[])].sort()
      };
    }
    function allEpisodeRows(P){
      const out=[];
      for(const ep of P.relationField?.episodes||[])out.push({id:epId(ep),ep,source:'recent'});
      const L=P.relationField?.latent;
      if(L)for(const [id,ep] of L.byId)out.push({id,ep,source:'latent'});
      const by=new Map();for(const r of out)by.set(r.id,r);return [...by.values()];
    }
    function episodeMap(P){return new Map(allEpisodeRows(P).map(r=>[r.id,r]));}
    function behaviorSig(S,P){
      return {
        danger:S.danger,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),
        members:P.members.map(m=>[m.name,m.x,m.y,m.hp]),
        relationHistory:P.relationHistory.map(e=>[e.t,e.npc,e.place]),
        disc:[...P.disc].sort(),vis:Object.entries(P.vis).sort(),hiddenCandidates:[...P.hiddenCandidates].sort(),hiddenDone:[...P.hiddenDone].sort(),seenNPC:[...P.seenNPC].sort(),
        counters:{...S.c}
      };
    }
    function structuralSigExceptKey(P,key){
      const F=P.relationField||{},L=F.latent;
      return {
        recent:(F.episodes||[]).filter(ep=>ep.key!==key).map(ep=>[epId(ep),ep.key,[...(ep.places||[])] ]).sort((a,b)=>a[0].localeCompare(b[0])),
        latent:L?[...L.byId.entries()].filter(([,ep])=>ep.key!==key).map(([id,ep])=>[id,ep.key,[...(ep.places||[])] ]).sort((a,b)=>a[0].localeCompare(b[0])):[],
        active:[...(F.active||[])].filter(k=>k!==key).sort(),
        relationHistory:P.relationHistory.map(e=>[e.t,e.npc,e.place])
      };
    }
    function compactWorld(S){
      return {
        danger:S.danger,spiral:S.spiral,c:{...S.c},
        parties:S.parties.map(P=>({
          id:P.id,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),
          relationHistory:P.relationHistory.map(e=>[e.t,e.npc,e.place]),choiceHistory:P.choiceHistory.map(e=>[e.t,e.target]),
          recent:(P.relationField?.episodes||[]).map(ep=>[epId(ep),ep.key]),
          latent:[...(P.relationField?.latent?.byId||new Map()).entries()].map(([id,ep])=>[id,ep.key]).sort((a,b)=>a[0].localeCompare(b[0])),
          active:[...(P.relationField?.active||[])].sort(),activeIds:[...(P.relationField?.latent?.activeIds||[])].sort(),
          members:P.members.map(m=>[m.name,Number(m.x.toFixed(9)),Number(m.y.toFixed(9)),Number(m.hp.toFixed(9))])
        }))
      };
    }
    function ablateRelationKey(S,id,key){
      const P=party(S,id),F=P.relationField,L=F?.latent;
      const before={recent:F?.episodes?.length||0,latent:L?.byId?.size||0};
      if(F){
        F.episodes=(F.episodes||[]).filter(ep=>ep.key!==key);
        F.active=(F.active||[]).filter(k=>k!==key);
      }
      let removedLatent=0;
      if(L){
        for(const [id0,ep] of [...L.byId.entries()])if(ep.key===key){L.byId.delete(id0);removedLatent++;}
        const byClue=new Map();
        for(const [clue,ids] of L.byClue){const next=new Set([...ids].filter(id0=>L.byId.has(id0)));if(next.size)byClue.set(clue,next);}
        L.byClue=byClue;L.activeIds=(L.activeIds||[]).filter(id0=>L.byId.has(id0));L.cacheKey=null;L.cacheEpisodes=[];
      }
      return {removedRecent:before.recent-(F?.episodes?.length||0),removedLatent,afterRecent:F?.episodes?.length||0,afterLatent:L?.byId?.size||0};
    }

    // PASS 1: autonomous discovery. Outcome/future result is not used for eligibility.
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    let discoveryWorld=E.worlds.full;
    let decisionOrdinal=0;
    let discovered=null;
    choose=function(S,P){
      const isTarget=S===discoveryWorld&&P.id===TARGET_PARTY;
      const pre=isTarget?clone(S):null;
      productionChoose(S,P);
      if(!isTarget)return;
      decisionOrdinal++;
      const ss=supportSnapshot(S,P);
      const latentIds=new Set(P.pendingFieldLatentIds||[]);
      const exactLatent=ss.latentTargetSupportEpisodeIds.filter(id=>latentIds.has(id));
      if(!discovered&&exactLatent.length){
        const L=P.relationField?.latent;
        const eligible=exactLatent.map(id=>({id,ep:L?.byId.get(id)})).filter(x=>x.ep&&E.tick-x.ep.t>1200);
        if(eligible.length){
          const chosen=eligible[0];
          discovered={
            tick:E.tick,decisionOrdinal,key:chosen.ep.key,sourceEpisodeId:chosen.id,
            discoverySelectedTarget:P.target,discoveryLeader:P.leader,discoveryLast:P.last,
            support:ss,
            preSnapshot:pre
          };
        }
      }
    };
    for(let t=1;t<=DISCOVERY_MAX&&!discovered;t++){
      E.tick=t;tickW(discoveryWorld,env(t+OFFSET));
    }
    choose=productionChoose;

    if(!discovered){
      E=savedE;
      return {
        experiment:{name:'OASIS Gamma 2.2-R',version:'v4.2',mode:MODE,offset:OFFSET},
        scope:'conditional on naturally occurring support-positive re-participation within the current canonical harness',
        design:{discoveryMax:DISCOVERY_MAX,followHorizon:FOLLOW_HORIZON,targetParty:TARGET_PARTY,noFutureOutcomeUsedForEligibility:true},
        validity:{noEligiblePreserved:true,structuralErrors:0},
        result:{eligibility:'NO_ELIGIBLE_SUPPORT_EVENT_WITHIN_DISCOVERY_HORIZON',grade:'NO_ELIGIBLE_SUPPORT_EVENT_WITHIN_DISCOVERY_HORIZON'}
      };
    }

    // PASS 2: deterministic replay to the same pre-decision point.
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    let replayWorld=E.worlds.full,replayOrdinal=0,replayPre=null,replayPost=null,replayMismatch=0;
    choose=function(S,P){
      if(S!==replayWorld||P.id!==TARGET_PARTY){productionChoose(S,P);return;}
      replayOrdinal++;
      if(E.tick===discovered.tick&&replayOrdinal===discovered.decisionOrdinal){
        replayPre=clone(S);
        productionChoose(S,P);
        const ss=supportSnapshot(S,P);
        replayPost={target:P.target,leader:P.leader,last:P.last,support:ss};
        if(P.target!==discovered.discoverySelectedTarget||P.leader!==discovered.discoveryLeader||P.last!==discovered.discoveryLast||!ss.latentTargetSupportKeys.includes(discovered.key))replayMismatch++;
        return;
      }
      productionChoose(S,P);
    };
    for(let t=1;t<=discovered.tick&&!replayPre;t++){E.tick=t;tickW(replayWorld,env(t+OFFSET));}
    choose=productionChoose;
    if(!replayPre)replayMismatch++;

    if(replayMismatch){
      E=savedE;
      return {experiment:{name:'OASIS Gamma 2.2-R',version:'v4.2',mode:MODE,offset:OFFSET},validity:{replayMismatch,valid:false},result:{grade:'INVALID_REPLAY_MISMATCH'}};
    }

    const full=clone(replayPre),twin=clone(replayPre),ablated=clone(replayPre);
    const fullP0=party(full,TARGET_PARTY),ablP0=party(ablated,TARGET_PARTY);
    const behaviorBefore=behaviorSig(ablated,ablP0);
    const unrelatedBefore=structuralSigExceptKey(ablP0,discovered.key);
    const treatment=ablateRelationKey(ablated,TARGET_PARTY,discovered.key);
    const behaviorAfter=behaviorSig(ablated,ablP0);
    const unrelatedAfter=structuralSigExceptKey(ablP0,discovered.key);
    const sourceStateFootprint={
      behaviorPreserved:stable(behaviorBefore)===stable(behaviorAfter),
      unrelatedStructurePreserved:stable(unrelatedBefore)===stable(unrelatedAfter),
      targetSourceActuallyRemoved:(treatment.removedRecent+treatment.removedLatent)>0,
      interventionGranularity:'relation_key_source',
      removedKey:discovered.key,
      ...treatment
    };

    const branchLabels=new Map([[full,'full'],[twin,'twin'],[ablated,'ablated']]);
    const pending=new Map();
    const ledger={full:[],twin:[],ablated:[]};
    const processLinked=new Set();
    const processLinkedKeys=new Set();
    let branchDecisionSeq=0;
    let firstInitialSupportRealizationTick=null;
    let firstProcessLinkedEpisodeFormationTick=null;
    let firstLaterProcessLinkedSupportTick=null;
    let firstAblatedRegenerationTick=null;
    let firstTrajectoryDivergenceTick=null;
    let twinMismatchTicks=0;
    let reconstructedActiveKeyMismatch=0;

    function decisionRecord(S,P,label){
      const ss=supportSnapshot(S,P);
      if(!ss.reconstructedActiveMatches)reconstructedActiveKeyMismatch++;
      return {id:`${label}:D${++branchDecisionSeq}`,tick:E.tick,target:P.target,leader:P.leader,last:P.last,support:ss};
    }
    function divergenceState(S){const P=party(S,TARGET_PARTY);return [P.target,P.leader,P.last,currentPlace(P),P.relationHistory.length,P.choiceHistory.length];}

    choose=function(S,P){
      const label=branchLabels.get(S);
      productionChoose(S,P);
      if(!label||P.id!==TARGET_PARTY)return;
      const rec=decisionRecord(S,P,label);
      ledger[label].push({type:'decision',...rec});
      pending.set(label,rec);
      if(label==='full'&&processLinked.size){
        const hit=rec.support.targetSupportEpisodeIds.filter(id=>processLinked.has(id));
        if(hit.length&&firstLaterProcessLinkedSupportTick===null)firstLaterProcessLinkedSupportTick=E.tick;
      }
    };
    outcome=function(S,P,id){
      const label=branchLabels.get(S);
      if(!label||P.id!==TARGET_PARTY){productionOutcome(S,P,id);return;}
      const beforeLen=P.relationHistory.length;
      const beforeEpisodes=episodeMap(P);
      const prior=pending.get(label)||null;
      productionOutcome(S,P,id);
      const afterEpisodes=episodeMap(P);
      const newEvents=P.relationHistory.slice(beforeLen).map(e=>({t:e.t,npc:e.npc,place:e.place}));
      const newEpisodes=[...afterEpisodes.entries()].filter(([eid])=>!beforeEpisodes.has(eid)).map(([eid,row])=>({id:eid,key:row.ep.key,from:[...(row.ep.from||[])],places:[...(row.ep.places||[])],source:row.source}));
      const realized=prior&&prior.target===id;
      ledger[label].push({type:'outcome',tick:E.tick,target:id,decisionId:realized?prior.id:null,newEvents,newEpisodes});
      if(label==='full'&&realized&&prior.support.targetSupportKeys.includes(discovered.key)&&newEvents.length){
        if(firstInitialSupportRealizationTick===null)firstInitialSupportRealizationTick=E.tick;
        for(const ep of newEpisodes){
          if((ep.from||[]).includes(E.tick)){
            processLinked.add(ep.id);processLinkedKeys.add(ep.key);
            if(firstProcessLinkedEpisodeFormationTick===null)firstProcessLinkedEpisodeFormationTick=E.tick;
          }
        }
      }
      pending.delete(label);
    };

    // Apply the current decision from the exact pre-decision branch point.
    E.tick=discovered.tick;
    choose(full,party(full,TARGET_PARTY));
    choose(twin,party(twin,TARGET_PARTY));
    choose(ablated,party(ablated,TARGET_PARTY));

    const initialMechanismFootprint={
      full:{target:party(full,TARGET_PARTY).target,leader:party(full,TARGET_PARTY).leader,last:party(full,TARGET_PARTY).last,support:supportSnapshot(full,party(full,TARGET_PARTY))},
      ablated:{target:party(ablated,TARGET_PARTY).target,leader:party(ablated,TARGET_PARTY).leader,last:party(ablated,TARGET_PARTY).last,support:supportSnapshot(ablated,party(ablated,TARGET_PARTY))}
    };
    initialMechanismFootprint.changed={
      target:initialMechanismFootprint.full.target!==initialMechanismFootprint.ablated.target,
      leader:initialMechanismFootprint.full.leader!==initialMechanismFootprint.ablated.leader,
      candidateSignature:initialMechanismFootprint.full.last!==initialMechanismFootprint.ablated.last,
      supportKeys:stable(initialMechanismFootprint.full.support.targetSupportKeys)!==stable(initialMechanismFootprint.ablated.support.targetSupportKeys)
    };

    for(let dt=1;dt<=FOLLOW_HORIZON;dt++){
      const t=discovered.tick+dt;E.tick=t;const ex=env(t+OFFSET);
      tickW(full,clone(ex));tickW(twin,clone(ex));tickW(ablated,clone(ex));
      if(stable(compactWorld(full))!==stable(compactWorld(twin)))twinMismatchTicks++;
      if(firstTrajectoryDivergenceTick===null&&stable(divergenceState(full))!==stable(divergenceState(ablated)))firstTrajectoryDivergenceTick=t;
      const Pa=party(ablated,TARGET_PARTY);
      if(firstAblatedRegenerationTick===null&&allEpisodeRows(Pa).some(r=>r.ep.key===discovered.key))firstAblatedRegenerationTick=t;
    }
    choose=productionChoose;outcome=productionOutcome;

    const sourceAuditPass=sourceStateFootprint.behaviorPreserved&&sourceStateFootprint.unrelatedStructurePreserved&&sourceStateFootprint.targetSourceActuallyRemoved;
    const semanticTwinPass=twinMismatchTicks===0;
    const instrumentationPass=reconstructedActiveKeyMismatch===0;
    const overallValidity=sourceAuditPass&&semanticTwinPass&&instrumentationPass&&replayMismatch===0;

    const observationalLevel=firstLaterProcessLinkedSupportTick!==null?'L4_PROCESS_LINKED_REPARTICIPATION':firstProcessLinkedEpisodeFormationTick!==null?'L3_STRUCTURAL_INCORPORATION':firstInitialSupportRealizationTick!==null?'L2_REALIZED_LINEAGE':'L1_RELATIONAL_SUPPORT_ONLY';
    const causalObserved=firstTrajectoryDivergenceTick!==null;
    const grade=!overallValidity?'INVALID':`${observationalLevel}${causalObserved?'__CAUSAL_FLOW_DIFFERENCE_OBSERVED':'__NO_CAUSAL_FLOW_DIFFERENCE_WITHIN_HORIZON'}`;

    const out={
      experiment:{name:'OASIS Gamma 2.2-R Production-Causal Flow Lineage Validation',version:'v4.2',mode:MODE,offset:OFFSET},
      scope:'conditional on naturally occurring support-positive re-participation in the current canonical harness; no universal necessity/sufficiency or real-world generalization',
      implementationBoundary:{theoreticalPossibilityCompositionValidated:false,responsibilityAxisIsolated:false,directEpisodeToEpisodeParentDagClaimed:false,processLinkedLineageOnly:true},
      design:{discoveryMax:DISCOVERY_MAX,followHorizon:FOLLOW_HORIZON,targetParty:TARGET_PARTY,branchPoint:'exact pre-decision state on deterministic replay',noFutureOutcomeUsedForEligibility:true,noInterventionAfterInitialization:true,divergedRealitiesNotReset:true,semanticTwin:true},
      discovery:{tick:discovered.tick,decisionOrdinal:discovered.decisionOrdinal,key:discovered.key,sourceEpisodeId:discovered.sourceEpisodeId,selectedTarget:discovered.discoverySelectedTarget,support:discovered.support},
      validity:{overallValidity,replayMismatch,sourceAuditPass,semanticTwinPass,instrumentationPass,twinMismatchTicks,reconstructedActiveKeyMismatch,sourceStateFootprint},
      mechanismFootprint:initialMechanismFootprint,
      flow:{firstInitialSupportRealizationTick,firstProcessLinkedEpisodeFormationTick,processLinkedEpisodeCount:processLinked.size,processLinkedKeys:[...processLinkedKeys],firstLaterProcessLinkedSupportTick,firstAblatedRegenerationTick,firstTrajectoryDivergenceTick},
      interpretation:{observationalLevel,causalFlowDifferenceObserved:causalObserved,singleUnitNecessityEstablished:false,singleUnitSufficiencyEstablished:false,regenerationIsCompensation:false,grade},
      ledger:{full:ledger.full,ablated:ledger.ablated}
    };
    E=savedE;return out;
  },{OFFSET,DISCOVERY_MAX,FOLLOW_HORIZON,TARGET_PARTY,MODE});

  console.log('OASIS-GAMMA-2.2-R-V4.2 '+JSON.stringify({label:LABEL,validity:result.validity,result:result.result||result.interpretation,flow:result.flow||null}));
  await writeFile(REPORT,JSON.stringify(result,null,2));
  if(result.validity?.overallValidity===false||result.validity?.valid===false)process.exitCode=1;
  await context.close();
} finally {
  if(browser)await browser.close().catch(()=>{});
  server.kill('SIGTERM');
}
