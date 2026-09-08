import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.OASIS_GAMMA_V2_RESULTS_ROOT || 'gamma-v2-results';
const PRIMARY_METRICS = Object.freeze([
  ['plus10', 'eventSequenceAlignedMismatchCount'],
  ['plus30', 'eventSequenceAlignedMismatchCount'],
  ['plus10', 'relationGraphSymmetricDifference'],
  ['plus30', 'relationGraphSymmetricDifference'],
  ['plus30', 'structureRootSetSymmetricDifference'],
  ['plus30', 'crossAgentReuseDifference']
]);

function median(values) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function rng32(seed = 0x5a17c9e3) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function bootstrapMedianCI(values, reps = 5000) {
  if (!values.length) return [null, null];
  if (values.length === 1) return [values[0], values[0]];
  const rng = rng32(0x6712a45d ^ values.length);
  const boot = [];
  for (let r = 0; r < reps; r++) {
    const sample = [];
    for (let i = 0; i < values.length; i++) sample.push(values[Math.floor(rng() * values.length)]);
    boot.push(median(sample));
  }
  boot.sort((a, b) => a - b);
  return [boot[Math.floor(0.025 * (boot.length - 1))], boot[Math.floor(0.975 * (boot.length - 1))]];
}

function signFlipP(values, reps = 20000) {
  const nonzero = values.filter(v => Number.isFinite(v) && v !== 0);
  if (!nonzero.length) return 1;
  const observed = Math.abs(mean(nonzero));
  if (nonzero.length <= 16) {
    const total = 2 ** nonzero.length;
    let extreme = 0;
    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < nonzero.length; i++) sum += ((mask >> i) & 1 ? 1 : -1) * nonzero[i];
      if (Math.abs(sum / nonzero.length) >= observed - 1e-12) extreme++;
    }
    return extreme / total;
  }
  const rng = rng32(0x27d4eb2d ^ nonzero.length);
  let extreme = 1;
  for (let r = 0; r < reps; r++) {
    let sum = 0;
    for (const value of nonzero) sum += (rng() < 0.5 ? -1 : 1) * value;
    if (Math.abs(sum / nonzero.length) >= observed - 1e-12) extreme++;
  }
  return extreme / (reps + 1);
}

function summarize(values) {
  const v = values.filter(Number.isFinite);
  return {
    n: v.length,
    mean: mean(v),
    median: median(v),
    medianBootstrap95CI: bootstrapMedianCI(v),
    min: v.length ? Math.min(...v) : null,
    max: v.length ? Math.max(...v) : null,
    signFlipPermutationP: signFlipP(v)
  };
}

function holm(pairs) {
  const ranked = pairs.map(([key, p]) => [key, Number.isFinite(p) ? p : 1]).sort((a, b) => a[1] - b[1]);
  const out = {};
  let running = 0;
  const m = ranked.length;
  ranked.forEach(([key, p], i) => {
    const adjusted = Math.min(1, (m - i) * p);
    running = Math.max(running, adjusted);
    out[key] = running;
  });
  return out;
}

async function collectJsonFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await collectJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const files = await collectJsonFiles(ROOT);
const rows = [];
for (const file of files) {
  const value = JSON.parse(await readFile(file, 'utf8'));
  if (value?.protocol === 'OASIS Gamma Causal Probe v2.0') rows.push(value);
}
rows.sort((a, b) => a.seedSlot - b.seedSlot);

const seen = new Set();
const duplicates = [];
for (const row of rows) {
  if (seen.has(row.seedSlot)) duplicates.push(row.seedSlot);
  seen.add(row.seedSlot);
}
const missing = Array.from({ length: 40 }, (_, i) => i).filter(i => !seen.has(i));
const reached = rows.filter(r => r.onset?.reached);
const valid = reached.filter(r => r.interventionValidity?.primaryValid === true);
const shamAvailable = valid.filter(r => r.interventionValidity?.shamMatchAvailable === true);

function pairRows(pairName) {
  return valid.map(row => ({ seedSlot: row.seedSlot, pair: row.pairedDivergence?.[pairName] })).filter(r => r.pair);
}

