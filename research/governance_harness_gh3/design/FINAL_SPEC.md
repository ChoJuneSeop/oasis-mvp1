# Stage 7 — GH-3 Experimental Specification v1.0 FINAL

## Research object
**Outcome-based Revalidation** under a frozen synthetic Governance OASIS contract.

GH-3 tests the causal chain:

`realized decision -> authoritative post observation -> Closure -> typed revalidation -> committed provenance-bound feedback -> later current-flow-first governance`

The primary experiment isolates feedback reuse from newly committed Completed Experience reuse.

## Causal links

### Link A — outcome to revalidation
Holding the antecedent decision path fixed, the revalidation operator must derive a typed state from the actual post-realization observation after Closure. The worker never receives an evaluator label for the expected state.

### Link B — revalidation to later governance
Holding the later current observation, baseline decision-eligible archive, Core, possibility set, responsibility rule, and scenario order fixed, expose or withhold the committed feedback and observe whether the later governance path changes.

## Frozen scientific arms

| Arm | Stored revalidation | Feedback exposed at recurrence | Intervention |
|---|---|---|---|
| F1 `ACTIVE_CORRECT` | normal | correct committed feedback | production candidate |
| F2 `RECORD_ONLY` | identical to F1 | hidden from later decision | causal ablation |
| F3 `PERMUTED_STATE` | identical to F1 | same relation/provenance, but categorical state is cyclically permuted only at read-time | state-content ablation |

The stored historical record and original committed feedback are never rewritten by F3.

State permutation is frozen as:

`CONFIRMED -> REVISED -> INCONCLUSIVE -> CONFIRMED`.

Wrong-relation/provenance feedback is not a scientific arm; production code must reject/ignore it and admission tests must prove that boundary.

## Baseline historical participant
Each isolated scenario chain begins with one frozen decision-eligible Completed Experience `E1` scoped to that relation. Its relation record is semantically compatible with the current front interaction and links to the `continue-flow` possibility.

The historical record also carries the antecedent context's exact `local_density` as a feedback-scope descriptor. This descriptor is contextual provenance, not a score or weight.

Newly committed Completed Experience from the antecedent closure is stored for provenance integrity but is never decision-eligible during primary GH-3.

## Frozen reengagement rule
Base eligibility is recomputed from current evidence and current relation semantics at every epoch.

For a candidate with matching current semantics:

- no feedback: base eligibility applies;
- `CONFIRMED`: base eligibility applies;
- `INCONCLUSIVE`: base eligibility applies;
- `REVISED`: the previous participation judgment is not reused when the later current `local_density` equals the candidate's antecedent feedback-scope density; the candidate is nonparticipating for that matched recurrence;
- `REVISED` under a shifted current density: base eligibility is recomputed and may participate again.

Thus `REVISED` is context-local evidence, not deletion or permanent exclusion.

The rule applies only when feedback relation and candidate provenance match. Otherwise feedback is ignored.

## Frozen responsibility/selection rule
Responsibility remains identical across arms. It is not tuned from outcomes.

- when `E1` participates and `continue-flow` is available, select `continue-flow`;
- otherwise select `yield-space` when available;
- selected and nonselected obligations remain explicit and U/I/V/T remain non-empty;
- no scalar responsibility score is created.

This rule is a frozen experimental operationalization used only to make the later governance consequence observable. It is not a universal OASIS equation.

## Outcome signatures and frozen revalidation mapping
All antecedent decisions are realized before any outcome state exists. All post-outcome observations set `front_present=False`, which allows the existing domain Closure evaluator to close the front-interaction relation.

Let the realized decision observation be `o_r` and authoritative post observation be `o_p`.

Define two directional facts, without a magnitude threshold:

- `speed_improved := o_p.ego_speed_mps < o_r.ego_speed_mps`
- `heading_not_worse := abs(o_p.local_heading_error_deg) <= abs(o_r.local_heading_error_deg)`

Frozen mapping:

- `CONFIRMED` iff `speed_improved` and `heading_not_worse`;
- `REVISED` iff `not speed_improved` and `not heading_not_worse`;
- `INCONCLUSIVE` otherwise.

The same state is recorded for the antecedent choice, responsibility, and E1 participation judgment in the primary GH-3 scenario family. Gap revalidation remains separately recorded and is `CONFIRMED` when the antecedent Gap evidence and realization provenance are intact.

