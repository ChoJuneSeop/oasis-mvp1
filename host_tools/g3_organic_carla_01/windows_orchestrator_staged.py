from __future__ import annotations

"""Staged Windows host profile for G3-ORGANIC-CARLA-01.

Every pre-first-tick host transition uses one fixed 5-second stabilization wait.
This wrapper retains the Low-VRAM CARLA launch profile and delegates OASIS
semantics to the frozen experiment code through staged_flow_runner.
"""

from pathlib import Path
import subprocess
import sys
import time
from typing import Any

from host_tools.g3_organic_carla_01 import windows_orchestrator as base
from host_tools.g3_organic_carla_01 import windows_orchestrator_low_vram as low

PROFILE_ID = "G3-ORGANIC-CARLA-01-STAGED-5S-HOST"
PROFILE_VERSION = "1.0"
MANIFEST_NAME = "STAGED_HOST_MANIFEST.json"
STAGE_DELAY_SECONDS = 5.0


def verify_staged_manifest(tool_dir: Path) -> dict:
    manifest_path = tool_dir / MANIFEST_NAME
    if not manifest_path.is_file():
        raise base.HostOrchestrationError(f"{MANIFEST_NAME} is missing")
    manifest = base._load_json(manifest_path)
    if manifest.get("profile_id") != PROFILE_ID:
        raise base.HostOrchestrationError("unexpected staged host profile_id")
    if manifest.get("profile_version") != PROFILE_VERSION:
        raise base.HostOrchestrationError("staged host profile version mismatch")
    if float(manifest.get("stage_delay_seconds", -1)) != STAGE_DELAY_SECONDS:
        raise base.HostOrchestrationError("staged host delay must be exactly 5 seconds")
    if manifest.get("semantic_source_mutation") is not False:
        raise base.HostOrchestrationError("staged host must declare semantic_source_mutation=false")
    expected = manifest.get("source_sha256", {})
    for name, expected_hash in sorted(expected.items()):
        path = tool_dir / str(name)
        if not path.is_file():
            raise base.HostOrchestrationError(f"missing frozen staged host file: {name}")
        actual = base._sha256(path)
        if actual != str(expected_hash):
            raise base.HostOrchestrationError(
                f"staged host hash mismatch for {name}: {actual} != {expected_hash}"
            )
    return manifest


def start_carla_staged(carla_exe: Path, port: int, log_path: Path):
    result = low.start_carla_low_vram(carla_exe, port, log_path)
    time.sleep(STAGE_DELAY_SECONDS)
    return result


def wait_for_carla_staged(host: str, port: int, timeout_seconds: float):
    result = _ORIGINAL_WAIT_FOR_CARLA(host, port, timeout_seconds)
    time.sleep(STAGE_DELAY_SECONDS)
    return result


def prepare_no_rendering_staged(world: Any) -> bool:
    result = _ORIGINAL_PREPARE_NO_RENDERING(world)
    time.sleep(STAGE_DELAY_SECONDS)
    return result


def start_staged_runner(
    *,
    repo_root: Path,
    output_root: Path,
    flow: str,
    attempt: int,
    host: str,
    port: int,
    log_path: Path,
):
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open("wb")
    cmd = [
        sys.executable,
        "-m",
        "host_tools.g3_organic_carla_01.staged_flow_runner",
        "--flow",
        flow,
        "--attempt",
        str(int(attempt)),
        "--output-root",
        str(output_root),
        "--host",
        host,
        "--port",
        str(int(port)),
    ]
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    process = subprocess.Popen(
        cmd,
        cwd=str(repo_root),
        env=base.python_env(repo_root),
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    return process, log_handle


_ORIGINAL_WAIT_FOR_CARLA = base.wait_for_carla
_ORIGINAL_PREPARE_NO_RENDERING = base.prepare_no_rendering_without_tick


def main(argv: list[str] | None = None) -> int:
    tool_dir = Path(__file__).resolve().parent
    low.verify_low_vram_manifest(tool_dir)
    verify_staged_manifest(tool_dir)
    base.start_carla = start_carla_staged
    base.wait_for_carla = wait_for_carla_staged
    base.prepare_no_rendering_without_tick = prepare_no_rendering_staged
    base.start_frozen_runner = start_staged_runner
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
