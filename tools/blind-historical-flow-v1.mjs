import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dataPath = resolve(root, 'experiments/blind-historical-flow/agadir-1911.blind.json');
const reportDir = resolve(root, 'reports');
const reportPath = resolve(reportDir, 'blind-historical-flow-v1.json');
const markdownPath = resolve(reportDir, 'blind-historical-flow-v1.md');

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const phases = data.phases;

const edgeKey = e => `${e.from}->${e.to}:${e.kind}`;
const undirectedKey = e => `${[e.from, e.to].sort().join('<->')}:${e.kind}`;
const edgeOccurrenceKey = e => `${e.eventId}|${edgeKey(e)}`;
const occurrence = (event, seqIndex, relationIndex, edge) => ({
  ...edge,
  eventId: event.id,
  seqIndex,
  relationIndex
});

function relationOccurrences(history) {
  return history.flatMap((event, seqIndex) =>
    event.relations.map((edge, relationIndex) => occurrence(event, seqIndex, relationIndex, edge))
  );
}

// OASIS/strong-comparator current-flow reconstruction:
// Begin from participants in the newly disclosed current fact, then walk backward once
// through completed historical relations. A past relation can re-participate only if it
// touches the entities that are already participating at that point in the backward flow.
// There is no age cut-off, risk threshold, score, or permanent activation weight.
function orderedCurrentField(history, current) {
  const participating = new Set(current.relations.flatMap(e => [e.from, e.to]));
  const selected = [];

  for (let seqIndex = history.length - 1; seqIndex >= 0; seqIndex--) {
    const event = history[seqIndex];
    const touched = [];

    event.relations.forEach((edge, relationIndex) => {
      const e = occurrence(event, seqIndex, relationIndex, edge);
      if (participating.has(e.from) || participating.has(e.to)) touched.push(e);
    });

    if (!touched.length) continue;
    selected.push(...touched);
    for (const e of touched) {
      participating.add(e.from);
      participating.add(e.to);
    }
  }

  return selected.reverse();
}

// Control: relational connectivity is retained but historical order does not gate
// re-participation. Closure is repeatedly expanded until no new connected relation appears.
function unorderedCurrentField(history, current) {
  const participating = new Set(current.relations.flatMap(e => [e.from, e.to]));
  const all = relationOccurrences(history);
  const selected = new Map();
  let changed = true;

  while (changed) {
    changed = false;
    for (const e of all) {
      if (!(participating.has(e.from) || participating.has(e.to))) continue;
      const k = edgeOccurrenceKey(e);
      if (!selected.has(k)) {
        selected.set(k, e);
        changed = true;
      }
      const before = participating.size;
      participating.add(e.from);
      participating.add(e.to);
      if (participating.size !== before) changed = true;
    }
  }

  // Sorting here is output normalization only. This arm intentionally removes order
  // from its comparison signature below.
  return [...selected.values()].sort((a, b) =>
    a.eventId.localeCompare(b.eventId) || edgeKey(a).localeCompare(edgeKey(b))
  );
}

function explicitDirectedPairs(history, current) {
  const pairs = new Set();
  for (const event of [...history, current]) {
    for (const e of event.relations) pairs.add(`${e.from}->${e.to}`);
  }
  return pairs;
}

// Structural recombination only: temporally ordered directed relations may compose when
// the target of an earlier relation becomes the source of a later relation. No utility,
// success value, danger value, or preferred endpoint is attached to the new possibility.
function reconstitutedPossibilities(field, history, current) {
  const currentEdges = current.relations.map((edge, relationIndex) =>
    occurrence(current, history.length, relationIndex, edge)
  );
  const all = [...field, ...currentEdges].sort((a, b) =>
    a.seqIndex - b.seqIndex || a.relationIndex - b.relationIndex
  );
  const explicitPairs = explicitDirectedPairs(history, current);
  const generated = [];
  const seen = new Set();

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const first = all[i];
      const second = all[j];
      if (first.to !== second.from) continue;
      if (first.from === second.to) continue;

      const pair = `${first.from}->${second.to}`;
      if (explicitPairs.has(pair) || seen.has(pair)) continue;
      seen.add(pair);
      generated.push({
        from: first.from,
        to: second.to,
        kind: `${first.kind}>${second.kind}`,
        support: [first.eventId, second.eventId]
      });
    }
  }

  return generated;
}

function fieldSignature(kind, field) {
  if (kind === 'unordered-relational-memory') {
    return field.map(edgeKey).sort();
  }
  if (kind === 'undirected-ordered-memory') {
    return field.map(undirectedKey);
  }
  return field.map(edgeKey);
}

