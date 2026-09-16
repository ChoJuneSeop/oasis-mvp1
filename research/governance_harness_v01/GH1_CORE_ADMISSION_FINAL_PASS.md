# GH-1 Real Core Admission — FINAL PASS

Status: `REAL_CORE_ADMISSION = ADMITTED`

Verified implementation/gate commit: `fe24db24012f083704003ff4e5d2258f18855114`
Branch: `feature/governance-harness-v1`
Actual Core: `research/oasis_core_v11/current_relational_core.py` / `CurrentRelationalCoreV11`
Admission test: `research/governance_harness_v01/test_core_governance_admission.py`

## Baseline preserved

The pre-patch baseline failure is preserved in `GH1_CORE_ADMISSION_BASELINE_FAIL.md` against baseline target commit `c83827daed060bdee553e368ec0e7e192b7a1e81`.

The two fixed blockers were:

1. Core-owned historical capability (`_history`, `add_history`, `history_records`, `governance_history_scope`).
2. Missing mandatory Governance-selected realization port (`realize_selected`).

## Implemented admission patch

- Removed Core-owned archive state and direct historical reads.
- Governance supplies only the already-filtered `ParticipatingExperienceView` for the current epoch.
- Participating Completed Experiences may expose immutable domain relation records through `content["relation_records"]`.
- The Core retains only epoch-local derived relation records and clears them after realization.
- Added mandatory `realize_selected(observation, tau, selected_possibility_id)`.
- `realize_selected` does not call or permit the compatibility `choice_operator` to replace the Governance-selected candidate.
- Direct historical injection through the Core/domain bundle is rejected.
- `HistoryAdmissionBridge` is now validation/materialization only and does not mutate the Core.
- Existing present-only, no-future, pure-probe, single-realization and Closure/commit ownership boundaries remain intact.

## ADM-01 through ADM-12

GitHub Actions run: `35039273607`
Job: `104615255484`
Runner: Ubuntu 24.04 / Python 3.11.16

All 12 admission tests PASS:

- ADM-01 Hidden Archive Ownership — PASS
- ADM-02 HistoryAccessPort Exclusivity / participating-view-only input — PASS
- ADM-03 Gap=NO zero archive access — PASS
- ADM-04 Nonparticipant isolation — PASS
- ADM-05 Mandatory `realize_selected` — PASS
- ADM-06 Governance selection causally binds realization — PASS
- ADM-07 Internal choice bypass on selected path — PASS
- ADM-08 Future completed-experience rejection — PASS
- ADM-09 Probe purity — PASS
- ADM-10 One realization per opened epoch — PASS
- ADM-11 Core cannot create/commit Completed Experience — PASS
- ADM-12 Ephemeral participating records cleared after realization — PASS

Admission gate result: `12/12 PASS`.

## Regression evidence

The same GitHub Actions job also passed:

- Governance v0.4 ATK-01..16 + Governance regressions: `45 PASS`
- Canonical Harness regressions: `17 PASS`
- Current relational Core + relation-materialization regressions: `17 PASS`
- Python compilation of Governance/Core modules: `PASS`

Total executed unit tests in the gate: `91 PASS`.

No existing Governance v0.4, Canonical Harness, or Core regression failed.

## Scope boundary

This result admits the **actual repository Core implementation** (`CurrentRelationalCoreV11`) to the fixed GH-1 Core Admission contract. It is not evidence that GH-1A/GH-1B hypotheses are supported, and no GH-1 experimental result has been produced yet.

The legacy `AdmissionResult.real_experiment` field in Governance Harness v0.4 still conservatively records live Core/runtime evidence as blocked; this PASS does not claim live CARLA or industrial-environment validation. The next gates remain Detector Validity, RNG isolation, Fresh Process verification, and experiment-manifest/hash freeze.

Therefore:

- `GH-1 CORE ADMISSION = PASS`
- `REAL_CORE_ADMISSION = ADMITTED`
- `GH-1A/GH-1B = NOT STARTED`
- `GH-1 EXPERIMENT_READY = FALSE` until the remaining pre-execution gates pass.
