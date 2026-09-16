# GH-1L — Long-Horizon Selective Re-participation

This independent lineage starts at frozen GH-1 commit `ea9261b15663a95d819aa9c9c9e5b9e76e9d5352`. It adds no changes to `research/oasis_core_v11` or `research/governance_harness_v01`.

The original implementation snapshot `e36ae30f5cf0b1cd9e007642ea050dd71b503bff` reached pre-pilot `EXPERIMENT_READY` without running pilot or confirmatory. A subsequent independent audit found that the admission fresh-process probe was stricter than the actual arm coordinator. Because no experiment data existed, the execution layer was amended as v1.0.1 before pilot. The original readiness evidence remains preserved in `validation/EXPERIMENT_READY_E36AE30.json`.

The package separates definition, literature, design, scenario, admission, runner, raw results, and validation. v1.0.1 hard-enforces one fresh Python worker per arm and freezes an arm-level paired pilot metric/count derivation before any pilot data are produced.

Run the GH-1L unit suite and preflight before pilot. Do not run confirmatory until `design/CONFIRMATORY_COUNT_FREEZE.json` has been generated from the completed pilot by the frozen count-freeze tool.
