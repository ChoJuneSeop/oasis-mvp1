from __future__ import annotations

"""Explicit pre-first-tick release gate for G3-ORGANIC-CARLA-01.

This module never inspects OASIS outcome semantics. It only binds an explicit
operator release action to the frozen preflight identity. The live runner must
revalidate the actual CARLA frame/revision immediately before tick 1.
"""

import argparse
from hashlib import sha256
import json
from pathlib import Path

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

PROTOCOL_ID = "G3-ORGANIC-CARLA-01"
REQUEST_NAME = "PRE_FIRST_TICK_RELEASE_REQUEST.json"
TOKEN_NAME = "PRE_FIRST_TICK_RELEASE.json"
STATUS_NAME = "status.json"


def _canonical_bytes(payload: dict) -> bytes:
    return (
        json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def _atomic_write_new(path: Path, payload: dict) -> None:
    if path.exists():
        raise CoreV11InvariantError(f"release-gate file already exists: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(_canonical_bytes(payload))
    temporary.replace(path)


def file_sha256(path: str | Path) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()


def build_release_request(
    *,
    run_dir: str | Path,
    flow_id: str,
    attempt: int,
    preregistration_sha256: str,
    experiment_source_manifest_sha256: str,
    runtime_identity_sha256: str,
    scene_manifest_sha256: str,
    pre_first_tick_carla_frame: int,
    pre_first_tick_tau: float,
    pre_first_tick_current_revision: str,
) -> tuple[dict, str]:
    root = Path(run_dir)
    payload = {
        "protocol_id": PROTOCOL_ID,
        "flow_id": str(flow_id),
        "attempt": int(attempt),
        "authorization_scope": "START_TICK_1_ONLY",
        "empirical_evidence": False,
        "outcome_data_included": False,
        "preregistration_sha256": str(preregistration_sha256),
        "experiment_source_manifest_sha256": str(
            experiment_source_manifest_sha256
        ),
        "runtime_identity_sha256": str(runtime_identity_sha256),
        "scene_manifest_sha256": str(scene_manifest_sha256),
        "pre_first_tick_carla_frame": int(pre_first_tick_carla_frame),
        "pre_first_tick_tau": float(pre_first_tick_tau),
        "pre_first_tick_current_revision": str(
            pre_first_tick_current_revision
        ),
    }
    path = root / REQUEST_NAME
    _atomic_write_new(path, payload)
    return payload, file_sha256(path)


def load_release_request(run_dir: str | Path) -> tuple[dict, str]:
    path = Path(run_dir) / REQUEST_NAME
    if not path.is_file():
        raise CoreV11InvariantError("pre-first-tick release request is missing")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("protocol_id") != PROTOCOL_ID:
        raise CoreV11InvariantError("unexpected release request protocol_id")
    if payload.get("empirical_evidence") is not False:
        raise CoreV11InvariantError("release request must precede empirical evidence")
    if payload.get("outcome_data_included") is not False:
        raise CoreV11InvariantError("release request must contain no outcome data")
    if payload.get("authorization_scope") != "START_TICK_1_ONLY":
        raise CoreV11InvariantError("release request has invalid authorization scope")
    return payload, file_sha256(path)


def authorize_release(run_dir: str | Path, *, explicit_approval: bool) -> Path:
    if explicit_approval is not True:
        raise CoreV11InvariantError(
            "explicit --approve action is required to release experimental tick 1"
        )
    root = Path(run_dir)
    status_path = root / STATUS_NAME
    if not status_path.is_file():
        raise CoreV11InvariantError("status.json is missing")
    status = json.loads(status_path.read_text(encoding="utf-8"))
    if status.get("protocol_id") != PROTOCOL_ID:
        raise CoreV11InvariantError("unexpected status protocol_id")
    if status.get("phase") != "PRE_FIRST_TICK_READY":
        raise CoreV11InvariantError(
            "release is permitted only from PRE_FIRST_TICK_READY"
        )
    if status.get("empirical_evidence") is not False:
        raise CoreV11InvariantError("empirical evidence already exists")
    if int(status.get("empirical_ticks", -1)) != 0:
        raise CoreV11InvariantError("release requires empirical_ticks=0")

    request, request_sha = load_release_request(root)
    if str(status.get("release_request_sha256")) != request_sha:
        raise CoreV11InvariantError(
            "status release_request_sha256 does not match release request bytes"
        )
    if str(status.get("runtime_identity_sha256")) != str(
        request["runtime_identity_sha256"]
    ):
        raise CoreV11InvariantError("runtime identity binding mismatch")
    if str(status.get("scene_manifest_sha256")) != str(
        request["scene_manifest_sha256"]
    ):
        raise CoreV11InvariantError("scene manifest binding mismatch")

    token = {
        "protocol_id": PROTOCOL_ID,
        "flow_id": request["flow_id"],
        "attempt": int(request["attempt"]),
        "authorization_scope": "START_TICK_1_ONLY",
        "release_request_sha256": request_sha,
        "explicit_operator_action": True,
        "empirical_evidence": False,
        "outcome_data_included": False,
    }
    token_path = root / TOKEN_NAME
    _atomic_write_new(token_path, token)
    return token_path


def verify_release_token(
    run_dir: str | Path, *, expected_request_sha256: str
) -> dict:
    root = Path(run_dir)
    request, actual_request_sha = load_release_request(root)
    if actual_request_sha != str(expected_request_sha256):
        raise CoreV11InvariantError("release request changed after PRE_FIRST_TICK_READY")

    token_path = root / TOKEN_NAME
    if not token_path.is_file():
        raise CoreV11InvariantError("pre-first-tick release token is missing")
    token = json.loads(token_path.read_text(encoding="utf-8"))
    if token.get("protocol_id") != PROTOCOL_ID:
        raise CoreV11InvariantError("unexpected release token protocol_id")
    if token.get("authorization_scope") != "START_TICK_1_ONLY":
        raise CoreV11InvariantError("release token scope is invalid")
    if token.get("explicit_operator_action") is not True:
        raise CoreV11InvariantError("release token lacks explicit operator approval")
    if token.get("empirical_evidence") is not False:
        raise CoreV11InvariantError("release token cannot contain empirical evidence")
    if token.get("outcome_data_included") is not False:
        raise CoreV11InvariantError("release token must contain no outcome data")
    if str(token.get("release_request_sha256")) != actual_request_sha:
        raise CoreV11InvariantError("release token/request binding mismatch")
    if token.get("flow_id") != request.get("flow_id"):
        raise CoreV11InvariantError("release token flow_id mismatch")
    if int(token.get("attempt")) != int(request.get("attempt")):
        raise CoreV11InvariantError("release token attempt mismatch")
    return token


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Explicitly authorize tick 1 for a PRE_FIRST_TICK_READY run."
    )
    parser.add_argument("--run-dir", required=True)
    parser.add_argument(
        "--approve",
        action="store_true",
        help="Explicitly authorize START_TICK_1_ONLY for the bound preflight state.",
    )
    args = parser.parse_args(argv)
    token_path = authorize_release(
        args.run_dir, explicit_approval=bool(args.approve)
    )
    print(f"PRE_FIRST_TICK_RELEASE_CREATED: {token_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
