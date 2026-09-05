import fs from 'node:fs/promises';
import { OASISReferenceCore } from '../src/oasis-reference-core.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const intersects = (a, b) => {
  const bs = b instanceof Set ? b : new Set(b);
  for (const x of a) if (bs.has(x)) return true;
  return false;
};
const relationKey = r => `${r.from}->${r.to}:${r.kind ?? 'rel'}:${r.context ?? ''}`;
const relationEntities = r => uniq([r.from, r.to, ...arr(r.entities)]);
const expEntities = exp => uniq([
  ...arr(exp.before?.changedEntities),
  ...arr(exp.after?.changedEntities),
  ...arr(exp.participation?.current),
  ...arr(exp.participation?.historical),
  ...arr(exp.processRelations).flatMap(relationEntities),
  ...arr(exp.choice?.entities),
  ...arr(exp.outcome?.affectedEntities)
]);

class CurrentEventComparator extends OASISReferenceCore {
  reconstituteAffinityField() {
    const latest = this.state.flow.at(-1);
    const seeds = new Set(latest?.changedEntities ?? []);
    for (const p of this.state.world.participants.values()) {
      if (p.available !== false) seeds.add(p.id);
    }
    const currentRelations = arr(latest?.event?.relations).filter(r => intersects(relationEntities(r), seeds));
    const participating = new Set(seeds);
    for (const r of currentRelations) for (const e of relationEntities(r)) participating.add(e);
    return {
      seedEntities: [...seeds],
      participatingEntities: [...participating],
      reactivatedExperienceIds: [],
      reactivated: [],
      paths: [],
      currentRelations: currentRelations.map(clone),
      historicalRelations: [],
      relations: currentRelations.map(clone),
      relationSignature: currentRelations.map(relationKey)
    };
  }
}

class TemporalGraphComparator extends OASISReferenceCore {
  reconstituteAffinityField() {
    const field = super.reconstituteAffinityField();
    return {
      ...field,
      reactivatedExperienceIds: [],
      reactivated: [],
      paths: [],
      historicalRelations: [],
      relations: field.currentRelations.map(clone),
      relationSignature: field.currentRelations.map(relationKey)
    };
  }
}

class OrderedEpisodicComparator extends TemporalGraphComparator {
  reconstituteAffinityField() {
    const base = super.reconstituteAffinityField();
    const frontier = new Set(base.participatingEntities);
    let chosen = null;
    for (let i = this.state.closedExperiences.length - 1; i >= 0; i--) {
      const exp = this.state.closedExperiences[i];
      const entities = expEntities(exp);
      if (!intersects(entities, frontier)) continue;
      chosen = { exp, entities };
      break;
    }
    if (!chosen) return base;

    const { exp, entities } = chosen;
    const touched = entities.filter(e => frontier.has(e));
    for (const e of entities) frontier.add(e);
    const relations = arr(exp.processRelations).map(clone);
    const reactivated = [{
      experienceId: exp.id,
      sequence: exp.sequence,
      touchedEntities: touched,
      relations,
      choice: clone(exp.choice),
      outcome: clone(exp.outcome)
    }];
    return {
      ...base,
      participatingEntities: [...frontier],
      reactivatedExperienceIds: [exp.id],
      reactivated,
      paths: [{ fromCurrentEntities: touched, toExperienceId: exp.id, sequence: exp.sequence }],
      historicalRelations: relations,
      relations: [...relations, ...base.currentRelations.map(clone)],
      relationSignature: [...relations, ...base.currentRelations].map(relationKey)
    };
  }
}

const systems = {
  oasis: OASISReferenceCore,
  currentEvent: CurrentEventComparator,
  temporalGraph: TemporalGraphComparator,
  orderedEpisodic: OrderedEpisodicComparator
};

const commonParticipants = [
  { id: 'Authority-A', roles: ['home-authority'], capabilities: ['hold','request-report','open-channel','prepare-move','request-supply','withdraw','request-support','contest-order','comply-order'] },
  { id: 'Expedition-A', roles: ['field-expedition'], capabilities: ['establish-post','defend-post','hold','withdraw','comply-order'] },
  { id: 'Force-B', roles: ['opposing-force'], capabilities: ['advance','demand-withdrawal'] }
];

