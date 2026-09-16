# GH-2 — Responsibility-centered Governance

GH-2 starts only after GH-1/GH-1L selective re-participation evidence is frozen. Its scientific question is narrower: **after the current possibility set exists, can a dynamic, current-context U/I/V/T responsibility judgment causally bind selection rather than merely being logged after or beside the decision?**

This lineage starts from GH-1L confirmatory evidence commit `5861b08d6b48f79b88f4f160bbb425690708ccd4`. It does not modify the frozen GH-1/GH-1L/Core code.

The package follows Governance OASIS standard procedure v2.0. Stages 1–8 are completed before implementation, stages 9–10 implement and validate the frozen design, and stage 11 (pilot/confirmatory execution) is intentionally not run in this branch.

GH-2 deliberately freezes historical participation to the same empty participating view across all experimental arms. This does **not** negate GH-1/1L; it removes history as a confound so the causal role of responsibility can be isolated. Integration of selective re-participation + responsibility belongs to the later integrated-governance experiment.

Core principles:
- responsibility is computed only after the actual current possibility set exists;
- U/I/V/T is never collapsed into a scalar score;
- responsibility is current-contextual, candidate-specific, and non-sticky;
- selected and nonselected obligations are both preserved;
- production arm selection is bound to responsibility before realization;
- experimental controls may intentionally ablate binding, permute candidate responsibility, or reuse stale responsibility, but those arms are explicitly non-production controls;
- no outcome feedback, new Completed Experience reuse, or post-result rule tuning is admitted in GH-2.

Current state: `PREEXECUTION_VALIDATION_REQUIRED` until the GH-2 CI gate passes.
