from __future__ import annotations

"""Verify the frozen OASIS G3 Organic Flow v1 source manifest."""

from hashlib import sha256
import json
from pathlib import Path
import subprocess

PACKAGE = Path("research/g3_organic_flow_v1")
MANIFEST = PACKAGE / "ORGANIC_SOURCE_MANIFEST.json"
VERIFIER = PACKAGE / "verify_manifest.py"
WORKFLOW = Path(".github/workflows/oasis-g3-organic-flow-v1.yml")


def _git(*args: str, text: bool = True):
    return subprocess.check_output(["git", *args], text=text)


def _is_ancestor(ancestor: str, descendant: str) -> bool:
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", ancestor, descendant],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def _digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    baseline = str(manifest["baseline_commit"])
    snapshot = str(manifest["source_snapshot_commit"])
    expected = {str(k): str(v) for k, v in manifest["source_sha256"].items()}

    if manifest.get("no_post_result_retuning") is not True:
        raise SystemExit("manifest must fail closed on post-result retuning")
    if manifest.get("experimental_evidence") is not False:
        raise SystemExit("source validation must not be labeled empirical evidence")
    if str(manifest.get("source_snapshot_validation_conclusion")) != "success":
        raise SystemExit("source snapshot lacks successful validation provenance")
    if str(manifest.get("sha256_generation_conclusion")) != "success":
        raise SystemExit("source SHA generation lacks successful provenance")

    if not _is_ancestor(baseline, snapshot):
        raise SystemExit("organic source snapshot is not descended from the frozen baseline")
    if not _is_ancestor(snapshot, "HEAD"):
        raise SystemExit("current HEAD is not descended from the frozen organic source snapshot")

    current_python = {
        p.as_posix()
        for p in PACKAGE.glob("*.py")
        if p.resolve() != VERIFIER.resolve()
    }
    if current_python != set(expected):
        missing = sorted(set(expected) - current_python)
        extra = sorted(current_python - set(expected))
        raise SystemExit(
            f"organic source file set changed after freeze; missing={missing}, extra={extra}"
        )

    for path, expected_hash in sorted(expected.items()):
        current_bytes = Path(path).read_bytes()
        current_hash = _digest(current_bytes)
        if current_hash != expected_hash:
            raise SystemExit(
                f"current organic source hash mismatch for {path}: {current_hash} != {expected_hash}"
            )
        snapshot_bytes = _git("show", f"{snapshot}:{path}", text=False)
        snapshot_hash = _digest(snapshot_bytes)
        if snapshot_hash != expected_hash:
            raise SystemExit(
                f"snapshot organic source hash mismatch for {path}: {snapshot_hash} != {expected_hash}"
            )

    changed_after_snapshot = set(
        line.strip()
        for line in _git("diff", "--name-only", snapshot, "HEAD").splitlines()
        if line.strip()
    )
    allowed_after_snapshot = {
        MANIFEST.as_posix(),
        VERIFIER.as_posix(),
        WORKFLOW.as_posix(),
    }
    forbidden = sorted(changed_after_snapshot - allowed_after_snapshot)
    if forbidden:
        raise SystemExit(
            "frozen organic source was altered after snapshot: " + ", ".join(forbidden)
        )

    print("ORGANIC_MANIFEST_VERIFY=PASS")
    print(f"baseline_commit={baseline}")
    print(f"source_snapshot_commit={snapshot}")
    print(f"frozen_python_files={len(expected)}")
    print("post_snapshot_changes=", sorted(changed_after_snapshot))


if __name__ == "__main__":
    main()
