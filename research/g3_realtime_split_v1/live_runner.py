from __future__ import annotations

import argparse
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import shutil
import time

from research.choice_responsibility_v01.integration import NoAdmissibleChoice
from research.g3_organic_carla_01.protocol import (
    PREREGISTRATION_PATH,
    flow_spec,
    load_preregistration,
    preregistration_sha256,
    verify_frozen_organic_sources,
)
from research.g3_organic_carla_01.live_runner import (
    build_scene_plan, spawn_scene, prepare_live_world, _cleanup,
)
from research.g3_organic_carla_01.run_audit import RunAuditLedger
from research.g3_organic_flow_v1.carla_atomic_port import OrganicCARLAAtomicPort
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
)
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness
from research.g3_organic_flow_v1.runtime_freeze import OrganicRuntimeIdentityGuard
from research.integration_checkpoint.frame import V12ResponsibilityEvidenceAdapter
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.runtime import ExecutionJournal
from research.g3_realtime_split_v1.core import EpochSnapshotOrganicCore
from research.g3_realtime_split_v1.worker import DeferredRelationWorker

PROTOCOL_ID = "G3-REALTIME-SPLIT-V1"
SUBJECT_ID = "ego"
EXPECTED_CARLA_VERSION = "0.9.16"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(
        payload,
        sort_keys=True,
        indent=2,
        ensure_ascii=False,
        allow_nan=False,
    ) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(encoded, encoding="utf-8")
    temporary.replace(path)


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def candidate_source_hashes() -> dict:
    package = Path(__file__).resolve().parent
    return {name: _sha256_file(package / name)
            for name in ("__init__.py", "core.py", "runtime.py", "worker.py", "live_runner.py")}


def _status_base(*, flow_id: str, attempt: int, seed: int, prereg_sha: str) -> dict:
    return {
        "protocol_id": PROTOCOL_ID,
        "flow_id": flow_id,
        "attempt": int(attempt),
        "seed": int(seed),
        "phase": "REGISTERED",
        "empirical_evidence": False,
        "empirical_ticks": 0,
        "planned_horizon_ticks": 30000,
        "preregistration_sha256": prereg_sha,
        "valid_complete": False,
    }


def _write_status(path: Path, status: dict, **updates: object) -> None:
    status.update(updates)
    _atomic_json(path, status)


def build_organic_core():
    base_bundle = build_domain_bundle()
    base = base_bundle.core
    core = EpochSnapshotOrganicCore(
        assessment_operator=OrganicCurrentAssessment(),
        verifier=OrganicCurrentVerifier(),
        preference_operator=ParetoContextPreference(),
        resource_allocator=OrganicResponsibilityResourceAllocator(),
        relation_builder=base.relation_builder,
        candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator,
        reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=V12ResponsibilityEvidenceAdapter(base.responsibility_operator),
        actuation_operator=base.actuation_operator,
    )
    return core, base_bundle.closure_evaluator


