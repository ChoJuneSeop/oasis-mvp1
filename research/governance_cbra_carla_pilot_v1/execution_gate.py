from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path


MANIFEST_PATH = Path(__file__).with_name("RUNTIME_IDENTITIES.json")
REQUIRED_KEYS = (
    "carla_host_environment_actuator",
    "oasis_core_adapter",
    "observation_gateway",
    "independent_evaluator",
)


@dataclass(frozen=True)
class GateResult:
    passed: bool
    checks: tuple[str, ...]
    violations: tuple[str, ...]


def _sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_runtime_identities(repo_root: Path) -> GateResult:
    data=json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    checks=[]
    violations=[]

    required=data.get("required",{})
    for key in REQUIRED_KEYS:
        item=required.get(key) or {}
        path=item.get("path")
        commit_sha=item.get("commit_sha")
        sha=item.get("sha256")
        if not path or not commit_sha or not sha:
            violations.append(f"{key}: path/commit_sha/sha256 not frozen")
            continue
        if len(commit_sha) < 7:
            violations.append(f"{key}: malformed commit SHA")
            continue
        if len(sha) != 64:
            violations.append(f"{key}: malformed SHA-256")
            continue
        file_path=repo_root / path
        if not file_path.is_file():
            violations.append(f"{key}: source file missing: {path}")
            continue
        actual=_sha256(file_path)
        if actual != sha:
            violations.append(f"{key}: source hash drift {actual} != {sha}")
            continue
        checks.append(f"{key}: source identity verified")

    if violations:
        return GateResult(False, tuple(checks), tuple(violations))
    return GateResult(True, tuple(checks), ())


if __name__=="__main__":
    root=Path(__file__).resolve().parents[2]
    result=validate_runtime_identities(root)
    print("PASS" if result.passed else "BLOCKED")
    for x in result.checks:
        print("CHECK:",x)
    for x in result.violations:
        print("BLOCK:",x)
    raise SystemExit(0 if result.passed else 2)
