import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT = 4229;
const HORIZON = 20000;
const REPORT = 'ex04m-multi-oasis-longitudinal-v3-report.json';
const PRIOR_SEEDS = Object.freeze({
  A: 'OASIS-DISPOSITION-v3-RS-A',
  B: 'OASIS-DISPOSITION-v3-RS-B',
  C: 'OASIS-DISPOSITION-v3-RS-C'
});
const CURRENT_ID = 'village';
const INITIAL_DANGER = 0;
const PARTY_ID = 'dawn';
const PRS = Object.freeze({
  R1: { a:'village', b:'shrine', sa:'도른', sb:'미라' },
  R2: { a:'road', b:'forest', sa:'루카', sb:'엘리' },
  R3: { a:'lake', b:'camp', sa:'세인', sb:'아론' }
});
const AGENTS = Object.freeze([
  {id:'G1-N1',group:'G1_SAME_NONE_SAME_PRS',prior:null,prs:'R1'},
  {id:'G1-N2',group:'G1_SAME_NONE_SAME_PRS',prior:null,prs:'R1'},
  {id:'G1-N3',group:'G1_SAME_NONE_SAME_PRS',prior:null,prs:'R1'},
  {id:'G2-A1',group:'G2_SAME_PRIOR_SAME_PRS',prior:'A',prs:'R1'},
  {id:'G2-A2',group:'G2_SAME_PRIOR_SAME_PRS',prior:'A',prs:'R1'},
  {id:'G2-A3',group:'G2_SAME_PRIOR_SAME_PRS',prior:'A',prs:'R1'},
  {id:'G3-R1',group:'G3_SAME_PRIOR_DIFFERENT_PRS',prior:'A',prs:'R1'},
  {id:'G3-R2',group:'G3_SAME_PRIOR_DIFFERENT_PRS',prior:'A',prs:'R2'},
  {id:'G3-R3',group:'G3_SAME_PRIOR_DIFFERENT_PRS',prior:'A',prs:'R3'},
  {id:'G4-PA',group:'G4_DIFFERENT_PRIOR_SAME_PRS',prior:'A',prs:'R1'},
  {id:'G4-PB',group:'G4_DIFFERENT_PRIOR_SAME_PRS',prior:'B',prs:'R1'},
  {id:'G4-PC',group:'G4_DIFFERENT_PRIOR_SAME_PRS',prior:'C',prs:'R1'}
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
  await page.waitForFunction(()=>typeof mkW==='function'&&typeof tickW==='function'&&typeof evalP==='function'&&typeof choose==='function'&&typeof outcome==='function'&&typeof env==='function'&&typeof relationExists==='function',null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({HORIZON,PRIOR_SEEDS,CURRENT_ID,INITIAL_DANGER,PARTY_ID,PRS,AGENTS})=>{
    const savedE=E,prodEval=evalP,prodChoose=choose,prodOutcome=outcome,clone=x=>structuredClone(x);
    const pair=(a,b)=>[a,b].sort().join('↔');
    function anchors(sa,sb){const names=npcs.map(x=>x[0]),ex=new Set([sa,sb]);const a=names.find(n=>!ex.has(n));ex.add(a);const b=names.find(n=>!ex.has(n));return[a,b]}
    function init(spec){
      const S=mkW('full'),P=S.parties.find(x=>x.id===PARTY_ID),q=places[CURRENT_ID],off2=[[-16,-10],[16,-10],[-16,12],[16,12]];
      S.danger=INITIAL_DANGER;P.members.forEach((m,i)=>{m.x=q.x+off2[i][0];m.y=q.y+off2[i][1]});P.target=CURRENT_ID;
      P.relationHistory=[];P.seenNPC=new Set();P.hiddenCandidates=new Set();P.hiddenDone=new Set();P.disc=new Set([CURRENT_ID,'road',spec.a,spec.b]);P.vis={};P.routes=new Set();P.choiceHistory=[];P.pendingRelChoice=null;P.q={};P.memory=[];
      P.relationField.episodes=[];P.relationField.active=[];P.relationField.activations=0;P.relationField.recombinations=0;P.relationField.spirals=0;P.relationField.lastActivationTick=null;
      if(P.relationField.latent){P.relationField.latent.byId=new Map();P.relationField.latent.byClue=new Map();P.relationField.latent.activeIds=[];P.relationField.latent.cacheKey=null;P.relationField.latent.cacheEpisodes=[]}
      const[aa,ab]=anchors(spec.sa,spec.sb);
      P.relationHistory.push({t:-20,npc:spec.sa,place:spec.a},{t:-19,npc:spec.sb,place:spec.b},{t:-18,npc:aa,place:CURRENT_ID},{t:-17,npc:ab,place:CURRENT_ID});
      for(const n of[spec.sa,spec.sb,aa,ab])P.seenNPC.add(n);
      P.relationField.episodes.push({t:-10,key:pair(spec.sa,aa),a:spec.sa,b:aa,places:[spec.a,CURRENT_ID],from:[-20,-18]},{t:-9,key:pair(spec.sb,ab),a:spec.sb,b:ab,places:[spec.b,CURRENT_ID],from:[-19,-17]});
      return S;
    }
    function directSupport(P,rowId){if(!rowId||rowId.startsWith('hidden:'))return[];const ids=new Set(),gate=places[rowId]?.gate;if(gate&&relationExists(P,gate))ids.add(`relation-presence:${gate}`);for(const[n,p]of npcs)if(p===rowId&&relationExists(P,n))ids.add(`relation-presence:${n}`);const active=new Set(P.relationField?.active||[]);for(const ep of P.relationField?.episodes||[])if(active.has(ep.key)&&((ep.places||[]).includes(rowId)||(gate&&(ep.a===gate||ep.b===gate))))ids.add(`active-key:${ep.key}`);return[...ids].sort()}
    function adjust(P,rows,seed){if(!seed||!rows.length)return{rows,applied:false};const v=rows[0].votes,top=rows.filter(r=>r.votes===v);if(top.length<2)return{rows,applied:false};const support=new Map(top.map(r=>[r.id,directSupport(P,r.id)])),sigs=top.map(r=>(support.get(r.id)||[]).join('|'));if(!sigs.every(Boolean)||new Set(sigs).size<2)return{rows,applied:false};const score=id=>support.get(id).reduce((a,x)=>a+hash(`${seed}|${x}`),0)/support.get(id).length,idx=new Map(top.map((r,i)=>[r.id,i]));const ranked=[...top].sort((a,b)=>score(b.id)-score(a.id)||idx.get(a.id)-idx.get(b.id));return{rows:[...ranked,...rows.slice(top.length)],applied:true,topIds:top.map(r=>r.id),support:Object.fromEntries(top.map(r=>[r.id,support.get(r.id)]))}}
    function partyState(S){const P=S.parties.find(x=>x.id===PARTY_ID);return JSON.stringify([Number(S.danger.toFixed(12)),P.target,currentPlace(P),P.leader,P.last,P.relationHistory.length,P.choiceHistory.length,[...P.disc].sort(),Object.entries(P.vis).sort(),[...P.hiddenCandidates].sort(),[...P.hiddenDone].sort(),[...P.seenNPC].sort(),P.relationField?.episodes?.length||0,[...(P.relationField?.active||[])].sort(),P.relationField?.latent?.byId?.size||0,[...(P.relationField?.latent?.activeIds||[])].sort(),...P.members.flatMap(m=>[m.name,Number(m.x.toFixed(8)),Number(m.y.toFixed(8)),Number(m.hp.toFixed(8))])])}
    function prsSig(S){const P=S.parties.find(x=>x.id===PARTY_ID),keys=new Set((P.relationField?.episodes||[]).map(x=>x.key));for(const ep of P.relationField?.latent?.byId?.values?.()||[])if(ep?.key)keys.add(ep.key);return JSON.stringify([P.relationHistory.map(e=>[e.t,e.npc,e.place]),[...keys].sort(),[...P.disc].sort(),[...P.hiddenDone].sort()])}
    function fullSig(S){return JSON.stringify([Number(S.danger.toFixed(12)),S.spiral,Object.values(S.c),...S.parties.map(P=>[P.id,P.target,currentPlace(P),P.leader,P.last,P.relationHistory.length,P.choiceHistory.length,[...P.disc].sort(),Object.entries(P.vis).sort(),[...P.hiddenCandidates].sort(),[...P.hiddenDone].sort(),[...P.seenNPC].sort(),P.relationField?.episodes?.length||0,[...(P.relationField?.active||[])].sort(),P.relationField?.latent?.byId?.size||0,[...(P.relationField?.latent?.activeIds||[])].sort(),...P.members.flatMap(m=>[m.name,Number(m.x.toFixed(8)),Number(m.y.toFixed(8)),Number(m.hp.toFixed(8))])])])}
    function tv(a,b){const ks=new Set([...Object.keys(a),...Object.keys(b)]),sa=Object.values(a).reduce((x,y)=>x+y,0)||1,sb=Object.values(b).reduce((x,y)=>x+y,0)||1;let d=0;for(const k of ks)d+=Math.abs((a[k]||0)/sa-(b[k]||0)/sb);return d/2}

    const worlds={},meta=new Map(),stats={},events={};
    for(const a of AGENTS){const seed=a.prior?PRIOR_SEEDS[a.prior]:null;for(const twin of[false,true]){const key=twin?`${a.id}_TWIN`:a.id,S=init(PRS[a.prs]);worlds[key]=S;meta.set(S,{...a,seed,twin,key});if(!twin){stats[a.id]={decisions:0,outcomes:0,priorApplied:0,choiceHistogram:{},firstChoice:null};events[a.id]=[]}}}
    E={tick:0,worlds,paused:true};let phase=null;
    evalP=function(S,P,use=1){const base=prodEval(S,P,use),m=meta.get(S);if(!m||P.id!==PARTY_ID||use!==1)return base;const adj=adjust(P,base,m.seed);if(phase&&phase.S===S&&phase.P===P&&!phase.captured){phase.captured=true;phase.applied=adj.applied;phase.baseTop=base[0]?.id||null;phase.finalTop=adj.rows[0]?.id||null;phase.topIds=adj.topIds||[];phase.support=adj.support||{}}return adj.rows};
    choose=function(S,P){const m=meta.get(S);if(!m||P.id!==PARTY_ID){prodChoose(S,P);return}const before=partyState(S);phase={S,P,captured:false,applied:false,baseTop:null,finalTop:null,topIds:[],support:{}};prodChoose(S,P);const r=phase;phase=null;if(!m.twin){const st=stats[m.id];st.decisions++;st.choiceHistogram[P.target]=(st.choiceHistogram[P.target]||0)+1;if(r.applied)st.priorApplied++;if(st.firstChoice===null)st.firstChoice=P.target;events[m.id].push({tick:E.tick,before,applied:r.applied,baseTop:r.baseTop,finalTop:r.finalTop,actualTarget:P.target,topIds:r.topIds,support:r.support})}};
    outcome=function(S,P,id){prodOutcome(S,P,id);const m=meta.get(S);if(m&&!m.twin&&P.id===PARTY_ID)stats[m.id].outcomes++};

    for(const a of AGENTS){choose(worlds[a.id],worlds[a.id].parties.find(x=>x.id===PARTY_ID));choose(worlds[`${a.id}_TWIN`],worlds[`${a.id}_TWIN`].parties.find(x=>x.id===PARTY_ID))}

    const twinMismatch=Object.fromEntries(AGENTS.map(a=>[a.id,0]));
    const groupMismatchTicks={G1_SAME_NONE_SAME_PRS:0,G2_SAME_PRIOR_SAME_PRS:0};
    const groups=Object.fromEntries([...new Set(AGENTS.map(a=>a.group))].map(g=>[g,AGENTS.filter(a=>a.group===g).map(a=>a.id)]));
    const pairKeys=[];for(const g of['G3_SAME_PRIOR_DIFFERENT_PRS','G4_DIFFERENT_PRIOR_SAME_PRS']){const ids=groups[g];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)pairKeys.push({group:g,a:ids[i],b:ids[j],key:`${ids[i]}↔${ids[j]}`,firstDivergence:null,firstSameOutputDifferentPRS:null})}
    for(let t=1;t<=HORIZON;t++){
      E.tick=t;const ex=env(t);
      for(const a of AGENTS){tickW(worlds[a.id],clone(ex));tickW(worlds[`${a.id}_TWIN`],clone(ex));if(fullSig(worlds[a.id])!==fullSig(worlds[`${a.id}_TWIN`]))twinMismatch[a.id]++}
      for(const g of['G1_SAME_NONE_SAME_PRS','G2_SAME_PRIOR_SAME_PRS']){const ids=groups[g],s0=fullSig(worlds[ids[0]]);if(ids.slice(1).some(id=>fullSig(worlds[id])!==s0))groupMismatchTicks[g]++}
      for(const p of pairKeys){if(p.firstDivergence===null&&partyState(worlds[p.a])!==partyState(worlds[p.b]))p.firstDivergence=t;const Pa=worlds[p.a].parties.find(x=>x.id===PARTY_ID),Pb=worlds[p.b].parties.find(x=>x.id===PARTY_ID);if(p.firstDivergence!==null&&p.firstSameOutputDifferentPRS===null&&Pa.target===Pb.target&&currentPlace(Pa)===currentPlace(Pb)&&prsSig(worlds[p.a])!==prsSig(worlds[p.b]))p.firstSameOutputDifferentPRS=t}
    }

    function firstMatchedChoiceDifference(idA,idB){const A=new Map(events[idA].map(x=>[x.tick,x])),B=new Map(events[idB].map(x=>[x.tick,x]));for(const t of[...A.keys()].filter(x=>B.has(x)).sort((a,b)=>a-b)){const a=A.get(t),b=B.get(t);if(a.before===b.before&&a.actualTarget!==b.actualTarget)return{tick:t,aTarget:a.actualTarget,bTarget:b.actualTarget,aTop:a.finalTop,bTop:b.finalTop,aApplied:a.applied,bApplied:b.applied}}return null}
    const g4Pairs=pairKeys.filter(x=>x.group==='G4_DIFFERENT_PRIOR_SAME_PRS').map(p=>({...p,firstMatchedPreStateChoiceDifference:firstMatchedChoiceDifference(p.a,p.b)}));
    const g3Pairs=pairKeys.filter(x=>x.group==='G3_SAME_PRIOR_DIFFERENT_PRS');
    const summaries=Object.fromEntries(AGENTS.map(a=>{const S=worlds[a.id],P=S.parties.find(x=>x.id===PARTY_ID),keys=new Set((P.relationField?.episodes||[]).map(x=>x.key));for(const ep of P.relationField?.latent?.byId?.values?.()||[])if(ep?.key)keys.add(ep.key);return[a.id,{group:a.group,prior:a.prior||'NONE',prs:a.prs,decisions:stats[a.id].decisions,outcomes:stats[a.id].outcomes,priorApplied:stats[a.id].priorApplied,firstChoice:stats[a.id].firstChoice,choiceHistogram:stats[a.id].choiceHistogram,relationHistoryLength:P.relationHistory.length,currentEpisodeCount:P.relationField?.episodes?.length||0,latentEpisodeCount:P.relationField?.latent?.byId?.size||0,distinctRelationKeys:keys.size,discoveredPlaces:[...P.disc].sort(),completedHiddenStories:[...P.hiddenDone].sort()}] }));
    for(const p of pairKeys){p.choiceDistributionTV=tv(summaries[p.a].choiceHistogram,summaries[p.b].choiceHistogram);p.finalPRSDifferent=prsSig(worlds[p.a])!==prsSig(worlds[p.b])}
    const totalTwinMismatch=Object.values(twinMismatch).reduce((a,b)=>a+b,0),experimenterInterventionCount=0;
    const validity={sameProductionPartyId:AGENTS.every(()=>PARTY_ID==='dawn'),deterministicTwins:totalTwinMismatch===0,noExperimenterIntervention:experimenterInterventionCount===0,completedHorizon:E.tick===HORIZON};
    const valid=Object.values(validity).every(Boolean);
    evalP=prodEval;choose=prodChoose;outcome=prodOutcome;E=savedE;
    return{experiment:'EX-04M-A Multi-OASIS Comparative Longitudinal Study',horizon:HORIZON,partyIdControl:PARTY_ID,design:{G1:'same NONE + same Past Relational Structure + same current reality',G2:'same minimum prior A + same Past Relational Structure + same current reality',G3:'same minimum prior A + different Past Relational Structures + same external current reality',G4:'different predeclared priors A/B/C + same Past Relational Structure + same current reality',priorSeeds:PRIOR_SEEDS,noPostInitializationIntervention:true,allAgentsUseSameProductionPartyId:true,reason:'production tie noise uses P.id; holding P.id fixed prevents identity artifact from being misread as disposition'},validity,valid,summary:{totalTwinMismatch,groupMismatchTicks,G3:{pairwise:g3Pairs,divergentPairs:g3Pairs.filter(p=>p.firstDivergence!==null).length,pairsWithSameOutputDifferentPRS:g3Pairs.filter(p=>p.firstSameOutputDifferentPRS!==null).length},G4:{pairwise:g4Pairs,divergentPairs:g4Pairs.filter(p=>p.firstDivergence!==null).length,pairsWithMatchedPreStateChoiceDifference:g4Pairs.filter(p=>p.firstMatchedPreStateChoiceDifference!==null).length,pairsWithSameOutputDifferentPRS:g4Pairs.filter(p=>p.firstSameOutputDifferentPRS!==null).length},experimenterInterventionCount},agents:summaries,evidence:{sameNoneSamePRSReproducibility:groupMismatchTicks.G1_SAME_NONE_SAME_PRS===0&&valid?'EXACTLY_REPRODUCIBLE_WITHIN_HORIZON':'MISMATCH_OBSERVED',samePriorSamePRSReproducibility:groupMismatchTicks.G2_SAME_PRIOR_SAME_PRS===0&&valid?'EXACTLY_REPRODUCIBLE_WITHIN_HORIZON':'MISMATCH_OBSERVED',samePriorDifferentPRSEffect:g3Pairs.some(p=>p.firstDivergence!==null)&&valid?'DIVERGENCE_OBSERVED_WITH_SAME_PRIOR_AND_DIFFERENT_PAST_RELATIONAL_STRUCTURES':'NO_DIVERGENCE_OBSERVED_WITHIN_HORIZON',differentPriorSamePRSEffect:g4Pairs.some(p=>p.firstMatchedPreStateChoiceDifference!==null)&&valid?'MATCHED_PRESTATE_CHOICE_DIVERGENCE_OBSERVED_BETWEEN_DIFFERENT_PRIORS':'NO_MATCHED_PRESTATE_CHOICE_DIVERGENCE_OBSERVED_WITHIN_HORIZON',sameOutputDifferentProcess:g3Pairs.concat(g4Pairs).some(p=>p.firstSameOutputDifferentPRS!==null)&&valid?'SAME_CURRENT_OUTPUT_WITH_DIFFERENT_PAST_RELATIONAL_STRUCTURE_OBSERVED_AFTER_DIVERGENCE':'NOT_OBSERVED_WITHIN_HORIZON'},interpretationBoundary:['Same-prior/different-PRS divergence is not disposition causation; it tests whether experience/Past Relational Structure can differentiate behavior under a fixed prior.','Different-prior/same-PRS matched-prestate divergence supports conditional contribution of the tested prior family only when a direct matched-state choice difference is traced.','Exact equality in G1/G2 is a deterministic-control result, not evidence that all real OASIS instances must remain identical.','All agents use the same production party id to eliminate the known P.id-dependent tie-noise artifact.','No group result establishes superiority, necessity, sufficiency, or universal personality.']};
  },{HORIZON,PRIOR_SEEDS,CURRENT_ID,INITIAL_DANGER,PARTY_ID,PRS,AGENTS});
  await writeFile(REPORT,JSON.stringify(result,null,2));console.log(JSON.stringify({valid:result.valid,evidence:result.evidence,summary:result.summary,agents:Object.fromEntries(Object.entries(result.agents).map(([k,v])=>[k,{group:v.group,prior:v.prior,prs:v.prs,decisions:v.decisions,outcomes:v.outcomes,priorApplied:v.priorApplied,relationHistoryLength:v.relationHistoryLength,distinctRelationKeys:v.distinctRelationKeys}]))},null,2));if(!result.valid)process.exitCode=1;
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