function pairSummary(pairName) {
  const pairs = pairRows(pairName);
  const first = pairs.map(r => r.pair.firstExternalTransitionDivergenceIndex);
  const observed = first.filter(v => v != null);
  const metrics = {};
  for (const horizon of ['plus10', 'plus30', 'plus100']) {
    metrics[horizon] = {};
    const names = [
      'eventSequenceAlignedMismatchCount',
      'relationGraphSymmetricDifference',
      'structureRootSetSymmetricDifference',
      'survivingStructureCountDifference',
      'crossAgentReuseDifference',
      'participationBreadthDifference'
    ];
    for (const name of names) {
      const values = pairs.map(r => r.pair.horizons?.[horizon]?.[name]).filter(Number.isFinite);
      metrics[horizon][name] = summarize(values);
    }
    metrics[horizon].eventSequenceDivergenceIncidence = {
      n: pairs.filter(r => r.pair.horizons?.[horizon]).length,
      divergentN: pairs.filter(r => r.pair.horizons?.[horizon]?.eventSequenceDifferent === true).length
    };
  }
  return {
    firstExternalTransitionDivergence: {
      n: pairs.length,
      observedN: observed.length,
      noObservedDivergenceN: pairs.length - observed.length,
      medianTransitionIndex: median(observed),
      minTransitionIndex: observed.length ? Math.min(...observed) : null,
      maxTransitionIndex: observed.length ? Math.max(...observed) : null
    },
    metrics
  };
}

const pairSummaries = {
  G1_vs_G0: pairSummary('G1_vs_G0'),
  G2_vs_G0: pairSummary('G2_vs_G0'),
  G3_vs_G0: pairSummary('G3_vs_G0')
};

const primaryP = [];
for (const [horizon, metric] of PRIMARY_METRICS) {
  const key = `${horizon}.${metric}`;
  primaryP.push([key, pairSummaries.G1_vs_G0.metrics[horizon][metric].signFlipPermutationP]);
}
const adjusted = holm(primaryP);
for (const [horizon, metric] of PRIMARY_METRICS) {
  pairSummaries.G1_vs_G0.metrics[horizon][metric].holmAdjustedP = adjusted[`${horizon}.${metric}`];
}

function specificityContrast(controlPairName, requireSham = false) {
  const selected = requireSham ? shamAvailable : valid;
  const out = {};
  for (const [horizon, metric] of PRIMARY_METRICS) {
    const differences = [];
    for (const row of selected) {
      const intervention = row.pairedDivergence?.G1_vs_G0?.horizons?.[horizon]?.[metric];
      const control = row.pairedDivergence?.[controlPairName]?.horizons?.[horizon]?.[metric];
      if (Number.isFinite(intervention) && Number.isFinite(control)) differences.push(intervention - control);
    }
    out[`${horizon}.${metric}`] = summarize(differences);
  }
  return out;
}

const aggregate = {
  protocol: 'OASIS Gamma Causal Probe v2.0 Blind Aggregate',
  inputResultCount: rows.length,
  expectedResultCount: 40,
  missingSeedSlots: missing,
  duplicateSeedSlots: duplicates,
  eligibility: {
    reached: reached.length,
    notReached: rows.length - reached.length,
    validDecisionRelevant: valid.length,
    lowReachUnderpowered: valid.length < 20,
    onsetCycleMedian: median(reached.map(r => r.onset.worldCycle).filter(Number.isFinite)),
    onsetCycleRange: reached.length ? [Math.min(...reached.map(r => r.onset.worldCycle)), Math.max(...reached.map(r => r.onset.worldCycle))] : [null, null]
  },
  contaminationAndValidity: {
    allValidHavePrimaryValidity: valid.every(r => r.interventionValidity?.primaryValid === true),
    allValidBranchPreDigestsIdentical: valid.every(r => new Set(r.branches.map(b => b.preInterventionDigest)).size === 1),
    shamMatchAvailableN: shamAvailable.length,
    shamMatchUnavailableN: valid.length - shamAvailable.length
  },
  pairSummaries,
  specificity: {
    interventionMinusOrderScrambled: specificityContrast('G2_vs_G0', false),
    interventionMinusCandidateCountSham: specificityContrast('G3_vs_G0', true)
  },
  correction: {
    method: 'Holm correction across prespecified G1-vs-G0 primary numeric family',
    testCount: PRIMARY_METRICS.length
  },
  interpretationGuard: 'Positive Gamma-specific support requires reproducible G1-vs-G0 external divergence and control patterns not equally explained by G2/G3. No direction, speed, civilization timing, or larger metric is automatically superior.'
};

await writeFile('oasis-gamma-v2-causal-aggregate.json', JSON.stringify(aggregate, null, 2));
console.log('OASIS_GAMMA_V2_AGGREGATE=' + JSON.stringify(aggregate));
