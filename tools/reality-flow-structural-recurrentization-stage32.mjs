import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4212','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`HARNESS FAIL - ${m}`);console.log(`CONTROL PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4212/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationExperienceStoreFullHistory,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:600,worlds:{},paused:true};
    const A=mkW('full'),B=mkW('full');
    E.worlds={processA:A,processB:B};
    const PA=A.parties[0],PB=B.parties[0];
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);

    // Reuse the already tested Stage 18/19 structural-crossing candidate.
    // No numeric epsilon, time window, learned threshold, or similarity score is introduced.
    function structuralRuns(trace){
      if(!Array.isArray(trace)||trace.length<2)return[];
      const runs=[];
      let origin=trace[0],extreme=trace[0],dir=0;
      for(let i=1;i<trace.length;i++){
        const x=trace[i];
        if(dir===0){
          if(x>origin){dir=1;runs.push(1);extreme=x}
          else if(x<origin){dir=-1;runs.push(-1);extreme=x}
          continue;
        }
        if(dir===1){
          if(x>=extreme){extreme=x;continue}
          if(x<origin){const priorExtreme=extreme;dir=-1;runs.push(-1);origin=priorExtreme;extreme=x}
        }else{
          if(x<=extreme){extreme=x;continue}
          if(x>origin){const priorExtreme=extreme;dir=1;runs.push(1);origin=priorExtreme;extreme=x}
        }
      }
      return runs;
    }
    const structuralKey=trace=>structuralRuns(trace).join('>');

    // K and L end at the same scalar present but encode opposite prior flow structures.
    // K' has the same Stage-18 structural form as K but a different exact sign-run key due to a micro excursion.
    const K=[0.20,0.10,0.20];
    const L=[0.20,0.30,0.20];
    const M=[0.20,0.30,0.10,0.20];
    const Kprime=[0.20,0.10,0.15,0.149999999,0.20];

    function paths(P){
      return Object.fromEntries(Object.entries(P.possibilityPaths||{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,x])=>[id,{npc:x.npc,source:x.source,generated:x.generated,candidate:x.candidate,selected:x.selected,realized:x.realized,changed:x.changed}]));
    }
    function relationHistory(P){return P.relationHistory.map(x=>({t:x.t,npc:x.npc,place:x.place}))}
    function episodeIdentity(P){
      return (P.relationField?.episodes||[]).map(ep=>({key:ep.key,a:ep.a,b:ep.b,places:[...(ep.places||[])],from:[...(ep.from||[])]})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function episodeProcess(P){
      return (P.relationField?.episodes||[]).map(ep=>({key:ep.key,exact:ep.flowTopologyKey||'',structural:ep._stage32StructuralKey||'',from:[...(ep.from||[])]})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    function applyTrace(S,trace,label){
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      return OASISRealityFlowTopology.currentKeyForParty(S,S.parties[0]);
    }
    function outcomeTagged(S,P,id,trace,label){
      applyTrace(S,trace,label);
      const before=P.relationField?.episodes?.length||0;
      outcome(S,P,id);
      const sk=structuralKey(trace);
      for(const ep of (P.relationField?.episodes||[]).slice(before))ep._stage32StructuralKey=sk;
      return {exact:trace.length?OASISRealityFlowTopology.keyOf(OASISRealityFlowTopology.runsFrom?[]:[]):'',structural:sk};
    }
    function project(S,P){
      const rows=evalP(S,P,1),g=sig(rows);
      return{
        danger:S.danger,
        currentExactKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
        hidden:[...(P.hiddenCandidates||[])].sort(),
        actionable:[...actionableIds(S,P,1)].sort(),
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),choice:g.choice,candidates:g.cands,
        seen:[...(P.seenNPC||[])].sort(),discovered:[...(P.disc||[])].sort(),paths:paths(P)
      };
    }
    function customHidden(S,P,sk){
      const active=(P.relationField?.episodes||[]).filter(ep=>ep._stage32StructuralKey===sk);
      const hasPair=(a,b)=>{const k=[a,b].sort().join('↔');return active.some(ep=>ep.key===k)};
      const out=[];
      for(const h of hiddenDefs){
        if(P.hiddenDone?.has(h.id))continue;
        if(!P.seenNPC.has(h.npc))continue;
        if(!h.places.every(id=>P.disc.has(id)||availableOasis(S,P,1).includes(id)))continue;
        const ready=h.links.length?h.links.every(n=>hasPair(h.npc,n)):(relationExists(P,h.npc)&&active.some(ep=>ep.a===h.npc||ep.b===h.npc));
        if(ready)out.push(h.id);
      }
      return out.sort();
    }
    function counterfactualDecision(S,P,hidden){
      const saved=new Set(P.hiddenCandidates||[]);
      P.hiddenCandidates.clear();for(const id of hidden)P.hiddenCandidates.add(id);
      const rows=evalP(S,P,1),g=sig(rows);
      const out={ranking:rows.map(r=>r.id),choice:g.choice,candidates:g.cands,participants:[...participants(S,P,1)].sort()};
      P.hiddenCandidates.clear();for(const id of saved)P.hiddenCandidates.add(id);
      return out;
    }
    function refreshBoth(){refreshHidden(A,PA);refreshHidden(B,PB)}

    // Same initial encounter.
    applyTrace(A,[0.15,0.20],'seed-A');applyTrace(B,[0.15,0.20],'seed-B');
    outcome(A,PA,'market');outcome(B,PB,'market');

    // Same relation chronology, different process structure for 미라↔세인.
    E.tick=608;
    outcomeTagged(A,PA,'lake',K,'A-mira-sein-K');
    outcomeTagged(B,PB,'lake',L,'B-mira-sein-L');

    // Swap the process before camp so both worlds retain the same relation inventory but different process binding.
    E.tick=616;
    outcomeTagged(A,PA,'camp',L,'A-camp-L');
    outcomeTagged(B,PB,'camp',K,'B-camp-K');
    refreshBoth();

    const setup={A:project(A,PA),B:project(B,PB),relationHistoryA:relationHistory(PA),relationHistoryB:relationHistory(PB),episodeIdentityA:episodeIdentity(PA),episodeIdentityB:episodeIdentity(PB),episodeProcessA:episodeProcess(PA),episodeProcessB:episodeProcess(PB)};

    // Reference exact cue: reproduces the Stage31 process-conditioned split; nothing is realized.
    E.tick=626;
    const referenceExactKeyA=applyTrace(A,K,'reference-exact-K');
    const referenceExactKeyB=applyTrace(B,K,'reference-exact-K');
    refreshBoth();
    const reference={A:project(A,PA),B:project(B,PB)};

    // Both possibilities become non-current under the same structurally unrelated flow.
    E.tick=638;
    applyTrace(A,M,'dormant-M');applyTrace(B,M,'dormant-M');refreshBoth();
    const dormant={A:project(A,PA),B:project(B,PB)};

    // Later current flow K' has the same endpoint and same structural-crossing form as K,
    // but a different production exact key because of a non-structural micro excursion.
    E.tick=654;
    const laterExactKeyA=applyTrace(A,Kprime,'later-Kprime');
    const laterExactKeyB=applyTrace(B,Kprime,'later-Kprime');
    refreshBoth();
    const productionLater={A:project(A,PA),B:project(B,PB)};
    const laterStructuralKey=structuralKey(Kprime);
    const candidateHiddenA=customHidden(A,PA,laterStructuralKey);
    const candidateHiddenB=customHidden(B,PB,laterStructuralKey);
    const candidateDecisionA=counterfactualDecision(A,PA,candidateHiddenA);
    const candidateDecisionB=counterfactualDecision(B,PB,candidateHiddenB);

    const storedExactKeysA=[...new Set((PA.relationField?.episodes||[]).map(ep=>ep.flowTopologyKey||''))].sort();
    const storedExactKeysB=[...new Set((PB.relationField?.episodes||[]).map(ep=>ep.flowTopologyKey||''))].sort();
    const storedStructuralKeysA=[...new Set((PA.relationField?.episodes||[]).map(ep=>ep._stage32StructuralKey||'').filter(Boolean))].sort();
    const storedStructuralKeysB=[...new Set((PB.relationField?.episodes||[]).map(ep=>ep._stage32StructuralKey||'').filter(Boolean))].sort();

    const controls={
      sameRelationChronology:same(setup.relationHistoryA,setup.relationHistoryB),
      sameRelationEpisodeInventoryIgnoringProcess:same(setup.episodeIdentityA,setup.episodeIdentityB),
      sameSeenNPC:same(setup.A.seen,setup.B.seen),
      sameDiscoveredPlaces:same(setup.A.discovered,setup.B.discovered),
      sameDeferredPossibilityTracker:same(setup.A.paths,setup.B.paths),
      differentStoredRelationalProcess:!same(setup.episodeProcessA,setup.episodeProcessB),
      sameReferenceExactCue:referenceExactKeyA===referenceExactKeyB,
      referenceCueReproducesProcessSplit:reference.A.hidden.length>0&&reference.B.hidden.length>0&&!same(reference.A.hidden,reference.B.hidden),
      dormantUnderSameUnrelatedFlow:dormant.A.hidden.length===0&&dormant.B.hidden.length===0,
      sameLaterScalarPresent:productionLater.A.danger===productionLater.B.danger&&productionLater.A.danger===Kprime.at(-1),
      sameLaterExactCue:laterExactKeyA===laterExactKeyB,
      laterExactKeyDiffersFromReference:laterExactKeyA!==referenceExactKeyA,
      laterExactKeyMatchesNoStoredEpisode:!storedExactKeysA.includes(laterExactKeyA)&&!storedExactKeysB.includes(laterExactKeyB),
      structuralCueMatchesStoredProcess:storedStructuralKeysA.includes(laterStructuralKey)&&storedStructuralKeysB.includes(laterStructuralKey),
      noPossibilityRealizedDuringDeferral:Object.values(PA.possibilityPaths||{}).every(x=>x.realized==null)&&Object.values(PB.possibilityPaths||{}).every(x=>x.realized==null)
    };

    const observations={
      referenceHiddenA:reference.A.hidden,referenceHiddenB:reference.B.hidden,
      laterProductionExactHiddenA:productionLater.A.hidden,laterProductionExactHiddenB:productionLater.B.hidden,
      productionExactRecurrentizationAbsent:productionLater.A.hidden.length===0&&productionLater.B.hidden.length===0,
      laterStructuralKey,
      candidateHiddenA,candidateHiddenB,
      structuralCandidateDifferentiates:!same(candidateHiddenA,candidateHiddenB)&&candidateHiddenA.length>0&&candidateHiddenB.length>0,
      structuralCandidateReproducesReference:same(candidateHiddenA,reference.A.hidden)&&same(candidateHiddenB,reference.B.hidden),
      candidateDecisionA,candidateDecisionB,
      structuralCandidateChangesDecisionStructure:!same(candidateDecisionA,candidateDecisionB),
      exactKeyA:laterExactKeyA,exactKeyB:laterExactKeyB,storedExactKeysA,storedExactKeysB,storedStructuralKeysA,storedStructuralKeysB
    };

    let scientificStatus,interpretation;
    if(!observations.structuralCandidateDifferentiates||!observations.structuralCandidateReproducesReference){
      scientificStatus='FAIL — TEST-ONLY STRUCTURAL GENERALIZATION CANDIDATE FAILED UNDER THIS SCOPE';
      interpretation='STAGE32_STRUCTURAL_RECURRENTIZATION_CANDIDATE_FAILED';
    }else if(!observations.structuralCandidateChangesDecisionStructure){
      scientificStatus='PARTIAL SUPPORT — STRUCTURAL RE-CURRENTIZATION WITHOUT DOWNSTREAM DECISION DIFFERENTIATION';
      interpretation='STAGE32_STRUCTURAL_RECURRENTIZATION_ONLY_PARTIAL';
    }else{
      scientificStatus='PASS — TEST-ONLY STRUCTURAL GENERALIZATION CANDIDATE; PRODUCTION REMAINS IMPLEMENTATION MISMATCH';
      interpretation='STAGE32_EXACT_KEY_BLINDNESS_BYPASSED_BY_TEST_ONLY_STRUCTURAL_RECURRENTIZATION';
    }

    E=originalE;
    return{
      version:'OASIS Integrated Core v2.3',stage:32,title:'Exact-context-key removal / structural re-currentization kill',
      question:'When the later current flow is structurally related to a stored relational process but its exact flowTopologyKey is different, can a previously judgment-deferred possibility re-currentize without exact context-key equality?',
      scope:'Test-only integration diagnostic. Production exact-key authority is left unchanged. The only candidate operator reused is the parameter-free Stage18/19 structural-crossing rule. Hypothesis outcomes do not fail CI; only matched-control/harness violations do.',
      killSearchBoundary:'Context reinstatement, temporal-context retrieval, and event-structure reinstatement are established prior art. Structural segmentation/crossing is also not claimed as novel. This stage tests whether OASIS can escape exact-key lookup blindness while preserving process-conditioned flow behavior.',
      english:{
        exactContextKey:'정확 맥락키 — 저장 당시의 방향 변화 문자열과 현재 문자열이 완전히 같아야 활성화하는 방식',
        structuralReCurrentization:'구조적 재현재화 — 정확 문자열이 달라도 현재 흐름과 과거 관계과정이 같은 구조적 관계를 형성할 때 비현재 가능성이 다시 현재 가능성 구조에 참여하는 것',
        structuralCrossing:'구조적 교차 — 현재 확정 흐름의 시작 기준선을 실제로 넘어선 반전만 새로운 구조적 방향으로 인정하는 규칙',
        implementationMismatch:'구현 불일치 — 이론이 요구하는 관계를 현재 production 코드가 아직 연산하지 못하는 상태'
      },
      traces:{K,L,M,Kprime,structuralK:structuralKey(K),structuralL:structuralKey(L),structuralM:structuralKey(M),structuralKprime:laterStructuralKey},
      controls,observations,
      productionStatus:observations.productionExactRecurrentizationAbsent?'IMPLEMENTATION MISMATCH — PRODUCTION EXACT KEY DOES NOT RE-CURRENTIZE UNDER STRUCTURALLY RELATED NON-IDENTICAL FLOW':'PRODUCTION EXACT PATH SHOWED UNEXPECTED ACTIVATION — INSPECT FOR CONFOUND',
      scientificStatus,interpretation,
      noveltyStatus:'NOVELTY FAIL UNDER THIS STAGE — CONTEXT REINSTATEMENT AND SIMPLE STRUCTURAL-CANONICALIZATION LOOKUP ARE NOT UNIQUE TO OASIS',
      oasisInterpretation:'관찰 대상은 고정된 danger 좌표가 아니라 흐름이다. 동일한 현재값으로 돌아와도 과거의 관계과정이 다르면 현재에 참여할 가능성이 달라질 수 있는지를 본다. 다만 정확키를 구조키로 바꿔 같은 결과를 얻는 것만으로는 인연필드의 독립 신규성을 입증하지 않는다.',
      nextBoundary:'If the structural candidate survives, the next falsifier must remove one-key canonicalization itself and test whether distributed/current relational composition can explain re-currentization better than simple context lookup under matched capacity.'
    };
  });

  report.errors=errors;
  report.controls.cleanPage=errors.length===0;
  await writeFile('reality-flow-structural-recurrentization-stage32-report.json',JSON.stringify(report,null,2));
  console.log('\nSTAGE 32 — v2.3 STRUCTURAL RE-CURRENTIZATION KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.controls))assert(v,k);
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
