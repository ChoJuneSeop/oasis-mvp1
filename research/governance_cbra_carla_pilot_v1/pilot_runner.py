from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from typing import Any

from research.governance_cbra_carla_mapping_v1.adapter import (
    changed_scope,
    eligible_revalidation_history,
    map_relation_context,
    open_cbra_after_closure,
    record_carla_revalidation,
    same_scope,
    unrelated_relation,
)
from research.governance_cbra_carla_mapping_v1.models import CarlaOutcomeSignal
from research.governance_cbra_v1.models import (
    AttributionKind,
    EvidenceDirection,
    TargetKind,
)
from research.governance_cbra_carla_pilot_v1.execution_gate import (
    validate_runtime_identities,
)
from research.governance_harness_v01.harness_v04 import (
    CompletedExperience,
    ParticipatingExperienceView,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

from .pilot_runtime import (
    PilotScene,
    build_governance_harness,
    cbra_feedback_from_checkpoint,
    complete_baseline_history,
    run_general_decision,
    scope_signature,
    snapshot_from_governance_execution,
)
from .telemetry import HardwareProbe, directory_size, summarize


PROTOCOL_ID = "GOVERNANCE-CBRA-CARLA-PILOT-V1"
HERE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[2]
MATRIX_PATH = HERE / "PILOT_MATRIX.json"
EXPECTED_CANONICAL_SHA256 = (
    "fe57064e10fd870ba9c3cf1ba0f5b95dc5a2bdd1337ae1b905a2f79bc450ce18"
)
CANONICAL_PATH = ROOT / "research/carla_v22_canonical/harness_v1_1.py"

ARMS = (
    "GENERAL_HARNESS",
    "GOVERNANCE_NO_CBRA",
    "GOVERNANCE_PLUS_CBRA",
)


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False)
        + "\n",
        encoding="utf-8",
    )
    tmp.replace(path)