This mapping is synthetic and claim-bounded. It is not a universal definition of successful driving or safe behavior.

## Current-flow-first recurrence
Every recurrence begins from a fresh relation-process sample and then a current speed drop sufficient for the already-frozen `CurrentFlowGapRule` to detect a Gap. Feedback cannot create the Gap and is not read by the Gap rule.

No revalidation state can affect the epoch that created it. Earliest effect is the recurrence epoch after successful Closure and atomic commit.

## Pilot — structural only
Pilot uses one observation family and three outcome signatures (`CONFIRMED`, `REVISED`, `INCONCLUSIVE`) in same-scope recurrence only.

Pilot contains:

- 3 isolated two-epoch chains per arm;
- 6 decision-realization epochs per arm;
- 3 arms;
- 18 total decision-realization epochs.

Pilot may test only lifecycle/invariant correctness. It must not calculate Link A state-match rate, F1-vs-F2 causal effect, or any Confirmatory hypothesis metric.

Pilot does not determine Confirmatory size.

## Confirmatory — frozen finite matrix
Confirmatory is fixed before Pilot and disjoint from Pilot.

Factors:

- outcome signatures: `CONFIRMED`, `REVISED`, `INCONCLUSIVE` (3);
- recurrence scope: `SAME_SCOPE`, `SHIFTED_SCOPE` (2);
- frozen observation families: `F1`, `F2`, `F3` (3).

Total:

- 18 isolated two-epoch chains per arm;
- 36 decision-realization epochs per arm;
- 3 arms;
- **108 total decision-realization epochs**.

No seed-derived sample-size rule and no Pilot-derived repetition count exist.

## Observation families
Pilot family `P1` and Confirmatory families `F1/F2/F3` are disjoint. Each decision observation contains both `continue-flow` and `yield-space` as feasible current possibilities.

The exact numeric observations are frozen in the scenario manifest during implementation and cannot be changed after pre-execution validation.

Outcome construction may use fixed synthetic offsets only to produce the already-defined directional signatures; the revalidation rule depends only on direction, not offset magnitude.

## Primary metrics
Reported separately; no aggregate winner score.

### Link A
- `revalidation_state_match_rate`: stored true revalidation state vs post-run evaluator label derived from the frozen directional rule.
- closure/provenance authenticity failures, separately counted.

### Link B primary
For true `REVISED + SAME_SCOPE` chains:
- F1 vs F2 participation-decision change rate;
- F1 vs F2 selected/realized possibility change rate.

### Stability controls
- `CONFIRMED` F1 vs F2 no-unnecessary-change rate;
- `INCONCLUSIVE` F1 vs F2 no-unnecessary-change rate;
- `REVISED + SHIFTED_SCOPE` F1 vs F2 no-global-block rate (non-stickiness).

### State-content ablation
- F3 behavior must follow the exposed permuted categorical state while stored true feedback remains unchanged. This is reported as mediation/ablation evidence, not as a production-quality score.

### Structural invariants
- selected == realized;
- one realization per decision epoch;
- current-flow Gap independent of feedback;
- Closure before revalidation;
- atomic commit before feedback visibility;
- new CE not decision eligible;
- wrong relation/provenance feedback has zero effect;
- fresh process per scientific arm;
- no evaluator/future label in worker runtime;
- responsibility remains non-scalar.

## Pass/fail boundaries
Any of the following invalidates execution rather than merely reducing an effect size:

- same-epoch feedback use;
- feedback visible before Closure/commit;
- evaluator truth or expected revalidation state reaching worker decision logic;
- new CE entering the decision-eligible archive;
- relation/provenance mismatch changing a production decision;
- more than one real realization in an epoch;
- selected != realized;
- F2 failing to store the same underlying revalidation as F1;
- F3 mutating committed feedback instead of read-time exposure;
- Pilot/Confirmatory scenario overlap;
- modification of frozen GH-1/GH-1L/GH-2/Core code;
- post-result changes to outcome mapping, feedback-use rule, scenarios, metrics, or arms.

## Interpretation boundary
A successful experiment establishes only an executable causal mechanism for post-Closure, provenance-bound revalidation feedback in this frozen synthetic matrix. It does not establish general performance superiority, real-world safety, novelty of outcome feedback, or optimal adaptation.
