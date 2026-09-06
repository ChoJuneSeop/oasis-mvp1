import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4191','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4191/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  await page.evaluate(()=>{
    window.__stage21CoreRefs={
      actionableIds,
      activeEpisodes:OASISRealityFlowTopology.activeEpisodes,
      currentGateAuthority:OASISRelationAuthority.currentGateAuthority,
      participants,
      evalP
    };
  });
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 21');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const otherNpc=(npcs||[]).map(x=>x[0]).find(n=>n!==gate);
    if(!otherNpc)throw new Error('No comparison NPC available for Stage 21');

    const trace=[0.10,0.20,0.05,0.30];
    const anchorTick=1070;

    function arm(postOrder,label){
      E={tick:1100,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      P.relationHistory=[
        {t:1030,npc:gate,place:'road'},
        {t:anchorTick,npc:postOrder[0],place:'road'},
        {t:1090,npc:postOrder[1],place:'road'}
      ];
      P.relationField.episodes=[{
        tag:'stage21-shared-experience',t:1040,
        key:[gate,otherNpc].sort().join('↔'),a:gate,b:otherNpc,
        places:[gatedId,'road'],from:[1030,1040],
        flowTopologyRuns:[1,-1,1],flowTopologyKey:'1>-1>1'
      }];

      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const witness=OASISRelationContinuation.snapshot(P,anchorTick);
      const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag).sort();
      const gateAuthority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const actionable=actionableIds(S,P,1);
      return{
        label,
        topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        witness,
        active,
        gateAuthority,
        gatedActionable:actionable.includes(gatedId),
        actionable,
        participants:[...participants(S,P,1)].sort(),
        ranking:evalP(S,P,1).map(r=>r.id)
      };
    }

    const relationReturn=arm([otherNpc,gate],'relation-return');
    const relationTransition=arm([gate,otherNpc],'relation-transition');
    const refs=window.__stage21CoreRefs;
    const checks={
      observerLoaded:!!window.OASISRelationContinuation,
      sameScalarTopology:relationReturn.topologyKey===relationTransition.topologyKey&&relationReturn.topologyKey==='1>-1>1',
      witnessDistinguishesOrder:relationReturn.witness.signature!==relationTransition.witness.signature,
      witnessDistinguishesCurrentRelationalEndpoint:relationReturn.witness.currentRelationalEndpoint?.npc!==relationTransition.witness.currentRelationalEndpoint?.npc,
      sameActiveEpisode:JSON.stringify(relationReturn.active)===JSON.stringify(relationTransition.active),
      sameGateAuthority:relationReturn.gateAuthority===relationTransition.gateAuthority,
      sameGatedActionability:relationReturn.gatedActionable===relationTransition.gatedActionable,
      sameParticipants:JSON.stringify(relationReturn.participants)===JSON.stringify(relationTransition.participants),
      sameRanking:JSON.stringify(relationReturn.ranking)===JSON.stringify(relationTransition.ranking),
      noCoreFunctionReplacement:
        refs.actionableIds===actionableIds&&
        refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&
        refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&
        refs.participants===participants&&
        refs.evalP===evalP
    };

    E=originalE;
    return{
      question:'Can OASIS preserve the post-heterogeneity relational continuation that Stage 20 showed was aliased, without granting that observation any decision or execution authority?',
      scope:'Observation-only adequacy validation. The new witness records ordered relational events after a supplied observation anchor and must distinguish Stage 20 arms while leaving current authority, participation, ranking, and actionability unchanged. It does not define heterogeneity, select an action, or claim sequence representation as novel.',
      priorArtBoundary:'Ordered relational-event histories and temporal motifs are established prior art. The contribution tested here is only architectural separation: observation is added before any authority is granted to it.',
      english:{
        witness:'관측된 차이가 실제로 보존되는지 확인하기 위한 관측 증거',
        observationOnly:'정보를 기록·구별하지만 선택이나 실행 권한에는 개입하지 않는 상태',
        relationalContinuation:'현재 흐름에서 관계 사건이 어떤 순서로 이어지는지 나타내는 연속 과정',
        observationAnchor:'관측 구간을 시작하기 위해 실험에서 제공한 시점; 이 자체를 이질성의 고정 정의로 사용하지 않음'
      },
      anchorTick,trace,gatedPlace:{id:gatedId,gate},otherNpc,
      arms:{relationReturn,relationTransition},checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE21_RELATIONAL_CONTINUATION_OBSERVATION_SURVIVES_WITHOUT_AUTHORITY'
        :'STAGE21_RELATIONAL_CONTINUATION_OBSERVATION_FAILED',
      oasisInterpretation:'If confirmed, Stage 20 blindness can be repaired first at the observation layer without prematurely deciding what the relational difference means. The next stage must test whether any use of this witness in authority is necessary and causally justified.'
    };
  });

  report.errors=errors;report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE21_RELATIONAL_CONTINUATION_OBSERVATION_FAILED';

  console.log('\nSTAGE 21 — RELATIONAL CONTINUATION OBSERVATION-ONLY VALIDATION');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE21_RELATIONAL_CONTINUATION_OBSERVATION_SURVIVES_WITHOUT_AUTHORITY','Stage 21 preserves relation continuation without authority leakage');
  await writeFile('reality-flow-relational-continuation-observation-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
