from dataclasses import dataclass, field
from typing import Any, Mapping

from .common import G32InvariantError, require_tau
from .participation import ParticipationMeasurement
from .reconstruction import ProvenanceLink, ReconstructionMeasurement


@dataclass(frozen=True)
class HistoryEntry:
    entry_id: str
    decision_tau: float
    realized_tau: float
    outcome_tau: float
    relation_end_tau: float
    selected_possibility_id: str
    realization_ref: str
    realization_count: int
    outcome_description: str
    current_reality: Mapping[str, Any] = field(default_factory=dict)
    participation: tuple[ParticipationMeasurement, ...] = ()
    reconstruction: tuple[ReconstructionMeasurement, ...] = ()
    provenance: tuple[ProvenanceLink, ...] = ()
    closure_method: str = ""
    closure_evidence: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        d = require_tau("decision_tau", self.decision_tau)
        r = require_tau("realized_tau", self.realized_tau)
        o = require_tau("outcome_tau", self.outcome_tau)
        e = require_tau("relation_end_tau", self.relation_end_tau)
        if not d <= r <= o <= e:
            raise G32InvariantError("history entry violates forward causal order")
        if self.realization_count != 1:
            raise G32InvariantError("exactly one realization is required per decision epoch")
        if not self.entry_id or not self.selected_possibility_id or not self.realization_ref:
            raise G32InvariantError("history entry identifiers are required")
        if not self.outcome_description.strip():
            raise G32InvariantError("observed outcome is required")
        if not self.closure_method.strip():
            raise G32InvariantError("relation-process closure method is required")
        for item in self.participation:
            if item.observed_at_tau > d:
                raise G32InvariantError("post-decision participation cannot enter provenance")
        for item in self.reconstruction:
            if item.observed_at_tau > d:
                raise G32InvariantError("post-decision reconstruction cannot enter provenance")
        for link in self.provenance:
            if link.source.completed_at_tau > d:
                raise G32InvariantError("future experience cannot enter historical provenance")
