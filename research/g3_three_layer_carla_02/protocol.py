from __future__ import annotations

import hashlib
import json
from pathlib import Path

PROTOCOL_ID = "G3-THREE-LAYER-CARLA-02"
PREREGISTRATION_PATH = Path(__file__).with_name("G3_THREE_LAYER_CARLA_02_PREREGISTRATION.json")


def load_preregistration() -> dict:
    raw = json.loads(PREREGISTRATION_PATH.read_text(encoding="utf-8"))
    if raw.get("protocol_id") != PROTOCOL_ID:
        raise ValueError("unexpected protocol_id")
    return {
        **raw,
        "environment": {
            "map": raw["map"],
            "fixed_delta_seconds": float(raw["fixed_delta_seconds"]),
            "traffic_manager_port": 8000,
            "npc_count": int(raw["npc_count"]),
            "planned_horizon_ticks_per_flow": int(raw["planned_horizon_ticks"]),
            "horizon_is_semantic_threshold": False,
        },
        "flows": [{"flow_id": raw["flow_id"], "seed": int(raw["seed"])}],
    }


def flow_spec(protocol: dict, flow_id: str) -> dict:
    for item in protocol["flows"]:
        if item["flow_id"] == flow_id:
            return dict(item)
    raise ValueError(f"unknown flow_id: {flow_id}")


def preregistration_sha256() -> str:
    return hashlib.sha256(PREREGISTRATION_PATH.read_bytes()).hexdigest()
