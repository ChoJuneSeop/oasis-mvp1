from __future__ import annotations

"""Self-verifying gated entrypoint for G3-ORGANIC-CARLA-01.

Use this module for empirical execution. It verifies the frozen experiment source
manifest before importing and delegating to the pre-first-tick gated runner.
"""

from hashlib import sha256
import json
from pathlib import Path

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

PACKAGE = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE.parents[1]
MANIFEST = PACKAGE / "EXPERIMENT_SOURCE_MANIFEST.json"


def verify_experiment_manifest() -> dict:
    if not MANIFEST.is_file():
        raise CoreV11InvariantError("independent experiment source manifest is missing")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("protocol_id") != "G3-ORGANIC-CARLA-01":
        raise CoreV11InvariantError("unexpected experiment manifest protocol_id")
    if manifest.get("no_post_result_retuning") is not True:
        raise CoreV11InvariantError("experiment manifest lost no-retuning guard")
    if manifest.get("experimental_evidence") is not False:
        raise CoreV11InvariantError("source manifest must not be labeled empirical evidence")
    if manifest.get("pre_first_tick_hold") is not True:
        raise CoreV11InvariantError("experiment manifest lost pre-first-tick hold")
    if manifest.get("tm_independent_readback_claimed") is not False:
        raise CoreV11InvariantError("unsupported Traffic Manager readback claim")
    expected = {str(k): str(v) for k, v in manifest["source_sha256"].items()}
    for relative, expected_hash in sorted(expected.items()):
        path = REPO_ROOT / relative
        if not path.is_file():
            raise CoreV11InvariantError(f"missing frozen experiment source: {relative}")
        actual = sha256(path.read_bytes()).hexdigest()
        if actual != expected_hash:
            raise CoreV11InvariantError(
                f"frozen experiment source hash mismatch for {relative}: {actual} != {expected_hash}"
            )
    prereg_path = PACKAGE / "G3_ORGANIC_CARLA_01_PREREGISTRATION.json"
    prereg_hash = sha256(prereg_path.read_bytes()).hexdigest()
    if prereg_hash != str(manifest["preregistration_sha256"]):
        raise CoreV11InvariantError("preregistration bytes changed after experiment freeze")
    return manifest


def main(argv: list[str] | None = None) -> int:
    verify_experiment_manifest()
    from research.g3_organic_carla_01.gated_runner import main as gated_main
    return gated_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
