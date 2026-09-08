import { createHash } from 'node:crypto';
import { OASISGammaV2Kernel } from './oasis-gamma-v2-kernel.mjs';

const clone = value => value == null ? value : structuredClone(value);
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))];
const hash = text => createHash('sha256').update(String(text)).digest('hex');

const CANONICAL_OMEGA_SOURCE = 'canonical-relational-sequential-composition';
const GAMMA_BRIDGE_SOURCE = 'gamma-v2-historical-process-bridge';

function sigmaIdSignature(possibility) {
  return arr(possibility?.sigma).map(step => step?.id ?? `${step?.action ?? ''}:${step?.target ?? ''}`).join('>');
}

function tokenKind(token) {
  const text = String(token ?? '');
  const index = text.indexOf(':');
  return index < 0 ? text : text.slice(0, index);
}

function structuralStepSignature(step) {
  return {
    capability: step?.capabilityId ?? step?.action ?? '',
    action: step?.action ?? '',
    requiresTokenKinds: uniq(arr(step?.requires).map(tokenKind)).sort(),
    providesTokenKinds: uniq(arr(step?.provides).map(tokenKind)).sort(),
    requiresEntity: arr(step?.requiresEntities).length > 0,
    createsEntity: arr(step?.createsEntities).length > 0,
    requiresRelationKinds: uniq(arr(step?.requiresRelationKinds)).sort(),
    providesRelationKinds: uniq(arr(step?.providesRelationKinds)).sort(),
    requiresBridgeKeys: uniq(arr(step?.requiresBridgeKeys)).sort(),
    providesBridgeKeys: uniq(arr(step?.bridgeKeys)).sort()
  };
}

export function omegaV2MacroSignature(possibility) {
  return JSON.stringify(arr(possibility?.sigma).map(structuralStepSignature));
}

export function isCanonicalOmegaComposite(possibility) {
  return (possibility?.sigma?.length ?? 0) >= 2 && possibility?.trace?.source === CANONICAL_OMEGA_SOURCE;
}

export function isGammaV2BridgeCandidate(possibility) {
  return possibility?.trace?.source === GAMMA_BRIDGE_SOURCE;
}

function currentFactIds(observation) {
  return new Set(arr(observation?.facts).map(f => typeof f === 'string' ? f : f?.id).filter(Boolean));
}

export function omegaV2CanStartStep(step, observation) {
  const facts = currentFactIds(observation);
  if (!arr(step?.requires).every(req => facts.has(req))) return false;
  const entities = new Set(arr(observation?.entities));
  if (!arr(step?.requiresEntities).every(entity => entities.has(entity))) return false;
  const relationKinds = new Set(arr(observation?.relations).map(r => r.kind));
  if (!arr(step?.requiresRelationKinds).every(kind => relationKinds.has(kind))) return false;
  if (arr(step?.requiresBridgeKeys).length) return false;
  return true;
}

function intersects(left, right) {
  const r = new Set(right);
  return left.some(value => r.has(value));
}

export function omegaV2AdjacentDependency(first, second) {
  const token = intersects(arr(first?.provides), arr(second?.requires));
  const entity = intersects(arr(first?.createsEntities), arr(second?.requiresEntities));
  const relation = intersects(arr(first?.providesRelationKinds), arr(second?.requiresRelationKinds));
  const bridge = intersects(arr(first?.bridgeKeys), arr(second?.requiresBridgeKeys));
  return { token, entity, relation, bridge, any: token || entity || relation || bridge };
}

function safeIndependentStep(step, observation) {
  if (!omegaV2CanStartStep(step, observation)) return false;
  // Strong sham condition: the step must not depend on any current token/entity/
  // relation/bridge prerequisite. This avoids creating shams whose later step can
  // be invalidated because it secretly depends on the previous step.
  return arr(step?.requires).length === 0 &&
    arr(step?.requiresEntities).length === 0 &&
    arr(step?.requiresRelationKinds).length === 0 &&
    arr(step?.requiresBridgeKeys).length === 0;
}

