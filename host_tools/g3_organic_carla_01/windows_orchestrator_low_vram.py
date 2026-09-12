from __future__ import annotations

"""Low-VRAM Windows host profile for G3-ORGANIC-CARLA-01.

Infrastructure-only wrapper around the frozen host orchestrator.
It changes only CARLA launch graphics settings before the runner starts:
CARLA Low quality + off-screen + no sound. It does not alter OASIS
semantic source, preregistration, seeds, scene policy, or empirical gates.
"""

from pathlib import Path
import subprocess
from typing import Any

from host_tools.g3_organic_carla_01 import windows_orchestrator as base

PROFILE_ID = "G3-ORGANIC-CARLA-01-LOW-VRAM-HOST"
PROFILE_VERSION = "1.0"
MANIFEST_NAME = "LOW_VRAM_HOST_MANIFEST.json"


def verify_low_vram_manifest(tool_dir: Path) -> dict:
    manifest_path = tool_dir / MANIFEST_NAME
    if not manifest_path.is_file():
        raise base.HostOrchestrationError(f"{MANIFEST_NAME} is missing")
    manifest = base._load_json(manifest_path)
    if manifest.get("profile_id") != PROFILE_ID:
        raise base.HostOrchestrationError("unexpected low-VRAM profile_id")
    if manifest.get("profile_version") != PROFILE_VERSION:
        raise base.HostOrchestrationError("low-VRAM profile version mismatch")
    if manifest.get("semantic_source_mutation") is not False:
        raise base.HostOrchestrationError(
            "low-VRAM profile must declare semantic_source_mutation=false"
        )
    expected = manifest.get("source_sha256", {})
    for name, expected_hash in sorted(expected.items()):
        path = tool_dir / str(name)
        if not path.is_file():
            raise base.HostOrchestrationError(f"missing frozen low-VRAM host file: {name}")
        actual = base._sha256(path)
        if actual != str(expected_hash):
            raise base.HostOrchestrationError(
                f"low-VRAM host hash mismatch for {name}: {actual} != {expected_hash}"
            )
    return manifest


def start_carla_low_vram(
    carla_exe: Path, port: int, log_path: Path
) -> tuple[subprocess.Popen[Any], Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open("wb")
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    command = [
        str(carla_exe),
        f"-carla-port={int(port)}",
        "-quality-level=Low",
        "-RenderOffScreen",
        "-nosound",
    ]
    process = subprocess.Popen(
        command,
        cwd=str(carla_exe.parent),
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    return process, log_handle


def main(argv: list[str] | None = None) -> int:
    tool_dir = Path(__file__).resolve().parent
    verify_low_vram_manifest(tool_dir)
    base.start_carla = start_carla_low_vram
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
