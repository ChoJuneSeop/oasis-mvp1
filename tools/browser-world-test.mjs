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

  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();
  await page.locator('#reset').click();
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  // Fair-comparison lock: every group receives the same observable access set.
  // OASIS-specific differences may then arise only from relation/participation/feedback structure,
  // not from one group simply being denied a place that another group can observe.
  await page.evaluate(() => {
    window.__OASIS_ORIGINAL_ACTIONABLE__ = actionableIds;
    actionableIds = function(S, P, use = 1) {
      const here = currentPlace(P);
      const ids = Object.keys(places);
      const other = ids.filter(id => id !== here);
      return other.length ? other : ids;
    };
  });

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
          relationHistory: P.relationHistory.map(x => ({ ...x })),
          choices: P.choiceHistory.map(x => ({ ...x })),
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
  const matched = ['full', 'norel', 'nofb', 'static', 'rule', 'utility', 'qlite', 'retrieval'].map(k => report.worlds[k]);
  const sumRelations = world => world.parties.reduce((n, p) => n + p.relationHistory.length, 0);
  const sumChoices = world => world.parties.reduce((n, p) => n + p.choices.length, 0);
  const hiddenDone = world => world.parties.reduce((n, p) => n + p.hiddenDone.length, 0);

  console.log('\nOASIS MATCHED-CONDITION ACTUAL ENGINE TEST');
  console.log(`actual world ticks: ${report.tick}`);
  console.log('fairness lock: identical place/action access for every comparison group');
  for (const w of matched) {
    console.log(`${w.name}: actions=${w.counters.actions} choices=${sumChoices(w)} rel=${sumRelations(w)} spiral=${w.spiral} hiddenDone=${hiddenDone(w)} path(gen/cand/sel/real/chg)=${w.counters.pathGenerated||0}/${w.counters.pathCandidate||0}/${w.counters.pathSelected||0}/${w.counters.pathRealized||0}/${w.counters.pathChanged||0}`);
  }

  assert(report.tick >= 3000, 'actual browser world advanced by explicit matched ticks');
  assert(full.counters.actions > 0, 'OASIS-Full performed autonomous actions');
  assert(sumRelations(full) > 0, 'OASIS-Full formed relationship-process history');
  assert(sumRelations(norel) === 0, 'NoRelation differs only by removing relationship history use');
  assert(nofb.counters.exp === 0 && nofb.counters.decision === 0, 'NoFeedback prevents outcome feedback into later judgment');
  assert(matched.every(w => w.counters.actions > 0), 'all comparison groups received executable opportunities under matched access');
  assert(matched.every(w => sumChoices(w) <= w.counters.actions), 'all groups preserve bounded single-choice histories');

  const fullHidden = hiddenDone(full);
  const noRelHidden = hiddenDone(norel);
  console.log(`OASIS-specific contrast: hidden completed full=${fullHidden}, noRelation=${noRelHidden}`);
  console.log(`OASIS-specific contrast: relation history full=${sumRelations(full)}, noRelation=${sumRelations(norel)}`);
  console.log(`OASIS-specific contrast: participationTransition full=${full.counters.participationTransition||0}, noRelation=${norel.counters.participationTransition||0}`);
  console.log(`OASIS-specific contrast: structuralExpansion full=${full.counters.structuralExpansion||0}, noRelation=${norel.counters.structuralExpansion||0}`);
  console.log(`OASIS-specific contrast: choiceTransition full=${full.counters.choiceTransition||0}, noRelation=${norel.counters.choiceTransition||0}`);
  console.log(`OASIS-specific contrast: relationSpiral full=${full.counters.relationSpiral||0}, noRelation=${norel.counters.relationSpiral||0}`);

  await writeFile('browser-world-report.json', JSON.stringify({
    design: {
      matchedConditions: ['same initial world', 'same environment tape', 'same tick budget', 'same places/action access'],
      primaryContrast: 'OASIS-Full vs NoRelation',
      interpretation: 'isolate relationship-process contribution without access advantage'
    },
    ...report
  }, null, 2));
  console.log('RESULT: real engine executed under matched access; interpret Full-vs-NoRelation differences as the primary OASIS-specific structural contrast, not as general superiority.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
