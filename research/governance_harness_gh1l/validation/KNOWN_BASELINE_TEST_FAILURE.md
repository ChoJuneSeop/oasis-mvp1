# Known baseline test failure — 2026-09-16

The expanded legacy Core suite ran 34 tests: 33 passed and one failed.

`research.oasis_core_v11.test_carla_domain_bundle_v1.DomainBundleTests.test_bundle_runs_through_canonical_harness`
still calls `build_domain_bundle(history=...)`. The frozen GH-1 Core intentionally rejects
direct history injection and requires Governance to supply only a current participating
view. The implementation and test both predate GH-1L in base commit
`ea9261b15663a95d819aa9c9c9e5b9e76e9d5352`; the frozen Core blob still matches
the GH-1 freeze manifest.

No rule, Core file, GH-1 file, or legacy test was changed in response. The executable
GH-1 admission suite (12/12), full GH-1 suite (68/68), current Core relational tests,
and GH-1L suite (15/15) pass. GH-1L readiness therefore treats this as a documented
baseline incompatibility rather than a new regression.
