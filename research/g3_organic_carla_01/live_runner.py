from __future__ import annotations

import argparse
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import random
import shutil
import time
from typing import Any

from research.choice_responsibility_v01.integration import NoAdmissibleChoice
from research.g3_organic_carla_01.protocol import (
    PREREGISTRATION_PATH,
    flow_spec,
    load_preregistration,
    preregistration_sha256,
    verify_frozen_organic_sources,
)
from research.g3_organic_carla_01.run_audit import RunAuditLedger
from research.g3_organic_flow_v1.carla_atomic_port import OrganicCARLAAtomicPort
from research.g3_organic_flow_v1.core import OrganicIntegratedChoiceCore
from research.g3_organic_flow_v1.history import (
    FrontRelationEpisodeManager,
    OrganicHistoryCommitter,
)
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
)
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_organic_flow_v1.runtime_freeze import OrganicRuntimeIdentityGuard
from research.integration_checkpoint.frame import V12ResponsibilityEvidenceAdapter
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.process_archive import ProcessArchive
from research.oasis_core_v12.runtime import ExecutionJournal

PROTOCOL_ID = "G3-ORGANIC-CARLA-01"
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


def _four_wheel_vehicle_ids(blueprint_library: Any) -> list[str]:
    result: list[str] = []
    for blueprint in blueprint_library.filter("vehicle.*"):
        try:
            if blueprint.has_attribute("number_of_wheels"):
                wheels = int(blueprint.get_attribute("number_of_wheels").as_int())
                if wheels != 4:
                    continue
        except Exception:
            continue
        result.append(str(blueprint.id))
    result = sorted(set(result))
    if not result:
        raise CoreV11InvariantError("no four-wheel CARLA vehicle blueprints are available")
    return result


def build_scene_plan(world: Any, *, seed: int, npc_count: int) -> dict:
    spawn_points = list(world.get_map().get_spawn_points())
    required = 1 + int(npc_count)
    if len(spawn_points) < required:
        raise CoreV11InvariantError(
            f"insufficient CARLA spawn points: {len(spawn_points)} < {required}"
        )
    library = world.get_blueprint_library()
    vehicle_ids = _four_wheel_vehicle_ids(library)
    preferred = ["vehicle.tesla.model3", "vehicle.lincoln.mkz_2020"]
    ego_blueprint = next((item for item in preferred if item in vehicle_ids), vehicle_ids[0])

    rng = random.Random(int(seed))
    indices = list(range(len(spawn_points)))
    rng.shuffle(indices)
    selected = indices[:required]
    npc_blueprints = [rng.choice(vehicle_ids) for _ in range(int(npc_count))]
    return {
        "algorithm": "deterministic_preplanned_spawn_v1",
        "seed": int(seed),
        "ego": {
            "blueprint": ego_blueprint,
            "spawn_index": int(selected[0]),
        },
        "npcs": [
            {
                "ordinal": i + 1,
                "blueprint": npc_blueprints[i],
                "spawn_index": int(selected[i + 1]),
            }
            for i in range(int(npc_count))
        ],
        "substitution_after_spawn_failure": False,
    }


def _blueprint_for_role(library: Any, blueprint_id: str, role_name: str):
    blueprint = library.find(blueprint_id)
    try:
        if blueprint.has_attribute("role_name"):
            blueprint.set_attribute("role_name", role_name)
    except Exception:
        pass
    return blueprint


def spawn_scene(world: Any, *, plan: dict, tm_port: int) -> tuple[Any, list[Any]]:
    library = world.get_blueprint_library()
    spawn_points = list(world.get_map().get_spawn_points())
    spawned: list[Any] = []
    try:
        ego_spec = plan["ego"]
        ego = world.try_spawn_actor(
            _blueprint_for_role(library, ego_spec["blueprint"], "oasis-ego"),
            spawn_points[int(ego_spec["spawn_index"])],
        )
        if ego is None:
            raise CoreV11InvariantError("planned ego spawn failed before experimental tick 1")
        spawned.append(ego)

        for item in plan["npcs"]:
            actor = world.try_spawn_actor(
                _blueprint_for_role(
                    library,
                    item["blueprint"],
                    f"oasis-npc-{int(item['ordinal']):02d}",
                ),
                spawn_points[int(item["spawn_index"])],
            )
            if actor is None:
                raise CoreV11InvariantError(
                    f"planned NPC spawn failed before tick 1: ordinal={item['ordinal']}"
                )
            actor.set_autopilot(True, int(tm_port))
            spawned.append(actor)
        return ego, spawned
    except Exception:
        for actor in reversed(spawned):
            try:
                actor.destroy()
            except Exception:
                pass
        raise


def _find_target_map(client: Any, target_short_name: str) -> str:
    maps = list(client.get_available_maps())
    matches = [item for item in maps if str(item).rsplit("/", 1)[-1] == target_short_name]
    if not matches:
        raise CoreV11InvariantError(f"required CARLA map is unavailable: {target_short_name}")
    return str(sorted(matches)[0])