def run_flow(
    *,
    flow_id: str,
    attempt: int,
    output_root: str | Path,
    host: str,
    port: int,
) -> Path:
    # This candidate has a separate namespace and never runs the preserved A6.
    if flow_id == "OF-01" and int(attempt) == 6:
        raise CoreV11InvariantError("OF-01 A6 is preserved and cannot run via the split candidate")
    if any(part.upper() == "OF-01-A6" for part in Path(output_root).resolve().parts):
        raise CoreV11InvariantError("protected OF-01 A6 output path")
    protocol = load_preregistration()
    spec = flow_spec(protocol, flow_id)
    seed = int(spec["seed"])
    horizon = int(protocol["environment"]["planned_horizon_ticks_per_flow"])
    npc_count = int(protocol["environment"]["npc_count"])
    tm_port = int(protocol["environment"]["traffic_manager_port"])
    if int(attempt) < 1:
        raise CoreV11InvariantError("attempt id must be >= 1")

    repo_root = _repo_root()
    verify_frozen_organic_sources(repo_root)
    candidate_hashes = candidate_source_hashes()
    prereg_sha = preregistration_sha256()

    run_id = f"{PROTOCOL_ID}-{flow_id}-A{int(attempt)}"
    run_dir = Path(output_root) / PROTOCOL_ID / f"{flow_id}-A{int(attempt)}"
    if run_dir.exists():
        raise CoreV11InvariantError(
            f"run directory already exists; attempts are never resumed or overwritten: {run_dir}"
        )
    run_dir.mkdir(parents=True, exist_ok=False)
    shutil.copy2(PREREGISTRATION_PATH, run_dir / PREREGISTRATION_PATH.name)

    status_path = run_dir / "status.json"
    status = _status_base(flow_id=flow_id, attempt=attempt, seed=seed, prereg_sha=prereg_sha)
    _write_status(status_path, status, phase="PREFLIGHT",
                  candidate_source_sha256=candidate_hashes, candidate_runtime=True,
                  baseline_experiment_reexecution=False)

    audit = RunAuditLedger(run_dir / "run_audit.sqlite")
    evidence = OrganicEvidenceLedger(str(run_dir / "organic_evidence.sqlite"))
    execution_journal = ExecutionJournal(str(run_dir / "execution_journal.sqlite"))

    world = None
    traffic_manager = None
    actors: list[Any] = []
    empirical_started = False
    runtime_guard = None
    relation_worker = None
    try:
        try:
            import carla  # type: ignore
        except Exception as exc:
            raise CoreV11InvariantError("CARLA Python API is unavailable") from exc

        client = carla.Client(str(host), int(port))
        client.set_timeout(30.0)
        world, traffic_manager = prepare_live_world(client, protocol, seed=seed)

        plan = build_scene_plan(world, seed=seed, npc_count=npc_count)
        ego, actors = spawn_scene(world, plan=plan, tm_port=tm_port)
        if len(actors) != 1 + npc_count:
            raise CoreV11InvariantError("scene actor cardinality differs from preregistration")

        scene_manifest = {
            "protocol_id": PROTOCOL_ID,
            "flow_id": flow_id,
            "attempt": int(attempt),
            "plan": plan,
            "traffic_manager": {
                "port": tm_port,
                "synchronous_mode_commanded": True,
                "random_device_seed_commanded": seed,
                "readback_available": False,
            },
            "pre_first_tick_frame": int(world.get_snapshot().frame),
            "raw_actor_ids_recorded": False,
            "core_receives_scene_seed_or_spawn_indices": False,
        }
        scene_path = run_dir / "scene_manifest.json"
        _atomic_json(scene_path, scene_manifest)

        runtime_guard = OrganicRuntimeIdentityGuard(
            client=client,
            world=world,
            output_path=run_dir / "runtime_identity.json",
        )
        identity = runtime_guard.assert_current()
        if str(identity.get("carla_client_version")) != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError("frozen client version differs from preregistration")
        if str(identity.get("carla_server_version")) != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError("frozen server version differs from preregistration")

        core, closure_evaluator = build_organic_core()
        if core.history_envelopes():
            raise CoreV11InvariantError("reusable history must be empty at independent flow start")
        if audit.tick_count() != 0 or audit.intent_count() != 0:
            raise CoreV11InvariantError("empirical audit must be empty before tick 1")

        atomic_port = OrganicCARLAAtomicPort(
            world=world,
            ego_actor=ego,
            runtime_guard=runtime_guard,
        )
        relation_worker = DeferredRelationWorker(
            core=core,
            closure_evaluator=closure_evaluator,
            scope_id=f"{flow_id}:ego/front-interaction",
            archive_path=run_dir / "process_archive.sqlite",
            evidence_path=run_dir / "relation_experience_evidence.sqlite",
            trace_path=run_dir / "relation_experience_trace.jsonl",
        )
        relation_worker.start()
        harness = RealtimeOrganicHarness(
            core, execution_journal, authorize=lambda *_: True, worker=relation_worker,
        )

        initial_frame = int(world.get_snapshot().frame)
        audit.event(
            "preflight_complete",
            {
                "run_id": run_id,
                "initial_carla_frame": initial_frame,
                "scene_manifest_sha256": _sha256_file(scene_path),
                "runtime_identity_sha256": runtime_guard.record.sha256,
                "preregistration_sha256": prereg_sha,
                "organic_source_snapshot_commit": runtime_guard.record.source_snapshot_commit,
            },
        )
        _write_status(
            status_path,
            status,
            phase="PRE_FIRST_TICK_READY",
            runtime_identity_sha256=runtime_guard.record.sha256,
            scene_manifest_sha256=_sha256_file(scene_path),
        )

        last_frame = initial_frame
        for tick_index in range(1, horizon + 1):
            # Non-blocking only: a completed immutable publication becomes visible
            # when this new epoch captures history, never retroactively.
            relation_worker.publish_available()
            realized = False
            result = None
            current_snapshot = world.get_snapshot()
            current_tau = float(current_snapshot.timestamp.elapsed_seconds)
            if int(current_snapshot.frame) != last_frame:
                raise CoreV11InvariantError(
                    "CARLA frame changed outside the registered runner before decision"
                )

            try:
                result = harness.execute_decision_epoch(
                    atomic_port,
                    run_id=run_id,
                    subject_id=SUBJECT_ID,
                    deadline_tau=current_tau + float(protocol["environment"]["fixed_delta_seconds"]),
                )
            except NoAdmissibleChoice as exc:
                audit.event(
                    "no_admissible_choice",
                    {"tick_index": tick_index, "carla_frame": last_frame, "reason": str(exc)},
                )
            if result is not None:
                if result.application_receipt.applied is not True or result.execution is None:
                    raise CoreV11InvariantError(
                        "selected decision was not atomically realized; fail closed"
                    )
                # Full G3.2 decision evidence is written by the validation process.
                # The atomic dispatch/receipt remains in the action journal.
                audit.event("action_layer_metrics", {
                    "tick_index": tick_index, **harness.metrics,
                    "publication_visibility": core.publication_visibility,
                })
                realized = True

            audit.tick_intent(tick_index=tick_index, prior_carla_frame=last_frame)
            returned_frame = int(world.tick())
            if returned_frame != last_frame + 1:
                raise CoreV11InvariantError(
                    f"registered tick owner lost exclusivity: frame {last_frame} -> {returned_frame}"
                )
            empirical_started = True
            post_frame = atomic_port.capture()
            if int(post_frame.observation.epoch) != returned_frame:
                raise CoreV11InvariantError("post-tick observation is not bound to returned CARLA frame")
            audit.tick_complete(
                tick_index=tick_index,
                carla_frame=returned_frame,
                elapsed_seconds=float(post_frame.tau),
                realized=realized,
                pending_relations_before_post=relation_worker.health().pending_relation_processes,
            )
            last_frame = returned_frame

            if not relation_worker.submit_post(
                post_observation=post_frame.observation,
                post_tau=float(post_frame.tau),
                tick_index=tick_index,
                carla_frame=returned_frame,
            ):
                audit.event("relation_layer_degraded", {"health": asdict(relation_worker.health())})

            if tick_index == 1 or tick_index % 100 == 0 or tick_index == horizon:
                _write_status(
                    status_path,
                    status,
                    phase="LIVE_RUNNING" if tick_index < horizon else "HORIZON_REACHED",
                    empirical_evidence=True,
                    empirical_ticks=audit.tick_count(),
                    realized_decisions=audit.realized_count(),
                    pending_relations=relation_worker.health().pending_relation_processes,
                    relation_layer=asdict(relation_worker.health()),
                    last_carla_frame=last_frame,
                )
                print(
                    f"[{run_id}] tick {tick_index}/{horizon} | realized={audit.realized_count()} | pending={relation_worker.health().pending_relation_processes}",
                    flush=True,
                )

        # The only drain is after CARLA's observation horizon: never on control path.
        relation_health = relation_worker.drain(timeout=120.0)
        horizon_snapshot = {
            "pending_relation_processes": relation_health.pending_relation_processes,
            "forced_closure": False,
            "relation_layer": asdict(relation_health),
        }
        evidence.record_horizon(horizon_snapshot)
        audit.event("observation_horizon", horizon_snapshot)
        if relation_health.degraded:
            raise CoreV11InvariantError("relation/experience layer degraded; experimental completeness failed")
        final_health = relation_worker.close(timeout=120.0)
        if final_health.degraded:
            raise CoreV11InvariantError("worker shutdown failed; experimental completeness failed")
        runtime_guard.assert_current()
        verify_frozen_organic_sources(repo_root)
        if candidate_source_hashes() != candidate_hashes:
            raise CoreV11InvariantError("split candidate source changed during the observed flow")
        validation = audit.validate_tick_sequence(horizon)
        if int(world.get_snapshot().frame) != int(validation["last_frame"]):
            raise CoreV11InvariantError("final CARLA frame differs from audited final frame")

        _write_status(
            status_path,
            status,
            phase="VALID_COMPLETE",
            empirical_evidence=True,
            empirical_ticks=horizon,
            realized_decisions=validation["realized"],
            pending_relations=horizon_snapshot["pending_relation_processes"],
            right_censored_relations=horizon_snapshot["pending_relation_processes"],
            valid_complete=True,
            final_validation=validation,
            layer_health=asdict(final_health),
            candidate_runtime=True,
            baseline_experiment_reexecution=False,
        )
        audit.event("valid_complete", validation)
        return run_dir
    except Exception as exc:
        empirical_ticks = audit.tick_count()
        uncertain = audit.uncertain_tick_indices()
        _write_status(
            status_path,
            status,
            phase="PARTIAL_EMPIRICAL" if empirical_started or empirical_ticks > 0 or uncertain else "PRE_FIRST_TICK_FAIL",
            empirical_evidence=bool(empirical_started or empirical_ticks > 0 or uncertain),
            empirical_ticks=empirical_ticks,
            uncertain_tick_indices=uncertain,
            valid_complete=False,
            error_type=type(exc).__name__,
            error=str(exc),
            layer_health=asdict(relation_worker.health()) if relation_worker is not None else None,
        )
        audit.event(
            "run_failure",
            {
                "error_type": type(exc).__name__,
                "error": str(exc),
                "empirical_ticks": empirical_ticks,
                "uncertain_tick_indices": uncertain,
            },
        )
        raise
    finally:
        try:
            audit.close()
        finally:
            try:
                evidence.close()
            finally:
                try:
                    execution_journal.close()
                finally:
                    try:
                        if relation_worker is not None:
                            relation_worker.close(timeout=120.0)
                    finally:
                        _cleanup(world, traffic_manager, actors)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a separate G3 three-layer candidate flow; OF-01 A6 is protected.")
    parser.add_argument("--flow", required=True, choices=[f"OF-{i:02d}" for i in range(1, 7)])
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    args = parser.parse_args(argv)
    run_dir = run_flow(
        flow_id=args.flow,
        attempt=args.attempt,
        output_root=args.output_root,
        host=args.host,
        port=args.port,
    )
    print(f"VALID_COMPLETE: {run_dir}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
