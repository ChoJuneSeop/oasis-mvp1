import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4193','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4193/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.addScriptTag({path:path.resolve('reality-flow-observation-anchor.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation&&!!window.OASISFlowObservationAnchor);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 23');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const otherNpc=(npcs||[]).map(x=>x[0]).find(n=>n!==gate);
    if(!otherNpc)throw new Error('No comparison NPC available for Stage 23');

    E={tick:1300,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={relationReturn:A,relationTransition:B};
    const trace=[0.10,0.20,0.05,0.30];

    function seed(S,postOrder,label){
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const departure=OASISFlowObservationAnchor.firstDeparture(S);
      if(!departure)throw new Error(`No structural departure for ${label}`);
      P.relationHistory=[
        {t:departure.t-2,npc:gate,place:'road'},
        {t:departure.t,npc:postOrder[0],place:'road'},
        {t:departure.t+1,npc:postOrder[1],place:'road'}
      ];
      P.relationField.episodes=[{
        tag:'stage23-shared-experience',t:departure.t-1,
        key:[gate,otherNpc].sort().join('↔'),a:gate,b:otherNpc,
        places:[gatedId,'road'],from:[departure.t-2,departure.t-1],
        flowTopologyRuns:[1,-1,1],flowTopologyKey:'1>-1>1'
      }];
      return{departure,witness:OASISRelationContinuation.snapshot(P,departure.t)};
    }

    const seedA=seed(A,[otherNpc,gate],'relation-return');
    const seedB=seed(B,[gate,otherNpc],'relation-transition');

    function inventory(P){
      const c={};for(const e of P.relationHistory)c[e.npc]=(c[e.npc]||0)+1;return c;
    }
    function partyBehavior(S,P,startChoiceCount){
      return{
        target:P.target,
        currentPlace:currentPlace(P),
        futureChoices:P.choiceHistory.slice(startChoiceCount).map(x=>x.target),
        discovered:[...P.disc].sort(),
        visits:Object.fromEntries(Object.entries(P.vis).sort()),
        routes:[...P.routes].sort(),
        hiddenCandidates:[...P.hiddenCandidates].sort(),
        hiddenDone:[...P.hiddenDone].sort(),
        relationInventory:inventory(P),
        gateAuthority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        gatedActionable:actionableIds(S,P,1).includes(gatedId),
        actionable:[...actionableIds(S,P,1)],
        participants:[...participants(S,P,1)].sort(),
        ranking:evalP(S,P,1).map(r=>r.id),
        pendingRelChoice:P.pendingRelChoice??null,
        possibilityPaths:Object.fromEntries(Object.entries(P.possibilityPaths||{}).sort().map(([k,v])=>[k,{npc:v.npc,candidate:v.candidate!=null,selected:v.selected!=null,realized:v.realized!=null,changed:v.changed!=null}]))
      };
    }
    const startChoicesA=A.parties.map(P=>P.choiceHistory.length),startChoicesB=B.parties.map(P=>P.choiceHistory.length);
    function downstreamSnapshot(S,startChoices){
      const c=S.c||{};
      return{
        danger:S.danger,
        spiral:S.spiral,
        counters:{
          actions:c.actions||0,decision:c.decision||0,structuralExpansion:c.structuralExpansion||0,
          participationTransition:c.participationTransition||0,choiceTransition:c.choiceTransition||0,
          experienceSpiral:c.experienceSpiral||0,relationSpiral:c.relationSpiral||0,
          hidden:c.hidden||0,pathGenerated:c.pathGenerated||0,pathSelected:c.pathSelected||0,
          pathRealized:c.pathRealized||0,pathChanged:c.pathChanged||0
        },
        parties:S.parties.map((P,i)=>partyBehavior(S,P,startChoices[i]))
      };
    }

    const initialA=downstreamSnapshot(A,startChoicesA),initialB=downstreamSnapshot(B,startChoicesB);
    const initialControl={
      sameDanger:initialA.danger===initialB.danger,
      sameTopology:OASISRealityFlowTopology.currentKeyForParty(A,A.parties[0])===OASISRealityFlowTopology.currentKeyForParty(B,B.parties[0]),
      sameInventory:JSON.stringify(inventory(A.parties[0]))===JSON.stringify(inventory(B.parties[0])),
      differentWitness:seedA.witness.signature!==seedB.witness.signature,
      sameAuthority:initialA.parties[0].gateAuthority===initialB.parties[0].gateAuthority,
      sameActionability:JSON.stringify(initialA.parties[0].actionable)===JSON.stringify(initialB.parties[0].actionable),
      sameParticipants:JSON.stringify(initialA.parties[0].participants)===JSON.stringify(initialB.parties[0].participants),
      sameRanking:JSON.stringify(initialA.parties[0].ranking)===JSON.stringify(initialB.parties[0].ranking)
    };

    const checkpoints=[];
    const horizon=3600,marks=new Set([600,1200,2400,3600]);
    let firstBehavioralDivergence=null;
    for(let i=1;i<=horizon;i++){
      E.tick++;
      const e=env(E.tick);
      tickW(A,e);tickW(B,e);
      if(marks.has(i)){
        const a=downstreamSnapshot(A,startChoicesA),b=downstreamSnapshot(B,startChoicesB);
        const same=JSON.stringify(a)===JSON.stringify(b);
        checkpoints.push({afterTicks:i,same,a,b});
        if(!same&&firstBehavioralDivergence==null)firstBehavioralDivergence=i;
      }
    }

    const finalA=checkpoints.at(-1).a,finalB=checkpoints.at(-1).b;
    const downstreamSameAtAllCheckpoints=checkpoints.every(x=>x.same);
    const enoughFutureAction=(finalA.counters.actions>0&&finalB.counters.actions>0&&finalA.parties[0].futureChoices.length>0&&finalB.parties[0].futureChoices.length>0);
    const controlsPass=Object.values(initialControl).every(Boolean)&&enoughFutureAction;

    E=originalE;
    return{
      question:'Does the current OASIS engine already contain a causal path by which different post-departure relational continuations, with relation inventory and scalar flow held equal, produce different later realized reality?',
      scope:'Diagnostic only. No new relation-sequence authority or outcome rule is introduced. Two paired OASIS worlds differ only in the order of two post-departure relation events, then receive the identical deterministic future environment for 3600 ticks. The diagnostic asks whether existing engine mechanisms naturally amplify that order difference into later behavior/state.',
      priorArtBoundary:'Order-dependent event models and relational-event models already establish that event history can affect future events. This stage tests only whether that causal consumption path already exists in the current OASIS implementation.',
      english:{
        causalPath:'관측된 관계순서 차이가 기존 엔진 내부 연산을 통해 후속 선택·상태 차이로 전달되는 경로',
        downstreamReality:'그 이후 실제로 실현된 선택, 방문, 히든 상태, 나선, 실행가능성 등 후속 상태',
        pairedWorlds:'처리변수 하나만 다르고 나머지 초기조건과 미래환경을 동일하게 둔 두 세계',
        diagnostic:'어느 결론이 나와도 실험 자체는 유효하며, 존재 여부를 판별하는 진단'
      },
      controls:{sameFutureEnvironment:true,newAuthorityRule:false,newOutcomeRule:false,horizonTicks:horizon},
      gatedPlace:{id:gatedId,gate},otherNpc,trace,
      seeds:{relationReturn:seedA,relationTransition:seedB},
      initialControl,
      checkpoints,
      downstreamSameAtAllCheckpoints,
      firstBehavioralDivergence,
      enoughFutureAction,
      controlsPass,
      interpretation:!controlsPass
        ?'STAGE23_DIAGNOSTIC_CONTROL_FAILURE'
        :downstreamSameAtAllCheckpoints
          ?'STAGE23_CURRENT_ENGINE_HAS_NO_OBSERVED_RELATIONAL_SEQUENCE_TO_DOWNSTREAM_CAUSAL_PATH'
          :'STAGE23_EXISTING_ENGINE_SHOWS_RELATIONAL_SEQUENCE_DOWNSTREAM_CAUSAL_EFFECT',
      oasisInterpretation:downstreamSameAtAllCheckpoints
        ?'The current engine can observe the relational continuation difference after Stage 22, but does not presently consume that difference into later realized reality. Therefore the user-level return-versus-reconfiguration outcome hypothesis is not yet testable as an endogenous engine effect without adding a new causal mechanism.'
        :'A downstream divergence emerged without adding a new sequence policy. The next step must isolate which existing mechanism consumed the relation order before assigning any OASIS meaning to that divergence.'
    };
  });

  report.errors=errors;report.cleanPage=errors.length===0;
  console.log('\nSTAGE 23 — RELATIONAL CONTINUATION DOWNSTREAM CAUSAL-PATH DIAGNOSTIC');
  console.log(JSON.stringify(report,null,2));
  assert(report.cleanPage,'no page errors');
  assert(report.controlsPass,'paired-world diagnostic controls are valid and future actions occurred');
  assert(report.interpretation!=='STAGE23_DIAGNOSTIC_CONTROL_FAILURE','Stage 23 produces a valid causal-path diagnosis');
  await writeFile('reality-flow-relational-continuation-downstream-diagnostic-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