function makeIndependentShamCandidate(sequence, observation) {
  const sigma = sequence.map(clone);
  return {
    id: `omega-v2-sham:${hash(`${observation?.id ?? ''}|${sigma.map(s => s.id).join('>')}`).slice(0, 24)}`,
    A_c: uniq(sigma.flatMap(step => [step?.actor, ...arr(step?.participants)])),
    R_c: [],
    B_c: uniq(sigma.map(step => step?.capabilityId).filter(Boolean)),
    sigma,
    K_c: {
      observationId: observation?.id ?? null,
      independentSequenceSham: true
    },
    lifeViolation: sigma.some(step => step?.lifeViolation === true),
    requiresLifeAssessment: sigma.some(step => step?.requiresLifeAssessment === true),
    trace: {
      source: 'omega-v2-independent-sequence-sham',
      noPriorStepDependency: true
    }
  };
}

export function buildOmegaV2IndependentShamPool({ observation, steps, intactPossibilities, maxNeeded = 384 }) {
  const forbidden = new Set(arr(intactPossibilities).map(sigmaIdSignature));
  const safe = arr(steps)
    .filter(step => safeIndependentStep(step, observation))
    .sort((a, b) => hash(`${observation?.id ?? ''}|${a.id}`).localeCompare(hash(`${observation?.id ?? ''}|${b.id}`)) || String(a.id).localeCompare(String(b.id)));

  const byDepth = new Map();
  for (let depth = 2; depth <= 5; depth++) byDepth.set(depth, []);

  function visit(prefix, depth) {
    if (prefix.length === depth) {
      const idSig = prefix.map(step => step.id).join('>');
      if (forbidden.has(idSig)) return;
      for (let i = 0; i + 1 < prefix.length; i++) {
        if (omegaV2AdjacentDependency(prefix[i], prefix[i + 1]).any) return;
      }
      byDepth.get(depth).push(makeIndependentShamCandidate(prefix, observation));
      return;
    }
    if (byDepth.get(depth).length >= maxNeeded) return;
    for (const step of safe) {
      if (step?.repeatable !== true && prefix.some(prev => prev.id === step.id)) continue;
      visit([...prefix, step], depth);
      if (byDepth.get(depth).length >= maxNeeded) break;
    }
  }

  for (let depth = 2; depth <= 5; depth++) visit([], depth);
  return byDepth;
}

function histogram(possibilities) {
  const out = {};
  for (const p of possibilities) {
    const depth = p?.sigma?.length ?? 0;
    out[depth] = (out[depth] ?? 0) + 1;
  }
  return out;
}

function selectCountDepthMatchedShams({ observation, steps, intactPossibilities, targetComposites }) {
  const targetHistogram = histogram(targetComposites);
  const maxNeeded = Math.max(384, ...Object.values(targetHistogram), 0);
  const pool = buildOmegaV2IndependentShamPool({ observation, steps, intactPossibilities, maxNeeded });
  const selected = [];
  let available = true;
  for (const [depthText, count] of Object.entries(targetHistogram)) {
    const depth = Number(depthText);
    const candidates = [...(pool.get(depth) ?? [])]
      .sort((a, b) => hash(sigmaIdSignature(a)).localeCompare(hash(sigmaIdSignature(b))) || sigmaIdSignature(a).localeCompare(sigmaIdSignature(b)));
    if (candidates.length < count) available = false;
    selected.push(...candidates.slice(0, count));
  }
  return {
    selected,
    available: available && selected.length === targetComposites.length,
    targetHistogram,
    selectedHistogram: histogram(selected),
    poolCounts: Object.fromEntries([...pool.entries()].map(([depth, values]) => [depth, values.length]))
  };
}

export class OASISOmegaV2Kernel extends OASISGammaV2Kernel {
  constructor(options = {}) {
    super(options);
    this.omegaV2InterventionActive = false;
    this.omegaV2MacroLibrary = null;
    this.lastOmegaV2Diagnostics = null;
  }

