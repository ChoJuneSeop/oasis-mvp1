from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Iterable

from .canonical import domain_digest
from .models import (
    A2ExecutionProfile,
    HARNESS_FREEZE_COMMIT,
    SOURCE_FREEZE_COMMIT,
)


PACKAGE_DIR = Path(__file__).resolve().parent


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _composite_hash(root: Path, paths: Iterable[str], *, domain: str) -> str:
    manifest = {
        path: _sha256_file(root / path)
        for path in sorted(paths)
    }
    return domain_digest(domain, manifest)


def compute_expected_bindings(package_dir: Path = PACKAGE_DIR) -> dict[str, str]:
    return {
        "experiment_definition_hash": _sha256_file(package_dir / "design_spec.py"),
        "confirmatory_plan_hash": _sha256_file(package_dir / "CONFIRMATORY_PLAN.json"),
        "ce_registry_hash": _sha256_file(package_dir / "CE_REGISTRY.json"),
        "world_snapshot_hash": _sha256_file(package_dir / "SCENARIO_FIXTURES.json"),
        "worker_build_hash": domain_digest(
            "A2_WORKER_BUILD_V1",
            {"source_freeze_commit": SOURCE_FREEZE_COMMIT},
        ),
        "system_trace_build_hash": _composite_hash(
            package_dir,
            ("canonical.py", "models.py", "instrumentation.py"),
            domain="A2_SYSTEM_TRACE_BUILD_V1",
        ),
        "reference_recorder_build_hash": domain_digest(
            "A2_REFERENCE_RECORDER_BUILD_V1",
            {
                "package": _composite_hash(
                    package_dir,
                    (
                        "adapter.py",
                        "artifact_io.py",
                        "canonical.py",
                        "confirmatory_runner.py",
                        "fixtures.py",
                        "integrated_choice_adapter.py",
                        "models.py",
                        "ledger.py",
                        "preflight.py",
                        "profile_io.py",
                    ),
                    domain="A2_REFERENCE_RECORDER_PACKAGE_V1",
                ),
                "confirmatory_workflow_sha256": _sha256_file(
                    package_dir.parents[1]
                    / ".github"
                    / "workflows"
                    / "governance-oasis-a2-confirmatory-v1.yml"
                ),
            },
        ),
        "evaluator_build_hash": _composite_hash(
            package_dir,
            ("canonical.py", "models.py", "evaluator.py"),
            domain="A2_EVALUATOR_BUILD_V1",
        ),
    }


def load_execution_profile(path: Path | None = None) -> A2ExecutionProfile:
    path = path or (PACKAGE_DIR / "EXECUTION_PROFILE.json")
    raw = json.loads(path.read_text(encoding="utf-8"))
    return A2ExecutionProfile(**raw)


def verify_execution_profile(
    profile: A2ExecutionProfile,
    *,
    package_dir: Path = PACKAGE_DIR,
) -> tuple[str, ...]:
    errors: list[str] = []
    if profile.harness_freeze_commit != HARNESS_FREEZE_COMMIT:
        errors.append("harness freeze commit mismatch")
    if profile.source_freeze_commit != SOURCE_FREEZE_COMMIT:
        errors.append("source freeze commit mismatch")

    expected = compute_expected_bindings(package_dir)
    for field, value in expected.items():
        if getattr(profile, field) != value:
            errors.append(f"{field} mismatch")
    return tuple(errors)
