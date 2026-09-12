from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

PACKAGE = Path(__file__).resolve().parent
PREREGISTRATION_PATH = PACKAGE / "G3_ORGANIC_CARLA_01_PREREGISTRATION.json"
ORGANIC_MANIFEST_PATH = PACKAGE.parent / "g3_organic_flow_v1" / "ORGANIC_SOURCE_MANIFEST.json"


def load_preregistration(path: str | Path = PREREGISTRATION_PATH) -> dict:
    path = Path(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("protocol_id") != "G3-ORGANIC-CARLA-01":
        raise CoreV11InvariantError("unexpected independent experiment protocol_id")
    if data.get("status") != "PREREGISTERED_BEFORE_FIRST_EXPERIMENTAL_TICK":
        raise CoreV11InvariantError("protocol is not in preregistered state")
    flows = data.get("flows")
    if not isinstance(flows, list) or len(flows) != 6:
        raise CoreV11InvariantError("protocol must preregister exactly six independent flows")
    ids = [str(item.get("flow_id", "")) for item in flows]
    seeds = [int(item.get("seed")) for item in flows]
    if len(set(ids)) != len(ids) or len(set(seeds)) != len(seeds):
        raise CoreV11InvariantError("flow ids and seeds must be unique")
    env = data.get("environment", {})
    if env.get("map") != "Town10HD_Opt":
        raise CoreV11InvariantError("unexpected preregistered map")
    if env.get("synchronous_mode") is not True:
        raise CoreV11InvariantError("synchronous_mode must be preregistered true")
    if abs(float(env.get("fixed_delta_seconds")) - 0.05) > 1e-12:
        raise CoreV11InvariantError("fixed_delta_seconds must be 0.05")
    if int(env.get("planned_horizon_ticks_per_flow")) != 30000:
        raise CoreV11InvariantError("planned horizon must remain 30000 ticks")
    if int(env.get("npc_count")) != 12:
        raise CoreV11InvariantError("npc_count must remain 12")
    if data.get("code_lineage", {}).get("post_result_retuning") is not False:
        raise CoreV11InvariantError("post-result retuning must remain disabled")
    return data


def preregistration_sha256(path: str | Path = PREREGISTRATION_PATH) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()


def flow_spec(protocol: dict, flow_id: str) -> dict:
    for item in protocol["flows"]:
        if item["flow_id"] == flow_id:
            return dict(item)
    raise CoreV11InvariantError(f"unknown preregistered flow_id: {flow_id}")


def verify_frozen_organic_sources(repo_root: str | Path) -> dict:
    """Verify frozen organic execution sources without relying on a mutable branch whitelist."""
    root = Path(repo_root)
    manifest_path = root / "research/g3_organic_flow_v1/ORGANIC_SOURCE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = {str(k): str(v) for k, v in manifest["source_sha256"].items()}
    for relative, expected_hash in sorted(expected.items()):
        path = root / relative
        if not path.is_file():
            raise CoreV11InvariantError(f"missing frozen organic source: {relative}")
        actual = sha256(path.read_bytes()).hexdigest()
        if actual != expected_hash:
            raise CoreV11InvariantError(
                f"frozen organic source hash mismatch for {relative}: {actual} != {expected_hash}"
            )
    if manifest.get("baseline_commit") != "5ccccc1fe9e3b25305ab2f133fd8cb0e63d1c954":
        raise CoreV11InvariantError("unexpected frozen baseline commit")
    if manifest.get("source_snapshot_commit") != "343dd3aa220537ad3dab2e8bb11c7a93a50378a5":
        raise CoreV11InvariantError("unexpected organic source snapshot")
    if manifest.get("no_post_result_retuning") is not True:
        raise CoreV11InvariantError("organic source manifest lost no-retuning guard")
    return manifest
