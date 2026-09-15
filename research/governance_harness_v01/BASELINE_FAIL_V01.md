# Governance Harness v0.1 adversarial baseline

- Baseline commit: `45ed53d`
- Command: bundled Python `-m unittest research.governance_harness_v01.test_governance_attack`
- Result: **FAILED** — 18 tests, 6 failures, 1 error.

Observed failures before any v0.2 implementation change:

1. INV-05/07/19: the Core received unrestricted historical capability and only its
   returned view was filtered afterward.
2. INV-10: an empty dynamic U/I/V/T responsibility judgment was accepted.
3. INV-20: candidate, participating-experience, and aggregate operation counters did
   not exist.
4. Reengagement existence and provenance were not independently checkable.
5. A `JudgmentRevalidation` containing an untyped string state was accepted.

Environment note: neither `python` nor the Windows `py` launcher had an installed
runtime.  The same tests were therefore run with the Codex bundled Python runtime;
this setup issue is not counted as a product test failure.
