from __future__ import annotations

from dataclasses import replace

from research.carla_v22_harness_v11.canonical_harness import PresentObservation

from .models import ChainRuntime, ChainTruth, ScenarioCase


PILOT_FAMILIES = {
    "P1": dict(
        ego_speed_mps=1.0,
        front_present=True,
        front_gap_m=10.0,
        front_closing_mps=0.5,
        local_heading_error_deg=0.0,
        local_density=2,
    ),
}

CONFIRMATORY_FAMILIES = {
    "F1": dict(
        ego_speed_mps=1.2,
        front_present=True,
        front_gap_m=9.0,
        front_closing_mps=0.4,
        local_heading_error_deg=0.0,
        local_density=1,
    ),
    "F2": dict(
        ego_speed_mps=0.8,
        front_present=True,
        front_gap_m=11.0,
        front_closing_mps=0.7,
        local_heading_error_deg=0.1,
        local_density=2,
    ),
    "F3": dict(
        ego_speed_mps=1.4,
        front_present=True,
        front_gap_m=8.0,
        front_closing_mps=0.3,
        local_heading_error_deg=-0.1,
        local_density=3,
    ),
}

OUTCOME_STATES = ("confirmed", "revised", "inconclusive")
RECURRENCE_SCOPES = ("same_scope", "shifted_scope")
GAP_SPEED_INCREMENT = 0.6


def _observation(epoch: int, values: dict) -> PresentObservation:
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=float(values["ego_speed_mps"]),
        front_present=bool(values["front_present"]),
        front_gap_m=float(values["front_gap_m"]),
        front_closing_mps=float(values["front_closing_mps"]),
        front_kind="vehicle" if values["front_present"] else "none",
        local_heading_error_deg=float(values["local_heading_error_deg"]),
        local_density=int(values["local_density"]),
    )


def _heading_with_delta(base: float, magnitude_delta: float) -> float:
    magnitude = max(0.0, abs(float(base)) + float(magnitude_delta))
    if magnitude == 0.0:
        return 0.0
    sign = -1.0 if float(base) < 0.0 else 1.0
    return sign * magnitude


def _post_from(decision: PresentObservation, outcome_state: str, epoch: int) -> PresentObservation:
    if outcome_state == "confirmed":
        speed = max(0.0, decision.ego_speed_mps - 0.2)
        heading = _heading_with_delta(decision.local_heading_error_deg, -0.05)
    elif outcome_state == "revised":
        speed = decision.ego_speed_mps + 0.2
        heading = _heading_with_delta(decision.local_heading_error_deg, 0.2)
    elif outcome_state == "inconclusive":
        speed = max(0.0, decision.ego_speed_mps - 0.2)
        heading = _heading_with_delta(decision.local_heading_error_deg, 0.2)
    else:
        raise ValueError(outcome_state)
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


def _recurrence_post(decision: PresentObservation, epoch: int) -> PresentObservation:
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=max(0.0, decision.ego_speed_mps - 0.1),
        front_present=False,
        front_gap_m=0.0,
        front_closing_mps=0.0,
        front_kind="none",
        local_heading_error_deg=decision.local_heading_error_deg,
        local_density=decision.local_density,
    )


def _make_case(
    *,
    ordinal: int,
    family: str,
    values: dict,
    outcome_state: str,
    scope_mode: str,
) -> ScenarioCase:
    relation_id = f"GH3-REL-{ordinal:03d}"
    chain_id = f"GH3-C{ordinal:03d}"

    decision = _observation(1000 + ordinal * 10 + 1, values)
    pre = replace(
        decision,
        epoch=decision.epoch - 1,
        ego_speed_mps=decision.ego_speed_mps + GAP_SPEED_INCREMENT,
    )
    post = _post_from(decision, outcome_state, decision.epoch + 1)

    density_delta = 0 if scope_mode == "same_scope" else 1
    recurrence_decision = replace(
        decision,
        epoch=decision.epoch + 3,
        local_density=decision.local_density + density_delta,
    )
    recurrence_pre = replace(
        recurrence_decision,
        epoch=recurrence_decision.epoch - 1,
        ego_speed_mps=recurrence_decision.ego_speed_mps + GAP_SPEED_INCREMENT,
    )
    recurrence_post = _recurrence_post(recurrence_decision, recurrence_decision.epoch + 1)

    runtime = ChainRuntime(
        chain_id=chain_id,
        relation_id=relation_id,
        antecedent_pre=pre,
        antecedent_decision=decision,
        antecedent_post=post,
        recurrence_pre=recurrence_pre,
        recurrence_decision=recurrence_decision,
        recurrence_post=recurrence_post,
    )
    return ScenarioCase(runtime, ChainTruth(outcome_state, scope_mode, family))


def build_pilot_world() -> tuple[ScenarioCase, ...]:
    cases = []
    ordinal = 0
    for family, values in PILOT_FAMILIES.items():
        for outcome_state in OUTCOME_STATES:
            ordinal += 1
            cases.append(_make_case(
                ordinal=ordinal,
                family=family,
                values=values,
                outcome_state=outcome_state,
                scope_mode="same_scope",
            ))
    return tuple(cases)


def build_confirmatory_world() -> tuple[ScenarioCase, ...]:
    cases = []
    ordinal = 100
    for family, values in CONFIRMATORY_FAMILIES.items():
        for outcome_state in OUTCOME_STATES:
            for scope_mode in RECURRENCE_SCOPES:
                ordinal += 1
                cases.append(_make_case(
                    ordinal=ordinal,
                    family=family,
                    values=values,
                    outcome_state=outcome_state,
                    scope_mode=scope_mode,
                ))
    return tuple(cases)
