import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4200','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`HARNESS FAIL - ${m}`);console.log(`CONTROL PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4200/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationExperienceStoreFullHistory&&!!window.OASISRelationAuthority,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:500,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={processA:A,processB:B};
    const PA=A.parties[0],PB=B.parties[0];
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const K=[0.20,0.10,0.20]; // down -> up
    const L=[0.20,0.30,0.20]; // up -> down
    const M=[0.20,0.25,0.30]; // unrelated monotonic flow

    function paths(P){
      return Object.fromEntries(Object.entries(P.possibilityPaths||{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,x])=>[id,{npc:x.npc,source:x.source,generated:x.generated,candidate:x.candidate,selected:x.selected,realized:x.realized,changed:x.changed}]));
    }
    function relationHistory(P){return P.relationHistory.map(x=>({t:x.t,npc:x.npc,place:x.place}))}
    function episodeIdentity(P){
      return (P.relationField?.episodes||[]).map(ep=>({key:ep.key,a:ep.a,b:ep.b,places:[...(ep.places||[])],from:[...(ep.from||[])]})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function episodeProcess(P){
      return (P.relationField?.episodes||[]).map(ep=>({key:ep.key,from:[...(ep.from||[])],flowTopologyKey:ep.flowTopologyKey||''})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function project(S,P){
      const rows=evalP(S,P,1),g=sig(rows);
      return {
        danger:S.danger,
        currentFlowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        activeEpisodeKeys:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key).sort(),
        hidden:[...(P.hiddenCandidates||[])].sort(),
        actionable:[...actionableIds(S,P,1)].sort(),
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),
        choice:g.choice,
        candidates:g.cands,
        seen:[...(P.seenNPC||[])].sort(),
        discovered:[...(P.disc||[])].sort(),
        paths:paths(P)
      };
    }
    function applyTrace(S,trace,label){
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      return OASISRealityFlowTopology.currentKeyForParty(S,S.parties[0]);
    }
    function refreshBoth(){refreshHidden(A,PA);refreshHidden(B,PB)}

    // Same first relation event and same current scalar state.
    applyTrace(A,[0.15,0.20],'seed-A');
    applyTrace(B,[0.15,0.20],'seed-B');
    outcome(A,PA,'market'); // 미라; naturally opens shrine path
    outcome(B,PB,'market');

    // Same relation chronology, different relational-flow process between relation events.
    // A tags 미라↔세인 under K, B tags it under L.
    E.tick=506;
    applyTrace(A,K,'A-between-mira-sein-K');
    applyTrace(B,L,'B-between-mira-sein-L');
    outcome(A,PA,'lake'); // 세인
    outcome(B,PB,'lake');

    // Swap the between-event flows before the same camp encounter.
    // Camp naturally produces 아론 and ??? at the same tick; A tags those recombinations under L, B under K.
    E.tick=512;
    applyTrace(A,L,'A-between-sein-camp-L');
    applyTrace(B,K,'B-between-sein-camp-K');
    outcome(A,PA,'camp');
    outcome(B,PB,'camp');
    refreshBoth();

    const setup={
      A:project(A,PA),B:project(B,PB),
      relationHistoryA:relationHistory(PA),relationHistoryB:relationHistory(PB),
      episodeIdentityA:episodeIdentity(PA),episodeIdentityB:episodeIdentity(PB),
      episodeProcessA:episodeProcess(PA),episodeProcessB:episodeProcess(PB)
    };

    // First same current-flow cue: no option is forced to realize; we only observe what becomes current-capable.
    E.tick=520;
    const firstCueKeyA=applyTrace(A,K,'same-current-cue-K-first');
    const firstCueKeyB=applyTrace(B,K,'same-current-cue-K-first');
    refreshBoth();
    const firstCue={A:project(A,PA),B:project(B,PB)};

    // Let the newly current possibilities remain unrealized, then move both worlds through the same unrelated flow.
    // No choose() call is made: this is judgment deferral, not a scheduled delayed choice.
    E.tick=528;
    applyTrace(A,M,'same-unrelated-flow');
    applyTrace(B,M,'same-unrelated-flow');
    refreshBoth();
    const dormant={A:project(A,PA),B:project(B,PB)};

    // Arbitrary interval; the deferred possibility itself does not encode a reactivation time.
    E.tick=547;
    applyTrace(A,M,'same-unrelated-flow-later');
    applyTrace(B,M,'same-unrelated-flow-later');
    refreshBoth();
    const stillDormant={A:project(A,PA),B:project(B,PB)};

    // Later the same relational-flow condition K happens again in both worlds.
    E.tick=563;
    const laterCueKeyA=applyTrace(A,K,'same-current-cue-K-later');
    const laterCueKeyB=applyTrace(B,K,'same-current-cue-K-later');
    refreshBoth();
    const laterCue={A:project(A,PA),B:project(B,PB)};

    const controls={
      cleanPage:errors.length===0,
      sameRelationChronology:same(setup.relationHistoryA,setup.relationHistoryB),
      sameRelationEpisodeInventoryIgnoringProcess:same(setup.episodeIdentityA,setup.episodeIdentityB),
      sameSeenNPC:same(setup.A.seen,setup.B.seen),
      sameDiscoveredPlaces:same(setup.A.discovered,setup.B.discovered),
      sameDeferredPossibilityTracker:same(setup.A.paths,setup.B.paths),
      sameCurrentScalarBeforeCue:setup.A.danger===setup.B.danger,
      differentStoredRelationalProcess:!same(setup.episodeProcessA,setup.episodeProcessB),
      noHiddenPossibilityCurrentBeforeCue:setup.A.hidden.length===0&&setup.B.hidden.length===0,
      sameFirstCue:firstCueKeyA===firstCueKeyB&&firstCue.A.danger===firstCue.B.danger,
      sameLaterCue:laterCueKeyA===laterCueKeyB&&laterCue.A.danger===laterCue.B.danger,
      noPossibilityWasRealizedDuringDeferral:Object.values(PA.possibilityPaths||{}).every(x=>x.realized==null)&&Object.values(PB.possibilityPaths||{}).every(x=>x.realized==null)
    };

    const observations={
      firstCueDifferentCurrentPossibilities:!same(firstCue.A.hidden,firstCue.B.hidden),
      firstCueA:firstCue.A.hidden,
      firstCueB:firstCue.B.hidden,
      firstCueDifferentCandidateStructure:firstCue.A.candidates!==firstCue.B.candidates,
      firstCueDifferentChoice:firstCue.A.choice!==firstCue.B.choice,
      bothBecomeNonCurrentInUnrelatedFlow:dormant.A.hidden.length===0&&dormant.B.hidden.length===0,
      remainNonCurrentAcrossArbitraryInterval:stillDormant.A.hidden.length===0&&stillDormant.B.hidden.length===0,
      laterCueDifferentCurrentPossibilities:!same(laterCue.A.hidden,laterCue.B.hidden),
      laterCueA:laterCue.A.hidden,
      laterCueB:laterCue.B.hidden,
      laterCueReproducesProcessConditionedPattern:same(firstCue.A.hidden,laterCue.A.hidden)&&same(firstCue.B.hidden,laterCue.B.hidden),
      laterCueDifferentCandidateStructure:laterCue.A.candidates!==laterCue.B.candidates,
      laterCueDifferentChoice:laterCue.A.choice!==laterCue.B.choice
    };

    // Strong simple control: exact context-key lookup can predict the active pair inventory by construction.
    // If it reproduces the same split, this stage supports implementation fidelity but not standalone novelty.
    function contextKeyBaseline(P,key){
      const active=(P.relationField?.episodes||[]).filter(ep=>ep.flowTopologyKey===key).map(ep=>ep.key);
      const set=new Set();
      if(active.includes(['미라','세인'].sort().join('↔')))set.add('starEcho');
      if(active.includes(['???','아론'].sort().join('↔')))set.add('wanderer');
      return [...set].sort();
    }
    const baseline={
      cueKey:laterCueKeyA,
      predictedA:contextKeyBaseline(PA,laterCueKeyA),
      predictedB:contextKeyBaseline(PB,laterCueKeyB)
    };
    baseline.matchesObservedA=same(baseline.predictedA,laterCue.A.hidden);
    baseline.matchesObservedB=same(baseline.predictedB,laterCue.B.hidden);
    baseline.simpleContextKeyLookupReproducesObservedSplit=baseline.matchesObservedA&&baseline.matchesObservedB;

    let interpretation,scientificStatus,noveltyStatus;
    if(!observations.firstCueDifferentCurrentPossibilities||!observations.laterCueDifferentCurrentPossibilities){
      interpretation='STAGE31_RELATIONAL_PROCESS_DID_NOT_DIFFERENTIATE_RECURRENTIZATION_UNDER_MATCHED_CURRENT_FLOW';
      scientificStatus='IMPLEMENTATION MISMATCH OR CLAIM FAIL UNDER THIS SCOPE';
    }else if(!observations.bothBecomeNonCurrentInUnrelatedFlow||!observations.remainNonCurrentAcrossArbitraryInterval||!observations.laterCueReproducesProcessConditionedPattern){
      interpretation='STAGE31_PROCESS_CONDITIONED_ACTIVATION_OBSERVED_BUT_DEFERRED_NONCURRENT_RECURRENTIZATION_CHAIN_INCOMPLETE';
      scientificStatus='PARTIAL SUPPORT';
    }else{
      interpretation='STAGE31_PROCESS_CONDITIONED_DEFERRED_RECURRENTIZATION_OBSERVED';
      scientificStatus='PASS — INTERNAL STRUCTURAL INTEGRITY ONLY';
    }
    noveltyStatus=baseline.simpleContextKeyLookupReproducesObservedSplit
      ?'NOVELTY FAIL UNDER THIS STAGE — SIMPLE CONTEXT-KEY LOOKUP REPRODUCES THE OBSERVED SPLIT'
      :'NOVELTY NOT ESTABLISHED — REQUIRES STRONGER EPISODIC, CONTEXT, AND HISTORY-AWARE BASELINES';

    E=originalE;
    return {
      version:'OASIS Integrated Core v2.3',
      stage:31,
      title:'Deferred-judgment relational re-currentization kill',
      question:'With the same current scalar state, same relation chronology, same relation inventory, same seen/discovered information, and same unrealized possibility tracker, can different prior relational-flow processes make different judgment-deferred possibilities become current under the same later flow condition?',
      scope:'Test-only diagnostic on mvp3-reality-flow-kill. No OASIS decision semantics, thresholds, rewards, or authority rules are patched. Hypothesis outcomes do not fail CI; only control/harness violations do.',
      theoryBoundary:'비현실화는 즉시 다음 판단에 개입하는 대기열이 아니다. 현실화되지 않은 가능성은 비현재 상태로 남을 수 있으며, 재현재화 시점은 미리 정하지 않는다. 이후 현재 흐름이 저장된 관계과정과 다시 관계를 형성할 때만 현재 가능성 구조에 재참여할 수 있는지를 본다.',
      killSearchBoundary:'Context-dependent episodic retrieval, temporal-context reinstatement, and later influence of unchosen options are established prior art. Therefore this stage tests OASIS implementation/integration fidelity, not standalone scientific novelty.',
      english:{
        reCurrentization:'재현재화 — 비현재 상태였던 가능성이 이후 현실 흐름과 관계조건이 다시 성립했을 때 현재 가능성 구조에 다시 참여하는 것',
        deferredJudgment:'판단유보 — 현재 현실화되지 않았으나 참/거짓 또는 폐기로 확정하지 않고 인연필드 안에서 비현재 상태로 남는 것',
        contextKeyBaseline:'맥락키 대조모델 — 저장된 흐름 표식과 현재 흐름 표식의 단순 일치만으로 재활성 대상을 정하는 축약 대조모델'
      },
      controls,observations,baseline,interpretation,scientificStatus,noveltyStatus,
      states:{setup,firstCue,dormant,stillDormant,laterCue},
      oasisInterpretation:'관찰 대상은 어느 한 좌표의 값이 아니라 흐름이다. 동일한 현재 위험값과 동일한 관계·경험 목록을 가진 두 세계가 서로 다른 관계과정을 지나왔을 때, 동일한 후속 흐름에서 무엇이 다시 현재 가능성으로 참여하는지가 달라지는지를 본다. 차이가 나더라도 단순 맥락키 대조모델이 재현하면 OASIS 독립 신규성 증거로 사용하지 않는다.'
    };
  });

  report.errors=errors;
  console.log('\nSTAGE 31 — v2.3 DEFERRED-JUDGMENT RELATIONAL RE-CURRENTIZATION KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.controls))assert(v,k);
  await writeFile('reality-flow-deferred-judgment-stage31-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
