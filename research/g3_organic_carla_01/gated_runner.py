from __future__ import annotations

"""Gated empirical runner for G3-ORGANIC-CARLA-01.

The runner preserves the original preregistration bytes and adds a pre-first-tick
execution-integrity gate before any empirical Decision Epoch/tick.
"""

import argparse
from pathlib import Path
import shutil
import time

from research.choice_responsibility_v01.integration import NoAdmissibleChoice
from research.g3_organic_carla_01.live_runner import (
    EXPECTED_CARLA_VERSION,
    PROTOCOL_ID,
    SUBJECT_ID,
    _atomic_json,
    _cleanup,
    _repo_root,
    _sha256_file,
    _status_base,
    _write_status,
    build_organic_core,
    build_scene_plan,
    prepare_live_world,
    spawn_scene,
)
from research.g3_organic_carla_01.protocol import (
    EXPERIMENT_MANIFEST_PATH,
    ORGANIC_MANIFEST_PATH,
    PREREGISTRATION_PATH,
    experiment_manifest_sha256,
    flow_spec,
    load_preregistration,
    preregistration_sha256,
    verify_frozen_organic_sources,
)
from research.g3_organic_carla_01.release_gate import (
    TOKEN_NAME,
    build_release_request,
    file_sha256,
    verify_release_token,
)
from research.g3_organic_carla_01.run_audit import RunAuditLedger
from research.g3_organic_flow_v1.carla_atomic_port import OrganicCARLAAtomicPort
from research.g3_organic_flow_v1.history import (
    FrontRelationEpisodeManager,
    OrganicHistoryCommitter,
)
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_organic_flow_v1.runtime_freeze import OrganicRuntimeIdentityGuard
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.process_archive import ProcessArchive
from research.oasis_core_v12.runtime import ExecutionJournal

RELEASE_POLL_SECONDS = 1.0


def _verify_experiment_manifest() -> dict:
    from research.g3_organic_carla_01.frozen_runner_v2 import (
        verify_experiment_manifest_v2,
    )
    return verify_experiment_manifest_v2()


def _same_current(left, right) -> bool:
    return (
        int(left.observation.epoch) == int(right.observation.epoch)
        and float(left.tau) == float(right.tau)
        and left.revision == right.revision
        and left.observation == right.observation
        and left.evidence == right.evidence
    )


def _wait_for_release(
    *,
    run_dir: Path,
    status_path: Path,
    status: dict,
    atomic_port: OrganicCARLAAtomicPort,
    runtime_guard: OrganicRuntimeIdentityGuard,
    preflight_frame,
    release_request_sha: str,
    repo_root: Path,
) -> str:
    token_path = run_dir / TOKEN_NAME
    print("[PRE_FIRST_TICK_HOLD] empirical_evidence=false, empirical_ticks=0", flush=True)
    print("[PRE_FIRST_TICK_HOLD] Run release_gate --approve in a second terminal.", flush=True)
    while not token_path.exists():
        _verify_experiment_manifest()
        verify_frozen_organic_sources(repo_root)
        runtime_guard.assert_current()
        if not _same_current(preflight_frame, atomic_port.capture()):
            raise CoreV11InvariantError(
                "current CARLA state changed during PRE_FIRST_TICK_HOLD"
            )
        time.sleep(RELEASE_POLL_SECONDS)
    verify_release_token(run_dir, expected_request_sha256=release_request_sha)
    _verify_experiment_manifest()
    verify_frozen_organic_sources(repo_root)
    runtime_guard.assert_current()
    if not _same_current(preflight_frame, atomic_port.capture()):
        raise CoreV11InvariantError("current CARLA state changed immediately before release")
    token_sha = file_sha256(token_path)
    _write_status(
        status_path,
        status,
        phase="PRE_FIRST_TICK_RELEASED",
        empirical_evidence=False,
        empirical_ticks=0,
        release_token_sha256=token_sha,
    )
    return token_sha


