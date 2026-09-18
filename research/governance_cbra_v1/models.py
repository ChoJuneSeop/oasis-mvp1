from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from research.governance_harness_v01.harness import RevalidationState


class TargetKind(str, Enum):
    PARTICIPATION = "participation"
    SELECTED_CHOICE = "selected_choice"
    NONSELECTED_CHOICE = "nonselected_choice"
    RESPONSIBILITY_U = "responsibility_u"
    RESPONSIBILITY_I = "responsibility_i"
    RESPONSIBILITY_V = "responsibility_v"
    RESPONSIBILITY_T = "responsibility_t"


class AssessmentBasis(str, Enum):
    DIRECT_REALIZED = "direct_realized"
    EVIDENCE_CONSISTENCY = "evidence_consistency"


class AttributionKind(str, Enum):
    DECISION_LINKED = "decision_linked"
    EXOGENOUS = "exogenous"
    MIXED = "mixed"
    UNRESOLVED = "unresolved"


class EvidenceDirection(str, Enum):
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    INDETERMINATE = "indeterminate"


@dataclass(frozen=True)
class ParticipationProvenance:
    experience_id: str
    participate: bool
    rationale: str
    provenance_ref: str

    def __post_init__(self):
        if not self.experience_id or not self.provenance_ref:
            raise ValueError("CBRA participation provenance requires identity and provenance")


@dataclass(frozen=True)
class ResponsibilityProvenance:
    selected_candidate_id: str
    nonselected_candidate_ids: tuple[str, ...]
    uncertainty: tuple[str, ...]
    impact: tuple[str, ...]
    vulnerability: tuple[str, ...]
    temporality: tuple[str, ...]
    selected_obligations: tuple[str, ...]
    nonselected_obligations: tuple[str, ...]

    def __post_init__(self):
        if not self.selected_candidate_id:
            raise ValueError("CBRA requires one selected candidate")
        if self.selected_candidate_id in self.nonselected_candidate_ids:
            raise ValueError("selected candidate cannot also be nonselected")
        axes = (self.uncertainty, self.impact, self.vulnerability, self.temporality)
        if any(not axis for axis in axes):
            raise ValueError("CBRA requires preserved U/I/V/T responsibility provenance")
        if not self.selected_obligations:
            raise ValueError("CBRA requires selected obligations")
        if self.nonselected_candidate_ids and not self.nonselected_obligations:
            raise ValueError("CBRA requires nonselected obligations")


@dataclass(frozen=True)
class DecisionProvenanceSnapshot:
    entry_id: str
    relation_id: str
    decision_tau: float
    closure_tau: float
    participation: tuple[ParticipationProvenance, ...]
    responsibility: ResponsibilityProvenance

    def __post_init__(self):
        if not self.entry_id or not self.relation_id:
            raise ValueError("CBRA snapshot requires entry and relation identity")
        if self.closure_tau < self.decision_tau:
            raise ValueError("Closure cannot precede the decision")
        ids = tuple(x.experience_id for x in self.participation)
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate participation provenance")


@dataclass(frozen=True)
class TargetEvidence:
    target_kind: TargetKind
    target_id: str
    direction: EvidenceDirection
    attribution: AttributionKind
    evidence_refs: tuple[str, ...]
    note: str = ""

    def __post_init__(self):
        if not self.target_id:
            raise ValueError("CBRA evidence requires a target id")
        if not self.evidence_refs:
            raise ValueError("CBRA evidence requires provenance-linked evidence refs")


@dataclass(frozen=True)
class RevalidationFinding:
    target_kind: TargetKind
    target_id: str
    state: RevalidationState
    basis: AssessmentBasis
    attribution: AttributionKind
    evidence_refs: tuple[str, ...]
    note: str


@dataclass(frozen=True)
class RevalidationCheckpoint:
    entry_id: str
    relation_id: str
    observed_tau: float
    ordinal: int
    participation_findings: tuple[RevalidationFinding, ...]
    selected_choice_finding: RevalidationFinding
    nonselected_choice_findings: tuple[RevalidationFinding, ...]
    responsibility_findings: tuple[RevalidationFinding, ...]
    overall_attribution: AttributionKind
    evidence_refs: tuple[str, ...]
