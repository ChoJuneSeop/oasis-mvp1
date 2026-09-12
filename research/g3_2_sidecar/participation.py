from dataclasses import dataclass
from math import isfinite
from typing import Mapping
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
    relation: RelationElementRef
    observed_at_tau: float
    degree: float
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
        if not isfinite(self.degree) or not 0.0 <= self.degree <= 1.0:
            raise G32InvariantError("degree must be in [0,1]")

def measure_participation(tau: float, relation: RelationElementRef, probe: CounterfactualProbeResult) -> ParticipationMeasurement:
    probe.assert_pure()
    degree = total_variation_distance(probe.full_distribution, probe.relation_ablated_distribution)
    return ParticipationMeasurement(
        relation=relation,
        observed_at_tau=tau,
        degree=degree,
        role_trace=probe.full_role_trace,
        full_distribution=normalize_distribution(probe.full_distribution),
        relation_ablated_distribution=normalize_distribution(probe.relation_ablated_distribution),
        generated_possibilities=probe.generated_possibilities,
    )
