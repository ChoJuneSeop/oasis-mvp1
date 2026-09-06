import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4189','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,candidate){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(c=>document.title.includes('Laboratory')&&(!c||!!window.OASISExecutionAuthority),candidate,{timeout:60000});
    const out=await page.evaluate(({candidate})=>{
      reset();E.paused=true;
      const prev=new Map();let dormantEvidenceSamples=0,authorizedEvidenceSamples=0,authorityTurnovers=0,retainedKnowledgeTurnovers=0,candidateAuthorityViolations=0;
      for(let i=0;i<1800;i++){
        E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e);
        if(candidate){
          const S=E.worlds.full,gated=Object.keys(places).filter(id=>places[id].gate);
          for(const P of S.parties){
            const known=new Set(availableOasis(S,P,1).filter(id=>places[id].gate));
            const rows=new Set(evalP(S,P,1).map(r=>r.id));
            for(const id of gated){
              const authority=OASISExecutionAuthority.currentRelationAuthorityForPlace(S,P,id);
              const isKnown=known.has(id),key=`${P.id}|${id}`,prior=prev.get(key);
              if(isKnown&&!authority)dormantEvidenceSamples++;
              if(isKnown&&authority)authorizedEvidenceSamples++;
              if(rows.has(id)&&!authority)candidateAuthorityViolations++;
              if(prior&&prior.authority!==authority){authorityTurnovers++;if(prior.known&&isKnown)retainedKnowledgeTurnovers++}
              prev.set(key,{known:isKnown,authority});
            }
          }
        }
      }
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full,eps=S.parties.flatMap(P=>P.relationField?.episodes||[]);
      return{title:document.title,external,actions:S.c.actions,relationRecombination:S.c.relationRecombination||0,episodes:eps.length,annotated:eps.filter(ep=>ep.flowTopologyKey!=null).length,topologyObservations:S.realityFlowTopology?.observations||0,topologyActivations:S.c.realityFlowTopologyActivation||0,legacyActivation:S.c.relationFieldActivation||0,dormantEvidenceSamples,authorizedEvidenceSamples,authorityTurnovers,retainedKnowledgeTurnovers,candidateAuthorityViolations};
    },{candidate});await page.close();return{out,errors};
  }
  const baseline=await run('http://127.0.0.1:4189/index.html',false);
  const candidate=await run('http://127.0.0.1:4189/mvp3-topology-authority-isolated.html',true);
  const externalUnchanged=Object.fromEntries(Object.keys(baseline.out.external).map(k=>[k,JSON.stringify(baseline.out.external[k])===JSON.stringify(candidate.out.external[k])]));
  const checks={noPageErrors:candidate.errors.length===0,externalUnchanged:Object.values(externalUnchanged).every(Boolean),noLegacyAuthority:candidate.out.legacyActivation===0,actionsContinue:candidate.out.actions>0,experienceStorageContinues:candidate.out.relationRecombination>0&&candidate.out.episodes>0,allEpisodesAnnotated:candidate.out.annotated===candidate.out.episodes,allTicksObserved:candidate.out.topologyObservations===1800,topologyReactivationOccurs:candidate.out.topologyActivations>0,rememberedEvidenceCanBeDormant:candidate.out.dormantEvidenceSamples>0,rememberedEvidenceCanBecomeAuthorized:candidate.out.authorizedEvidenceSamples>0,currentAuthorityActuallyTurnsOver:candidate.out.authorityTurnovers>0,knowledgeCanPersistAcrossTurnover:candidate.out.retainedKnowledgeTurnovers>0,noCandidateWithoutCurrentAuthority:candidate.out.candidateAuthorityViolations===0};
  const report={question:'Does the preferred Stage 12 architecture preserve relationship/place evidence while current executable candidacy turns on and off with Reality Flow during the live 1800-tick world?',scope:'Live authority-boundary regression. It tests persistence of evidence and dynamic execution authority without changing external comparison arms; it does not establish superiority or universal sufficiency of exact topology matching.',baseline:{title:baseline.out.title,errors:baseline.errors},candidate:{...candidate.out,errors:candidate.errors},externalUnchanged,checks};
  report.interpretation=Object.values(checks).every(Boolean)?'STAGE12_LIVE_EVIDENCE_EXECUTION_BOUNDARY_SURVIVES':'STAGE12_LIVE_EVIDENCE_EXECUTION_BOUNDARY_FAILED';
  console.log('\nSTAGE 12B — LIVE EVIDENCE / EXECUTION AUTHORITY TURNOVER');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  await writeFile('reality-flow-execution-authority-live-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
