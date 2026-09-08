import { createHash } from 'node:crypto';
import { OASISMathKernelV1CanonicalMemorySafe } from './oasis-math-kernel-v1.2-memory-safe.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const hash = text => createHash('sha256').update(String(text)).digest('hex');

function relationKey(r) {
  return `${r?.kind ?? ''}:${r?.from ?? ''}->${r?.to ?? ''}`;
}

function stepEntitySet(step) {
  return new Set(uniq([step?.actor, step?.target, ...arr(step?.participants), ...arr(step?.entities)]));
}

function unionStepEntitySet(a, b) {
  return new Set([...stepEntitySet(a), ...stepEntitySet(b)]);
}

function currentFactIds(observation) {
  return new Set(arr(observation?.facts).map(f => typeof f === 'string' ? f : f?.id).filter(Boolean));
}

function canStartStep(step, observation) {
  const facts = currentFactIds(observation);
  if (!arr(step?.requires).every(req => facts.has(req))) return false;
  const currentEntities = new Set(arr(observation?.entities));
  if (!arr(step?.requiresEntities).every(entity => currentEntities.has(entity))) return false;
  const currentRelationKinds = new Set(arr(observation?.relations).map(r => r.kind));
  if (!arr(step?.requiresRelationKinds).every(kind => currentRelationKinds.has(kind))) return false;
  if (arr(step?.requiresBridgeKeys).length) return false;
  return true;
}

function canFollowByPhysicalPrerequisites(first, second, observation) {
  if (!first || !second) return false;
  if (first.id === second.id && second.repeatable !== true) return false;

  const facts = currentFactIds(observation);
  const providedTokens = new Set([...facts, ...arr(first.provides)]);
  if (!arr(second.requires).every(req => providedTokens.has(req))) return false;

  const currentEntities = new Set(arr(observation?.entities));
  const createdEntities = new Set(arr(first.createsEntities));
  if (!arr(second.requiresEntities).every(entity => currentEntities.has(entity) || createdEntities.has(entity))) return false;

  const relationKinds = new Set([
    ...arr(observation?.relations).map(r => r.kind),
    ...arr(first.providesRelationKinds)
  ]);
  if (!arr(second.requiresRelationKinds).every(kind => relationKinds.has(kind))) return false;

  const bridgeKeys = new Set(arr(first.bridgeKeys));
  if (!arr(second.requiresBridgeKeys).every(key => bridgeKeys.has(key))) return false;

  return true;
}

function endpointsPresent(record, observation) {
  const relation = record?.relation ?? {};
  const endpoints = uniq([relation.from, relation.to]);
  if (endpoints.length < 2) return false;
  const participants = new Map(arr(observation?.participants).map(p => [p.id, p]));
  const entities = new Set(arr(observation?.entities));
  for (const endpoint of endpoints) {
    const participant = participants.get(endpoint);
    if (participant && participant.available === false) return false;
    if (!entities.has(endpoint) && !participant) return false;
  }
  return true;
}

function exactRelationCurrent(record, observation) {
  const relation = record?.relation ?? {};
  return arr(observation?.relations).some(current =>
    current?.id === relation.id ||
    (current?.from === relation.from && current?.to === relation.to && current?.kind === relation.kind)
  );
}

function orderedPairs(actions) {
  const out = [];
  for (let i = 0; i + 1 < actions.length; i++) out.push([actions[i], actions[i + 1]]);
  return out;
}

function pairKey(a, b) {
  return `${a}>${b}`;
}

function sigmaSignature(possibility) {
  return arr(possibility?.sigma).map(step => step?.id ?? `${step?.action ?? ''}:${step?.target ?? ''}`).join('>');
}

function candidateInvolvesHistoricalEndpoints(record, first, second) {
  const endpoints = uniq([record?.relation?.from, record?.relation?.to]);
  if (endpoints.length < 2) return false;
  const entities = unionStepEntitySet(first, second);
  return endpoints.every(endpoint => entities.has(endpoint));
}

function buildPairCandidate(record, first, second, observation, source) {
  const sigma = [clone(first), clone(second)];
  const relation = clone(record.relation);
  return {
    id: `${source}:${record.occurrenceId}:${hash(`${first.id}>${second.id}`).slice(0, 16)}`,
    A_c: uniq([first.actor, ...arr(first.participants), second.actor, ...arr(second.participants)]),
    R_c: [relation, ...arr(first.relations).map(clone), ...arr(second.relations).map(clone)],
    B_c: uniq([first.capabilityId, second.capabilityId]),
    sigma,
    K_c: {
      observationId: observation?.id ?? null,
      historicalProcessBridge: {
        occurrenceId: record.occurrenceId,
        sourceExperienceId: record.sourceExperienceId,
        orderedPair: [first.action, second.action],
        sourceOrder: record.order
      }
    },
    lifeViolation: first.lifeViolation === true || second.lifeViolation === true,
    requiresLifeAssessment: first.requiresLifeAssessment === true || second.requiresLifeAssessment === true,
    trace: {
      source,
      occurrenceId: record.occurrenceId,
      sourceExperienceId: record.sourceExperienceId,
      relationKey: relationKey(relation)
    }
  };
}

