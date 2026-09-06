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
    const traceRise = [0.10,0.13,0.17,0.22,0.28,0.34,0.40];
    const traceFall = [0.72,0.66,0.60,0.54,0.49,0.44,0.40];

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
        candidates:rows.map(r=>r.id)
      };
    }

    const rising=snapshot(makeWorld(traceRise,'rising-to-0.40'));
    const falling=snapshot(makeWorld(traceFall,'falling-to-0.40'));

    const checks={
      sameEndpoint:rising.danger===falling.danger&&rising.target===falling.target&&rising.currentPlace===falling.currentPlace,
      oppositeFlow:rising.orientation===1&&falling.orientation===-1,
      differentFlowActivation:JSON.stringify(rising.flowActive)!==JSON.stringify(falling.flowActive),
      differentParticipation:JSON.stringify(rising.participants)!==JSON.stringify(falling.participants),
      decisionObserved:!!rising.signature.choice&&!!falling.signature.choice
    };

    E=originalE;
    return {
      question:'After adding only a temporal relation layer, can OASIS distinguish the same current coordinate reached through opposite flows?',
      scope:'Tests path sensitivity of relation activation and participation. It does not establish universal task superiority.',
      design:'The same completed relation episode was formed with positive temporal orientation. Both test worlds share current danger/location/target and stored experience; only the recent trajectory differs.',
      rising,falling,checks,
      interpretation:checks.sameEndpoint&&checks.oppositeFlow&&checks.differentFlowActivation&&checks.differentParticipation
        ?'MVP3_PATH_SENSITIVITY_SURVIVES_MINIMAL_TEST'
        :'MVP3_PATH_SENSITIVITY_NOT_ESTABLISHED'
    };
  });

  console.log('\nSTAGE 4 — MVP3 REALITY FLOW VALIDATION');
  console.log(JSON.stringify(report,null,2));
  assert(report.checks.sameEndpoint,'both worlds still end at the same current coordinate');
  assert(report.checks.oppositeFlow,'Reality Flow layer preserves opposite temporal orientations');
  assert(report.checks.differentFlowActivation,'same stored relation receives different current participation authority from different flows');
  assert(report.checks.differentParticipation,'different flow produces a different participant structure without a danger threshold rule');
  assert(report.interpretation==='MVP3_PATH_SENSITIVITY_SURVIVES_MINIMAL_TEST','minimal path-sensitive Reality Flow hypothesis survives');

  await writeFile('reality-flow-mvp3-validation-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}
