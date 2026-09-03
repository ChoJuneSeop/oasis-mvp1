import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '4174', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(`FAIL - ${msg}`); console.log(`PASS - ${msg}`); }

let browser;
try {
  await sleep(700);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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
    const OFFSETS = [0, 73, 251, 577, 911];
    const REGIMES = [
      { id: 'stable', label: 'stable-low-risk', initialDanger: .15, target: .15, noiseScale: .18, extra: .0015 },
      { id: 'change', label: 'moderate-change', initialDanger: .32, target: .38, noiseScale: 1.0, extra: .006 },
      { id: 'uncertain', label: 'high-uncertainty', initialDanger: .42, target: .45, noiseScale: 1.9, extra: .024 },
      { id: 'highRisk', label: 'high-risk', initialDanger: .76, target: .78, noiseScale: .75, extra: .008 }
    ];

    const episodeSig = ep => `${ep.key}|${(ep.places || []).join('>')}`;
    const fieldSigs = S => new Set(S.parties.flatMap(P => (P.relationField?.episodes || []).map(episodeSig)));

    function pulseFor(regime, tick, danger) {
      const base = env(tick).pulse * regime.noiseScale;
      const deterministic = (noise('responsibility-regime', regime.id, tick) - .5) * 2 * regime.extra;
      const periodic = regime.id === 'change' ? (Math.floor(tick / 90) % 2 ? regime.extra : -regime.extra) : 0;
      const shock = regime.id === 'uncertain' && noise('responsibility-shock', Math.floor(tick / 17), tick % 17) < .11
        ? (noise('responsibility-shock-dir', tick) - .5) * .12 : 0;
      const reversion = (regime.target - danger) * (regime.id === 'uncertain' ? .008 : .02);
      return base + deterministic + periodic + shock + reversion;
    }

    function topTargets(S, count) {
      const targets = [];
      for (const P of S.parties) {
        for (const r of evalP(S, P, 1)) {
          const id = r.id?.startsWith('hidden:') ? hiddenDefs.find(h => h.id === r.id.slice(7))?.places.at(-1) : r.id;
          if (id && places[id] && !targets.includes(id)) targets.push(id);
          if (targets.length >= count) return targets;
        }
      }
      return targets;
    }

    function runVirtual(seed, startTick, ticks, forcedTarget, regime) {
      const V = structuredClone(seed);
      if (forcedTarget) for (const P of V.parties) P.target = forcedTarget;
      let dangerAbsChange = 0;
      for (let j = 1; j <= ticks; j++) {
        const tick = startTick + j;
        E.tick = tick;
        const before = V.danger;
        tickW(V, { pulse: pulseFor(regime, tick, V.danger) });
        dangerAbsChange += Math.abs(V.danger - before);
      }
      return { V, dangerAbsChange };
    }

    function runArm(regime, branchCount, offset) {
      E = { tick: offset, worlds: {}, paused: true };
      const primary = mkW('full');
      primary.danger = regime.initialDanger;
      const proposals = new Set();
      let auxWorldTicks = 0;
      let primaryAbsChange = 0;
      let auxAbsChange = 0;
      let checkpoints = 0;
      let distinctTargets = 0;
      const branchTicks = TOTAL_AUX_PER_CHECKPOINT / branchCount;

      for (let t = 1; t <= TOTAL_REAL_TICKS; t++) {
        const tick = offset + t;
        E.tick = tick;
        const before = primary.danger;
        tickW(primary, { pulse: pulseFor(regime, tick, primary.danger) });
        primaryAbsChange += Math.abs(primary.danger - before);

        if (t >= CHECKPOINT_START && t % CHECKPOINT_EVERY === 0) {
          checkpoints++;
          const base = fieldSigs(primary);
          const targets = topTargets(primary, branchCount);
          distinctTargets += new Set(targets).size;
          for (let b = 0; b < branchCount; b++) {
            const forced = targets[b % Math.max(1, targets.length)];
            const out = runVirtual(primary, tick, branchTicks, forced, regime);
            auxWorldTicks += branchTicks;
            auxAbsChange += out.dangerAbsChange;
            for (const x of fieldSigs(out.V)) if (!base.has(x)) proposals.add(x);
          }
        }
      }

      return {
        regime: regime.id,
        offset,
        branchCount,
        branchTicks,
        realTicks: TOTAL_REAL_TICKS,
        auxWorldTicks,
        relationPossibilities: proposals.size,
        meanDistinctTargets: checkpoints ? distinctTargets / checkpoints : 0,
        meanPrimaryDanger: primary.danger,
        primaryChangeIntensity: primaryAbsChange / TOTAL_REAL_TICKS,
        auxChangeIntensity: auxWorldTicks ? auxAbsChange / auxWorldTicks : 0,
        primaryActions: primary.c.actions,
        primaryRelationEpisodes: fieldSigs(primary).size,
        proposalSignatures: [...proposals].sort()
      };
    }

    const regimes = REGIMES.map(regime => {
      const trials = OFFSETS.map(offset => {
        const arms = BRANCH_COUNTS.map(n => runArm(regime, n, offset));
        return { offset, arms };
      });
      const aggregate = BRANCH_COUNTS.map(branchCount => {
        const arms = trials.map(t => t.arms.find(a => a.branchCount === branchCount));
        const mean = key => arms.reduce((s, a) => s + a[key], 0) / arms.length;
        return {
          branchCount,
          branchTicks: TOTAL_AUX_PER_CHECKPOINT / branchCount,
          meanRelationPossibilities: mean('relationPossibilities'),
          meanDistinctTargets: mean('meanDistinctTargets'),
          meanPrimaryDanger: mean('meanPrimaryDanger'),
          meanPrimaryChangeIntensity: mean('primaryChangeIntensity'),
          meanAuxChangeIntensity: mean('auxChangeIntensity')
        };
      });
      const bestValue = Math.max(...aggregate.map(a => a.meanRelationPossibilities));
      const bestWidths = aggregate.filter(a => a.meanRelationPossibilities === bestValue).map(a => a.branchCount);
      return { regime, trials, aggregate, bestRelationValue: bestValue, bestWidths };
    });

    E = originalE;
    actionableIds = originalActionable;

    return {
      design: {
        question: 'Does the best width/depth allocation for parallel OASIS relation exploration change with environmental stability, uncertainty, and risk under the same total auxiliary compute budget?',
        branchCounts: BRANCH_COUNTS,
        offsets: OFFSETS,
        totalAuxPerCheckpoint: TOTAL_AUX_PER_CHECKPOINT,
        allocationRule: 'Total auxiliary ticks stay fixed. More branches mean less depth per branch.',
        regimeRule: 'Controlled deterministic danger-flow regimes vary low-risk stability, moderate change, high uncertainty, and high sustained risk.',
        noAssumption: 'The experiment does not assume that higher risk should use more branches; the observed best width is reported as-is.'
      },
      regimes
    };
  });

  console.log('\nOASIS RESPONSIBILITY-AWARE DYNAMIC COMPUTE ALLOCATION EXPERIMENT');
  for (const r of report.regimes) {
    console.log(`REGIME ${r.regime.label} bestWidths=${r.bestWidths.join(',')} bestMeanRel=${r.bestRelationValue.toFixed(2)}`);
    for (const row of r.aggregate) {
      console.log(`  branches=${row.branchCount} depth=${row.branchTicks} meanRel=${row.meanRelationPossibilities.toFixed(2)} targets=${row.meanDistinctTargets.toFixed(2)} danger=${row.meanPrimaryDanger.toFixed(3)} change=${row.meanPrimaryChangeIntensity.toFixed(4)}`);
    }
    for (const t of r.trials) {
      for (const arm of t.arms) {
        assert(arm.auxWorldTicks === t.arms[0].auxWorldTicks, `${r.regime.id} offset ${t.offset} branches ${arm.branchCount}: auxiliary compute matched`);
        assert(arm.realTicks === t.arms[0].realTicks, `${r.regime.id} offset ${t.offset} branches ${arm.branchCount}: real ticks matched`);
        assert(arm.primaryActions > 0, `${r.regime.id} offset ${t.offset} branches ${arm.branchCount}: primary OASIS acted`);
      }
    }
  }

  const bestSequence = report.regimes.map(r => `${r.regime.id}:${r.bestWidths.join('/')}`).join(' -> ');
  console.log(`BEST WIDTH SEQUENCE ${bestSequence}`);
  console.log('RESULT: dynamic allocation experiment completed without assuming monotonic scaling or a predetermined risk policy.');
  await writeFile('responsibility-allocation-report.json', JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
