import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4188','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,candidate){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(c=>document.title.includes('Laboratory')&&(!c||!!window.OASISRelationAuthority),candidate,{timeout:60000});
    const out=await page.evaluate(({candidate})=>{
      reset();E.paused=true;
      const prevAuth=new Map(),prevKnown=new Map();let dormantSamples=0,authorizedSamples=0,turnovers=0,knowledgeRetainedTurnovers=0;
      for(let i=0;i<1800;i++){
        E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e);
        if(candidate){
          const S=E.worlds.full;
          for(const P of S.parties){
            const known=OASISRelationAuthority.knownOasis(S,P,1).filter(id=>!places[id].pub);
            const auth=availableOasis(S,P,1).filter(id=>!places[id].pub);
            if(known.some(id=>!auth.includes(id)))dormantSamples++;
            if(auth.length)authorizedSamples++;
            for(const id of Object.keys(places).filter(x=>!places[x].pub)){
              const k=`${P.id}|${id}`,kn=known.includes(id),au=auth.includes(id),pk=prevKnown.get(k),pa=prevAuth.get(k);
              if(pa!==undefined&&pa!==au){turnovers++;if(pk&&kn)knowledgeRetainedTurnovers++}
              prevKnown.set(k,kn);prevAuth.set(k,au);
            }
          }
        }
      }
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full,eps=S.parties.flatMap(P=>P.relationField?.episodes||[]);
      return{title:document.title,external,actions:S.c.actions,relationRecombination:S.c.relationRecombination||0,episodes:eps.length,annotated:eps.filter(ep=>ep.flowTopologyKey!=null).length,topologyObservations:S.realityFlowTopology?.observations||0,topologyActivations:S.c.realityFlowTopologyActivation||0,dormantSamples,authorizedSamples,turnovers,knowledgeRetainedTurnovers,finalAuthority:candidate?S.parties.map(P=>({party:P.id,...OASISRelationAuthority.authoritySnapshot(S,P)})):[]};
    },{candidate});await page.close();return{out,errors};
  }
  const baseline=await run('http://127.0.0.1:4188/index.html',false);
  const candidate=await run('http://127.0.0.1:4188/mvp3-authority-separated.html',true);
  const externalUnchanged=Object.fromEntries(Object.keys(baseline.out.external).map(k=>[k,JSON.stringify(baseline.out.external[k])===JSON.stringify(candidate.out.external[k])]));
  const checks={noPageErrors:candidate.errors.length===0,externalUnchanged:Object.values(externalUnchanged).every(Boolean),actionsContinue:candidate.out.actions>0,experienceStorageContinues:candidate.out.relationRecombination>0&&candidate.out.episodes>0,allEpisodesAnnotated:candidate.out.annotated===candidate.out.episodes,allTicksObserved:candidate.out.topologyObservations===1800,topologyReactivationOccurs:candidate.out.topologyActivations>0,rememberedButDormantObserved:candidate.out.dormantSamples>0,gatedAuthorityActuallyOccurs:candidate.out.authorizedSamples>0,authorityTurnsOver:candidate.out.turnovers>0,knowledgeCanRemainAcrossAuthorityTurnover:candidate.out.knowledgeRetainedTurnovers>0};
  const report={question:'Does evidence-authority separation remain operational in the live 1800-tick world, including authority loss/regain while relationship knowledge persists?',scope:'Live viability and regression only. Turnover is descriptive evidence that current authority changes without deleting stored knowledge; no superiority claim is made.',baseline:{title:baseline.out.title,errors:baseline.errors},candidate:{...candidate.out,errors:candidate.errors},externalUnchanged,checks};
  report.interpretation=Object.values(checks).every(Boolean)?'STAGE12_AUTHORITY_SEPARATION_LIVE_SURVIVES':'STAGE12_AUTHORITY_SEPARATION_LIVE_FAILED';
  console.log('\nSTAGE 12B — LIVE EVIDENCE / AUTHORITY TURNOVER REGRESSION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  await writeFile('reality-flow-authority-live-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
