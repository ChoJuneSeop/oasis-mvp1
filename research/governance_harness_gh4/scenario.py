from __future__ import annotations

from dataclasses import replace

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

from .models import EpisodeRuntime, EpisodeTruth, ScenarioCase


RELATIONS = ("GH4-REL-A", "GH4-REL-B", "GH4-REL-C")
GAP_THRESHOLD = 0.5

PILOT_FAMILIES = {
    "P1": dict(ego_speed_mps=1.3, front_gap_m=11.0, front_closing_mps=0.2, local_heading_error_deg=0.0, local_density=1),
    "P2": dict(ego_speed_mps=0.95, front_gap_m=7.5, front_closing_mps=0.7, local_heading_error_deg=0.15, local_density=3),
}

CONFIRMATORY_FAMILIES = {
    "F1_CLEAR": dict(ego_speed_mps=1.4, front_gap_m=12.0, front_closing_mps=0.1, local_heading_error_deg=0.0, local_density=1),
    "F2_SHARED": dict(ego_speed_mps=1.1, front_gap_m=9.5, front_closing_mps=0.4, local_heading_error_deg=0.05, local_density=2),
    "F3_EXPOSED": dict(ego_speed_mps=0.9, front_gap_m=7.0, front_closing_mps=0.8, local_heading_error_deg=0.2, local_density=3),
    "F4_MIXED": dict(ego_speed_mps=1.2, front_gap_m=8.5, front_closing_mps=0.6, local_heading_error_deg=-0.1, local_density=2),
}

OUTCOME_STATES = ("confirmed", "revised", "inconclusive")


def _observation(epoch: int, values: dict) -> PresentObservation:
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=float(values["ego_speed_mps"]),
        front_present=True,
        front_gap_m=float(values["front_gap_m"]),
        front_closing_mps=float(values["front_closing_mps"]),
        front_kind="vehicle",
        local_heading_error_deg=float(values["local_heading_error_deg"]),
        local_density=int(values["local_density"]),
    )


def _post_from(decision: PresentObservation, outcome_state: str, epoch: int) -> PresentObservation:
    base_heading = float(decision.local_heading_error_deg)
    sign = -1.0 if base_heading < 0 else 1.0
    if outcome_state == "confirmed":
        speed = max(0.0, decision.ego_speed_mps - 0.2)
        heading_mag = max(0.0, abs(base_heading) - 0.05)
    elif outcome_state == "revised":
        speed = decision.ego_speed_mps + 0.2
        heading_mag = abs(base_heading) + 0.2
    elif outcome_state == "inconclusive":
        speed = max(0.0, decision.ego_speed_mps - 0.2)
        heading_mag = abs(base_heading) + 0.2
    else:
        raise ValueError(outcome_state)
    heading = 0.0 if heading_mag == 0 else sign * heading_mag
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=speed,
        front_present=False,
        front_gap_m=0.0,
        front_closing_mps=0.0,
        front_kind="none",
        local_heading_error_deg=heading,
        local_density=decision.local_density,
    )


def _make_case(*, ordinal: int, relation_id: str, family: str, values: dict, gap_expected: bool, outcome_state: str, matrix_round: int) -> ScenarioCase:
    decision = _observation(10_000 + ordinal * 4 + 1, values)
    increment = 0.6 if gap_expected else 0.1
    pre = replace(decision, epoch=decision.epoch - 1, ego_speed_mps=decision.ego_speed_mps + increment)
    post = _post_from(decision, outcome_state, decision.epoch + 1)
    runtime = EpisodeRuntime(
        episode_id=f"GH4-E{ordinal:03d}",
        relation_id=relation_id,
        pre_observation=pre,
        decision_observation=decision,
        post_observation=post,
    )
    return ScenarioCase(runtime, EpisodeTruth(family, gap_expected, outcome_state, matrix_round))


def build_pilot_world() -> tuple[ScenarioCase, ...]:
    cases = []
    ordinal = 0
    for r_index, relation_id in enumerate(RELATIONS):
        for f_index, (family, values) in enumerate(PILOT_FAMILIES.items()):
            for g_index, gap_expected in enumerate((True, False)):
                ordinal += 1
                outcome_state = OUTCOME_STATES[(r_index + f_index + g_index) % 3]
                cases.append(_make_case(
                    ordinal=ordinal,
                    relation_id=relation_id,
                    family=family,
                    values=values,
                    gap_expected=gap_expected,
                    outcome_state=outcome_state,
                    matrix_round=0,
                ))
    return tuple(cases)


def build_confirmatory_world() -> tuple[ScenarioCase, ...]:
    cases = []
    ordinal = 100
    for matrix_round in range(4):
        for r_index, relation_id in enumerate(RELATIONS):
            for f_index, (family, values) in enumerate(CONFIRMATORY_FAMILIES.items()):
                for g_index, gap_expected in enumerate((True, False)):
                    ordinal += 1
                    outcome_state = OUTCOME_STATES[(matrix_round + r_index + f_index + g_index) % 3]
                    cases.append(_make_case(
                        ordinal=ordinal,
                        relation_id=relation_id,
                        family=family,
                        values=values,
                        gap_expected=gap_expected,
                        outcome_state=outcome_state,
                        matrix_round=matrix_round,
                    ))
    return tuple(cases)