export function classifyGammaV2Recurrence(records, observation) {
  const active = [];
  for (const record of records ?? []) {
    if (record?.e !== 1) continue;
    const duplicate = exactRelationCurrent(record, observation);
    if (duplicate) {
      active.push({
        ...clone(record),
        recurrenceRoute: 'C',
        continuityDuplicate: true
      });
      continue;
    }
    if (endpointsPresent(record, observation)) {
      active.push({
        ...clone(record),
        recurrenceRoute: 'R',
        continuityDuplicate: false
      });
    }
  }
  return active;
}

export function buildHistoricalProcessBridgeCandidatesV2({ observation, activeRelations, steps, canonicalPossibilities }) {
  const canonicalSignatures = new Set(arr(canonicalPossibilities).map(sigmaSignature));
  const bySignature = new Map();

  for (const record of activeRelations ?? []) {
    if (record?.recurrenceRoute !== 'R' || record?.continuityDuplicate === true) continue;
    const sourceActions = arr(record?.sourceSigmaActions);
    if (sourceActions.length < 2) continue;
    const allowedPairs = new Set(orderedPairs(sourceActions).map(([a, b]) => pairKey(a, b)));

    for (const first of steps ?? []) {
      if (!canStartStep(first, observation)) continue;
      for (const second of steps ?? []) {
        if (!allowedPairs.has(pairKey(first.action, second.action))) continue;
        if (!canFollowByPhysicalPrerequisites(first, second, observation)) continue;
        if (!candidateInvolvesHistoricalEndpoints(record, first, second)) continue;
        const candidate = buildPairCandidate(record, first, second, observation, 'gamma-v2-historical-process-bridge');
        const signature = sigmaSignature(candidate);
        if (canonicalSignatures.has(signature)) continue;
        if (!bySignature.has(signature)) bySignature.set(signature, candidate);
      }
    }
  }

  return [...bySignature.values()];
}

function deterministicScramble(actions, occurrenceId) {
  const rows = arr(actions).map((action, index) => ({ action, index, key: hash(`${occurrenceId}|${index}|${action}`) }));
  rows.sort((a, b) => a.key.localeCompare(b.key) || a.index - b.index);
  let out = rows.map(row => row.action);
  if (out.length > 1 && out.every((value, index) => value === actions[index])) out = [...out].reverse();
  return out;
}

function buildShamPool({ observation, activeRelations, steps, canonicalPossibilities }) {
  const canonicalSignatures = new Set(arr(canonicalPossibilities).map(sigmaSignature));
  const forbiddenPairs = new Set();
  for (const record of activeRelations ?? []) {
    if (record?.recurrenceRoute !== 'R') continue;
    for (const [a, b] of orderedPairs(arr(record.sourceSigmaActions))) forbiddenPairs.add(pairKey(a, b));
  }

  const pool = new Map();
  for (const first of steps ?? []) {
    if (!canStartStep(first, observation)) continue;
    for (const second of steps ?? []) {
      if (!canFollowByPhysicalPrerequisites(first, second, observation)) continue;
      if (forbiddenPairs.has(pairKey(first.action, second.action))) continue;
      const syntheticRecord = {
        occurrenceId: 'sham',
        sourceExperienceId: null,
        order: -1,
        relation: { id: 'sham:none', kind: 'sham', from: first.actor, to: second.target ?? second.actor }
      };
      const candidate = buildPairCandidate(syntheticRecord, first, second, observation, 'gamma-v2-candidate-count-sham');
      candidate.R_c = [...arr(first.relations).map(clone), ...arr(second.relations).map(clone)];
      candidate.K_c.historicalProcessBridge = null;
      const signature = sigmaSignature(candidate);
      if (canonicalSignatures.has(signature)) continue;
      if (!pool.has(signature)) pool.set(signature, candidate);
    }
  }
  return [...pool.values()];
}

export class OASISGammaV2Kernel extends OASISMathKernelV1CanonicalMemorySafe {
  constructor(options = {}) {
    super(options);
    this.gammaV2InterventionActive = false;
    this.lastGammaV2Diagnostics = null;
  }

  setGammaV2Intervention(active) {
    this.gammaV2InterventionActive = active === true;
  }

