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
    const PARALLEL_BRANCHES = 4;
    const BRANCH_TICKS = TOTAL_AUX_PER_CHECKPOINT / PARALLEL_BRANCHES;
    const CONDITION_OFFSETS = [0, 73, 149, 251, 389, 577, 911];

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

    function runScenario(mode, offset) {
      E = { tick: offset, worlds: {}, paused: true };
      const primary = mkW('full');
      const proposals = new Set();
      const hiddenProposals = new Set();
      const actionProposals = new Set();
      let auxWorldTicks = 0;
      let checkpoints = 0;

      for (let t = 1; t <= TOTAL_REAL_TICKS; t++) {
        const envTick = offset + t;
        E.tick = envTick;
        tickW(primary, env(envTick));

        if (t >= CHECKPOINT_START && t % CHECKPOINT_EVERY === 0) {
          checkpoints++;
          const baseField = fieldSigs(primary);
          const baseHidden = hiddenSigs(primary);
          const baseChoices = choiceSigs(primary);
          const targets = topTargets(primary, PARALLEL_BRANCHES);
          const branches = [];

          if (mode === 'computeOnlySingle') {
            branches.push(runVirtual(primary, envTick, TOTAL_AUX_PER_CHECKPOINT, targets[0]));
            auxWorldTicks += TOTAL_AUX_PER_CHECKPOINT;
          } else {
            for (let b = 0; b < PARALLEL_BRANCHES; b++) {
              const forced = targets[b % Math.max(1, targets.length)];
              branches.push(runVirtual(primary, envTick, BRANCH_TICKS, forced));
              auxWorldTicks += BRANCH_TICKS;
            }
          }

          for (const V of branches) {
            for (const x of fieldSigs(V)) if (!baseField.has(x)) proposals.add(x);
            for (const x of hiddenSigs(V)) if (!baseHidden.has(x)) hiddenProposals.add(x);
            for (const x of choiceSigs(V)) if (!baseChoices.has(x)) actionProposals.add(x);
          }
        }
      }

      return {
        mode,
        offset,
        realTicks: TOTAL_REAL_TICKS,
        auxWorldTicks,
        checkpoints,
        primaryActions: primary.c.actions,
        primaryRelations: primary.parties.reduce((n, P) => n + P.relationHistory.length, 0),
        primaryFieldEpisodes: primary.parties.reduce((n, P) => n + (P.relationField?.episodes.length || 0), 0),
        primaryFieldUniqueProcesses: fieldSigs(primary).size,
        primaryFieldSpirals: primary.parties.reduce((n, P) => n + (P.relationField?.spirals || 0), 0),
        auxiliaryRelationPossibilities: proposals.size,
        auxiliaryHiddenPossibilities: hiddenProposals.size,
        auxiliaryActionPossibilities: actionProposals.size,
        proposalSignatures: [...proposals].sort()
      };
    }

    const trials = CONDITION_OFFSETS.map(offset => {
      const single = runScenario('computeOnlySingle', offset);
      const parallel = runScenario('parallel', offset);
      const exclusiveParallel = parallel.proposalSignatures.filter(x => !single.proposalSignatures.includes(x));
      const exclusiveSingle = single.proposalSignatures.filter(x => !parallel.proposalSignatures.includes(x));
      return {
        offset,
        single,
        parallel,
        difference: {
          relationPossibilities: parallel.auxiliaryRelationPossibilities - single.auxiliaryRelationPossibilities,
          hiddenPossibilities: parallel.auxiliaryHiddenPossibilities - single.auxiliaryHiddenPossibilities,
          actionPossibilities: parallel.auxiliaryActionPossibilities - single.auxiliaryActionPossibilities,
          exclusiveParallel: exclusiveParallel.length,
          exclusiveSingle: exclusiveSingle.length
        }
      };
    });

    E = originalE;
    actionableIds = originalActionable;

    const sum = key => trials.reduce((n, r) => n + r.difference[key], 0);
    const wins = trials.filter(r => r.difference.relationPossibilities > 0).length;
    const ties = trials.filter(r => r.difference.relationPossibilities === 0).length;
    const losses = trials.filter(r => r.difference.relationPossibilities < 0).length;
    const exclusiveWins = trials.filter(r => r.difference.exclusiveParallel > r.difference.exclusiveSingle).length;
    const anyParallelNovelty = trials.filter(r => r.difference.exclusiveParallel > 0).length;

    return {
      design: {
        question: 'Across multiple matched environment phases, does logical parallel OASIS repeatedly expose relation-process possibilities beyond an equal-compute single trajectory?',
        conditionOffsets: CONDITION_OFFSETS,
        realTicksPerCondition: TOTAL_REAL_TICKS,
        computeLock: `each condition gives both arms ${TOTAL_AUX_PER_CHECKPOINT} auxiliary ticks per checkpoint`,
        singleControl: `1 trajectory x ${TOTAL_AUX_PER_CHECKPOINT}`,
        parallelTreatment: `${PARALLEL_BRANCHES} trajectories x ${BRANCH_TICKS}`,
        realityRule: 'Only primary reality forms confirmed experience; auxiliary trajectories remain possibility-only.'
      },
      trials,
      aggregate: {
        conditions: trials.length,
        relationWins: wins,
        relationTies: ties,
        relationLosses: losses,
        exclusiveParallelWins: exclusiveWins,
        conditionsWithParallelNovelty: anyParallelNovelty,
        totalRelationDifference: sum('relationPossibilities'),
        totalExclusiveParallel: trials.reduce((n, r) => n + r.difference.exclusiveParallel, 0),
        totalExclusiveSingle: trials.reduce((n, r) => n + r.difference.exclusiveSingle, 0),
        totalHiddenDifference: sum('hiddenPossibilities'),
        totalActionDifference: sum('actionPossibilities')
      }
    };
  });

  console.log('\nOASIS MULTI-CONDITION EQUAL-COMPUTE PARALLEL ROBUSTNESS EXPERIMENT');
  for (const r of report.trials) {
    console.log(`offset=${r.offset} singleRel=${r.single.auxiliaryRelationPossibilities} parallelRel=${r.parallel.auxiliaryRelationPossibilities} diff=${r.difference.relationPossibilities} exclusiveP=${r.difference.exclusiveParallel} exclusiveS=${r.difference.exclusiveSingle} hiddenDiff=${r.difference.hiddenPossibilities} actionDiff=${r.difference.actionPossibilities}`);
    assert(r.single.auxWorldTicks === r.parallel.auxWorldTicks, `offset ${r.offset}: auxiliary compute exactly matched`);
    assert(r.single.realTicks === r.parallel.realTicks, `offset ${r.offset}: primary real ticks exactly matched`);
    assert(r.single.primaryActions > 0 && r.parallel.primaryActions > 0, `offset ${r.offset}: primary OASIS acts in both conditions`);
  }
  console.log(`AGGREGATE relation wins/ties/losses=${report.aggregate.relationWins}/${report.aggregate.relationTies}/${report.aggregate.relationLosses}`);
  console.log(`AGGREGATE totalRelationDifference=${report.aggregate.totalRelationDifference} totalExclusiveParallel=${report.aggregate.totalExclusiveParallel} totalExclusiveSingle=${report.aggregate.totalExclusiveSingle}`);
  console.log(`AGGREGATE parallelNoveltyConditions=${report.aggregate.conditionsWithParallelNovelty}/${report.aggregate.conditions} exclusiveParallelWins=${report.aggregate.exclusiveParallelWins}/${report.aggregate.conditions}`);
  console.log(`AGGREGATE hiddenDifference=${report.aggregate.totalHiddenDifference} actionDifference=${report.aggregate.totalActionDifference}`);

  await writeFile('parallel-oasis-report.json', JSON.stringify(report, null, 2));
  console.log('RESULT: robustness experiment completed without assuming that parallel must win.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
