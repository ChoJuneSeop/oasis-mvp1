import { createHash } from 'node:crypto';
import { OASISMathKernelV1CanonicalMemorySafe } from './oasis-math-kernel-v1.2-memory-safe.mjs';

const clone = value => value == null ? value : structuredClone(value);

function hashKey(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function relationOccurrenceKey(record) {
  return String(record?.occurrenceId ?? record?.sourceExperienceId ?? record?.relation?.id ?? '');
}

function possibilitySortKey(seed, agentId, observationId, possibility) {
  return hashKey(`${seed}|${agentId}|${observationId}|${possibility?.id ?? ''}`);
}

export class GammaOffKernelV1 extends OASISMathKernelV1CanonicalMemorySafe {
  constructor(options = {}) {
    super(options);
    this.gammaInterventionActive = false;
    this.lastGammaInterventionDiagnostics = null;
  }

  setGammaIntervention(active) {
    this.gammaInterventionActive = active === true;
  }

  gamma(observation, participation) {
    // Always run canonical Gamma first so q/e bookkeeping and all history state
    // remain canonical. The intervention changes only the returned historical
    // re-entry channel after onset.
    const intact = super.gamma(observation, participation);
    if (!this.gammaInterventionActive) {
      this.lastGammaInterventionDiagnostics = {
        active: false,
        intactActiveCount: intact.length,
        returnedActiveCount: intact.length,
        blockedOccurrenceIds: []
      };
      return intact;
    }

    this.lastGammaInterventionDiagnostics = {
      active: true,
      intactActiveCount: intact.length,
      returnedActiveCount: 0,
      blockedOccurrenceIds: intact.map(relationOccurrenceKey)
    };
    return [];
  }
}

export class GammaHistoryLossControlKernelV1 extends OASISMathKernelV1CanonicalMemorySafe {
  constructor(options = {}) {
    super(options);
    this.gammaInterventionActive = false;
    this.controlSeed = String(options.controlSeed ?? '');
    this.controlAgentId = String(options.controlAgentId ?? '');
    this.lastGammaInterventionDiagnostics = null;
  }

  setGammaIntervention(active) {
    this.gammaInterventionActive = active === true;
  }

  gamma(observation, participation) {
    const intact = super.gamma(observation, participation);
    if (!this.gammaInterventionActive || intact.length === 0) {
      this.lastGammaInterventionDiagnostics = {
        active: this.gammaInterventionActive,
        intactActiveCount: intact.length,
        returnedActiveCount: intact.length,
        maskTargetCount: 0,
        maskedHistoryOccurrenceIds: [],
        activeOccurrencesRemoved: []
      };
      return intact;
    }

    // Match the NUMBER of historical records made inaccessible to the number
    // that Gamma-off would block at this turn, while choosing those records
    // independent of current relational relevance.
    const maskTargetCount = Math.min(intact.length, this.state.historyRelations.length);
    const rankedHistory = [...this.state.historyRelations]
      .map(record => ({
        record,
        key: hashKey(`${this.controlSeed}|${this.controlAgentId}|${relationOccurrenceKey(record)}`)
      }))
      .sort((a, b) => a.key.localeCompare(b.key) || relationOccurrenceKey(a.record).localeCompare(relationOccurrenceKey(b.record)));
    const maskedHistoryOccurrenceIds = rankedHistory.slice(0, maskTargetCount).map(row => relationOccurrenceKey(row.record));
    const mask = new Set(maskedHistoryOccurrenceIds);
    const returned = intact.filter(record => !mask.has(relationOccurrenceKey(record)));
    const activeOccurrencesRemoved = intact.filter(record => mask.has(relationOccurrenceKey(record))).map(relationOccurrenceKey);

    this.lastGammaInterventionDiagnostics = {
      active: true,
      intactActiveCount: intact.length,
      returnedActiveCount: returned.length,
      maskTargetCount,
      maskedHistoryOccurrenceIds,
      activeOccurrencesRemoved
    };
    return returned;
  }
}

export class OmegaAtomicOnlyKernelV1 extends OASISMathKernelV1CanonicalMemorySafe {
  constructor(options = {}) {
    super(options);
    this.omegaInterventionActive = false;
    this.lastOmegaInterventionDiagnostics = null;
  }

  setOmegaIntervention(active) {
    this.omegaInterventionActive = active === true;
  }

  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    const composites = intact.filter(p => (p?.sigma?.length ?? 0) >= 2);
    if (!this.omegaInterventionActive) {
      this.lastOmegaInterventionDiagnostics = {
        active: false,
        intactTotalCount: intact.length,
        intactCompositeCount: composites.length,
        returnedTotalCount: intact.length,
        returnedCompositeCount: composites.length
      };
      return intact;
    }

    const returned = intact.filter(p => (p?.sigma?.length ?? 0) === 1);
    this.lastOmegaInterventionDiagnostics = {
      active: true,
      intactTotalCount: intact.length,
      intactCompositeCount: composites.length,
      returnedTotalCount: returned.length,
      returnedCompositeCount: 0
    };
    return returned;
  }
}

