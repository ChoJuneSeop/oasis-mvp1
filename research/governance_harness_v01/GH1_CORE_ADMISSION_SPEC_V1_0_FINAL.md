# GH-1 Core Admission Specification v1.0 FINAL

Status: `FROZEN`
Scope: actual `CurrentRelationalCoreV11` only. Synthetic contract exercisers are insufficient evidence.

## Admission invariants

ADM-01 Hidden Archive Ownership — Core must not own archive/history/catalog/future/scenario/seed capabilities.

ADM-02 HistoryAccessPort Exclusivity — the Core receives only the already filtered current-epoch participating experience view; it never receives `HistoryAccessPort` or an archive handle.

ADM-03 NO Branch Zero Access — when Gap=NO, archive access count, records scanned, and bytes read must all remain zero.

ADM-04 Nonparticipant Isolation — experiences judged `participate=False` must not appear in the Core input or affect the Core decision path.

ADM-05 Mandatory `realize_selected` — the actual Core must expose `realize_selected(observation, tau, selected_possibility_id)`.

ADM-06 Causal Selection Binding — the candidate selected by Governance responsibility must be the candidate realized by the Core.

ADM-07 Internal Choice Bypass — the `realize_selected` path must not call the Core's internal choice operator to replace the Governance selection.

ADM-08 Future Leakage — future-completed experience, scenario/anomaly labels, seeds, ground truth, evaluator outcomes, or other future-only inputs are forbidden.

ADM-09 Probe Purity — `open_epoch`, relation ablations, reconstruction, and responsibility evaluation must not actuate the environment.

ADM-10 Single Realization — one opened epoch permits at most one Core realization before a new epoch is opened.

ADM-11 Closure Boundary — the Core does not create or commit Completed Experience records. Closure and atomic commit remain Governance/HistoryAccessPort responsibilities.

ADM-12 Ephemeral Participating View — the Core may derive epoch-local relation records from participating experiences, but it must not persist the participating view or archive records after realization.

## Interface contract

Governance path:

`Current flow -> Gap -> HistoryAccessPort (YES only) -> participation decisions -> ParticipatingExperienceView -> Core.open_epoch(...) -> responsibility-bound selected id -> Core.realize_selected(...) -> single actuation -> host outcome -> Closure -> revalidation -> atomic commit`

The actual Core may retain a compatibility `realize(...)` method outside GH-1, but GH-1 evidence must use `realize_selected(...)` exclusively.

## Decision-eligible experience payload

A participating Completed Experience may carry domain relation records in `content["relation_records"]`. The Core may derive only immutable epoch-local `HistoricalRelationRecord` values from this field. Each record must preserve the participating experience id and completion time and must precede the current authoritative `tau`.

Missing relation records produce no historical relation contribution; they never authorize archive access or reconstruction from another source.

## Regression requirement

Admission requires all ADM-01..ADM-12 tests plus the existing Governance v0.4 attack/regression gate, Canonical Harness regressions, Core/history regressions, and Python compilation to pass in GitHub Actions.

## State transition

Before PASS: `REAL_CORE_ADMISSION = BLOCKED`

After all gates PASS and CI evidence is frozen: `REAL_CORE_ADMISSION = ADMITTED`

This admission does not by itself mark GH-1 as experiment-ready. Detector validity, RNG isolation, fresh-process checks, and experiment-manifest freezing remain separate pre-execution gates.
