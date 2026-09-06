import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4176', '--bind', '127.0.0.1'], { stdio: 'ignore' });
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
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'),
    null,
    { timeout: 60000 }
  );

  const report = await page.evaluate(() => {
    const originalE = E;

    const traceRise = [0.10,0.13,0.17,0.22,0.28,0.34,0.40];
    const traceFall = [0.72,0.66,0.60,0.54,0.49,0.44,0.40];

    function makeWorld(trace, label) {
      E = { tick: 500, worlds: {}, paused: true };
      const S = mkW('full');
      E.worlds.full = S;
      S.danger = 0.40;
      S.realityTrace = trace.map((danger, i) => ({ t: 494 + i, danger }));
      S.realityTraceLabel = label;

      for (const P of S.parties) {
        P.target = 'road';
        P.relationHistory = [
          { t: 430, npc: '미라', place: 'market' },
          { t: 450, npc: '엘리', place: 'forest' }
        ];
        P.relationField.episodes = [{
          t: 450,
          key: ['미라','엘리'].sort().join('↔'),
          a: '미라',
          b: '엘리',
          places: ['market','forest'],
          from: [430,450]
        }];
        P.relationField.active = [];
      }
      return S;
    }

    function snapshot(S) {
      const P = S.parties[0];
      const rows = evalP(S, P, 1);
      const signature = sig(rows);
      return {
        danger: S.danger,
        target: P.target,
        currentPlace: currentPlace(P),
        trace: S.realityTrace,
        relationFieldActive: [...(P.relationField.active || [])],
        participants: [...participants(S, P, 1)].sort(),
        candidates: rows.map(r => r.id),
        signature
      };
    }

    const risingWorld = makeWorld(traceRise, 'rising-to-0.40');
    const rising = snapshot(risingWorld);
    const fallingWorld = makeWorld(traceFall, 'falling-to-0.40');
    const falling = snapshot(fallingWorld);

    const sameEndpoint = rising.danger === falling.danger && rising.target === falling.target && rising.currentPlace === falling.currentPlace;
    const oppositeFlow = traceRise[0] < traceRise.at(-1) && traceFall[0] > traceFall.at(-1);
    const sameActivation = JSON.stringify(rising.relationFieldActive) === JSON.stringify(falling.relationFieldActive);
    const sameParticipants = JSON.stringify(rising.participants) === JSON.stringify(falling.participants);
    const sameDecision = JSON.stringify(rising.signature) === JSON.stringify(falling.signature);

    E = originalE;

    return {
      question: 'Can MVP2 distinguish opposite reality trajectories when the current coordinate and stored relation episode are identical?',
      scope: 'Minimal falsification of path-sensitive Reality Flow. This does not claim all history-dependent agents fail.',
      rising,
      falling,
      checks: { sameEndpoint, oppositeFlow, sameActivation, sameParticipants, sameDecision },
      interpretation: sameEndpoint && oppositeFlow && sameActivation && sameParticipants && sameDecision
        ? 'MVP2_FALSIFIED_FOR_PATH_SENSITIVITY'
        : 'MVP2_SHOWED_PATH_SENSITIVITY_OR_TEST_NEEDS_REVIEW'
    };
  });

  console.log('\nSTAGE 2 — MVP2 SAME-COORDINATE / DIFFERENT-FLOW FALSIFICATION');
  console.log(JSON.stringify(report, null, 2));
  assert(report.checks.sameEndpoint, 'both worlds end at the same observable coordinate');
  assert(report.checks.oppositeFlow, 'the two worlds reach that coordinate through opposite trajectories');
  assert(report.checks.sameActivation, 'MVP2 activates the same relation field despite opposite trajectories');
  assert(report.checks.sameParticipants, 'MVP2 forms the same participant set despite opposite trajectories');
  assert(report.checks.sameDecision, 'MVP2 produces the same decision signature despite opposite trajectories');
  assert(report.interpretation === 'MVP2_FALSIFIED_FOR_PATH_SENSITIVITY', 'MVP2 path-sensitive Reality Flow requirement is falsified');

  await writeFile('reality-flow-mvp2-falsification-report.json', JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
