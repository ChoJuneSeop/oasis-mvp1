import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile,readFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4191','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  const witnessSource=await readFile('relation-continuation-witness.js','utf8');
  const noFixedStage20Tick=!witnessSource.includes('970')&&!witnessSource.includes('heterogeneityTick');
  const noAuthorityOverrides=!/\b(actionableIds|participants|memberRank|choose|outcome)\s*=/.test(witnessSource);

  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4191/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  await page.addScriptTag({path:path.resolve('relation-continuation-witness.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuationWitness);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 21');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const otherNpc=(npcs||[]).map(x=>x[0]).find(n=>n!==gate);
    if(!otherNpc)throw new Error('No comparison NPC available for Stage 21');

    function arm(postOrder,label,trace=[0.10,0.20,0.05,0.30],tick=1000){
      E={tick,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);

      const crossings=OASISRelationContinuationWitness.structuralCrossings(S);
      const departure=crossings[0];
      if(!departure)throw new Error(`No structural departure detected for ${label}`);

      // Relational events are positioned relative to the flow-derived crossing,
      // never to an externally fixed heterogeneity tick.
      P.relationHistory=[
        {t:departure.t-2,npc:gate,place:'road'},
        {t:departure.t,npc:postOrder[0],place:'road'},
        {t:departure.t+1,npc:postOrder[1],place:'road'}
      ];
      P.relationField.episodes=[{
        tag:'stage21-shared-experience',t:departure.t-1,
        key:[gate,otherNpc].sort().join('↔'),a:gate,b:otherNpc,
        places:[gatedId,'road'],from:[departure.t-2,departure.t-1],
        flowTopologyRuns:[1,-1,1],flowTopologyKey:'1>-1>1'
      }];

      const before={
        history:JSON.stringify(P.relationHistory),
        episodes:JSON.stringify(P.relationField.episodes),
        authority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        actionable:JSON.stringify(actionableIds(S,P,1)),
        participants:JSON.stringify([...participants(S,P,1)].sort()),
        ranking:JSON.stringify(evalP(S,P,1).map(r=>r.id))
      };

      const witness=OASISRelationContinuationWitness.firstDepartureWitness(S,P);

      const after={
        history:JSON.stringify(P.relationHistory),
        episodes:JSON.stringify(P.relationField.episodes),
        authority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        actionable:JSON.stringify(actionableIds(S,P,1)),
        participants:JSON.stringify([...participants(S,P,1)].sort()),
        ranking:JSON.stringify(evalP(S,P,1).map(r=>r.id))
      };

      return{
        label,trace:[...trace],tick,endpoint:S.danger,
        topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        crossings,
        derivedDepartureTick:departure.t,
        witness,
        authority:after.authority,
        gatedActionable:JSON.parse(after.actionable).includes(gatedId),
        actionable:JSON.parse(after.actionable),
        participants:JSON.parse(after.participants),
        ranking:JSON.parse(after.ranking),
        witnessSideEffectFree:JSON.stringify(before)===JSON.stringify(after)
      };
    }

    const baseReturn=arm([otherNpc,gate],'base-return');
    const baseTransition=arm([gate,otherNpc],'base-transition');
    const timeShiftReturn=arm([otherNpc,gate],'time-shift-return',[0.10,0.20,0.05,0.30],1500);
    const timeShiftTransition=arm([gate,otherNpc],'time-shift-transition',[0.10,0.20,0.05,0.30],1500);
    const denseTrace=[0.10,0.15,0.20,0.12,0.05,0.15,0.30];
    const denseReturn=arm([otherNpc,gate],'dense-return',denseTrace,2000);
    const denseTransition=arm([gate,otherNpc],'dense-transition',denseTrace,2000);

    const sameAuthority=(a,b)=>a.authority===b.authority&&a.gatedActionable===b.gatedActionable&&JSON.stringify(a.actionable)===JSON.stringify(b.actionable)&&JSON.stringify(a.participants)===JSON.stringify(b.participants)&&JSON.stringify(a.ranking)===JSON.stringify(b.ranking);
    const sameWitnessShape=(a,b)=>JSON.stringify(a.witness.sequence)===JSON.stringify(b.witness.sequence)&&JSON.stringify(a.witness.transitions)===JSON.stringify(b.witness.transitions)&&a.witness.endpoint===b.witness.endpoint;

    const checks={
      crossingDerivedFromFlow:baseReturn.derivedDepartureTick===baseReturn.crossings[0].t&&baseReturn.crossings[0].fromDir===1&&baseReturn.crossings[0].toDir===-1,
      baseScalarControlsEqual:JSON.stringify(baseReturn.trace)===JSON.stringify(baseTransition.trace)&&baseReturn.endpoint===baseTransition.endpoint&&baseReturn.topologyKey===baseTransition.topologyKey,
      baseWitnessDistinguishesOrder:JSON.stringify(baseReturn.witness.sequence)!==JSON.stringify(baseTransition.witness.sequence)&&baseReturn.witness.endpoint!==baseTransition.witness.endpoint,
      baseAuthorityUnaffected:sameAuthority(baseReturn,baseTransition),
      witnessReadOnly:[baseReturn,baseTransition,timeShiftReturn,timeShiftTransition,denseReturn,denseTransition].every(x=>x.witnessSideEffectFree),
      absoluteTimeShiftInvariant:sameWitnessShape(baseReturn,timeShiftReturn)&&sameWitnessShape(baseTransition,timeShiftTransition)&&baseReturn.derivedDepartureTick!==timeShiftReturn.derivedDepartureTick,
      denseScalarResamplingStillFindsDeparture:denseReturn.crossings.length>=2&&denseReturn.crossings[0].fromDir===1&&denseReturn.crossings[0].toDir===-1,
      denseWitnessPreservesRelationalOrder:sameWitnessShape(baseReturn,denseReturn)&&sameWitnessShape(baseTransition,denseTransition),
      denseAuthorityStillUnaffected:sameAuthority(denseReturn,denseTransition),
      witnessAddsObservationNotPolicy:baseReturn.witness.sequence.join('→')===`${otherNpc}→${gate}`&&baseTransition.witness.sequence.join('→')===`${gate}→${otherNpc}`&&sameAuthority(baseReturn,baseTransition)
    };

    E=originalE;
    return{
      question:'Can OASIS observe post-departure relational continuation from a flow-derived structural crossing, without a fixed heterogeneity tick and without granting the observation any authority?',
      scope:'Observation-only validation. The witness derives structural crossings from the already observed scalar flow and reads subsequent relation-history order. It does not alter current relation authority, actionability, participants, ranking, choice, or outcomes.',
      priorArtBoundary:'Relational Event Models, temporal networks, and event graphs already establish ordered relational histories as meaningful data structures. This stage claims no novelty for temporal event ordering or event-sequence representation.',
      english:{
        witness:'판단권을 주지 않고 현재 흐름에 관한 사실을 보존하는 관측 증거',
        structuralDeparture:'기존에 확정된 방향 구조의 기준선을 실제로 넘어 반대 방향 구조가 성립한 관측 사건',
        relationalContinuation:'그 구조적 이탈 이후 관계 사건들이 어떤 순서로 이어지는가',
        observationOnly:'관측값을 기록·조회하지만 행동이나 실행권 계산에는 개입하지 않는 상태'
      },
      controls:{fixedHeterogeneityTick:null,authorityPolicyChange:false,choicePolicyChange:false,absoluteTimeShift:true,denseScalarResampling:true},
      gatedPlace:{id:gatedId,gate},otherNpc,
      arms:{baseReturn,baseTransition,timeShiftReturn,timeShiftTransition,denseReturn,denseTransition},
      checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE21_FLOW_DERIVED_RELATIONAL_CONTINUATION_WITNESS_SURVIVES':'STAGE21_RELATIONAL_CONTINUATION_WITNESS_FAILED',
      nextBoundary:'If this survives, the next falsification must test whether the witness distinguishes benign return-to-prior-relation from a continuation that actually changes later reality, before any authority is connected to it.'
    };
  });

  report.sourceChecks={noFixedStage20Tick,noAuthorityOverrides};
  report.errors=errors;
  report.checks.noFixedStage20Tick=noFixedStage20Tick;
  report.checks.noAuthorityOverrides=noAuthorityOverrides;
  report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE21_RELATIONAL_CONTINUATION_WITNESS_FAILED';

  console.log('\nSTAGE 21 — FLOW-DERIVED RELATIONAL-CONTINUATION WITNESS');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE21_FLOW_DERIVED_RELATIONAL_CONTINUATION_WITNESS_SURVIVES','Stage 21 witness survives observation-only controls');
  await writeFile('reality-flow-relational-continuation-witness-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