  wIncorporate(experience) {
    const before = this.state.historyRelations.length;
    const stored = super.wIncorporate(experience);
    const sourceSigmaActions = arr(experience?.choice?.sigma).map(step => step?.action).filter(Boolean);
    const sourceParticipantIds = uniq([
      ...arr(experience?.choice?.A_c),
      ...arr(experience?.choice?.sigma).flatMap(step => [step?.actor, step?.target, ...arr(step?.participants)])
    ]);
    for (let i = before; i < this.state.historyRelations.length; i++) {
      const record = this.state.historyRelations[i];
      record.sourceSigmaActions = clone(sourceSigmaActions);
      record.sourceParticipantIds = clone(sourceParticipantIds);
      record.sourceRelationOccurrenceOrder = record.order;
    }
    return stored;
  }

  gamma(observation, participation) {
    for (const record of this.state.historyRelations) record.q = 0;
    const active = classifyGammaV2Recurrence(this.state.historyRelations, observation);
    for (const row of active) {
      const record = this.state.historyRelations.find(r => r.occurrenceId === row.occurrenceId);
      if (record) record.q = 1;
    }
    return active.map(clone);
  }

  omega(observation, participation, activeRelations, budget) {
    const canonical = OASISMathKernelV1CanonicalMemorySafe.prototype.omega.call(this, observation, participation, activeRelations, budget);
    const steps = this.instantiateCapabilities(observation, participation, activeRelations, budget);
    const historical = buildHistoricalProcessBridgeCandidatesV2({ observation, activeRelations, steps, canonicalPossibilities: canonical });
    this.lastGammaV2Diagnostics = {
      activeRelationCount: activeRelations.length,
      routeRCount: activeRelations.filter(r => r.recurrenceRoute === 'R').length,
      routeCCount: activeRelations.filter(r => r.recurrenceRoute === 'C').length,
      canonicalPossibilityCount: canonical.length,
      historicalBridgeCandidateCount: historical.length,
      historicalBridgeSignatures: historical.map(sigmaSignature)
    };
    return [...canonical.map(clone), ...historical.map(clone)];
  }
}

export class OASISGammaV2OffKernel extends OASISGammaV2Kernel {
  gamma(observation, participation) {
    const intact = super.gamma(observation, participation);
    if (!this.gammaV2InterventionActive) return intact;
    this.lastGammaV2Diagnostics = {
      ...(this.lastGammaV2Diagnostics ?? {}),
      blockedGammaActiveCount: intact.length,
      blockedOccurrenceIds: intact.map(r => r.occurrenceId)
    };
    return [];
  }
}

export class OASISGammaV2OrderScrambledKernel extends OASISGammaV2Kernel {
  gamma(observation, participation) {
    const intact = super.gamma(observation, participation);
    if (!this.gammaV2InterventionActive) return intact;
    return intact.map(record => ({
      ...record,
      sourceSigmaActions: deterministicScramble(arr(record.sourceSigmaActions), record.occurrenceId),
      orderScrambledControl: true
    }));
  }
}

export class OASISGammaV2CandidateMatchedShamKernel extends OASISGammaV2Kernel {
  omega(observation, participation, activeRelations, budget) {
    if (!this.gammaV2InterventionActive) return super.omega(observation, participation, activeRelations, budget);

    const canonical = OASISMathKernelV1CanonicalMemorySafe.prototype.omega.call(this, observation, participation, activeRelations, budget);
    const steps = this.instantiateCapabilities(observation, participation, activeRelations, budget);
    const historical = buildHistoricalProcessBridgeCandidatesV2({ observation, activeRelations, steps, canonicalPossibilities: canonical });
    const shamPool = buildShamPool({ observation, activeRelations, steps, canonicalPossibilities: canonical })
      .sort((a, b) => hash(sigmaSignature(a)).localeCompare(hash(sigmaSignature(b))) || sigmaSignature(a).localeCompare(sigmaSignature(b)));
    const target = historical.length;
    const selected = shamPool.slice(0, target);
    this.lastGammaV2Diagnostics = {
      activeRelationCount: activeRelations.length,
      routeRCount: activeRelations.filter(r => r.recurrenceRoute === 'R').length,
      canonicalPossibilityCount: canonical.length,
      historicalBridgeCandidateCount: historical.length,
      shamPoolCount: shamPool.length,
      shamTargetCount: target,
      shamReturnedCount: selected.length,
      shamMatchAvailable: selected.length === target,
      shamSignatures: selected.map(sigmaSignature)
    };
    return [...canonical.map(clone), ...selected.map(clone)];
  }
}

export const GammaV2TestHelpers = Object.freeze({
  canStartStep,
  canFollowByPhysicalPrerequisites,
  endpointsPresent,
  exactRelationCurrent,
  orderedPairs,
  sigmaSignature,
  deterministicScramble,
  buildShamPool
});