const warmup = [
  {
    event: {
      id: 'warmup-0-arrival',
      entities: ['Authority-A','Expedition-A','Region-Q','Route-W'],
      participants: commonParticipants,
      relations: [
        { id: 'w0-r1', from: 'Authority-A', to: 'Expedition-A', kind: 'commands' },
        { id: 'w0-r2', from: 'Expedition-A', to: 'Region-Q', kind: 'arrives-at' },
        { id: 'w0-r3', from: 'Expedition-A', to: 'Route-W', kind: 'depends-on-long-route' }
      ],
      affordances: [
        { id: 'establish-post', actor: 'Expedition-A', action: 'establish-post', target: 'Region-Q', entities: ['Region-Q'] }
      ],
      meta: { blindStage: 'W0', evaluated: false }
    },
    outcome: {
      id: 'warmup-0-outcome',
      entities: ['Expedition-A','Region-Q'],
      relations: [{ id: 'w0-o1', from: 'Expedition-A', to: 'Region-Q', kind: 'holds-post' }],
      affordances: [{ id: 'establish-post', op: 'remove' }],
      meta: { blindStage: 'W0-outcome', historicalRealization: true, evaluated: false }
    }
  },
  {
    event: {
      id: 'warmup-1-attack',
      entities: ['Expedition-A','Local-Force','Region-Q'],
      relations: [
        { id: 'w1-r1', from: 'Local-Force', to: 'Expedition-A', kind: 'attacks' },
        { id: 'w1-r2', from: 'Expedition-A', to: 'Region-Q', kind: 'holds-post' }
      ],
      affordances: [
        { id: 'defend-post', actor: 'Expedition-A', action: 'defend-post', target: 'Region-Q', entities: ['Local-Force','Region-Q'] }
      ],
      meta: { blindStage: 'W1', evaluated: false }
    },
    outcome: {
      id: 'warmup-1-outcome',
      entities: ['Expedition-A','Local-Force','Region-Q'],
      relations: [{ id: 'w1-o1', from: 'Expedition-A', to: 'Local-Force', kind: 'repels' }],
      affordances: [{ id: 'defend-post', op: 'remove' }],
      meta: { blindStage: 'W1-outcome', historicalRealization: true, evaluated: false }
    }
  }
];

