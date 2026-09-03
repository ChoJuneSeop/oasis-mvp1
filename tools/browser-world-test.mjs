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
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('run100') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const toggle = page.locator('#toggle');
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();
  await page.locator('#reset').click();
  if ((await toggle.textContent())?.includes('일시정지')) await toggle.click();

  // Fair-comparison lock: all groups receive identical place/action access.
  // The primary contrast therefore isolates OASIS relationship-process use rather than access privilege.
  await page.evaluate(() => {
    window.__OASIS_ORIGINAL_ACTIONABLE__ = actionableIds;
    actionableIds = function(S, P, use = 1) {
      const here = currentPlace(P);
      const ids = Object.keys(places);
      const other = ids.filter(id => id !== here);
      return other.length ? other : ids;
    };
  });

  const batches = 40;
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
          relationField: P.relationField ? {
            episodes: P.relationField.episodes.map(x => ({ ...x })),
            active: [...P.relationField.active],
            activations: P.relationField.activations,
            recombinations: P.relationField.recombinations,
            spirals: P.relationField.spirals,
            lastActivationTick: P.relationField.lastActivationTick
          } : null,
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
  const fieldEpisodes = world => world.parties.reduce((n, p) => n + (p.relationField?.episodes.length || 0), 0);
  const fieldActivations = world => world.parties.reduce((n, p) => n + (p.relationField?.activations || 0), 0);
  const fieldSpirals = world => world.parties.reduce((n, p) => n + (p.relationField?.spirals || 0), 0);

  console.log('\nOASIS MATCHED-CONDITION ACTIVE RELATION-FIELD TEST');
  console.log(`actual world ticks: ${report.tick}`);
  console.log('fairness lock: identical place/action access for every comparison group');
  for (const w of matched) {
    console.log(`${w.name}: actions=${w.counters.actions} choices=${sumChoices(w)} rel=${sumRelations(w)} fieldEpisodes=${fieldEpisodes(w)} fieldAct=${fieldActivations(w)} fieldSpiral=${fieldSpirals(w)} hiddenDone=${hiddenDone(w)} path=${w.counters.pathGenerated||0}/${w.counters.pathCandidate||0}/${w.counters.pathSelected||0}/${w.counters.pathRealized||0}/${w.counters.pathChanged||0}`);
  }

  assert(report.tick >= 4000, 'actual browser world advanced by explicit matched ticks');
  assert(full.counters.actions > 0, 'OASIS-Full performed autonomous actions');
  assert(sumRelations(full) > 0, 'OASIS-Full formed relationship-process history');
  assert(fieldEpisodes(full) > 0 && (full.counters.relationRecombination || 0) > 0, 'OASIS-Full recombined completed relationship experiences into the relation field');
  assert(fieldActivations(full) > 0 && (full.counters.relationFieldActivation || 0) > 0, 'relation field was actively reactivated by the present flow');
  assert(sumRelations(norel) === 0 && fieldEpisodes(norel) === 0, 'NoRelation cannot form or recombine the OASIS relation field');
  assert(nofb.counters.exp === 0 && nofb.counters.decision === 0, 'NoFeedback prevents outcome feedback into later judgment');
  assert(matched.every(w => w.counters.actions > 0), 'all comparison groups received executable opportunities under matched access');
  assert(matched.every(w => sumChoices(w) <= w.counters.actions), 'all groups preserve bounded single-choice histories');

  console.log(`OASIS-specific contrast: field recombinations full=${full.counters.relationRecombination||0}, noRelation=${norel.counters.relationRecombination||0}`);
  console.log(`OASIS-specific contrast: field activations full=${full.counters.relationFieldActivation||0}, noRelation=${norel.counters.relationFieldActivation||0}`);
  console.log(`OASIS-specific contrast: hidden completed full=${hiddenDone(full)}, noRelation=${hiddenDone(norel)}`);
  console.log(`OASIS-specific contrast: participationTransition full=${full.counters.participationTransition||0}, noRelation=${norel.counters.participationTransition||0}`);
  console.log(`OASIS-specific contrast: structuralExpansion full=${full.counters.structuralExpansion||0}, noRelation=${norel.counters.structuralExpansion||0}`);
  console.log(`OASIS-specific contrast: choiceTransition full=${full.counters.choiceTransition||0}, noRelation=${norel.counters.choiceTransition||0}`);
  console.log(`OASIS-specific contrast: relationFieldSpiral full=${full.counters.relationFieldSpiral||0}, noRelation=${norel.counters.relationFieldSpiral||0}`);

  await writeFile('browser-world-report.json', JSON.stringify({
    design: {
      matchedConditions: ['same initial world', 'same environment tape', 'same tick budget', 'same places/action access'],
      primaryContrast: 'OASIS-Full vs NoRelation',
      relationFieldMechanism: ['completed relationship experiences', 'cross-experience recombination', 'present-flow reactivation', 'participation/ranking influence', 'hidden possibility generation', 'single realized action', 'feedback to next judgment'],
      interpretation: 'isolate active OASIS relation-field contribution without access advantage'
    },
    ...report
  }, null, 2));
  console.log('RESULT: real engine executed with an actively used relation field under matched access. This remains a structural contrast, not a general superiority claim.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
