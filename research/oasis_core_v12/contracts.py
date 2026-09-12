"""시간·출처·관측 계약 / temporal, provenance and observation contracts."""
from __future__ import annotations

from dataclasses import dataclass, fields
from math import isfinite
from typing import Any

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import require_tau
from research.g3_2_sidecar.reconstruction import ProvenanceLink
from research.oasis_core_v11.current_relational_core import HistoricalRelationRecord, CoreV11InvariantError


def require_text(value: str, name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise CoreV11InvariantError(f"{name} is required")


@dataclass(frozen=True)
class CurrentEvidence:
    """Reference to a received approved observation field, never a generated hypothesis."""
    evidence_id: str
    field_name: str
    value: Any
    occurred_at_tau: float
    received_at_tau: float

    def __post_init__(self):
        require_text(self.evidence_id, 'evidence_id')
        a = require_tau('occurred_at_tau', self.occurred_at_tau)
        b = require_tau('received_at_tau', self.received_at_tau)
        if a > b:
            raise CoreV11InvariantError('receipt cannot precede occurrence')


@dataclass(frozen=True)
class CurrentFrame:
    observation: PresentObservation
    tau: float
    revision: str
    evidence: tuple[CurrentEvidence, ...]

    def __post_init__(self):
        require_tau('tau', self.tau)
        require_text(self.revision, 'revision')
        ids = [e.evidence_id for e in self.evidence]
        if len(ids) != len(set(ids)):
            raise CoreV11InvariantError('duplicate current evidence id')
        allowed = {f.name for f in fields(PresentObservation)}
        for item in self.evidence:
            if item.field_name not in allowed:
                raise CoreV11InvariantError('evidence is outside approved observation schema')
            if item.value != getattr(self.observation, item.field_name):
                raise CoreV11InvariantError('current evidence contradicts supplied observation')
            if item.received_at_tau > self.tau:
                raise CoreV11InvariantError('future receipt cannot enter current frame')
        for field in fields(PresentObservation):
            value = getattr(self.observation, field.name)
            if isinstance(value, (float, int)) and not isfinite(value):
                raise CoreV11InvariantError('non-finite observation')

    def assert_current_evidence(self, refs):
        if not refs or not set(refs) <= {e.evidence_id for e in self.evidence}:
            raise CoreV11InvariantError('candidate current evidence is missing or unregistered')


@dataclass(frozen=True)
class ObservedOccurrence:
    occurrence_id: str
    occurred_at_tau: float
    received_at_tau: float
    description: str
    source_ref: str

    def __post_init__(self):
        for name in ('occurrence_id', 'description', 'source_ref'):
            require_text(getattr(self, name), name)
        if require_tau('occurred_at_tau', self.occurred_at_tau) > require_tau('received_at_tau', self.received_at_tau):
            raise CoreV11InvariantError('receipt cannot precede occurrence')


@dataclass(frozen=True)
class CompletedProcess:
    """관계 단위의 완결: neither state change nor all future consequences are required.

    This is an observation-gateway assertion, not an automatic closure classifier.
    A process can be observed without an agent action. Unobserved outcomes remain unknown.
    """
    experience_id: str
    start_tau: float
    boundary_tau: float
    known_at_tau: float
    occurrences: tuple[ObservedOccurrence, ...]
    scope_description: str
    closure_method: str
    closure_evidence_refs: tuple[str, ...]
    unresolved: tuple[str, ...] = ()

    def __post_init__(self):
        for name in ('experience_id', 'scope_description', 'closure_method'):
            require_text(getattr(self, name), name)
        start, boundary, known = (require_tau(n, getattr(self, n))
                                  for n in ('start_tau', 'boundary_tau', 'known_at_tau'))
        if not start <= boundary <= known or not self.occurrences:
            raise CoreV11InvariantError('completion requires an evidenced process boundary')
        ids = [x.occurrence_id for x in self.occurrences]
        if len(ids) != len(set(ids)):
            raise CoreV11InvariantError('duplicate occurrence in process')
        for item in self.occurrences:
            if not start <= item.occurred_at_tau <= boundary or item.received_at_tau > known:
                raise CoreV11InvariantError('occurrence is outside process or not yet known')
        if not self.closure_evidence_refs or not set(self.closure_evidence_refs) <= set(ids):
            raise CoreV11InvariantError('closure needs known occurrence references')


@dataclass(frozen=True)
class HistoricalEnvelope:
    record: HistoricalRelationRecord
    completion: CompletedProcess
    occurrence_refs: tuple[str, ...]

    def __post_init__(self):
        if (self.record.source.experience_id != self.completion.experience_id
                or self.record.source.completed_at_tau != self.completion.boundary_tau):
            raise CoreV11InvariantError('history must retain its completed process provenance')
        if not self.occurrence_refs or not set(self.occurrence_refs) <= {x.occurrence_id for x in self.completion.occurrences}:
            raise CoreV11InvariantError('historical relation needs actual occurrence provenance')

    @property
    def known_at_tau(self):
        return self.completion.known_at_tau


@dataclass(frozen=True)
class AxisObservationV12:
    """미측정은 None; 0 is a measured value, not an unknown sentinel."""
    value: float | None
    method: str
    evidence_refs: tuple[str, ...] = ()
    unavailable_reason: str = ''

    def __post_init__(self):
        require_text(self.method, 'measurement method/version')
        if self.value is None:
            require_text(self.unavailable_reason, 'unavailable_reason')
        elif (not isfinite(self.value) or not 0 <= self.value <= 1
              or not self.evidence_refs or self.unavailable_reason):
            raise CoreV11InvariantError('measured axis requires finite [0,1] value and evidence')


@dataclass(frozen=True)
class ReconstructionObservationV12:
    possibility_id: str
    observed_at_tau: float
    source_links: tuple[ProvenanceLink, ...]
    recombination: AxisObservationV12
    role_transformation: AxisObservationV12
    structural_transformation: AxisObservationV12
    comparison_basis: str
    correspondence: tuple[str, ...]

    def __post_init__(self):
        require_text(self.possibility_id, 'possibility_id')
        require_tau('observed_at_tau', self.observed_at_tau)
        require_text(self.comparison_basis, 'comparison_basis')
        if not self.correspondence:
            raise CoreV11InvariantError('reconstruction comparison correspondence required')
        if any(x.source.completed_at_tau > self.observed_at_tau for x in self.source_links):
            raise CoreV11InvariantError('future reconstruction source')

    @property
    def vector(self):
        return (self.recombination.value, self.role_transformation.value, self.structural_transformation.value)


@dataclass(frozen=True)
class ResourcePlan:
    """요구량·가용량·배정량을 구분. Domain policy supplies units and current reasoning."""
    required: float
    available: float
    allocated: float
    unit: str
    rationale: str
    unverified: tuple[str, ...]

    def __post_init__(self):
        require_text(self.unit, 'resource unit')
        require_text(self.rationale, 'current resource rationale')
        if any(not isfinite(x) or x < 0 for x in (self.required, self.available, self.allocated)):
            raise CoreV11InvariantError('invalid resource quantity')
        if self.allocated > self.available:
            raise CoreV11InvariantError('allocation exceeds available resource')
        if self.allocated < self.required and not self.unverified:
            raise CoreV11InvariantError('resource shortfall must retain unverified scope')