const testStream = [
  {
    id: 'test-0-regional-shift',
    entities: ['Authority-A','Expedition-A','Force-B','Regional-Capital','River-Corridor','Region-Q'],
    participants: commonParticipants,
    relations: [
      { id: 't0-r1', from: 'Force-B', to: 'Regional-Capital', kind: 'defeats-regime-at' },
      { id: 't0-r2', from: 'Force-B', to: 'River-Corridor', kind: 'gains-access-to' },
      { id: 't0-r3', from: 'Expedition-A', to: 'Region-Q', kind: 'holds-post' }
    ],
    affordances: [
      { id: 't0-hold', actor: 'Authority-A', action: 'hold', target: 'Expedition-A', obligations: ['supply:Expedition-A'], entities: ['Expedition-A','Region-Q'] },
      { id: 't0-report', actor: 'Authority-A', action: 'request-report', target: 'Expedition-A', provides: ['report:Expedition-A'], entities: ['Expedition-A'] },
      { id: 't0-channel', actor: 'Authority-A', action: 'open-channel', target: 'Force-B', provides: ['channel:A:B'], entities: ['Force-B'] },
      { id: 't0-move', actor: 'Authority-A', action: 'prepare-move', target: 'Expedition-A', entities: ['Expedition-A','Route-W'] },
      { id: 't0-supply', actor: 'Authority-A', action: 'request-supply', target: 'Expedition-A', resolves: ['supply:Expedition-A'], entities: ['Expedition-A','Route-W'] }
    ],
    meta: { blindStage: 'T0' }
  },
  {
    id: 'test-1-direct-confrontation',
    entities: ['Authority-A','Authority-B','Expedition-A','Force-B','Region-Q'],
    relations: [
      { id: 't1-r1', from: 'Force-B', to: 'Region-Q', kind: 'arrives-at' },
      { id: 't1-r2', from: 'Force-B', to: 'Expedition-A', kind: 'demands-withdrawal' },
      { id: 't1-r3', from: 'Expedition-A', to: 'Region-Q', kind: 'holds-post' },
      { id: 't1-r4', from: 'Authority-B', to: 'Force-B', kind: 'commands' },
      { id: 't1-r5', from: 'Authority-A', to: 'Expedition-A', kind: 'commands' }
    ],
    affordances: [
      { id: 't0-hold', op: 'remove' },
      { id: 't0-report', op: 'remove' },
      { id: 't0-channel', op: 'remove' },
      { id: 't0-move', op: 'remove' },
      { id: 't0-supply', op: 'remove' },
      { id: 't1-hold', actor: 'Authority-A', action: 'hold', target: 'Expedition-A', obligations: ['supply:Expedition-A'], entities: ['Expedition-A','Region-Q'] },
      { id: 't1-negotiate', actor: 'Authority-A', action: 'open-channel', target: 'Authority-B', provides: ['channel:A:B'], entities: ['Authority-B','Force-B'] },
      { id: 't1-instructions', actor: 'Authority-A', action: 'request-report', target: 'Expedition-A', provides: ['report:Expedition-A'], entities: ['Expedition-A'] },
      { id: 't1-withdraw', actor: 'Authority-A', action: 'withdraw', target: 'Expedition-A', resolves: ['supply:Expedition-A'], entities: ['Expedition-A','Region-Q','Route-W'] },
      { id: 't1-support', actor: 'Authority-A', action: 'request-support', target: 'Ally-A', provides: ['support-requested'], entities: ['Ally-A'] }
    ],
    meta: { blindStage: 'T1' }
  },
  {
    id: 'test-2-constraint-update',
    entities: ['Authority-A','Expedition-A','Force-B','Authority-B','Route-W','Sea-Capability-B','Ally-A'],
    relations: [
      { id: 't2-r1', from: 'Expedition-A', to: 'Route-W', kind: 'depends-on-long-route' },
      { id: 't2-r2', from: 'Force-B', to: 'Expedition-A', kind: 'locally-outnumbers' },
      { id: 't2-r3', from: 'Authority-B', to: 'Sea-Capability-B', kind: 'controls' },
      { id: 't2-r4', from: 'Ally-A', to: 'Authority-A', kind: 'has-not-committed-support' },
      { id: 't2-r5', from: 'Expedition-A', to: 'Authority-A', kind: 'report-channel-open' }
    ],
    affordances: [
      { id: 't1-hold', op: 'remove' },
      { id: 't1-negotiate', op: 'remove' },
      { id: 't1-instructions', op: 'remove' },
      { id: 't1-withdraw', op: 'remove' },
      { id: 't1-support', op: 'remove' },
      { id: 't2-hold', actor: 'Authority-A', action: 'hold', target: 'Expedition-A', obligations: ['supply:Expedition-A'], entities: ['Expedition-A','Region-Q'] },
      { id: 't2-negotiate', actor: 'Authority-A', action: 'open-channel', target: 'Authority-B', provides: ['channel:A:B'], entities: ['Authority-B','Force-B'] },
      { id: 't2-withdraw', actor: 'Authority-A', action: 'withdraw', target: 'Expedition-A', resolves: ['supply:Expedition-A'], entities: ['Expedition-A','Route-W'] },
      { id: 't2-support', actor: 'Authority-A', action: 'request-support', target: 'Ally-A', provides: ['support-requested'], entities: ['Ally-A'] },
      { id: 't2-supply', actor: 'Authority-A', action: 'request-supply', target: 'Expedition-A', resolves: ['supply:Expedition-A'], entities: ['Expedition-A','Route-W'] }
    ],
    meta: { blindStage: 'T2' }
  },
  {
    id: 'test-3-home-order',
    entities: ['Authority-A','Expedition-A','Region-Q'],
    relations: [
      { id: 't3-r1', from: 'Authority-A', to: 'Expedition-A', kind: 'orders-withdrawal' }
    ],
    affordances: [
      { id: 't2-hold', op: 'remove' },
      { id: 't2-negotiate', op: 'remove' },
      { id: 't2-withdraw', op: 'remove' },
      { id: 't2-support', op: 'remove' },
      { id: 't2-supply', op: 'remove' },
      { id: 't3-comply', actor: 'Expedition-A', action: 'comply-order', target: 'Authority-A', entities: ['Region-Q','Route-W'] },
      { id: 't3-contest', actor: 'Expedition-A', action: 'contest-order', target: 'Authority-A', entities: ['Region-Q'] },
      { id: 't3-delay', actor: 'Expedition-A', action: 'request-report', target: 'Authority-A', provides: ['delay-requested'], entities: ['Region-Q'] }
    ],
    meta: { blindStage: 'T3' }
  },
  {
    id: 'test-4-observed-departure',
    entities: ['Expedition-A','Region-Q','Route-E'],
    relations: [
      { id: 't4-r1', from: 'Expedition-A', to: 'Region-Q', kind: 'departs' },
      { id: 't4-r2', from: 'Expedition-A', to: 'Route-E', kind: 'moves-via' }
    ],
    affordances: [
      { id: 't3-comply', op: 'remove' },
      { id: 't3-contest', op: 'remove' },
      { id: 't3-delay', op: 'remove' },
      { id: 't4-record', actor: 'Authority-A', action: 'request-report', target: 'Expedition-A', entities: ['Expedition-A','Route-E'] }
    ],
    meta: { blindStage: 'T4' }
  }
];

