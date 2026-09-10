import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4237;
const HORIZON=8000;
const REPORT='gamma-2.2-r-v4.3-incorporation-link-intervention-report.json';
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
  await page.waitForFunction(()=>typeof mkW==='function'&&typeof tickW==='function'&&typeof env==='function'&&typeof outcome==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,VARIANTS})=>{
    const savedE=E;
    const clone=x=>structuredClone(x);
    const round=x=>Number(Number(x||0).toFixed(8));
    const sorted=x=>[...(x||[])].sort();
    const partyById=(S,id)=>S.parties.find(P=>P.id===id);
    const audits=S=>S.parties.flatMap(P=>[...(P.relationField?.latent?.audit||[])]);
    const interventionEvents=S=>audits(S).filter(e=>e.type==='incorporation-link-block');

    function experienceSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,
        P.relationHistory.map(e=>[e.t,e.npc,e.place]),
        sorted(P.disc),
        Object.entries(P.vis||{}).sort()
      ]));
    }
    function structureSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,
        (P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]),
        sorted(P.relationField?.active||[]),
        sorted(P.relationField?.latent?.byId?.keys?.()||[]),
        sorted(P.relationField?.latent?.activeIds||[])
      ]));
    }
    function decisionSig(S){
      return JSON.stringify(S.parties.map(P=>[
        P.id,P.target,P.leader,P.last,
        sorted(P.hiddenCandidates),sorted(P.hiddenDone),
        P.choiceHistory.length,
        P.choiceHistory.at(-1)?.t??null,
        P.choiceHistory.at(-1)?.target??null
      ]));
    }
    function behaviorSig(S){
      return JSON.stringify([
        round(S.danger),S.spiral,
        ...S.parties.map(P=>[
          P.id,P.target,currentPlace(P),P.choiceHistory.length,
          ...P.members.flatMap(m=>[m.name,round(m.x),round(m.y),round(m.hp)])
        ])
      ]);
    }
    function twinSig(S){
      return JSON.stringify([
        round(S.danger),S.spiral,Object.entries(S.c||{}).sort(),
        ...S.parties.map(P=>[
          P.id,P.target,currentPlace(P),P.leader,P.last,
          P.relationHistory.map(e=>[e.t,e.npc,e.place]),
          P.choiceHistory.map(e=>[e.t,e.target]),
          sorted(P.disc),Object.entries(P.vis||{}).sort(),
          sorted(P.hiddenCandidates),sorted(P.hiddenDone),sorted(P.seenNPC),
          (P.relationField?.episodes||[]).map(ep=>[ep.t,ep.key,[...(ep.from||[])],[...(ep.places||[])]]),
          sorted(P.relationField?.active||[]),
          sorted(P.relationField?.latent?.byId?.keys?.()||[]),
          sorted(P.relationField?.latent?.activeIds||[]),
          ...P.members.flatMap(m=>[m.name,round(m.x),round(m.y),round(m.hp)])
        ])
      ]);
    }
    function compactState(S){
      return S.parties.map(P=>({
        id:P.id,target:P.target,currentPlace:currentPlace(P),leader:P.leader,last:P.last,
        relationHistoryLength:P.relationHistory.length,experiencePlaces:sorted(P.disc),
        relationEpisodes:P.relationField?.episodes?.length||0,
        latentEpisodes:P.relationField?.latent?.byId?.size||0,
        activeKeys:[...(P.relationField?.active||[])],
        choices:P.choiceHistory.length
      }));
    }
    function indexControlAudit(S){
      const compose=new Map(),byEpisode=new Map();
      for(const e of audits(S)){
        if(e.type==='compose')compose.set(`${e.party}|${e.tick}|${e.key}`,e);
        if(e.episodeId){
          const k=`${e.party}|${e.episodeId}`;
          if(!byEpisode.has(k))byEpisode.set(k,[]);
          byEpisode.get(k).push(e);
        }
        if(Array.isArray(e.latentEpisodeIds))for(const id of e.latentEpisodeIds){
          const k=`${e.party}|${id}`;
          if(!byEpisode.has(k))byEpisode.set(k,[]);
          byEpisode.get(k).push(e);
        }
      }
      return {compose,byEpisode};
    }
    function lineage(control,blocked){
      const idx=indexControlAudit(control),rows=[];
      for(const b of blocked){
        const c=idx.compose.get(`${b.party}|${b.tick}|${b.key}`);
        if(!c){rows.push({party:b.party,blockTick:b.tick,key:b.key,controlCompose:false});continue}
        const ev=idx.byEpisode.get(`${b.party}|${c.episodeId}`)||[];
        const after=type=>ev.filter(x=>x.tick>b.tick&&x.type===type).sort((a,z)=>a.tick-z.tick)[0]||null;
        const noncurrent=[...ev].filter(x=>x.tick>=b.tick&&(x.type==='latentize'||x.type==='noncurrent')).sort((a,z)=>a.tick-z.tick)[0]||null;
        const react=after('reactivate');
        const part=ev.filter(x=>x.tick>b.tick&&x.type==='select-participation'&&(x.latentEpisodeIds||[]).includes(c.episodeId)).sort((a,z)=>a.tick-z.tick)[0]||null;
        const out=ev.filter(x=>x.tick>b.tick&&x.type==='outcome'&&(x.latentEpisodeIds||[]).includes(c.episodeId)).sort((a,z)=>a.tick-z.tick)[0]||null;
        const ordered=!!(react&&part&&out&&react.tick<=part.tick&&part.tick<=out.tick);
        rows.push({party:b.party,blockTick:b.tick,key:b.key,controlCompose:true,episodeId:c.episodeId,noncurrentTick:noncurrent?.tick??null,reactivationTick:react?.tick??null,participationTick:part?.tick??null,laterOutcomeTick:out?.tick??null,exactOrderedChain:ordered});
      }
      return rows;
    }

    const variantResults=[];
    for(const v of VARIANTS){
      const control=mkW('full'),twin=mkW('full'),blocked=mkW('full');
      control.__OASIS_INCORPORATION_LINK_BLOCK=false;
      twin.__OASIS_INCORPORATION_LINK_BLOCK=false;
      blocked.__OASIS_INCORPORATION_LINK_BLOCK=true;
      E={tick:0,worlds:{control,twin,blocked},paused:true};

      let twinMismatchTicks=0,preInterventionMismatchTicks=0,interventionStarted=false;
      let firstBlockTick=null,firstInterventionParity=null;
      let firstStructuralDivergence=null,firstDecisionDivergence=null,firstBehavioralDivergence=null,firstChoiceDivergence=null;
      let prevBlockCount=0;

      for(let t=1;t<=HORIZON;t++){
        E.tick=t;
        const ex=env(t+v.offset);
        tickW(control,clone(ex));
        tickW(twin,clone(ex));
        tickW(blocked,clone(ex));

        if(twinSig(control)!==twinSig(twin))twinMismatchTicks++;
        const bCount=interventionEvents(blocked).length;
        const newBlock=bCount>prevBlockCount;
        if(!interventionStarted&&!newBlock){
          if(behaviorSig(control)!==behaviorSig(blocked)||decisionSig(control)!==decisionSig(blocked)||experienceSig(control)!==experienceSig(blocked)||structureSig(control)!==structureSig(blocked))preInterventionMismatchTicks++;
        }
        if(newBlock&&!interventionStarted){
          interventionStarted=true;firstBlockTick=t;
          firstInterventionParity={
            genericExperienceEqual:experienceSig(control)===experienceSig(blocked),
            behaviorEqual:behaviorSig(control)===behaviorSig(blocked),
            relationHistoryByParty:Object.fromEntries(control.parties.map(P=>{const B=partyById(blocked,P.id);return[P.id,P.relationHistory.length===(B?.relationHistory.length??-1)]}))
          };
        }
        prevBlockCount=bCount;

        if(firstStructuralDivergence===null&&structureSig(control)!==structureSig(blocked))firstStructuralDivergence={tick:t,control:compactState(control),blocked:compactState(blocked)};
        if(firstDecisionDivergence===null&&decisionSig(control)!==decisionSig(blocked))firstDecisionDivergence={tick:t,control:compactState(control),blocked:compactState(blocked)};
        if(firstBehavioralDivergence===null&&behaviorSig(control)!==behaviorSig(blocked))firstBehavioralDivergence={tick:t,control:compactState(control),blocked:compactState(blocked)};
        if(firstChoiceDivergence===null){
          for(const P of control.parties){
            const B=partyById(blocked,P.id),a=P.choiceHistory.at(-1),b=B?.choiceHistory?.at(-1);
            if((a?.t??null)===(b?.t??null)&&(a?.t??null)===t&&(a?.target??null)!==(b?.target??null)){
              firstChoiceDivergence={tick:t,party:P.id,controlTarget:a?.target??null,blockedTarget:b?.target??null};break;
            }
          }
        }
      }

      const blockedEvents=interventionEvents(blocked);
      const chains=lineage(control,blockedEvents);
      const exactChains=chains.filter(x=>x.exactOrderedChain);
      const firstControlCounterpart=chains.find(x=>x.controlCompose)||null;
      const choiceEffectAfterExactParticipation=!!(firstChoiceDivergence&&exactChains.some(x=>x.participationTick!=null&&x.participationTick<=firstChoiceDivergence.tick));
      const allFirstRelationParity=firstInterventionParity?Object.values(firstInterventionParity.relationHistoryByParty).every(Boolean):null;

      variantResults.push({
        variant:v,horizon:HORIZON,
        validity:{
          twinMismatchTicks,
          preInterventionMismatchTicks,
          firstInterventionGenericExperienceParity:firstInterventionParity?.genericExperienceEqual??null,
          firstInterventionBehaviorParity:firstInterventionParity?.behaviorEqual??null,
          firstInterventionRelationHistoryParity:allFirstRelationParity,
          firstBlockedEventHasControlComposeCounterpart:!!firstControlCounterpart
        },
        intervention:{firstBlockTick,blockedStructuralInsertions:blockedEvents.length},
        divergence:{firstStructuralDivergence,firstDecisionDivergence,firstBehavioralDivergence,firstChoiceDivergence},
        genealogy:{controlCounterparts:chains.filter(x=>x.controlCompose).length,exactOrderedChains:exactChains.length,choiceEffectAfterExactParticipation,examples:exactChains.slice(0,12)},
        final:{control:compactState(control),blocked:compactState(blocked)}
      });
    }

    const variantsWithIntervention=variantResults.filter(r=>r.intervention.blockedStructuralInsertions>0).length;
    const variantsWithDecisionEffect=variantResults.filter(r=>r.divergence.firstDecisionDivergence||r.divergence.firstChoiceDivergence).length;
    const variantsWithChoiceEffect=variantResults.filter(r=>r.divergence.firstChoiceDivergence).length;
    const variantsWithExactGenealogy=variantResults.filter(r=>r.genealogy.exactOrderedChains>0).length;
    const variantsWithChoiceEffectAfterExactParticipation=variantResults.filter(r=>r.genealogy.choiceEffectAfterExactParticipation).length;
    const valid=variantResults.every(r=>r.validity.twinMismatchTicks===0&&r.validity.preInterventionMismatchTicks===0&&(r.intervention.blockedStructuralInsertions===0||(
      r.validity.firstInterventionGenericExperienceParity===true&&r.validity.firstInterventionRelationHistoryParity===true&&r.validity.firstBlockedEventHasControlComposeCounterpart===true
    )))&&variantsWithIntervention>0;

    let evidenceGrade='INVALID_EXPERIMENT';
    if(valid)evidenceGrade='FLOW_PRESERVED_LOCAL_INTERVENTION_VALID_NO_CHOICE_EFFECT_REQUIRED';
    if(valid&&variantsWithChoiceEffect>0)evidenceGrade='FLOW_PRESERVED_INTERVENTION_WITH_BEHAVIORAL_CHOICE_EFFECT_WITHIN_HARNESS';
    if(valid&&variantsWithChoiceEffectAfterExactParticipation>0)evidenceGrade='FLOW_PRESERVED_INTERVENTION_WITH_EXACT_GENEALOGY_AND_LATER_CHOICE_EFFECT_WITHIN_HARNESS';

    const report={
      experiment:'Gamma 2.2-R v4.3 — Incorporation-Link Local Intervention',
      date:'2026-09-10',
      question:'When a realized relational event is allowed to remain in generic experience and relationHistory, does blocking only its incorporation into newly composed Past Relational Structure alter later OASIS decision flow?',
      correctionFromV42:{
        relationHistoryIsGeneralExperienceLedger:false,
        relationHistoryMeaning:'NPC relational-event trace used by the current implementation',
        genericExperienceMeaning:'Feedback outcomes are recorded through discovery/visit state even when no NPC relational event exists.',
        consequence:'The previous relationHistory inclusion percentage must not be described as the total experience-incorporation rate.'
      },
      intervention:{
        target:'new structural episode insertion inside composeField only',
        preserved:['same OASIS implementation','same generic feedback experience recording','same relationHistory event generation','same current observations','same exogenous stream','same choice and outcome machinery','same latent/non-current/reactivation machinery'],
        changed:['only insertion of a newly composed relationField episode when the current realized relational event would canonically form it'],
        noFutureInformation:true,
        noOutcomeRelabeling:true
      },
      predeclaredStreams:VARIANTS,
      horizonPerStream:HORIZON,
      validity:{valid,variantsWithIntervention,totalTwinMismatchTicks:variantResults.reduce((a,r)=>a+r.validity.twinMismatchTicks,0),totalPreInterventionMismatchTicks:variantResults.reduce((a,r)=>a+r.validity.preInterventionMismatchTicks,0)},
      summary:{variants:variantResults.length,variantsWithDecisionEffect,variantsWithChoiceEffect,variantsWithExactGenealogy,variantsWithChoiceEffectAfterExactParticipation},
      evidenceGrade,
      interpretationBoundary:[
        'A positive choice divergence supports causal contribution of the tested structural-incorporation link within this harness, not universal necessity or sufficiency.',
        'A stream with no divergence is retained as a valid negative result and does not by itself falsify conditional relational contribution.',
        'The intervention does not test whether every realized outcome becomes a relational event; non-NPC outcomes are generic experiences but are not relationHistory events in the current implementation.',
        'No result establishes real-world generalization, superiority over other AI systems, or a scalar causal rate.'
      ],
      variants:variantResults
    };
    E=savedE;
    return report;
  },{HORIZON,VARIANTS});

  await writeFile(REPORT,JSON.stringify(result,null,2));
  console.log('GAMMA-2.2-R-V4.3 '+JSON.stringify({validity:result.validity,summary:result.summary,evidenceGrade:result.evidenceGrade,variants:result.variants.map(r=>({id:r.variant.id,blocks:r.intervention.blockedStructuralInsertions,firstBlock:r.intervention.firstBlockTick,firstDecision:r.divergence.firstDecisionDivergence?.tick??null,firstChoice:r.divergence.firstChoiceDivergence?.tick??null,exactChains:r.genealogy.exactOrderedChains,choiceAfterExact:r.genealogy.choiceEffectAfterExactParticipation}))},null,2));
  if(!result.validity.valid)process.exitCode=1;
  await context.close();
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
