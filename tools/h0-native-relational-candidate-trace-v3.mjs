import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4221;
const MAX_TICK=120000;
const REPORT='h0-native-relational-candidate-trace-v3-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{
    globalThis.OASIS_LATENT_RELATION_STORE=true;
    globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof mkW==='function'&&typeof env==='function'&&typeof evalP==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({MAX_TICK})=>{
    const savedE=E;
    const productionChoose=choose;
    const productionOutcome=outcome;
    const productionEvalP=evalP;
    const productionParticipants=participants;
    const clone=x=>structuredClone(x);
    const pairKey=(a,b)=>[a,b].sort().join('↔');
    const episodeId=ep=>`${ep.t}|${ep.key}|${ep.from?.[0]}|${ep.from?.[1]}`;

    const instrumented=mkW('full');
    const twin=mkW('full');
    E={tick:0,worlds:{instrumented,twin},paused:true};

    const summary={
      completedTick:0,
      totalDecisionEvaluations:0,
      decisionsWithNativeRelationalCandidateSet:0,
      decisionsWithoutNativeRelationalCandidateSet:0,
      totalNativeRelationalCandidateItems:0,
      primitiveRelationPresenceCandidateItems:0,
      activeRelationKeyCandidateItems:0,
      decisionsWithImplementedPossibilityCompositionProjection:0,
      candidateToPossibilityLinks:0,
      directRelationalSupportLinks:0,
      collectiveParticipationCandidateItems:0,
      decisionsWhereSelectedPossibilityHasDirectRelationalSupport:0,
      decisionsWhereRelationalSetParticipatesCollectively:0,
      realizedSelectedDecisions:0,
      supersededBeforeRealization:0,
      unresolvedAtHorizon:0,
      reconstructedActiveKeyMismatch:0,
      twinBehaviorMismatchTicks:0,
      experimenterInterventionCount:0
    };
    const uniqueCandidateIds=new Set();
    const uniquePresenceIds=new Set();
    const uniqueKeyIds=new Set();
    const traces=[];
    const pending=new Map();
    let phase=null;

    function currentReality(S,P){
      return {tick:E.tick,danger:S.danger,currentPlace:currentPlace(P),priorTarget:P.target};
    }
    function relevantReasons(S,P,ep){
      const here=currentPlace(P),target=P.target,reasons=[];
      if((ep.places||[]).includes(here))reasons.push(`here:${here}`);
      if((ep.places||[]).includes(target))reasons.push(`target:${target}`);
      for(const id of ep.places||[])if(Math.abs((places[id]?.r||0)-S.danger)<=0.18)reasons.push(`danger:${id}`);
      const gate=places[target]?.gate;
      if(gate&&(ep.a===gate||ep.b===gate))reasons.push(`gate:${gate}`);
      return [...new Set(reasons)];
    }
    function activeEpisodes(S,P){
      const F=P.relationField||{},L=F.latent;
      const recent=(F.episodes||[])
        .filter(ep=>E.tick-ep.t<=1200&&relevantReasons(S,P,ep).length>0)
        .map(ep=>({id:episodeId(ep),ep,source:'recent'}));
      const latent=(L?.activeIds||[])
        .map(id=>({id,ep:L.byId.get(id),source:'latent'}))
        .filter(x=>x.ep);
      const byId=new Map();
      for(const x of [...recent,...latent])byId.set(x.id,x);
      return [...byId.values()];
    }
    function episodeSupportsAction(ep,id){
      if(!id||id.startsWith('hidden:'))return false;
      const gate=places[id]?.gate;
      return (ep.places||[]).includes(id)||!!(gate&&(ep.a===gate||ep.b===gate));
    }
    function episodeSupportsHidden(ep,h){
      if(!h)return false;
      if(h.links?.length)return h.links.some(n=>ep.key===pairKey(h.npc,n));
      return ep.a===h.npc||ep.b===h.npc;
    }
    function relationPresenceSummary(P,npc){
      const events=P.relationHistory.filter(e=>e.npc===npc);
      const ticks=events.map(e=>e.t).filter(Number.isFinite);
      return {
        eventCount:events.length,
        firstObservedTick:ticks.length?Math.min(...ticks):null,
        lastObservedTick:ticks.length?Math.max(...ticks):null,
        places:[...new Set(events.map(e=>e.place).filter(Boolean))].sort()
      };
    }
    function primitiveCandidates(P,rows){
      const out=new Map();
      const add=(npc,reason,possibilityId)=>{
        if(!npc)return;
        const id=`relation-presence:${npc}`;
        if(!out.has(id))out.set(id,{
          id,
          type:'primitive_relation_presence',
          predicate:'relationExists',
          npc,
          provenance:relationPresenceSummary(P,npc),
          reasons:[],
          supportedPossibilities:[],
          collectiveParticipation:false
        });
        const q=out.get(id);
        if(!q.reasons.includes(reason))q.reasons.push(reason);
        if(possibilityId&&!q.supportedPossibilities.includes(possibilityId))q.supportedPossibilities.push(possibilityId);
      };
      for(const row of rows){
        if(row.id.startsWith('hidden:')){
          const h=hiddenDefs.find(x=>x.id===row.id.slice(7));
          if(h&&!h.links?.length&&P.relationHistory.some(e=>e.npc===h.npc))add(h.npc,`hidden-anchor:${h.id}`,row.id);
          continue;
        }
        const gate=places[row.id]?.gate;
        if(gate&&P.relationHistory.some(e=>e.npc===gate))add(gate,`gate-access:${row.id}`,row.id);
      }
      return [...out.values()];
    }
    function composedCandidates(S,P,rows){
      const active=activeEpisodes(S,P);
      const grouped=new Map();
      for(const x of active){
        if(!grouped.has(x.ep.key))grouped.set(x.ep.key,[]);
        grouped.get(x.ep.key).push(x);
      }
      return [...grouped.entries()].map(([key,xs])=>{
        const supported=[];
        const reasons=['collective-participation-presence'];
        for(const {ep} of xs)for(const r of relevantReasons(S,P,ep))reasons.push(`current-relevance:${r}`);
        for(const row of rows){
          if(row.id.startsWith('hidden:')){
            const h=hiddenDefs.find(x=>x.id===row.id.slice(7));
            if(xs.some(x=>episodeSupportsHidden(x.ep,h))){
              supported.push(row.id);
              reasons.push(`hidden-link:${h?.id||row.id}`);
            }
          }else if(xs.some(x=>episodeSupportsAction(x.ep,row.id))){
            supported.push(row.id);
            reasons.push(`rank-support:${row.id}`);
          }
        }
        const ids=xs.map(x=>x.id);
        return {
          id:`active-relation-key:${key}`,
          type:'active_relation_key',
          predicate:'activeField/key-level decision representation',
          key,
          exactEpisodeProvenanceCount:ids.length,
          exactEpisodeProvenanceIdsSample:ids.slice(0,12),
          sourceKinds:[...new Set(xs.map(x=>x.source))].sort(),
          reasons:[...new Set(reasons)],
          supportedPossibilities:[...new Set(supported)],
          collectiveParticipation:true
        };
      });
    }
    function nativeCandidateSet(S,P,rows){
      return [...primitiveCandidates(P,rows),...composedCandidates(S,P,rows)];
    }
    function implementedPossibilityProjection(rows,candidates){
      return rows.map(row=>({
        id:row.id,
        votes:row.votes,
        voices:(row.voices||[]).map(v=>[v[0],v[1]]),
        directRelationalSupportIds:candidates.filter(c=>(c.supportedPossibilities||[]).includes(row.id)).map(c=>c.id),
        collectiveRelationalParticipationIds:candidates.filter(c=>c.collectiveParticipation).map(c=>c.id)
      }));
    }
    function reconstructedKeys(candidates){
      return candidates.filter(c=>c.type==='active_relation_key').map(c=>c.key).sort();
    }
    function compactWorldSig(S){
      return JSON.stringify([
        Number(S.danger.toFixed(12)),S.spiral,Object.values(S.c),
        ...S.parties.map(P=>[
          P.id,P.target,P.leader,P.last,currentPlace(P),P.relationHistory.length,P.choiceHistory.length,
          [...P.disc].sort(),Object.entries(P.vis).sort(),[...P.hiddenCandidates].sort(),[...P.hiddenDone].sort(),[...P.seenNPC].sort(),
          P.relationField?.episodes?.length||0,[...(P.relationField?.active||[])].sort(),P.relationField?.latent?.byId?.size||0,[...(P.relationField?.latent?.activeIds||[])].sort(),
          ...P.members.flatMap(m=>[m.name,Number(m.x.toFixed(8)),Number(m.y.toFixed(8)),Number(m.hp.toFixed(8))])
        ])
      ]);
    }

    participants=function(S,P,useRel=1){
      const set=productionParticipants(S,P,useRel);
      if(phase&&phase.kind==='choose'&&S===instrumented&&P.id===phase.party&&useRel===1)phase.participantRoles=[...set].sort();
      return set;
    };

    evalP=function(S,P,use=1){
      const rows=productionEvalP(S,P,use);
      if(phase&&phase.kind==='choose'&&S===instrumented&&P.id===phase.party&&use===1&&!phase.evalCaptured){
        const rowCopy=rows.map(r=>({id:r.id,votes:r.votes,voices:(r.voices||[]).map(v=>[v[0],v[1]])}));
        const candidates=nativeCandidateSet(S,P,rowCopy);
        const possibilities=implementedPossibilityProjection(rowCopy,candidates);
        phase.evalCaptured=true;
        phase.candidates=candidates;
        phase.possibilities=possibilities;
        phase.activeKeys=[...(P.relationField?.active||[])].sort();
        const rk=reconstructedKeys(candidates);
        phase.reconstructedActiveKeys=rk;
        if(JSON.stringify(rk)!==JSON.stringify(phase.activeKeys))summary.reconstructedActiveKeyMismatch++;
      }
      return rows;
    };

    choose=function(S,P){
      if(S!==instrumented){productionChoose(S,P);return}
      const prior=pending.get(P.id);
      if(prior&&!prior.realized){summary.supersededBeforeRealization++;prior.superseded=true}
      const rec={kind:'choose',party:P.id,reality:currentReality(S,P),participantRoles:[],evalCaptured:false,candidates:[],possibilities:[],activeKeys:[],reconstructedActiveKeys:[]};
      phase=rec;
      productionChoose(S,P);
      phase=null;
      rec.selectedDecisionRow=rec.possibilities[0]?.id??null;
      rec.selectedActualTarget=P.target;
      rec.selectedLeader=P.leader;
      rec.selectedLeaderRole=P.members.find(m=>m.name===P.leader)?.role??null;
      rec.realized=false;
      summary.totalDecisionEvaluations++;
      summary.decisionsWithImplementedPossibilityCompositionProjection+=rec.possibilities.length>0?1:0;
      summary.totalNativeRelationalCandidateItems+=rec.candidates.length;
      if(rec.candidates.length)summary.decisionsWithNativeRelationalCandidateSet++;
      else summary.decisionsWithoutNativeRelationalCandidateSet++;
      if(rec.candidates.some(c=>c.collectiveParticipation))summary.decisionsWhereRelationalSetParticipatesCollectively++;
      for(const c of rec.candidates){
        uniqueCandidateIds.add(c.id);
        if(c.type==='primitive_relation_presence'){
          summary.primitiveRelationPresenceCandidateItems++;
          uniquePresenceIds.add(c.id);
        }else{
          summary.activeRelationKeyCandidateItems++;
          uniqueKeyIds.add(c.id);
        }
        const links=(c.supportedPossibilities||[]).length;
        summary.candidateToPossibilityLinks+=links;
        summary.directRelationalSupportLinks+=links;
        if(c.collectiveParticipation)summary.collectiveParticipationCandidateItems++;
      }
      const selected=rec.possibilities.find(x=>x.id===rec.selectedDecisionRow);
      rec.selectedDirectRelationalSupportIds=[...(selected?.directRelationalSupportIds||[])];
      rec.selectedCollectiveRelationalParticipationIds=[...(selected?.collectiveRelationalParticipationIds||[])];
      if(rec.selectedDirectRelationalSupportIds.length)summary.decisionsWhereSelectedPossibilityHasDirectRelationalSupport++;
      pending.set(P.id,rec);
      if(traces.length<60&&(rec.candidates.length||rec.selectedDirectRelationalSupportIds.length))traces.push(clone(rec));
    };

    outcome=function(S,P,id){
      productionOutcome(S,P,id);
      if(S!==instrumented)return;
      const rec=pending.get(P.id);
      if(rec&&!rec.realized&&rec.selectedActualTarget===id){
        rec.realized=true;
        rec.realization={tick:E.tick,id,currentPlace:currentPlace(P),relationHistoryLength:P.relationHistory.length,activeKeys:[...(P.relationField?.active||[])].sort()};
        summary.realizedSelectedDecisions++;
      }
    };

    for(let t=1;t<=MAX_TICK;t++){
      E.tick=t;
      const ex=env(t);
      tickW(instrumented,clone(ex));
      tickW(twin,clone(ex));
      if(compactWorldSig(instrumented)!==compactWorldSig(twin))summary.twinBehaviorMismatchTicks++;
      summary.completedTick=t;
    }

    summary.unresolvedAtHorizon=[...pending.values()].filter(x=>!x.realized&&!x.superseded).length;
    summary.uniqueNativeRelationalCandidateIds=uniqueCandidateIds.size;
    summary.uniquePrimitiveRelationPresenceCandidateIds=uniquePresenceIds.size;
    summary.uniqueActiveRelationKeyCandidateIds=uniqueKeyIds.size;

    const valid=summary.reconstructedActiveKeyMismatch===0&&summary.twinBehaviorMismatchTicks===0&&summary.experimenterInterventionCount===0;
    const evidence={
      nativeBehavioralDecisionRelationalCandidateTrace:
        summary.decisionsWithNativeRelationalCandidateSet>0&&valid
          ?'DIRECTLY_INSTRUMENTED_WITHIN_CANONICAL_HARNESS_AT_CURRENT_IMPLEMENTATION_GRANULARITY'
          :'UNVALIDATED',
      implementedPossibilityCompositionProjection:
        summary.decisionsWithImplementedPossibilityCompositionProjection>0&&valid
          ?'DIRECTLY_INSTRUMENTED_IMPLEMENTATION_PROJECTION_WITHIN_CANONICAL_HARNESS'
          :'UNVALIDATED',
      candidateToParticipationSelectionRealizationChain:
        summary.decisionsWithNativeRelationalCandidateSet>0&&summary.realizedSelectedDecisions>0&&valid
          ?'OBSERVED_WITHIN_CANONICAL_HARNESS; SUFFICIENCY_AND_NECESSITY_NOT_ESTABLISHED'
          :'UNVALIDATED',
      primitivePastRelationGranularity:'NPC_RELATION_PRESENCE_PREDICATE_WITH_EVENT_PROVENANCE; INDIVIDUAL_EVENT_CAUSALITY_NOT_ASSERTED',
      activeComposedRelationGranularity:'RELATION_KEY_DECISION_UNIT_WITH_EXACT_EPISODE_PROVENANCE; INDIVIDUAL_EPISODE_NECESSITY_NOT_ASSERTED',
      theoreticalPossibilityCompositionFullyValidated:false,
      individualDispositionValidated:false,
      universalGeneralization:false
    };

    const report={
      system:{name:'OASIS',version:'3.0',hypothesis:'H0'},
      question:'Can relations from Past Relational Structure be directly identified as a native relational candidate layer that participates in the implemented decision construction before selection and realization?',
      method:{
        productionSemanticsModified:false,
        instrumentationOnly:true,
        experimenterInterventionCount:0,
        nonAnticipatory:true,
        dispositionCondition:'NONE',
        nativeRelationalCandidateDefinition:'Current implementation-level relational predicates actually read by decision construction: NPC-level past-relation presence predicates that enable gated/anchor possibilities, plus currently active composed relation keys that can affect collective participation, ranking, or hidden-relation readiness.',
        primitiveGranularityBoundary:'relationHistory provides provenance, but production relationExists compresses repeated primitive events to NPC-level relation presence. Individual primitive event identities are not claimed as independent decision causes.',
        composedGranularityBoundary:'The production relational field exposes active relation keys to decision predicates. Exact episode identities are retained as provenance, but individual episode necessity/sufficiency is not inferred from candidate membership.',
        candidateMembershipVsParticipation:'Membership means a relation predicate is eligible/currently read by decision construction. Direct supportedPossibilities record action-specific support; collectiveParticipation records participation-state influence that need not target a single possibility.',
        possibilityCompositionBoundary:'The recorded rows are the implemented current decision possibility projection (id, votes, voices, direct relational support, collective relational participation). They are not asserted to exhaust the theoretical Open Field of Possibility Combinations.',
        activeKeyValidityCheck:'Candidate reconstruction must reproduce relationField.active keys exactly.',
        twinValidityCheck:'A semantic twin receives identical exogenous conditions under the same wrapped functions. Any world/behavior signature mismatch invalidates the run.'
      },
      summary,
      evidence,
      examples:traces
    };

    E=savedE;
    choose=productionChoose;
    outcome=productionOutcome;
    evalP=productionEvalP;
    participants=productionParticipants;
    return report;
  },{MAX_TICK});

  await writeFile(REPORT,JSON.stringify(result,null,2));
  console.log('OASIS-H0-NATIVE-RELATIONAL-CANDIDATE-V3 '+JSON.stringify(result.summary));
  console.log('H0-EVIDENCE '+JSON.stringify(result.evidence));
  if(result.summary.completedTick!==MAX_TICK)throw new Error(`incomplete run: ${result.summary.completedTick}`);
  if(result.summary.experimenterInterventionCount!==0)throw new Error('experimenter intervention marker detected');
  if(result.summary.twinBehaviorMismatchTicks!==0)throw new Error(`instrumentation changed behavior: ${result.summary.twinBehaviorMismatchTicks}`);
  if(result.summary.reconstructedActiveKeyMismatch!==0)throw new Error(`candidate reconstruction mismatch: ${result.summary.reconstructedActiveKeyMismatch}`);
  if(result.summary.decisionsWithNativeRelationalCandidateSet<1)throw new Error('no native relational candidate decisions observed');
} finally {
  if(browser)await browser.close().catch(()=>{});
  server.kill('SIGTERM');
}