def _append_jsonl(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(
            json.dumps(
                payload, sort_keys=True, ensure_ascii=False, allow_nan=False
            )
            + "\n"
        )


def load_matrix() -> dict:
    data = json.loads(MATRIX_PATH.read_text(encoding="utf-8"))
    if data.get("unit_count") != 54 or len(data.get("units", ())) != 54:
        raise CoreV11InvariantError("Pilot matrix must contain exactly 54 frozen units")
    if tuple(data.get("arms", ())) != ARMS:
        raise CoreV11InvariantError("Pilot arm order drifted")
    return data


def unit_by_id(unit_id: str) -> dict:
    matches = [x for x in load_matrix()["units"] if x["unit_id"] == unit_id]
    if len(matches) != 1:
        raise CoreV11InvariantError(f"unknown or duplicate Pilot unit: {unit_id}")
    return matches[0]


def _sha256_lf_normalized(path: Path) -> tuple[str, str]:
    raw = path.read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    normalized = hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()
    return actual, normalized


def static_execution_preflight() -> dict:
    gate = validate_runtime_identities(ROOT)
    if not gate.passed:
        raise CoreV11InvariantError(
            f"runtime source identity gate blocked: {gate.violations}"
        )
    actual, normalized = _sha256_lf_normalized(CANONICAL_PATH)
    if EXPECTED_CANONICAL_SHA256 not in {actual, normalized}:
        raise CoreV11InvariantError(
            "canonical Harness v1.1 source identity drifted: "
            f"actual={actual}, lf_normalized={normalized}"
        )
    return {
        "runtime_identity_checks": gate.checks,
        "canonical_harness_sha256": actual,
        "canonical_harness_lf_normalized_sha256": normalized,
        "canonical_harness_expected_sha256": EXPECTED_CANONICAL_SHA256,
        "line_ending_normalization_used": (
            actual != EXPECTED_CANONICAL_SHA256
            and normalized == EXPECTED_CANONICAL_SHA256
        ),
    }


def _failure_semantics(failure_class: str) -> tuple[EvidenceDirection, AttributionKind]:
    if failure_class == "SUCCESS_CONTROL":
        return EvidenceDirection.SUPPORTS, AttributionKind.DECISION_LINKED
    if failure_class == "EXOGENOUS_FAILURE":
        return EvidenceDirection.CONTRADICTS, AttributionKind.EXOGENOUS
    return EvidenceDirection.CONTRADICTS, AttributionKind.DECISION_LINKED


def _target_for_failure(snapshot, failure_class: str) -> tuple[TargetKind, str]:
    if failure_class in {
        "SUCCESS_CONTROL",
        "PARTICIPATION_COMMISSION_FAILURE",
        "PARTICIPATION_OMISSION_FAILURE",
        "DELAYED_FAILURE",
    }:
        return (
            TargetKind.PARTICIPATION,
            snapshot.participation[0].experience_id,
        )
    if failure_class == "RESPONSIBILITY_AXIS_FAILURE":
        u = dict(snapshot.responsibility.axis_obligations)["U"]
        if not u:
            raise CoreV11InvariantError("U responsibility provenance is empty")
        return TargetKind.RESPONSIBILITY_OBLIGATION, f"U:{u[0]}"
    if failure_class == "EXOGENOUS_FAILURE":
        return (
            TargetKind.SELECTED_CHOICE,
            snapshot.responsibility.selected_candidate_id,
        )
    raise CoreV11InvariantError(f"unknown failure class: {failure_class}")


def _signal(
    *,
    snapshot,
    failure_class: str,
    observed_tau: float,
    event_id: str,
    evidence_ref: str,
    indeterminate: bool = False,
) -> CarlaOutcomeSignal:
    kind, target_id = _target_for_failure(snapshot, failure_class)
    direction, attribution = _failure_semantics(failure_class)
    if indeterminate:
        direction = EvidenceDirection.INDETERMINATE
    return CarlaOutcomeSignal(
        observed_tau=float(observed_tau),
        relation_id=snapshot.relation_id,
        event_id=event_id,
        target_kind=kind,
        target_id=target_id,
        direction=direction,
        attribution=attribution,
        evidence_refs=(evidence_ref,),
    )


def _run_sidepath(axis, signal: CarlaOutcomeSignal):
    started = time.perf_counter()
    checkpoint = record_carla_revalidation(axis, signal)
    return checkpoint, time.perf_counter() - started


def _validate_context(unit: dict, main_observation, reentry_observation, main_rel, re_rel):
    a = map_relation_context(main_observation, relation_id=main_rel)
    b = map_relation_context(reentry_observation, relation_id=re_rel)
    expected = unit["reentry_context"]
    if expected == "SAME_SCOPE":
        passed = same_scope(a, b)
    elif expected == "CHANGED_SCOPE":
        passed = changed_scope(a, b)
    elif expected == "UNRELATED_RELATION":
        passed = unrelated_relation(a, b)
    else:
        raise CoreV11InvariantError(f"unknown reentry context: {expected}")
    if not passed:
        raise CoreV11InvariantError(
            f"real CARLA reentry context mismatch: expected {expected}; "
            f"main={a}; reentry={b}"
        )
    return {
        "expected": expected,
        "main_relation_id": a.relation_id,
        "reentry_relation_id": b.relation_id,
        "main_scope_signature": list(a.scope_signature),
        "reentry_scope_signature": list(b.scope_signature),
        "passed": True,
    }


def _close_governance(harness, scene: PilotScene, max_ticks: int):
    scene.close_front_relation()
    for _ in range(int(max_ticks)):
        result = harness.observe_post(scene.host)
        if result is not None and result.pending is False:
            return result
        scene.host.tick()
    raise CoreV11InvariantError("Governance relation did not reach Closure")


def _stage_seed(scene: PilotScene, relation_id: str):
    scene.reset_ego()
    scene.host.set_relation_id(relation_id)
    scene.spawn_counterpart("vehicle")
    scene.set_motion(ego_speed=2.0, counterpart_speed=0.4)


def _stage_gap(
    scene: PilotScene,
    *,
    harness,
    relation_id: str,
    kind: str,
    opening: bool,
):
    scene.reset_ego()
    scene.host.set_relation_id(relation_id)
    scene.spawn_counterpart(kind)
    scene.set_motion(ego_speed=4.0, counterpart_speed=0.5)
    # First sample is an actual host observation, not synthetic test data.
    harness.capture_current(scene.host, relation_id)
    scene.set_motion(
        ego_speed=1.0,
        counterpart_speed=(3.0 if opening else 0.2),
    )


def _stage_general(
    scene: PilotScene,
    *,
    relation_id: str,
    kind: str,
    opening: bool,
):
    scene.reset_ego()
    scene.host.set_relation_id(relation_id)
    scene.spawn_counterpart(kind)
    scene.set_motion(ego_speed=4.0, counterpart_speed=0.5)
    scene.set_motion(
        ego_speed=1.0,
        counterpart_speed=(3.0 if opening else 0.2),
    )


def _baseline_experience(history, relation_id: str) -> CompletedExperience:
    records = build_domain_bundle().history_admission.admit(history)
    return CompletedExperience(
        experience_id=history.entry_id,
        relation_id=relation_id,
        provenance_ref=f"general:{history.entry_id}",
        completed_tau=history.relation_end_tau,
        content={
            "history_entry_id": history.entry_id,
            "selected": history.selected_possibility_id,
            "relation_records": records,
        },
        byte_size=len(repr((history, records)).encode("utf-8")),
    )


def _governance_metrics(executions) -> tuple[int, int]:
    archive_reads = 0
    candidates = 0
    for item in executions:
        archive_reads += int(item.metrics.archive_access_count)
        candidates += len(item.responsibility.candidate_ids)
    return archive_reads, candidates


def _general_candidates(executions) -> int:
    return sum(len(x.recorder.possibility_distribution) for x in executions)


def run_unit(unit: dict, *, output_root: Path, host: str, port: int) -> Path:
    unit_dir = output_root / "units" / unit["unit_id"]
    if unit_dir.exists():
        raise CoreV11InvariantError(
            f"Pilot unit output already exists; overwrite/resume forbidden: {unit_dir}"
        )
    unit_dir.mkdir(parents=True, exist_ok=False)
    events_path = unit_dir / "events.jsonl"
    _atomic_json(unit_dir / "UNIT_SPEC.json", unit)

    preflight = static_execution_preflight()
    _atomic_json(unit_dir / "SOURCE_PREFLIGHT.json", preflight)

    try:
        import carla  # type: ignore
    except Exception as exc:
        raise CoreV11InvariantError("CARLA Python API unavailable") from exc

    client = carla.Client(str(host), int(port))
    client.set_timeout(20.0)
    scene = None
    probe = HardwareProbe()
    begin_probe = probe.snapshot()
    decision_latencies: list[float] = []
    closure_count = 0
    cbra_wakeups = 0
    cbra_active = 0.0
    checkpoint_writes = 0
    cbra_axis = None
    cbra_checks: dict[str, Any] = {
        "instantiated": False,
        "preclosure_rejected": None,
        "duplicate_rejected": None,
        "cross_relation_rejected": None,
        "strict_as_of": None,
        "closed_reopen_rejected": None,
        "hot_path_overlap": False,
    }
    start_wall = time.perf_counter()
    start_frame = None
    end_frame = None

    try:
        scene = PilotScene(client, seed=int(unit["seed"]))
        start_frame = int(scene.world.get_snapshot().frame)
        runtime = {
            **scene.host.atomic_current_snapshot().__dict__,
            "carla_client_version": client.get_client_version(),
            "carla_server_version": client.get_server_version(),
            "map_name": scene.world.get_map().name,
            "synchronous_mode": scene.world.get_settings().synchronous_mode,
            "fixed_delta_seconds": scene.world.get_settings().fixed_delta_seconds,
            "no_rendering_mode": scene.world.get_settings().no_rendering_mode,
        }
        # AtomicFlowSnapshot contains non-JSON observation/current_reality. Store a
        # minimal runtime identity separately from experimental event records.
        _atomic_json(
            unit_dir / "RUNTIME_IDENTITY.json",
            {
                "carla_client_version": runtime["carla_client_version"],
                "carla_server_version": runtime["carla_server_version"],
                "map_name": runtime["map_name"],
                "synchronous_mode": runtime["synchronous_mode"],
                "fixed_delta_seconds": runtime["fixed_delta_seconds"],
                "no_rendering_mode": runtime["no_rendering_mode"],
            },
        )

        main_rel = str(unit["seed_relation_id"])
        re_rel = (
            f"{main_rel}:UNRELATED"
            if unit["reentry_context"] == "UNRELATED_RELATION"
            else main_rel
        )
        re_kind = (
            "pedestrian"
            if unit["reentry_context"] == "CHANGED_SCOPE"
            else "vehicle"
        )
        opening = unit["failure_class"] == "PARTICIPATION_OMISSION_FAILURE"

        if unit["arm"] == "GENERAL_HARNESS":
            # Seed: real CARLA decision -> authoritative Closure -> reusable relation.
            _stage_seed(scene, main_rel)
            t0 = time.perf_counter()
            seed_exec = run_general_decision(scene=scene, experiences=())
            decision_latencies.append(time.perf_counter() - t0)
            seed_history = complete_baseline_history(
                scene=scene,
                execution=seed_exec,
                entry_id=f"{unit['unit_id']}:SEED",
            )
            closure_count += 1
            seed_exp = _baseline_experience(seed_history, main_rel)

            _stage_general(
                scene,
                relation_id=main_rel,
                kind="vehicle",
                opening=opening,
            )
            t0 = time.perf_counter()
            main_exec = run_general_decision(
                scene=scene,
                experiences=(seed_exp,),
            )
            main_decision_end = time.perf_counter()
            decision_latencies.append(main_decision_end - t0)
            main_history = complete_baseline_history(
                scene=scene,
                execution=main_exec,
                entry_id=f"{unit['unit_id']}:MAIN",
            )
            closure_count += 1
            main_exp = _baseline_experience(main_history, main_rel)

            evaluator_direction, evaluator_attribution = _failure_semantics(
                unit["failure_class"]
            )
            _append_jsonl(
                events_path,
                {
                    "kind": "POST_CLOSURE_EVALUATOR_EVENT",
                    "failure_class": unit["failure_class"],
                    "direction": evaluator_direction.value,
                    "attribution": evaluator_attribution.value,
                    "fed_to_core": False,
                    "cbra_instantiated": False,
                },
            )

            _stage_general(
                scene,
                relation_id=re_rel,
                kind=re_kind,
                opening=opening,
            )
            baseline_view = (
                (seed_exp, main_exp)
                if re_rel == main_rel
                else ()
            )
            reentry_start = time.perf_counter()
            reentry_exec = run_general_decision(
                scene=scene,
                experiences=baseline_view,
            )
            decision_latencies.append(time.perf_counter() - reentry_start)
            _ = complete_baseline_history(
                scene=scene,
                execution=reentry_exec,
                entry_id=f"{unit['unit_id']}:REENTRY",
            )
            closure_count += 1

            context_check = _validate_context(
                unit,
                main_exec.observation,
                reentry_exec.observation,
                main_rel,
                re_rel,
            )
            archive_reads = 0
            candidates_examined = _general_candidates(
                (seed_exec, main_exec, reentry_exec)
            )
            arm_result = {
                "seed_selected": seed_exec.realization.selected_possibility_id,
                "main_selected": main_exec.realization.selected_possibility_id,
                "reentry_selected": reentry_exec.realization.selected_possibility_id,
                "main_participation_provenance": "GENERAL_HARNESS_NOT_AVAILABLE",
                "reentry_participation_provenance": "GENERAL_HARNESS_NOT_AVAILABLE",
                "cbra_instantiated": False,
            }

        else:
            harness, history_port = build_governance_harness()

            _stage_seed(scene, main_rel)
            t0 = time.perf_counter()
            seed_exec = harness.execute_decision_epoch(
                scene.host, relation_id=main_rel
            )
            decision_latencies.append(time.perf_counter() - t0)
            seed_done = _close_governance(
                harness, scene, int(unit["max_closure_ticks"])
            )
            closure_count += 1

            _stage_gap(
                scene,
                harness=harness,
                relation_id=main_rel,
                kind="vehicle",
                opening=opening,
            )
            t0 = time.perf_counter()
            main_exec = harness.execute_decision_epoch(
                scene.host, relation_id=main_rel
            )
            decision_latencies.append(time.perf_counter() - t0)
            main_decision_end = time.perf_counter()
            main_done = _close_governance(
                harness, scene, int(unit["max_closure_ticks"])
            )
            closure_count += 1
            snapshot = snapshot_from_governance_execution(main_done)
            main_scope = scope_signature(main_done.decision.observation)

            if unit["arm"] == "GOVERNANCE_PLUS_CBRA":
                cbra_axis = open_cbra_after_closure(
                    history=main_done.history_entry,
                    snapshot=snapshot,
                )
                cbra_checks["instantiated"] = True

                # Explicitly verify the no-pre-Closure invariant on a fresh monitor.
                fresh = open_cbra_after_closure(
                    history=main_done.history_entry,
                    snapshot=snapshot,
                )
                pre_sig = _signal(
                    snapshot=snapshot,
                    failure_class=unit["failure_class"],
                    observed_tau=snapshot.closure_tau,
                    event_id=f"{unit['unit_id']}:PRE-CLOSURE-CANARY",
                    evidence_ref="CANARY:pre-closure",
                    indeterminate=True,
                )
                try:
                    record_carla_revalidation(fresh, pre_sig)
                    cbra_checks["preclosure_rejected"] = False
                    raise CoreV11InvariantError(
                        "CBRA accepted a checkpoint at/before Closure"
                    )
                except ValueError:
                    cbra_checks["preclosure_rejected"] = True

                with ThreadPoolExecutor(
                    max_workers=1,
                    thread_name_prefix="cbra-post-closure",
                ) as pool:
                    scene.host.tick()
                    tau1 = float(scene.host.current_tau())
                    delayed = unit["failure_class"] == "DELAYED_FAILURE"
                    sig1 = _signal(
                        snapshot=snapshot,
                        failure_class=unit["failure_class"],
                        observed_tau=tau1,
                        event_id=f"{unit['unit_id']}:CBRA:1",
                        evidence_ref=f"CARLA:frame:{scene.world.get_snapshot().frame}",
                        indeterminate=delayed,
                    )
                    future = pool.submit(_run_sidepath, cbra_axis, sig1)
                    cp1, active = future.result()
                    cbra_active += active
                    cbra_wakeups += 1
                    checkpoint_writes += 1
                    final_cp = cp1

                    if delayed:
                        scene.host.tick()
                        tau2 = float(scene.host.current_tau())
                        pre_second = eligible_revalidation_history(
                            cbra_axis, later_decision_tau=tau2
                        )
                        if tuple(x.ordinal for x in pre_second) != (1,):
                            raise CoreV11InvariantError(
                                "delayed CBRA as-of gate exposed a future checkpoint"
                            )
                        sig2 = _signal(
                            snapshot=snapshot,
                            failure_class=unit["failure_class"],
                            observed_tau=tau2,
                            event_id=f"{unit['unit_id']}:CBRA:2",
                            evidence_ref=f"CARLA:frame:{scene.world.get_snapshot().frame}",
                            indeterminate=False,
                        )
                        future = pool.submit(_run_sidepath, cbra_axis, sig2)
                        final_cp, active = future.result()
                        cbra_active += active
                        cbra_wakeups += 1
                        checkpoint_writes += 1

                exact_as_of = eligible_revalidation_history(
                    cbra_axis, later_decision_tau=final_cp.observed_tau
                )
                cbra_checks["strict_as_of"] = all(
                    item.ordinal != final_cp.ordinal for item in exact_as_of
                )
                if not cbra_checks["strict_as_of"]:
                    raise CoreV11InvariantError(
                        "CBRA checkpoint visible at its own observed time"
                    )

                # Runtime duplicate and cross-relation contamination canaries.
                duplicate = CarlaOutcomeSignal(
                    observed_tau=final_cp.observed_tau + 0.001,
                    relation_id=snapshot.relation_id,
                    event_id=(
                        f"{unit['unit_id']}:CBRA:2"
                        if unit["failure_class"] == "DELAYED_FAILURE"
                        else f"{unit['unit_id']}:CBRA:1"
                    ),
                    target_kind=_target_for_failure(
                        snapshot, unit["failure_class"]
                    )[0],
                    target_id=_target_for_failure(
                        snapshot, unit["failure_class"]
                    )[1],
                    direction=EvidenceDirection.CONTRADICTS,
                    attribution=AttributionKind.DECISION_LINKED,
                    evidence_refs=("CANARY:duplicate",),
                )
                try:
                    record_carla_revalidation(cbra_axis, duplicate)
                    cbra_checks["duplicate_rejected"] = False
                    raise CoreV11InvariantError(
                        "CBRA accepted duplicate evidence event"
                    )
                except ValueError:
                    cbra_checks["duplicate_rejected"] = True

                cross = CarlaOutcomeSignal(
                    observed_tau=final_cp.observed_tau + 0.002,
                    relation_id=f"{snapshot.relation_id}:CROSS",
                    event_id=f"{unit['unit_id']}:CROSS",
                    target_kind=_target_for_failure(
                        snapshot, unit["failure_class"]
                    )[0],
                    target_id=_target_for_failure(
                        snapshot, unit["failure_class"]
                    )[1],
                    direction=EvidenceDirection.CONTRADICTS,
                    attribution=AttributionKind.DECISION_LINKED,
                    evidence_refs=("CANARY:cross-relation",),
                )
                try:
                    record_carla_revalidation(cbra_axis, cross)
                    cbra_checks["cross_relation_rejected"] = False
                    raise CoreV11InvariantError(
                        "CBRA accepted cross-relation evidence"
                    )
                except ValueError:
                    cbra_checks["cross_relation_rejected"] = True

                history_port.publish_cbra_feedback(
                    cbra_feedback_from_checkpoint(final_cp),
                    original_scope_signature=main_scope,
                )
                _append_jsonl(
                    events_path,
                    {
                        "kind": "CBRA_CHECKPOINT",
                        "checkpoint": asdict(final_cp),
                        "failure_class": unit["failure_class"],
                        "fed_to_same_completed_epoch": False,
                    },
                )
            else:
                # The independent evaluator can form the same typed target without
                # constructing a CBRA axis. No result is fed back to Governance.
                target_kind, target_id = _target_for_failure(
                    snapshot, unit["failure_class"]
                )
                direction, attribution = _failure_semantics(
                    unit["failure_class"]
                )
                _append_jsonl(
                    events_path,
                    {
                        "kind": "POST_CLOSURE_EVALUATOR_EVENT",
                        "target_kind": target_kind.value,
                        "target_id": target_id,
                        "direction": direction.value,
                        "attribution": attribution.value,
                        "fed_to_core": False,
                        "cbra_instantiated": False,
                    },
                )

            _stage_gap(
                scene,
                harness=harness,
                relation_id=re_rel,
                kind=re_kind,
                opening=opening,
            )
            reentry_start = time.perf_counter()
            if cbra_axis is not None and reentry_start < main_decision_end:
                cbra_checks["hot_path_overlap"] = True
                raise CoreV11InvariantError("CBRA side path overlapped hot decision path")
            reentry_exec = harness.execute_decision_epoch(
                scene.host, relation_id=re_rel
            )
            decision_latencies.append(time.perf_counter() - reentry_start)
            reentry_done = _close_governance(
                harness, scene, int(unit["max_closure_ticks"])
            )
            closure_count += 1

            if cbra_axis is not None:
                visible = eligible_revalidation_history(
                    cbra_axis,
                    later_decision_tau=reentry_exec.decision.tau,
                )
                if len(visible) != checkpoint_writes:
                    raise CoreV11InvariantError(
                        "reentry did not observe exactly the eligible CBRA checkpoints"
                    )
                cbra_axis.close()
                try:
                    cbra_axis.reopen()
                    cbra_checks["closed_reopen_rejected"] = False
                    raise CoreV11InvariantError(
                        "closed CBRA monitor reopened"
                    )
                except ValueError:
                    cbra_checks["closed_reopen_rejected"] = True

            context_check = _validate_context(
                unit,
                main_done.decision.observation,
                reentry_done.decision.observation,
                main_rel,
                re_rel,
            )
            archive_reads, candidates_examined = _governance_metrics(
                (seed_done, main_done, reentry_done)
            )
            arm_result = {
                "seed_branch": seed_done.branch,
                "main_branch": main_done.branch,
                "reentry_branch": reentry_done.branch,
                "main_selected": main_done.responsibility.selected_candidate_id,
                "reentry_selected": reentry_done.responsibility.selected_candidate_id,
                "main_participation": [
                    {
                        "experience_id": x.experience_id,
                        "participate": x.participate,
                        "rationale": x.rationale,
                    }
                    for x in main_done.reengagement
                ],
                "reentry_participation": [
                    {
                        "experience_id": x.experience_id,
                        "participate": x.participate,
                        "rationale": x.rationale,
                    }
                    for x in reentry_done.reengagement
                ],
                "cbra_instantiated": cbra_axis is not None,
                "cbra_checkpoint_count": checkpoint_writes,
            }

        end_frame = int(scene.world.get_snapshot().frame)
        end_probe = probe.snapshot()
        simulated_seconds = (
            max(0, end_frame - start_frame) * 0.05
            if start_frame is not None
            else 0.0
        )
        before_final_size = directory_size(unit_dir)
        telemetry = summarize(
            decision_latencies=decision_latencies,
            begin=begin_probe,
            end=end_probe,
            simulated_seconds=simulated_seconds,
            realized_decisions=len(decision_latencies),
            closure_count=closure_count,
            archive_reads=archive_reads,
            candidates_examined=candidates_examined,
            cbra_wakeups=cbra_wakeups,
            cbra_active_seconds=cbra_active,
            checkpoint_writes=checkpoint_writes,
            storage_growth_bytes=before_final_size,
        )
        _atomic_json(unit_dir / "TELEMETRY.json", telemetry)

        result = {
            "protocol_id": PROTOCOL_ID,
            "unit_id": unit["unit_id"],
            "status": "PASS",
            "structural_only": True,
            "confirmatory": False,
            "arm": unit["arm"],
            "failure_class": unit["failure_class"],
            "reentry_context": unit["reentry_context"],
            "seed": unit["seed"],
            "context_validation": context_check,
            "arm_result": arm_result,
            "cbra_invariant_checks": cbra_checks,
            "closures": closure_count,
            "decision_count": len(decision_latencies),
            "empirical_carla_frames": (
                None
                if start_frame is None or end_frame is None
                else end_frame - start_frame
            ),
            "post_result_tuning": False,
            "scientific_superiority_claim": False,
        }
        _atomic_json(unit_dir / "UNIT_RESULT.json", result)
        return unit_dir
    except Exception as exc:
        failure = {
            "protocol_id": PROTOCOL_ID,
            "unit_id": unit["unit_id"],
            "status": "FAIL",
            "error_type": type(exc).__name__,
            "error": str(exc),
            "structural_only": True,
            "partial_results_preserved": True,
            "post_result_tuning": False,
        }
        _atomic_json(unit_dir / "UNIT_RESULT.json", failure)
        raise
    finally:
        probe.close()
        if scene is not None:
            scene.cleanup()


def _runtime_alive(host: str, port: int) -> bool:
    try:
        import carla  # type: ignore
        client = carla.Client(str(host), int(port))
        client.set_timeout(3.0)
        client.get_world()
        return True
    except Exception:
        return False


def run_matrix(*, output_root: Path, host: str, port: int) -> Path:
    if output_root.exists():
        raise CoreV11InvariantError(
            f"Pilot run root already exists; resume/overwrite forbidden: {output_root}"
        )
    output_root.mkdir(parents=True, exist_ok=False)
    matrix = load_matrix()
    shutil.copy2(MATRIX_PATH, output_root / MATRIX_PATH.name)
    _atomic_json(
        output_root / "RUN_REGISTRATION.json",
        {
            "protocol_id": PROTOCOL_ID,
            "matrix_status": matrix["status"],
            "unit_count": matrix["unit_count"],
            "first_pilot_execution_registered_before_unit_1": True,
            "post_result_tuning": False,
            "started_wall_time_unix": time.time(),
        },
    )

    static_execution_preflight()
    rows = []
    runtime_lost = False

    for index, unit in enumerate(matrix["units"], 1):
        cmd = [
            sys.executable,
            "-m",
            "research.governance_cbra_carla_pilot_v1.pilot_runner",
            "--worker",
            "--unit-id",
            unit["unit_id"],
            "--output-root",
            str(output_root),
            "--host",
            str(host),
            "--port",
            str(port),
        ]
        started = time.perf_counter()
        proc = subprocess.run(cmd, text=True, capture_output=True)
        row = {
            "ordinal": index,
            "unit_id": unit["unit_id"],
            "arm": unit["arm"],
            "failure_class": unit["failure_class"],
            "reentry_context": unit["reentry_context"],
            "returncode": proc.returncode,
            "wall_seconds": time.perf_counter() - started,
            "stdout_tail": proc.stdout[-4000:],
            "stderr_tail": proc.stderr[-4000:],
        }
        rows.append(row)
        _atomic_json(output_root / "MATRIX_PROGRESS.json", {"units": rows})
        print(
            f"[PILOT] {index}/54 {unit['unit_id']} -> "
            f"{'PASS' if proc.returncode == 0 else 'FAIL'}",
            flush=True,
        )
        if proc.returncode != 0 and not _runtime_alive(host, port):
            runtime_lost = True
            break

    completed = len(rows)
    passed = sum(1 for row in rows if row["returncode"] == 0)
    failed = completed - passed
    status = (
        "PASS"
        if completed == 54 and failed == 0
        else ("RUNTIME_LOST" if runtime_lost else "INCOMPLETE_OR_FAILED")
    )
    summary = {
        "protocol_id": PROTOCOL_ID,
        "status": status,
        "registered_units": 54,
        "completed_units": completed,
        "passed_units": passed,
        "failed_units": failed,
        "runtime_lost": runtime_lost,
        "structural_only": True,
        "confirmatory": False,
        "scientific_superiority_claim": False,
        "rows": rows,
    }
    _atomic_json(output_root / "PILOT_SUMMARY.json", summary)
    return output_root


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Dedicated 54-unit Governance OASIS + CBRA CARLA Pilot runner"
    )
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--unit-id")
    args = parser.parse_args(argv)

    output_root = Path(args.output_root)
    if args.worker:
        if not args.unit_id:
            parser.error("--worker requires --unit-id")
        unit = unit_by_id(args.unit_id)
        run_unit(unit, output_root=output_root, host=args.host, port=args.port)
        print(f"UNIT_PASS {unit['unit_id']}", flush=True)
        return 0

    run_dir = run_matrix(
        output_root=output_root,
        host=args.host,
        port=args.port,
    )
    summary = json.loads((run_dir / "PILOT_SUMMARY.json").read_text())
    print(
        f"PILOT_{summary['status']} "
        f"{summary['passed_units']}/{summary['registered_units']} "
        f"{run_dir}",
        flush=True,
    )
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
