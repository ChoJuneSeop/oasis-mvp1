from __future__ import annotations

import json
from pathlib import Path


def verify_experiment_manifest_v2() -> dict:
    path = Path(__file__).resolve().parent / "EXPERIMENT_SOURCE_MANIFEST.json"
    return json.loads(path.read_text(encoding="utf-8"))
