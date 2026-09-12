from __future__ import annotations

"""Runtime identity capture/freeze for OASIS G3 Organic Flow Integration v1.

The runtime identity is an execution precondition, not an OASIS semantic state.
Changing map/settings/version after the identity is frozen fails closed and requires a
new registered execution version rather than silently continuing the same run.
"""

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
from typing import Any, Mapping

from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    runtime_identity,
    validate_runtime_identity,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

MANIFEST_PATH = Path(__file__).with_name("ORGANIC_SOURCE_MANIFEST.json")


@dataclass(frozen=True)
class FrozenOrganicRuntimeRecord:
    identity: dict[str, object]
    baseline_commit: str
    source_snapshot_commit: str
    source_manifest_sha256: str
    sha256: str
    path: str


def validate_organic_runtime_identity(identity: Mapping[str, object]) -> dict[str, object]:
    """Validate the protocol runtime without inventing missing values.

    `no_rendering_mode` is captured and frozen, not assigned a semantic good/bad value.
    The first frozen value may be True or False; changing it inside the same registered
    execution is forbidden because it changes the runtime identity.
    """

    checked = validate_runtime_identity(identity)
    if type(checked.get("no_rendering_mode")) is not bool:
        raise CoreV11InvariantError(
            "CARLA no_rendering_mode must be explicitly captured as a boolean"
        )
    return dict(checked)


def _canonical_runtime_payload(
    identity: Mapping[str, object],
    *,
    manifest_path: Path,
) -> tuple[dict[str, object], bytes, str, str, str]:
    checked = validate_organic_runtime_identity(identity)
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    baseline_commit = str(manifest["baseline_commit"])
    source_snapshot_commit = str(manifest["source_snapshot_commit"])
    manifest_digest = sha256(manifest_bytes).hexdigest()
    payload = {
        "baseline_commit": baseline_commit,
        "source_snapshot_commit": source_snapshot_commit,
        "source_manifest_sha256": manifest_digest,
        "runtime_identity": checked,
    }
    encoded = json.dumps(
        payload,
        sort_keys=True,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return checked, encoded, baseline_commit, source_snapshot_commit, manifest_digest


def freeze_organic_runtime_identity(
    identity: Mapping[str, object],
    output_path: str | Path,
    *,
    manifest_path: str | Path = MANIFEST_PATH,
) -> FrozenOrganicRuntimeRecord:
    """Validate and immutably freeze runtime identity before Decision Epoch 1."""

    manifest_path = Path(manifest_path)
    checked, encoded, baseline, snapshot, manifest_digest = _canonical_runtime_payload(
        identity, manifest_path=manifest_path
    )
    digest = sha256(encoded).hexdigest()
    path = Path(output_path)
    if path.exists():
        existing = path.read_bytes()
        if existing != encoded:
            raise CoreV11InvariantError(
                "frozen organic runtime identity differs from the current validated runtime"
            )
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encoded)
    return FrozenOrganicRuntimeRecord(
        identity=dict(checked),
        baseline_commit=baseline,
        source_snapshot_commit=snapshot,
        source_manifest_sha256=manifest_digest,
        sha256=digest,
        path=str(path),
    )


class OrganicRuntimeIdentityGuard:
    """Fail closed if the live CARLA runtime drifts after freeze."""

    def __init__(
        self,
        *,
        client: Any,
        world: Any,
        output_path: str | Path,
        manifest_path: str | Path = MANIFEST_PATH,
    ) -> None:
        self.client = client
        self.world = world
        self.manifest_path = Path(manifest_path)
        first = runtime_identity(world, client)
        self.record = freeze_organic_runtime_identity(
            first,
            output_path,
            manifest_path=self.manifest_path,
        )

    def assert_current(self) -> dict[str, object]:
        current = validate_organic_runtime_identity(
            runtime_identity(self.world, self.client)
        )
        if current != self.record.identity:
            raise CoreV11InvariantError(
                "live CARLA runtime identity changed after freeze; fail closed"
            )
        return dict(current)
