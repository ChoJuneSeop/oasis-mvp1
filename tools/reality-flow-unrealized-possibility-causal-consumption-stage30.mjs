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
    function project(S,P){const rows=evalP(S,P,1),g=sig(rows);return{actionable:[...actionableIds(S,P,1)],participants:[...participants(S,P,1)].sort(),ranking:rows.map(r=>r.id),choice:g.choice,candidates:g.cands,leader:g.leader,hidden:[...(P.hiddenCandidates||[])].sort()};}
    function seed(S,label){const P=S.parties[0];P.target='road';P._realityFlowTopologyAnchor=null;OASISRealityFlowTopology.ingestTrace(S,trace,label);outcome(S,P,'market');if(!P.possibilityPaths?.shrine)throw new Error('Stage 30 requires naturally generated unrealized shrine path after meeting 미라');return P;}
    const A=seed(retain,'retain-seed'),B=seed(ablate,'ablate-seed');
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const baselineA=project(retain,A),baselineB=project(ablate,B);
    const pathBefore=JSON.parse(JSON.stringify(A.possibilityPaths.shrine));
    delete B.possibilityPaths.shrine;
    const preA=project(retain,A),preB=project(ablate,B);
    const reads={retain:{decision:0,outcome:0,postDecision:0},ablate:{decision:0,outcome:0,postDecision:0}};let phase='decision';
    function instrument(P,arm){const raw=P.possibilityPaths;P.possibilityPaths=new Proxy(raw,{get(t,p,r){reads[arm][phase]++;return Reflect.get(t,p,r)},ownKeys(t){reads[arm][phase]++;return Reflect.ownKeys(t)},getOwnPropertyDescriptor(t,p){return Reflect.getOwnPropertyDescriptor(t,p)},set(t,p,v,r){return Reflect.set(t,p,v,r)},deleteProperty(t,p){return Reflect.deleteProperty(t,p)}});}
    instrument(A,'retain');instrument(B,'ablate');
    phase='decision';project(retain,A);project(ablate,B);
    phase='outcome';E.tick=201;outcome(retain,A,'forest');outcome(ablate,B,'forest');
    const pathAfter=A.possibilityPaths.shrine?JSON.parse(JSON.stringify(A.possibilityPaths.shrine)):null;
    const relationAfter={retain:A.relationHistory.map(x=>`${x.t}:${x.npc}@${x.place}`),ablate:B.relationHistory.map(x=>`${x.t}:${x.npc}@${x.place}`)};
    phase='postDecision';const postA=project(retain,A),postB=project(ablate,B);
    const controls={sameBaselineBeforeAblation:same(baselineA,baselineB),naturalUnrealizedPathGenerated:!!pathBefore&&pathBefore.realized==null,onlyPossibilityTrackerAblated:!('shrine' in B.possibilityPaths)&&('shrine' in A.possibilityPaths),sameRealizedOutcomeApplied:relationAfter.retain.at(-1)?.endsWith('엘리@forest')&&relationAfter.ablate.at(-1)?.endsWith('엘리@forest'),cleanPage:errors.length===0};
    const observations={decisionSameImmediatelyAfterTrackerAblation:same(preA,preB),decisionReadsPossibilityTracker:reads.retain.decision>0||reads.ablate.decision>0,outcomeTouchesPossibilityTracker:reads.retain.outcome>0||reads.ablate.outcome>0,unrealizedPathRewrittenByOtherRealizedOutcome:!same(pathBefore,pathAfter),nextDecisionDiffersAfterAblationAndSameOutcome:!same(postA,postB),postOutcomeDecisionReadsPossibilityTracker:reads.retain.postDecision>0||reads.ablate.postDecision>0};
    const functionalCausalEffect=observations.nextDecisionDiffersAfterAblationAndSameOutcome;
    const directDecisionConsumption=observations.decisionReadsPossibilityTracker||observations.postOutcomeDecisionReadsPossibilityTracker;
    const interpretation=functionalCausalEffect?'STAGE30_CAUSAL_EFFECT_CANDIDATE_REQUIRES_STRONG_BASELINE':directDecisionConsumption?'STAGE30_TRACKER_READ_WITHOUT_OBSERVED_DECISION_DIVERGENCE':'STAGE30_NO_FUNCTIONAL_CAUSAL_CONSUMPTION_OBSERVED';
    E=originalE;
    return{version:'OASIS Integrated Core v2.3 validation',question:'Does retaining a naturally generated but unrealized possibility causally alter the next constructible possibility/selection state after the same different outcome is realized?',scope:'Outcome-neutral Stage 30 ablation. Two matched worlds differ only by removal of one naturally generated unrealized possibility tracker entry. No OASIS semantics are patched.',killSearchBoundary:'Prior work already demonstrates updating of unchosen alternatives; retention or rewriting alone is not novelty. Only functional causal influence on the next constructed state can advance the stronger OASIS claim.',english:{ablation:'절제실험 — 특정 요소만 제거해 인과적 기여를 확인',causalConsumption:'인과적 소비 — 저장된 정보가 실제 후속 판단 연산에 입력되어 결과 구조에 영향을 주는 것',trackingMetadata:'추적 메타데이터 — 기록되지만 판단 구조를 바꾸지 않을 수 있는 정보'},controls,observations,functionalCausalEffect,directDecisionConsumption,interpretation,path:{before:pathBefore,afterDifferentOutcome:pathAfter},reads,relationAfter,states:{baseline:{retain:baselineA,ablate:baselineB},afterTrackerAblationBeforeOutcome:{retain:preA,ablate:preB},afterSameDifferentOutcome:{retain:postA,ablate:postB}},scientificStatus:functionalCausalEffect?'PARTIAL SUPPORT':'FAIL_FOR_CURRENT_IMPLEMENTATION',oasisInterpretation:functionalCausalEffect?'A functional effect is observed, but novelty is not established; compare against strong counterfactual/memory baselines next.':'The present implementation does not show that retaining this unrealized possibility changes the next constructed decision state. This is an implementation/formalization gap for W_t -> C_(t+1), not by itself a falsification of the abstract OASIS theory.'};
  });
  report.errors=errors;
  console.log('\nSTAGE 30 — OUTCOME-NEUTRAL UNREALIZED POSSIBILITY CAUSAL-CONSUMPTION DIAGNOSTIC');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.controls))assert(v,k);
  await writeFile('reality-flow-unrealized-possibility-stage30-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
