from __future__ import annotations

import argparse
from research.g3_organic_carla_01 import gated_runner as gated
from research.g3_organic_carla_01 import live_runner as live

def prepare_existing_world(client, protocol, *, seed: int):
    env = protocol["environment"]
    client_version = str(client.get_client_version())
    server_version = str(client.get_server_version())
    if client_version != live.EXPECTED_CARLA_VERSION or server_version != live.EXPECTED_CARLA_VERSION:
        raise live.CoreV11InvariantError("CARLA version mismatch")
    if client_version != server_version:
        raise live.CoreV11InvariantError("CARLA client/server versions differ")
    world = client.get_world()
    current_map = str(world.get_map().name).rsplit("/", 1)[-1]
    required_map = str(env["map"])
    if current_map != required_map:
        raise live.CoreV11InvariantError(f"CARLA must already be on {required_map}; current={current_map}.")
    settings = world.get_settings()
    settings.synchronous_mode = True
    settings.fixed_delta_seconds = float(env["fixed_delta_seconds"])
    world.apply_settings(settings)
    tm_port = int(env["traffic_manager_port"])
    traffic_manager = client.get_trafficmanager(tm_port)
    traffic_manager.set_synchronous_mode(True)
    traffic_manager.set_random_device_seed(int(seed))
    return world, traffic_manager

def run_flow(**kwargs):
    original = gated.prepare_live_world
    gated.prepare_live_world = prepare_existing_world
    try:
        return gated.run_flow(**kwargs)
    finally:
        gated.prepare_live_world = original

def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--flow", required=True, choices=[f"OF-{i:02d}" for i in range(1, 7)])
    parser.add_argument("--attempt", type=int, required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2000)
    args = parser.parse_args(argv)
    run_flow(flow_id=args.flow, attempt=args.attempt, output_root=args.output_root, host=args.host, port=args.port)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
