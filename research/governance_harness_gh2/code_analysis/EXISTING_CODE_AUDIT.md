# Stage 5 — Existing code audit

## Existing verified assets
1. `GovernanceHarnessV04` already enforces the order `possibilities -> responsibility -> selection -> realization` in its production path.
2. `_CoreBoundary.open_epoch` obtains the actual `CoreEpochView`, then invokes the Governance responsibility operator.
3. `_CoreBoundary.realize` passes the Governance-selected candidate to `core.realize_selected` and rejects mismatch.
4. `ResponsibilityJudgment` already requires dynamic U/I/V/T plus selected and nonselected obligations.
5. Existing attack test `ATK-05` proves a supplied responsibility selection can causally bind realization.
6. `CurrentRelationalCoreV11.realize_selected` rejects candidates absent from the currently open epoch and clears the epoch after realization.

## Missing evidence that motivates GH-2
- Existing responsibility fixtures select a candidate by a simple test rule; they do not establish current-context sensitivity.
- Existing tests do not compare responsibility-bound selection against responsibility-record-only selection under matched candidate sets.
- No existing experiment tests candidate-profile permutation.
- No existing experiment tests stale responsibility as a non-stickiness counterfactual.
- Existing structural causality is therefore necessary but insufficient for the GH-2 scientific claim.

## Implementation constraint
GH-2 must be additive. `research/governance_harness_v01`, `research/governance_harness_gh1l`, and `research/oasis_core_v11` are frozen inputs and must not be edited.