function modelStep(kind, history, current) {
  let field = [];
  let possibilities = [];

  if (kind === 'oasis-flow') {
    field = orderedCurrentField(history, current);
    possibilities = reconstitutedPossibilities(field, history, current);
  } else if (kind === 'ordered-relational-memory') {
    // Strong falsifier for any claim that ordered current-conditioned reactivation is unique.
    field = orderedCurrentField(history, current);
  } else if (kind === 'unordered-relational-memory') {
    field = unorderedCurrentField(history, current);
  } else if (kind === 'undirected-ordered-memory') {
    field = orderedCurrentField(history, current);
  } else if (kind === 'no-relation') {
    field = [];
  } else {
    throw new Error(`Unknown model kind: ${kind}`);
  }

  // OASIS realizes one internally generated relational possibility when one exists.
  // This is not ranked by a reward or success function. The selection operator itself
  // is not treated as evidence of decision quality in v1.
  let selection = possibilities.length ? {
    source: 'internal',
    relation: possibilities[0]
  } : null;

  // Minimal Baseline Intervention Principle: only if the mechanism cannot continue on
  // its own, provide the minimum common continuation relation from the current fact.
  let minimalBaselineIntervention = false;
  if (!selection) {
    minimalBaselineIntervention = true;
    const e = current.relations[0];
    selection = {
      source: 'minimal-baseline-intervention',
      relation: {
        from: e.from,
        to: e.to,
        kind: `follow-current:${e.kind}`,
        support: [current.id]
      }
    };
  }

  return {
    phase: current.id,
    currentFact: current.fact,
    reactivatedExperienceIds: [...new Set(field.map(e => e.eventId))],
    fieldSignature: fieldSignature(kind, field),
    possibilities: possibilities.map(p => ({
      relation: `${p.from}->${p.to}:${p.kind}`,
      support: p.support
    })),
    realizedSelection: `${selection.relation.from}->${selection.relation.to}:${selection.relation.kind}`,
    selectionSource: selection.source,
    minimalBaselineIntervention
  };
}

function runSequence(kind, sequence) {
  const history = [];
  const trace = [];
  for (const current of sequence) {
    trace.push(modelStep(kind, history, current));
    history.push(structuredClone(current));
  }
  return trace;
}

function byId(trace, id) {
  const row = trace.find(x => x.phase === id);
  if (!row) throw new Error(`Missing phase ${id}`);
  return row;
}

function sameStringSet(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function sameOrdered(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameFactMultiset(a, b) {
  return sameStringSet(a.map(x => x.id), b.map(x => x.id));
}

function directionAblation(sequence) {
  return sequence.map(event => {
    if (event.id !== 'H2') return structuredClone(event);
    const copy = structuredClone(event);
    copy.relations = copy.relations.map(e => ({ ...e, from: e.to, to: e.from }));
    return copy;
  });
}

const canonical = phases.map(structuredClone);
const orderAblation = [
  structuredClone(phases[0]),
  structuredClone(phases[2]),
  structuredClone(phases[1]),
  ...phases.slice(3).map(structuredClone)
];
const reversedDirection = directionAblation(canonical);
const models = [
  'oasis-flow',
  'ordered-relational-memory',
  'unordered-relational-memory',
  'undirected-ordered-memory',
  'no-relation'
];
const probe = 'H4';

const runs = {};
for (const model of models) {
  runs[model] = {
    canonical: runSequence(model, canonical),
    orderAblation: runSequence(model, orderAblation),
    directionAblation: runSequence(model, reversedDirection)
  };
}

const observations = {};
for (const model of models) {
  const c = byId(runs[model].canonical, probe);
  const o = byId(runs[model].orderAblation, probe);
  const d = byId(runs[model].directionAblation, probe);

  observations[model] = {
    sameCurrentProbe: c.currentFact === o.currentFact && c.currentFact === d.currentFact,
    orderAblation: {
      sameReactivatedExperienceSet: sameStringSet(c.reactivatedExperienceIds, o.reactivatedExperienceIds),
      sameFieldOrderedSignature: sameOrdered(c.fieldSignature, o.fieldSignature),
      sameFieldRelationSet: sameStringSet(c.fieldSignature, o.fieldSignature),
      samePossibilitySet: sameStringSet(
        c.possibilities.map(x => x.relation),
        o.possibilities.map(x => x.relation)
      ),
      sameRealizedSelection: c.realizedSelection === o.realizedSelection,
      canonical: c,
      ablated: o
    },
    directionAblation: {
      sameFieldOrderedSignature: sameOrdered(c.fieldSignature, d.fieldSignature),
      sameFieldRelationSet: sameStringSet(c.fieldSignature, d.fieldSignature),
      samePossibilitySet: sameStringSet(
        c.possibilities.map(x => x.relation),
        d.possibilities.map(x => x.relation)
      ),
      sameRealizedSelection: c.realizedSelection === d.realizedSelection,
      canonical: c,
      ablated: d
    }
  };
}

// Future-information audit for this deterministic mechanism harness: each output row is
// produced before current is appended to history; only prior disclosed events and current
// are passed into modelStep. This check verifies the trace never lists a future event ID as
// a reactivated experience or as possibility support.
const phaseIndex = new Map(canonical.map((p, i) => [p.id, i]));
let futureLeakDetected = false;
const futureLeakRows = [];
for (const [model, variants] of Object.entries(runs)) {
  for (const [variant, trace] of Object.entries(variants)) {
    const indexInVariant = new Map(trace.map((row, i) => [row.phase, i]));
    for (const row of trace) {
      const now = indexInVariant.get(row.phase);
      const refs = [
        ...row.reactivatedExperienceIds,
        ...row.possibilities.flatMap(x => x.support)
      ];
      const leaked = refs.filter(id => {
        const idx = indexInVariant.get(id);
        return idx != null && idx > now;
      });
      if (leaked.length) {
        futureLeakDetected = true;
        futureLeakRows.push({ model, variant, phase: row.phase, leaked });
      }
    }
  }
}

const integrity = {
  caseId: data.case_id,
  protocolScope: 'implementation-mechanism-validation-only',
  sameFactMultisetOrderControl: sameFactMultiset(canonical, orderAblation),
  probePhase: probe,
  futureLeakDetected,
  futureLeakRows,
  historicalOutcomeUsedAsScore: false,
  dangerVariablePresent: false,
  riskThresholdPresent: false,
  relationExpiryPresent: false,
  fixedSuccessMetricPresent: false,
  existingRelationFieldImported: false,
  actualHistoryCausallyRewrittenByAgent: false
};

const report = {
  generatedAt: new Date().toISOString(),
  integrity,
  observations,
  canonicalTrace: Object.fromEntries(models.map(model => [model, runs[model].canonical])),
  interpretationGuardrails: [
    'A structural difference is not a success score.',
    'If the strong ordered relational-memory comparator reproduces history sensitivity, that sensitivity is not unique to OASIS.',
    'The historical next phase is a disclosed reality stream, not the causal consequence of the experimental selection.',
    'This run does not establish real-world decision superiority.',
    'Choice-to-next-reality rewriting requires a separate interactive experiment.'
  ]
};

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));

