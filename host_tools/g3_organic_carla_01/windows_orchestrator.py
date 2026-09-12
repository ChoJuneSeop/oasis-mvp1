from __future__ import annotations

"""Windows host orchestrator for G3-ORGANIC-CARLA-01.

This file is infrastructure-only. It does not inspect or alter OASIS outcome
semantics. It owns the CARLA process, prepares a fixed no-rendering host state
without advancing the world, launches the frozen experiment entrypoint, waits
for PRE_FIRST_TICK_READY, requires an explicit operator phrase, and then calls
the release gate.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from typing import Any

PROTOCOL_ID = "G3-ORGANIC-CARLA-01"
EXPECTED_CARLA_VERSION = "0.9.16"
ORCHESTRATOR_VERSION = "1.0"
APPROVAL_PHRASE = "START TICK 1"
DEFAULT_CARLA_ROOT = r"C:\CARLA_0.9.16"
DEFAULT_REPO_ROOT = r"C:\CARLA_0.9.16\oasis-mvp1"
DEFAULT_OUTPUT_ROOT = r"C:\OASIS_G3_ORGANIC_OUTPUT"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 2000
READY_TIMEOUT_SECONDS = 300.0
SERVER_TIMEOUT_SECONDS = 180.0
POLL_SECONDS = 1.0


class HostOrchestrationError(RuntimeError):
    pass


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def run_dir_for(output_root: Path, flow: str, attempt: int) -> Path:
    return output_root / PROTOCOL_ID / f"{flow}-A{int(attempt)}"


def ensure_port_free(host: str, port: int) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        if sock.connect_ex((host, int(port))) == 0:
            raise HostOrchestrationError(
                f"CARLA RPC port {host}:{port} is already in use; refuse to attach to an unowned process"
            )


def verify_host_manifest(tool_dir: Path) -> dict[str, Any]:
    manifest_path = tool_dir / "HOST_ORCHESTRATOR_MANIFEST.json"
    if not manifest_path.is_file():
        raise HostOrchestrationError("HOST_ORCHESTRATOR_MANIFEST.json is missing")
    manifest = _load_json(manifest_path)
    if manifest.get("protocol_id") != PROTOCOL_ID:
        raise HostOrchestrationError("unexpected host manifest protocol_id")
    if manifest.get("orchestrator_version") != ORCHESTRATOR_VERSION:
        raise HostOrchestrationError("host manifest/orchestrator version mismatch")
    if manifest.get("semantic_source_mutation") is not False:
        raise HostOrchestrationError("host manifest must declare semantic_source_mutation=false")
    expected = manifest.get("source_sha256", {})
    for name, expected_hash in sorted(expected.items()):
        path = tool_dir / str(name)
        if not path.is_file():
            raise HostOrchestrationError(f"missing frozen host file: {name}")
        actual = _sha256(path)
        if actual != str(expected_hash):
            raise HostOrchestrationError(
                f"host tool hash mismatch for {name}: {actual} != {expected_hash}"
            )
    return manifest


def verify_local_inputs(carla_root: Path, repo_root: Path, output_root: Path, flow: str, attempt: int) -> Path:
    if os.name != "nt":
        raise HostOrchestrationError("this host orchestrator is for Windows only")
    carla_exe = carla_root / "CarlaUE4.exe"
    if not carla_exe.is_file():
        raise HostOrchestrationError(f"CarlaUE4.exe not found: {carla_exe}")
    package = repo_root / "research" / "g3_organic_carla_01"
    if not package.is_dir():
        raise HostOrchestrationError(f"G3 experiment package not found: {package}")
    if flow not in {f"OF-{i:02d}" for i in range(1, 7)}:
        raise HostOrchestrationError(f"invalid preregistered flow: {flow}")
    if int(attempt) < 1:
        raise HostOrchestrationError("attempt must be >= 1")
    run_dir = run_dir_for(output_root, flow, attempt)
    if run_dir.exists():
        raise HostOrchestrationError(
            f"run directory already exists; never resume/overwrite: {run_dir}"
        )
    return carla_exe


def python_env(repo_root: Path) -> dict[str, str]:
    env = dict(os.environ)
    previous = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = str(repo_root) if not previous else str(repo_root) + os.pathsep + previous
    return env


def wait_for_carla(host: str, port: int, timeout_seconds: float) -> tuple[Any, Any]:
    try:
        import carla  # type: ignore
    except Exception as exc:
        raise HostOrchestrationError(
            "CARLA Python API is unavailable in the Python used by the host orchestrator"
        ) from exc

    deadline = time.monotonic() + float(timeout_seconds)
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            client = carla.Client(str(host), int(port))
            client.set_timeout(5.0)
            client_version = str(client.get_client_version())
            server_version = str(client.get_server_version())
            if client_version != EXPECTED_CARLA_VERSION or server_version != EXPECTED_CARLA_VERSION:
                raise HostOrchestrationError(
                    f"CARLA version mismatch: client={client_version!r}, server={server_version!r}"
                )
            if client_version != server_version:
                raise HostOrchestrationError("CARLA client/server versions differ")
            return client, client.get_world()
        except HostOrchestrationError:
            raise
        except Exception as exc:
            last_error = exc
            time.sleep(POLL_SECONDS)
    raise HostOrchestrationError(f"CARLA server did not become ready: {last_error}")


def prepare_no_rendering_without_tick(world: Any) -> bool:
    settings = world.get_settings()
    settings.no_rendering_mode = True
    world.apply_settings(settings)
    verify = world.get_settings()
    if bool(verify.no_rendering_mode) is not True:
        raise HostOrchestrationError("failed to establish no_rendering_mode=true before runner start")
    return True


def start_carla(carla_exe: Path, port: int, log_path: Path) -> tuple[subprocess.Popen[Any], Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open("wb")
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    process = subprocess.Popen(
        [str(carla_exe), f"-carla-port={int(port)}", "-RenderOffScreen", "-nosound"],
        cwd=str(carla_exe.parent),
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    return process, log_handle


def terminate_owned_process(process: subprocess.Popen[Any] | None) -> None:
    if process is None or process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return
    process.terminate()


def start_frozen_runner(
    *,
    repo_root: Path,
    output_root: Path,
    flow: str,
    attempt: int,
    host: str,
    port: int,
    log_path: Path,
) -> tuple[subprocess.Popen[Any], Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = log_path.open("wb")
    cmd = [
        sys.executable,
        "-m",
        "research.g3_organic_carla_01.frozen_runner",
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
        env=python_env(repo_root),
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    return process, log_handle


def wait_for_ready(run_dir: Path, runner: subprocess.Popen[Any], timeout_seconds: float) -> dict[str, Any]:
    status_path = run_dir / "status.json"
    deadline = time.monotonic() + float(timeout_seconds)
    last_phase = None
    while time.monotonic() < deadline:
        if status_path.is_file():
            status = _load_json(status_path)
            phase = status.get("phase")
            last_phase = phase
            if phase == "PRE_FIRST_TICK_READY":
                if status.get("empirical_evidence") is not False or int(status.get("empirical_ticks", -1)) != 0:
                    raise HostOrchestrationError("READY state is contaminated by empirical evidence")
                return status
            if phase in {"PRE_FIRST_TICK_FAIL", "PARTIAL_EMPIRICAL"}:
                raise HostOrchestrationError(f"runner entered terminal failure state: {phase}")
        if runner.poll() is not None:
            raise HostOrchestrationError(
                f"frozen runner exited before PRE_FIRST_TICK_READY with code {runner.returncode}; last_phase={last_phase}"
            )
        time.sleep(POLL_SECONDS)
    raise HostOrchestrationError(f"timeout waiting for PRE_FIRST_TICK_READY; last_phase={last_phase}")


def approve_release(repo_root: Path, run_dir: Path) -> None:
    cmd = [
        sys.executable,
        "-m",
        "research.g3_organic_carla_01.release_gate",
        "--run-dir",
        str(run_dir),
        "--approve",
    ]
    completed = subprocess.run(
        cmd,
        cwd=str(repo_root),
        env=python_env(repo_root),
        check=False,
    )
    if completed.returncode != 0:
        raise HostOrchestrationError(
            f"release gate failed with exit code {completed.returncode}"
        )


def wait_for_completion(run_dir: Path, runner: subprocess.Popen[Any]) -> dict[str, Any]:
    code = runner.wait()
    status_path = run_dir / "status.json"
    if not status_path.is_file():
        raise HostOrchestrationError("runner exited without status.json")
    status = _load_json(status_path)
    if code != 0:
        raise HostOrchestrationError(
            f"runner exited with code {code}; phase={status.get('phase')}"
        )
    if status.get("phase") != "VALID_COMPLETE" or status.get("valid_complete") is not True:
        raise HostOrchestrationError(
            f"runner exited without VALID_COMPLETE: phase={status.get('phase')}"
        )
    return status


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Apply the frozen G3 organic CARLA protocol on a Windows CARLA 0.9.16 host."
    )
    parser.add_argument("--flow", default="OF-01", choices=[f"OF-{i:02d}" for i in range(1, 7)])
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--carla-root", default=DEFAULT_CARLA_ROOT)
    parser.add_argument("--repo-root", default=DEFAULT_REPO_ROOT)
    parser.add_argument("--output-root", default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args(argv)

    carla_root = Path(args.carla_root)
    repo_root = Path(args.repo_root)
    output_root = Path(args.output_root)
    flow = str(args.flow)
    attempt = int(args.attempt)
    run_dir = run_dir_for(output_root, flow, attempt)
    tool_dir = Path(__file__).resolve().parent

    verify_host_manifest(tool_dir)
    carla_exe = verify_local_inputs(carla_root, repo_root, output_root, flow, attempt)
    ensure_port_free(str(args.host), int(args.port))

    host_log_dir = output_root / "_host_logs" / f"{flow}-A{attempt}"
    if host_log_dir.exists():
        raise HostOrchestrationError(
            f"host log directory already exists; preserve prior attempt and use a new attempt id: {host_log_dir}"
        )
    host_log_dir.mkdir(parents=True, exist_ok=False)
    (host_log_dir / "host_session.json").write_text(
        json.dumps(
            {
                "protocol_id": PROTOCOL_ID,
                "orchestrator_version": ORCHESTRATOR_VERSION,
                "flow_id": flow,
                "attempt": attempt,
                "carla_root": str(carla_root),
                "repo_root": str(repo_root),
                "output_root": str(output_root),
                "owned_carla_process_only": True,
                "no_rendering_mode_commanded_before_runner": True,
                "pre_runner_world_tick_called": False,
                "explicit_release_phrase": APPROVAL_PHRASE,
            },
            sort_keys=True,
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    carla_process: subprocess.Popen[Any] | None = None
    runner_process: subprocess.Popen[Any] | None = None
    carla_log = None
    runner_log = None
    try:
        carla_process, carla_log = start_carla(
            carla_exe, int(args.port), host_log_dir / "carla_stdout.log"
        )
        _, world = wait_for_carla(str(args.host), int(args.port), SERVER_TIMEOUT_SECONDS)
        prepare_no_rendering_without_tick(world)

        runner_process, runner_log = start_frozen_runner(
            repo_root=repo_root,
            output_root=output_root,
            flow=flow,
            attempt=attempt,
            host=str(args.host),
            port=int(args.port),
            log_path=host_log_dir / "runner_stdout.log",
        )
        ready = wait_for_ready(run_dir, runner_process, READY_TIMEOUT_SECONDS)
        print("PRE_FIRST_TICK_READY", flush=True)
        print(f"run_dir={run_dir}", flush=True)
        print(f"runtime_identity_sha256={ready.get('runtime_identity_sha256')}", flush=True)
        print(f"scene_manifest_sha256={ready.get('scene_manifest_sha256')}", flush=True)
        print(f"release_request_sha256={ready.get('release_request_sha256')}", flush=True)
        print("empirical_ticks=0", flush=True)
        print(f"Type exactly: {APPROVAL_PHRASE}", flush=True)

        while True:
            typed = input("> ").strip()
            if typed == APPROVAL_PHRASE:
                break
            print("Not released. The empirical boundary remains closed.", flush=True)

        approve_release(repo_root, run_dir)
        final_status = wait_for_completion(run_dir, runner_process)
        print(
            f"VALID_COMPLETE: ticks={final_status.get('empirical_ticks')} run_dir={run_dir}",
            flush=True,
        )
        return 0
    finally:
        if runner_process is not None and runner_process.poll() is None:
            terminate_owned_process(runner_process)
        terminate_owned_process(carla_process)
        if runner_log is not None:
            runner_log.close()
        if carla_log is not None:
            carla_log.close()


if __name__ == "__main__":
    raise SystemExit(main())
