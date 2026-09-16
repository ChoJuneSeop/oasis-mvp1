from __future__ import annotations

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

from .models import EvaluatorTruth, ResponsibilityContext, RuntimeFrame, ScenarioCase


SCENARIO_PLAN = (
    ("uncertainty-critical", ResponsibilityContext("degraded", "na", "na", "na"), "yield-space", "PAIR-U"),
    ("uncertainty-relief", ResponsibilityContext("clear", "na", "na", "na"), "continue-flow", "PAIR-U"),
    ("impact-critical", ResponsibilityContext("na", "shared", "na", "na"), "yield-space", "PAIR-I"),
    ("impact-relief", ResponsibilityContext("na", "isolated", "na", "na"), "continue-flow", "PAIR-I"),
    ("vulnerability-critical", ResponsibilityContext("na", "na", "exposed", "na"), "yield-space", "PAIR-V"),
    ("vulnerability-relief", ResponsibilityContext("na", "na", "ordinary", "na"), "continue-flow", "PAIR-V"),
    ("temporality-critical", ResponsibilityContext("na", "na", "na", "closing"), "yield-space", "PAIR-T"),
    ("temporality-relief", ResponsibilityContext("na", "na", "na", "stable"), "continue-flow", "PAIR-T"),
)


def build_world(seed: int) -> tuple[ScenarioCase, ...]:
    # Seed is intentionally recorded but does not alter the frozen paired contexts in v1.0.
    # Confirmatory randomness, if later admitted, may alter presentation order only through a new frozen version.
    del seed
    observation = PresentObservation(
        epoch=1,
        ego_speed_mps=1.0,
        front_present=True,
        front_gap_m=10.0,
        front_closing_mps=0.5,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=2,
    )
    cases = []
    for index, (scenario_class, ctx, expected, pair_id) in enumerate(SCENARIO_PLAN, 1):
        frame_id = f"GH2-F{index:02d}"
        cases.append(ScenarioCase(
            RuntimeFrame(frame_id, "GH2-REL", observation, ctx),
            EvaluatorTruth(scenario_class, expected, pair_id),
        ))
    return tuple(cases)