export class OmegaCountMatchedControlKernelV1 extends OASISMathKernelV1CanonicalMemorySafe {
  constructor(options = {}) {
    super(options);
    this.omegaInterventionActive = false;
    this.controlSeed = String(options.controlSeed ?? '');
    this.controlAgentId = String(options.controlAgentId ?? '');
    this.lastOmegaInterventionDiagnostics = null;
  }

  setOmegaIntervention(active) {
    this.omegaInterventionActive = active === true;
  }

  omega(observation, participation, activeRelations, budget) {
    const intact = super.omega(observation, participation, activeRelations, budget);
    const atomics = intact.filter(p => (p?.sigma?.length ?? 0) === 1);
    const composites = intact.filter(p => (p?.sigma?.length ?? 0) >= 2);
    if (!this.omegaInterventionActive || composites.length === 0) {
      this.lastOmegaInterventionDiagnostics = {
        active: this.omegaInterventionActive,
        intactTotalCount: intact.length,
        intactCompositeCount: composites.length,
        targetCandidateCount: intact.length,
        returnedTotalCount: intact.length,
        returnedCompositeCount: composites.length
      };
      return intact;
    }

    // Atomic-only would return exactly atomics.length candidates. Keep that same
    // cardinality, but retain a deterministic mixture of atomic and composite
    // candidates whenever both classes exist and the target size permits it.
    const target = atomics.length;
    if (target === 0) {
      this.lastOmegaInterventionDiagnostics = {
        active: true,
        intactTotalCount: intact.length,
        intactCompositeCount: composites.length,
        targetCandidateCount: 0,
        returnedTotalCount: 0,
        returnedCompositeCount: 0
      };
      return [];
    }

    const rank = p => possibilitySortKey(this.controlSeed, this.controlAgentId, observation.id, p);
    const rankedAtomics = [...atomics].sort((a, b) => rank(a).localeCompare(rank(b)) || String(a.id).localeCompare(String(b.id)));
    const rankedComposites = [...composites].sort((a, b) => rank(a).localeCompare(rank(b)) || String(a.id).localeCompare(String(b.id)));

    let compositeKeep = Math.round(target * (composites.length / Math.max(1, intact.length)));
    if (rankedComposites.length && rankedAtomics.length && target >= 2) {
      compositeKeep = Math.max(1, Math.min(target - 1, compositeKeep));
    } else {
      compositeKeep = Math.min(target, compositeKeep);
    }
    compositeKeep = Math.min(compositeKeep, rankedComposites.length);
    const atomicKeep = Math.min(target - compositeKeep, rankedAtomics.length);

    let selected = [...rankedComposites.slice(0, compositeKeep), ...rankedAtomics.slice(0, atomicKeep)];
    if (selected.length < target) {
      const selectedIds = new Set(selected.map(p => p.id));
      const remainder = [...rankedAtomics, ...rankedComposites]
        .filter(p => !selectedIds.has(p.id))
        .sort((a, b) => rank(a).localeCompare(rank(b)) || String(a.id).localeCompare(String(b.id)));
      selected = [...selected, ...remainder.slice(0, target - selected.length)];
    }

    const returnedCompositeCount = selected.filter(p => (p?.sigma?.length ?? 0) >= 2).length;
    this.lastOmegaInterventionDiagnostics = {
      active: true,
      intactTotalCount: intact.length,
      intactCompositeCount: composites.length,
      targetCandidateCount: target,
      returnedTotalCount: selected.length,
      returnedCompositeCount,
      selectedPossibilityIds: selected.map(p => p.id)
    };
    return clone(selected);
  }
}

export function interventionKernelOwnMethodsV1(klass) {
  return Object.getOwnPropertyNames(klass.prototype).filter(name => name !== 'constructor').sort();
}
