# GH-1L — Long-Horizon Selective Re-participation

This independent lineage starts at frozen GH-1 commit `ea9261b15663a95d819aa9c9c9e5b9e76e9d5352`. It adds no changes to `research/oasis_core_v11` or `research/governance_harness_v01`.

The original implementation `e36ae30f5cf0b1cd9e007642ea050dd71b503bff` was amended before pilot as v1.0.1 to make the actual arm runner use the same fresh-process isolation proved by admission. The resulting exact snapshot `2c0f4386253b050c4c960d29a0b6eac16c83a1fa` passed the full pre-pilot gate and executed one diagnostic pilot.

That v1.0.1 pilot exposed an action-vocabulary interface defect: the Core uses canonical possibility IDs such as `continue-flow`, while GH-1L semantic labels also used `continue` and `hold-course`. No confirmatory run occurred. The diagnostic pilot and its count freeze are preserved but invalidated for confirmatory inference in `validation/PILOT_V1_0_1_INVALIDATED.json`.

v1.0.2 freezes `action_contract.py` as the sole semantic-to-Core action adapter, retains the v1.0.1 five-arm/fresh-process/paired design, and uses new pilot/confirmatory seeds. A replacement pilot must pass the full pre-execution gate before a new confirmatory count freeze is accepted.

Do not use any v1.0.1 pilot-derived count freeze to unlock confirmatory. Only a `CONFIRMATORY_COUNT_FREEZE.json` whose spec version matches `GH1L_EXPERIMENT_V1_0_2_ACTION_CONTRACT` is admissible.
