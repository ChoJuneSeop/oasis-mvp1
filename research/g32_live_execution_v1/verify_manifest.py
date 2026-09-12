from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name("LIVE_SOURCE_MANIFEST.json")


def verify():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest["baseline_commit"] != "5ccccc1fe9e3b25305ab2f133fd8cb0e63d1c954":
        raise RuntimeError("unexpected frozen G3.2 baseline")
    if manifest["no_post_result_retuning"] is not True:
        raise RuntimeError("no-post-result-retuning declaration is required")
    if manifest["experimental_evidence"] is not False:
        raise RuntimeError("pre-experiment live supplement cannot claim empirical evidence")
    if manifest["real_carla_execution"] != "BLOCKED_UNTIL_LIVE_RUNTIME_IDENTITY_IS_CAPTURED_VALIDATED_AND_FROZEN":
        raise RuntimeError("live execution gate was weakened")

    for relative, expected in manifest["source_sha256"].items():
        path = ROOT / relative
        actual = sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(
                f"source hash mismatch: {relative}: {actual} != {expected}"
            )
    return manifest


if __name__ == "__main__":
    result = verify()
    print("g32-live-source-manifest=PASS")
    print("source_snapshot_commit=", result["source_snapshot_commit"])
    print("real_carla_execution=", result["real_carla_execution"])
