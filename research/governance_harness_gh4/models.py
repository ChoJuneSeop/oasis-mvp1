from __future__ import annotations

from dataclasses import dataclass

from research.carla_v22_harness_v11.canonical_harness import PresentObservation


ARMS = (
    "H1_FULL_INTEGRATED",
    "H2_FROZEN_NEW_CE",
    "H3_FEEDBACK_RECORD_ONLY",
    "H4_RESPONSIBILITY_RECORD_ONLY",
    "H5_NONSELECTIVE_HISTORY",
)

FORBIDDEN_OPERATOR_RUNTIME_KEYS = frozenset({
    "outcome_state",
    "expected_action",
    "ground_truth",
    "evaluator_label",
    "future_state",
    "scenario_class",
})


@dataclass(frozen=True)
class EpisodeRuntime:
    episode_id: str
    relation_id: str
    pre_observation: PresentObservation
    decision_observation: PresentObservation
    post_observation: PresentObservation


@dataclass(frozen=True)
class EpisodeTruth:
    family: str
    gap_expected: bool
    outcome_state: str
    matrix_round: int


@dataclass(frozen=True)
class ScenarioCase:
    runtime: EpisodeRuntime
    truth: EpisodeTruth


@dataclass(frozen=True)
class CandidateBurden:
    candidate_id: str
    uncertainty: frozenset[str]
    impact: frozenset[str]
    vulnerability: frozenset[str]
    temporality: frozenset[str]

    def axes(self) -> tuple[frozenset[str], ...]:
        return (self.uncertainty, self.impact, self.vulnerability, self.temporality)


@dataclass(frozen=True)
class EpochResult:
    arm: str
    episode_id: str
    relation_id: str
    gap_detected: bool
    archive_access_count: int
    decision_eligible_ids: tuple[str, ...]
    decision_eligible_completed_taus: tuple[float, ...]
    participant_ids: tuple[str, ...]
    revised_block_count: int
    feedback_exposed_count: int
    responsibility_candidate_ids: tuple[str, ...]
    responsibility_selected: str
    responsibility_bound: bool
    selected: str
    realized: str
    realization_count: int
    revalidation_state: str
    closure_entry_id: str
    stored_experience_count_after: int
    run_created_experience_count_after: int