  setOmegaV2Intervention(active) {
    this.omegaV2InterventionActive = active === true;
  }

  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    const canonicalComposites = intact.filter(isCanonicalOmegaComposite);
    if (this.omegaV2MacroLibrary == null) {
      this.omegaV2MacroLibrary = Object.freeze([...new Set(canonicalComposites.map(omegaV2MacroSignature))].sort());
    }
    this.lastOmegaV2Diagnostics = {
      active: this.omegaV2InterventionActive,
      intactTotalCount: intact.length,
      canonicalCompositeCount: canonicalComposites.length,
      gammaBridgeCount: intact.filter(isGammaV2BridgeCandidate).length,
      macroLibraryCount: this.omegaV2MacroLibrary.length,
      onlineNovelCompositeCount: canonicalComposites.filter(p => !this.omegaV2MacroLibrary.includes(omegaV2MacroSignature(p))).length
    };
    return intact.map(clone);
  }
}

export class OASISOmegaV2AtomicOnlyKernel extends OASISOmegaV2Kernel {
  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    if (!this.omegaV2InterventionActive) return intact;
    const returned = intact.filter(p => !isCanonicalOmegaComposite(p));
    this.lastOmegaV2Diagnostics = {
      ...(this.lastOmegaV2Diagnostics ?? {}),
      blockedCanonicalCompositeCount: intact.length - returned.length,
      returnedTotalCount: returned.length,
      preservedGammaBridgeCount: returned.filter(isGammaV2BridgeCandidate).length
    };
    return returned.map(clone);
  }
}

export class OASISOmegaV2FrozenMacroKernel extends OASISOmegaV2Kernel {
  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    if (!this.omegaV2InterventionActive) return intact;
    const library = new Set(this.omegaV2MacroLibrary ?? []);
    const returned = intact.filter(p => !isCanonicalOmegaComposite(p) || library.has(omegaV2MacroSignature(p)));
    const blocked = intact.filter(p => isCanonicalOmegaComposite(p) && !library.has(omegaV2MacroSignature(p)));
    this.lastOmegaV2Diagnostics = {
      ...(this.lastOmegaV2Diagnostics ?? {}),
      staticMacroBlockedCount: blocked.length,
      staticMacroBlockedSignatures: [...new Set(blocked.map(omegaV2MacroSignature))].sort(),
      returnedTotalCount: returned.length,
      preservedGammaBridgeCount: returned.filter(isGammaV2BridgeCandidate).length
    };
    return returned.map(clone);
  }
}

export class OASISOmegaV2IndependentShamKernel extends OASISOmegaV2Kernel {
  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    if (!this.omegaV2InterventionActive) return intact;

    const target = intact.filter(isCanonicalOmegaComposite);
    const retained = intact.filter(p => !isCanonicalOmegaComposite(p));
    const steps = this.instantiateCapabilities(observation, participation, activeRelations, budget);
    const match = selectCountDepthMatchedShams({ observation, steps, intactPossibilities: intact, targetComposites: target });
    const returned = [...retained.map(clone), ...match.selected.map(clone)];
    this.lastOmegaV2Diagnostics = {
      ...(this.lastOmegaV2Diagnostics ?? {}),
      shamTargetCount: target.length,
      shamReturnedCount: match.selected.length,
      shamMatchAvailable: match.available,
      targetDepthHistogram: match.targetHistogram,
      shamDepthHistogram: match.selectedHistogram,
      shamPoolCounts: match.poolCounts,
      returnedTotalCount: returned.length,
      preservedGammaBridgeCount: retained.filter(isGammaV2BridgeCandidate).length
    };
    return returned;
  }
}

export const OmegaV2TestHelpers = Object.freeze({
  structuralStepSignature,
  sigmaIdSignature,
  safeIndependentStep,
  histogram,
  selectCountDepthMatchedShams
});