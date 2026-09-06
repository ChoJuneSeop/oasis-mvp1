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
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place for Stage 29 v2.2');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;
    const gateNpc=(npcs||[]).find(x=>x[0]===gate);
    const others=(npcs||[]).filter(x=>x[0]!==gate);
    const other=others[0],third=others.find(x=>x[0]!==other?.[0]);
    if(!gateNpc||!other||!third)throw new Error('Stage 29 v2.2 requires three distinct NPCs');

    E={tick:103,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={orderAB:A,orderBA:B};
    const trace=[0.10,0.20,0.05,0.30];

    const stable=x=>JSON.stringify(x);
    const same=(x,y)=>stable(x)===stable(y);
    function inventory(P){return(P.relationHistory||[]).map(e=>`${e.npc}@${e.place}`).sort()}
    function chronology(P){return(P.relationHistory||[]).map(e=>`${e.t}:${e.npc}@${e.place}`)}
    function decision(S,P){
      const rows=evalP(S,P,1);
      const sg=sig(rows);
      return{
        actionable:[...actionableIds(S,P,1)],
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),
        choice:sg.choice||null,
        candidates:sg.cands||'',
        leader:sg.leader||null,
        rowKeys:[...new Set(rows.flatMap(r=>Object.keys(r||{})))].sort(),
        numericProbabilityExposed:rows.some(r=>Object.keys(r||{}).some(k=>/prob|chance|likelihood|확률/i.test(k)))
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
      for(const x of [gateNpc,other,third])P.seenNPC.add(x[0]);
      OASISRelationExperienceStoreFullHistory.composeField(S,P,[cur]);
      for(const ep of P.relationField.episodes){ep.flowTopologyKey=key;ep.flowTopologyRuns=key?key.split('>').map(Number):[]}
      return{P,key};
    }

    const sa=seed(A,gateNpc,other,'gate-then-other');
    const sb=seed(B,other,gateNpc,'other-then-gate');
    const initial={
      A:{inventory:inventory(sa.P),chronology:chronology(sa.P)},
      B:{inventory:inventory(sb.P),chronology:chronology(sb.P)}
    };
    const beforeA=decision(A,sa.P),beforeB=decision(B,sb.P);
    const choiceLenA=sa.P.choiceHistory.length,choiceLenB=sb.P.choiceHistory.length;

    choose(A,sa.P);choose(B,sb.P);
    const selectedA=sa.P.target,selectedB=sb.P.target;
    const selectionRecordA=sa.P.choiceHistory.at(-1),selectionRecordB=sb.P.choiceHistory.at(-1);

    E.tick=104;
    outcome(A,sa.P,selectedA);
    outcome(B,sb.P,selectedB);
    const afterA=decision(A,sa.P),afterB=decision(B,sb.P);

    const controls={
      sameScalarTopology:sa.key===sb.key,
      sameRelationInventory:same(initial.A.inventory,initial.B.inventory),
      differentRelationalChronology:!same(initial.A.chronology,initial.B.chronology),
      exactlyOneSelectionRecordedEach:sa.P.choiceHistory.length===choiceLenA+1&&sb.P.choiceHistory.length===choiceLenB+1,
      selectionRecordMatchesTarget:selectionRecordA?.target===selectedA&&selectionRecordB?.target===selectedB,
      realizedTargetIsAWorldPlace:!!places[selectedA]&&!!places[selectedB]
    };

    const observations={
      currentDecisionStructureSameBefore:same(beforeA,beforeB),
      selectedCurrentSame:selectedA===selectedB,
      nextDecisionStructureSameAfter:same(afterA,afterB),
      numericProbabilityExposedByEvalP:beforeA.numericProbabilityExposed||beforeB.numericProbabilityExposed,
      before:{orderAB:beforeA,orderBA:beforeB},
      selected:{orderAB:selectedA,orderBA:selectedB},
      after:{orderAB:afterA,orderBA:afterB}
    };

    let interpretation;
    if(!Object.values(controls).every(Boolean)){
      interpretation='STAGE29_V22_CONTROL_FAILURE';
    }else if(!observations.currentDecisionStructureSameBefore||!observations.selectedCurrentSame){
      interpretation='STAGE29_V22_RELATION_PROCESS_CONDITIONS_CURRENT_REALIZATION_STRUCTURE_OBSERVED';
    }else{
      interpretation='STAGE29_V22_REALIZATION_FLOW_PRESENT_BUT_RELATION_ORDER_PROPENSITY_NOT_OPERATIONALIZED';
    }

    E=originalE;
    return{
      version:'OASIS Integrated Core v2.2',
      question:'When a possibility becomes the realized current, does the present engine express relation-process-conditioned realization structure without treating the realized possibility as true or false?',
      scope:'Stage 29 v2.2 semantic-correction diagnostic. It does not test truth, correctness, reward optimality, or probability calibration. Two worlds have the same scalar flow and the same relation inventory but reversed relational chronology. The production decision path chooses one current target and applies that realized outcome; the test observes whether relation process changes the current realizable structure or the next reconstructed decision state.',
      killSearchBoundary:'Competing-potential-action and propensity interpretations already distinguish selection tendency from truth. Therefore this stage does not claim novelty for multiple possibilities, single selection, or propensity language. It tests only whether the present OASIS implementation operationalizes its own relation-process-conditioned realization concept.',
      english:{
        realizationPropensity:'현실화 경향 — 어떤 가능성이 참이라는 확률이 아니라 현재 조건에서 실제 현재로 실현될 상대적 성향',
        probabilityCalibration:'확률 보정 — 예측확률과 장기 실제 빈도가 맞는지 검사하는 것. 이 Stage의 검증대상이 아님',
        semanticCorrection:'의미 교정 — 기존 검증 질문이 이론의 개념을 잘못 해석했을 때 검증 목적을 바로잡는 것',
        operationalize:'조작적 정의 — 이론 개념을 실제 관측·실험 가능한 변수와 절차로 연결하는 것'
      },
      semantics:{
        realizedDoesNotMeanTrue:true,
        unrealizedDoesNotMeanFalse:true,
        selectedDoesNotMeanCorrect:true,
        stageTestsProbabilityCalibration:false
      },
      trace,gatedPlace:{id:gatedId,gate},npcs:{gate:gateNpc,other,third},initial,
      controls,observations,interpretation,
      oasisInterpretation:interpretation==='STAGE29_V22_RELATION_PROCESS_CONDITIONS_CURRENT_REALIZATION_STRUCTURE_OBSERVED'
        ?'Under matched scalar flow and relation inventory, changing only relational chronology changed the current realizable structure or the single realized target. This is an implementation-level observation of relation-process-conditioned realization, not evidence that the realized target is true, correct, or optimal.'
        :interpretation==='STAGE29_V22_REALIZATION_FLOW_PRESENT_BUT_RELATION_ORDER_PROPENSITY_NOT_OPERATIONALIZED'
          ?'The engine performs a single selection and applies an outcome that becomes part of the next current, but reversed relation chronology does not alter the current realization structure in this production path. This is an implementation/testability gap, not a falsification of the v2.2 concept and not a truth-probability result.'
          :'The matched-control construction failed, so no scientific interpretation is permitted.'
    };
  });

  report.errors=errors;report.cleanPage=errors.length===0;
  report.controls.cleanPage=report.cleanPage;
  console.log('\nSTAGE 29 v2.2 — RELATION-PROCESS CONDITIONED REALIZATION DIAGNOSTIC');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.controls))assert(v,k);
  assert(report.semantics.realizedDoesNotMeanTrue,'realized current is not labelled true');
  assert(report.semantics.unrealizedDoesNotMeanFalse,'unrealized possibility is not labelled false');
  assert(report.semantics.selectedDoesNotMeanCorrect,'selection is not correctness');
  assert(report.semantics.stageTestsProbabilityCalibration===false,'probability calibration is outside Stage 29 scope');
  assert(report.interpretation!=='STAGE29_V22_CONTROL_FAILURE','matched controls permit a scientific Stage 29 interpretation');
  await writeFile('reality-flow-v22-realization-propensity-stage29-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
