import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4187','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4187/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;
    const epsilons=[1e-1,1e-2,1e-3,1e-4,1e-5,1e-6,1e-7,1e-8,1e-9];
    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 17');
    const [gatedId,gatedDef]=gatedEntry;
    const gate=gatedDef.gate;

    function arm(trace,label){
      E={tick:700,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';
      P._realityFlowTopologyAnchor=null;
      P.relationHistory=[{t:620,npc:gate,place:'road'}];
      P.relationField.episodes=[{
        tag:'stage17-reference',t:640,
        key:[gate,'stage17-peer'].sort().join('↔'),a:gate,b:'stage17-peer',
        places:[gatedId,'road'],from:[620,640],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      }];
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const runs=OASISRealityFlowTopology.currentRunsForParty(S,P);
      const key=OASISRealityFlowTopology.currentKeyForParty(S,P);
      const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag);
      const authority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const actionable=actionableIds(S,P,1);
      return{
        endpoint:S.danger,
        netChange:trace.at(-1)-trace[0],
        key,runs,active,
        gateAuthority:authority,
        gatedActionable:actionable.includes(gatedId),
        actionable
      };
    }

    const referenceTrace=[0.10,0.20,0.20,0.30];
    const reference=arm(referenceTrace,'reference-monotone-with-flat-sample');
    const perturbations=epsilons.map(epsilon=>{
      const trace=[0.10,0.20,0.20-epsilon,0.30];
      const x=arm(trace,`micro-reversal-${epsilon}`);
      return{epsilon,maxPointwiseDeviation:epsilon,trace,...x};
    });

    const checks={
      cleanPage:errors.length===0,
      referenceKeyIsMonotone:reference.key==='1'&&JSON.stringify(reference.runs)===JSON.stringify([1]),
      referenceRelationAuthorized:reference.active.includes('stage17-reference')&&reference.gateAuthority&&reference.gatedActionable,
      allSameEndpoint:perturbations.every(x=>x.endpoint===reference.endpoint),
      allSameNetChange:perturbations.every(x=>x.netChange===reference.netChange),
      everyPositiveMicroReversalChangesKey:perturbations.every(x=>x.key==='1>-1>1'),
      everyPositiveMicroReversalDropsRelation:perturbations.every(x=>!x.active.includes('stage17-reference')),
      everyPositiveMicroReversalDropsGateAuthority:perturbations.every(x=>!x.gateAuthority&&!x.gatedActionable),
      discontinuityPersistsAtSmallestTestedPerturbation:perturbations.at(-1).epsilon===1e-9&&!perturbations.at(-1).gateAuthority
    };

    E=originalE;
    return{
      question:'Does exact qualitative topology-key equality create a binary relation-authority cliff under an arbitrarily small temporary reversal in the current flow?',
      scope:'Internal falsification of exact symbolic-key equality as a robust current-flow authority criterion. No similarity threshold, DTW/SAX-style matcher, or replacement policy is introduced here, and no novelty claim is made for noise-robust time-series matching.',
      english:{
        exactMatch:'two symbolic flow keys must be identical, not merely similar',
        microReversal:'a very small temporary movement opposite to the dominant direction',
        discontinuity:'an arbitrarily small input change causes a finite or binary output change',
        overSeparation:'treating practically near-identical flow histories as categorically different'
      },
      gatedPlace:{id:gatedId,gate},
      referenceTrace,reference,perturbations,checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE17_EXACT_TOPOLOGY_AUTHORITY_DISCONTINUITY_CONFIRMED'
        :'STAGE17_DISCONTINUITY_NOT_ESTABLISHED',
      nextBoundary:'If confirmed, the next experiment must distinguish meaningful reversal from negligible perturbation without assuming a fixed epsilon threshold as the answer.'
    };
  });

  console.log('\nSTAGE 17 — EXACT TOPOLOGY MICRO-REVERSAL CONTINUITY KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE17_EXACT_TOPOLOGY_AUTHORITY_DISCONTINUITY_CONFIRMED','Stage 17 establishes the exact-key authority cliff');
  await writeFile('reality-flow-topology-continuity-kill-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
