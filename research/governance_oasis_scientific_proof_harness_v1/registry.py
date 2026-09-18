from __future__ import annotations

from dataclasses import dataclass

from .models import AxisId


@dataclass(frozen=True)
class AxisContract:
    axis: AxisId
    title_ko: str
    scientific_question: str
    mandatory_obligations: tuple[str, ...]
    prohibited_shortcuts: tuple[str, ...]


AXIS_CONTRACTS: dict[AxisId, AxisContract] = {
    AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS: AxisContract(
        axis=AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS,
        title_ko="행동변화 및 효과성",
        scientific_question=(
            "Completed Experience 또는 사후 재검증 정보가 나중의 실제 선택/행동을 "
            "인과적으로 변화시키며, 그 변화가 사전 정의된 행동·효과 관측량에서 드러나는가?"
        ),
        mandatory_obligations=(
            "behavior_endpoint",
            "effectiveness_endpoint",
            "mechanism_removal_contrast",
            "same_current_context_across_contrast",
        ),
        prohibited_shortcuts=(
            "structural_pass_as_effectiveness",
            "overall_winner_score",
        ),
    ),
    AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY: AxisContract(
        axis=AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY,
        title_ko="경험 기여 추적성",
        scientific_question=(
            "어떤 Completed Experience의 어떤 관계/순서 이력이 이후 참여·선택·결과 변화에 "
            "기여했는지를 provenance로 추적하고 인과적으로 분리할 수 있는가?"
        ),
        mandatory_obligations=(
            "provenance_chain",
            "experience_identity_control",
            "relation_ablation",
            "order_ablation",
            "participation_yes_no_provenance",
            "mechanism_removal_contrast",
        ),
        prohibited_shortcuts=(
            "memory_count_only",
            "anonymous_history_effect",
        ),
    ),
    AxisId.A3_RESPONSIBILITY_SENSITIVITY: AxisContract(
        axis=AxisId.A3_RESPONSIBILITY_SENSITIVITY,
        title_ko="책임 민감도",
        scientific_question=(
            "현재 가능성 집합 이후 형성되는 U/I/V/T 책임 정보가 단순 기록이 아니라 "
            "선택에 인과적으로 결속되는가?"
        ),
        mandatory_obligations=(
            "responsibility_record_only_control",
            "responsibility_content_control",
            "responsibility_non_scalar",
            "selected_nonselected_obligations",
        ),
        prohibited_shortcuts=(
            "scalar_responsibility_score",
            "responsibility_logged_but_not_bound",
        ),
    ),
    AxisId.A4_OVERGENERALIZATION_PREVENTION: AxisContract(
        axis=AxisId.A4_OVERGENERALIZATION_PREVENTION,
        title_ko="과잉 일반화 방지",
        scientific_question=(
            "과거 경험 또는 REVISED/NO 판단의 영향이 현재 관련 관계에만 적용되고 "
            "무관한 관계나 바뀐 문맥으로 전역 확산되지 않는가?"
        ),
        mandatory_obligations=(
            "same_scope_control",
            "changed_scope_control",
            "unrelated_relation_control",
            "no_global_exclusion",
        ),
        prohibited_shortcuts=(
            "permanent_global_ban",
            "single_context_only",
        ),
    ),
    AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING: AxisContract(
        axis=AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING,
        title_ko="충돌 경험 처리",
        scientific_question=(
            "서로 다른 방향을 지지하는 복수 Completed Experience가 함께 존재할 때 "
            "원기록·관계·순서를 보존하면서 현재 관계에서 선택적으로 처리할 수 있는가?"
        ),
        mandatory_obligations=(
            "multiple_conflicting_completed_experiences",
            "conflict_operational_definition",
            "conflict_order_preserved",
            "participation_yes_no_provenance",
            "no_scalar_conflict_overwrite",
            "conflict_specific_causal_contrast",
        ),
        prohibited_shortcuts=(
            "latest_experience_wins",
            "single_scalar_memory_weight",
            "destructive_overwrite",
        ),
    ),
    AxisId.A6_WRONG_BEHAVIOR_RECOVERY: AxisContract(
        axis=AxisId.A6_WRONG_BEHAVIOR_RECOVERY,
        title_ko="잘못된 행동변화 복구",
        scientific_question=(
            "과거 경험 때문에 잘못된 행동변화가 실제로 발생한 뒤 후속 현실 결과가 그 판단을 "
            "재검증하고, 이후 관련 관계에서 행동 구조가 복구되는가?"
        ),
        mandatory_obligations=(
            "adverse_change_realization_endpoint",
            "wrongness_defined_post_outcome",
            "authoritative_outcome_observation",
            "decision_linked_and_exogenous_attribution_controls",
            "same_scope_and_unrelated_relation_controls",
            "post_outcome_contradiction_endpoint",
            "later_recurrence",
            "recovery_endpoint",
            "revalidation_ablation",
        ),
        prohibited_shortcuts=(
            "immediate_relabel_without_behavior",
            "counterfactual_recovery",
            "same_epoch_feedback",
        ),
    ),
}