const oasisOrder = observations['oasis-flow'].orderAblation;
const orderedMemoryOrder = observations['ordered-relational-memory'].orderAblation;
const oasisDirection = observations['oasis-flow'].directionAblation;

const md = `# Blind Historical Flow v1 report\n\n` +
`Case: ${data.case_id}\n\n` +
`Scope: implementation/mechanism validation only. No historical outcome is scored as success.\n\n` +
`## Integrity\n\n` +
`- Same fact multiset in order control: ${integrity.sameFactMultisetOrderControl}\n` +
`- Same current probe: ${observations['oasis-flow'].sameCurrentProbe}\n` +
`- Future leak detected: ${integrity.futureLeakDetected}\n` +
`- Existing relation-field.js imported: ${integrity.existingRelationFieldImported}\n` +
`- Danger/risk threshold used: ${integrity.dangerVariablePresent || integrity.riskThresholdPresent}\n\n` +
`## Order-ablation observation at ${probe}\n\n` +
`OASIS reactivated experience set equal: ${oasisOrder.sameReactivatedExperienceSet}\n\n` +
`OASIS ordered field signature equal: ${oasisOrder.sameFieldOrderedSignature}\n\n` +
`OASIS relation set equal ignoring order: ${oasisOrder.sameFieldRelationSet}\n\n` +
`OASIS possibility set equal: ${oasisOrder.samePossibilitySet}\n\n` +
`Strong ordered-memory field signature equal: ${orderedMemoryOrder.sameFieldOrderedSignature}\n\n` +
`## Direction-ablation observation at ${probe}\n\n` +
`OASIS directed field signature equal: ${oasisDirection.sameFieldOrderedSignature}\n\n` +
`OASIS possibility set equal: ${oasisDirection.samePossibilitySet}\n\n` +
`## OASIS canonical vs order-ablated possibilities\n\n` +
`Canonical: ${oasisOrder.canonical.possibilities.map(x => x.relation).join(', ') || '(none)'}\n\n` +
`Order-ablated: ${oasisOrder.ablated.possibilities.map(x => x.relation).join(', ') || '(none)'}\n\n` +
`## Guardrail\n\n` +
`These observations are structural differences, not evidence that OASIS made a better historical decision.\n`;

await writeFile(markdownPath, md);
console.log(md);
console.log(`JSON report: ${reportPath}`);
