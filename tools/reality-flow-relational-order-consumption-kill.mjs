import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const server=spawn('python3',['-m','http.server','4198','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  const storeSource=await readFile('relation-experience-store-fullhistory.js','utf8');
  const topologySource=await readFile('reality-flow-topology.js','utf8');
  const authoritySource=await readFile('relation-authority-gate.js','utf8');
  const sourceChecks={
    chronologyStoredInEpisode:/from:\s*\[prev\.t\s*,\s*cur\.t\]/.test(storeSource),
    topologyDoesNotReadEpisodeChronology:!/ep\.from/.test(topologySource),
    authorityDoesNotReadEpisodeChronology:!/ep\.from/.test(authoritySource)
  };

  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4198/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority&&!!window.OASISRelationExperienceStoreFullHistory,null,{timeout:60000});
  await page.evaluate(()=>{
    window.__stage28CoreRefs={
      actionableIds,
      activeEpisodes:OASISRealityFlowTopology.activeEpisodes,
      currentGateAuthority:OASISRelationAuthority.currentGateAuthority,
      participants,
      evalP,
      tickW
    };
  });
  await page.addScriptTag({path:path.resolve('relation-continuation-observer.js')});
  await page.waitForFunction(()=>!!window.OASISRelationContinuation?.batchedSnapshot);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 28');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const gateNpc=(npcs||[]).find(x=>x[0]===gate);
    const others=(npcs||[]).filter(x=>x[0]!==gate);
    const other=others[0],third=others.find(x=>x[0]!==other?.[0]);
    if(!gateNpc||!other||!third)throw new Error('Stage 28 requires three distinct NPCs including the gate NPC');

    E={tick:103,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={orderAB:A,orderBA:B};
    const trace=[0.10,0.20,0.05,0.30];

    function inventory(P){
      return (P.relationHistory||[]).map(e=>`${e.npc}@${e.place}`).sort();
    }
    function decisionProjection(S,P){
      return OASISRealityFlowTopology.activeEpisodes(S,P)
        .map(ep=>({key:ep.key,a:ep.a,b:ep.b,places:[...(ep.places||[])],flowTopologyKey:ep.flowTopologyKey}))
        .sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function chronologyProjection(P){
      return (P.relationField?.episodes||[])
        .map(ep=>({key:ep.key,a:ep.a,b:ep.b,from:[...(ep.from||[])]}))
        .sort((x,y)=>`${x.key}|${x.a}|${x.b}`.localeCompare(`${y.key}|${y.a}|${y.b}`));
    }
    function seed(S,first,second,label){
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const key=OASISRealityFlowTopology.currentKeyForParty(S,P);
      P.relationField.episodes=[];
      const e1={t:100,npc:first[0],place:first[1]};
      const e2={t:101,npc:second[0],place:second[1]};
      const cur={t:102,npc:third[0],place:third[1]};
      P.relationHistory=[e1,e2,cur];
      for(const x of [first,second,third])P.seenNPC.add(x[0]);
      OASISRelationExperienceStoreFullHistory.composeField(S,P,[cur]);
      for(const ep of P.relationField.episodes){ep.flowTopologyKey=key;ep.flowTopologyRuns=key?key.split('>').map(Number):[]}
      const witness=OASISRelationContinuation.batchedSnapshot(P,100);
      const active=decisionProjection(S,P);
      const authority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const actionable=[...actionableIds(S,P,1)];
      const partyParticipants=[...participants(S,P,1)].sort();
      const ranking=evalP(S,P,1).map(r=>r.id);
      return{
        label,key,witness,inventory:inventory(P),chronology:chronologyProjection(P),
        activeDecisionProjection:active,
        storedEpisodes:P.relationField.episodes.length,
        authority,gatedActionable:actionable.includes(gatedId),actionable,
        participants:partyParticipants,ranking
      };
    }

    const orderAB=seed(A,gateNpc,other,'gate-then-other');
    const orderBA=seed(B,other,gateNpc,'other-then-gate');
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const refs=window.__stage28CoreRefs;

    const checks={
      sameScalarTrace:true,
      sameTopologyKey:orderAB.key===orderBA.key,
      sameRelationInventory:same(orderAB.inventory,orderBA.inventory),
      distinctTimeOrderWitnessSurvives:orderAB.witness.signature!==orderBA.witness.signature,
      chronologyIsStoredDifferently:!same(orderAB.chronology,orderBA.chronology),
      decisionRelevantEpisodeProjectionCollapsesOrder:same(orderAB.activeDecisionProjection,orderBA.activeDecisionProjection),
      activeEpisodeEvidenceExists:orderAB.activeDecisionProjection.length>0&&orderBA.activeDecisionProjection.length>0,
      gateAuthorityActuallyActive:orderAB.authority===true&&orderBA.authority===true,
      gateAuthoritySame:orderAB.authority===orderBA.authority,
      actionabilitySame:same(orderAB.actionable,orderBA.actionable)&&orderAB.gatedActionable===orderBA.gatedActionable,
      participantsSame:same(orderAB.participants,orderBA.participants),
      rankingSame:same(orderAB.ranking,orderBA.ranking),
      episodeCountBelowLegacyCap:orderAB.storedEpisodes<80&&orderBA.storedEpisodes<80,
      noCoreFunctionReplacement:refs.actionableIds===actionableIds&&refs.activeEpisodes===OASISRealityFlowTopology.activeEpisodes&&refs.currentGateAuthority===OASISRelationAuthority.currentGateAuthority&&refs.participants===participants&&refs.evalP===evalP&&refs.tickW===tickW
    };

    E=originalE;
    return{
      question:'Does the current OASIS full-history path preserve distinct-time relational order in storage but collapse that order before current authority, actionability, participation, and ranking consume the relation experience?',
      scope:'Causal-consumption diagnostic only. Two synthetic histories contain the same relation inventory and scalar topology but reverse two events at distinct timestamps. A shared third event is then composed through the existing full-history experience store. No new sequence rule, authority rule, outcome rule, semantic threshold, or fixed history window is introduced.',
      priorArtBoundary:'If a system conditions future behavior only on a present representation that is sufficient for its transition path, older ordering information can become conditionally irrelevant. Markov/conditional-independence theory already establishes this general principle. This stage tests only where the present OASIS implementation loses or consumes ordered relational information.',
      english:{
        causalConsumption:'관측·저장된 정보가 실제 후속 판단 연산의 입력으로 사용되는 것',
        decisionProjection:'저장된 episode 중 현재 실행권·후보·참여·랭킹 경로가 실제로 소비하는 필드만 남긴 표현',
        chronologyField:'관계사건의 시간순서를 보존하는 episode.from 필드',
        sufficientPresent:'현재 표현만 알면 과거를 추가로 알아도 다음 전이에 정보가 더 늘지 않는 상태 표현'
      },
      controls:{fullHistoryStore:true,fixedRecencyWindow:false,episodeCapReached:false,newAuthorityRule:false,newOutcomeRule:false},
      gatedPlace:{id:gatedId,gate},npcs:{gate:gateNpc,other,third},trace,
      arms:{orderAB,orderBA},
      checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE28_RELATIONAL_ORDER_STORED_BUT_NOT_CONSUMED_BY_CURRENT_AUTHORITY_PATH'
        :'STAGE28_RELATIONAL_ORDER_CONSUMPTION_DIAGNOSTIC_FAILED',
      oasisInterpretation:'If confirmed, Stage 27 null results are structurally expected in the current engine: the observation/storage layer can preserve relational chronology, but the current authority path projects episodes onto order-insensitive fields before acting. This does not prove that order should gain authority; it identifies a missing causal-consumption path that must be justified separately before any Application or Execution Authority change.'
    };
  });

  report.sourceChecks=sourceChecks;
  report.errors=errors;report.cleanPage=errors.length===0;
  report.checks.sourceChronologyStored=sourceChecks.chronologyStoredInEpisode;
  report.checks.sourceTopologyIgnoresChronology=sourceChecks.topologyDoesNotReadEpisodeChronology;
  report.checks.sourceAuthorityIgnoresChronology=sourceChecks.authorityDoesNotReadEpisodeChronology;
  report.checks.cleanPage=report.cleanPage;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE28_RELATIONAL_ORDER_CONSUMPTION_DIAGNOSTIC_FAILED';

  console.log('\nSTAGE 28 — RELATIONAL ORDER CAUSAL-CONSUMPTION KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE28_RELATIONAL_ORDER_STORED_BUT_NOT_CONSUMED_BY_CURRENT_AUTHORITY_PATH','ordered relation chronology is stored but not consumed by current authority path');
  await writeFile('reality-flow-relational-order-consumption-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
