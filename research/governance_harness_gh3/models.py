from __future__ import annotations

from dataclasses import dataclass

from research.carla_v22_harness_v11.canonical_harness import PresentObservation


ARMS = (
    "F1_ACTIVE_CORRECT",
    "F2_RECORD_ONLY",
    "F3_PERMUTED_STATE",
)

FORBIDDEN_RUNTIME_KEYS = frozenset({
    "outcome_state",
    "expected_revalidation_state",
    "expected_action",
    "evaluator_label",
    "future_state",
    "ground_truth",
    "scenario_class",
    "scope_mode",
})


@dataclass(frozen=True)
class ChainRuntime:
    chain_id: str
    relation_id: str
    antecedent_pre: PresentObservation
    antecedent_decision: PresentObservation
    antecedent_post: PresentObservation
    recurrence_pre: PresentObservation
    recurrence_decision: PresentObservation
    recurrence_post: PresentObservation


@dataclass(frozen=True)
class ChainTruth:
    outcome_state: str
    scope_mode: str
    family: str


@dataclass(frozen=True)
class ScenarioCase:
    runtime: ChainRuntime
    truth: ChainTruth


@dataclass(frozen=True)
class ChainResult:
    arm: str
    chain_id: str
    relation_id: str
    antecedent_gap: bool
    antecedent_participants: tuple[str, ...]
    antecedent_selected: str
    antecedent_realized: str
    antecedent_revalidation_state: str
    committed_feedback_state: str
    recurrence_gap: bool
    recurrence_exposed_feedback_state: str | None
    recurrence_participants: tuple[str, ...]
    recurrence_selected: str
    recurrence_realized: str
    baseline_decision_eligible_count: int
    stored_experience_count_after_antecedent: int
    recurrence_decision_eligible_count: int
    recurrence_new_ce_exposed: bool
    realization_count: int
