from __future__ import annotations

from itertools import combinations

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

from .models import EvaluatorTruth, ResponsibilityContext, RuntimeFrame, ScenarioCase

AXES = ("U", "I", "V", "T")
CRITICAL = {"U": "degraded", "I": "shared", "V": "exposed", "T": "closing"}
RELIEF = {"U": "clear", "I": "isolated", "V": "ordinary", "T": "stable"}
NEUTRAL = {"U": "na", "I": "na", "V": "na", "T": "na"}

PILOT_COMBOS = (("U",), ("I",), ("V",), ("T",))
CONFIRMATORY_COMBOS = tuple(
    combo
    for size in (2, 3, 4)
    for combo in combinations(AXES, size)
)

OBSERVATION_FAMILIES = (
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
    PresentObservation(
        epoch=1,
        ego_speed_mps=2.0,
        front_present=True,
        front_gap_m=7.5,
        front_closing_mps=0.2,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=1,
    ),
    PresentObservation(
        epoch=1,
        ego_speed_mps=0.5,
        front_present=True,
        front_gap_m=14.0,
        front_closing_mps=0.8,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=3,
    ),
)


def _context(combo: tuple[str, ...], mode: str) -> ResponsibilityContext:
    source = CRITICAL if mode == "critical" else RELIEF
    values = dict(NEUTRAL)
    for axis in combo:
        values[axis] = source[axis]
    return ResponsibilityContext(values["U"], values["I"], values["V"], values["T"])


def _expected(mode: str) -> str:
    return "yield-space" if mode == "critical" else "continue-flow"


def _make_pair(
    *,
    combo: tuple[str, ...],
    observation: PresentObservation,
    family_id: str,
    ordinal: int,
    prefix: str,
) -> tuple[ScenarioCase, ScenarioCase]:
    combo_id = "".join(combo)
    pair_id = f"{prefix}-{family_id}-{combo_id}-{ordinal:02d}"
    relation_id = f"GH2-{pair_id}"
    critical_id = f"{pair_id}-C"
    relief_id = f"{pair_id}-R"
    return (
        ScenarioCase(
            RuntimeFrame(critical_id, relation_id, observation, _context(combo, "critical")),
            EvaluatorTruth(f"{combo_id}-critical", _expected("critical"), pair_id),
        ),
        ScenarioCase(
            RuntimeFrame(relief_id, relation_id, observation, _context(combo, "relief")),
            EvaluatorTruth(f"{combo_id}-relief", _expected("relief"), pair_id),
        ),
    )


def build_pilot_world() -> tuple[ScenarioCase, ...]:
    observation = OBSERVATION_FAMILIES[0]
    cases: list[ScenarioCase] = []
    for ordinal, combo in enumerate(PILOT_COMBOS, 1):
        cases.extend(_make_pair(
            combo=combo,
            observation=observation,
            family_id="P1",
            ordinal=ordinal,
            prefix="PILOT",
        ))
    return tuple(cases)


def build_confirmatory_world() -> tuple[ScenarioCase, ...]:
    cases: list[ScenarioCase] = []
    ordinal = 0
    for family_index, observation in enumerate(OBSERVATION_FAMILIES, 1):
        family_id = f"F{family_index}"
        for combo in CONFIRMATORY_COMBOS:
            ordinal += 1
            cases.extend(_make_pair(
                combo=combo,
                observation=observation,
                family_id=family_id,
                ordinal=ordinal,
                prefix="CONF",
            ))
    return tuple(cases)


def build_world(seed: int) -> tuple[ScenarioCase, ...]:
    """Compatibility alias retained for old callers; v1.1 does not treat seed as variation."""
    del seed
    return build_pilot_world()
