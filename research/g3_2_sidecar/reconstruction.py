from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping
from .common import G32InvariantError, RelationElementRef, require_tau


@dataclass(frozen=True)
class AxisObservation:
    value: float
    method: str
    evidence: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        value = float(self.value)
        object.__setattr__(self, "value", value)
        if not isfinite(value) or not 0.0 <= value <= 1.0:
            raise G32InvariantError("axis value must be in [0,1]")
        if not self.method.strip():
            raise G32InvariantError("axis method is required")


@dataclass(frozen=True)
class ProvenanceLink:
    source: RelationElementRef
    distribution_effect: float
    participation_roles: tuple[str, ...]
    generated_possibilities: tuple[str, ...] = ()
    contribution_trace: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        value = float(self.distribution_effect)
        object.__setattr__(self, "distribution_effect", value)
        if not isfinite(value) or not 0.0 <= value <= 1.0:
            raise G32InvariantError("distribution_effect must be in [0,1]")


@dataclass(frozen=True)
class ReconstructionMeasurement:
    possibility_id: str
    observed_at_tau: float
    source_links: tuple[ProvenanceLink, ...]
    recombination: AxisObservation
    role_transformation: AxisObservation
    structural_transformation: AxisObservation
    relation_graph_before: Mapping[str, Any] = field(default_factory=dict)
    relation_graph_after: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        tau = require_tau("observed_at_tau", self.observed_at_tau)
        object.__setattr__(self, "observed_at_tau", tau)
        if not self.possibility_id:
            raise G32InvariantError("possibility_id is required")
        for link in self.source_links:
            if link.source.completed_at_tau > tau:
                raise G32InvariantError("future relation entered reconstruction provenance")

    @property
    def vector(self):
        return (
            self.recombination.value,
            self.role_transformation.value,
            self.structural_transformation.value,
        )
