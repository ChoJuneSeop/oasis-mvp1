import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4188','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,mode){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(m=>document.title.includes('Laboratory')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority&&(m!=='nocap'||!!window.OASISRelationExperienceStoreNoCap)&&(m!=='cap80'||!!window.OASISRelationExperienceStore),mode,{timeout:60000});
    const out=await page.evaluate(()=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full;
      const parties=S.parties.map(P=>{
        const A=OASISRelationAuthority.authoritySnapshot(S,P);
        return{
          id:P.id,historyLength:P.relationHistory.length,
          episodeCount:P.relationField?.episodes?.length||0,
          episodeKeys:(P.relationField?.episodes||[]).map(ep=>`${ep.from?.join('>')}|${ep.key}|${ep.flowTopologyKey||''}`),
          active:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>`${ep.key}|${ep.flowTopologyKey}`).sort(),
          known:A.known.slice().sort(),authorized:A.authorized.slice().sort(),dormant:A.knownButDormant.slice().sort(),
          choices:P.choiceHistory.map(x=>x.target)
        };
      });
      return{title:document.title,external,actions:S.c.actions||0,recombinations:S.c.relationRecombination||0,topologyActivations:S.c.realityFlowTopologyActivation||0,topologyObservations:S.c.realityFlowTopologyObservation||0,legacyActivations:S.c.relationFieldActivation||0,parties};
    });
    await page.close();return{out,errors};
  }

  const cap80=await run('http://127.0.0.1:4188/mvp3-authority-separated.html','cap80');
  const nocap=await run('http://127.0.0.1:4188/mvp3-authority-separated-nocap.html','nocap');
  const externalEqual=Object.fromEntries(Object.keys(cap80.out.external).map(k=>[k,JSON.stringify(cap80.out.external[k])===JSON.stringify(nocap.out.external[k])]));
  const perParty=cap80.out.parties.map((C,i)=>{const N=nocap.out.parties[i];return{
    id:C.id,historyLength:C.historyLength,
    cap80Episodes:C.episodeCount,noCapEpisodes:N.episodeCount,capActuallyBinding:N.episodeCount>C.episodeCount,
    sameEpisodeSet:JSON.stringify(C.episodeKeys)===JSON.stringify(N.episodeKeys),
    sameCurrentAuthority:JSON.stringify(C.active)===JSON.stringify(N.active),
    sameKnown:JSON.stringify(C.known)===JSON.stringify(N.known),
    sameAuthorized:JSON.stringify(C.authorized)===JSON.stringify(N.authorized),
    sameDormant:JSON.stringify(C.dormant)===JSON.stringify(N.dormant),
    sameChoicePath:JSON.stringify(C.choices)===JSON.stringify(N.choices)
  }});
  const binding=perParty.some(x=>x.capActuallyBinding);
  const treatmentDifference={
    episodeStorage:perParty.some(x=>!x.sameEpisodeSet||x.cap80Episodes!==x.noCapEpisodes),
    topologyActivation:cap80.out.topologyActivations!==nocap.out.topologyActivations,
    currentAuthority:perParty.some(x=>!x.sameCurrentAuthority),
    knownEvidence:perParty.some(x=>!x.sameKnown),authorizedPossibilities:perParty.some(x=>!x.sameAuthorized),dormantEvidence:perParty.some(x=>!x.sameDormant),
    realizedChoicePath:perParty.some(x=>!x.sameChoicePath)
  };
  const downstream=treatmentDifference.topologyActivation||treatmentDifference.currentAuthority||treatmentDifference.knownEvidence||treatmentDifference.authorizedPossibilities||treatmentDifference.dormantEvidence||treatmentDifference.realizedChoicePath;
  const controls={bothRunsClean:cap80.errors.length===0&&nocap.errors.length===0,noLegacyAuthority:cap80.out.legacyActivations===0&&nocap.out.legacyActivations===0,sameObservationBudget:cap80.out.topologyObservations===1800&&nocap.out.topologyObservations===1800,actionsContinue:cap80.out.actions>0&&nocap.out.actions>0,externalComparisonEqual:Object.values(externalEqual).every(Boolean),capActuallyBinding:binding};
  const interpretation=!Object.values(controls).every(Boolean)?'STAGE14_EPISODE_CAP_TEST_INVALID_CONTROL':downstream?'STAGE14_EPISODE_CAP_PROPAGATES_TO_CURRENT_FLOW':treatmentDifference.episodeStorage?'STAGE14_EPISODE_CAP_ALTERS_STORED_EXPERIENCE_BUT_NOT_CURRENT_FLOW':'STAGE14_EPISODE_CAP_NO_OBSERVED_EFFECT';
  const report={
    question:'With the last-18 relation composition rule held fixed, does the fixed 80-episode cap alter present Reality Flow compared with retaining all composed episodes?',
    scope:'Single-factor cap ablation on the authority-separated candidate. Only final episode truncation differs; current topology authority and evidence/execution separation are unchanged. A storage difference alone is not classified as a present-flow effect.',
    priorArtBoundary:'Bounded memory and adaptive retention are established agent-memory techniques; this stage tests OASIS internal validity rather than novelty.',
    cap80:{actions:cap80.out.actions,recombinations:cap80.out.recombinations,topologyActivations:cap80.out.topologyActivations,errors:cap80.errors},
    noCap:{actions:nocap.out.actions,recombinations:nocap.out.recombinations,topologyActivations:nocap.out.topologyActivations,errors:nocap.errors},
    externalEqual,perParty,treatmentDifference,classification:{downstreamDifference:downstream},controls,interpretation
  };
  console.log('\nSTAGE 14 — FIXED EPISODE-CAP ARTIFACT KILL');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(controls))assert(v,k);
  console.log(`OBSERVATION - ${interpretation}`);
  await writeFile('reality-flow-episode-cap-kill-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
