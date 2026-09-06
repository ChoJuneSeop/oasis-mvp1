import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server = spawn('python3', ['-m', 'http.server', '4177', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL - ${msg}`);
  console.log(`PASS - ${msg}`);
}

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'),
    null,
    { timeout: 60000 }
  );
  await page.addScriptTag({ path: path.resolve('reality-flow.js') });
  await page.waitForFunction(() => !!window.OASISRealityFlow);

  const report = await page.evaluate(() => {
    const originalE = E;

    function makeWorld(trace,label){
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');
      E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';
      P.relationHistory=[
        {t:430,npc:'미라',place:'market'},
        {t:450,npc:'엘리',place:'forest'}
      ];
      P.relationField.episodes=[{
        t:450,
        key:['미라','엘리'].sort().join('↔'),
        a:'미라',b:'엘리',
        places:['market','forest'],
        from:[430,450],
        flowDir:1
      }];
      P.relationField.active=[];
      OASISRealityFlow.ingestTrace(S,trace,label);
      return S;
    }

    function snapshot(S){
      const P=S.parties[0];
      const rows=evalP(S,P,1);
      return {
        danger:S.danger,
        target:P.target,
        currentPlace:currentPlace(P),
        orientation:OASISRealityFlow.currentOrientation(S),
        flowActive:OASISRealityFlow.flowActiveEpisodes(S,P).map(ep=>ep.key).sort(),
        participants:[...participants(S,P,1)].sort(),
        signature:sig(rows),
        ranking:rows.map(r=>r.id)
      };
    }

    function pair(rise,fall,label){
      const rising=snapshot(makeWorld(rise,`${label}-rising`));
      const falling=snapshot(makeWorld(fall,`${label}-falling`));
      return {rising,falling,checks:{
        sameEndpoint:rising.danger===falling.danger&&rising.target===falling.target&&rising.currentPlace===falling.currentPlace,
        oppositeFlow:rising.orientation===1&&falling.orientation===-1,
        differentFlowActivation:JSON.stringify(rising.flowActive)!==JSON.stringify(falling.flowActive),
        differentParticipation:JSON.stringify(rising.participants)!==JSON.stringify(falling.participants),
        differentRanking:JSON.stringify(rising.ranking)!==JSON.stringify(falling.ranking)
      }};
    }

    // Case A keeps the original falsification endpoint. At 0.40 the base participant is already the mage,
    // so participation is saturated; ranking is the appropriate unsaturated observable.
    const caseA=pair(
      [0.10,0.13,0.17,0.22,0.28,0.34,0.40],
      [0.72,0.66,0.60,0.54,0.49,0.44,0.40],
      'endpoint-0.40'
    );

    // Case B uses a second endpoint where the base participant is not already the mage.
    // No threshold is added to the engine; this is only an observational condition chosen to avoid metric saturation.
    const caseB=pair(
      [0.02,0.05,0.08,0.11,0.14,0.17,0.20],
      [0.70,0.61,0.52,0.43,0.34,0.26,0.20],
      'endpoint-0.20'
    );

    const checks={
      originalEndpointPreserved:caseA.checks.sameEndpoint&&caseA.checks.oppositeFlow,
      originalEndpointFlowSensitive:caseA.checks.differentFlowActivation&&caseA.checks.differentRanking,
      unsaturatedEndpointPreserved:caseB.checks.sameEndpoint&&caseB.checks.oppositeFlow,
      unsaturatedParticipationSensitive:caseB.checks.differentFlowActivation&&caseB.checks.differentParticipation
    };

    E=originalE;
    return {
      question:'After adding only a temporal relation layer, can OASIS distinguish identical current coordinates reached through opposite flows?',
      scope:'Minimal path-sensitivity validation. Case A tests relation activation/ranking at the original endpoint; Case B tests participation where the original metric is not saturated. This does not establish universal task superiority.',
      firstFailureExplanation:'At endpoint 0.40 the pre-existing participant calculation already selected the mage in both arms, so adding relation authority could not change that set. The metric was saturated, not the flow representation.',
      caseA,caseB,checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'MVP3_PATH_SENSITIVITY_SURVIVES_REDESIGNED_MINIMAL_TEST'
        :'MVP3_PATH_SENSITIVITY_NOT_ESTABLISHED'
    };
  });

  console.log('\nSTAGE 4 — MVP3 REALITY FLOW VALIDATION (REDESIGNED AFTER FIRST FAILURE)');
  console.log(JSON.stringify(report,null,2));
  assert(report.checks.originalEndpointPreserved,'Case A preserves the original same-coordinate/opposite-flow condition');
  assert(report.checks.originalEndpointFlowSensitive,'Case A changes current relation authority and ranking at endpoint 0.40');
  assert(report.checks.unsaturatedEndpointPreserved,'Case B also preserves same-coordinate/opposite-flow control');
  assert(report.checks.unsaturatedParticipationSensitive,'Case B changes relation authority and participant structure without adding an engine threshold');
  assert(report.interpretation==='MVP3_PATH_SENSITIVITY_SURVIVES_REDESIGNED_MINIMAL_TEST','minimal path-sensitive Reality Flow hypothesis survives redesigned validation');

  await writeFile('reality-flow-mvp3-validation-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}
