from __future__ import annotations

import json
from pathlib import Path

from research.g3_organic_carla_01 import gated_runner as base_runner
from research.g3_organic_carla_01 import live_runner as base_live
from research.g3_organic_carla_01 import release_gate as base_release
from research.g3_rpfo_carla_01.core_factory import make_core
from research.g3_rpfo_carla_01.protocol import (
    EXPERIMENT_MANIFEST_PATH,
    PREREGISTRATION_PATH,
    PROTOCOL_ID,
    experiment_manifest_sha256,
    flow_spec,
    load_preregistration,
    preregistration_sha256,
    verify_experiment_manifest,
)


def _patch():
    names = {
        "gate_build": (base_runner, "build_organic_core", make_core),
        "gate_id": (base_runner, "PROTOCOL_ID", PROTOCOL_ID),
        "live_id": (base_live, "PROTOCOL_ID", PROTOCOL_ID),
        "release_id": (base_release, "PROTOCOL_ID", PROTOCOL_ID),
        "gate_prereg_path": (base_runner, "PREREGISTRATION_PATH", PREREGISTRATION_PATH),
        "gate_manifest_path": (base_runner, "EXPERIMENT_MANIFEST_PATH", EXPERIMENT_MANIFEST_PATH),
        "gate_load": (base_runner, "load_preregistration", load_preregistration),
        "gate_flow": (base_runner, "flow_spec", flow_spec),
        "gate_prereg_hash": (base_runner, "preregistration_sha256", preregistration_sha256),
        "gate_manifest_hash": (base_runner, "experiment_manifest_sha256", experiment_manifest_sha256),
        "gate_verify": (base_runner, "_verify_experiment_manifest", verify_experiment_manifest),
    }
    saved = []
    for _, (module, name, value) in names.items():
        saved.append((module, name, getattr(module, name)))
        setattr(module, name, value)
    return saved


def _restore(saved):
    for module, name, value in reversed(saved):
        setattr(module, name, value)


def _atomic_status(path: Path, payload: dict) -> None:
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


def _record_pre_first_tick_failure(kwargs, exc: BaseException) -> None:
    """Preserve a failed empirical attempt even when the legacy runner fails before its try block."""
    flow_id = str(kwargs.get("flow_id", ""))
    attempt = int(kwargs.get("attempt", 0) or 0)
    output_root = kwargs.get("output_root")
    if not flow_id or attempt < 1 or output_root is None:
        return

    run_dir = Path(output_root) / PROTOCOL_ID / f"{flow_id}-A{attempt}"
    status_path = run_dir / "status.json"
    if not run_dir.exists():
        run_dir.mkdir(parents=True, exist_ok=False)

    status = {}
    if status_path.is_file():
        try:
            status = json.loads(status_path.read_text(encoding="utf-8"))
        except Exception:
            status = {}

    # Never rewrite an attempt that has crossed the empirical boundary.
    if bool(status.get("empirical_evidence")) or int(status.get("empirical_ticks", 0) or 0) > 0:
        return

    status.update(
        {
            "protocol_id": PROTOCOL_ID,
            "flow_id": flow_id,
            "attempt": attempt,
            "phase": "PRE_FIRST_TICK_FAIL",
            "empirical_evidence": False,
            "empirical_ticks": 0,
            "valid_complete": False,
            "error_type": type(exc).__name__,
            "error": str(exc),
            "failure_recorded_by": "rpfo-live-wrapper-v1",
        }
    )
    _atomic_status(status_path, status)


def run_flow(**kwargs):
    verify_experiment_manifest()
    saved = _patch()
    try:
        try:
            return base_runner.run_flow(**kwargs)
        except BaseException as exc:
            _record_pre_first_tick_failure(kwargs, exc)
            raise
    finally:
        _restore(saved)


def main(argv=None):
    verify_experiment_manifest()
    saved = _patch()
    try:
        return base_runner.main(argv)
    finally:
        _restore(saved)


if __name__ == "__main__":
    raise SystemExit(main())
