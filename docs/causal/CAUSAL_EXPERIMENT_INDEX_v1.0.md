# OASIS Causal Research Experiment Index v1.0

Date: 2026-09-07
Rule: execute in order. A later experiment may be prepared but its interpretation must not bypass unresolved validity failures in an earlier gate.

## CR-00 Evidence freeze
Status: COMPLETE

Purpose: freeze supported/refuted/unvalidated claims before further experimentation.
Artifacts:
- `docs/causal/CAUSAL_EVIDENCE_LEDGER_v1.0.md`
- `docs/causal/CAUSAL_RESEARCH_SYSTEM_SPEC_v1.0.md`

## CR-01 Process-identity trace integrity
Status: RUNNING

Question: can existing audit events be joined by the same process identity from formation through latent/current transitions, participation, outcome and observed later structural rewrite without temporal/invariant violations?

Primary validity gate:
- zero future-tick violations
- zero reactivate-before-latentize violations
- zero participation-while-noncurrent violations
- zero outcome-before-participation violations for referenced latent identities
- zero rewrite-before-outcome violations

Absence of complete chains is a scientific result, not a harness failure.

## CR-02 Individual vs joint causal attribution
Status: PLANNED, gated on CR-01 audit integrity

Question: when removing the entire current latent set changes the current decision signature, which identities are individually necessary, individually sufficient relative to the no-latent state, redundant, or only jointly effective?

Required comparisons in the same current state:
- full latent set
- no latent set
- full minus one identity
- one identity only

Do not infer `not causal` from a failed leave-one-out test because overdetermination/redundancy is allowed.

## CR-03 Minimal joint relational cause-set search
Status: PLANNED, gated on CR-02

Question: for joint-effect decisions with no individually necessary identity, can a smaller subset of latent processes reproduce the full decision change?

Method: danger-blind / outcome-blind subset reduction under frozen current state. Report minimal or irreducible sets as harness-relative mechanism evidence only.

## CR-04 Outcome counterfactual effect
Status: PLANNED, gated on CR-01/02

Question: does the realized choice/outcome linked to a reactivated relation process counterfactually change the next decision state, rather than merely co-occur with an observed `field-spiral`?

Constraint: shadow branch must start from the same pre-outcome state and never feed back into production.

## CR-05 Long-horizon propagation
Status: PLANNED, gated on CR-04

Question: does an outcome-linked relation rewrite alter later relation formation, reactivation, participation or choice over long horizons?

Observe emergence, contraction, disappearance, natural return and reappearance; do not require monotonic divergence.

## CR-06 O1 production-order test
Status: PLANNED / SEPARATE

Question: does the production implementation preserve a process-order distinction beyond the order-insensitive pair key and can that distinction later currentize?

Do not import the synthetic O1 result as production proof.

## CR-07 O4 behavioral test
Status: PLANNED / SEPARATE

Question: after holding current information and compute budget fixed, does a future-informed/scheduled-reactivation violation create behavior distinguishable from the non-anticipatory implementation?

O4 remains a hard design constraint even if distinct behavior is not observed.

## CR-08 Responsibility-axis identification
Status: PLANNED, after O3 causal chain is established

Question: does a responsibility state independently modulate verification/search/compute after reactivation?

Forbidden shortcut: `danger = responsibility`.
Current danger is retained only as an observed candidate/context variable until an intervention establishes a responsibility operator.

## CR-09 Generalization
Status: PLANNED LAST

Question: which validated causal-process findings survive different environments/seeds/tasks without hard-coded scenario correspondence?

External-model superiority is not part of operator existence proof and is evaluated separately.
