# Stage 7 — GH-2 Experimental Specification v1.1 FINAL

## Primary question
With current observation, Core, current possibility set/distribution, and historical participation held constant, does current-context U/I/V/T responsibility binding causally change responsibility-contract-consistent selection relative to responsibility being recorded but not bound?

This experiment does not claim general task-performance superiority, deployment safety, or superiority over other AI systems.

## Arms
| Arm | Responsibility profile | Selection binding | Status |
|---|---|---|---|
| R1 CURRENT_BOUND | recomputed from current U/I/V/T | yes | production candidate |
| R2 RECORD_ONLY | same current profile as R1 | no; distribution-only selection | causal ablation |
| R3 PERMUTED | current profiles reassigned across candidate identities | yes | identity ablation |
| R4 STALE | previous frame profile reused only inside the same matched pair | yes | non-stickiness ablation |

All arms receive identical observations, Core implementation, candidate set, possibility distribution, empty frozen participating view, pair ordering, and evaluator contract.

## Pilot — structural only
Pilot contains four single-axis matched pairs: U, I, V, T. Each pair has critical then relief context under the same PresentObservation. Pilot contains 8 frames per arm.

Pilot may establish only structural sanity: fresh-process execution, candidate equality, no evaluator leakage, pair-local stale behavior, selected==realized, and exactly one realization. Pilot cannot determine confirmatory size and cannot support the scientific hypothesis.

## Confirmatory — frozen before pilot
Confirmatory is a finite exhaustive matrix over multi-axis combinations only:

UI, UV, UT, IV, IT, VT, UIV, UIT, UVT, IVT, UIVT.

Each combination is evaluated as a matched critical/relief pair under three frozen PresentObservation families. Therefore confirmatory contains exactly 11 combinations x 2 contexts x 3 observation families = 66 frames per arm, 33 matched pairs, and 264 decision-realization units across four arms.

No pilot-derived block count, variance rule, or seed-based sample-size rule exists in v1.1. Pilot and confirmatory scenario classes are disjoint.

## Responsibility operationalization
For each candidate and each U/I/V/T axis, the operator creates current-context burden-token sets. No numeric weight or aggregate responsibility score exists. Candidate A dominates B only if A's burden set is a subset of B's on every axis and strictly smaller on at least one. If the frontier has multiple candidates, the current possibility distribution breaks the tie; lexical ordering is reproducibility-only.

## Primary metric
`responsibility_contract_consistent_resolution_R1_minus_R2`

Evaluator truth is joined only after workers return. It is never passed to Core, runtime frame construction, responsibility calculation, or arm execution.

## Secondary causal contrasts
- R1 minus R3: candidate-specific responsibility identity.
- R1 minus R4: current-context non-stickiness within matched critical→relief pairs.
- R1 selection-change rate relative to distribution-only baseline.
- selected==realized and one-realization structural invariants.
- invalid/unresolved rate reported separately.

No aggregate winner score is allowed.

## R4 stale boundary
R4 may reuse the immediately previous current responsibility profile only when `relation_id` is identical, which denotes the second member of the same matched pair. At the start of every new pair, stale state is reset. Cross-pair stale carryover is prohibited.

## Pre-execution blindness
Preflight/admission may inspect structural properties only. It must not calculate confirmatory resolution rates, compare R1>R2, evaluate hypothesis-support deltas, or inspect confirmatory outcome statistics. Dry-run output contains no evaluator-derived metric.

## Frozen exclusions
- history participation differences: disabled (all arms empty view);
- outcome feedback: disabled;
- newly committed CE reuse: disabled;
- revalidation learning: disabled;
- responsibility scalarization: prohibited;
- post-pilot rule repair: prohibited.

## Failure rules
Any future/evaluator leakage, candidate-set mismatch across arms, responsibility scalarization, more than one realization, selection outside candidates, R1 responsibility/realization mismatch, stale profile in R1, cross-pair stale reuse in R4, overlap between pilot and confirmatory scenario classes, pre-execution hypothesis peeking, or modification of frozen GH-1/GH-1L/Core code is an execution/design failure.
