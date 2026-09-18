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


class ClaimOutcome(str, Enum):
    UNTESTED = "UNTESTED"
    SUPPORTS = "SUPPORTS"
    DOES_NOT_SUPPORT = "DOES_NOT_SUPPORT"
    INCONCLUSIVE = "INCONCLUSIVE"
    INVALID = "INVALID"


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
    execution_profile_id: str
    required_execution_check_ids: tuple[str, ...]
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
    evaluator_truth_joined_after_worker_sealed: bool
    authoritative_outcome_observation: bool
    decision_worker_forbidden_inputs: tuple[str, ...]
    provenance_chain: tuple[str, ...]
    replication_plan: str
    claim_boundary: tuple[str, ...]
    pre_registered: bool
    confirmatory_size_or_matrix_rule_pre_registered: bool
    pilot_confirmatory_disjoint: bool
    post_result_retuning_forbidden: bool
    future_leakage_guard: bool
    no_aggregate_winner_score: bool
    integrated_flow_baseline: bool
    production_history_append_only: bool
    production_no_permanent_memory_weight: bool
    production_no_destructive_no: bool
    ablation_mutations_declared: bool
    relation_context_controls: tuple[str, ...] = ()
    responsibility_controls: tuple[str, ...] = ()
    responsibility_non_scalar: bool = False
    selected_nonselected_obligations: bool = False
    experience_identity_control: bool = False
    relation_order_ablation: bool = False
    participation_yes_no_provenance: bool = False
    same_current_context_across_contrast: bool = False
    behavior_endpoint: bool = False
    effectiveness_endpoint: bool = False
    conflicting_experience_count: int = 0
    conflict_operational_definition: str = ""
    conflict_order_preserved: bool = False
    no_scalar_conflict_overwrite: bool = False
    no_global_exclusion_control: bool = False
    attribution_controls: tuple[str, ...] = ()
    wrongness_defined_only_post_outcome: bool = False
    adverse_outcome_criterion: str = ""
    adverse_change_realization_endpoint: bool = False
    post_outcome_contradiction_endpoint: bool = False
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
    execution_profile_id: str
    required_execution_check_ids: tuple[str, ...]
    checks: tuple[DesignCheck, ...]
    targeted_axes: tuple[AxisId, ...]
    proof_ready: bool
    unresolved_check_ids: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "execution_profile_id": self.execution_profile_id,
            "required_execution_check_ids": list(self.required_execution_check_ids),
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
    claim_outcome: ClaimOutcome
    verified_obligations: tuple[str, ...]
    review_method: str
    result_rule_ref: str
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class PortfolioReport:
    program_id: str
    axis_coverage: dict[str, tuple[str, ...]]
    missing_axes: tuple[str, ...]
    weak_axes: tuple[str, ...]
    unsupported_axes: tuple[str, ...]
    inconclusive_axes: tuple[str, ...]
    supported_axes: tuple[str, ...]
    next_required_axis: str | None
    integration_evidence_ids: tuple[str, ...]
    integration_supported: bool
    proof_complete: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "program_id": self.program_id,
            "axis_coverage": {k: list(v) for k, v in self.axis_coverage.items()},
            "missing_axes": list(self.missing_axes),
            "weak_axes": list(self.weak_axes),
            "unsupported_axes": list(self.unsupported_axes),
            "inconclusive_axes": list(self.inconclusive_axes),
            "supported_axes": list(self.supported_axes),
            "next_required_axis": self.next_required_axis,
            "integration_evidence_ids": list(self.integration_evidence_ids),
            "integration_supported": self.integration_supported,
            "proof_complete": self.proof_complete,
            "blockers": list(self.blockers),
        }


@dataclass(frozen=True)
class ProgramSequenceReport:
    program_id: str
    requested_experiment_id: str
    next_required_axis: str | None
    targeted_axes: tuple[str, ...]
    sequence_ready: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "program_id": self.program_id,
            "requested_experiment_id": self.requested_experiment_id,
            "next_required_axis": self.next_required_axis,
            "targeted_axes": list(self.targeted_axes),
            "sequence_ready": self.sequence_ready,
            "blockers": list(self.blockers),
        }


@dataclass(frozen=True)
class ThreeLensReviewReport:
    experiment_id: str
    definition_pass: bool
    causal_pass: bool
    execution_pass: bool
    all_three_pass: bool
    definition_blockers: tuple[str, ...]
    causal_blockers: tuple[str, ...]
    execution_blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "definition_pass": self.definition_pass,
            "causal_pass": self.causal_pass,
            "execution_pass": self.execution_pass,
            "all_three_pass": self.all_three_pass,
            "definition_blockers": list(self.definition_blockers),
            "causal_blockers": list(self.causal_blockers),
            "execution_blockers": list(self.execution_blockers),
        }


@dataclass(frozen=True)
class ExperimentReadinessReport:
    experiment_id: str
    scientific_design_ready: bool
    sequence_ready: bool
    three_lens_ready: bool
    experiment_ready: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "scientific_design_ready": self.scientific_design_ready,
            "sequence_ready": self.sequence_ready,
            "three_lens_ready": self.three_lens_ready,
            "experiment_ready": self.experiment_ready,
            "blockers": list(self.blockers),
        }
