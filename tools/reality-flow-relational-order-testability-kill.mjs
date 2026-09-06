import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4199','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  const loader=await readFile('mvp3-authority-separated-fullhistory.html','utf8');
  const store=await readFile('relation-experience-store-fullhistory.js','utf8');
  const topology=await readFile('reality-flow-topology.js','utf8');
  const authority=await readFile('relation-authority-gate.js','utf8');
  const index=await readFile('index.html','utf8');
  const sourceChecks={
    productionLoaderDoesNotLoadContinuationObserver:!loader.includes('relation-continuation-observer.js'),
    chronologyStored:/from:\s*\[prev\.t\s*,\s*cur\.t\]/.test(store),
    chronologyReadByDedup:/x\.from\[0\].*x\.from\[1\]/s.test(store),
    topologyDoesNotReadChronology:!/ep\.from/.test(topology),
    authorityDoesNotReadChronology:!/ep\.from/.test(authority),
    baseWrapperDoesNotLoadContinuationObserver:!index.includes('relation-continuation-observer.js')
  };

  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4199/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority&&!!window.OASISRelationExperienceStoreFullHistory,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    const observerPresentBeforeTest=!!window.OASISRelationContinuation;
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place for Stage 29');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const gateNpc=(npcs||[]).find(x=>x[0]===gate);
    const others=(npcs||[]).filter(x=>x[0]!==gate);
    const other=others[0],third=others.find(x=>x[0]!==other?.[0]),fourth=others.find(x=>x[0]!==other?.[0]&&x[0]!==third?.[0]&&(npcs||[]).filter(n=>n[1]===x[1]).length===1);
    if(!gateNpc||!other||!third||!fourth)throw new Error('Stage 29 requires four distinct NPCs and an isolated normal-outcome NPC');

    E={tick:103,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={orderAB:A,orderBA:B};
    const trace=[0.10,0.20,0.05,0.30];

    function inventory(P){return(P.relationHistory||[]).map(e=>`${e.npc}@${e.place}`).sort()}
    function projection(S,P){
      return OASISRealityFlowTopology.activeEpisodes(S,P)
        .map(ep=>({key:ep.key,a:ep.a,b:ep.b,places:[...(ep.places||[])],flowTopologyKey:ep.flowTopologyKey}))
        .sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function decision(S,P){
      return{
        authority:OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1),
        actionable:[...actionableIds(S,P,1)],
        participants:[...participants(S,P,1)].sort(),
        ranking:evalP(S,P,1).map(r=>r.id),
        projection:projection(S,P)
      };
    }
    function seed(S,first,second,label){
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const key=OASISRealityFlowTopology.currentKeyForParty(S,P);
      P.relationField.episodes=[];
      const cur={t:102,npc:third[0],place:third[1]};
      P.relationHistory=[
        {t:100,npc:first[0],place:first[1]},
        {t:101,npc:second[0],place:second[1]},
        cur
      ];
      for(const x of [gateNpc,other,third,fourth])P.seenNPC.add(x[0]);
      OASISRelationExperienceStoreFullHistory.composeField(S,P,[cur]);
      for(const ep of P.relationField.episodes){ep.flowTopologyKey=key;ep.flowTopologyRuns=key.split('>').map(Number)}
      return{P,key};
    }

    const sa=seed(A,gateNpc,other,'gate-then-other');
    const sb=seed(B,other,gateNpc,'other-then-gate');
    const readCounts={A:{decision:0,normalOutcome:0},B:{decision:0,normalOutcome:0}};
    let phase='decision';
    function instrument(P,arm){
      for(const ep of P.relationField.episodes){
        const raw=ep.from;
        Object.defineProperty(ep,'from',{
          configurable:true,enumerable:true,
          get(){readCounts[arm][phase]=(readCounts[arm][phase]||0)+1;return raw},
          set(v){Object.defineProperty(ep,'from',{configurable:true,enumerable:true,writable:true,value:v})}
        });
      }
    }
    instrument(sa.P,'A');instrument(sb.P,'B');

    phase='decision';
    const beforeA=decision(A,sa.P),beforeB=decision(B,sb.P);
    const decisionReads={A:readCounts.A.decision,B:readCounts.B.decision};

    phase='normalOutcome';
    E.tick=104;
    outcome(A,sa.P,fourth[1]);
    outcome(B,sb.P,fourth[1]);
    const outcomeReads={A:readCounts.A.normalOutcome,B:readCounts.B.normalOutcome};

    phase='decision';
    const postA=decision(A,sa.P),postB=decision(B,sb.P);
    const postDecisionAdditionalReads={
      A:readCounts.A.decision-decisionReads.A,
      B:readCounts.B.decision-decisionReads.B
    };
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const finalEpisodes={A:sa.P.relationField.episodes.length,B:sb.P.relationField.episodes.length};

    const checks={
      observerAbsentFromProduction:observerPresentBeforeTest===false,
      sameScalarTopology:sa.key===sb.key,
      sameRelationInventoryBefore:same(inventory(sa.P).filter(x=>x!==`${fourth[0]}@${fourth[1]}`),inventory(sb.P).filter(x=>x!==`${fourth[0]}@${fourth[1]}`)),
      currentDecisionStateSameBefore:same(beforeA,beforeB),
      decisionPathDoesNotReadChronology:decisionReads.A===0&&decisionReads.B===0,
      normalOutcomePathReadsChronologyForStorage:outcomeReads.A>0&&outcomeReads.B>0,
      sameRealizedOutcomeApplied:sa.P.relationHistory.at(-1)?.npc===fourth[0]&&sb.P.relationHistory.at(-1)?.npc===fourth[0],
      currentDecisionStateSameAfter:same(postA,postB),
      postOutcomeDecisionStillDoesNotReadChronology:postDecisionAdditionalReads.A===0&&postDecisionAdditionalReads.B===0,
      noEpisodeCapReached:finalEpisodes.A<80&&finalEpisodes.B<80,
      episodeCountsRemainMatched:finalEpisodes.A===finalEpisodes.B
    };

    E=originalE;
    return{
      question:'Is ordered relational chronology causally testable in the current production world, or is it only read by storage deduplication while current decision/world-transition paths remain order-insensitive?',
      scope:'Testability/identifiability kill only. Two worlds have the same scalar topology and relation inventory with distinct-time order reversed. The existing full-history production path is used unchanged. Read instrumentation distinguishes decision-phase chronology access from chronology access during one identical normal outcome. No observer, sequence policy, authority rule, outcome rule, or semantic threshold is added.',
      priorArtBoundary:'Causal DAG and intervention theory requires a causal path/structural dependence for an intervention on a variable to affect a downstream outcome. This is established causal-inference theory; Stage 29 uses it only to test whether the present OASIS world can identify the proposed relational-order effect.',
      english:{
        identifiability:'관측 또는 개입으로 관심 인과효과를 다른 설명과 구분해 결정할 수 있는 성질',
        causalPath:'한 변수의 변화가 중간 연산들을 거쳐 후속 변수에 전달될 수 있는 방향성 경로',
        deduplication:'같은 경험을 중복 저장하지 않기 위한 저장 무결성 검사',
        readInstrumentation:'어떤 실행 단계가 특정 필드를 실제로 읽는지 계측하는 진단 방법'
      },
      controls:{productionFullHistoryPath:true,newAuthorityRule:false,newOutcomeRule:false,newObserverLoaded:false,identicalNormalOutcome:true,isolatedOutcomeNpc:true},
      gatedPlace:{id:gatedId,gate},npcs:{gate:gateNpc,other,third,fourth},trace,
      reads:{decisionBefore:decisionReads,normalOutcome:outcomeReads,decisionAfterAdditional:postDecisionAdditionalReads},
      states:{before:{orderAB:beforeA,orderBA:beforeB},after:{orderAB:postA,orderBA:postB}},
      finalEpisodes,
      checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE29_CHRONOLOGY_READ_ONLY_BY_STORAGE_DEDUP_NO_IDENTIFIED_DECISION_CAUSAL_PATH'
        :'STAGE29_RELATIONAL_ORDER_TESTABILITY_DIAGNOSTIC_FAILED',
      oasisInterpretation:'If confirmed, the current world is not an adequate environment for claiming a causal benefit from ordered relational continuation. Chronology is preserved and touched for storage integrity, but no identified production decision path consumes it. A future experiment must first introduce an order-sensitive world consequence that arises from world mechanics rather than a semantic order-to-action rule; only then can OASIS representation/authority be compared without manufacturing the desired conclusion.'
    };
  });

  report.sourceChecks=sourceChecks;
  report.errors=errors;report.cleanPage=errors.length===0;
  report.checks.sourceProductionObserverAbsent=sourceChecks.productionLoaderDoesNotLoadContinuationObserver&&sourceChecks.baseWrapperDoesNotLoadContinuationObserver;
  report.checks.sourceChronologyStored=sourceChecks.chronologyStored;
  report.checks.sourceDedupReadsChronology=sourceChecks.chronologyReadByDedup;
  report.checks.sourceTopologyIgnoresChronology=sourceChecks.topologyDoesNotReadChronology;
  report.checks.sourceAuthorityIgnoresChronology=sourceChecks.authorityDoesNotReadChronology;
  report.checks.cleanPage=report.cleanPage;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE29_RELATIONAL_ORDER_TESTABILITY_DIAGNOSTIC_FAILED';

  console.log('\nSTAGE 29 — RELATIONAL ORDER TESTABILITY / IDENTIFIABILITY KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE29_CHRONOLOGY_READ_ONLY_BY_STORAGE_DEDUP_NO_IDENTIFIED_DECISION_CAUSAL_PATH','current world does not identify an order-to-decision causal path');
  await writeFile('reality-flow-relational-order-testability-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
