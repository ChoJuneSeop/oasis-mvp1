import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MODE = String(process.env.OASIS_CAUSAL_PROBE_MODE || 'G').toUpperCase();
const ROOT = process.env.OASIS_CAUSAL_RESULTS_ROOT || '.';
if (!['G', 'O'].includes(MODE)) throw new Error('aggregate mode must be G or O');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const needle = MODE === 'G' ? 'oasis-gamma-causal-probe-v1-seed-slot-' : 'oasis-omega-causal-probe-v1-seed-slot-';
const files = walk(ROOT).filter(path => path.includes(needle) && path.endsWith('.json'));
const rows = files.map(path => JSON.parse(readFileSync(path, 'utf8'))).sort((a, b) => a.seedSlot - b.seedSlot);

if (rows.length !== 40) throw new Error(`expected 40 ${MODE} results, found ${rows.length}`);
if (new Set(rows.map(r => r.seedSlot)).size !== 40) throw new Error('duplicate seed slots in aggregate');

function median(values) {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}
function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function quantile(values, q) {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? xs[lo] : xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}
function hash32(text) {
  const h = createHash('sha256').update(String(text)).digest();
  return h.readUInt32LE(0) || 1;
}
function rng(seedText) {
  let x = hash32(seedText);
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function bootstrapMedianCI(values, key, iterations = 4000) {
  if (!values.length) return [null, null];
  const random = rng(`bootstrap|${MODE}|${key}`);
  const estimates = [];
  for (let b = 0; b < iterations; b++) {
    const sample = [];
    for (let i = 0; i < values.length; i++) sample.push(values[Math.floor(random() * values.length)]);
    estimates.push(median(sample));
  }
  return [quantile(estimates, 0.025), quantile(estimates, 0.975)];
}
function pairedSignFlipP(values, key, iterations = 10000) {
  if (!values.length) return null;
  const observed = Math.abs(mean(values));
  if (observed === 0 && values.every(v => v === 0)) return 1;
  const random = rng(`signflip|${MODE}|${key}`);
  let extreme = 0;
  for (let b = 0; b < iterations; b++) {
    let s = 0;
    for (const value of values) s += (random() < 0.5 ? -1 : 1) * value;
    if (Math.abs(s / values.length) >= observed - 1e-12) extreme++;
  }
  return (extreme + 1) / (iterations + 1);
}
function holm(items) {
  const valid = items.filter(x => Number.isFinite(x.p)).sort((a, b) => a.p - b.p);
  let running = 0;
  for (let i = 0; i < valid.length; i++) {
    const adjusted = Math.min(1, valid[i].p * (valid.length - i));
    running = Math.max(running, adjusted);
    valid[i].adjustedP = running;
  }
}

const eligible = rows.filter(r => r.onset?.reached);
const valid = eligible.filter(r => r.interventionValidity?.valid);
const noEligibility = rows.filter(r => !r.onset?.reached);

const interventionKey = 'interventionVsIntact';
const controlKey = 'controlVsIntact';
const metrics = [
  'worldEventCountDifference',
  'interactionCountDifference',
  'structureCountDifference',
  'participationBreadthDifference',
  'activeRelationSymmetricDifference'
];
const horizonKeys = ['plus10', 'plus30', 'plus100'];
const testsForCorrection = [];

function collectDifferences(compareKey, horizon, metric) {
  return valid.map(row => row.pairedDivergence?.[compareKey]?.horizonDivergence?.[horizon]?.[metric])
    .filter(Number.isFinite);
}
function summarizeDifferences(compareKey, horizon, metric) {
  const values = collectDifferences(compareKey, horizon, metric);
  const key = `${compareKey}|${horizon}|${metric}`;
  const ci = bootstrapMedianCI(values, key);
  const p = pairedSignFlipP(values, key);
  const result = {
    n: values.length,
    meanPairedDifference: mean(values),
    medianPairedDifference: median(values),
    medianBootstrap95CI: ci,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    signFlipPermutationP: p,
    holmAdjustedP: null
  };
  if (compareKey === interventionKey && Number.isFinite(p)) testsForCorrection.push({ key, p, result });
  return result;
}

const horizons = {};
for (const horizon of horizonKeys) {
  horizons[horizon] = { interventionVsIntact: {}, controlVsIntact: {} };
  for (const metric of metrics) {
    horizons[horizon].interventionVsIntact[metric] = summarizeDifferences(interventionKey, horizon, metric);
    horizons[horizon].controlVsIntact[metric] = summarizeDifferences(controlKey, horizon, metric);
  }
}
holm(testsForCorrection);
for (const item of testsForCorrection) item.result.holmAdjustedP = item.adjustedP;

function firstDivergenceSummary(compareKey) {
  const values = valid.map(r => r.pairedDivergence?.[compareKey]?.firstTransitionDivergenceIndex).filter(Number.isFinite);
  return {
    observedN: values.length,
    noObservedDivergenceN: valid.length - values.length,
    medianTransitionIndex: median(values),
    minTransitionIndex: values.length ? Math.min(...values) : null,
    maxTransitionIndex: values.length ? Math.max(...values) : null
  };
}

function branchTerminalSummary(branchId) {
  const items = valid.map(row => row.branches.find(b => b.branchId === branchId)).filter(Boolean);
  const statusCounts = {};
  for (const item of items) statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
  const civCycles = items.map(item => item.firstObserverConfirmation?.cycle).filter(Number.isFinite);
  return {
    n: items.length,
    statusCounts,
    civilizationConfirmationN: civCycles.length,
    civilizationCycleMedian: median(civCycles),
    civilizationCycleRange: civCycles.length ? [Math.min(...civCycles), Math.max(...civCycles)] : null
  };
}

const branchIds = MODE === 'G' ? ['G0', 'G1', 'G2'] : ['O0', 'O1', 'O2'];
const onsetCycles = eligible.map(r => r.onset.worldCycle).filter(Number.isFinite);
const output = {
  protocol: 'OASIS Gamma/Omega Causal Probe Blind Aggregate v1.0',
  mode: MODE,
  inputResultCount: rows.length,
  eligibility: {
    reached: eligible.length,
    notReached: noEligibility.length,
    reasons: noEligibility.reduce((acc, row) => {
      const key = row.onset?.reason ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    onsetCycleMedian: median(onsetCycles),
    onsetCycleRange: onsetCycles.length ? [Math.min(...onsetCycles), Math.max(...onsetCycles)] : null
  },
  interventionValidity: {
    eligibleN: eligible.length,
    validN: valid.length,
    invalidN: eligible.length - valid.length
  },
  preInterventionIdentity: {
    allValidRowsHaveIdenticalBranchDigest: valid.every(row => new Set(row.branches.map(b => b.preInterventionDigest)).size === 1)
  },
  firstTransitionDivergence: {
    interventionVsIntact: firstDivergenceSummary(interventionKey),
    controlVsIntact: firstDivergenceSummary(controlKey)
  },
  horizons,
  terminalByBranch: Object.fromEntries(branchIds.map(id => [id, branchTerminalSummary(id)])),
  correction: {
    method: 'Holm correction across prespecified intervention-vs-intact horizon metric family',
    testCount: testsForCorrection.length
  },
  interpretationGuard: 'This aggregate reports paired external trajectory effects. It does not define faster civilization, larger effects, or statistical significance as OASIS superiority. Controls must be considered before mechanism-specific attribution.'
};

const filename = `oasis-${MODE === 'G' ? 'gamma' : 'omega'}-causal-probe-v1-aggregate.json`;
writeFileSync(filename, JSON.stringify(output, null, 2));
console.log('OASIS_GAMMA_OMEGA_CAUSAL_AGGREGATE=' + JSON.stringify(output));
