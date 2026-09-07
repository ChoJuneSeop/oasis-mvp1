# CR-01 Process Identity Trace Integrity — 120k Result

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0
Run: `34077392032`
Artifact: `10002630131`
Artifact SHA-256: `418602a5bfc89aa5a0fb8768232c556403722ff96806ea3169d010f276c90705`

## Scope

This experiment asks whether the existing opt-in latent relation store can preserve one research process identity across the observed sequence:

`formation -> latentization -> contextual reactivation -> current participation -> linked outcome`

It does not assume that outcome necessarily rewrites future relation structure, and it does not assume that each process identity is individually causally necessary.

## Validity

Canonical compatibility guard: PASS.

Hard temporal/state invariant anomalies: 0.
Soft audit gaps: 0.

The first implementation of the trace assembler failed with a Node heap OOM because it retained roughly two million full audit event objects. That run is a harness/resource failure, not a scientific failure. The assembler was changed to a streaming summary while the 120k production/audit conditions were left unchanged.

## 120k audit

- formed process identities: 10,045
- latentized identities: 9,805
- reactivated identities: 9,781
- identities reaching participation: 9,752
- identities reaching linked outcome: 9,705
- identities reaching observed `field-spiral`: 0
- identities appearing in changed whole-latent-layer counterfactual contexts: 9,191
- multiple reactivate/noncurrent cycles: 9,587
- no reactivation observed by horizon: 24
- current at horizon: 7,321

## Interpretation

### Supported as implementation/process evidence

1. Non-currentness is not deletion in this harness.
2. Contextual reactivation can occur after latentization while keeping the same `episodeId` identity.
3. The same identity can be traced through participation and linked outcome.
4. Current/non-current state is recurrent rather than a one-shot classification.
5. Right-censoring is necessary for long-horizon interpretation.

### Not supported by this experiment

1. No future relation rewrite was observed through `field-spiral` in the 120k broad latent-store run.
2. Membership in a changed whole-latent-layer counterfactual set does not prove individual necessity or sufficiency.
3. Outcome linkage is observational here; outcome counterfactual effect remains unvalidated.
4. Full production O1 noncommutativity remains unvalidated because the production pair key is order-insensitive.
5. O4 distinct behavioral effect, responsibility-axis identity and direct causality of unrealized possibilities remain unvalidated.
6. Generalization beyond this harness is unvalidated.

## OASIS interpretation

The important observation is not that a stored memory exists at one coordinate. A completed relational process can leave the current state, remain latent, form a new relation with a later current, participate again, and be linked to an actual outcome while preserving research identity. However, the absence of `field-spiral` shows that the current broad latent-store implementation does not yet establish the complete OASIS causal chain through future relation rewrite.

Therefore the next work is decomposition of joint vs individual contribution (CR-02), followed by direct outcome/rewrite counterfactual testing rather than assuming the missing link.
