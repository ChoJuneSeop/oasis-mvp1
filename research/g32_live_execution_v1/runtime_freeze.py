from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path

from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    validate_runtime_identity,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

MANIFEST_PATH = Path(__file__).with_name("LIVE_SOURCE_MANIFEST.json")


@dataclass(frozen=True)
class FrozenRuntimeRecord:
    identity: dict[str, object]
    baseline_commit: str
    source_snapshot_commit: str
    sha256: str
    path: str


def freeze_runtime_identity_record(
    identity,
    output_path,
    *,
    manifest_path=MANIFEST_PATH,
) -> FrozenRuntimeRecord:
    """Validate and immutably freeze live CARLA identity before the first experiment tick."""
    validated = validate_runtime_identity(identity)
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    baseline_commit = str(manifest["baseline_commit"])
    source_snapshot_commit = str(manifest["source_snapshot_commit"])
    payload = {
        "baseline_commit": baseline_commit,
        "source_snapshot_commit": source_snapshot_commit,
        "runtime_identity": validated,
    }
    encoded = json.dumps(
        payload,
        sort_keys=True,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    ).encode("utf-8")
    digest = sha256(encoded).hexdigest()

    path = Path(output_path)
    if path.exists():
        existing = path.read_bytes()
        if existing != encoded:
            raise CoreV11InvariantError(
                "frozen live runtime identity differs from the current validated runtime"
            )
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encoded)

    return FrozenRuntimeRecord(
        identity=dict(validated),
        baseline_commit=baseline_commit,
        source_snapshot_commit=source_snapshot_commit,
        sha256=digest,
        path=str(path),
    )
