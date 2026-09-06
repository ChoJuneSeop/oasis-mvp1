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
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4200/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationExperienceStoreFullHistory,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:300,worlds:{},paused:true};
    const retain=mkW('full'),ablate=mkW('full');
    E.worlds={retain,ablate};
    const trace=[0.10,0.20,0.05,0.30];
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);

    function project(S,P){
      const rows=evalP(S,P,1),g=sig(rows);
      return {
        actionable:[...actionableIds(S,P,1)],
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),
        choice:g.choice,
        candidates:g.cands,
        leader:g.leader,
        hidden:[...(P.hiddenCandidates||[])].sort(),
        relations:P.relationHistory.map(x=>`${x.t}:${x.npc}@${x.place}`),
        seen:[...(P.seenNPC||[])].sort()
      };
    }

    function seedDeferred(S,label){
      const P=S.parties[0];
      P.target='road';
      P._realityFlowTopologyAnchor=null;
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      outcome(S,P,'market'); // 미라와의 실제 관계 형성 -> shrine 가능성 경로 생성
      if(!P.possibilityPaths?.shrine)throw new Error('Stage 30 requires naturally generated unrealized shrine possibility after meeting 미라');
      if(P.possibilityPaths.shrine.realized!=null)throw new Error('Stage 30 seed must remain unrealized');
      return P;
    }

    const A=seedDeferred(retain,'retain-deferred-seed');
    const B=seedDeferred(ablate,'ablate-deferred-seed');
    const baselineA=project(retain,A),baselineB=project(ablate,B);
    const deferredBefore=JSON.parse(JSON.stringify(A.possibilityPaths.shrine));

    // Current implementation proxy ablation only: remove the unrealized possibility tracker entry.
    // Do NOT remove the actual Mira relation/history. This tests whether the deferred possibility
    // itself is integrated into the live relation field rather than merely logged as metadata.
    delete B.possibilityPaths.shrine;
    const immediatelyAfterAblation={retain:project(retain,A),ablate:project(ablate,B)};

    // Matched intervening reality. No fixed t+1 effect is required by OASIS v2.3.
    // The deferred possibility is allowed to remain non-current across an arbitrary interval.
    const unrelated=['forest','village','camp'];
    const interval=[];
    for(const id of unrelated){
      E.tick++;
      outcome(retain,A,id);
      outcome(ablate,B,id);
      interval.push({tick:E.tick,id,retain:project(retain,A),ablate:project(ablate,B)});
    }
    const beforeRelationCue={retain:project(retain,A),ablate:project(ablate,B)};

    // Later, not pre-scheduled by the deferred possibility itself, a relation-compatible cue occurs:
    // meeting 세인 at lake. Existing OASIS relation logic can then combine 세인 with prior 미라 relation
    // and may reactivate/create starEcho in the current possibility structure.
    E.tick+=7;
    const cueTick=E.tick;
    outcome(retain,A,'lake');
    outcome(ablate,B,'lake');
    const afterRelationCue={retain:project(retain,A),ablate:project(ablate,B)};

    const retainedDeferredAfter=A.possibilityPaths?.shrine?JSON.parse(JSON.stringify(A.possibilityPaths.shrine)):null;
    const controls={
      sameBaselineBeforeAblation:same(baselineA,baselineB),
      naturalDeferredPossibilityGenerated:!!deferredBefore&&deferredBefore.selected==null&&deferredBefore.realized==null,
      onlyDeferredTrackerEntryAblated:!('shrine' in B.possibilityPaths)&&('shrine' in A.possibilityPaths),
      miraRelationPreservedInBoth:A.relationHistory.some(x=>x.npc==='미라')&&B.relationHistory.some(x=>x.npc==='미라'),
      matchedInterveningReality:interval.every(x=>x.retain.relations.at(-1)===x.ablate.relations.at(-1)),
      laterRelationCueOccurred:A.relationHistory.at(-1)?.npc==='세인'&&B.relationHistory.at(-1)?.npc==='세인',
      cleanPage:errors.length===0
    };

    const observations={
      immediateStateDiffersWithoutNewRelationCue:!same(immediatelyAfterAblation.retain,immediatelyAfterAblation.ablate),
      stateDiffersDuringUnrelatedInterval:interval.some(x=>!same(x.retain,x.ablate)),
      stateDiffersImmediatelyBeforeLaterCue:!same(beforeRelationCue.retain,beforeRelationCue.ablate),
      relationContextReactivationObserved:afterRelationCue.retain.hidden.includes('starEcho')||afterRelationCue.ablate.hidden.includes('starEcho'),
      relationContextReactivationMatchedAcrossArms:afterRelationCue.retain.hidden.includes('starEcho')===afterRelationCue.ablate.hidden.includes('starEcho'),
      deferredPossibilityEntryChangesStateAfterLaterRelationCue:!same(afterRelationCue.retain,afterRelationCue.ablate),
      deferredPossibilityStillUnrealized:!!retainedDeferredAfter&&retainedDeferredAfter.realized==null
    };

    const fieldIntegrationCandidate=observations.deferredPossibilityEntryChangesStateAfterLaterRelationCue;
    const relationMemoryReactivation=observations.relationContextReactivationObserved;
    let interpretation;
    let scientificStatus;
    if(!relationMemoryReactivation){
      interpretation='STAGE30_RELATION_CUE_DID_NOT_REACTIVATE_EXPECTED_CONTEXT';
      scientificStatus='HARNESS_OR_IMPLEMENTATION_MISMATCH';
    }else if(fieldIntegrationCandidate){
      interpretation='STAGE30_DEFERRED_FIELD_INTEGRATION_CANDIDATE_REQUIRES_STRONG_BASELINES';
      scientificStatus='PARTIAL SUPPORT';
    }else{
      interpretation='STAGE30_RELATION_MEMORY_REACTIVATES_BUT_DEFERRED_POSSIBILITY_TRACKER_IS_NOT_CAUSALLY_CONSUMED';
      scientificStatus='IMPLEMENTATION_MISMATCH';
    }

    E=originalE;
    return {
      version:'OASIS Integrated Core v2.3 validation',
      question:'Can an unrealized possibility remain judgment-deferred in the affinity field without mandatory next-step influence, then become causally relevant only when a later reality flow forms a compatible relation condition?',
      scope:'Stage 30 deferred-field reactivation diagnostic. No fixed t+1 effect is required. A naturally generated unrealized possibility is retained across matched unrelated flow, then a later relation-compatible cue is introduced. Only the current implementation tracker proxy is ablated; OASIS semantics are not patched.',
      theoryBoundary:'비현실화는 다음 시점에 자동 개입하는 대기열이 아니라 판단유보군으로 인연필드에 편입되는 상태다. 재등장 시점은 사전 고정하지 않으며, 이후 현실 흐름과 관계조건이 성립할 때만 현재 가능성 구조에 다시 참여할 수 있다.',
      killSearchBoundary:'Context-dependent episodic reinstatement and latent updating of unchosen options already exist in prior work. This stage therefore tests implementation fidelity to the OASIS deferred-field claim, not standalone novelty.',
      english:{
        deferredJudgmentSet:'판단유보군 — 현재 현실화되지 않았지만 폐기되지 않고 인연필드에 편입되는 가능성 상태',
        conditionalDelayedReactivation:'조건부 지연 재활성화 — 미리 정한 다음 시점이 아니라 이후 현실 흐름에서 관계조건이 다시 형성될 때 현재화되는 것',
        affinityFieldIntegration:'인연필드 편입 — 단순 로그 저장이 아니라 이후 관계 형성 시 다시 현재 가능성 구성에 참여할 수 있는 상태로 포함되는 것'
      },
      cueTick,
      controls,
      observations,
      fieldIntegrationCandidate,
      relationMemoryReactivation,
      interpretation,
      scientificStatus,
      deferredPath:{before:deferredBefore,after:retainedDeferredAfter},
      states:{baseline:{retain:baselineA,ablate:baselineB},immediatelyAfterAblation,beforeRelationCue,afterRelationCue},
      oasisInterpretation:fieldIntegrationCandidate
        ?'The retained unrealized possibility changes the later constructible state only after a compatible relation cue. This is at most partial support for implementation fidelity; novelty still requires matched episodic-memory, counterfactual, and history-aware baselines.'
        :'The current implementation can reactivate relational context after a later compatible cue, but the unrealized possibility tracker itself does not alter the later constructed state. Under OASIS v2.3 this is an implementation/formalization mismatch: the deferred possibility is tracked, but not yet demonstrated as a separately integrated affinity-field state.'
    };
  });

  report.errors=errors;
  console.log('\nSTAGE 30 — v2.3 DEFERRED-JUDGMENT AFFINITY-FIELD REACTIVATION DIAGNOSTIC');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.controls))assert(v,k);
  await writeFile('reality-flow-unrealized-possibility-stage30-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
