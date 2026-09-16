# GH-1 Real Core Admission — Baseline FAIL

Status: `BASELINE_FAIL_RECORDED`

Target branch: `feature/governance-harness-v1`
Baseline target commit: `c83827daed060bdee553e368ec0e7e192b7a1e81`
Target Core: `research/oasis_core_v11/current_relational_core.py` (`CurrentRelationalCoreV11`)

## Fixed admission blockers

The pre-patch real Core is not admitted for GH-1 execution for two independent reasons.

1. **Core-owned historical capability**
   - `CurrentRelationalCoreV11` owns `_history`.
   - It exposes `add_history`, `history_records`, and `governance_history_scope`.
   - Narrowing an internally owned archive is not equivalent to `HistoryAccessPort` being the sole archive capability.

2. **Missing mandatory responsibility-bound realization port**
   - The Core exposes `realize(...)` and internally calls `choice_operator.choose(...)`.
   - It does not expose `realize_selected(observation, tau, selected_possibility_id)`.
   - Therefore Governance responsibility selection is not guaranteed to causally bind the actual realization.

## Baseline decision

`REAL_CORE_ADMISSION = BLOCKED`

No GH-1A/GH-1B experimental result may be produced from this baseline Core.

## Required patch boundary

The patch must, without changing the frozen GH-1 hypothesis or experimental design:

- remove Core archive ownership and direct historical reads;
- accept only the already-filtered participating experience view for the current epoch;
- retain only epoch-local derived relation records and clear them after realization;
- add mandatory `realize_selected(...)` and prevent internal choice override on that path;
- preserve present-only/no-future, pure-probe, single-realization, and Closure-before-Completed-Experience invariants;
- pass ADM-01 through ADM-12 plus all existing Governance/Canonical/Core regressions.

This document is immutable baseline evidence. Post-patch evidence belongs in `GH1_CORE_ADMISSION_FINAL_PASS.md`.
