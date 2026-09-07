import { OASISMathKernelV1Canonical } from '../../executable/src/oasis-math-kernel-v1-canonical.mjs';

function compactObservation(observation) {
  if (!observation || typeof observation !== 'object') return observation;
  return {
    id: observation.id ?? null,
    sequence: observation.sequence ?? null,
    time: observation.time ?? null
  };
}

function compactExperience(experience) {
  if (!experience || typeof experience !== 'object') return experience;
  return {
    id: experience.id ?? null,
    sequence: experience.sequence ?? null
  };
}

function compactDeliberation(deliberation) {
  if (!deliberation || typeof deliberation !== 'object') return deliberation;
  return {
    id: deliberation.id ?? null,
    status: deliberation.status ?? null,
    nonIntervention: deliberation.nonIntervention === true
  };
}

function compactRealization(realization) {
  if (!realization || typeof realization !== 'object') return realization;
  return {
    id: realization.id ?? null,
    choiceId: realization.choiceId ?? null,
    experienceId: realization.experienceId ?? null
  };
}

function compactSelfIntervention(intervention) {
  if (!intervention || typeof intervention !== 'object') return intervention;
  return {
    index: intervention.index ?? null,
    round: intervention.round ?? null,
    action: intervention.action ?? null
  };
}

/**
 * Research-runtime wrapper for long prehistoric flows.
 *
 * This does NOT alter Γ, Ω, κ, Ψ, P, χ, ρ, D, W, world physics, observation,
 * personality disposition, or any choice inputs.
 *
 * It only compacts archival/debug copies that the canonical kernel never reads
 * back into future decisions. Array lengths are preserved because canonical IDs
 * use those lengths as sequence counters. Causal relation history remains full.
 */
export class OASISMathKernelV1CanonicalMemorySafe extends OASISMathKernelV1Canonical {
  compactNonCausalArchives() {
    // Preserve lengths exactly; future observation/deliberation/experience IDs
    // therefore remain identical to the un-compacted canonical kernel.
    this.state.observations = this.state.observations.map(compactObservation);
    this.state.history = this.state.history.map(compactExperience);
    this.state.deliberations = this.state.deliberations.map(compactDeliberation);
    this.state.realizations = this.state.realizations.map(compactRealization);
    this.state.selfInterventions = this.state.selfInterventions.map(compactSelfIntervention);

    // Do not compact these: they are causally live or current.
    // - this.state.historyRelations: consumed by Γ in later reality.
    // - this.state.currentObservation: latest observed reality.
  }

  async step() {
    const transition = await super.step();
    // transition is already a detached clone from canonical step(); downstream
    // audit can inspect it before it is discarded by the streaming runner.
    this.compactNonCausalArchives();
    return transition;
  }
}

export function createOASISMathKernelV1CanonicalMemorySafe(options = {}) {
  return new OASISMathKernelV1CanonicalMemorySafe(options);
}
