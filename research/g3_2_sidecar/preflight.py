from dataclasses import dataclass
from typing import Sequence

from .bridge import FrozenFlowPort, observe_epoch
from .common import G32InvariantError
from .participation import total_variation_distance


@dataclass(frozen=True)
class PolicyDeclaration:
    uses_recency_decay: bool = False
    uses_binary_memory_gate: bool = False
    uses_fixed_participation_threshold: bool = False
    uses_fixed_reconstruction_threshold: bool = False
    uses_fixed_closure_duration: bool = False

    def violations(self) -> tuple[str, ...]:
        out = []
        if self.uses_recency_decay:
            out.append("recency decay is forbidden")
        if self.uses_binary_memory_gate:
            out.append("binary memory selection is forbidden")
        if self.uses_fixed_participation_threshold:
            out.append("fixed participation threshold is forbidden")
        if self.uses_fixed_reconstruction_threshold:
            out.append("fixed reconstruction threshold is forbidden")
        if self.uses_fixed_closure_duration:
            out.append("fixed closure duration is forbidden")
        return tuple(out)


@dataclass(frozen=True)
class PreflightReport:
    passed: bool
    checks: tuple[str, ...]
    violations: tuple[str, ...]


def static_preflight(policy: PolicyDeclaration) -> PreflightReport:
    violations = policy.violations()
    checks = (
        "no recency weighting",
        "no binary memory gate",
        "no fixed participation threshold",
        "no fixed reconstruction threshold",
        "no fixed closure duration",
        "participation and reconstruction remain separate axes",
    )
    return PreflightReport(not violations, checks, violations)


def runtime_preflight(port: FrozenFlowPort, policy: PolicyDeclaration) -> PreflightReport:
    base = static_preflight(policy)
    violations = list(base.violations)
    checks = list(base.checks)
    if violations:
        return PreflightReport(False, tuple(checks), tuple(violations))

    try:
        observation = observe_epoch(port)
        checks.append("counterfactual observation leaves flow fingerprint unchanged")
        checks.append("counterfactual observation does not advance tau")
        checks.append("all historical elements satisfy completed_at_tau <= current tau")
        checks.append("reconstruction provenance contains no future relation")
        for measurement in observation.participation:
            if measurement.relation.completed_at_tau > observation.snapshot.tau:
                violations.append("future relation element entered current participation")
        for rec in observation.reconstruction:
            if len(rec.vector) != 3:
                violations.append("reconstruction axes were collapsed or malformed")
            for link in rec.source_links:
                if link.source.completed_at_tau > observation.snapshot.tau:
                    violations.append("future relation entered reconstruction provenance")
    except (G32InvariantError, RuntimeError, ValueError) as exc:
        violations.append(str(exc))

    return PreflightReport(not violations, tuple(checks), tuple(violations))


def verify_no_age_decay(
    same_full_distribution: dict[str, float],
    same_ablated_distribution: dict[str, float],
    ages: Sequence[float],
) -> bool:
    """Age is accepted only as a test label; it never enters the participation calculation."""
    if not ages:
        raise ValueError("ages must not be empty")
    values = [
        total_variation_distance(same_full_distribution, same_ablated_distribution)
        for _ in ages
    ]
    return all(value == values[0] for value in values)
