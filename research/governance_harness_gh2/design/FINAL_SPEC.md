# Stage 7 — GH-2 Experimental Specification v1.1 FINAL

## Primary question
With current observation, actual Core, current possibility set/distribution, and historical participation held constant, does current-context responsibility binding causally change responsibility-contract-consistent selection relative to responsibility being recorded but not bound?

GH-2 v1.1 is a **synthetic responsibility-contract experiment**, not a claim of general real-world driving superiority, safety superiority, or deployment readiness.

## Why v1.1 exists
GH-2 v1.0 pilot exposed two design defects before confirmatory execution:
1. recorded seeds did not generate experimental variation;
2. the confirmatory block-count method had not been preregistered.

A further audit found that the v1.0 pre-execution dry-run/tests evaluated the same frozen scenario truth used to demonstrate the intended arm contrast. v1.1 removes that confirmatory contamination. v1.0 pilot evidence is retained only as diagnostic provenance and is excluded from v1.1 claims.

## Frozen arms
| Arm | Responsibility profile | Selection binding | Role |
|---|---|---|---|
| R1 CURRENT_BOUND | recomputed from current U/I/V/T | yes | production candidate |
| R2 RECORD_ONLY | same current profile as R1 | no; distribution-only selection | binding ablation |
| R3 PERMUTED | current burden profiles reassigned across candidate identities | yes | identity ablation |
| R4 STALE | immediately preceding profile reused only inside the same matched pair | yes | non-stickiness ablation |

All arms receive identical current observations, Core implementation, candidate set, possibility distribution, empty frozen participating view, frame order, and post-decision evaluator.

## Responsibility operationalization
For every actual candidate and each U/I/V/T axis, Governance forms a set of current-context burden tokens. No numeric weight, scalar responsibility score, permanent penalty, memory weight, or global threshold exists.

Candidate A dominates candidate B only when A's burden set is a subset of B's on every axis and strictly smaller on at least one. If multiple candidates remain on the frontier, the already-existing current possibility distribution breaks the tie. Lexical ordering is reproducibility-only.

## Pilot design — structural only
Pilot is a single frozen structural matrix of four single-axis matched pairs:
- U critical / relief
- I critical / relief
- V critical / relief
- T critical / relief

Pilot = 8 frames x 4 arms. Pilot is used only to verify execution invariants, fresh-process isolation, candidate contract, pair-local stale reset, selected==realized, and one realization per decision.

**Pilot results cannot change confirmatory size, scenario composition, arm definitions, metrics, thresholds, or decision rules.** No pilot-derived sample-size or variance rule exists in v1.1.

## Confirmatory design — preregistered finite exhaustive matrix
Confirmatory uses all non-singleton U/I/V/T axis combinations:
- UI, UV, UT, IV, IT, VT
- UIV, UIT, UVT, IVT
- UIVT

There are 11 axis combinations. Each is evaluated under three frozen current-observation families (O1, O2, O3), with a matched critical/relief pair in each family.

Total confirmatory matrix:
- 11 axis combinations
- x 3 observation families
- x 2 context polarities
- = **66 frames per arm**
- x 4 arms
- = **264 decision-realization units**

This count is frozen before v1.1 pilot and does not depend on pilot variance or seed values. Seeds are not an experimental factor in v1.1.

## Matched-pair contract
Within every pair:
- `PresentObservation` is identical;
- actual Core and possibility distribution path are identical;
- only the current relational responsibility context changes from critical to relief;
- evaluator truth is stored outside the worker and joined only after decisions return.

Pilot single-axis scenario classes and confirmatory multi-axis scenario classes are disjoint.

## R4 pair-local stale rule
R4 must not carry a responsibility profile across pair boundaries. A new `relation_id` resets stale state. Only the relief frame of the same matched pair may reuse the immediately preceding critical profile. Cross-pair stale contamination is a design/execution failure.

## Pre-execution prohibition on effect peeking
Preflight and admission tests may verify scenario construction and truth pairing, but they must not execute an arm and compare its realized action against confirmatory evaluator truth. Specifically, pre-execution code must not assert or calculate:
- R1 confirmatory resolution rate;
- R1 > R2 confirmatory effect;
- any confirmatory support/not-supported verdict.

Dry-run output is structural only and contains no `resolution_rate`, expected action, or evaluator truth.

## Primary metric
`responsibility_contract_resolution_rate_R1_minus_R2`

Resolution is evaluated only after worker decisions return. A confirmatory frame is resolved when realized action equals the preregistered evaluator contract for that current responsibility context.

## Secondary causal contrasts
- R1 minus R3: candidate-specific responsibility identity.
- R1 minus R4 on relief frames: current-context non-stickiness.
- R1 selection-change rate relative to distribution-only baseline.
- selected==realized and exactly one realization per frame.
- invalid/unresolved rate reported separately.

No aggregate winner score is permitted.

## Metric-level confirmatory interpretation
A contrast is `SUPPORTED` only if:
1. all structural invariants pass;
2. its overall preregistered delta is strictly positive; and
3. no observation-family delta is negative.

It is `NOT_SUPPORTED` if the overall delta is zero or negative without a structural failure. It is `INCONCLUSIVE` if a structural/evaluator integrity condition fails. These labels apply only to the frozen synthetic matrix and do not imply general performance superiority.

## Frozen exclusions
- history participation differences: disabled; all arms receive empty participating view;
- outcome feedback: disabled;
- newly committed Completed Experience reuse: disabled;
- revalidation learning: disabled;
- post-result rule repair: prohibited;
- pilot-derived confirmatory count: prohibited;
- pseudo-random seed treated as replication: prohibited.

## Failure rules
Any of the following invalidates execution before metric interpretation:
- future/evaluator leakage into a worker;
- candidate-set mismatch across arms;
- responsibility scalarization;
- more than one realization per frame;
- selected candidate outside actual candidate set;
- R1 responsibility/realization mismatch;
- stale profile in R1;
- R4 stale state crossing pair boundaries;
- pilot/confirmatory scenario overlap;
- pre-execution confirmatory effect peeking;
- modification of frozen GH-1/GH-1L/Core code.

## Claim boundary
GH-2 v1.1 can establish only whether current-context, candidate-specific, non-scalar U/I/V/T responsibility binding has a causal selection effect within the frozen Governance OASIS synthetic contract. It does not establish general safety, deployment fitness, autonomous-driving superiority, or full Governance OASIS integration.