def run_flow(
    *,
    flow_id: str,
    attempt: int,
    output_root: str | Path,
    host: str,
    port: int,
) -> Path:
    experiment_manifest = _verify_experiment_manifest()
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
    prereg_sha = preregistration_sha256()
    manifest_sha = experiment_manifest_sha256()

    run_id = f"{PROTOCOL_ID}-{flow_id}-A{int(attempt)}"
    run_dir = Path(output_root) / PROTOCOL_ID / f"{flow_id}-A{int(attempt)}"
    if run_dir.exists():
        raise CoreV11InvariantError(
            f"run directory already exists; never resume/overwrite: {run_dir}"
        )
    run_dir.mkdir(parents=True, exist_ok=False)
    shutil.copy2(PREREGISTRATION_PATH, run_dir / PREREGISTRATION_PATH.name)
    shutil.copy2(EXPERIMENT_MANIFEST_PATH, run_dir / EXPERIMENT_MANIFEST_PATH.name)
    shutil.copy2(ORGANIC_MANIFEST_PATH, run_dir / "ORGANIC_SOURCE_MANIFEST.json")

    status_path = run_dir / "status.json"
    status = _status_base(flow_id=flow_id, attempt=attempt, seed=seed, prereg_sha=prereg_sha)
    _write_status(
        status_path,
        status,
        phase="PREFLIGHT",
        experiment_source_manifest_sha256=manifest_sha,
        experiment_source_snapshot_commit=experiment_manifest["experiment_source_snapshot_commit"],
    )

    audit = RunAuditLedger(run_dir / "run_audit.sqlite")
    evidence = OrganicEvidenceLedger(str(run_dir / "organic_evidence.sqlite"))
    journal = ExecutionJournal(str(run_dir / "execution_journal.sqlite"))
    archive = ProcessArchive(str(run_dir / "process_archive.sqlite"))
    world = None
    traffic_manager = None
    actors = []
    empirical_started = False
    manager = None

    try:
        try:
            import carla  # type: ignore
        except Exception as exc:
            raise CoreV11InvariantError("CARLA Python API is unavailable") from exc

        client = carla.Client(str(host), int(port))
        client.set_timeout(30.0)
        world, traffic_manager = prepare_live_world(client, protocol, seed=seed)
        tm_provenance = {
            "port": tm_port,
            "synchronous_mode_commanded": True,
            "random_device_seed_commanded": seed,
            "command_returned_without_exception": True,
            "runtime_readback": "NOT_AVAILABLE_IN_USED_API",
            "independent_runtime_verification_claimed": False,
        }

        plan = build_scene_plan(world, seed=seed, npc_count=npc_count)
        ego, actors = spawn_scene(world, plan=plan, tm_port=tm_port)
        if len(actors) != 1 + npc_count:
            raise CoreV11InvariantError("scene actor cardinality differs from preregistration")

        scene_path = run_dir / "scene_manifest.json"
        _atomic_json(
            scene_path,
            {
                "protocol_id": PROTOCOL_ID,
                "flow_id": flow_id,
                "attempt": int(attempt),
                "plan": plan,
                "traffic_manager": tm_provenance,
                "pre_first_tick_frame": int(world.get_snapshot().frame),
                "raw_actor_ids_recorded": False,
                "core_receives_scene_seed_or_spawn_indices": False,
            },
        )

        runtime_guard = OrganicRuntimeIdentityGuard(
            client=client,
            world=world,
            output_path=run_dir / "runtime_identity.json",
        )
        identity = runtime_guard.assert_current()
        if (
            str(identity.get("carla_client_version")) != EXPECTED_CARLA_VERSION
            or str(identity.get("carla_server_version")) != EXPECTED_CARLA_VERSION
        ):
            raise CoreV11InvariantError("frozen CARLA version differs from preregistration")

        core, closure_evaluator = build_organic_core()
        if core.history_envelopes():
            raise CoreV11InvariantError("reusable history must be empty at flow start")
        if audit.tick_count() != 0 or audit.intent_count() != 0:
            raise CoreV11InvariantError("empirical tick audit must be empty before release")

        port_adapter = OrganicCARLAAtomicPort(
            world=world,
            ego_actor=ego,
            runtime_guard=runtime_guard,
        )
        harness = OrganicHarness(core, journal, authorize=lambda *_: True)
        manager = FrontRelationEpisodeManager(
            closure_evaluator,
            scope_id=f"{flow_id}:ego/front-interaction",
        )
        committer = OrganicHistoryCommitter(core=core, archive=archive)

        preflight_frame = port_adapter.capture()
        initial_frame = int(preflight_frame.observation.epoch)
        if initial_frame != int(world.get_snapshot().frame):
            raise CoreV11InvariantError("preflight CurrentFrame is not bound to current CARLA frame")

        _, release_request_sha = build_release_request(
            run_dir=run_dir,
            flow_id=flow_id,
            attempt=attempt,
            preregistration_sha256=prereg_sha,
            experiment_source_manifest_sha256=manifest_sha,
            runtime_identity_sha256=runtime_guard.record.sha256,
            scene_manifest_sha256=_sha256_file(scene_path),
            pre_first_tick_carla_frame=initial_frame,
            pre_first_tick_tau=float(preflight_frame.tau),
            pre_first_tick_current_revision=preflight_frame.revision,
        )
        audit.event(
            "preflight_complete",
            {
                "run_id": run_id,
                "initial_carla_frame": initial_frame,
                "preregistration_sha256": prereg_sha,
                "experiment_source_manifest_sha256": manifest_sha,
                "runtime_identity_sha256": runtime_guard.record.sha256,
                "scene_manifest_sha256": _sha256_file(scene_path),
                "release_request_sha256": release_request_sha,
                "tm_command_provenance": tm_provenance,
            },
        )
        _write_status(
            status_path,
            status,
            phase="PRE_FIRST_TICK_READY",
            empirical_evidence=False,
            empirical_ticks=0,
            runtime_identity_sha256=runtime_guard.record.sha256,
            scene_manifest_sha256=_sha256_file(scene_path),
            release_request_sha256=release_request_sha,
            pre_first_tick_carla_frame=initial_frame,
            pre_first_tick_current_revision=preflight_frame.revision,
            traffic_manager_command_provenance="RECORDED_COMMAND_RETURN_WITHOUT_EXCEPTION",
            traffic_manager_runtime_readback="NOT_AVAILABLE_IN_USED_API",
        )

        release_sha = _wait_for_release(
            run_dir=run_dir,
            status_path=status_path,
            status=status,
            atomic_port=port_adapter,
            runtime_guard=runtime_guard,
            preflight_frame=preflight_frame,
            release_request_sha=release_request_sha,
            repo_root=repo_root,
        )
        audit.event(
            "pre_first_tick_release",
            {
                "release_request_sha256": release_request_sha,
                "release_token_sha256": release_sha,
                "empirical_ticks": 0,
            },
        )

        last_frame = initial_frame
        for tick_index in range(1, horizon + 1):
            audit.tick_intent(tick_index=tick_index, prior_carla_frame=last_frame)
            empirical_started = True
            if tick_index == 1:
                _write_status(
                    status_path,
                    status,
                    phase="LIVE_RUNNING",
                    empirical_evidence=True,
                    empirical_ticks=0,
                    experimental_boundary="OPEN_BEFORE_DECISION_EPOCH_1",
                    release_token_sha256=release_sha,
                )
                audit.event(
                    "experimental_boundary_open",
                    {"tick_index": 1, "prior_carla_frame": last_frame},
                )

            current_snapshot = world.get_snapshot()
            current_tau = float(current_snapshot.timestamp.elapsed_seconds)
            if int(current_snapshot.frame) != last_frame:
                raise CoreV11InvariantError("CARLA frame changed outside the registered runner")

            result = None
            realized = False
            try:
                result = harness.execute_decision_epoch(
                    port_adapter,
                    run_id=run_id,
                    subject_id=SUBJECT_ID,
                    deadline_tau=current_tau
                    + float(protocol["environment"]["fixed_delta_seconds"]),
                )
            except NoAdmissibleChoice as exc:
                audit.event(
                    "no_admissible_choice",
                    {
                        "tick_index": tick_index,
                        "carla_frame": last_frame,
                        "reason": str(exc),
                    },
                )

            if result is not None:
                if result.application_receipt.applied is not True or result.execution is None:
                    raise CoreV11InvariantError("selected decision was not atomically realized")
                evidence.record_decision(result)
                manager.begin(result)
                realized = True

            returned_frame = int(world.tick())
            if returned_frame != last_frame + 1:
                raise CoreV11InvariantError(
                    f"registered tick owner lost exclusivity: {last_frame} -> {returned_frame}"
                )
            post_frame = port_adapter.capture()
            if int(post_frame.observation.epoch) != returned_frame:
                raise CoreV11InvariantError("post-tick observation is not bound to returned frame")
            audit.tick_complete(
                tick_index=tick_index,
                carla_frame=returned_frame,
                elapsed_seconds=float(post_frame.tau),
                realized=realized,
                pending_relations_before_post=manager.pending_count,
            )
            last_frame = returned_frame

            completed = manager.observe_post(
                post_observation=post_frame.observation,
                post_tau=float(post_frame.tau),
            )
            for item in completed:
                admission = committer.admit(item, known_at_tau=float(post_frame.tau))
                evidence.record_closure_admission(item, admission)

            if tick_index == 1 or tick_index % 100 == 0 or tick_index == horizon:
                _write_status(
                    status_path,
                    status,
                    phase="LIVE_RUNNING" if tick_index < horizon else "HORIZON_REACHED",
                    empirical_evidence=True,
                    empirical_ticks=audit.tick_count(),
                    realized_decisions=audit.realized_count(),
                    pending_relations=manager.pending_count,
                    last_carla_frame=last_frame,
                )
                print(
                    f"[{run_id}] tick {tick_index}/{horizon} | "
                    f"realized={audit.realized_count()} | pending={manager.pending_count}",
                    flush=True,
                )

        horizon_snapshot = manager.observation_horizon_snapshot()
        evidence.record_horizon(horizon_snapshot)
        audit.event("observation_horizon", horizon_snapshot)
        runtime_guard.assert_current()
        verify_frozen_organic_sources(repo_root)
        _verify_experiment_manifest()
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
        )
        audit.event("valid_complete", validation)
        return run_dir

    except BaseException as exc:
        empirical_ticks = audit.tick_count()
        uncertain = audit.uncertain_tick_indices()
        _write_status(
            status_path,
            status,
            phase=(
                "PARTIAL_EMPIRICAL"
                if empirical_started or empirical_ticks > 0 or uncertain
                else "PRE_FIRST_TICK_FAIL"
            ),
            empirical_evidence=bool(empirical_started or empirical_ticks > 0 or uncertain),
            empirical_ticks=empirical_ticks,
            uncertain_tick_indices=uncertain,
            valid_complete=False,
            error_type=type(exc).__name__,
            error=str(exc),
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
                    journal.close()
                finally:
                    try:
                        archive.close()
                    finally:
                        _cleanup(world, traffic_manager, actors)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run one frozen G3 organic CARLA flow with an explicit PRE_FIRST_TICK_HOLD."
    )
    parser.add_argument("--flow", required=True, choices=[f"OF-{i:02d}" for i in range(1, 7)])
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    args = parser.parse_args(argv)
    path = run_flow(
        flow_id=args.flow,
        attempt=args.attempt,
        output_root=args.output_root,
        host=args.host,
        port=args.port,
    )
    print(f"VALID_COMPLETE: {path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
