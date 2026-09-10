import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4238;
const HORIZON=8000;
const REPORT='gamma-2.2-r-v4.4-targeted-reactivation-intervention-report.json';
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
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const report=await page.evaluate(({HORIZON,VARIANTS})=>{
    const savedE=E;
    const clone=x=>structuredClone(x);
    const round=x=>Number(Number(x||0).toFixed(8));
    const sorted=x=>[...(x||[])].sort();
    const byId=(S,id)=>S.parties.find(P=>P.id===id);
    const auditOf=P=>P.relationField?.latent?.audit||[];
    const allAudit=S=>S.parties.flatMap(P=>[...auditOf(P)]);

    function stateSig(S){
      return JSON.stringify([
        round(S.danger),S.spiral,
        ...S.parties.map(P=>[
          P.id,P.target,currentPlace(P),P.leader,P.last,
          P.relationHistory.length,P.relationHistory.at(-1)?.t??null,P.relationHistory.at(-1)?.npc??null,P.relationHistory.at(-1)?.place??null,
          P.choiceHistory.length,P.choiceHistory.at(-1)?.t??null,P.choiceHistory.at(-1)?.target??null,
          sorted(P.disc),Object.entries(P.vis||{}).sort(),sorted(P.hiddenCandidates),sorted(P.hiddenDone),sorted(P.seenNPC),
          P.__OASIS_FIRST_FORMED_EPISODE_ID,
          (P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,ep.from?.[0],ep.from?.[1]]),
          P.relationField?.latent?.byId?.size||0,sorted(P.relationField?.latent?.activeIds||[]),sorted(P.relationField?.active||[]),
          ...P.members.flatMap(m=>[m.name,round(m.x),round(m.y),round(m.hp)])
        ])
      ]);
    }
    function decisionSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,P.target,P.leader,P.last,sorted(P.hiddenCandidates),sorted(P.hiddenDone),
        P.choiceHistory.length,P.choiceHistory.at(-1)?.t??null,P.choiceHistory.at(-1)?.target??null,
        sorted(P.relationField?.active||[]),sorted(P.relationField?.latent?.activeIds||[])
      ]));
    }
    function behaviorSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,P.target,currentPlace(P),P.choiceHistory.length,
        ...P.members.flatMap(m=>[m.name,round(m.x),round(m.y),round(m.hp)])
      ]));
    }
    function experienceSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,P.relationHistory.map(e=>[e.t,e.npc,e.place]),sorted(P.disc),Object.entries(P.vis||{}).sort()
      ]));
    }
    function storageSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,P.__OASIS_FIRST_FORMED_EPISODE_ID,
        (P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]),
        [...(P.relationField?.latent?.byId?.entries?.()||[])].map(([id,ep])=>[id,ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]).sort((a,b)=>a[0].localeCompare(b[0]))
      ]));
    }
    function compact(S){
      return S.parties.map(P=>({
        id:P.id,target:P.target,currentPlace:currentPlace(P),leader:P.leader,last:P.last,
        firstEpisodeId:P.__OASIS_FIRST_FORMED_EPISODE_ID,
        relationHistoryLength:P.relationHistory.length,relationEpisodes:P.relationField?.episodes?.length||0,
        latentEpisodes:P.relationField?.latent?.byId?.size||0,activeKeys:[...(P.relationField?.active||[])],choices:P.choiceHistory.length
      }));
    }
    function firstChoiceDifference(A,B){
      const out=[];
      for(const P of A.parties){
        const Q=byId(B,P.id),a=P.choiceHistory,b=Q?.choiceHistory||[],n=Math.max(a.length,b.length);
        for(let i=0;i<n;i++){
          const x=a[i],y=b[i];
          if(!x||!y||x.t!==y.t||x.target!==y.target){
            out.push({party:P.id,index:i,controlTick:x?.t??null,blockedTick:y?.t??null,controlTarget:x?.target??null,blockedTarget:y?.target??null,effectTick:Math.min(x?.t??Infinity,y?.t??Infinity)});break;
          }
        }
      }
      return out.sort((a,b)=>a.effectTick-b.effectTick)[0]||null;
    }
    function exactGenealogy(S){
      const rows=[];
      for(const P of S.parties){
        const id=P.__OASIS_FIRST_FORMED_EPISODE_ID;
        if(!id){rows.push({party:P.id,episodeId:null});continue}
        const ev=[];
        for(const e of auditOf(P)){
          if(e.episodeId===id||(Array.isArray(e.latentEpisodeIds)&&e.latentEpisodeIds.includes(id)))ev.push(e);
        }
        const first=t=>ev.filter(e=>e.type===t).sort((a,b)=>a.tick-b.tick)[0]||null;
        const compose=first('compose'),latent=ev.filter(e=>e.type==='latentize'||e.type==='noncurrent').sort((a,b)=>a.tick-b.tick)[0]||null;
        const react=first('reactivate');
        const part=ev.filter(e=>e.type==='select-participation'&&(e.latentEpisodeIds||[]).includes(id)).sort((a,b)=>a.tick-b.tick)[0]||null;
        const outcome=ev.filter(e=>e.type==='outcome'&&(e.latentEpisodeIds||[]).includes(id)).sort((a,b)=>a.tick-b.tick)[0]||null;
        rows.push({party:P.id,episodeId:id,composeTick:compose?.tick??null,latentTick:latent?.tick??null,reactivationTick:react?.tick??null,participationTick:part?.tick??null,laterOutcomeTick:outcome?.tick??null,exactOrdered:!!(compose&&latent&&react&&part&&outcome&&compose.tick<=latent.tick&&latent.tick<=react.tick&&react.tick<=part.tick&&part.tick<=outcome.tick)});
      }
      return rows;
    }

    const variants=[];
    for(const v of VARIANTS){
      const control=mkW('full'),twin=mkW('full'),blocked=mkW('full');
      control.__OASIS_REACTIVATION_LINK_BLOCK=false;
      twin.__OASIS_REACTIVATION_LINK_BLOCK=false;
      blocked.__OASIS_REACTIVATION_LINK_BLOCK=true;
      E={tick:0,worlds:{control,twin,blocked},paused:true};

      const seenAudit=Object.fromEntries(blocked.parties.map(P=>[P.id,0]));
      let twinMismatchTicks=0,preInterventionMismatchTicks=0,interventionStarted=false;
      let firstBlock=null,firstDecisionDivergence=null,firstBehaviorDivergence=null;
      let blockCount=0;

      function consumeBlocks(){
        const out=[];
        for(const P of blocked.parties){
          const a=auditOf(P),start=seenAudit[P.id]||0;
          for(let i=start;i<a.length;i++)if(a[i].type==='reactivation-link-block')out.push(a[i]);
          seenAudit[P.id]=a.length;
        }
        return out;
      }

      for(let t=1;t<=HORIZON;t++){
        E.tick=t;const ex=env(t+v.offset);
        tickW(control,clone(ex));tickW(twin,clone(ex));tickW(blocked,clone(ex));
        if(stateSig(control)!==stateSig(twin))twinMismatchTicks++;

        const newBlocks=consumeBlocks();blockCount+=newBlocks.length;
        if(!interventionStarted&&!newBlocks.length&&stateSig(control)!==stateSig(blocked))preInterventionMismatchTicks++;
        if(newBlocks.length&&!interventionStarted){
          interventionStarted=true;
          const e=newBlocks[0],Pc=byId(control,e.party),Pb=byId(blocked,e.party);
          const controlReact=auditOf(Pc).find(x=>x.type==='reactivate'&&x.episodeId===e.episodeId&&x.tick===e.tick);
          firstBlock={
            tick:t,party:e.party,episodeId:e.episodeId,key:e.key,reasons:e.reasons,
            genericExperienceParity:experienceSig(control)===experienceSig(blocked),
            structuralStorageParity:storageSig(control)===storageSig(blocked),
            targetEpisodeIdParity:control.parties.every(P=>P.__OASIS_FIRST_FORMED_EPISODE_ID===byId(blocked,P.id)?.__OASIS_FIRST_FORMED_EPISODE_ID),
            matchingControlReactivation:!!controlReact,
            controlState:compact(control),blockedState:compact(blocked)
          };
        }
        if(interventionStarted&&firstDecisionDivergence===null&&decisionSig(control)!==decisionSig(blocked))firstDecisionDivergence={tick:t,control:compact(control),blocked:compact(blocked)};
        if(interventionStarted&&firstBehaviorDivergence===null&&behaviorSig(control)!==behaviorSig(blocked))firstBehaviorDivergence={tick:t,control:compact(control),blocked:compact(blocked)};
      }

      const choiceDiff=firstChoiceDifference(control,blocked);
      const controlGenealogy=exactGenealogy(control);
      const blockedAudit=allAudit(blocked).filter(e=>e.type==='reactivation-link-block');
      const matchedTargets=controlGenealogy.map(g=>{
        const b=blockedAudit.find(e=>e.party===g.party&&e.episodeId===g.episodeId);
        return {...g,blockedReactivationTick:b?.tick??null,matchedCounterfactualReactivation:g.reactivationTick!=null&&b?.tick===g.reactivationTick};
      });
      const exactControlChains=matchedTargets.filter(x=>x.exactOrdered).length;
      const matchedReactivationTargets=matchedTargets.filter(x=>x.matchedCounterfactualReactivation).length;
      const firstBlockValid=!!firstBlock&&firstBlock.genericExperienceParity&&firstBlock.structuralStorageParity&&firstBlock.targetEpisodeIdParity&&firstBlock.matchingControlReactivation;
      const choiceEffectAfterReactivation=!!(choiceDiff&&firstBlock&&choiceDiff.effectTick>=firstBlock.tick);

      variants.push({
        variant:v,horizon:HORIZON,
        validity:{twinMismatchTicks,preInterventionMismatchTicks,firstBlockValid},
        intervention:{blockCount,firstBlock},
        effect:{firstDecisionDivergence,firstBehaviorDivergence,firstChoiceDifference:choiceDiff,choiceEffectAfterReactivation},
        genealogy:{exactControlChains,matchedReactivationTargets,targets:matchedTargets},
        final:{control:compact(control),blocked:compact(blocked)}
      });
    }

    const variantsWithIntervention=variants.filter(x=>x.intervention.blockCount>0).length;
    const variantsWithDecisionEffect=variants.filter(x=>x.effect.firstDecisionDivergence).length;
    const variantsWithChoiceEffect=variants.filter(x=>x.effect.choiceEffectAfterReactivation).length;
    const variantsWithExactControlChain=variants.filter(x=>x.genealogy.exactControlChains>0).length;
    const valid=variantsWithIntervention>0&&variants.every(x=>x.validity.twinMismatchTicks===0&&x.validity.preInterventionMismatchTicks===0&&(x.intervention.blockCount===0||x.validity.firstBlockValid));
    let evidenceGrade='INVALID_EXPERIMENT';
    if(valid)evidenceGrade='FLOW_PRESERVED_TARGETED_REACTIVATION_INTERVENTION_VALID';
    if(valid&&variantsWithDecisionEffect>0)evidenceGrade='FLOW_PRESERVED_TARGETED_REACTIVATION_INTERVENTION_WITH_DECISION_EFFECT_WITHIN_HARNESS';
    if(valid&&variantsWithChoiceEffect>0)evidenceGrade='FLOW_PRESERVED_TARGETED_REACTIVATION_INTERVENTION_WITH_CHOICE_EFFECT_WITHIN_HARNESS';

    const out={
      experiment:'Gamma 2.2-R v4.4 — Targeted Reactivation-Link Intervention',date:'2026-09-10',
      question:'After a realized relational experience has formed an exact structural episode and that episode has become non-current/latent, does blocking only the later reactivation of that exact past episode alter current decision flow?',
      targetSelection:'First canonically formed relationField episode per party, selected at formation time without future information.',
      intervention:{preserved:['original formation','generic feedback experience','relationHistory','all other relationField episodes','same exogenous stream','same choice/outcome machinery'],changed:['only later latent reactivation of the preselected exact episode in the intervention world'],noFutureSelection:true,noOutcomeRelabeling:true},
      predeclaredStreams:VARIANTS,horizonPerStream:HORIZON,
      validity:{valid,variantsWithIntervention,totalTwinMismatchTicks:variants.reduce((a,x)=>a+x.validity.twinMismatchTicks,0),totalPreInterventionMismatchTicks:variants.reduce((a,x)=>a+x.validity.preInterventionMismatchTicks,0)},
      summary:{variants:variants.length,variantsWithDecisionEffect,variantsWithChoiceEffect,variantsWithExactControlChain},
      evidenceGrade,
      interpretationBoundary:[
        'The intervention targets one exact preselected past relational episode per party; it does not remove the whole relation layer.',
        'A positive effect supports causal contribution of exact past-relation reactivation within this harness, not universal necessity or sufficiency.',
        'A negative stream remains a valid conditional negative result and may reflect redundancy with other active relational episodes.',
        'No result establishes external real-world generalization, model superiority, or a scalar causal rate.'
      ],variants
    };
    E=savedE;return out;
  },{HORIZON,VARIANTS});

  await writeFile(REPORT,JSON.stringify(report,null,2));
  console.log('GAMMA-2.2-R-V4.4 '+JSON.stringify({validity:report.validity,summary:report.summary,evidenceGrade:report.evidenceGrade,variants:report.variants.map(v=>({id:v.variant.id,blocks:v.intervention.blockCount,firstBlock:v.intervention.firstBlock?.tick??null,firstDecision:v.effect.firstDecisionDivergence?.tick??null,firstChoice:v.effect.firstChoiceDifference?.effectTick??null,choiceEffect:v.effect.choiceEffectAfterReactivation,exactChains:v.genealogy.exactControlChains,matchedTargets:v.genealogy.matchedReactivationTargets}))},null,2));
  if(!report.validity.valid)process.exitCode=1;
  await context.close();
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
