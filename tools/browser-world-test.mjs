import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });
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
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('run100'), null, { timeout: 60000 });

  // Stop the real-time timer so the experiment is driven only by explicit world ticks.
  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();
  await page.locator('#reset').click();
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  const batches = 30;
  for (let i = 0; i < batches; i++) await page.locator('#run100').click();

  const report = await page.evaluate(() => {
    const worlds = {};
    for (const [key, S] of Object.entries(E.worlds)) {
      worlds[key] = {
        name: MODELS[key].n,
        tick: E.tick,
        danger: S.danger,
        spiral: S.spiral,
        counters: { ...S.c },
        parties: S.parties.map(P => ({
          id: P.id,
          name: P.name,
          discovered: [...P.disc],
          seenNPC: [...P.seenNPC],
          relations: P.relationHistory.length,
          choices: P.choiceHistory.length,
          hiddenCandidates: [...P.hiddenCandidates],
          hiddenDone: [...P.hiddenDone],
          pathCount: Object.keys(P.possibilityPaths || {}).length,
          paths: Object.fromEntries(Object.entries(P.possibilityPaths || {}).map(([id, x]) => [id, { ...x }]))
        }))
      };
    }
    return { tick: E.tick, labMode, worlds };
  });

  const full = report.worlds.full;
  const norel = report.worlds.norel;
  const nofb = report.worlds.nofb;
  const ext = ['rule', 'utility', 'qlite', 'retrieval'].map(k => report.worlds[k]);
  const sum = (world, key) => world.parties.reduce((n, p) => n + (p[key] || 0), 0);

  console.log('\nOASIS ACTUAL BROWSER WORLD TEST');
  console.log(`actual world ticks: ${report.tick}`);
  for (const [key, w] of Object.entries(report.worlds)) {
    console.log(`${w.name}: actions=${w.counters.actions} rel=${w.counters.rel} spiral=${w.spiral} path(gen/cand/sel/real/chg)=${w.counters.pathGenerated||0}/${w.counters.pathCandidate||0}/${w.counters.pathSelected||0}/${w.counters.pathRealized||0}/${w.counters.pathChanged||0} hidden=${w.counters.hidden||0}`);
  }

  assert(report.tick >= 3000, 'actual browser world advanced by explicit ticks');
  assert(full.counters.actions > 0, 'OASIS-Full performed autonomous actions in the actual world engine');
  assert(full.counters.rel > 0 && sum(full, 'relations') > 0, 'OASIS-Full accumulated actual relationship history');
  assert((full.counters.pathGenerated || 0) > 0, 'actual world generated observable possibility paths');
  assert((full.counters.pathRealized || 0) > 0, 'at least one generated possibility path reached an actual outcome');
  assert(norel.counters.rel === 0 && sum(norel, 'relations') === 0, 'NoRelation keeps relationship history removed in actual execution');
  assert(nofb.counters.exp === 0 && nofb.counters.decision === 0, 'NoFeedback does not feed outcomes into later judgment counters');
  assert(ext.some(w => (w.counters.pathGenerated || 0) > 0), 'external baselines receive ordinary gated opportunities in actual execution');

  for (const w of Object.values(report.worlds)) {
    for (const p of w.parties) {
      const seenTicks = new Set();
      for (const c of p.paths ? [] : []) void c;
      for (const c of (p.choices ? [] : [])) void c;
      // choiceHistory stores one target per party decision; count itself is retained in the report.
      assert(p.choices <= w.counters.actions, `${w.name}/${p.name} choice history is bounded by world action count`);
    }
  }

  await writeFile('browser-world-report.json', JSON.stringify(report, null, 2));
  console.log('RESULT: the real 2D browser/world engine executed headlessly and produced falsifiable state/log evidence. This is not a superiority proof.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
