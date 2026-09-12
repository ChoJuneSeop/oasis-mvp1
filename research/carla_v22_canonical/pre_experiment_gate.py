from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Optional

from research.g3_2_sidecar.preflight import PolicyDeclaration, static_preflight

EXPECTED_HARNESS_SHA256 = "fe57064e10fd870ba9c3cf1ba0f5b95dc5a2bdd1337ae1b905a2f79bc450ce18"
HARNESS_PATH = Path(__file__).with_name("harness_v1_1.py")


@dataclass(frozen=True)
class RuntimeIdentity:
    carla_host_source_sha256: Optional[str] = None
    oasis_core_adapter_source_sha256: Optional[str] = None
    observation_gateway_source_sha256: Optional[str] = None
    evaluator_source_sha256: Optional[str] = None


@dataclass(frozen=True)
class GateReport:
    passed: bool
    checks: tuple[str, ...]
    violations: tuple[str, ...]


def _file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def pre_experiment_gate(identity: RuntimeIdentity) -> GateReport:
    checks: list[str] = []
    violations: list[str] = []

    actual_harness_hash = _file_sha256(HARNESS_PATH)
    if actual_harness_hash == EXPECTED_HARNESS_SHA256:
        checks.append("Harness v1.1 source SHA-256 matches frozen snapshot")
    else:
        violations.append(
            f"Harness source drift: {actual_harness_hash} != {EXPECTED_HARNESS_SHA256}"
        )

    policy = static_preflight(PolicyDeclaration())
    checks.extend(policy.checks)
    violations.extend(policy.violations)

    required = {
        "CARLA host port": identity.carla_host_source_sha256,
        "OASIS core adapter": identity.oasis_core_adapter_source_sha256,
        "Observation Gateway": identity.observation_gateway_source_sha256,
        "Independent Evaluator": identity.evaluator_source_sha256,
    }
    for name, value in required.items():
        if value and len(value) == 64:
            checks.append(f"{name} source identity supplied")
        else:
            violations.append(f"{name} source SHA-256 is not frozen")

    if violations:
        violations.append("CARLA G3.2 execution is blocked until every runtime source identity is frozen")

    return GateReport(not violations, tuple(checks), tuple(violations))


if __name__ == "__main__":
    report = pre_experiment_gate(RuntimeIdentity())
    print("PASS" if report.passed else "BLOCKED")
    for item in report.checks:
        print("CHECK:", item)
    for item in report.violations:
        print("BLOCK:", item)
    raise SystemExit(0 if report.passed else 2)
