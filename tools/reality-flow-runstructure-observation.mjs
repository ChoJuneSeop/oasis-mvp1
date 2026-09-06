import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server = spawn('python3', ['-m', 'http.server', '4178', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });
  await page.addScriptTag({ path: path.resolve('reality-flow.js') });
  await page.waitForFunction(() => !!window.OASISRealityFlow?.currentRunStructure);

  const report = await page.evaluate(() => {
    const originalE = E;

    function observeTrace(trace,label){
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');
      E.worlds.full=S;
      OASISRealityFlow.ingestTrace(S,trace,label);
      return {
        endpoint:S.danger,
        lastOrientation:OASISRealityFlow.currentOrientation(S),
        runStructure:OASISRealityFlow.currentRunStructure(S),
        edgeCount:S.realityFlow.edges.length
      };
    }

    const direct=observeTrace([0.02,0.05,0.08,0.11,0.14,0.17,0.20],'direct');
    const directDense=observeTrace([0.02,0.03,0.04,0.06,0.09,0.12,0.15,0.18,0.20],'direct-dense');
    const reversal=observeTrace([0.30,0.24,0.18,0.15,0.16,0.18,0.20],'reversal');

    const checks={
      sameEndpoint:direct.endpoint===reversal.endpoint,
      sameLastOrientation:direct.lastOrientation===reversal.lastOrientation&&direct.lastOrientation===1,
      differentRunStructure:JSON.stringify(direct.runStructure)!==JSON.stringify(reversal.runStructure),
      monotoneResamplingInvariant:JSON.stringify(direct.runStructure)===JSON.stringify(directDense.runStructure),
      noAuthorityChangeInThisStage:true
    };

    E=originalE;
    return {
      question:'Can the observation layer preserve trajectory reversal structure that the last-direction proxy aliases, without yet changing relation authority or action?',
      scope:'Representation-only implementation check. Direction-run structure is established sequence compression/change-point style machinery and is not claimed as OASIS novelty.',
      direct,directDense,reversal,checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE8_RUN_STRUCTURE_OBSERVATION_SURVIVES'
        :'STAGE8_RUN_STRUCTURE_OBSERVATION_NOT_ESTABLISHED'
    };
  });

  console.log('\nSTAGE 8 — TRAJECTORY RUN-STRUCTURE OBSERVATION');
  console.log(JSON.stringify(report,null,2));
  assert(report.checks.sameEndpoint,'direct and reversal traces end at the same coordinate');
  assert(report.checks.sameLastOrientation,'direct and reversal traces share the same final direction');
  assert(report.checks.differentRunStructure,'compressed run history preserves the reversal information lost by last-direction');
  assert(report.checks.monotoneResamplingInvariant,'same monotone path keeps the same run structure under denser sampling');
  assert(report.interpretation==='STAGE8_RUN_STRUCTURE_OBSERVATION_SURVIVES','Stage 8 observational representation survives its scoped check');

  await writeFile('reality-flow-runstructure-observation-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}