function makeSystem(ClassType, seed) {
  const s = new ClassType({ agentId: 'Decision-Center-A', invariants: ['irreversible-loss-of-life'] });
  s.options.realizationSeed = seed;
  return s;
}

function compactTrace(d) {
  return {
    flowEventId: d.flowEventId,
    currentChangedEntities: clone(d.currentFlow.changedEntities),
    seedEntities: clone(d.field.seedEntities),
    relationSignature: clone(d.field.relationSignature),
    reactivatedExperienceIds: clone(d.field.reactivatedExperienceIds),
    currentParticipation: d.participation.current.map(x => x.id),
    historicalParticipation: clone(d.participation.historical),
    possibilityCount: d.possibilities.length,
    possibilities: d.possibilities.map(p => ({
      id: p.id,
      kind: p.kind,
      steps: p.steps.map(s => s.id),
      supportExperiences: clone(p.support?.experienceIds ?? [])
    })),
    choice: d.choice ? {
      id: d.choice.id,
      kind: d.choice.kind,
      steps: d.choice.steps.map(s => s.id),
      supportExperiences: clone(d.choice.support?.experienceIds ?? [])
    } : null,
    responsibility: clone(d.responsibility),
    continuationRequired: d.continuationRequired,
    currentFlowAnchoringUsed: d.currentFlowAnchoringUsed,
    tieBreakUsed: d.tieBreakUsed,
    structuralNovelty: d.structuralExpansion?.novelStructure ?? null
  };
}

function runOne(seed) {
  const agents = Object.fromEntries(Object.entries(systems).map(([name, ClassType]) => [name, makeSystem(ClassType, seed)]));
  const warmupAudit = {};

  for (const [name, agent] of Object.entries(agents)) {
    warmupAudit[name] = [];
    for (const phase of warmup) {
      agent.observe(clone(phase.event));
      const d = agent.deliberate();
      if (!d.choice) throw new Error(`${name} failed warmup at ${phase.event.id}`);
      agent.actualize(d.choice.id, clone(phase.outcome));
      warmupAudit[name].push({
        eventId: phase.event.id,
        choice: d.choice.id,
        closedExperiences: agent.exportState().closedExperiences.length
      });
    }
  }

  const traces = Object.fromEntries(Object.keys(agents).map(k => [k, []]));
  for (const event of testStream) {
    for (const [name, agent] of Object.entries(agents)) {
      agent.observe(clone(event));
      const d = agent.deliberate();
      traces[name].push(compactTrace(d));
    }
  }

  const stageDifferences = testStream.map((event, i) => {
    const choices = Object.fromEntries(Object.keys(agents).map(name => [name, traces[name][i].choice?.steps ?? null]));
    const reactivated = Object.fromEntries(Object.keys(agents).map(name => [name, traces[name][i].reactivatedExperienceIds]));
    const possibilityCounts = Object.fromEntries(Object.keys(agents).map(name => [name, traces[name][i].possibilityCount]));
    return { stage: event.meta.blindStage, choices, reactivated, possibilityCounts };
  });

  return { seed, warmupAudit, traces, stageDifferences };
}

const seeds = ['flow-a','flow-b','flow-c','flow-d','flow-e'];
const runs = seeds.map(runOne);

const summary = {
  protocol: 'Blind Historical Flow Replay v2',
  case: 'blind-case-A',
  systems: Object.keys(systems),
  seeds,
  scope: {
    tests: ['relational-history reconstitution','selective completed-experience reactivation','possibility formation','path-dependent choice formation'],
    doesNotTest: ['historical prediction accuracy','choice-caused historical reality rewriting','general superiority']
  },
  noSuccessMetric: true,
  historyContinuationExogenous: true,
  runs
};

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/blind-historical-flow-v2.json', JSON.stringify(summary, null, 2));

console.log(JSON.stringify({
  case: summary.case,
  systems: summary.systems,
  seeds: summary.seeds,
  stageDifferences: runs.map(r => ({ seed: r.seed, stages: r.stageDifferences }))
}, null, 2));
