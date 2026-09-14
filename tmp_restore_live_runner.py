from __future__ import annotations

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


def run_flow(**kwargs):
    verify_experiment_manifest()
    saved = _patch()
    try:
        return base_runner.run_flow(**kwargs)
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
