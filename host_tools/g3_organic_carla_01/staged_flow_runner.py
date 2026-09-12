from __future__ import annotations

"""Infrastructure-only staged preflight runner.

All pre-first-tick stabilization waits are fixed at exactly 5 seconds.
No OASIS decision semantics, preregistered seeds, scene policy, or empirical
boundary semantics are changed.
"""

import argparse
import time
from typing import Any

from research.g3_organic_carla_01 import gated_runner as gated
from research.g3_organic_carla_01 import live_runner as live

STAGE_DELAY_SECONDS = 5.0


def _delay() -> None:
    time.sleep(STAGE_DELAY_SECONDS)


def prepare_live_world_staged(client: Any, protocol: dict, *, seed: int):
    env = protocol["environment"]
    client_version = str(client.get_client_version())
    server_version = str(client.get_server_version())
    if client_version != live.EXPECTED_CARLA_VERSION or server_version != live.EXPECTED_CARLA_VERSION:
        raise live.CoreV11InvariantError(
            f"CARLA version must be {live.EXPECTED_CARLA_VERSION}, "
            f"got client={client_version!r}, server={server_version!r}"
        )
    if client_version != server_version:
        raise live.CoreV11InvariantError("CARLA client/server versions differ")
    _delay()

    world = live._load_world_once(client, target_short_name=str(env["map"]))
    _delay()

    settings = world.get_settings()
    settings.synchronous_mode = True
    settings.fixed_delta_seconds = float(env["fixed_delta_seconds"])
    world.apply_settings(settings)
    _delay()

    tm_port = int(env["traffic_manager_port"])
    traffic_manager = client.get_trafficmanager(tm_port)
    traffic_manager.set_synchronous_mode(True)
    traffic_manager.set_random_device_seed(int(seed))
    _delay()
    return world, traffic_manager


def spawn_scene_staged(world: Any, *, plan: dict, tm_port: int):
    result = live.spawn_scene(world, plan=plan, tm_port=tm_port)
    _delay()
    return result


def run_flow(**kwargs):
    original_prepare = gated.prepare_live_world
    original_spawn = gated.spawn_scene
    gated.prepare_live_world = prepare_live_world_staged
    gated.spawn_scene = spawn_scene_staged
    try:
        return gated.run_flow(**kwargs)
    finally:
        gated.prepare_live_world = original_prepare
        gated.spawn_scene = original_spawn


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run one G3 organic CARLA flow with fixed 5-second preflight stage delays."
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
