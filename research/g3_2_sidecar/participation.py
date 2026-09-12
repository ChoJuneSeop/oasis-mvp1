from dataclasses import dataclass
from math import isfinite
from typing import Mapping, Sequence
from .common import G32InvariantError, RelationElementRef, normalize_distribution, require_tau


def total_variation_distance(full: Mapping[str, float], ablated: Mapping[str, float]) -> float:
    p = normalize_distribution(full)
    q = normalize_distribution(ablated)
    support = set(p) | set(q)
    return 0.5 * sum(abs(p.get(k, 0.0) - q.get(k, 0.0)) for k in support)


@dataclass(frozen=True)
class CounterfactualProbeResult:
    state_hash_before: str
    state_hash_after: str
    full_distribution: Mapping[str, float]
    relation_ablated_distribution: Mapping[str, float]
    full_role_trace: tuple[str, ...] = ()
    generated_possibilities: tuple[str, ...] = ()

    def assert_pure(self):
        if self.state_hash_before != self.state_hash_after:
            raise G32InvariantError("counterfactual probe changed the real state")


@dataclass(frozen=True)
class ParticipationMeasurement:
    """Vector-valued current participation observation.

    distribution_effect is only the leave-one-relation-out effect on the current
    possibility distribution. It is not a memory importance score and a value of
    zero does not mean non-participation when role/construction traces are present.
    """

    relation: RelationElementRef
    observed_at_tau: float
    distribution_effect: float
    role_trace: tuple[str, ...]
    full_distribution: Mapping[str, float]
    relation_ablated_distribution: Mapping[str, float]
    generated_possibilities: tuple[str, ...] = ()
    measurement_method: str = "counterfactual_total_variation"

    def __post_init__(self):
        tau = require_tau("observed_at_tau", self.observed_at_tau)
        object.__setattr__(self, "observed_at_tau", tau)
        if self.relation.completed_at_tau > tau:
            raise G32InvariantError("future experience cannot participate")
        if not isfinite(self.distribution_effect) or not 0.0 <= self.distribution_effect <= 1.0:
            raise G32InvariantError("distribution_effect must be in [0,1]")

    @property
    def has_structural_participation(self) -> bool:
        return bool(self.role_trace or self.generated_possibilities)


@dataclass(frozen=True)
class GroupParticipationMeasurement:
    """Joint probe for a relation set, used to expose redundancy/synergy."""

    relations: tuple[RelationElementRef, ...]
    observed_at_tau: float
    joint_distribution_effect: float
    full_distribution: Mapping[str, float]
    group_ablated_distribution: Mapping[str, float]
    generated_possibilities: tuple[str, ...] = ()
    measurement_method: str = "joint_counterfactual_total_variation"

    def __post_init__(self):
        tau = require_tau("observed_at_tau", self.observed_at_tau)
        object.__setattr__(self, "observed_at_tau", tau)
        if len(self.relations) < 2:
            raise G32InvariantError("group participation requires at least two relation elements")
        if any(rel.completed_at_tau > tau for rel in self.relations):
            raise G32InvariantError("future relation entered group participation")
        if not isfinite(self.joint_distribution_effect) or not 0.0 <= self.joint_distribution_effect <= 1.0:
            raise G32InvariantError("joint_distribution_effect must be in [0,1]")


def measure_participation(tau: float, relation: RelationElementRef, probe: CounterfactualProbeResult) -> ParticipationMeasurement:
    probe.assert_pure()
    effect = total_variation_distance(probe.full_distribution, probe.relation_ablated_distribution)
    return ParticipationMeasurement(
        relation=relation,
        observed_at_tau=tau,
        distribution_effect=effect,
        role_trace=probe.full_role_trace,
        full_distribution=normalize_distribution(probe.full_distribution),
        relation_ablated_distribution=normalize_distribution(probe.relation_ablated_distribution),
        generated_possibilities=probe.generated_possibilities,
    )


def measure_group_participation(
    tau: float,
    relations: Sequence[RelationElementRef],
    *,
    state_hash_before: str,
    state_hash_after: str,
    full_distribution: Mapping[str, float],
    group_ablated_distribution: Mapping[str, float],
    generated_possibilities: Sequence[str] = (),
) -> GroupParticipationMeasurement:
    if state_hash_before != state_hash_after:
        raise G32InvariantError("group counterfactual probe changed the real state")
    effect = total_variation_distance(full_distribution, group_ablated_distribution)
    return GroupParticipationMeasurement(
        relations=tuple(relations),
        observed_at_tau=tau,
        joint_distribution_effect=effect,
        full_distribution=normalize_distribution(full_distribution),
        group_ablated_distribution=normalize_distribution(group_ablated_distribution),
        generated_possibilities=tuple(str(x) for x in generated_possibilities),
    )
