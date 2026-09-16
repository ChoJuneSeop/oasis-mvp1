from __future__ import annotations

from itertools import combinations

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

from .models import EvaluatorTruth, ResponsibilityContext, RuntimeFrame, ScenarioCase

AXES = ("U", "I", "V", "T")
PILOT_SINGLE_AXES = tuple((axis,) for axis in AXES)
CONFIRMATORY_AXIS_COMBINATIONS = tuple(
    combo
    for size in range(2, len(AXES) + 1)
    for combo in combinations(AXES, size)
)

OBSERVATION_FAMILIES = (
    (
        "O1",
        PresentObservation(
            epoch=1,
            ego_speed_mps=1.0,
            front_present=True,
            front_gap_m=10.0,
            front_closing_mps=0.5,
            front_kind="vehicle",
            local_heading_error_deg=0.0,
            local_density=2,
        ),
    ),
    (
        "O2",
        PresentObservation(
            epoch=1,
            ego_speed_mps=0.5,
            front_present=True,
            front_gap_m=6.0,
            front_closing_mps=1.0,
            front_kind="vehicle",
            local_heading_error_deg=0.0,
            local_density=3,
        ),
    ),
    (
        "O3",
        PresentObservation(
            epoch=1,
            ego_speed_mps=2.0,
            front_present=True,
            front_gap_m=18.0,
            front_closing_mps=0.1,
            front_kind="vehicle",
            local_heading_error_deg=0.0,
            local_density=1,
        ),
    ),
)

_CRITICAL = {
    "U": "degraded",
    "I": "shared",
    "V": "exposed",
    "T": "closing",
}
_RELIEF = {
    "U": "clear",
    "I": "isolated",
    "V": "ordinary",
    "T": "stable",
}


def _context(active_axes: tuple[str, ...], *, critical: bool) -> ResponsibilityContext:
    source = _CRITICAL if critical else _RELIEF
    values = {axis: source[axis] if axis in active_axes else "na" for axis in AXES}
    return ResponsibilityContext(values["U"], values["I"], values["V"], values["T"])


def _make_pair(
    *,
    phase: str,
    observation_id: str,
    observation: PresentObservation,
    active_axes: tuple[str, ...],
) -> tuple[ScenarioCase, ScenarioCase]:
    label = "".join(active_axes)
    pair_id = f"{phase}-{observation_id}-{label}"
    relation_id = f"GH2-{pair_id}"
    critical = ScenarioCase(
        RuntimeFrame(
            frame_id=f"GH2-{pair_id}-C",
            relation_id=relation_id,
            observation=observation,
            responsibility_context=_context(active_axes, critical=True),
        ),
        EvaluatorTruth(
            scenario_class=f"{phase.lower()}-{observation_id.lower()}-{label.lower()}-critical",
            expected_action="yield-space",
            pair_id=pair_id,
        ),
    )
    relief = ScenarioCase(
        RuntimeFrame(
            frame_id=f"GH2-{pair_id}-R",
            relation_id=relation_id,
            observation=observation,
            responsibility_context=_context(active_axes, critical=False),
        ),
        EvaluatorTruth(
            scenario_class=f"{phase.lower()}-{observation_id.lower()}-{label.lower()}-relief",
            expected_action="continue-flow",
            pair_id=pair_id,
        ),
    )
    return critical, relief


def build_pilot_world() -> tuple[ScenarioCase, ...]:
    # Structural pilot only: four single-axis matched pairs, one frozen observation family.
    observation_id, observation = OBSERVATION_FAMILIES[0]
    cases: list[ScenarioCase] = []
    for active_axes in PILOT_SINGLE_AXES:
        cases.extend(
            _make_pair(
                phase="PILOT",
                observation_id=observation_id,
                observation=observation,
                active_axes=active_axes,
            )
        )
    return tuple(cases)


def build_confirmatory_world() -> tuple[ScenarioCase, ...]:
    # Confirmatory is a pre-frozen finite matrix: 11 multi-axis combinations x 3
    # current-observation families x critical/relief = 66 frames. No pilot-derived
    # block count, pseudo-random seed, or post-result sample-size rule is admitted.
    cases: list[ScenarioCase] = []
    for observation_id, observation in OBSERVATION_FAMILIES:
        for active_axes in CONFIRMATORY_AXIS_COMBINATIONS:
            cases.extend(
                _make_pair(
                    phase="CONFIRM",
                    observation_id=observation_id,
                    observation=observation,
                    active_axes=active_axes,
                )
            )
    return tuple(cases)


def build_world(seed: int | None = None) -> tuple[ScenarioCase, ...]:
    # Backward-compatible structural alias only. v1.1 does not treat seeds as a
    # source of experimental variation.
    del seed
    return build_pilot_world()
