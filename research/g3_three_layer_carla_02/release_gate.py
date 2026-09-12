from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path

PROTOCOL_ID = "G3-THREE-LAYER-CARLA-02"
REQUEST_NAME = "PRE_FIRST_TICK_RELEASE_REQUEST.json"
TOKEN_NAME = "PRE_FIRST_TICK_RELEASE.json"
STATUS_NAME = "status.json"


def _canonical(payload: dict) -> bytes:
    return (json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")


def _write_new(path: Path, payload: dict) -> None:
    if path.exists():
        raise RuntimeError(f"gate file already exists: {path}")
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(_canonical(payload))
    tmp.replace(path)


def file_sha256(path: str | Path) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()


def build_request(*, run_dir: str | Path, flow_id: str, attempt: int, prereg_sha: str,
                  source_hashes: dict, runtime_identity_sha: str, scene_manifest_sha: str,
                  frame: int, tau: float, revision: str) -> str:
    payload = {
        "protocol_id": PROTOCOL_ID,
        "flow_id": flow_id,
        "attempt": int(attempt),
        "empirical_evidence": False,
        "authorization_scope": "START_DECISION_EPOCH_1_ONLY",
        "preregistration_sha256": prereg_sha,
        "candidate_source_sha256": dict(source_hashes),
        "runtime_identity_sha256": runtime_identity_sha,
        "scene_manifest_sha256": scene_manifest_sha,
        "pre_first_tick_carla_frame": int(frame),
        "pre_first_tick_tau": float(tau),
        "pre_first_tick_current_revision": revision,
    }
    path = Path(run_dir) / REQUEST_NAME
    _write_new(path, payload)
    return file_sha256(path)


def authorize(run_dir: str | Path, *, approve: bool) -> Path:
    if approve is not True:
        raise RuntimeError("explicit --approve is required")
    root = Path(run_dir)
    status = json.loads((root / STATUS_NAME).read_text(encoding="utf-8"))
    if status.get("protocol_id") != PROTOCOL_ID or status.get("phase") != "PRE_FIRST_TICK_READY":
        raise RuntimeError("run is not PRE_FIRST_TICK_READY")
    if status.get("empirical_evidence") is not False or int(status.get("empirical_ticks", -1)) != 0:
        raise RuntimeError("release requires zero empirical ticks")
    request_path = root / REQUEST_NAME
    request = json.loads(request_path.read_text(encoding="utf-8"))
    request_sha = file_sha256(request_path)
    if request_sha != status.get("release_request_sha256"):
        raise RuntimeError("release request/status binding mismatch")
    token = {
        "protocol_id": PROTOCOL_ID,
        "flow_id": request["flow_id"],
        "attempt": request["attempt"],
        "release_request_sha256": request_sha,
        "explicit_operator_action": True,
        "empirical_evidence": False,
    }
    token_path = root / TOKEN_NAME
    _write_new(token_path, token)
    return token_path


def verify(run_dir: str | Path, *, expected_request_sha: str) -> dict:
    root = Path(run_dir)
    request_path = root / REQUEST_NAME
    if file_sha256(request_path) != expected_request_sha:
        raise RuntimeError("release request changed")
    token = json.loads((root / TOKEN_NAME).read_text(encoding="utf-8"))
    if token.get("protocol_id") != PROTOCOL_ID or token.get("explicit_operator_action") is not True:
        raise RuntimeError("invalid release token")
    if token.get("release_request_sha256") != expected_request_sha:
        raise RuntimeError("release token/request mismatch")
    return token


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--approve", action="store_true")
    args = parser.parse_args(argv)
    path = authorize(args.run_dir, approve=args.approve)
    print(f"PRE_FIRST_TICK_RELEASE_CREATED: {path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
