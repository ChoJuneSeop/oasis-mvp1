from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Optional

from research.g3_2_sidecar.preflight import PolicyDeclaration, static_preflight

EXPECTED_HARNESS_SHA256 = "fe57064e10fd870ba9c3cf1ba0f5b95dc5a2bdd1337ae1b905a2f79bc450ce18"
HARNESS_PATH = Path(__file__).with_name("harness_v1_1.py")


@dataclass(frozen=True)
class SourceIdentity:
    path: Optional[str] = None
    sha256_hex: Optional[str] = None


@dataclass(frozen=True)
class RuntimeIdentity:
    carla_host: SourceIdentity = SourceIdentity()
    oasis_core_adapter: SourceIdentity = SourceIdentity()
    observation_gateway: SourceIdentity = SourceIdentity()
    evaluator: SourceIdentity = SourceIdentity()


@dataclass(frozen=True)
class GateReport:
    passed: bool
    checks: tuple[str, ...]
    violations: tuple[str, ...]


def _file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def _verify_source(name: str, identity: SourceIdentity) -> tuple[bool, str]:
    if not identity.path or not identity.sha256_hex:
        return False, f"{name} source path/SHA-256 is not frozen"
    if len(identity.sha256_hex) != 64:
        return False, f"{name} SHA-256 is malformed"
    path = Path(identity.path)
    if not path.is_file():
        return False, f"{name} source file does not exist: {identity.path}"
    actual = _file_sha256(path)
    if actual != identity.sha256_hex:
        return False, f"{name} source drift: {actual} != {identity.sha256_hex}"
    return True, f"{name} source file matches frozen SHA-256"


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
        "CARLA host port": identity.carla_host,
        "OASIS core adapter": identity.oasis_core_adapter,
        "Observation Gateway": identity.observation_gateway,
        "Independent Evaluator": identity.evaluator,
    }
    for name, source in required.items():
        ok, message = _verify_source(name, source)
        (checks if ok else violations).append(message)

    if violations:
        violations.append(
            "CARLA G3.2 execution is blocked until every runtime source file is present and hash-verified"
        )

    return GateReport(not violations, tuple(checks), tuple(violations))


if __name__ == "__main__":
    report = pre_experiment_gate(RuntimeIdentity())
    print("PASS" if report.passed else "BLOCKED")
    for item in report.checks:
        print("CHECK:", item)
    for item in report.violations:
        print("BLOCK:", item)
    raise SystemExit(0 if report.passed else 2)
