# Stage 5 — Existing code audit for GH-3

## Audited baseline
GH-3 starts from the completed GH-2 evidence lineage and does not modify the frozen GH-1/GH-1L/GH-2/Core implementations. The relevant existing governance lifecycle is already present in `research/governance_harness_v01/harness_v04.py`.

## Existing capabilities that GH-3 can reuse

### 1. Outcome is post-realization and host authoritative
`GovernanceHarnessV04.prepare_closure()` captures a new atomic host snapshot only after realization. It rejects post-state that is not later than the realization snapshot or that does not preserve relation/realization identity.

### 2. Closure precedes revalidation
The harness calls the domain `closure_evaluator` first. If closure is not satisfied, finalization does not occur. `JudgmentRevalidation` is produced only inside `_finalize_prepared()` after a `PreparedClosure` exists.

### 3. Revalidation is typed and complete
`JudgmentRevalidation` already contains:
- gap judgment;
- per-experience participation/nonparticipation judgments;
- choice judgment;
- responsibility judgment.

The harness validates that every audited reengagement candidate receives a revalidation entry.

### 4. Feedback is provenance bound
`GovernanceFeedbackV04` stores:
- `prior_entry_id`;
- `relation_id`;
- prior provenance references;
- gap/choice/responsibility revalidation states;
- per-experience revalidation states.

`HistoryAccessPort.contextual_feedback(relation_id)` already prevents cross-relation feedback from being returned to another relation.

### 5. Feedback is visible to a later reengagement operator
At a new decision epoch, Governance reads `contextual_feedback(relation_id)` and passes the feedback to the reengagement operator. This creates an existing, explicit decision-layer port for GH-3's Link B causal test.

### 6. Commit is transactional
`HistoryAccessPort.atomic_commit(...)` snapshots history, feedback, experiences, provenance and sidecar state and restores them if any commit operation fails. Feedback therefore need not be exposed from a partially committed closure.

### 7. Completed Experience is also committed
The current lifecycle appends a new `CompletedExperience` at closure. For primary GH-3 this is a confound, because a later decision could change because the new CE entered history rather than because revalidation feedback was exposed.

## Required GH-3 experimental adapter
GH-3 should **not modify Core or GovernanceHarnessV04**. Instead it needs a GH-3-only `FrozenDecisionHistoryPort` (name provisional) with these properties:

1. it inherits/retains the normal atomic commit and provenance behavior;
2. it records the baseline decision-eligible archive at experiment start;
3. newly committed CE remains stored/auditable but is excluded from `search()` during the primary GH-3 experiment;
4. `contextual_feedback(relation_id)` remains enabled according to the experimental arm;
5. archive access metrics remain explicit and auditable.

This isolates `feedback reuse` from `new CE reuse` without deleting the newly committed experience.

## Required experimental operators
GH-3 needs experiment-local, frozen operators only:

- a revalidation operator whose mapping from authoritative closure evidence to `CONFIRMED / REVISED / INCONCLUSIVE` is frozen before Pilot;
- a feedback-aware reengagement operator that treats feedback as contextual evidence rather than a permanent weight;
- an arm adapter that can expose correct feedback, withhold it after recording, or supply provenance-mismatched feedback while keeping all other runtime inputs fixed.

The responsibility and Core paths must be held constant across arms and must not receive evaluator truth.

## Existing attacks/invariants already useful
The v0.4 attack suite already covers fake-outcome injection, false closure, closure-commit recovery, atomicity, cross-relation feedback pollution, wrong participation/nonparticipation revalidation, repeated closure, post-actuation recovery, and torn snapshots. GH-3 admission should reuse these tests as regression evidence rather than rewrite them.

## Code audit conclusion
No Core modification is required for GH-3. The existing governance harness already implements the temporal and provenance skeleton required for Outcome-based Revalidation. The new scientific implementation should be limited to an experiment-specific history-port policy, frozen outcome→revalidation mapping, feedback-use controls, paired scenarios, runner, evaluator, and admission tests.

Stage 5 status: `EXISTING_LIFECYCLE_REUSABLE / CORE_CHANGE_NOT_REQUIRED / GH3_EXPERIMENT_LAYER_REQUIRED`.
