from __future__ import annotations

import argparse
import json
from pathlib import Path
import time

from research.g3_realtime_split_v1 import live_runner as split
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness as _BaseHarness
from research.g3_three_layer_carla_02 import protocol
from research.g3_three_layer_carla_02.release_gate import (
    TOKEN_NAME,
    build_request,
    verify,
)

_ACTIVE = {}


def prepare_existing_world(client, registered, *, seed: int):
    env = registered["environment"]
    client_version = str(client.get_client_version())
    server_version = str(client.get_server_version())
    if client_version != split.EXPECTED_CARLA_VERSION or server_version != split.EXPECTED_CARLA_VERSION:
        raise split.CoreV11InvariantError("CARLA version mismatch")
    if client_version != server_version:
        raise split.CoreV11InvariantError("CARLA client/server versions differ")
    world = client.get_world()
    current_map = str(world.get_map().name).rsplit("/", 1)[-1]
    required_map = str(env["map"])
    if current_map != required_map:
        raise split.CoreV11InvariantError(
            f"CARLA must already be on {required_map}; current={current_map}"
        )
    settings = world.get_settings()
    settings.synchronous_mode = True
    settings.fixed_delta_seconds = float(env["fixed_delta_seconds"])
    world.apply_settings(settings)
    tm_port = int(env["traffic_manager_port"])
    traffic_manager = client.get_trafficmanager(tm_port)
    traffic_manager.set_synchronous_mode(True)
    traffic_manager.set_random_device_seed(int(seed))
    return world, traffic_manager


def _same_current(left, right) -> bool:
    return (
        int(left.observation.epoch) == int(right.observation.epoch)
        and float(left.tau) == float(right.tau)
        and left.revision == right.revision
        and left.observation == right.observation
        and left.evidence == right.evidence
    )


class GatedRealtimeOrganicHarness(_BaseHarness):
    def execute_decision_epoch(self, flow, **kwargs):
        if not _ACTIVE.get("released"):
            run_dir = Path(_ACTIVE["run_dir"])
            status_path = run_dir / "status.json"
            status = json.loads(status_path.read_text(encoding="utf-8"))
            if status.get("phase") != "PRE_FIRST_TICK_READY":
                raise RuntimeError("release gate requires PRE_FIRST_TICK_READY")
            pre = flow.capture()
            request_sha = build_request(
                run_dir=run_dir,
                flow_id=_ACTIVE["flow_id"],
                attempt=_ACTIVE["attempt"],
                prereg_sha=protocol.preregistration_sha256(),
                source_hashes=split.candidate_source_hashes(),
                runtime_identity_sha=str(status["runtime_identity_sha256"]),
                scene_manifest_sha=str(status["scene_manifest_sha256"]),
                frame=int(pre.observation.epoch),
                tau=float(pre.tau),
                revision=pre.revision,
            )
            status["release_request_sha256"] = request_sha
            status["pre_first_tick_carla_frame"] = int(pre.observation.epoch)
            status["pre_first_tick_current_revision"] = pre.revision
            split._atomic_json(status_path, status)
            print("[PRE_FIRST_TICK_HOLD] empirical_evidence=false, empirical_ticks=0", flush=True)
            print("[PRE_FIRST_TICK_HOLD] Run the approval command in a second terminal.", flush=True)
            token_path = run_dir / TOKEN_NAME
            expected_sources = split.candidate_source_hashes()
            while not token_path.exists():
                if split.candidate_source_hashes() != expected_sources:
                    raise RuntimeError("candidate source changed during pre-first-tick hold")
                current = flow.capture()
                if not _same_current(pre, current):
                    raise RuntimeError("CARLA current state changed during pre-first-tick hold")
                time.sleep(1.0)
            verify(run_dir, expected_request_sha=request_sha)
            if split.candidate_source_hashes() != expected_sources:
                raise RuntimeError("candidate source changed before release")
            if not _same_current(pre, flow.capture()):
                raise RuntimeError("CARLA current state changed immediately before release")
            boundary = {
                "protocol_id": protocol.PROTOCOL_ID,
                "flow_id": _ACTIVE["flow_id"],
                "attempt": _ACTIVE["attempt"],
                "release_request_sha256": request_sha,
                "empirical_boundary": "OPEN_BEFORE_DECISION_EPOCH_1",
                "carla_frame": int(pre.observation.epoch),
                "tau": float(pre.tau),
                "revision": pre.revision,
            }
            split._atomic_json(run_dir / "EXPERIMENTAL_BOUNDARY_OPEN.json", boundary)
            _ACTIVE["released"] = True
        return super().execute_decision_epoch(flow, **kwargs)


def _status_base(*, flow_id: str, attempt: int, seed: int, prereg_sha: str) -> dict:
    return {
        "protocol_id": protocol.PROTOCOL_ID,
        "flow_id": flow_id,
        "attempt": int(attempt),
        "seed": int(seed),
        "phase": "REGISTERED",
        "empirical_evidence": False,
        "empirical_ticks": 0,
        "planned_horizon_ticks": 5000,
        "preregistration_sha256": prereg_sha,
        "valid_complete": False,
    }


def run_flow(*, flow_id: str, attempt: int, output_root: str | Path, host: str, port: int):
    if flow_id != "TL-Q01":
        raise ValueError("this preregistration contains only TL-Q01")
    if int(attempt) < 1:
        raise ValueError("attempt must be >= 1")
    run_dir = Path(output_root) / protocol.PROTOCOL_ID / f"{flow_id}-A{int(attempt)}"
    if any(part.upper() == "OF-01-A6" for part in run_dir.resolve().parts):
        raise RuntimeError("preserved OF-01-A6 path is forbidden")
    _ACTIVE.clear()
    _ACTIVE.update(run_dir=str(run_dir), flow_id=flow_id, attempt=int(attempt), released=False)

    originals = {
        "PROTOCOL_ID": split.PROTOCOL_ID,
        "PREREGISTRATION_PATH": split.PREREGISTRATION_PATH,
        "load_preregistration": split.load_preregistration,
        "flow_spec": split.flow_spec,
        "preregistration_sha256": split.preregistration_sha256,
        "prepare_live_world": split.prepare_live_world,
        "RealtimeOrganicHarness": split.RealtimeOrganicHarness,
        "_status_base": split._status_base,
    }
    split.PROTOCOL_ID = protocol.PROTOCOL_ID
    split.PREREGISTRATION_PATH = protocol.PREREGISTRATION_PATH
    split.load_preregistration = protocol.load_preregistration
    split.flow_spec = protocol.flow_spec
    split.preregistration_sha256 = protocol.preregistration_sha256
    split.prepare_live_world = prepare_existing_world
    split.RealtimeOrganicHarness = GatedRealtimeOrganicHarness
    split._status_base = _status_base
    try:
        return split.run_flow(
            flow_id=flow_id,
            attempt=int(attempt),
            output_root=output_root,
            host=host,
            port=int(port),
        )
    finally:
        for name, value in originals.items():
            setattr(split, name, value)
        _ACTIVE.clear()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--flow", default="TL-Q01", choices=["TL-Q01"])
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    args = parser.parse_args(argv)
    path = run_flow(flow_id=args.flow, attempt=args.attempt, output_root=args.output_root,
                    host=args.host, port=args.port)
    print(f"RUN_COMPLETE: {path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
