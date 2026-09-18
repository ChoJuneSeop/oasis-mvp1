# CBRA Failure Completed Experience Comparative Experiment v1.1

Status: FINAL_SPEC_FROZEN / PREEXECUTION_PENDING

v1.1 is a structural correction of v1.0. The v1.0 Confirmatory run is preserved as diagnostic-only because the GENERAL_HARNESS path instantiated CBRA instrumentation, the F1–F4 family factor was operationally inert, and delayed failure used only one post-Closure checkpoint. No v1.0 numerical result is used to tune v1.1.

## Systems

- **GOV_CBRA**: Governance provenance plus active CBRA history exposed to the later decision.
- **GOV_RECORD_ONLY**: identical CBRA monitoring and provenance recording, but later Governance cannot use the CBRA history.
- **GENERAL_HARNESS**: relation-level episodic outcome-memory comparator that receives the same realized failure event but has no CBRA instance, no target-level provenance revalidation, no U/I/V/T obligation revalidation, and no causal attribution layer.

GENERAL_HARNESS is a defined comparator, not a claim about all existing harness frameworks.

## Failure classes

1. participation-commission failure
2. participation-omission failure
3. responsibility-axis failure
4. exogenous failure
5. delayed failure

## Re-entry contexts

- same relation / same scope
- same relation / changed scope
- unrelated relation

## Operational families

Confirmatory families are no longer labels. They set the initial scope to four distinct values:

- F1 → scope 1
- F2 → scope 2
- F3 → scope 3
- F4 → scope 4

Changed-scope re-entry uses initial scope + 1. Thus family variation changes the runtime context while preserving the prespecified causal class.

## Delayed-failure contract

Delayed failure contains two post-Closure checkpoints for governed arms:

1. an earlier INDETERMINATE decision-linked observation at tau=12.0;
2. a later CONTRADICTS decision-linked observation at tau=13.0.

A later decision between those checkpoints may read only the first checkpoint under the as-of-time rule. A final later decision may read both. This directly tests continuous monitoring rather than merely using a later timestamp.

GENERAL_HARNESS receives the same delayed failure only when the later failure event exists; it does not instantiate CBRA.

## Pilot

15 cases = 5 failure classes × 3 contexts.

Purpose: structural sanity only.

Pilot must verify:
- fresh process isolation across all 3 arms;
- governed checkpoint count = 2 for delayed and 1 otherwise;
- GENERAL_HARNESS checkpoint count = 0 and CBRA never instantiated;
- as-of history availability matches checkpoint timing;
- no counterfactual outcome is claimed;
- no scientific metric is computed.

Pilot cannot change Confirmatory size or rules.

## Confirmatory

60 cases per arm = 4 operational families × 5 failure classes × 3 contexts.

Total: 180 case-arm units.

## Prespecified measurements

- same-failure recurrence rate;
- inappropriate global-exclusion rate;
- exogenous-attribution error count;
- delayed premature-change count;
- NO-provenance revision visibility for governed arms;
- U/I/V/T obligation revision visibility for governed arms;
- as-of/provenance continuity.

No aggregate winner score.

## Pairwise mechanism contrasts

- GOV_CBRA vs GOV_RECORD_ONLY: contribution of exposing CBRA history to the later Governance decision.
- GOV_CBRA vs GENERAL_HARNESS: difference between target/provenance-aware longitudinal revalidation and a relation-level failure-memory comparator.

No direction of overall superiority is prespecified. Zero difference is scientifically valid.

## Claim boundary

This is a finite synthetic mechanism experiment. It cannot establish universal superiority over existing harnesses, real-world safety, CARLA validity, or a general causal theory of all agent failures.
