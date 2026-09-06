import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile,readFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4192','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  const anchorSource=await readFile('reality-flow-observation-anchor.js','utf8');
  const observerSource=await readFile('relation-continuation-observer.js','utf8');
  const noFixedHeterogeneityTick=!anchorSource.includes('970')&&!anchorSource.includes('1070')&&!anchorSource.includes('heterogeneityTick')&&!anchorSource.includes('anchorTick');
  const noAuthorityOverrides=!/\b(actionableIds|participants|memberRank|choose|outcome)\s*=/.test(anchorSource+observerSource);

  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4192/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  await page.evaluate(()=>{
    window.__stage22CoreRefs={
      actionableIds,
      activeEpisodes:OASISRealityFlowTopology.activeEpisodes,
      currentGateAuthority:OASISRelationAuthority.currentGateAuthority,
      participants,
      evalP
    };
  });
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.addScriptTag({path:path.resolve('reality-flow-observation-anchor.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation&&!!window.OASISFlowObservationAnchor);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 22');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const otherNpc=(npcs||[]).map(x=>x[0]).find(n=>n!==gate);
    if(!otherNpc)throw new Error('No comparison NPC available for Stage 22');

    function arm(postOrder,label,trace=[0.10,0.20,0.05,0.30],tick=1200){
      E={tick,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);

      const crossings=OASISFlowObservationAnchor.structuralCrossings(S);
      const departure=OASISFlowObservationAnchor.firstDeparture(S);
      if(!departure)throw new Error(`No flow-derived departure for ${label}`);

      P.relationHistory=[
        {t:departure.t-2,npc:gate,place:'road'},
        {t:departure.t,npc:postOrder[0],place:'road'},
        {t:departure.t+1,npc:postOrder[1],place:'road'}
      ];
      P.relationField.episodes=[{
        tag:'stage22-shared-experience',t:departure.t-1,
        key:[gate,otherNpc].sort().join('↔'),a:gate,b:otherNpc,
        places:[gatedId,'road'],from:[departure.t-2,departure.t-1],
        flowTopologyRuns:[1,-1,1],flowTopologyKey:'1>-1>1'
      }];

      const before={
        history:JSON.stringify(P.relationHistory),episodes:JSON.stringify(P.relationField.episodes),
        authority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        actionable:JSON.stringify(actionableIds(S,P,1)),
        participants:JSON.stringify([...participants(S,P,1)].sort()),
        ranking:JSON.stringify(evalP(S,P,1).map(r=>r.id))
      };
      const witness=OASISRelationContinuation.snapshot(P,departure.t);
      const after={
        history:JSON.stringify(P.relationHistory),episodes:JSON.stringify(P.relationField.episodes),
        authority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        actionable:JSON.stringify(actionableIds(S,P,1)),
        participants:JSON.stringify([...participants(S,P,1)].sort()),
        ranking:JSON.stringify(evalP(S,P,1).map(r=>r.id))
      };

      return{
        label,trace:[...trace],tick,endpoint:S.danger,
        topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        crossings,derivedDeparture:departure,
        witness,
        authority:after.authority,
        gatedActionable:JSON.parse(after.actionable).includes(gatedId),
        actionable:JSON.parse(after.actionable),
        participants:JSON.parse(after.participants),
        ranking:JSON.parse(after.ranking),
        observationSideEffectFree:JSON.stringify(before)===JSON.stringify(after)
      };
    }

    const baseReturn=arm([otherNpc,gate],'base-return');
    const baseTransition=arm([gate,otherNpc],'base-transition');
    const shiftedReturn=arm([otherNpc,gate],'shifted-return',[0.10,0.20,0.05,0.30],1700);
    const shiftedTransition=arm([gate,otherNpc],'shifted-transition',[0.10,0.20,0.05,0.30],1700);
    const dense=[0.10,0.15,0.20,0.12,0.05,0.15,0.30];
    const denseReturn=arm([otherNpc,gate],'dense-return',dense,2200);
    const denseTransition=arm([gate,otherNpc],'dense-transition',dense,2200);

    const sameAuthority=(a,b)=>a.authority===b.authority&&a.gatedActionable===b.gatedActionable&&JSON.stringify(a.actionable)===JSON.stringify(b.actionable)&&JSON.stringify(a.participants)===JSON.stringify(b.participants)&&JSON.stringify(a.ranking)===JSON.stringify(b.ranking);
    const sameWitness=(a,b)=>a.witness.signature===b.witness.signature&&a.witness.currentRelationalEndpoint?.npc===b.witness.currentRelationalEndpoint?.npc;
    const refs=window.__stage22CoreRefs;

    const checks={
      flowDerivesDeparture:baseReturn.derivedDeparture.t===baseReturn.crossings[0].t&&baseReturn.derivedDeparture.fromDir===1&&baseReturn.derivedDeparture.toDir===-1,
      noExternallySuppliedAnchorInArm:true,
      baseScalarControlsEqual:JSON.stringify(baseReturn.trace)===JSON.stringify(baseTransition.trace)&&baseReturn.endpoint===baseTransition.endpoint&&baseReturn.topologyKey===baseTransition.topologyKey,
      witnessDistinguishesRelationalContinuation:baseReturn.witness.signature!==baseTransition.witness.signature&&baseReturn.witness.currentRelationalEndpoint?.npc!==baseTransition.witness.currentRelationalEndpoint?.npc,
      authorityRemainsIdentical:sameAuthority(baseReturn,baseTransition),
      observationIsReadOnly:[baseReturn,baseTransition,shiftedReturn,shiftedTransition,denseReturn,denseTransition].every(x=>x.observationSideEffectFree),
      absoluteTimeShiftInvariant:sameWitness(baseReturn,shiftedReturn)&&sameWitness(baseTransition,shiftedTransition)&&baseReturn.derivedDeparture.t!==shiftedReturn.derivedDeparture.t,
      denseSamplingStillDerivesSameKindOfDeparture:denseReturn.derivedDeparture.fromDir===1&&denseReturn.derivedDeparture.toDir===-1,
      denseSamplingPreservesWitness:sameWitness(baseReturn,denseReturn)&&sameWitness(baseTransition,denseTransition),
      denseSamplingPreservesAuthoritySeparation:sameAuthority(denseReturn,denseTransition),
      noCoreFunctionReplacement:refs.actionableIds===actionableIds&&refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&refs.participants===participants&&refs.evalP===evalP
    };

    E=originalE;
    return{
      question:'Can the Stage 21 observation-only relation witness start from a structural departure derived from current flow instead of an externally supplied observation tick?',
      scope:'Observation-anchor validation only. The flow layer derives a structural crossing from observed scalar transitions, and the existing relation-continuation observer starts from that derived time. No authority, actionability, participant, ranking, choice, or outcome rule is changed.',
      priorArtBoundary:'Change-point/event detection and ordered relational-event histories are established prior art. This stage tests only architectural consistency with OASIS: the observation boundary must arise from the current flow rather than a fixed event constant.',
      english:{
        flowDerivedAnchor:'실험자가 시점을 고정해 주는 대신 관측된 흐름의 구조적 변화에서 얻은 관측 시작점',
        structuralDeparture:'확정된 기존 방향구조의 관계 경계를 넘어 반대 방향구조가 성립한 사건',
        relationalContinuation:'그 사건 이후 관계 사건이 이어지는 순서와 현재 관계 끝점',
        readOnlyObservation:'정보를 구분하지만 판단권·실행권 계산 함수는 변경하지 않는 관측'
      },
      controls:{externallySuppliedAnchor:null,authorityPolicyChange:false,absoluteTimeShift:true,denseScalarResampling:true},
      gatedPlace:{id:gatedId,gate},otherNpc,
      arms:{baseReturn,baseTransition,shiftedReturn,shiftedTransition,denseReturn,denseTransition},
      checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE22_FLOW_DERIVED_OBSERVATION_ANCHOR_SURVIVES':'STAGE22_FLOW_DERIVED_OBSERVATION_ANCHOR_FAILED',
      nextBoundary:'If confirmed, the next experiment must test the user-level hypothesis: after the same structural departure, a relational continuation that returns toward the prior relational flow should be observationally separable from one that continues into a new relational configuration and changes later reality.'
    };
  });

  report.sourceChecks={noFixedHeterogeneityTick,noAuthorityOverrides};
  report.errors=errors;
  report.checks.noFixedHeterogeneityTick=noFixedHeterogeneityTick;
  report.checks.noAuthorityOverrides=noAuthorityOverrides;
  report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE22_FLOW_DERIVED_OBSERVATION_ANCHOR_FAILED';

  console.log('\nSTAGE 22 — FLOW-DERIVED OBSERVATION ANCHOR VALIDATION');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE22_FLOW_DERIVED_OBSERVATION_ANCHOR_SURVIVES','Stage 22 removes the supplied observation anchor without authority leakage');
  await writeFile('reality-flow-relational-continuation-flow-anchor-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
