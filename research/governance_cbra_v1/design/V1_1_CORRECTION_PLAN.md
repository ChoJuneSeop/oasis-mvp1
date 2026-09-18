# CBRA v1.1 Correction Plan

Status: FORMAL_ERROR_REVIEW_OPEN

The v1.0 executable skeleton passed basic invariants but formal design review identified deficiencies that must be corrected before any comparative experiment.

## E-01 evidence time was not first-class
Target evidence lacked its own observation time. A checkpoint time alone cannot prove that every evidence item existed before the checkpoint or after Closure.

**Correction:** every TargetEvidence carries observed_tau; enforce closure_tau < evidence_tau <= checkpoint_tau.

## E-02 evidence relation/scope was not first-class
A provenance target could receive evidence originating from an unrelated relation/context.

**Correction:** every TargetEvidence carries relation_id and scope_key. Only evidence matching the original decision relation+scope can directly CONFIRM/REVISE that original judgment. Other evidence remains preserved but non-decisive for that judgment.

## E-03 repeated evidence could be reintroduced
The same event-target evidence could be submitted at multiple checkpoints.

**Correction:** add evidence_id and reject repeated (evidence_id, target_kind, target_id) tuples across the axis history.

## E-04 future checkpoint read boundary was implicit
history() exposed all records and provided no safe as-of decision-time read.

**Correction:** add history_as_of(decision_tau), strict checkpoint.observed_tau < decision_tau.

## E-05 empty checkpoints could create meaningless state churn
v1.0 permitted observations with no provenance-linked evidence.

**Correction:** every checkpoint requires at least one TargetEvidence.

## E-06 NO/nonselected state semantics were under-specified
The same CONFIRMED/REVISED enum can be misread as a counterfactual success/failure conclusion.

**Correction:** preserve AssessmentBasis. For NO/nonselected, state means only consistency of the original exclusion/nonselection rationale; documentation and tests make this non-counterfactual meaning normative.

## E-07 monitoring lifetime was unspecified
No rule said whether monitoring ends permanently.

**Correction:** CBRA is event-driven and may become dormant when no authoritative later evidence exists. Dormancy is not Closure/deletion; monitoring can resume when new provenance-linked evidence arrives. No artificial global decay/expiry is introduced.

## E-08 downstream use was not yet an experiment contract
CBRA recorded checkpoints but the failure-comparison protocol did not yet define how GOV+CBRA may use past checkpoints without future leakage.

**Correction:** the comparative experiment must use a separately frozen, ephemeral current-review projection over history_as_of(). The projection may not alter stored CBRA history and may not read checkpoints at or after the current decision time.

No Pilot or Confirmatory may run until E-01 through E-08 are closed by code, tests and a three-pass formal error-check record.
