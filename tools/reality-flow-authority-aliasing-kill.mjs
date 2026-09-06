import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const server = spawn('python3', ['-m', 'http.server', '4179', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4179/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });
  await page.addScriptTag({ path: path.resolve('reality-flow.js') });
  await page.waitForFunction(() => !!window.OASISRealityFlow?.currentRunStructure);

  const report = await page.evaluate(() => {
    const originalE = E;

    function makeWorld(trace,label){
      E={tick:500,worlds:{},paused:true};
      const S=mkW('full');
      E.worlds.full=S;
      const P=S.parties[0];
      P.target='road';
      P.relationField.episodes=[
        {
          tag:'direct-experience',
          t:440,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',
          places:['market','road'],from:[420,440],flowDir:1,flowRuns:[1]
        },
        {
          tag:'reversal-experience',
          t:460,key:['라온','엘리'].sort().join('↔'),a:'라온',b:'엘리',
          places:['forest','road'],from:[445,460],flowDir:1,flowRuns:[-1,1]
        }
      ];
      P.relationField.active=[];
      OASISRealityFlow.ingestTrace(S,trace,label);
      const active=OASISRealityFlow.flowActiveEpisodes(S,P);
      return {
        endpoint:S.danger,
        lastOrientation:OASISRealityFlow.currentOrientation(S),
        currentRuns:OASISRealityFlow.currentRunStructure(S),
        activeTags:active.map(ep=>ep.tag).sort(),
        activeStoredRuns:active.map(ep=>ep.flowRuns),
        participants:[...participants(S,P,1)].sort(),
        ranking:evalP(S,P,1).map(r=>r.id)
      };
    }

    const direct=makeWorld([0.02,0.05,0.08,0.11,0.14,0.17,0.20],'direct-current');
    const reversal=makeWorld([0.30,0.24,0.18,0.15,0.16,0.18,0.20],'reversal-current');

    const checks={
      sameEndpoint:direct.endpoint===reversal.endpoint,
      sameLastOrientation:direct.lastOrientation===reversal.lastOrientation&&direct.lastOrientation===1,
      differentObservableRunStructure:JSON.stringify(direct.currentRuns)!==JSON.stringify(reversal.currentRuns),
      storedExperiencesCarryDifferentRunStructure:
        JSON.stringify(direct.activeStoredRuns[0])!==JSON.stringify(direct.activeStoredRuns[1]),
      authorityStillAliased:
        JSON.stringify(direct.activeTags)===JSON.stringify(reversal.activeTags)&&direct.activeTags.length===2,
      currentAuthorityIgnoresRunStructure:
        direct.activeTags.includes('direct-experience')&&direct.activeTags.includes('reversal-experience')&&
        reversal.activeTags.includes('direct-experience')&&reversal.activeTags.includes('reversal-experience')
    };

    E=originalE;
    return {
      question:'After Stage 8 preserves run structure, does current relation authority still collapse distinct completed experiences because it uses only final direction?',
      scope:'Internal-validity falsification only. It tests whether the newly preserved observation is actually consumed by relation authority; it does not assert that structural matching is novel or universally sufficient.',
      direct,reversal,checks,
      interpretation:Object.values(checks).every(Boolean)
        ?'STAGE9_RELATION_AUTHORITY_FALSIFIED_FOR_RUN_STRUCTURE_ALIASING'
        :'STAGE9_FALSIFICATION_NOT_ESTABLISHED'
    };
  });

  console.log('\nSTAGE 9 — RELATION AUTHORITY RUN-STRUCTURE ALIASING KILL');
  console.log(JSON.stringify(report,null,2));
  assert(report.checks.sameEndpoint,'both current flows end at the same coordinate');
  assert(report.checks.sameLastOrientation,'both current flows have the same final direction');
  assert(report.checks.differentObservableRunStructure,'Stage 8 observation distinguishes the current run structures');
  assert(report.checks.storedExperiencesCarryDifferentRunStructure,'stored completed experiences encode different run structures');
  assert(report.checks.authorityStillAliased,'current relation authority activates the same completed experiences in both flows');
  assert(report.checks.currentAuthorityIgnoresRunStructure,'relation authority ignores run structure even though it is observable');
  assert(report.interpretation==='STAGE9_RELATION_AUTHORITY_FALSIFIED_FOR_RUN_STRUCTURE_ALIASING','Stage 9 establishes the need for a richer authority condition');

  await writeFile('reality-flow-authority-aliasing-kill-report.json',JSON.stringify(report,null,2));
} finally {
  if(browser) await browser.close();
  server.kill('SIGTERM');
}
