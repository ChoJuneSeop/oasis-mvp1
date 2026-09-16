# Stage 2 — Concept and theoretical design

## Outcome-based revalidation
GH-3 treats an outcome as governance evidence only after the selected possibility has been realized, the host has advanced, an authoritative post-observation has been captured, and Closure has been satisfied. No pre-realization prediction, expected reward, evaluator label, or future state can substitute for this path.

Canonical order:

`current_t -> possibilities_t -> responsibility_t -> selected_t -> one realization_t -> host post-observation_t -> Closure_t -> revalidation_t -> immutable feedback_t -> current_(t+1)`

The earliest admissible decision effect of `revalidation_t` is `t+1`.

## Revalidation state
Revalidation is categorical and typed, not scalar. The allowed states remain:

- `CONFIRMED`: the completed relation-process supports retaining the prior judgment as provenance-consistent evidence;
- `REVISED`: the completed relation-process contradicts or materially changes the prior judgment;
- `INCONCLUSIVE`: Closure occurred, but the available outcome evidence does not justify confirmation or revision.

A state applies to a particular prior judgment and provenance chain. It is not a universal score attached to a candidate, experience, actor, relation, or action.

## Revalidation vector
A completed epoch can revalidate four governance objects already represented in Governance Harness v0.4:

1. the prior Gap judgment;
2. each prior participation/nonparticipation judgment;
3. the prior choice judgment;
4. the prior responsibility judgment.

These components must remain separately auditable. GH-3 prohibits collapsing them into one aggregate winner/quality score.

## Provenance-bound feedback
Feedback must identify the prior committed entry and relation and must be traceable to the authoritative outcome that produced it. A feedback record with the correct state but the wrong relation/provenance is not equivalent evidence.

Feedback is evidence available to later Governance; it is not a direct command to Core and it does not alter the frozen historical record.

## Contextual, non-sticky use
`REVISED` does not mean “never use this experience/action again.” `CONFIRMED` does not mean “always repeat it.” At a later epoch, current flow remains first. The feedback may affect a new participation or governance judgment only when its relation/provenance is contextually admissible.

The same historical item can therefore be admitted in one later context and not admitted in another, even if the prior feedback object is unchanged.

## Primary causal decomposition
GH-3 separates two questions:

### Link A — outcome causality
Holding the antecedent decision path fixed, do different authoritative post-outcomes produce the predeclared `CONFIRMED / REVISED / INCONCLUSIVE` revalidation states?

### Link B — future-governance causality
Holding the later current observation, frozen archive, Core, possibility set, and responsibility contract fixed, does exposing the correct provenance-bound feedback change the later governance path relative to recording the same feedback but withholding it from that later decision?

## Feedback controls
The design will require at minimum:

- `ACTIVE`: correct, provenance-bound feedback is available at the next epoch;
- `RECORD_ONLY`: the same revalidation is computed and committed but hidden from the next decision;
- `PERMUTED_PROVENANCE`: the same quantity/type of feedback is exposed with a mismatched prior provenance/relation, testing identity binding.

A pre-Closure or same-epoch feedback condition is not a scientific arm; it is an invalid execution that must be rejected by admission/invariant tests.

## Primary isolation from new-CE reuse
Atomic commit may create a new Completed Experience because that is part of closure integrity. However, the newly committed CE is not decision-eligible in the primary GH-3 next-epoch comparison. Only the revalidation-feedback channel differs across arms. This isolates revalidation from ordinary historical re-participation.

## No scalarization and no tuning
GH-3 must not implement reward, value, confidence, utility, success count, permanent weight, decay weight, or post-outcome candidate score. It must not change thresholds, state mappings, feedback-use rules, scenarios, or metrics after Pilot/Confirmatory results are observed.
