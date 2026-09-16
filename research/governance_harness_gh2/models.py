from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

ARMS = (
    "R1_CURRENT_BOUND",
    "R2_RECORD_ONLY",
    "R3_PERMUTED",
    "R4_STALE",
)

FORBIDDEN_RUNTIME_KEYS = frozenset({
    "scenario_class", "expected_action", "truth", "future", "outcome",
    "evaluator", "pilot_seed", "confirmatory_seed",
})


@dataclass(frozen=True)
class ResponsibilityContext:
    uncertainty_state: str
    impact_scope: str
    vulnerability_state: str
    temporality_state: str


@dataclass(frozen=True)
class RuntimeFrame:
    frame_id: str
    relation_id: str
    observation: PresentObservation
    responsibility_context: ResponsibilityContext


@dataclass(frozen=True)
class EvaluatorTruth:
    scenario_class: str
    expected_action: str
    pair_id: str


@dataclass(frozen=True)
class ScenarioCase:
    runtime: RuntimeFrame
    truth: EvaluatorTruth


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
class ResponsibilityTrace:
    profiles: tuple[CandidateBurden, ...]
    responsibility_selected: str
    selected_obligations: tuple[str, ...]
    nonselected_obligations: tuple[str, ...]
    context_tokens: tuple[str, ...]
    source: str


@dataclass(frozen=True)
class ArmDecision:
    arm: str
    frame_id: str
    candidate_ids: tuple[str, ...]
    possibility_distribution: Mapping[str, float]
    responsibility: ResponsibilityTrace
    enacted_selected: str
    realized_action: str
    realization_count: int
    responsibility_bound: bool
    stale_source_frame_id: str | None = None
