# GH-2 v1.1 Known Baseline Core Test Failure

The frozen Core lineage contains one legacy test that is incompatible with the current admitted Core contract:

`research.oasis_core_v11.test_carla_domain_bundle_v1.DomainBundleTests.test_bundle_runs_through_canonical_harness`

The legacy test attempts direct history injection through `build_domain_bundle(history=...)`. The current Core contract intentionally rejects that path with:

`direct domain-bundle history injection is removed; Governance must supply a participating view`

GH-2 v1.1 does not modify the Core or this legacy test. Pre-execution validation therefore treats this exact failure as a documented baseline incompatibility while requiring all remaining Core tests to pass and requiring the exact legacy failure message to remain unchanged.

Classification:
- GH-2 v1.1 introduced regression: NO
- Core contract modification: NO
- Legacy failure hidden/skipped without verification: NO
- Frozen lineage changed: NO
- Blocking for GH-2 v1.1: NO, provided the exact known failure and all other regressions are verified in CI.
