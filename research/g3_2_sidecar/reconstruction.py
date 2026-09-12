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
    participation_degree: float
    participation_roles: tuple[str, ...]
    contribution_trace: Mapping[str, Any] = field(default_factory=dict)
    def __post_init__(self):
        value = float(self.participation_degree)
        object.__setattr__(self, "participation_degree", value)
        if not isfinite(value) or not 0.0 <= value <= 1.0:
            raise G32InvariantError("participation_degree must be in [0,1]")

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
    @property
    def vector(self):
        return (self.recombination.value, self.role_transformation.value, self.structural_transformation.value)
