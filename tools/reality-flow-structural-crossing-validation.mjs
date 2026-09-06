import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4188','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4188/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Authority Separated')&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});

  const report=await page.evaluate(()=>{
    const originalE=E;

    // Test-only candidate: a reversal becomes structural only after the
    // excursion crosses the origin of the currently confirmed run.
    // No fixed magnitude epsilon, time window, or learned threshold is used.
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
    if(!gatedEntry)throw new Error('No gated place available for Stage 18');
    const[gatedId,gatedDef]=gatedEntry,gate=gatedDef.gate;

    function arm(trace,label){
      E={tick:800,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';P._realityFlowTopologyAnchor=null;
      P.relationHistory=[{t:720,npc:gate,place:'road'}];
      P.relationField.episodes=[{
        tag:'stage18-reference',t:740,
        key:[gate,'stage18-peer'].sort().join('↔'),a:gate,b:'stage18-peer',
        places:[gatedId,'road'],from:[720,740],
        flowTopologyRuns:[1],flowTopologyKey:'1'
      }];

      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const exactRuns=OASISRealityFlowTopology.currentRunsForParty(S,P);
      const exactKey=OASISRealityFlowTopology.currentKeyForParty(S,P);
      const exactActive=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag);
      const exactAuthority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const exactActionable=actionableIds(S,P,1).includes(gatedId);

      const candidateRuns=structuralRuns(trace),candidateKey=keyOf(candidateRuns);
      const originalActive=OASISRealityFlowTopology.activeEpisodes;
      OASISRealityFlowTopology.activeEpisodes=(s,p)=>(p.relationField?.episodes||[]).filter(ep=>ep.flowTopologyKey===candidateKey);
      const candidateActive=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.tag);
      const candidateAuthority=OASISRelationAuthority.currentGateAuthority(S,P,gatedId,1);
      const candidateActionable=actionableIds(S,P,1).includes(gatedId);
      OASISRealityFlowTopology.activeEpisodes=originalActive;

      return{
        label,trace,endpoint:S.danger,netChange:trace.at(-1)-trace[0],
        exact:{runs:exactRuns,key:exactKey,active:exactActive,gateAuthority:exactAuthority,gatedActionable:exactActionable},
        structuralCandidate:{runs:candidateRuns,key:candidateKey,active:candidateActive,gateAuthority:candidateAuthority,gatedActionable:candidateActionable}
      };
    }

    const arms={
      reference:arm([0.10,0.20,0.20,0.30],'reference'),
      microWiggle:arm([0.10,0.20,0.20-1e-9,0.30],'micro-wiggle'),
      largerNonCrossing:arm([0.10,0.20,0.11,0.30],'larger-noncrossing'),
      structuralCrossing:arm([0.10,0.20,0.05,0.30],'structural-crossing'),
      microDense:arm([0.10,0.15,0.20,0.20-5e-10,0.20-1e-9,0.25,0.30],'micro-dense'),
      crossingDense:arm([0.10,0.15,0.20,0.12,0.05,0.10,0.18,0.21,0.30],'crossing-dense')
    };

    const A=arms;
    const checks={
      sameEndpointAndNetChange:[A.microWiggle,A.largerNonCrossing,A.structuralCrossing,A.microDense,A.crossingDense].every(x=>x.endpoint===A.reference.endpoint&&x.netChange===A.reference.netChange),
      exactKeyStillOverSeparates:A.reference.exact.key==='1'&&A.microWiggle.exact.key==='1>-1>1'&&!A.microWiggle.exact.gateAuthority,
      structuralCandidatePreservesReference:A.reference.structuralCandidate.key==='1'&&A.reference.structuralCandidate.gateAuthority&&A.reference.structuralCandidate.gatedActionable,
      structuralCandidateIgnoresInfinitesimalWiggle:A.microWiggle.structuralCandidate.key==='1'&&A.microWiggle.structuralCandidate.gateAuthority&&A.microWiggle.structuralCandidate.gatedActionable,
      notSimpleSmallMagnitudeRule:A.largerNonCrossing.structuralCandidate.key==='1'&&A.largerNonCrossing.structuralCandidate.gateAuthority,
      meaningfulCrossingStillDistinct:A.structuralCrossing.structuralCandidate.key==='1>-1>1'&&!A.structuralCrossing.structuralCandidate.gateAuthority&&!A.structuralCrossing.structuralCandidate.gatedActionable,
      microResamplingInvariant:A.microDense.structuralCandidate.key===A.microWiggle.structuralCandidate.key&&A.microDense.structuralCandidate.gateAuthority===A.microWiggle.structuralCandidate.gateAuthority,
      crossingResamplingInvariant:A.crossingDense.structuralCandidate.key===A.structuralCrossing.structuralCandidate.key&&A.crossingDense.structuralCandidate.gateAuthority===A.structuralCrossing.structuralCandidate.gateAuthority,
      stage7And8PathSensitivityPreserved:A.reference.structuralCandidate.key!==A.structuralCrossing.structuralCandidate.key&&A.reference.structuralCandidate.gateAuthority!==A.structuralCrossing.structuralCandidate.gateAuthority
    };

    E=originalE;
    return{
      question:'Can a parameter-free structural-crossing candidate suppress non-structural reversal tokens while preserving a reversal that changes the prior run relation?',
      scope:'Test-only candidate validation. A reversal is confirmed only when it crosses the origin of the currently confirmed run. This is an internal robustness/path-sensitivity check, not a novelty claim and not yet a production change.',
      priorArtBoundary:'Directional-change thresholds, dynamic thresholds, hysteresis-like filtering, swing segmentation, and persistence/topological simplification are established ideas. This test does not claim structural crossing itself as novel.',
      english:{
        structuralCrossing:'a reversal that crosses the origin level of the currently confirmed directional run',
        provisionalExcursion:'an opposite-direction movement that has not yet changed the prior structural ordering',
        resamplingInvariant:'the qualitative result remains the same when extra samples are inserted along the same structural path',
        parameterFreeHere:'the test introduces no fixed epsilon, time window, or learned numeric reversal threshold'
      },
      rule:{comparison:'strict order crossing of the prior run origin',fixedMagnitudeThreshold:null,timeWindow:null,learnedThreshold:null},
      gatedPlace:{id:gatedId,gate},arms,checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE18_STRUCTURAL_CROSSING_CANDIDATE_SURVIVES_MINIMAL_TEST':'STAGE18_STRUCTURAL_CROSSING_CANDIDATE_FAILED',
      nextBoundary:'If this survives, the candidate must next be tested against adversarial multi-wiggle and nested-reversal traces before it can replace exact topology authority.'
    };
  });

  report.errors=errors;report.checks.cleanPage=errors.length===0;
  if(!Object.values(report.checks).every(Boolean))report.interpretation='STAGE18_STRUCTURAL_CROSSING_CANDIDATE_FAILED';

  console.log('\nSTAGE 18 — STRUCTURAL CROSSING CANDIDATE VALIDATION');
  console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  assert(report.interpretation==='STAGE18_STRUCTURAL_CROSSING_CANDIDATE_SURVIVES_MINIMAL_TEST','Stage 18 candidate survives both robustness and path-sensitivity controls');
  await writeFile('reality-flow-structural-crossing-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
