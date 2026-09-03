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
    // This test asks one narrow question:
    // With the SAME total auxiliary world-tick budget, does keeping several independent
    // OASIS relationship trajectories expose relation-process possibilities that merely
    // running one OASIS trajectory longer does not?
    // Auxiliary trajectories never write their simulated experiences into primary reality.

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

    function runVirtual(seed, startTick, ticks, forcedTarget) {
      const V = structuredClone(seed);
      if (forcedTarget) for (const P of V.parties) P.target = forcedTarget;
      for (let j = 1; j <= ticks; j++) {
        E.tick = startTick + j;
        tickW(V, env(E.tick));
      }
      return V;
    }

    function runScenario(mode) {
      E = { tick: 0, worlds: {}, paused: true };
      const primary = mkW('full');
      const proposals = new Set();
      const hiddenProposals = new Set();
      const actionProposals = new Set();
      let auxWorldTicks = 0;
      let checkpoints = 0;
      const checkpointRows = [];

      for (let t = 1; t <= TOTAL_REAL_TICKS; t++) {
        E.tick = t;
        tickW(primary, env(t));

        if (t >= CHECKPOINT_START && t % CHECKPOINT_EVERY === 0) {
          checkpoints++;
          const baseField = fieldSigs(primary);
          const baseHidden = hiddenSigs(primary);
          const baseChoices = choiceSigs(primary);
          const before = proposals.size;
          const targets = topTargets(primary, PARALLEL_BRANCHES);
          const branches = [];

          if (mode === 'computeOnlySingle') {
            const forced = targets[0];
            branches.push(runVirtual(primary, t, TOTAL_AUX_PER_CHECKPOINT, forced));
            auxWorldTicks += TOTAL_AUX_PER_CHECKPOINT;
          } else if (mode === 'parallel') {
            for (let b = 0; b < PARALLEL_BRANCHES; b++) {
              const forced = targets[b % Math.max(1, targets.length)];
              branches.push(runVirtual(primary, t, BRANCH_TICKS, forced));
              auxWorldTicks += BRANCH_TICKS;
            }
          }

          for (const V of branches) {
            for (const x of fieldSigs(V)) if (!baseField.has(x)) proposals.add(x);
            for (const x of hiddenSigs(V)) if (!baseHidden.has(x)) hiddenProposals.add(x);
            for (const x of choiceSigs(V)) if (!baseChoices.has(x)) actionProposals.add(x);
          }

          checkpointRows.push({
            tick: t,
            primaryField: baseField.size,
            newRelationPossibilitiesThisCheckpoint: proposals.size - before,
            cumulativeRelationPossibilities: proposals.size,
            branchTargets: mode === 'parallel' ? targets.slice(0, PARALLEL_BRANCHES) : targets.slice(0, 1)
          });
        }
      }

      E.tick = TOTAL_REAL_TICKS;
      return {
        mode,
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
        proposalSignatures: [...proposals].sort(),
        checkpointRows
      };
    }

    const single = runScenario('computeOnlySingle');
    const parallel = runScenario('parallel');
    E = originalE;
    actionableIds = originalActionable;

    const exclusiveParallel = parallel.proposalSignatures.filter(x => !single.proposalSignatures.includes(x));
    const exclusiveSingle = single.proposalSignatures.filter(x => !parallel.proposalSignatures.includes(x));
    return {
      design: {
        question: 'Does logical parallel OASIS expand relation-process possibility space beyond merely giving one OASIS more compute?',
        realityRule: 'Only the primary OASIS acts in reality. Auxiliary trajectories are counterfactual explorers; their simulated experiences are never written into primary relation history.',
        computeLock: 'Both conditions receive exactly the same auxiliary world-tick budget at the same checkpoints.',
        singleControl: `one auxiliary trajectory x ${TOTAL_AUX_PER_CHECKPOINT} ticks per checkpoint`,
        parallelTreatment: `${PARALLEL_BRANCHES} independent trajectories x ${BRANCH_TICKS} ticks per checkpoint`,
        branchRule: 'Parallel branches start from the same primary present but commit to distinct currently available targets before continuing independently.',
        successCriterion: 'Parallel must expose relation-process possibilities absent from the equal-compute single trajectory; raw candidate/action count alone is not sufficient.'
      },
      single,
      parallel,
      exclusiveParallel,
      exclusiveSingle,
      difference: {
        relationPossibilities: parallel.auxiliaryRelationPossibilities - single.auxiliaryRelationPossibilities,
        hiddenPossibilities: parallel.auxiliaryHiddenPossibilities - single.auxiliaryHiddenPossibilities,
        actionPossibilities: parallel.auxiliaryActionPossibilities - single.auxiliaryActionPossibilities,
        exclusiveParallel: exclusiveParallel.length,
        exclusiveSingle: exclusiveSingle.length
      }
    };
  });

  console.log('\nOASIS EQUAL-COMPUTE PARALLEL RELATION-FIELD EXPERIMENT');
  console.log(`compute-only single: auxTicks=${report.single.auxWorldTicks} relationPossibilities=${report.single.auxiliaryRelationPossibilities} hidden=${report.single.auxiliaryHiddenPossibilities} actions=${report.single.auxiliaryActionPossibilities}`);
  console.log(`parallel OASIS:      auxTicks=${report.parallel.auxWorldTicks} relationPossibilities=${report.parallel.auxiliaryRelationPossibilities} hidden=${report.parallel.auxiliaryHiddenPossibilities} actions=${report.parallel.auxiliaryActionPossibilities}`);
  console.log(`exclusive relation-process possibilities: parallel=${report.difference.exclusiveParallel}, single=${report.difference.exclusiveSingle}`);
  console.log(`difference parallel-single: relations=${report.difference.relationPossibilities}, hidden=${report.difference.hiddenPossibilities}, actions=${report.difference.actionPossibilities}`);

  assert(report.single.auxWorldTicks === report.parallel.auxWorldTicks, 'auxiliary compute budget is exactly matched');
  assert(report.single.realTicks === report.parallel.realTicks, 'primary reality receives the same real tick budget');
  assert(report.single.primaryActions > 0 && report.parallel.primaryActions > 0, 'primary OASIS acts in both conditions');
  assert(report.difference.exclusiveParallel > 0 || report.difference.relationPossibilities > 0,
    'parallel independent OASIS trajectories expose relation-process possibilities beyond equal-compute single trajectory');

  await writeFile('parallel-oasis-report.json', JSON.stringify(report, null, 2));
  console.log('RESULT: auxiliary exploration remained possibility-only; only primary reality formed confirmed experience.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
