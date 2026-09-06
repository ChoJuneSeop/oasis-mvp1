import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4190','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4190/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 20');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const otherNpc=(npcs||[]).map(x=>x[0]).find(n=>n!==gate);
    if(!otherNpc)throw new Error('No comparison NPC available for Stage 20');

    const trace=[0.10,0.20,0.05,0.30];
    const heterogeneityTick=970;

    function arm(postOrder,label){
      E={tick:1000,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;

      // Same relational inventory in both arms. Only the post-heterogeneity
      // sequence is reversed, so simple possession/count cannot distinguish them.
      P.relationHistory=[
        {t:930,npc:gate,place:'road'},
        {t:heterogeneityTick,npc:postOrder[0],place:'road'},
        {t:990,npc:postOrder[1],place:'road'}
      ];
      P.relationField.episodes=[{
        tag:'stage20-shared-experience',t:940,
        key:[gate,otherNpc].sort().join('↔'),a:gate,b:otherNpc,
        places:[gatedId,'road'],from:[930,940],
        flowTopologyRuns:[1,-1,1],flowTopologyKey:'1>-1>1'
      }];

      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const post=P.relationHistory.filter(x=>x.t>=heterogeneityTick);
      const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag).sort();
      const authority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const actionable=actionableIds(S,P,1);
      const participantsNow=[...participants(S,P,1)].sort();
      const ranking=evalP(S,P,1).map(r=>r.id);

      return{
        label,
        endpoint:S.danger,
        scalarTrace:[...trace],
        topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        topologyRuns:OASISRealityFlowTopology.currentRunsForParty(S,P),
        relationInventory:P.relationHistory.map(x=>x.npc).sort(),
        relationInventoryCounts:P.relationHistory.reduce((a,x)=>(a[x.npc]=(a[x.npc]||0)+1,a),{}),
        postHeterogeneitySequence:post.map(x=>x.npc),
        currentRelationalEndpoint:post.at(-1)?.npc||null,
        gateRemembered:relationExists(P,gate),
        otherRemembered:relationExists(P,otherNpc),
        active,
        gateAuthority:authority,
        gatedActionable:actionable.includes(gatedId),
        actionable,
        participants:participantsNow,
        ranking
      };
    }

    const relationReturn=arm([otherNpc,gate],'relation-return');
    const relationTransition=arm([gate,otherNpc],'relation-transition');

    const checks={
      sameScalarTrace:JSON.stringify(relationReturn.scalarTrace)===JSON.stringify(relationTransition.scalarTrace),
      sameEndpoint:relationReturn.endpoint===relationTransition.endpoint,
      sameScalarTopology:relationReturn.topologyKey===relationTransition.topologyKey&&relationReturn.topologyKey==='1>-1>1',
      sameRelationInventory:JSON.stringify(relationReturn.relationInventory)===JSON.stringify(relationTransition.relationInventory),
      sameRelationInventoryCounts:JSON.stringify(relationReturn.relationInventoryCounts)===JSON.stringify(relationTransition.relationInventoryCounts),
      bothRelationsRemembered:relationReturn.gateRemembered&&relationReturn.otherRemembered&&relationTransition.gateRemembered&&relationTransition.otherRemembered,
      differentPostHeterogeneitySequence:JSON.stringify(relationReturn.postHeterogeneitySequence)!==JSON.stringify(relationTransition.postHeterogeneitySequence),
      differentCurrentRelationalEndpoint:relationReturn.currentRelationalEndpoint!==relationTransition.currentRelationalEndpoint,
      sameActiveEpisode:JSON.stringify(relationReturn.active)===JSON.stringify(relationTransition.active)&&relationReturn.active.includes('stage20-shared-experience'),
      sameGateAuthority:relationReturn.gateAuthority===relationTransition.gateAuthority&&relationReturn.gateAuthority,
      sameGatedActionability:relationReturn.gatedActionable===relationTransition.gatedActionable&&relationReturn.gatedActionable
    };

    E=originalE;
    return{
      question:'With scalar Reality Flow, stored experience, and relational inventory held equal, does current OASIS authority distinguish different relational sequences after the same heterogeneity?',
      scope:'Internal-validity falsification of post-heterogeneity relational-sequence consumption. It does not assert which continuation should receive authority, does not claim temporal event ordering as novel, and does not modify production authority rules.',
      priorArtBoundary:'Relational event models, temporal networks, and order-dependent event models already establish that interaction order can carry information. Stage 20 tests only whether the present OASIS implementation consumes that information in current authority.',
      english:{
        relationalSequence:'관계 사건이 시간상 발생한 순서',
        aliasing:'서로 다른 흐름을 같은 내부 표현 또는 같은 판단으로 합쳐버리는 현상',
        postHeterogeneity:'이질성 발생 이후 이어지는 흐름',
        relationalEndpoint:'현재 흐름에서 가장 최근에 도달한 관계 사건의 끝점'
      },
      controls:{
        sameScalarTrace:true,
        sameStoredExperience:true,
        sameRelationInventory:true,
        onlyTreatment:'order of the two post-heterogeneity relational events'
      },
      gatedPlace:{id:gatedId,gate},otherNpc,heterogeneityTick,trace,
      arms:{relationReturn,relationTransition},
      checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE20_POST_HETEROGENEITY_RELATIONAL_SEQUENCE_ALIASING_CONFIRMED'
        :'STAGE20_RELATIONAL_SEQUENCE_ALIASING_NOT_ESTABLISHED',
      oasisInterpretation:'If confirmed, the current authority path remains scalar-topology dominated: it can preserve relation possession while failing to consume how relations continue after heterogeneity. This establishes blindness, not the correct authority policy.',
      nextBoundary:'If confirmed, the next experiment should add only an observational relational-continuation witness before granting it any decision or execution authority.'
    };
  });

  report.errors=errors;report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE20_RELATIONAL_SEQUENCE_ALIASING_NOT_ESTABLISHED';

  console.log('\nSTAGE 20 — POST-HETEROGENEITY RELATIONAL-SEQUENCE ALIASING KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE20_POST_HETEROGENEITY_RELATIONAL_SEQUENCE_ALIASING_CONFIRMED','Stage 20 establishes post-heterogeneity relational-sequence blindness');
  await writeFile('reality-flow-post-heterogeneity-relation-aliasing-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
