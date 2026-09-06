import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4200','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4200/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationExperienceStoreFullHistory,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:200,worlds:{},paused:true};
    const retain=mkW('full'),ablate=mkW('full');
    E.worlds={retain,ablate};
    const trace=[0.10,0.20,0.05,0.30];

    function project(S,P){
      const rows=evalP(S,P,1),g=sig(rows);
      return{
        actionable:[...actionableIds(S,P,1)],
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),
        choice:g.choice,
        candidates:g.cands,
        leader:g.leader,
        hidden:[...(P.hiddenCandidates||[])].sort()
      };
    }
    function seed(S,label){
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      outcome(S,P,'market');
      if(!P.possibilityPaths?.shrine)throw new Error('Stage 30 requires naturally generated unrealized shrine path after meeting 미라');
      return P;
    }
    const A=seed(retain,'retain-seed'),B=seed(ablate,'ablate-seed');
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const baselineA=project(retain,A),baselineB=project(ablate,B);
    const pathBefore=JSON.parse(JSON.stringify(A.possibilityPaths.shrine));

    delete B.possibilityPaths.shrine;
    const afterAblationBeforeOutcomeA=project(retain,A);
    const afterAblationBeforeOutcomeB=project(ablate,B);

    const reads={retain:{decision:0,outcome:0,postDecision:0},ablate:{decision:0,outcome:0,postDecision:0}};
    let phase='decision';
    function instrument(P,arm){
      const raw=P.possibilityPaths;
      P.possibilityPaths=new Proxy(raw,{
        get(t,p,r){reads[arm][phase]++;return Reflect.get(t,p,r)},
        ownKeys(t){reads[arm][phase]++;return Reflect.ownKeys(t)},
        getOwnPropertyDescriptor(t,p){return Reflect.getOwnPropertyDescriptor(t,p)},
        set(t,p,v,r){return Reflect.set(t,p,v,r)},
        deleteProperty(t,p){return Reflect.deleteProperty(t,p)}
      });
    }
    instrument(A,'retain');instrument(B,'ablate');

    phase='decision';
    project(retain,A);project(ablate,B);

    phase='outcome';
    E.tick=201;
    outcome(retain,A,'forest');
    outcome(ablate,B,'forest');

    const pathAfter=A.possibilityPaths.shrine?JSON.parse(JSON.stringify(A.possibilityPaths.shrine)):null;
    const relationAfter={
      retain:A.relationHistory.map(x=>`${x.t}:${x.npc}@${x.place}`),
      ablate:B.relationHistory.map(x=>`${x.t}:${x.npc}@${x.place}`)
    };

    phase='postDecision';
    const postA=project(retain,A),postB=project(ablate,B);

    const checks={
      sameBaselineBeforeAblation:same(baselineA,baselineB),
      naturalUnrealizedPathGenerated:!!pathBefore&&pathBefore.realized==null,
      onlyPossibilityTrackerAblated:!('shrine' in B.possibilityPaths)&&('shrine' in A.possibilityPaths),
      decisionSameImmediatelyAfterTrackerAblation:same(afterAblationBeforeOutcomeA,afterAblationBeforeOutcomeB),
      decisionPathDoesNotConsumePossibilityTracker:reads.retain.decision===0&&reads.ablate.decision===0,
      outcomePathTouchesPossibilityTracker:reads.retain.outcome>0&&reads.ablate.outcome>0,
      sameRealizedOutcomeApplied:relationAfter.retain.at(-1)?.endsWith('엘리@forest')&&relationAfter.ablate.at(-1)?.endsWith('엘리@forest'),
      unrealizedPathNotRewrittenByOtherRealizedOutcome:same(pathBefore,pathAfter),
      nextDecisionSameAfterAblationAndSameOutcome:same(postA,postB),
      postOutcomeDecisionStillDoesNotConsumePossibilityTracker:reads.retain.postDecision===0&&reads.ablate.postDecision===0,
      cleanPage:errors.length===0
    };

    E=originalE;
    return{
      version:'OASIS Integrated Core v2.3 validation',
      question:'After one possibility is generated but remains unrealized, does retaining that unrealized possibility causally affect the next current possibility/selection structure after a different possibility is realized, or is it only tracking metadata in the present implementation?',
      scope:'Stage 30 causal-consumption ablation only. The unrealized possibility is generated naturally by the existing world encounter and existing possibility-path tracker. Two otherwise matched OASIS worlds are used; only the tracker entry for the unrealized shrine path is removed in one arm. The same different world outcome is then realized in both arms. No OASIS decision semantics, relation authority rule, probability rule, reward rule, or world threshold is added.',
      killSearchBoundary:'Prior work already shows latent updating of unchosen actions, so retention or updating of unchosen alternatives is not claimed as novelty. This stage tests the stronger OASIS implementation claim: whether an unrealized possibility is relationally rewritten by realized reality and functionally changes the next constructible possibility/decision state.',
      english:{
        ablation:'절제실험 — 특정 요소만 제거해 그 요소의 인과적 기여를 확인하는 방법',
        causalConsumption:'인과적 소비 — 저장된 정보가 실제 후속 판단 연산의 입력으로 사용되는 것',
        unrealizedPossibility:'비현실화 가능성 — 현재 후보였지만 이번 현실에서 실제 현재로 선택·실현되지 않은 가능성',
        trackingMetadata:'추적 메타데이터 — 상태를 기록하지만 그 자체가 판단 결과를 바꾸지는 않는 기록 정보'
      },
      controls:{sameFlowTrace:true,sameEngine:true,sameRealizedOutcome:true,noDecisionSemanticPatch:true,trackerOnlyAblation:true},
      path:{before:pathBefore,afterDifferentOutcome:pathAfter},
      reads,
      relationAfter,
      states:{baseline:{retain:baselineA,ablate:baselineB},afterTrackerAblationBeforeOutcome:{retain:afterAblationBeforeOutcomeA,ablate:afterAblationBeforeOutcomeB},afterSameDifferentOutcome:{retain:postA,ablate:postB}},
      checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE30_UNREALIZED_PATH_TRACKED_BUT_NOT_CAUSALLY_REWRITTEN_OR_CONSUMED'
        :'STAGE30_UNREALIZED_POSSIBILITY_DIAGNOSTIC_REQUIRES_INSPECTION',
      oasisInterpretation:'If confirmed, the current engine can preserve an unrealized possibility as a path record, but that record is neither rewritten by a different realized outcome nor consumed by the next decision path. This is an implementation/formalization gap for the stronger W_t -> C_(t+1) claim, not a falsification of the OASIS theory. The paper must not present simple possibility-path retention as evidence of relational rewrite.'
    };
  });

  report.errors=errors;
  console.log('\nSTAGE 30 — UNREALIZED POSSIBILITY CAUSAL-CONSUMPTION KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE30_UNREALIZED_PATH_TRACKED_BUT_NOT_CAUSALLY_REWRITTEN_OR_CONSUMED','current implementation tracks but does not causally rewrite/consume unrealized possibility');
  await writeFile('reality-flow-unrealized-possibility-stage30-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
