import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4239;
const HORIZON=8000;
const REPORT='gamma-2.2-r-v4.5-unique-relation-reactivation-intervention-report.json';
const VARIANTS=Object.freeze([
  {id:'canonical',offset:0},
  {id:'E137',offset:137},
  {id:'E977',offset:977},
  {id:'E4099',offset:4099}
]);

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof mkW==='function'&&typeof tickW==='function'&&typeof env==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const report=await page.evaluate(({HORIZON,VARIANTS})=>{
    const savedE=E,clone=x=>structuredClone(x),round=x=>Number(Number(x||0).toFixed(8)),sorted=x=>[...(x||[])].sort();
    const byId=(S,id)=>S.parties.find(P=>P.id===id),auditOf=P=>P.relationField?.latent?.audit||[],allAudit=S=>S.parties.flatMap(P=>[...auditOf(P)]);
    const eqSet=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));

    function fastSig(S){return JSON.stringify([round(S.danger),S.spiral,...S.parties.map(P=>[
      P.id,P.target,currentPlace(P),P.leader,P.last,P.relationHistory.length,P.relationHistory.at(-1)?.t??null,P.relationHistory.at(-1)?.npc??null,P.relationHistory.at(-1)?.place??null,
      P.choiceHistory.length,P.choiceHistory.at(-1)?.t??null,P.choiceHistory.at(-1)?.target??null,sorted(P.disc),Object.entries(P.vis||{}).sort(),sorted(P.hiddenCandidates),sorted(P.hiddenDone),sorted(P.seenNPC),
      P.__OASIS_UNIQUE_REACTIVATION_TARGET_ID,(P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,ep.from?.[0],ep.from?.[1]]),P.relationField?.latent?.byId?.size||0,
      sorted(P.relationField?.latent?.activeIds||[]),sorted(P.relationField?.active||[]),...P.members.flatMap(m=>[m.name,round(m.x),round(m.y),round(m.hp)])
    ])]);}
    function experienceSig(S){return JSON.stringify(S.parties.map(P=>[P.id,P.relationHistory.map(e=>[e.t,e.npc,e.place]),sorted(P.disc),Object.entries(P.vis||{}).sort()]));}
    function storageSig(S){return JSON.stringify(S.parties.map(P=>[P.id,(P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]),[...(P.relationField?.latent?.byId?.entries?.()||[])].map(([id,ep])=>[id,ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]).sort((a,b)=>a[0].localeCompare(b[0]))]));}
    function compact(S){return S.parties.map(P=>({id:P.id,target:P.target,currentPlace:currentPlace(P),leader:P.leader,last:P.last,hiddenCandidates:sorted(P.hiddenCandidates),targetEpisodeId:P.__OASIS_UNIQUE_REACTIVATION_TARGET_ID,relationHistoryLength:P.relationHistory.length,relationEpisodes:P.relationField?.episodes?.length||0,latentEpisodes:P.relationField?.latent?.byId?.size||0,activeKeys:[...(P.relationField?.active||[])],activeEpisodeIds:[...(P.relationField?.latent?.activeIds||[])],choices:P.choiceHistory.length}));}
    function firstChoiceDifference(A,B){const diffs=[];for(const P of A.parties){const Q=byId(B,P.id),a=P.choiceHistory,b=Q?.choiceHistory||[],n=Math.max(a.length,b.length);for(let i=0;i<n;i++){const x=a[i],y=b[i];if(!x||!y||x.t!==y.t||x.target!==y.target){diffs.push({party:P.id,index:i,controlTick:x?.t??null,blockedTick:y?.t??null,controlTarget:x?.target??null,blockedTarget:y?.target??null,effectTick:Math.min(x?.t??Infinity,y?.t??Infinity)});break}}}return diffs.sort((a,b)=>a.effectTick-b.effectTick)[0]||null;}
    function firstComponentDiff(A,B,kind){for(const P of A.parties){const Q=byId(B,P.id);if(!Q)continue;if(kind==='candidate'&&(P.last!==Q.last||!eqSet(P.hiddenCandidates,Q.hiddenCandidates)))return{party:P.id,control:{last:P.last,hidden:sorted(P.hiddenCandidates)},blocked:{last:Q.last,hidden:sorted(Q.hiddenCandidates)}};if(kind==='participant'&&P.leader!==Q.leader)return{party:P.id,control:P.leader,blocked:Q.leader};if(kind==='selected'&&P.target!==Q.target)return{party:P.id,control:P.target,blocked:Q.target};if(kind==='active-key'&&!eqSet(P.relationField?.active||[],Q.relationField?.active||[]))return{party:P.id,control:sorted(P.relationField?.active||[]),blocked:sorted(Q.relationField?.active||[])};}return null;}
    function targetGenealogy(control,blocked){const out=[];for(const P of control.parties){const sel=auditOf(P).find(e=>e.type==='reactivation-target-selected'),id=sel?.episodeId;if(!id){out.push({party:P.id,episodeId:null});continue}const ev=auditOf(P).filter(e=>e.episodeId===id||(Array.isArray(e.latentEpisodeIds)&&e.latentEpisodeIds.includes(id)));const first=t=>ev.filter(e=>e.type===t).sort((a,b)=>a.tick-b.tick)[0]||null;const comp=first('compose'),lat=ev.filter(e=>e.type==='latentize'||e.type==='noncurrent').sort((a,b)=>a.tick-b.tick)[0]||null,react=first('reactivate'),part=ev.filter(e=>e.type==='select-participation'&&(e.latentEpisodeIds||[]).includes(id)).sort((a,b)=>a.tick-b.tick)[0]||null,outcome=ev.filter(e=>e.type==='outcome'&&(e.latentEpisodeIds||[]).includes(id)).sort((a,b)=>a.tick-b.tick)[0]||null;const Q=byId(blocked,P.id),bsel=auditOf(Q).find(e=>e.type==='reactivation-target-selected'&&e.episodeId===id),blk=auditOf(Q).find(e=>e.type==='unique-reactivation-link-block'&&e.episodeId===id);out.push({party:P.id,episodeId:id,key:sel.key,selectionTick:sel.tick,controlComposeTick:comp?.tick??null,latentTick:lat?.tick??null,controlReactivationTick:react?.tick??null,controlParticipationTick:part?.tick??null,controlLaterOutcomeTick:outcome?.tick??null,blockedSelectionTick:bsel?.tick??null,blockedReactivationTick:blk?.tick??null,matchedSelection:bsel?.tick===sel.tick,matchedReactivation:blk?.tick===react?.tick,exactControlChain:!!(comp&&lat&&react&&part&&outcome&&comp.tick<=lat.tick&&lat.tick<=react.tick&&react.tick<=part.tick&&part.tick<=outcome.tick)});}return out;}

    const variants=[];
    for(const v of VARIANTS){
      const control=mkW('full'),twin=mkW('full'),blocked=mkW('full');
      for(const S of [control,twin,blocked])S.__OASIS_UNIQUE_REACTIVATION_TARGET=true;
      control.__OASIS_UNIQUE_REACTIVATION_BLOCK=false;twin.__OASIS_UNIQUE_REACTIVATION_BLOCK=false;blocked.__OASIS_UNIQUE_REACTIVATION_BLOCK=true;
      E={tick:0,worlds:{control,twin,blocked},paused:true};
      const seen=Object.fromEntries(blocked.parties.map(P=>[P.id,0]));
      let twinMismatchTicks=0,preInterventionMismatchTicks=0,started=false,blockCount=0,firstBlock=null;
      let firstActiveKeyDiff=null,firstCandidateDiff=null,firstParticipantDiff=null,firstSelectedTargetDiff=null,firstBehaviorDiff=null;
      function consumeBlocks(){const out=[];for(const P of blocked.parties){const a=auditOf(P),s=seen[P.id]||0;for(let i=s;i<a.length;i++)if(a[i].type==='unique-reactivation-link-block')out.push(a[i]);seen[P.id]=a.length;}return out;}
      for(let t=1;t<=HORIZON;t++){
        E.tick=t;const ex=env(t+v.offset);tickW(control,clone(ex));tickW(twin,clone(ex));tickW(blocked,clone(ex));
        if(fastSig(control)!==fastSig(twin))twinMismatchTicks++;
        const nb=consumeBlocks();blockCount+=nb.length;
        if(!started&&!nb.length&&fastSig(control)!==fastSig(blocked))preInterventionMismatchTicks++;
        if(nb.length&&!started){started=true;const e=nb[0],Pc=byId(control,e.party),Pb=byId(blocked,e.party),cr=auditOf(Pc).find(x=>x.type==='reactivate'&&x.episodeId===e.episodeId&&x.tick===e.tick),cs=auditOf(Pc).find(x=>x.type==='reactivation-target-selected'&&x.episodeId===e.episodeId),bs=auditOf(Pb).find(x=>x.type==='reactivation-target-selected'&&x.episodeId===e.episodeId);firstBlock={tick:t,party:e.party,episodeId:e.episodeId,key:e.key,reasons:e.reasons,genericExperienceParity:experienceSig(control)===experienceSig(blocked),structuralStorageParity:storageSig(control)===storageSig(blocked),matchingTargetSelection:!!(cs&&bs&&cs.tick===bs.tick),matchingControlReactivation:!!cr,controlState:compact(control),blockedState:compact(blocked)};}
        if(started){const ak=firstComponentDiff(control,blocked,'active-key'),ca=firstComponentDiff(control,blocked,'candidate'),pa=firstComponentDiff(control,blocked,'participant'),se=firstComponentDiff(control,blocked,'selected');if(firstActiveKeyDiff===null&&ak)firstActiveKeyDiff={tick:t,...ak};if(firstCandidateDiff===null&&ca)firstCandidateDiff={tick:t,...ca};if(firstParticipantDiff===null&&pa)firstParticipantDiff={tick:t,...pa};if(firstSelectedTargetDiff===null&&se)firstSelectedTargetDiff={tick:t,...se};if(firstBehaviorDiff===null){for(const P of control.parties){const Q=byId(blocked,P.id);if(currentPlace(P)!==currentPlace(Q)||P.members.some((m,i)=>{const n=Q.members[i];return round(m.x)!==round(n.x)||round(m.y)!==round(n.y)||round(m.hp)!==round(n.hp)})){firstBehaviorDiff={tick:t,party:P.id};break}}}}
      }
      const choiceDiff=firstChoiceDifference(control,blocked),genealogy=targetGenealogy(control,blocked),firstBlockValid=!!firstBlock&&firstBlock.genericExperienceParity&&firstBlock.structuralStorageParity&&firstBlock.matchingTargetSelection&&firstBlock.matchingControlReactivation;
      variants.push({variant:v,horizon:HORIZON,validity:{twinMismatchTicks,preInterventionMismatchTicks,firstBlockValid},intervention:{blockCount,firstBlock},effects:{firstActiveKeyDiff,firstCandidateDiff,firstParticipantDiff,firstSelectedTargetDiff,firstChoiceDifference:choiceDiff,firstBehaviorDiff},genealogy,final:{control:compact(control),blocked:compact(blocked)}});
    }
    const variantsWithIntervention=variants.filter(v=>v.intervention.blockCount>0).length,variantsWithCandidateEffect=variants.filter(v=>v.effects.firstCandidateDiff).length,variantsWithParticipantEffect=variants.filter(v=>v.effects.firstParticipantDiff).length,variantsWithSelectedTargetEffect=variants.filter(v=>v.effects.firstSelectedTargetDiff||v.effects.firstChoiceDifference).length,variantsWithBehaviorEffect=variants.filter(v=>v.effects.firstBehaviorDiff).length,variantsWithExactControlChain=variants.filter(v=>v.genealogy.some(g=>g.exactControlChain&&g.matchedReactivation)).length;
    const valid=variantsWithIntervention>0&&variants.every(v=>v.validity.twinMismatchTicks===0&&v.validity.preInterventionMismatchTicks===0&&(v.intervention.blockCount===0||v.validity.firstBlockValid));
    let evidenceGrade='INVALID_EXPERIMENT';if(valid)evidenceGrade='FLOW_PRESERVED_UNIQUE_REACTIVATION_INTERVENTION_VALID';if(valid&&(variantsWithCandidateEffect>0||variantsWithParticipantEffect>0))evidenceGrade='FLOW_PRESERVED_UNIQUE_REACTIVATION_WITH_DECISION_STRUCTURE_EFFECT_WITHIN_HARNESS';if(valid&&variantsWithSelectedTargetEffect>0)evidenceGrade='FLOW_PRESERVED_UNIQUE_REACTIVATION_WITH_SELECTED_ACTION_EFFECT_WITHIN_HARNESS';
    const out={experiment:'Gamma 2.2-R v4.5 — Unique-Relation Reactivation Intervention',date:'2026-09-10',question:'When a past relational episode becomes currently relevant again and no other currently relevant episode represents the same relation key, does blocking only that reactivation alter candidate, participation, or selected-action structure?',selectionRule:'First currently relevant latent episode per party whose relation key has no other currently relevant recent or latent episode at that moment. Selection uses only current structural topology and relevance, never future outcomes or downstream decision differences.',intervention:{preserved:['episode formation','generic experience','relationHistory','all non-target relation episodes','same exogenous stream','same choice/outcome machinery'],changed:['only reactivation of the first currently unique relation-key episode'],noFutureInformation:true,noDecisionOutcomeBasedSelection:true},predeclaredStreams:VARIANTS,horizonPerStream:HORIZON,validity:{valid,variantsWithIntervention,totalTwinMismatchTicks:variants.reduce((a,v)=>a+v.validity.twinMismatchTicks,0),totalPreInterventionMismatchTicks:variants.reduce((a,v)=>a+v.validity.preInterventionMismatchTicks,0)},summary:{variants:variants.length,variantsWithCandidateEffect,variantsWithParticipantEffect,variantsWithSelectedTargetEffect,variantsWithBehaviorEffect,variantsWithExactControlChain},evidenceGrade,interpretationBoundary:['Internal active-episode identity is not counted as a decision effect. Candidate structure, participant/leader state, selected target/choice, and physical behavior are reported separately.','Positive effects support conditional causal contribution of a currently unique past-relation reactivation within this harness, not universal necessity or sufficiency.','Negative streams remain valid and may indicate that a relation is currently irrelevant to downstream choice despite being structurally unique.','No result establishes external generalization, superiority over other AI systems, or a scalar causal rate.'],variants};E=savedE;return out;
  },{HORIZON,VARIANTS});
  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('GAMMA-2.2-R-V4.5 '+JSON.stringify({validity:report.validity,summary:report.summary,evidenceGrade:report.evidenceGrade,variants:report.variants.map(v=>({id:v.variant.id,blocks:v.intervention.blockCount,firstBlock:v.intervention.firstBlock?.tick??null,activeKey:v.effects.firstActiveKeyDiff?.tick??null,candidate:v.effects.firstCandidateDiff?.tick??null,participant:v.effects.firstParticipantDiff?.tick??null,selected:v.effects.firstSelectedTargetDiff?.tick??null,choice:v.effects.firstChoiceDifference?.effectTick??null,behavior:v.effects.firstBehaviorDiff?.tick??null}))},null,2));
  if(!report.validity.valid)process.exitCode=1;
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
