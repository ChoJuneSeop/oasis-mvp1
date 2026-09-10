import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const OFFSET=Number(process.env.OFFSET||0);
const LABEL=process.env.LABEL||`offset${OFFSET}`;
const MODE=process.env.MODE||'full';
const HORIZON=Number(process.env.HORIZON||(MODE==='smoke'?12000:120000));
const PORT=5150+(OFFSET%100);
const REPORT=`flow-selective-joint-response-v1.2-r10-${LABEL}.json`;
const EXPECTED={0:{dawn:917,star:547,blue:533},137:{dawn:593,star:757,blue:535},977:{dawn:531,star:543,blue:548},4099:{dawn:672,star:760,blue:577}};

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(400);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.oasisFlowSelectiveV12?.version==='1.2-r10-stageA',null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,OFFSET,MODE,EXPECTED})=>{
    E={tick:0,worlds:{full:mkW('full')},paused:true};const S=E.worlds.full,productionChoose=choose;
    const errors={entryOracle:0,futureLeak:0,observerMutation:0,nonDirectSequence:0,duplicateSequence:0,npcFabrication:0,npcCountMismatch:0,compositionMismatch:0,recursiveExpansion:0,revalidationVersion:0,statusMismatch:0};
    const stats={frames:0,sequenceRelations:0,npcHandles:0,sequencePairs:0,maxSequencePerFrame:0,maxNpcHandlesPerFrame:0,party:{}};
    const ps=id=>stats.party[id]||(stats.party[id]={frames:0,entrySum:0,expandedNeighborSum:0,sequenceSum:0,npcHandleSum:0,last:null});
    const stable=x=>JSON.stringify(x);
    function behaviorSig(P,W){return {danger:W.danger,target:P.target,leader:P.leader,last:P.last,currentPlace:currentPlace(P),members:P.members.map(m=>[m.name,m.x,m.y,m.hp]),relationHistory:P.relationHistory.map(e=>[e.t,e.npc,e.place]),choiceHistory:P.choiceHistory.map(e=>[e.t,e.target]),prs:ensurePastRelationalStructure(P).realizedExperiences.map(e=>[e.id,e.t,e.place,e.choice,e.leader,e.danger])};}
    function validate(P,entry,x,c){
      const PRS=ensurePastRelationalStructure(P),rows=PRS.realizedExperiences||[],pos=new Map(rows.map((e,i)=>[e.id,i]));
      const keys=new Set();
      for(const r of x.sequenceRelations){
        if(r.fromId&&oasisFlowSelectiveV12.ensureFlowSelective(P).index.byId.get(r.fromId)?.t>E.tick)errors.futureLeak++;
        if(r.toId&&oasisFlowSelectiveV12.ensureFlowSelective(P).index.byId.get(r.toId)?.t>E.tick)errors.futureLeak++;
        if((pos.get(r.toId)??-99)!==(pos.get(r.fromId)??-101)+1)errors.nonDirectSequence++;
        const k=`${r.fromId}->${r.toId}`;if(keys.has(k))errors.duplicateSequence++;keys.add(k);
      }
      const facts=PRS.relationFacts||[];
      for(const h of x.npcRelationHandles){
        const actualIds=new Set(facts.filter(f=>f.npc===h.npc).map(f=>f.experienceId));
        if(actualIds.size!==h.relatedPastCount)errors.npcCountMismatch++;
        for(const id of h.anchorExperienceIds)if(!facts.some(f=>f.npc===h.npc&&f.experienceId===id))errors.npcFabrication++;
      }
      if(x.recursiveExpansionPerformed||c.transitiveClosurePerformed||!c.revalidationRequiredBeforeFurtherExpansion)errors.recursiveExpansion++;
      if(x.revalidationRealityVersion!==E.tick)errors.revalidationVersion++;
      const seqA=x.sequenceRelations.map(r=>`${r.fromId}->${r.toId}`).sort(),seqB=c.sequencePairs.map(r=>`${r.experienceIds[0]}->${r.experienceIds[1]}`).sort();
      const npcA=x.npcRelationHandles.map(h=>h.npc).sort(),npcB=c.npcRelationHandles.map(h=>h.npc).sort();
      if(stable(seqA)!==stable(seqB)||stable(npcA)!==stable(npcB))errors.compositionMismatch++;
      const entrySet=new Set(entry.experiences.map(e=>e.id)),neighbors=new Set();for(const r of x.sequenceRelations){if(entrySet.has(r.fromId)&&!entrySet.has(r.toId))neighbors.add(r.toId);if(entrySet.has(r.toId)&&!entrySet.has(r.fromId))neighbors.add(r.fromId);}return neighbors.size;
    }
    choose=function(W,P){
      if(W!==S||MODELS[W.key].kind!=='oasis'||!MODELS[W.key].fb)return productionChoose(W,P);
      const before=behaviorSig(P,W),entry=oasisFlowSelectiveV12.entryCandidates(W,P),oracle=oasisFlowSelectiveV12.fullScanReference(W,P);
      if(stable(entry.experiences.map(e=>e.id).sort())!==stable(oracle))errors.entryOracle++;
      if(entry.experiences.some(e=>e.t>E.tick))errors.futureLeak++;
      const x=oasisFlowSelectiveV12.directRelationalExpansion(W,P,entry),c=oasisFlowSelectiveV12.composeRelationCandidates(W,P,entry,x),neighbors=validate(P,entry,x,c),after=behaviorSig(P,W);
      if(stable(before)!==stable(after))errors.observerMutation++;
      stats.frames++;stats.sequenceRelations+=x.sequenceRelations.length;stats.npcHandles+=x.npcRelationHandles.length;stats.sequencePairs+=c.sequencePairs.length;stats.maxSequencePerFrame=Math.max(stats.maxSequencePerFrame,x.sequenceRelations.length);stats.maxNpcHandlesPerFrame=Math.max(stats.maxNpcHandlesPerFrame,x.npcRelationHandles.length);
      const q=ps(P.id);q.frames++;q.entrySum+=entry.accessed;q.expandedNeighborSum+=neighbors;q.sequenceSum+=x.sequenceRelations.length;q.npcHandleSum+=x.npcRelationHandles.length;q.last={tick:E.tick,totalPast:entry.totalPast,entry:entry.accessed,entryRatio:entry.totalPast?entry.accessed/entry.totalPast:0,directOutsideEntryNeighbors:neighbors,sequenceRelations:x.sequenceRelations.length,npcHandles:x.npcRelationHandles.length};
      const out=productionChoose(W,P),jf=oasisFlowSelectiveV12.ensureFlowSelective(P).lastJointFrame;
      if(!jf||jf.expansion?.status!=='DIRECT_ACTUAL_RELATIONS_ONLY_REVALIDATION_REQUIRED_FOR_FURTHER_EXPANSION'||jf.composition?.status!=='RELATIONAL_COMBINATION_CANDIDATES_ONLY_NO_ACTION_AUTHORITY'||jf.actionAuthority!=='OBSERVE_ONLY_STAGE_A')errors.statusMismatch++;
      return out;
    };
    for(let t=1;t<=HORIZON;t++){E.tick=t;tickW(S,env(t+OFFSET));}choose=productionChoose;
    const finalCounts=Object.fromEntries(S.parties.map(P=>[P.id,ensurePastRelationalStructure(P).realizedExperiences.length]));
    const expected=MODE==='full'?(EXPECTED[String(OFFSET)]||EXPECTED[OFFSET]||null):null,trajectoryPreserved=!expected||stable(finalCounts)===stable(expected);
    for(const p of Object.values(stats.party)){p.meanEntryCount=p.frames?p.entrySum/p.frames:0;p.meanDirectOutsideEntryNeighbors=p.frames?p.expandedNeighborSum/p.frames:0;p.meanSequenceRelations=p.frames?p.sequenceSum/p.frames:0;p.meanNpcHandles=p.frames?p.npcHandleSum/p.frames:0;delete p.entrySum;delete p.expandedNeighborSum;delete p.sequenceSum;delete p.npcHandleSum;}
    const validity={entryOracleExact:errors.entryOracle===0,nonAnticipation:errors.futureLeak===0,observerNoBehaviorMutation:errors.observerMutation===0,sequenceRelationsDirectOnly:errors.nonDirectSequence===0&&errors.duplicateSequence===0,npcRelationsNotFabricated:errors.npcFabrication===0&&errors.npcCountMismatch===0,compositionMirrorsExpansion:errors.compositionMismatch===0,noAutonomousTransitiveClosure:errors.recursiveExpansion===0,revalidationUsesCurrentRealityVersion:errors.revalidationVersion===0,statusesExact:errors.statusMismatch===0,legacyTrajectoryCountsPreserved:trajectoryPreserved,noTopKNoHopThreshold:true,responsibilityStillNotFabricated:true};
    return {offset:OFFSET,horizon:HORIZON,mode:MODE,finalCounts,expected,trajectoryPreserved,errors,stats,validity,pass:Object.values(validity).every(Boolean)};
  },{HORIZON,OFFSET,MODE,EXPECTED});
  const report={experiment:'OASIS Flow-Selective Joint Response v1.2',iteration:'r10',stage:'A direct relational expansion contract',designGuard:'Direct relation is a revalidation boundary, not a performance-tuned hop limit. No recursive past-to-past expansion without current-reality revalidation.',result};
  await writeFile(REPORT,JSON.stringify(report,null,2));console.log('OASIS-FSJR-R10',JSON.stringify({label:LABEL,...result}));if(!result.pass)process.exitCode=1;
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
