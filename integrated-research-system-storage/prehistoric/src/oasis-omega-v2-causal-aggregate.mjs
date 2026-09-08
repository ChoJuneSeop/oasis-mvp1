import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.OASIS_OMEGA_V2_RESULTS_ROOT || 'omega-v2-results';
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
  const a = [...values].sort((x, y) => x - y); const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function rng32(seed = 0x5a17c9e3) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
function bootstrapMedianCI(values, reps = 5000) {
  if (!values.length) return [null, null]; if (values.length === 1) return [values[0], values[0]];
  const rng = rng32(0x19f4c23b ^ values.length); const boot = [];
  for (let r = 0; r < reps; r++) { const sample = []; for (let i = 0; i < values.length; i++) sample.push(values[Math.floor(rng() * values.length)]); boot.push(median(sample)); }
  boot.sort((a, b) => a - b);
  return [boot[Math.floor(0.025 * (boot.length - 1))], boot[Math.floor(0.975 * (boot.length - 1))]];
}
function signFlipP(values, reps = 20000) {
  const nonzero = values.filter(v => Number.isFinite(v) && v !== 0); if (!nonzero.length) return 1;
  const observed = Math.abs(mean(nonzero));
  if (nonzero.length <= 16) {
    const total = 2 ** nonzero.length; let extreme = 0;
    for (let mask = 0; mask < total; mask++) { let sum = 0; for (let i = 0; i < nonzero.length; i++) sum += ((mask >> i) & 1 ? 1 : -1) * nonzero[i]; if (Math.abs(sum / nonzero.length) >= observed - 1e-12) extreme++; }
    return extreme / total;
  }
  const rng = rng32(0x5c8d17a1 ^ nonzero.length); let extreme = 1;
  for (let r = 0; r < reps; r++) { let sum = 0; for (const value of nonzero) sum += (rng() < 0.5 ? -1 : 1) * value; if (Math.abs(sum / nonzero.length) >= observed - 1e-12) extreme++; }
  return extreme / (reps + 1);
}
function summarize(values) {
  const v = values.filter(Number.isFinite);
  return { n: v.length, mean: mean(v), median: median(v), medianBootstrap95CI: bootstrapMedianCI(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null, signFlipPermutationP: signFlipP(v) };
}
function holm(pairs) {
  const ranked = pairs.map(([key, p]) => [key, Number.isFinite(p) ? p : 1]).sort((a, b) => a[1] - b[1]);
  const out = {}; let running = 0; const m = ranked.length;
  ranked.forEach(([key, p], i) => { const adjusted = Math.min(1, (m - i) * p); running = Math.max(running, adjusted); out[key] = running; });
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
  if (value?.protocol === 'OASIS Omega Causal Probe v2.0') rows.push(value);
}
rows.sort((a, b) => a.seedSlot - b.seedSlot);

const seen = new Set(); const duplicates = [];
for (const row of rows) { if (seen.has(row.seedSlot)) duplicates.push(row.seedSlot); seen.add(row.seedSlot); }
const missing = Array.from({ length: 40 }, (_, i) => i).filter(i => !seen.has(i));
const reached = rows.filter(r => r.onset?.reached);
const valid = reached.filter(r => r.interventionValidity?.primaryValid === true);
const shamAvailable = valid.filter(r => r.interventionValidity?.shamMatchAvailable === true);

function pairRows(pairName, selected = valid) {
  return selected.map(row => ({ seedSlot: row.seedSlot, pair: row.pairedDivergence?.[pairName] })).filter(r => r.pair);
}
function pairSummary(pairName, selected = valid) {
  const pairs = pairRows(pairName, selected);
  const first = pairs.map(r => r.pair.firstExternalTransitionDivergenceIndex); const observed = first.filter(v => v != null);
  const metrics = {};
  for (const horizon of ['plus10', 'plus30', 'plus100']) {
    metrics[horizon] = {};
    for (const name of ['eventSequenceAlignedMismatchCount','relationGraphSymmetricDifference','structureRootSetSymmetricDifference','survivingStructureCountDifference','crossAgentReuseDifference','participationBreadthDifference']) {
      metrics[horizon][name] = summarize(pairs.map(r => r.pair.horizons?.[horizon]?.[name]).filter(Number.isFinite));
    }
    metrics[horizon].eventSequenceDivergenceIncidence = {
      n: pairs.filter(r => r.pair.horizons?.[horizon]).length,
      divergentN: pairs.filter(r => r.pair.horizons?.[horizon]?.eventSequenceDifferent === true).length
    };
  }
  return {
    firstExternalTransitionDivergence: {
      n: pairs.length, observedN: observed.length, noObservedDivergenceN: pairs.length - observed.length,
      medianTransitionIndex: median(observed), minTransitionIndex: observed.length ? Math.min(...observed) : null, maxTransitionIndex: observed.length ? Math.max(...observed) : null
    },
    metrics
  };
}

const pairSummaries = {
  O1_vs_O0: pairSummary('O1_vs_O0'),
  O2_vs_O0: pairSummary('O2_vs_O0'),
  O3_vs_O0: pairSummary('O3_vs_O0', shamAvailable)
};

function applyHolmToPair(summary, label) {
  const p = PRIMARY_METRICS.map(([horizon, metric]) => [`${label}.${horizon}.${metric}`, summary.metrics[horizon][metric].signFlipPermutationP]);
  const adjusted = holm(p);
  for (const [horizon, metric] of PRIMARY_METRICS) summary.metrics[horizon][metric].holmAdjustedP = adjusted[`${label}.${horizon}.${metric}`];
}
applyHolmToPair(pairSummaries.O1_vs_O0, 'O1_vs_O0');
applyHolmToPair(pairSummaries.O2_vs_O0, 'O2_vs_O0');
applyHolmToPair(pairSummaries.O3_vs_O0, 'O3_vs_O0');

function specificityContrast(controlPairName, selected) {
  const out = {};
  for (const [horizon, metric] of PRIMARY_METRICS) {
    const values = [];
    for (const row of selected) {
      const intervention = row.pairedDivergence?.O1_vs_O0?.horizons?.[horizon]?.[metric];
      const control = row.pairedDivergence?.[controlPairName]?.horizons?.[horizon]?.[metric];
      if (Number.isFinite(intervention) && Number.isFinite(control)) values.push(intervention - control);
    }
    out[`${horizon}.${metric}`] = summarize(values);
  }
  const adjusted = holm(Object.entries(out).map(([key, value]) => [key, value.signFlipPermutationP]));
  for (const [key, value] of Object.entries(out)) value.holmAdjustedP = adjusted[key];
  return out;
}

const aggregate = {
  protocol: 'OASIS Omega Causal Probe v2.0 Blind Aggregate',
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
    onsetCycleRange: reached.length ? [Math.min(...reached.map(r => r.onset.worldCycle)), Math.max(...reached.map(r => r.onset.worldCycle))] : [null, null],
    medianOnlineNovelAdmissibleCount: median(valid.map(r => r.interventionValidity?.actualOnlineNovelAdmissibleExtraCount).filter(Number.isFinite))
  },
  contaminationAndValidity: {
    allValidHavePrimaryValidity: valid.every(r => r.interventionValidity?.primaryValid === true),
    allValidBranchPreDigestsIdentical: valid.every(r => new Set(r.branches.map(b => b.preInterventionDigest)).size === 1),
    allValidPreserveGammaFlow: valid.every(r => {
      const byId = Object.fromEntries(r.branches.map(b => [b.branchId, b]));
      const g0 = byId.O0?.firstMechanism?.gammaBridgeAdmissibleSignatures ?? [];
      return ['O1','O2'].every(id => JSON.stringify(g0) === JSON.stringify(byId[id]?.firstMechanism?.gammaBridgeAdmissibleSignatures ?? []));
    }),
    shamMatchAvailableN: shamAvailable.length,
    shamMatchUnavailableN: valid.length - shamAvailable.length
  },
  pairSummaries,
  specificity: {
    atomicOnlyEffectMinusFrozenMacroEffect: specificityContrast('O2_vs_O0', valid),
    atomicOnlyEffectMinusIndependentShamEffect: specificityContrast('O3_vs_O0', shamAvailable)
  },
  correction: {
    method: 'Holm correction over prespecified numeric primary family separately for O1-vs-O0, O2-vs-O0, O3-vs-O0 and direct specificity contrast families',
    metricCountPerFamily: PRIMARY_METRICS.length,
    firstExternalTransitionDivergence: 'primary descriptive incidence/latency outcome; no direction-based p-value assigned'
  },
  interpretationGuard: 'Ω support requires reproducible O1-vs-O0 external divergence. Online-generative support additionally requires O2 not to reproduce O0 at online-novel onsets. If O3 reproduces O0 under exact count+depth matching, generic long-sequence/candidate expansion remains sufficient. No larger metric, speed, or civilization timing is automatically better.'
};

await writeFile('oasis-omega-v2-causal-aggregate.json', JSON.stringify(aggregate, null, 2));
console.log('OASIS_OMEGA_V2_AGGREGATE=' + JSON.stringify(aggregate));