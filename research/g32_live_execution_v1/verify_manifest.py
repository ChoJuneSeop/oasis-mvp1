from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
PACKAGE = Path(__file__).resolve().parent
MANIFEST = PACKAGE / "LIVE_SOURCE_MANIFEST.json"
VERIFIER_RELATIVE = "research/g32_live_execution_v1/verify_manifest.py"


def _git(*args: str, capture: bool = False):
    if capture:
        return subprocess.check_output(["git", *args], cwd=ROOT)
    subprocess.check_call(["git", *args], cwd=ROOT)
    return None


def verify():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    baseline = manifest["baseline_commit"]
    snapshot = manifest["source_snapshot_commit"]

    if baseline != "5ccccc1fe9e3b25305ab2f133fd8cb0e63d1c954":
        raise RuntimeError("unexpected frozen G3.2 baseline")
    if manifest["no_post_result_retuning"] is not True:
        raise RuntimeError("no-post-result-retuning declaration is required")
    if manifest["experimental_evidence"] is not False:
        raise RuntimeError("pre-experiment live supplement cannot claim empirical evidence")
    if manifest["real_carla_execution"] != "BLOCKED_UNTIL_LIVE_RUNTIME_IDENTITY_IS_CAPTURED_VALIDATED_AND_FROZEN":
        raise RuntimeError("live execution gate was weakened")

    # Prove that the declared baseline and source snapshot are real commits and
    # that the snapshot descends from the frozen baseline while current HEAD
    # still descends from the snapshot. This prevents a manifest from merely
    # naming an unrelated SHA.
    _git("cat-file", "-e", f"{baseline}^{{commit}}")
    _git("cat-file", "-e", f"{snapshot}^{{commit}}")
    _git("merge-base", "--is-ancestor", baseline, snapshot)
    _git("merge-base", "--is-ancestor", snapshot, "HEAD")

    source_map = manifest["source_sha256"]
    declared_python = {
        relative
        for relative in source_map
        if relative.startswith("research/g32_live_execution_v1/")
        and relative.endswith(".py")
    }
    actual_python = {
        str(path.relative_to(ROOT)).replace("\\", "/")
        for path in PACKAGE.glob("*.py")
        if path.name != "verify_manifest.py"
    }
    if actual_python != declared_python:
        missing = sorted(declared_python - actual_python)
        unexpected = sorted(actual_python - declared_python)
        raise RuntimeError(
            f"live package source set mismatch: missing={missing}, unexpected={unexpected}"
        )

    for relative, expected in source_map.items():
        path = ROOT / relative
        if not path.is_file():
            raise RuntimeError(f"declared source is missing: {relative}")

        current_hash = sha256(path.read_bytes()).hexdigest()
        if current_hash != expected:
            raise RuntimeError(
                f"current source hash mismatch: {relative}: {current_hash} != {expected}"
            )

        snapshot_bytes = _git("show", f"{snapshot}:{relative}", capture=True)
        snapshot_hash = sha256(snapshot_bytes).hexdigest()
        if snapshot_hash != expected:
            raise RuntimeError(
                f"snapshot source hash mismatch: {relative}: {snapshot_hash} != {expected}"
            )

        if snapshot_bytes != path.read_bytes():
            raise RuntimeError(
                f"runtime source drifted after frozen snapshot: {relative}"
            )

    return manifest


if __name__ == "__main__":
    result = verify()
    print("g32-live-source-manifest=PASS")
    print("baseline_commit=", result["baseline_commit"])
    print("source_snapshot_commit=", result["source_snapshot_commit"])
    print("real_carla_execution=", result["real_carla_execution"])
