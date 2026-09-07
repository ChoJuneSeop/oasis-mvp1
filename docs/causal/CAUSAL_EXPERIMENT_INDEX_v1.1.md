# OASIS Causal Research Experiment Index v1.1

Date: 2026-09-07
Supersedes current status in v1.0; v1.0 remains preserved.
Baseline: OASIS Integrated Core v2.0.

## CR-00 Evidence freeze
Status: COMPLETE

Current ledger: `docs/causal/CAUSAL_EVIDENCE_LEDGER_v1.1.md`.

## CR-01 Process-identity trace integrity
Status: COMPLETE / SUPPORTED as implementation-process trace evidence

Run: `34077392032`
Artifact: `10002630131`

Key result:
- 10,045 process identities formed
- 9,805 latentized
- 9,781 reactivated
- 9,752 reached participation with the same identity
- 9,705 reached linked outcome with the same identity
- 9,587 experienced multiple reactivate/noncurrent cycles
- 24 latent identities had no observed reactivation by 120k and are right-censored
- 7,321 were current at the horizon and are right-censored for next transition
- hard temporal/state invariant anomalies: 0
- `field-spiral`: 0, therefore outcome -> future relation rewrite is NOT OBSERVED in this broad latent-store run

## CR-02 Individual vs joint same-current attribution
Status: RUNNING

Question:
When the whole current latent set changes the decision signature, are there individually necessary/sufficient process identities, or is the effect primarily redundant/overdetermined or interaction-only?

Frozen hierarchy:
1. relation-key group
2. decision-footprint group = relation key + place set
3. episode identity

Frozen comparisons:
- full current latent set
- no latent set
- full minus unit
- unit only

Interpretation:
- necessity and sufficiency are separate
- decision-structure and actual-choice effects are separate
- leave-one-out failure is not evidence of non-causality when redundancy/overdetermination exists
- same-current harness evidence only, not general actual-causation proof

## CR-03 1-minimal irreducible joint support sets
Status: PLANNED / GATED ON CR-02

Kill-search complete before execution.
Prior art establishes necessary-elements-of-sufficient-sets and delta-debugging-style 1-minimal reduction. Therefore novelty is not minimal-set search itself.

OASIS research target:
For changed-decision moments that cannot be explained by a single process identity, identify 1-minimal relational support sets inside the frozen current relation field.

Rules:
- report `1-minimal irreducible support set`, not global minimum unless exhaustive proof is feasible
- separately minimize decision-signature preservation and actual-choice preservation
- preserve exact same current state
- no shadow feedback
- record multiple alternative irreducible sets if found; do not force one canonical cause

## CR-04 Outcome counterfactual
Status: PLANNED / GATED ON CR-02/03

Question:
Starting from the exact same pre-outcome state, does changing/suppressing the realized outcome alter the next decision/relation state?

This is required because CR-01 observed outcome linkage but zero field-spiral in the broad latent-store harness.

## CR-05 Long-horizon propagation
Status: PLANNED / GATED ON CR-04

Use same-pre-state branched trajectories and the same exogenous reality tape. Track relation formation, latentization, reactivation, participation, choice and possible natural return/reconvergence.

Time-varying confounding / treatment-confounder feedback must be respected; simple longitudinal correlation is insufficient.

## CR-06 Production O1 order test
Status: PLANNED / SEPARATE

Synthetic O1 feasibility does not count as production proof.

## CR-07 O4 behavioral test
Status: PLANNED / SEPARATE

O4 remains a hard design constraint even if a distinct behavioral signature is absent.

## CR-08 Responsibility-axis identification
Status: PLANNED AFTER O3 CAUSAL CHAIN

Forbidden shortcut: `danger = responsibility`.
Current danger remains only a candidate/context variable until intervention evidence exists.

## CR-09 Generalization
Status: LAST

External-model superiority and industry comparison are separate from operator-existence proof.
