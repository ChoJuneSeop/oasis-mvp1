# GH-2 — Responsibility-centered Governance

GH-2 starts only after GH-1/GH-1L selective re-participation evidence is frozen. Its scientific question is narrower: **after the current possibility set exists, can a dynamic, current-context U/I/V/T responsibility judgment causally bind selection rather than merely being logged after or beside the decision?**

This lineage starts from GH-1L confirmatory evidence commit `5861b08d6b48f79b88f4f160bbb425690708ccd4`. It does not modify the frozen GH-1/GH-1L/Core code.

The package follows Governance OASIS standard procedure v2.0. Stages 1–8 were completed before implementation; stages 9–10 were then implemented and independently revalidated in CI. Stage 11 (pilot/confirmatory execution) remains intentionally locked and has **not** been run.

GH-2 deliberately freezes historical participation to the same empty participating view across all experimental arms. This does **not** negate GH-1/1L; it removes history as a confound so the causal role of responsibility can be isolated. Integration of selective re-participation + responsibility belongs to a later integrated-governance experiment.

Core principles:
- responsibility is computed only after the actual current possibility set exists;
- U/I/V/T is never collapsed into a scalar score;
- responsibility is current-contextual, candidate-specific, and non-sticky;
- selected and nonselected obligations are both preserved;
- production arm selection is bound to responsibility before realization;
- experimental controls may intentionally ablate binding, permute candidate responsibility, or reuse stale responsibility, but those arms are explicitly non-production controls;
- no outcome feedback, new Completed Experience reuse, or post-result rule tuning is admitted in GH-2.

## Frozen experimental arms

- `R1_CURRENT_BOUND`: current U/I/V/T recomputed and causally bound to selection.
- `R2_RECORD_ONLY`: identical current responsibility is recorded but not bound; current distribution selects.
- `R3_PERMUTED`: responsibility profiles are reassigned across candidate identities before binding.
- `R4_STALE`: previous-frame responsibility is reused when the candidate set matches.

## Pre-execution status

- Stages 1–10: complete.
- Admission tests: 19/19 PASS.
- Frozen Governance Harness regressions: 45/45 PASS.
- Frozen Core regressions: 17/17 PASS.
- Frozen Canonical Harness regressions: 17/17 PASS.
- Total validated tests: 98 PASS.
- Fresh-process actual runner path: PASS.
- Evaluator leakage gate: PASS.
- Responsibility-after-possibilities gate: PASS.
- Non-scalar responsibility gate: PASS.
- GH-1/GH-1L/Core frozen lineage changes: none.
- Pilot: NOT RUN.
- Confirmatory: NOT RUN.
- Experiment executed: FALSE.

Validated implementation SHA: `a295db380e9595ee42567def37d3db0ce8f30c2a`.
Validation workflow run: `35064368972` (`SUCCESS`).

Current state: **`EXPERIMENT_READY`**. The next permitted operation is creation of a separate exact-snapshot pilot execution lineage; this branch itself keeps pilot/confirmatory locked.
