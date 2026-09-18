from __future__ import annotations

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import shutil

from research.choice_responsibility_v01.integration import NoAdmissibleChoice
from research.g3_organic_carla_01.protocol import (
    PREREGISTRATION_PATH,
    flow_spec,
    load_preregistration,
    verify_frozen_organic_sources,
)
from research.g3_organic_carla_01.live_runner import (
    build_scene_plan,
    spawn_scene,
    _cleanup,
)
from research.g3_organic_carla_01.run_audit import RunAuditLedger
from research.g3_organic_flow_v1.carla_atomic_port import OrganicCARLAAtomicPort
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
)
from research.g3_organic_flow_v1.runtime_freeze import OrganicRuntimeIdentityGuard
from research.integration_checkpoint.frame import V12ResponsibilityEvidenceAdapter
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.runtime import ExecutionJournal
from research.g3_realtime_split_v1.core import EpochSnapshotOrganicCore
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness
from research.g3_realtime_split_v1.worker import DeferredRelationWorker


PROTOCOL_ID = "GOVERNANCE-CBRA-CARLA-SMOKE-V1"
SUBJECT_ID = "ego"
EXPECTED_CARLA_VERSION = "0.9.16"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def build_smoke_core():
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


def run_smoke(
    *,
    output_root: str | Path,
    host: str,
    port: int,
    ticks: int = 200,
    npc_count: int = 2,
    flow_id: str = "OF-01",
) -> Path:
    if ticks < 1 or ticks > 1000:
        raise ValueError("smoke ticks must be in [1, 1000]")
    if npc_count < 0 or npc_count > 4:
        raise ValueError("smoke npc_count must be in [0, 4]")

    repo_root = _repo_root()
    verify_frozen_organic_sources(repo_root)

    protocol = load_preregistration()
    spec = flow_spec(protocol, flow_id)
    seed = int(spec["seed"])

    # Non-evidence smoke override. The scientific preregistration is not modified.
    smoke_protocol = json.loads(json.dumps(protocol))
    smoke_protocol["environment"]["npc_count"] = int(npc_count)
    smoke_protocol["environment"]["planned_horizon_ticks_per_flow"] = int(ticks)

    run_dir = Path(output_root) / PROTOCOL_ID
    if run_dir.exists():
        raise CoreV11InvariantError(f"smoke output already exists: {run_dir}")
    run_dir.mkdir(parents=True, exist_ok=False)
    shutil.copy2(PREREGISTRATION_PATH, run_dir / PREREGISTRATION_PATH.name)

    _atomic_json(run_dir / "SMOKE_METADATA.json", {
        "protocol_id": PROTOCOL_ID,
        "scientific_evidence": False,
        "purpose": "short runtime-path and memory-stability smoke test",
        "ticks": int(ticks),
        "npc_count": int(npc_count),
        "flow_id": flow_id,
        "seed": seed,
        "source_preregistration_unchanged": True,
        "claim_boundary": "NOT PILOT EVIDENCE; NOT CONFIRMATORY",
    })

    audit = RunAuditLedger(run_dir / "run_audit.sqlite")
    evidence = OrganicEvidenceLedger(str(run_dir / "organic_evidence.sqlite"))
    execution_journal = ExecutionJournal(str(run_dir / "execution_journal.sqlite"))

    world = None
    traffic_manager = None
    actors = []
    relation_worker = None
    runtime_guard = None

    try:
        import carla  # type: ignore

        client = carla.Client(str(host), int(port))
        client.set_timeout(30.0)

        # Smoke runs must never reload an already-correct world. The canonical
        # preregistered runner deliberately issues a pre-first-tick load_world(),
        # but on constrained Windows GPUs that reload can allocate rendering
        # resources before no_rendering_mode is re-applied. For this diagnostic
        # smoke path we bind to the current host world and fail closed if it is
        # not already the frozen map.
        client_version = str(client.get_client_version())
        server_version = str(client.get_server_version())
        if client_version != EXPECTED_CARLA_VERSION or server_version != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError(
                f"CARLA version must be {EXPECTED_CARLA_VERSION}, "
                f"got client={client_version!r}, server={server_version!r}"
            )
        if client_version != server_version:
            raise CoreV11InvariantError("CARLA client/server versions differ")

        world = client.get_world()
        current_map = str(world.get_map().name).rsplit("/", 1)[-1]
        expected_map = str(smoke_protocol["environment"]["map"])
        if current_map != expected_map:
            raise CoreV11InvariantError(
                f"smoke runner will not reload CARLA world: expected {expected_map}, got {current_map}"
            )

        settings = world.get_settings()
        settings.synchronous_mode = True
        settings.fixed_delta_seconds = float(smoke_protocol["environment"]["fixed_delta_seconds"])
        settings.no_rendering_mode = True
        world.apply_settings(settings)

        tm_port = int(smoke_protocol["environment"]["traffic_manager_port"])
        traffic_manager = client.get_trafficmanager(tm_port)
        traffic_manager.set_synchronous_mode(True)
        traffic_manager.set_random_device_seed(seed)

        settings = world.get_settings()
        if settings.no_rendering_mode is not True:
            raise CoreV11InvariantError("smoke runner requires CARLA no_rendering_mode=True")

        plan = build_scene_plan(world, seed=seed, npc_count=npc_count)
        ego, actors = spawn_scene(world, plan=plan, tm_port=int(smoke_protocol["environment"]["traffic_manager_port"]))
        if len(actors) != 1 + npc_count:
            raise CoreV11InvariantError("smoke scene actor cardinality mismatch")

        runtime_guard = OrganicRuntimeIdentityGuard(
            client=client,
            world=world,
            output_path=run_dir / "runtime_identity.json",
        )
        identity = runtime_guard.assert_current()
        if str(identity.get("carla_client_version")) != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError("unexpected CARLA client version")
        if str(identity.get("carla_server_version")) != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError("unexpected CARLA server version")
        if identity.get("no_rendering_mode") is not True:
            raise CoreV11InvariantError("runtime identity lost no_rendering_mode=True")

        core, closure_evaluator = build_smoke_core()
        atomic_port = OrganicCARLAAtomicPort(
            world=world,
            ego_actor=ego,
            runtime_guard=runtime_guard,
        )
        relation_worker = DeferredRelationWorker(
            core=core,
            closure_evaluator=closure_evaluator,
            scope_id=f"SMOKE:{flow_id}:ego/front-interaction",
            archive_path=run_dir / "process_archive.sqlite",
            evidence_path=run_dir / "relation_experience_evidence.sqlite",
            trace_path=run_dir / "relation_experience_trace.jsonl",
        )
        relation_worker.start()
        harness = RealtimeOrganicHarness(
            core,
            execution_journal,
            authorize=lambda *_: True,
            worker=relation_worker,
        )

        last_frame = int(world.get_snapshot().frame)
        for tick_index in range(1, ticks + 1):
            relation_worker.publish_available()
            current = world.get_snapshot()
            if int(current.frame) != last_frame:
                raise CoreV11InvariantError("CARLA frame changed outside registered smoke runner")

            realized = False
            try:
                result = harness.execute_decision_epoch(
                    atomic_port,
                    run_id=f"{PROTOCOL_ID}:{flow_id}",
                    subject_id=SUBJECT_ID,
                    deadline_tau=float(current.timestamp.elapsed_seconds) + 0.05,
                )
            except NoAdmissibleChoice:
                result = None

            if result is not None:
                if result.application_receipt.applied is not True or result.execution is None:
                    raise CoreV11InvariantError("smoke decision was not atomically realized")
                realized = True

            audit.tick_intent(tick_index=tick_index, prior_carla_frame=last_frame)
            returned_frame = int(world.tick())
            if returned_frame != last_frame + 1:
                raise CoreV11InvariantError(
                    f"registered smoke tick owner lost exclusivity: {last_frame}->{returned_frame}"
                )
            post_frame = atomic_port.capture()
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
                raise CoreV11InvariantError("smoke relation/validation worker degraded")

            if tick_index == 1 or tick_index % 25 == 0 or tick_index == ticks:
                h = relation_worker.health()
                print(
                    f"[SMOKE] tick {tick_index}/{ticks} | realized={audit.realized_count()} "
                    f"| pending={h.pending_relation_processes} | validation_backlog={h.validation_backlog} "
                    f"| relation_backlog={h.relation_backlog}",
                    flush=True,
                )

        health = relation_worker.drain(timeout=30.0)
        if health.degraded:
            raise CoreV11InvariantError(f"smoke worker degraded: {asdict(health)}")
        final_health = relation_worker.close(timeout=30.0)
        validation = audit.validate_tick_sequence(ticks)
        runtime_guard.assert_current()
        verify_frozen_organic_sources(repo_root)

        result = {
            "status": "SMOKE_PASS",
            "scientific_evidence": False,
            "ticks": ticks,
            "npc_count": npc_count,
            "realized_decisions": validation["realized"],
            "first_frame": validation["first_frame"],
            "last_frame": validation["last_frame"],
            "worker_health": asdict(final_health),
            "claim_boundary": "NOT PILOT EVIDENCE; NOT CONFIRMATORY",
        }
        _atomic_json(run_dir / "SMOKE_RESULT.json", result)
        print("SMOKE_PASS", run_dir, flush=True)
        return run_dir

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
                            relation_worker.close(timeout=5.0)
                    finally:
                        _cleanup(world, traffic_manager, actors)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Short non-evidence Governance OASIS CARLA smoke run")
    parser.add_argument("--output-root", default="./runs/carla-pilot-smoke")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    parser.add_argument("--ticks", type=int, default=200)
    parser.add_argument("--npc-count", type=int, default=2)
    parser.add_argument("--flow", default="OF-01", choices=[f"OF-{i:02d}" for i in range(1, 7)])
    args = parser.parse_args(argv)
    run_smoke(
        output_root=args.output_root,
        host=args.host,
        port=args.port,
        ticks=args.ticks,
        npc_count=args.npc_count,
        flow_id=args.flow,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
