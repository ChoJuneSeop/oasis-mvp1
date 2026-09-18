# CBRA Failure CE v1.1 Confirmatory Interpretation

Status: CONFIRMATORY COMPLETE / FROZEN SYNTHETIC MECHANISM EVIDENCE

The v1.1 comparison executed 60 frozen cases per arm (180 case-arm units) across four operational scopes, five failure classes, and three re-entry contexts.

## What the result establishes inside this contract

**GOV+CBRA vs GOV−CBRA.**
Both systems recorded the same target-level revalidation provenance, but only GOV+CBRA exposed eligible CBRA history to the later Governance decision. Same-failure recurrence was 0/16 for GOV+CBRA and 16/16 for GOV−CBRA. In this synthetic contract, the behavioral difference therefore comes from using the already-recorded revalidation history at the later decision boundary, not merely from storing it.

**Contextual non-stickiness.**
GOV+CBRA produced zero inappropriate global exclusions in the changed-scope cases selected for this metric. Thus a prior revision did not become permanent global suppression under the frozen context rule.

**Exogenous attribution.**
GOV+CBRA produced zero exogenous-attribution errors under the frozen mechanism. The defined GENERAL_HARNESS comparator, which has only a relation-level failure label and no causal attribution layer, produced 8 such errors.

**NO provenance and responsibility obligations.**
The governed arms exposed 12 participation-omission revisions and 12 U-obligation revisions across the frozen matrix. These are visibility/traceability results, not proof that unrealized alternatives would have succeeded.

**Delayed failure.**
No arm changed prematurely before the delayed adverse evidence became available. Governed arms preserved the two-stage checkpoint sequence.

## What this does not establish

It does not show that CBRA is universally better than "general harnesses." GENERAL_HARNESS here is one explicitly defined relation-level episodic failure-memory comparator.

It does not establish:
- real-world safety,
- CARLA performance,
- statistical population generalization,
- normative correctness of U/I/V/T,
- superiority across arbitrary agent architectures.

The admissible conclusion is narrower: **within the frozen synthetic failure contract, target-level, provenance-preserving CBRA revalidation changed later Governance behavior relative to record-only revalidation and exhibited different failure-handling behavior from the specified relation-level memory comparator.**