MANDATORY_TEMPORAL_ORDER = (
    "CURRENT_FLOW",
    "RELATION_PROCESS",
    "HISTORY_NEED_GATE",
    "PARTICIPATION",
    "POSSIBILITY_DISTRIBUTION",
    "RESPONSIBILITY",
    "DECISION",
    "SINGLE_REALIZATION",
    "POST_OUTCOME_OBSERVATION",
    "CLOSURE",
    "REVALIDATION",
    "COMMIT",
    "LATER_CURRENT_FLOW",
    "LATER_RELATION_PROCESS",
    "LATER_HISTORY_NEED_GATE",
    "LATER_PARTICIPATION",
    "LATER_POSSIBILITY_DISTRIBUTION",
    "LATER_RESPONSIBILITY",
    "LATER_DECISION",
    "LATER_SINGLE_REALIZATION",
)


PROGRAM_INTEGRATION_REQUIREMENTS = (
    "all_six_axes_have_confirmatory_evidence",
    "integrated_flow_preservation_experiment",
    "no_future_information",
    "single_realization",
    "provenance_continuity",
    "claim_boundaries_preserved",
)


CLAIM_AXIS_MAP: dict[str, AxisId | None] = {
    "GO-A1-C1": AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS,
    "GO-A1-C2": AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS,
    "GO-A2-C1": AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY,
    "GO-A2-C2": AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY,
    "GO-A3-C1": AxisId.A3_RESPONSIBILITY_SENSITIVITY,
    "GO-A4-C1": AxisId.A4_OVERGENERALIZATION_PREVENTION,
    "GO-A5-C1": AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING,
    "GO-A6-C1": AxisId.A6_WRONG_BEHAVIOR_RECOVERY,
    "GO-INTEGRATED-C1": None,
}

CLAIM_DESCRIPTIONS: dict[str, str] = {
    "GO-A1-C1": "Completed Experience or post-outcome governance evidence causally changes a later realized decision path.",
    "GO-A1-C2": "The induced behavior change is visible in a prespecified effectiveness endpoint, not merely a structural trace.",
    "GO-A2-C1": "The contribution of a specific Completed Experience identity is provenance-traceable and causally distinguishable.",
    "GO-A2-C2": "Relation/process/order history contributes beyond an unordered set of remembered items.",
    "GO-A3-C1": "Dynamic U/I/V/T responsibility is causally bound to choice rather than merely recorded.",
    "GO-A4-C1": "Prior experience/revalidation influence remains relation-context local and does not become global exclusion.",
    "GO-A5-C1": "Conflicting Completed Experiences are preserved and resolved contextually without destructive scalar overwrite.",
    "GO-A6-C1": "A behavior change induced by prior experience can be classified as adverse only after authoritative outcome observation, provenance-bound revalidated, and later related behavior can recover.",
    "GO-INTEGRATED-C1": "The six governance functions coexist in one flow-preserving integrated experiment without violating temporal causality or single realization.",
}


REQUIRED_CLAIMS_BY_AXIS: dict[AxisId, tuple[str, ...]] = {
    AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS: ("GO-A1-C1", "GO-A1-C2"),
    AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY: ("GO-A2-C1", "GO-A2-C2"),
    AxisId.A3_RESPONSIBILITY_SENSITIVITY: ("GO-A3-C1",),
    AxisId.A4_OVERGENERALIZATION_PREVENTION: ("GO-A4-C1",),
    AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING: ("GO-A5-C1",),
    AxisId.A6_WRONG_BEHAVIOR_RECOVERY: ("GO-A6-C1",),
}

MANDATORY_EXECUTION_CHECK_IDS = (
    "source_freeze",
    "world_isolation",
    "cross_arm_identity",
    "future_leakage",
    "evaluator_postjoin",
    "single_realization",
    "provenance_integrity",
    "output_immutability",
)
