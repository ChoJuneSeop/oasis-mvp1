import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const PORT=4192, MAX_TICK=30000, CHUNK=1000;
const REPORT_FILE='latent-relation-shadow-gate-comparison-report.json';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;

try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.addInitScript(()=>{globalThis.OASIS_LATENT_RELATION_STORE=true;});
  await page.route('**/relation-field.js',async route=>{
    const response=await route.fetch();
    let src=await response.text();
    const head="function latentActive(S,P){\n  if(!latentEnabled())return [];";
    const replacement="function latentActive(S,P){\n  if(globalThis.__OASIS_SHADOW_OVERRIDE&&globalThis.__OASIS_SHADOW_OVERRIDE.party===P.id){const L=ensureLatent(P),ids=globalThis.__OASIS_SHADOW_OVERRIDE.ids||[];return ids.map(id=>L.byId.get(id)).filter(Boolean);}\n  if(!latentEnabled())return [];";
    if(!src.includes(head))throw new Error('latentActive shadow insertion target missing');
    src=src.replace(head,replacement);
    const tail='reset();\n})();';
    const exposed=`globalThis.__OASIS_SHADOW_INTERNALS={
      ensureLatent,
      candidates:(S,P)=>latentCandidates(S,P).map(([id,ep])=>({id,ep,reasons:relevantReasons(S,P,ep)})).filter(x=>x.reasons.length),
      recentRelations,
      currentPlace
    };

reset();
})();`;
    if(!src.includes(tail))throw new Error('shadow internals insertion target missing');
    src=src.replace(tail,exposed);
    await route.fulfill({response,body:src,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof evalP==='function'&&globalThis.__OASIS_SHADOW_INTERNALS&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  await page.evaluate(()=>{
    const savedE=E;E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full,originalChoose=choose,I=globalThis.__OASIS_SHADOW_INTERNALS;
    const names=['broad','rawBridge','completedProcess','exactProvenance'];
    const mkStats=()=>({evaluations:0,activeEpisodeSum:0,maxActive:0,entries:0,exits:0,decisionDiffs:0,choiceDiffs:0,leaderDiffs:0,candidateDiffs:0,firstDiff:null,lastDiff:null});
    const gateState={};for(const n of names)gateState[n]={byParty:new Map(),stats:mkStats()};
    const T=globalThis.__OASIS_SHADOW={savedE,S,originalChoose,gateState,checkpoints:[]};
    const copy=x=>JSON.parse(JSON.stringify(x));
    const stateFor=(name,P)=>{const G=gateState[name];if(!G.byParty.has(P.id))G.byParty.set(P.id,{active:new Set(),lastExit:new Map()});return G.byParty.get(P.id)};
    const direct=(P,ep)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return ep.places.includes(here)||ep.places.includes(target)||(gate&&(ep.a===gate||ep.b===gate))};
    const currentEpisode=(P,q)=>{const here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;return q.places.includes(here)||q.places.includes(target)||(gate&&(q.a===gate||q.b===gate))};
    function gateIds(name,P,retrieved){
      const st=stateFor(name,P),prev=new Set(st.active),now=new Set(),here=I.currentPlace(P),target=P.target,gate=places[target]?.gate;
      if(name==='broad'){for(const x of retrieved)now.add(x.id)}
      else for(const x of retrieved){
        const {id,ep}=x,d=direct(P,ep);let admitted=false;
        if(prev.has(id))admitted=d;
        else if(d){const since=st.lastExit.get(id)??ep.t;
          if(name==='rawBridge'){
            for(let i=P.relationHistory.length-1;i>=0;i--){const r=P.relationHistory[i];if((r.t??-1)<=since)break;if(r.npc===ep.a||r.npc===ep.b||ep.places.includes(r.place)||(gate&&r.npc===gate)){admitted=true;break}}
          }else if(name==='completedProcess'){
            const oldEnds=new Set([ep.a,ep.b]),qs=P.relationField?.episodes||[];
            for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;const shared=oldEnds.has(q.a)||oldEnds.has(q.b);if(shared&&currentEpisode(P,q)){admitted=true;break}}
          }else if(name==='exactProvenance'){
            const oldEnds=new Set([ep.a,ep.b]),historyByT=new Map(P.relationHistory.map(r=>[r.t,r])),qs=P.relationField?.episodes||[];
            for(let i=qs.length-1;i>=0;i--){const q=qs[i];if((q.t??-1)<=since)break;if(!oldEnds.has(q.a)||oldEnds.has(q.b))continue;const sourceT=q.from?.[1];if(!(sourceT>since))continue;const r=historyByT.get(sourceT);if(!r||r.npc!==q.b)continue;if(r.place===here||r.place===target||(gate&&r.npc===gate)){admitted=true;break}}
          }
        }
        if(admitted)now.add(id);
      }
      const stats=gateState[name].stats;
      for(const id of now)if(!prev.has(id))stats.entries++;
      for(const id of prev)if(!now.has(id)){stats.exits++;st.lastExit.set(id,E.tick)}
      st.active=now;stats.evaluations++;stats.activeEpisodeSum+=now.size;stats.maxActive=Math.max(stats.maxActive,now.size);
      return [...now];
    }
    function evalIds(P,ids){
      const F=P.relationField,L=F?.latent;
      if(!L)return copy(sig(evalP(S,P,1)));
      const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],seq:L.seq,auditLen:L.audit.length,cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],sAct:S.c.relationFieldActivation,target:P.target};
      globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=true;globalThis.__OASIS_SHADOW_OVERRIDE={party:P.id,ids};let out;
      try{out=copy(sig(evalP(S,P,1)))}finally{delete globalThis.__OASIS_SHADOW_OVERRIDE;globalThis.__OASIS_LATENT_DIAGNOSTIC_SILENT=false;F.active=[...saved.active];F.activations=saved.activations;F.lastActivationTick=saved.last;L.activeIds=[...saved.latentActive];L.cacheKey=saved.cacheKey;L.cacheEpisodes=[...saved.cacheEpisodes];L.seq=saved.seq;L.audit.splice(saved.auditLen);S.c.relationFieldActivation=saved.sAct;P.target=saved.target}
      return out;
    }
    function shadow(P){
      const L=P.relationField?.latent;if(!L||!L.byId?.size)return;
      const retrieved=I.candidates(S,P),noLat=evalIds(P,[]);
      for(const name of names){const ids=gateIds(name,P,retrieved),out=evalIds(P,ids),st=gateState[name].stats;if(changedSig(out,noLat)){st.decisionDiffs++;if(out.choice!==noLat.choice)st.choiceDiffs++;if(out.leader!==noLat.leader)st.leaderDiffs++;if(out.cands!==noLat.cands)st.candidateDiffs++;const rec={tick:E.tick,party:P.id,currentPlace:I.currentPlace(P),target:P.target,danger:S.danger,activeCount:ids.length,out,noLat};if(!st.firstDiff)st.firstDiff=rec;st.lastDiff=rec}}
    }
    choose=function(S0,P){if(S0===S&&MODELS[S0.key].kind==='oasis')shadow(P);originalChoose(S0,P)};
  });

  const started=Date.now();
  for(let start=1;start<=MAX_TICK;start+=CHUNK){
    const end=Math.min(MAX_TICK,start+CHUNK-1);
    const progress=await page.evaluate(({start,end})=>{const T=globalThis.__OASIS_SHADOW,S=T.S;for(let t=start;t<=end;t++){E.tick=t;tickW(S,env(t));if(t===10000||t===20000||t===30000)T.checkpoints.push({tick:t,stats:Object.fromEntries(Object.entries(T.gateState).map(([n,g])=>[n,{...g.stats,byParty:undefined}]))})}return{tick:E.tick,stats:Object.fromEntries(Object.entries(T.gateState).map(([n,g])=>[n,{entries:g.stats.entries,decisionDiffs:g.stats.decisionDiffs,choiceDiffs:g.stats.choiceDiffs}]))};},{start,end});
    if(end%10000===0)console.log(`PROGRESS tick=${end} ${JSON.stringify(progress.stats)}`);
  }
  const final=await page.evaluate(()=>{const T=globalThis.__OASIS_SHADOW,S=T.S;choose=T.originalChoose;const gates={};for(const [name,g] of Object.entries(T.gateState)){const s={...g.stats};s.meanActive=s.evaluations?s.activeEpisodeSum/s.evaluations:0;s.decisionYield=s.entries?s.decisionDiffs/s.entries:0;s.choiceYield=s.entries?s.choiceDiffs/s.entries:0;s.parties=Object.fromEntries([...g.byParty.entries()].map(([id,x])=>[id,{currentActive:x.active.size,lastExitCount:x.lastExit.size}]));gates[name]=s}const completedTick=E.tick,checkpoints=T.checkpoints;E=T.savedE;delete globalThis.__OASIS_SHADOW;delete globalThis.__OASIS_SHADOW_INTERNALS;return{completedTick,gates,checkpoints,world:{actions:S.c.actions,relationEvents:S.c.rel,recombinations:S.c.relationRecombination,fieldSpirals:S.c.relationFieldSpiral}}});
  const elapsedMs=Date.now()-started;
  const report={design:{purpose:'same-current-flow non-interventional comparison of latent reactivation admission gates',actualRealityPolicy:'production broad latent OASIS only',shadowGates:['broad','rawBridge','completedProcess','exactProvenance'],shadowChangesReality:false,maxTick:MAX_TICK,scope:'reactivation selectivity at decision time only; downstream field-spiral causality excluded'},...final,elapsedMs};
  if(final.completedTick!==MAX_TICK)throw new Error('incomplete shadow run');
  for(const [name,s] of Object.entries(final.gates)){if(s.evaluations<=0)throw new Error(`no evaluations ${name}`);if(s.entries<=0)throw new Error(`no entries ${name}`)}
  console.log('RESULT '+JSON.stringify({completedTick:final.completedTick,gates:Object.fromEntries(Object.entries(final.gates).map(([n,s])=>[n,{entries:s.entries,exits:s.exits,meanActive:s.meanActive,maxActive:s.maxActive,decisionDiffs:s.decisionDiffs,choiceDiffs:s.choiceDiffs,leaderDiffs:s.leaderDiffs,candidateDiffs:s.candidateDiffs,decisionYield:s.decisionYield,choiceYield:s.choiceYield}])) ,world:final.world,elapsedMs}));
  await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
  await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
