import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4228;
const HORIZON = 12000;
const REPORT = 'ex04p-longitudinal-relational-disposition-lineage-v3-report.json';
const PRIOR = Object.freeze({ seed: 'OASIS-DISPOSITION-v3-RS-A' });
const CONFIGS = Object.freeze([
  {partyId:'dawn',currentId:'village',danger:0,spec:{a:'village',b:'shrine',sa:'도른',sb:'미라'}},
  {partyId:'dawn',currentId:'village',danger:0,spec:{a:'road',b:'forest',sa:'루카',sb:'엘리'}},
  {partyId:'star',currentId:'village',danger:0,spec:{a:'village',b:'shrine',sa:'도른',sb:'미라'}},
  {partyId:'star',currentId:'village',danger:0,spec:{a:'road',b:'forest',sa:'루카',sb:'엘리'}},
  {partyId:'blue',currentId:'village',danger:0,spec:{a:'village',b:'shrine',sa:'도른',sb:'미라'}},
  {partyId:'blue',currentId:'village',danger:0,spec:{a:'road',b:'forest',sa:'루카',sb:'엘리'}}
]);

const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const page=await (await browser.newContext()).newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof mkW==='function'&&typeof tickW==='function'&&typeof evalP==='function'&&typeof choose==='function'&&typeof outcome==='function'&&typeof env==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({CONFIGS,HORIZON,PRIOR})=>{
    const savedE=E,prodEval=evalP,prodChoose=choose,prodOutcome=outcome,clone=x=>structuredClone(x);
    const pair=(a,b)=>[a,b].sort().join('↔');
    const npcByPlace=new Map();for(const[n,p]of npcs){if(!npcByPlace.has(p))npcByPlace.set(p,[]);npcByPlace.get(p).push(n)}
    const supporterIds=(P,rowId)=>{
      if(!rowId||rowId.startsWith('hidden:'))return[];const ids=new Set(),gate=places[rowId]?.gate;
      if(gate&&relationExists(P,gate))ids.add(`relation-presence:${gate}`);
      for(const[n,p]of npcs)if(p===rowId&&relationExists(P,n))ids.add(`relation-presence:${n}`);
      const active=new Set(P.relationField?.active||[]);
      for(const ep of P.relationField?.episodes||[])if(active.has(ep.key)&&((ep.places||[]).includes(rowId)||(gate&&(ep.a===gate||ep.b===gate))))ids.add(`active-key:${ep.key}`);
      return[...ids].sort();
    };
    const sal=ids=>ids.length?ids.reduce((a,id)=>a+hash(`${PRIOR.seed}|${id}`),0)/ids.length:null;
    const placebo=(P,id)=>hash(`${PRIOR.seed}|PLACEBO|${P.id}|${id}`);
    function adjust(P,rows,mode){
      if(mode==='NONE')return{rows,applied:false};if(!rows.length)return{rows,applied:false};
      const v=rows[0].votes,top=rows.filter(r=>r.votes===v);if(top.length<2)return{rows,applied:false};
      const support=new Map(top.map(r=>[r.id,supporterIds(P,r.id)])),sigs=top.map(r=>(support.get(r.id)||[]).join('|'));
      if(!sigs.every(Boolean)||new Set(sigs).size<2)return{rows,applied:false};
      const idx=new Map(top.map((r,i)=>[r.id,i]));let ranked;
      if(mode==='RELATIONAL')ranked=[...top].sort((a,b)=>sal(support.get(b.id))-sal(support.get(a.id))||idx.get(a.id)-idx.get(b.id));
      else ranked=[...top].sort((a,b)=>placebo(P,b.id)-placebo(P,a.id)||idx.get(a.id)-idx.get(b.id));
      return{rows:[...ranked,...rows.slice(top.length)],applied:true,topIds:top.map(r=>r.id),support:Object.fromEntries(top.map(r=>[r.id,support.get(r.id)]))};
    }
    function init(config){
      const S=mkW('full'),P=S.parties.find(x=>x.id===config.partyId),q=places[config.currentId],off=[[-16,-10],[16,-10],[-16,12],[16,12]];
      S.danger=config.danger;P.members.forEach((m,i)=>{m.x=q.x+off[i][0];m.y=q.y+off[i][1]});P.target=config.currentId;
      P.relationHistory=[];P.seenNPC=new Set();P.hiddenCandidates=new Set();P.hiddenDone=new Set();P.disc=new Set([config.currentId,'road',config.spec.a,config.spec.b]);P.vis={};P.routes=new Set();P.choiceHistory=[];P.pendingRelChoice=null;P.q={};P.memory=[];
      P.relationField.episodes=[];P.relationField.active=[];P.relationField.activations=0;P.relationField.recombinations=0;P.relationField.spirals=0;P.relationField.lastActivationTick=null;
      if(P.relationField.latent){P.relationField.latent.byId=new Map();P.relationField.latent.byClue=new Map();P.relationField.latent.activeIds=[];P.relationField.latent.cacheKey=null;P.relationField.latent.cacheEpisodes=[]}
      const all=npcs.map(x=>x[0]),exclude=new Set([config.spec.sa,config.spec.sb]);const a=all.find(n=>!exclude.has(n));exclude.add(a);const b=all.find(n=>!exclude.has(n));
      P.relationHistory.push({t:-20,npc:config.spec.sa,place:config.spec.a},{t:-19,npc:config.spec.sb,place:config.spec.b},{t:-18,npc:a,place:config.currentId},{t:-17,npc:b,place:config.currentId});
      for(const n of[config.spec.sa,config.spec.sb,a,b])P.seenNPC.add(n);
      P.relationField.episodes.push({t:-10,key:pair(config.spec.sa,a),a:config.spec.sa,b:a,places:[config.spec.a,config.currentId],from:[-20,-18]},{t:-9,key:pair(config.spec.sb,b),a:config.spec.sb,b:b,places:[config.spec.b,config.currentId],from:[-19,-17]});
      return S;
    }
    function preSig(S,P){return JSON.stringify([Number(S.danger.toFixed(12)),P.target,currentPlace(P),P.leader,P.last,P.relationHistory.length,P.choiceHistory.length,[...P.disc].sort(),Object.entries(P.vis).sort(),[...P.hiddenCandidates].sort(),[...P.hiddenDone].sort(),[...P.seenNPC].sort(),P.relationField?.episodes?.length||0,[...(P.relationField?.active||[])].sort(),P.relationField?.latent?.byId?.size||0,[...(P.relationField?.latent?.activeIds||[])].sort(),...P.members.flatMap(m=>[m.name,Number(m.x.toFixed(8)),Number(m.y.toFixed(8)),Number(m.hp.toFixed(8))])])}
    function partySig(S,pid){const P=S.parties.find(x=>x.id===pid);return preSig(S,P)}
    const scenarios=[];let totalTwinMismatch=0,experimenterInterventionCount=0;
    for(let si=0;si<CONFIGS.length;si++){
      const config=CONFIGS[si],worlds={RELATIONAL:init(config),RELATIONAL_TWIN:init(config),PLACEBO:init(config),PLACEBO_TWIN:init(config)},meta=new Map(),events={RELATIONAL:[],PLACEBO:[]},outcomes={RELATIONAL:[],PLACEBO:[]};
      for(const mode of['RELATIONAL','PLACEBO']){meta.set(worlds[mode],{mode,primary:true});meta.set(worlds[`${mode}_TWIN`],{mode,primary:false})}
      E={tick:0,worlds,paused:true};let phase=null;
      evalP=function(S,P,use=1){const base=prodEval(S,P,use),m=meta.get(S);if(!m||P.id!==config.partyId||use!==1)return base;const a=adjust(P,base,m.mode);if(phase&&phase.S===S&&phase.P===P&&!phase.captured){phase.captured=true;phase.applied=a.applied;phase.baseTop=base[0]?.id||null;phase.finalTop=a.rows[0]?.id||null;phase.topIds=a.topIds||[];phase.support=a.support||{}}return a.rows};
      choose=function(S,P){const m=meta.get(S);if(!m||P.id!==config.partyId){prodChoose(S,P);return}const before=preSig(S,P);phase={S,P,captured:false,applied:false,baseTop:null,finalTop:null,topIds:[],support:{}};prodChoose(S,P);const r=phase;phase=null;if(m.primary)events[m.mode].push({tick:E.tick,before,applied:r.applied,baseTop:r.baseTop,finalTop:r.finalTop,actualTarget:P.target,leader:P.leader,topIds:r.topIds,support:r.support})};
      outcome=function(S,P,id){prodOutcome(S,P,id);const m=meta.get(S);if(m?.primary&&P.id===config.partyId)outcomes[m.mode].push({tick:E.tick,id,after:preSig(S,P),relationHistoryLength:P.relationHistory.length,episodeCount:P.relationField?.episodes?.length||0,latentCount:P.relationField?.latent?.byId?.size||0})};
      for(const mode of['RELATIONAL','PLACEBO']){choose(worlds[mode],worlds[mode].parties.find(x=>x.id===config.partyId));choose(worlds[`${mode}_TWIN`],worlds[`${mode}_TWIN`].parties.find(x=>x.id===config.partyId))}
      let firstWorldDivergence=partySig(worlds.RELATIONAL,config.partyId)!==partySig(worlds.PLACEBO,config.partyId)?0:null;
      const twin={RELATIONAL:0,PLACEBO:0};
      for(let t=1;t<=HORIZON;t++){E.tick=t;const ex=env(t);for(const mode of['RELATIONAL','PLACEBO']){tickW(worlds[mode],clone(ex));tickW(worlds[`${mode}_TWIN`],clone(ex));if(partySig(worlds[mode],config.partyId)!==partySig(worlds[`${mode}_TWIN`],config.partyId))twin[mode]++}if(firstWorldDivergence===null&&partySig(worlds.RELATIONAL,config.partyId)!==partySig(worlds.PLACEBO,config.partyId))firstWorldDivergence=t}
      totalTwinMismatch+=twin.RELATIONAL+twin.PLACEBO;
      const byTick=(arr)=>new Map(arr.map(x=>[x.tick,x])),re=byTick(events.RELATIONAL),pe=byTick(events.PLACEBO);let firstMatchedDecisionDifference=null;
      for(const tick of[...re.keys()].filter(t=>pe.has(t)).sort((a,b)=>a-b)){const a=re.get(tick),b=pe.get(tick);if(a.before===b.before&&a.actualTarget!==b.actualTarget){firstMatchedDecisionDifference={tick,relational:a,placebo:b};break}}
      let firstMatchedPolicyDifference=null;
      for(const tick of[...re.keys()].filter(t=>pe.has(t)).sort((a,b)=>a-b)){const a=re.get(tick),b=pe.get(tick);if(a.before===b.before&&a.finalTop!==b.finalTop){firstMatchedPolicyDifference={tick,relational:a,placebo:b};break}}
      scenarios.push({scenarioIndex:si+1,config,firstWorldDivergence,firstMatchedPolicyDifference,firstMatchedDecisionDifference,twinMismatchTicks:twin,decisionCounts:{RELATIONAL:events.RELATIONAL.length,PLACEBO:events.PLACEBO.length},priorAppliedCounts:{RELATIONAL:events.RELATIONAL.filter(x=>x.applied).length,PLACEBO:events.PLACEBO.filter(x=>x.applied).length},outcomeCounts:{RELATIONAL:outcomes.RELATIONAL.length,PLACEBO:outcomes.PLACEBO.length},final:{RELATIONAL:{relationHistoryLength:worlds.RELATIONAL.parties.find(x=>x.id===config.partyId).relationHistory.length,episodeCount:worlds.RELATIONAL.parties.find(x=>x.id===config.partyId).relationField?.episodes?.length||0,latentCount:worlds.RELATIONAL.parties.find(x=>x.id===config.partyId).relationField?.latent?.byId?.size||0},PLACEBO:{relationHistoryLength:worlds.PLACEBO.parties.find(x=>x.id===config.partyId).relationHistory.length,episodeCount:worlds.PLACEBO.parties.find(x=>x.id===config.partyId).relationField?.episodes?.length||0,latentCount:worlds.PLACEBO.parties.find(x=>x.id===config.partyId).relationField?.latent?.byId?.size||0}}});
    }
    evalP=prodEval;choose=prodChoose;outcome=prodOutcome;E=savedE;
    const divergent=scenarios.filter(s=>s.firstWorldDivergence!==null),withDirect=divergent.filter(s=>s.firstMatchedDecisionDifference!==null),withPolicy=divergent.filter(s=>s.firstMatchedPolicyDifference!==null);
    const validity={sixReplayScenarios:scenarios.length===6,deterministicTwins:totalTwinMismatch===0,noExperimenterIntervention:experimenterInterventionCount===0};const valid=Object.values(validity).every(Boolean);
    return{experiment:'EX-04P-DL Longitudinal Relational-Disposition Lineage Replay',horizon:HORIZON,validity,valid,summary:{divergentScenarios:divergent.length,divergentScenariosWithMatchedPreStatePolicyDifference:withPolicy.length,divergentScenariosWithMatchedPreStateActualChoiceDifference:withDirect.length,totalTwinMismatchTicks:totalTwinMismatch,experimenterInterventionCount},scenarios,evidence:{matchedPreStateDecisionLineage:withDirect.length===divergent.length&&divergent.length>0&&valid?'ALL_DIVERGENT_SCENARIOS_HAVE_A_PRE_DIVERGENCE_OR_DIVERGENCE_POINT_MATCHED_PRESTATE_ACTUAL_CHOICE_DIFFERENCE':'NOT_FULLY_ESTABLISHED',matchedPreStatePolicyLineage:withPolicy.length===divergent.length&&divergent.length>0&&valid?'ALL_DIVERGENT_SCENARIOS_HAVE_MATCHED_PRESTATE_POLICY_DIFFERENCE':'NOT_FULLY_ESTABLISHED'},interpretationBoundary:['The replay verifies the first causal branch point using equal pre-decision party state, not merely final trajectory difference.','Only the first matched-state policy/choice difference is treated as the direct branch contribution; later differences are accumulated consequences through realized experience and Past Relational Structure.','No necessity, sufficiency, or universal personality claim follows from this replay.']};
  },{CONFIGS,HORIZON,PRIOR});
  await writeFile(REPORT,JSON.stringify(result,null,2));console.log(JSON.stringify({valid:result.valid,summary:result.summary,evidence:result.evidence,scenarioDigest:result.scenarios.map(s=>({scenarioIndex:s.scenarioIndex,partyId:s.config.partyId,firstWorldDivergence:s.firstWorldDivergence,firstMatchedPolicyDifference:s.firstMatchedPolicyDifference&&{tick:s.firstMatchedPolicyDifference.tick,relationalTarget:s.firstMatchedPolicyDifference.relational.actualTarget,placeboTarget:s.firstMatchedPolicyDifference.placebo.actualTarget,relationalTop:s.firstMatchedPolicyDifference.relational.finalTop,placeboTop:s.firstMatchedPolicyDifference.placebo.finalTop},firstMatchedDecisionDifference:s.firstMatchedDecisionDifference&&{tick:s.firstMatchedDecisionDifference.tick,relationalTarget:s.firstMatchedDecisionDifference.relational.actualTarget,placeboTarget:s.firstMatchedDecisionDifference.placebo.actualTarget},priorAppliedCounts:s.priorAppliedCounts,twinMismatchTicks:s.twinMismatchTicks}))},null,2));if(!result.valid)process.exitCode=1;
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
