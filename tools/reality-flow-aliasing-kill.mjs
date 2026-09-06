import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4180','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4180/index.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory')&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  await page.addScriptTag({path:path.resolve('reality-flow.js')});
  await page.waitForFunction(()=>!!window.OASISRealityFlow);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const direct=[0.02,0.05,0.08,0.11,0.14,0.17,0.20];
    const reversal=[0.48,0.36,0.25,0.14,0.10,0.16,0.20];

    function signRuns(trace){
      const out=[];
      for(let i=1;i<trace.length;i++){
        const d=trace[i]>trace[i-1]?1:trace[i]<trace[i-1]?-1:0;
        if(d&&out.at(-1)!==d)out.push(d);
      }
      return out;
    }

    function makeWorld(trace,label){
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');E.worlds.full=S;
      const P=S.parties[0];P.target='road';
      P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
      P.relationField.episodes=[{
        t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',
        places:['market','forest'],from:[430,450],flowDir:1
      }];
      OASISRealityFlow.ingestTrace(S,trace,label);
      const rows=evalP(S,P,1);
      return {
        danger:S.danger,
        target:P.target,
        currentPlace:currentPlace(P),
        lastOrientation:OASISRealityFlow.currentOrientation(S),
        signRuns:signRuns(trace),
        flowActive:OASISRealityFlow.flowActiveEpisodes(S,P).map(ep=>ep.key).sort(),
        participants:[...participants(S,P,1)].sort(),
        ranking:rows.map(r=>r.id),
        signature:sig(rows)
      };
    }

    const A=makeWorld(direct,'direct-rising');
    const B=makeWorld(reversal,'fall-then-rise');
    const checks={
      sameEndpoint:A.danger===B.danger&&A.target===B.target&&A.currentPlace===B.currentPlace,
      sameLastOrientation:A.lastOrientation===B.lastOrientation&&A.lastOrientation===1,
      objectivelyDifferentRunStructure:JSON.stringify(A.signRuns)!==JSON.stringify(B.signRuns),
      sameFlowAuthority:JSON.stringify(A.flowActive)===JSON.stringify(B.flowActive),
      sameParticipants:JSON.stringify(A.participants)===JSON.stringify(B.participants),
      sameDecision:JSON.stringify(A.signature)===JSON.stringify(B.signature)
    };
    E=originalE;
    return {
      question:'Does the current MVP3 Reality Flow layer alias distinct trajectories that share the same endpoint and last non-zero direction?',
      scope:'Falsifies only the last-direction proxy. It does not imply that path-signature or other history representations are novel OASIS mechanisms.',
      direct:A,reversal:B,checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'MVP3_LAST_DIRECTION_PROXY_FALSIFIED_FOR_TRAJECTORY_ALIASING'
        :'CURRENT_LAYER_DISTINGUISHED_THE_TRAJECTORIES_OR_TEST_NEEDS_REVIEW'
    };
  });

  console.log('\nSTAGE 7 — REALITY FLOW TRAJECTORY ALIASING KILL');
  console.log(JSON.stringify(report,null,2));
  assert(report.checks.sameEndpoint,'both arms end at the same current coordinate');
  assert(report.checks.sameLastOrientation,'both arms have the same final non-zero direction');
  assert(report.checks.objectivelyDifferentRunStructure,'the temporal direction-run structures are different');
  assert(report.checks.sameFlowAuthority,'current MVP3 grants the same relation authority to both distinct trajectories');
  assert(report.checks.sameParticipants,'current MVP3 forms the same participants for both distinct trajectories');
  assert(report.checks.sameDecision,'current MVP3 forms the same decision signature for both distinct trajectories');
  assert(report.interpretation==='MVP3_LAST_DIRECTION_PROXY_FALSIFIED_FOR_TRAJECTORY_ALIASING','last-direction flow proxy is falsified for trajectory aliasing');
  await writeFile('reality-flow-aliasing-kill-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
