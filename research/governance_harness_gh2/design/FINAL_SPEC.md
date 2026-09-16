# Stage 7 — GH-2 Experimental Specification v1.0 FINAL

## Primary question
With current observation, Core, current possibility set/distribution, and historical participation held constant, does current-context responsibility binding change and improve responsibility-sensitive selection relative to responsibility being recorded but not causally bound?

## Arms
| Arm | Responsibility profile | Selection binding | Status |
|---|---|---|---|
| R1 CURRENT_BOUND | recomputed from current U/I/V/T | yes | production candidate |
| R2 RECORD_ONLY | same current profile as R1 | no; distribution-only selection | causal ablation |
| R3 PERMUTED | current profile identities permuted across candidates | yes | identity ablation |
| R4 STALE | previous frame's profile reused when candidate set matches | yes | non-stickiness ablation |

All four arms receive identical observations, Core implementation, candidate set, possibility distribution, empty frozen participating view, run order, horizon, and evaluator.

## Scenarios
Eight responsibility-sensitive classes are paired by axis:
- uncertainty-critical / uncertainty-relief
- impact-critical / impact-relief
- vulnerability-critical / vulnerability-relief
- temporality-critical / temporality-relief

Every pair uses the **same `PresentObservation`**. Only current relational responsibility context changes. Evaluator truth is stored separately and is never passed to the worker.

## Responsibility operationalization
For each candidate and each U/I/V/T axis, the operator creates a set of current-context burden tokens. No numeric weight or aggregate responsibility score exists. Candidate A dominates B only if A's burden set is a subset of B's for every axis and strictly smaller on at least one. If the frontier has multiple candidates, current possibility distribution breaks the tie; lexical ordering is reproducibility-only.

## Primary metric
`responsibility_sensitive_resolution_rate_R1_minus_R2`

A frame is resolved when realized action equals evaluator truth after the decision has been emitted.

## Secondary causal contrasts
- R1 minus R3: candidate-specific responsibility identity.
- R1 minus R4 on relief/reversal frames: current-context non-stickiness.
- R1 selection-change rate relative to distribution-only baseline.
- selected==realized and one-realization structural invariants.
- invalid/unresolved rate reported separately.

No aggregate winner score is allowed.

## Frozen exclusions
- history participation differences: disabled (all arms empty view);
- outcome feedback: disabled;
- newly committed CE reuse: disabled;
- revalidation learning: disabled;
- post-pilot rule repair: prohibited.

## Pilot and confirmatory
Pilot exists only for structural sanity and confirmatory block-count freezing. Pilot seeds are excluded from confirmatory. Confirmatory cannot be interpreted until a pilot-derived count freeze is produced by the frozen method.

## Failure rules
Any future/evaluator leakage, candidate-set mismatch across arms, responsibility scalarization, more than one realization, selection outside candidates, production R1 responsibility/realization mismatch, stale profile in R1, or modification of frozen GH-1/GH-1L/Core code is an execution/design failure.
