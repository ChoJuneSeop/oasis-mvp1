import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4189','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4189/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;

    // Same test-only Stage 18 candidate. No production code is changed here.
    function structuralRuns(trace){
      if(!Array.isArray(trace)||trace.length<2)return[];
      const runs=[];
      let origin=trace[0],extreme=trace[0],dir=0;
      for(let i=1;i<trace.length;i++){
        const x=trace[i];
        if(dir===0){
          if(x>origin){dir=1;runs.push(1);extreme=x}
          else if(x<origin){dir=-1;runs.push(-1);extreme=x}
          continue;
        }
        if(dir===1){
          if(x>=extreme){extreme=x;continue}
          if(x<origin){
            const priorExtreme=extreme;
            dir=-1;runs.push(-1);origin=priorExtreme;extreme=x;
          }
        }else{
          if(x<=extreme){extreme=x;continue}
          if(x>origin){
            const priorExtreme=extreme;
            dir=1;runs.push(1);origin=priorExtreme;extreme=x;
          }
        }
      }
      return runs;
    }
    const keyOf=runs=>runs.join('>');

    const gatedEntry=Object.entries(places).find(([_,d])=>!d.pub&&d.gate);
    if(!gatedEntry)throw new Error('No gated place available for Stage 19');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;

    function candidateState(trace,label){
      E={tick:900,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      P.relationHistory=[{t:820,npc:gate,place:'road'}];
      P.relationField.episodes=[{
        tag:'stage19-reference',t:840,
        key:[gate,'stage19-peer'].sort().join('↔'),a:gate,b:'stage19-peer',
        places:[gatedId,'road'],from:[820,840],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      }];

      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const runs=structuralRuns(trace),key=keyOf(runs);
      const exactKey=OASISRealityFlowTopology.currentKeyForParty(S,P);
      const originalActive=OASISRealityFlowTopology.activeEpisodes;
      OASISRealityFlowTopology.activeEpisodes=(s,p)=>(p.relationField?.episodes||[]).filter(ep=>ep.flowTopologyKey===key);
      const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag);
      const authority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const actionable=actionableIds(S,P,1).includes(gatedId);
      OASISRealityFlowTopology.activeEpisodes=originalActive;
      return{label,trace,endpoint:S.danger,netChange:trace.at(-1)-trace[0],exactKey,runs,key,active,gateAuthority:authority,gatedActionable:actionable};
    }

    const epsilons=[1e-3,1e-5,1e-7,1e-9,1e-11];
    const anchor=0.10,peak=0.20,end=0.30;
    const boundary=epsilons.map(epsilon=>({
      epsilon,
      above:candidateState([anchor,peak,anchor+epsilon,end],`above-${epsilon}`),
      at:candidateState([anchor,peak,anchor,end],`at-${epsilon}`),
      below:candidateState([anchor,peak,anchor-epsilon,end],`below-${epsilon}`)
    }));

    const baseAbove=[anchor,peak,anchor+1e-9,end];
    const baseBelow=[anchor,peak,anchor-1e-9,end];
    const affine=x=>x*100+7;
    const affineAbove=candidateState(baseAbove.map(affine),'affine-above');
    const affineBelow=candidateState(baseBelow.map(affine),'affine-below');

    const denseAbove=candidateState([anchor,0.15,peak,0.16,0.12,anchor+1e-9,0.18,0.24,end],'dense-above');
    const denseBelow=candidateState([anchor,0.15,peak,0.16,0.12,anchor-1e-9,0.18,0.24,end],'dense-below');

    const streamingAbove=baseAbove.slice(1).map((_,i)=>candidateState(baseAbove.slice(0,i+2),`stream-above-${i+2}`));
    const streamingBelow=baseBelow.slice(1).map((_,i)=>candidateState(baseBelow.slice(0,i+2),`stream-below-${i+2}`));

    const checks={
      allBoundaryArmsSameEndpointAndNetChange:boundary.every(row=>[row.above,row.at,row.below].every(x=>x.endpoint===end&&x.netChange===end-anchor)),
      aboveAnchorRetainsAuthorityAtEveryScale:boundary.every(row=>row.above.key==='1'&&row.above.gateAuthority&&row.above.gatedActionable),
      exactAnchorRetainsAuthority:boundary.every(row=>row.at.key==='1'&&row.at.gateAuthority&&row.at.gatedActionable),
      belowAnchorDropsAuthorityAtEveryScale:boundary.every(row=>row.below.key==='1>-1>1'&&!row.below.gateAuthority&&!row.below.gatedActionable),
      boundaryPersistsAtSmallestEpsilon:boundary.at(-1).epsilon===1e-11&&boundary.at(-1).above.gateAuthority&&!boundary.at(-1).below.gateAuthority,
      positiveAffineOrderInvariant:affineAbove.key==='1'&&affineAbove.gateAuthority&&affineBelow.key==='1>-1>1'&&!affineBelow.gateAuthority,
      denseSamplingPreservesBoundary:denseAbove.key==='1'&&denseAbove.gateAuthority&&denseBelow.key==='1>-1>1'&&!denseBelow.gateAuthority,
      onlinePrefixAboveNeverRevokes:streamingAbove.every(x=>x.key==='1'&&x.gateAuthority),
      onlinePrefixBelowRevokesAtCrossing:streamingBelow[0].key==='1'&&streamingBelow[0].gateAuthority&&streamingBelow[1].key==='1>-1'&&!streamingBelow[1].gateAuthority&&streamingBelow[2].key==='1>-1>1'&&!streamingBelow[2].gateAuthority,
      noFutureLookaheadRequired:streamingBelow[1].trace.length===3&&!streamingBelow[1].gateAuthority
    };

    E=originalE;
    return{
      question:'Did Stage 18 eliminate authority discontinuity, or relocate it to the prior run anchor as a structural boundary?',
      scope:'Characterizes the Stage 18 test-only structural-crossing candidate around its own anchor. It does not test optimality, human semantics, novelty, or production readiness. The production exact-topology implementation is unchanged.',
      priorArtBoundary:'Hysteresis, swing/pivot segmentation, extrema-based simplification, directional-change methods, and persistence/topological summaries are established families. The experiment claims no novelty for boundary-based reversal filtering.',
      english:{
        anchor:'the origin level of the currently confirmed directional run',
        boundaryDiscontinuity:'an arbitrarily small move from one side of a boundary to the other causes a categorical authority change',
        affineInvariance:'translation and positive scaling preserve the qualitative ordering result',
        prefixConsistency:'the online decision at each prefix is determined by observations already seen, not future samples'
      },
      rule:{crossing:'strict x < prior-run origin for a rising run; strict x > prior-run origin for a falling run',numericReversalThreshold:null,timeWindow:null},
      gatedPlace:{id:gatedId,gate},anchor,peak,end,epsilons,boundary,
      controls:{affineAbove,affineBelow,denseAbove,denseBelow,streamingAbove,streamingBelow},
      checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE19_STRUCTURAL_ANCHOR_IS_A_BINARY_AUTHORITY_BOUNDARY':'STAGE19_STRUCTURAL_ANCHOR_BOUNDARY_NOT_ESTABLISHED',
      oasisInterpretation:'If confirmed, Stage 18 did not create mathematical continuity. It moved the authority switch from any local sign reversal to crossing a boundary created by the prior flow. Whether that relational event is a justified OASIS boundary must be tested separately rather than assumed.'
    };
  });

  report.errors=errors;report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE19_STRUCTURAL_ANCHOR_BOUNDARY_NOT_ESTABLISHED';

  console.log('\nSTAGE 19 — STRUCTURAL ANCHOR BOUNDARY KILL');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE19_STRUCTURAL_ANCHOR_IS_A_BINARY_AUTHORITY_BOUNDARY','Stage 19 establishes the structural anchor as a binary authority boundary');
  await writeFile('reality-flow-structural-anchor-boundary-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
