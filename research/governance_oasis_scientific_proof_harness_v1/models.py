from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class AxisId(str, Enum):
    A1_BEHAVIOR_CHANGE_EFFECTIVENESS = "A1_BEHAVIOR_CHANGE_EFFECTIVENESS"
    A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY = "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY"
    A3_RESPONSIBILITY_SENSITIVITY = "A3_RESPONSIBILITY_SENSITIVITY"
    A4_OVERGENERALIZATION_PREVENTION = "A4_OVERGENERALIZATION_PREVENTION"
    A5_CONFLICTING_EXPERIENCE_HANDLING = "A5_CONFLICTING_EXPERIENCE_HANDLING"
    A6_WRONG_BEHAVIOR_RECOVERY = "A6_WRONG_BEHAVIOR_RECOVERY"


class DesignStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    BLOCKED = "BLOCKED"
    UNVERIFIED = "UNVERIFIED"


class EvidenceLevel(str, Enum):
    DESIGN_ONLY = "DESIGN_ONLY"
    STRUCTURAL_ONLY = "STRUCTURAL_ONLY"
    PILOT_ONLY = "PILOT_ONLY"
    CONFIRMATORY = "CONFIRMATORY"
    INTEGRATED_CONFIRMATORY = "INTEGRATED_CONFIRMATORY"


@dataclass(frozen=True)
class CausalContrast:
    contrast_id: str
    treatment: str
    control: str
    targeted_mechanism: str
    held_constant: tuple[str, ...]
    observable_ids: tuple[str, ...]
    falsification_condition: str
    mechanism_removed_or_permuted: bool = True
    expected_direction_required: bool = False

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        for key in ("held_constant", "observable_ids"):
            data[key] = list(data[key])
        return data


@dataclass(frozen=True)
class ExperimentDesign:
    experiment_id: str
    purpose: str
    targeted_axes: tuple[AxisId, ...]
    claim_ids: tuple[str, ...]
    evidence_level: EvidenceLevel
    hypothesis: str
    null_or_falsification: str
    temporal_order: tuple[str, ...]
    observables: tuple[str, ...]
    contrasts: tuple[CausalContrast, ...]
    independent_evaluator: bool
    evaluator_blinded_to: tuple[str, ...]
    provenance_chain: tuple[str, ...]
    replication_plan: str
    claim_boundary: tuple[str, ...]
    pre_registered: bool
    future_leakage_guard: bool
    no_aggregate_winner_score: bool
    integrated_flow_baseline: bool
    relation_context_controls: tuple[str, ...] = ()
    responsibility_controls: tuple[str, ...] = ()
    responsibility_non_scalar: bool = False
    experience_identity_control: bool = False
    relation_order_ablation: bool = False
    behavior_endpoint: bool = False
    effectiveness_endpoint: bool = False
    conflicting_experience_count: int = 0
    conflict_order_preserved: bool = False
    no_scalar_conflict_overwrite: bool = False
    recovery_epochs: int = 0
    recovery_endpoint: bool = False
    post_outcome_revalidation_control: bool = False
    structural_only: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class DesignCheck:
    check_id: str
    status: DesignStatus
    summary: str
    axis: AxisId | None = None
    evidence: tuple[str, ...] = ()
    blocking: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "status": self.status.value,
            "summary": self.summary,
            "axis": None if self.axis is None else self.axis.value,
            "evidence": list(self.evidence),
            "blocking": self.blocking,
        }


@dataclass(frozen=True)
class ProofDesignReport:
    experiment_id: str
    checks: tuple[DesignCheck, ...]
    targeted_axes: tuple[AxisId, ...]
    proof_ready: bool
    unresolved_check_ids: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "checks": [item.as_dict() for item in self.checks],
            "targeted_axes": [axis.value for axis in self.targeted_axes],
            "proof_ready": self.proof_ready,
            "unresolved_check_ids": list(self.unresolved_check_ids),
        }


@dataclass(frozen=True)
class EvidenceRecord:
    evidence_id: str
    experiment_id: str
    axes: tuple[AxisId, ...]
    level: EvidenceLevel
    design_report_passed: bool
    result_status: str
    source_refs: tuple[str, ...]
    claim_boundary: tuple[str, ...]
    counts_toward_axis_proof: bool
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class PortfolioReport:
    program_id: str
    axis_coverage: dict[str, tuple[str, ...]]
    missing_axes: tuple[str, ...]
    weak_axes: tuple[str, ...]
    integration_evidence_ids: tuple[str, ...]
    proof_complete: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "program_id": self.program_id,
            "axis_coverage": {k: list(v) for k, v in self.axis_coverage.items()},
            "missing_axes": list(self.missing_axes),
            "weak_axes": list(self.weak_axes),
            "integration_evidence_ids": list(self.integration_evidence_ids),
            "proof_complete": self.proof_complete,
            "blockers": list(self.blockers),
        }