def _load_world_once(client: Any, *, target_short_name: str, wait_seconds: float = 120.0):
    """Issue exactly one pre-experimental load request, then only poll/reacquire."""
    target = _find_target_map(client, target_short_name)
    load_error: Exception | None = None
    try:
        client.set_timeout(120.0)
        client.load_world(target, reset_settings=False)
    except Exception as exc:
        load_error = exc

    deadline = time.monotonic() + float(wait_seconds)
    client.set_timeout(20.0)
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            world = client.get_world()
            current = str(world.get_map().name).rsplit("/", 1)[-1]
            if current == target_short_name:
                return world
        except Exception as exc:
            last_error = exc
        time.sleep(2.0)
    if load_error is not None:
        raise CoreV11InvariantError(
            f"single CARLA load request did not yield target world: {load_error}"
        ) from load_error
    raise CoreV11InvariantError(
        f"target CARLA world was not reacquired after one load request: {last_error}"
    )


def prepare_live_world(client: Any, protocol: dict, *, seed: int):
    env = protocol["environment"]
    client_version = str(client.get_client_version())
    server_version = str(client.get_server_version())
    if client_version != EXPECTED_CARLA_VERSION or server_version != EXPECTED_CARLA_VERSION:
        raise CoreV11InvariantError(
            f"CARLA version must be {EXPECTED_CARLA_VERSION}, got client={client_version!r}, server={server_version!r}"
        )
    if client_version != server_version:
        raise CoreV11InvariantError("CARLA client/server versions differ")

    world = _load_world_once(client, target_short_name=str(env["map"]))
    settings = world.get_settings()
    # no_rendering_mode is intentionally not assigned here. The current boolean is
    # captured and frozen as part of the registered runtime identity.
    settings.synchronous_mode = True
    settings.fixed_delta_seconds = float(env["fixed_delta_seconds"])
    world.apply_settings(settings)

    tm_port = int(env["traffic_manager_port"])
    traffic_manager = client.get_trafficmanager(tm_port)
    traffic_manager.set_synchronous_mode(True)
    traffic_manager.set_random_device_seed(int(seed))
    return world, traffic_manager


def build_organic_core():
    base_bundle = build_domain_bundle()
    base = base_bundle.core
    core = OrganicIntegratedChoiceCore(
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


def _cleanup(world: Any | None, traffic_manager: Any | None, actors: list[Any]) -> None:
    for actor in reversed(actors):
        try:
            actor.destroy()
        except Exception:
            pass
    if traffic_manager is not None:
        try:
            traffic_manager.set_synchronous_mode(False)
        except Exception:
            pass
    if world is not None:
        try:
            settings = world.get_settings()
            settings.synchronous_mode = False
            settings.fixed_delta_seconds = None
            world.apply_settings(settings)
        except Exception:
            pass


def run_flow(
    *,
    flow_id: str,
    attempt: int,
    output_root: str | Path,
    host: str,
    port: int,
) -> Path:
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
    _write_status(status_path, status, phase="PREFLIGHT")

    audit = RunAuditLedger(run_dir / "run_audit.sqlite")
    evidence = OrganicEvidenceLedger(str(run_dir / "organic_evidence.sqlite"))
    execution_journal = ExecutionJournal(str(run_dir / "execution_journal.sqlite"))
    archive = ProcessArchive(str(run_dir / "process_archive.sqlite"))

    world = None
    traffic_manager = None
    actors: list[Any] = []
    empirical_started = False
    runtime_guard = None
    manager = None
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
        harness = OrganicHarness(core, execution_journal, authorize=lambda *_: True)
        manager = FrontRelationEpisodeManager(
            closure_evaluator,
            scope_id=f"{flow_id}:ego/front-interaction",
        )
        committer = OrganicHistoryCommitter(core=core, archive=archive)

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
                evidence.record_decision(result)
                manager.begin(result)
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
            if completed:
                audit.event(
                    "relation_closure_admission",
                    {
                        "tick_index": tick_index,
                        "carla_frame": returned_frame,
                        "closed_processes": len(completed),
                        "pending_after": manager.pending_count,
                    },
                )

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
                    f"[{run_id}] tick {tick_index}/{horizon} | realized={audit.realized_count()} | pending={manager.pending_count}",
                    flush=True,
                )

        horizon_snapshot = manager.observation_horizon_snapshot()
        evidence.record_horizon(horizon_snapshot)
        audit.event("observation_horizon", horizon_snapshot)
        runtime_guard.assert_current()
        verify_frozen_organic_sources(repo_root)
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
                        archive.close()
                    finally:
                        _cleanup(world, traffic_manager, actors)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one preregistered G3 organic CARLA flow.")
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
