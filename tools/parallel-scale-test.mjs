import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.title.includes('Dual Comparison Laboratory') && document.getElementById('relationFieldCard'), null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const originalE = E;
    const originalActionable = actionableIds;
    actionableIds = function(S, P, use = 1) {
      const here = currentPlace(P);
      const ids = Object.keys(places);
      const other = ids.filter(id => id !== here);
      return other.length ? other : ids;
    };

    const TOTAL_REAL_TICKS = 4000;
    const CHECKPOINT_START = 1000;
    const CHECKPOINT_EVERY = 500;
    const TOTAL_AUX_PER_CHECKPOINT = 480;
    const BRANCH_COUNTS = [1, 2, 4, 8, 16];
    const CONDITION_OFFSETS = [0, 73, 251, 577, 911];

    const episodeSig = ep => `${ep.key}|${(ep.places || []).join('>')}`;
    const fieldSigs = S => new Set(S.parties.flatMap(P => (P.relationField?.episodes || []).map(episodeSig)));
    const hiddenSigs = S => new Set(S.parties.flatMap(P => [...P.hiddenCandidates, ...P.hiddenDone]));
    const choiceSigs = S => new Set(S.parties.flatMap(P => P.choiceHistory.slice(-40).map(x => x.target)));

    function topTargets(S, count) {
      const targets = [];
      for (const P of S.parties) {
        const rows = evalP(S, P, 1);
        for (const r of rows) {
          const id = r.id?.startsWith('hidden:') ? hiddenDefs.find(h => h.id === r.id.slice(7))?.places.at(-1) : r.id;
          if (id && places[id] && !targets.includes(id)) targets.push(id);
          if (targets.length >= count) return targets;
        }
      }
      return targets;
    }

    function runVirtual(seed, startEnvTick, ticks, forcedTarget) {
      const V = structuredClone(seed);
      if (forcedTarget) for (const P of V.parties) P.target = forcedTarget;
      for (let j = 1; j <= ticks; j++) {
        E.tick = startEnvTick + j;
        tickW(V, env(E.tick));
      }
      return V;
    }

    function runScenario(branchCount, offset) {
      E = { tick: offset, worlds: {}, paused: true };
      const primary = mkW('full');
      const proposals = new Set();
      const hiddenProposals = new Set();
      const actionProposals = new Set();
      let auxWorldTicks = 0;
      let checkpoints = 0;
      let totalDistinctTargets = 0;
      const branchTicks = TOTAL_AUX_PER_CHECKPOINT / branchCount;

      for (let t = 1; t <= TOTAL_REAL_TICKS; t++) {
        const envTick = offset + t;
        E.tick = envTick;
        tickW(primary, env(envTick));

        if (t >= CHECKPOINT_START && t % CHECKPOINT_EVERY === 0) {
          checkpoints++;
          const baseField = fieldSigs(primary);
          const baseHidden = hiddenSigs(primary);
          const baseChoices = choiceSigs(primary);
          const targets = topTargets(primary, branchCount);
          totalDistinctTargets += new Set(targets).size;

          for (let b = 0; b < branchCount; b++) {
            const forced = targets[b % Math.max(1, targets.length)];
            const V = runVirtual(primary, envTick, branchTicks, forced);
            auxWorldTicks += branchTicks;
            for (const x of fieldSigs(V)) if (!baseField.has(x)) proposals.add(x);
            for (const x of hiddenSigs(V)) if (!baseHidden.has(x)) hiddenProposals.add(x);
            for (const x of choiceSigs(V)) if (!baseChoices.has(x)) actionProposals.add(x);
          }
        }
      }

      return {
        offset,
        branchCount,
        branchTicks,
        realTicks: TOTAL_REAL_TICKS,
        auxWorldTicks,
        checkpoints,
        meanDistinctTargetsPerCheckpoint: checkpoints ? totalDistinctTargets / checkpoints : 0,
        relationPossibilities: proposals.size,
        hiddenPossibilities: hiddenProposals.size,
        actionPossibilities: actionProposals.size,
        proposalSignatures: [...proposals].sort()
      };
    }

    const conditions = CONDITION_OFFSETS.map(offset => {
      const arms = BRANCH_COUNTS.map(branchCount => runScenario(branchCount, offset));
      const baseline = arms[0];
      for (const arm of arms) {
        arm.exclusiveVsOne = arm.proposalSignatures.filter(x => !baseline.proposalSignatures.includes(x)).length;
        arm.missingVsOne = baseline.proposalSignatures.filter(x => !arm.proposalSignatures.includes(x)).length;
      }
      return { offset, arms };
    });

    E = originalE;
    actionableIds = originalActionable;

    const aggregate = BRANCH_COUNTS.map(branchCount => {
      const arms = conditions.map(c => c.arms.find(a => a.branchCount === branchCount));
      const mean = key => arms.reduce((n, a) => n + a[key], 0) / arms.length;
      return {
        branchCount,
        branchTicks: TOTAL_AUX_PER_CHECKPOINT / branchCount,
        meanRelationPossibilities: mean('relationPossibilities'),
        meanHiddenPossibilities: mean('hiddenPossibilities'),
        meanActionPossibilities: mean('actionPossibilities'),
        meanExclusiveVsOne: mean('exclusiveVsOne'),
        meanMissingVsOne: mean('missingVsOne'),
        meanDistinctTargetsPerCheckpoint: mean('meanDistinctTargetsPerCheckpoint'),
        relationWinsVsOne: arms.filter((a, i) => a.relationPossibilities > conditions[i].arms[0].relationPossibilities).length,
        relationTiesVsOne: arms.filter((a, i) => a.relationPossibilities === conditions[i].arms[0].relationPossibilities).length,
        relationLossesVsOne: arms.filter((a, i) => a.relationPossibilities < conditions[i].arms[0].relationPossibilities).length
      };
    });

    return {
      design: {
        question: 'As the number of independent parallel OASIS relationship trajectories increases under a fixed total auxiliary compute budget, how do relation-process novelty, coverage, and saturation change?',
        branchCounts: BRANCH_COUNTS,
        conditionOffsets: CONDITION_OFFSETS,
        totalAuxPerCheckpoint: TOTAL_AUX_PER_CHECKPOINT,
        computeRule: 'Total auxiliary world ticks are fixed; increasing branch count shortens each branch proportionally.',
        realityRule: 'Only the primary OASIS forms confirmed reality. Parallel branches remain possibility-only.'
      },
      conditions,
      aggregate
    };
  });

  console.log('\nOASIS EQUAL-COMPUTE PARALLEL RELATION SCALING EXPERIMENT');
  for (const row of report.aggregate) {
    console.log(`branches=${row.branchCount} ticksPerBranch=${row.branchTicks} meanRel=${row.meanRelationPossibilities.toFixed(2)} meanExclusiveVs1=${row.meanExclusiveVsOne.toFixed(2)} meanMissingVs1=${row.meanMissingVsOne.toFixed(2)} meanTargets=${row.meanDistinctTargetsPerCheckpoint.toFixed(2)} W/T/Lvs1=${row.relationWinsVsOne}/${row.relationTiesVsOne}/${row.relationLossesVsOne}`);
  }
  for (const c of report.conditions) {
    for (const arm of c.arms) {
      assert(arm.auxWorldTicks === c.arms[0].auxWorldTicks, `offset ${c.offset}, branches ${arm.branchCount}: auxiliary compute matched`);
      assert(arm.realTicks === c.arms[0].realTicks, `offset ${c.offset}, branches ${arm.branchCount}: real ticks matched`);
    }
  }

  await writeFile('parallel-scale-report.json', JSON.stringify(report, null, 2));
  console.log('RESULT: scaling experiment completed without assuming monotonic improvement from more parallel branches.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

await import('./responsibility-allocation-test.mjs');
