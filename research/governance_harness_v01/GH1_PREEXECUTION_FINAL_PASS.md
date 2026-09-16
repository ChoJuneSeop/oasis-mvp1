# GH-1 Pre-Execution Gates — FINAL PASS

Status: `GH-1 EXPERIMENT_READY = TRUE`

This document records completion of the fixed pre-execution gates. It authorizes GH-1A execution under the frozen artifacts; it is not a GH-1A or GH-1B result.

## Gate sequence

1. Governance Harness v0.4 closure/attack/regression gate — PASS.
2. GH-1 Experimental Specification v1.0 FINAL — FROZEN.
3. GH-1 Experimental Design v1.0 FINAL — FROZEN.
4. Prior-work + public-code audit — COMPLETE.
5. Actual `CurrentRelationalCoreV11` Admission (ADM-01..ADM-12) — PASS.
6. Gap Detector Validity Gate — PASS.
7. RNG Isolation Gate — PASS.
8. Fresh Process Gate — PASS.
9. Experiment input/code hash freeze — PASS.

## Qualification CI evidence

GitHub Actions run: `35054051656`
Job: `104660356686`
Workflow head: `ad4f7264af120f733deba9dae2f2b7554041d78f`
Runner: Ubuntu 24.04 / Python 3.11

Executed gates/results in the same job:

- Actual Core Admission: `12 PASS`
- Detector Validity / RNG isolation / Fresh Process / manifest checks: `8 PASS`
- Frozen-artifact hash verification: `3 PASS`
- Governance v0.4 attack + regression: `45 PASS`
- Canonical Harness regression: `17 PASS`
- Current relational Core + history/materialization regression: `17 PASS`
- Governance/Core Python compilation: `PASS`

Total unit tests in the qualification job: `102 PASS`.

## Frozen basis

Freeze basis commit: `dff7aef74b222198235ce58b636dee77ab340a55`
Freeze manifest: `GH1_FREEZE_MANIFEST.json`
Hash format: Git blob SHA-1.

The executable freeze gate recalculates `git hash-object` for every frozen artifact and fails on any mismatch. The freeze manifest and evidence documents are not self-hashed; evidence-only commits are permitted only while the frozen artifact hashes remain unchanged and CI continues to pass.

Frozen categories include:

- Admission gate
- Experiment specification and design
- Gap detector specification
- Archive manifest
- Scenario manifest
- Seed manifest
- Run-order manifest
- Metrics schema
- PASS/FAIL rules
- GH-1 preexecution code
- Governance Harness v0.4
- Actual CurrentRelationalCoreV11
- History materialization/domain bundle
- Canonical Harness

## Interpretation boundary

`EXPERIMENT_READY = TRUE` means only that the preregistered GH-1 experiment is authorized to begin under the frozen design. It does not mean that selective re-participation has been empirically supported.

Current result state:

- `REAL_CORE_ADMISSION = ADMITTED`
- `DETECTOR_VALIDITY = PASS`
- `RNG_ISOLATION = PASS`
- `FRESH_PROCESS = PASS`
- `HASH_FREEZE = PASS`
- `GH-1 EXPERIMENT_READY = TRUE`
- `GH-1A = NOT STARTED`
- `GH-1B = NOT STARTED`

The next permitted operation is GH-1A Structural & Causal Validation, beginning with A-CASE-1 through A-CASE-4 and the non-actuating decision counterfactuals. GH-1B remains blocked until GH-1A passes and the pilot/confirmatory repetition process is completed as specified.
