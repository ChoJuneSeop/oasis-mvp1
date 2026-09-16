from __future__ import annotations

import random

from ..models import EvaluatorTruth, RuntimeFrame, WorldCase


SCENARIO_CLASSES = (
    "history-neutral", "history-critical", "relational-mismatch",
    "context-reversal", "conflicting-history", "novel", "long-re-entry",
)


def _case(index: int, scenario_class: str, *, relation: str, context: str,
          speed: float, front: bool, expected: str,
          matched_pair: str | None = None) -> WorldCase:
    frame_id = f"F{index:04d}"
    runtime = RuntimeFrame(
        tick=index, epoch=index, ego_speed_mps=speed, front_present=front,
        front_distance_m=12.0 if front else 0.0,
        relative_speed_mps=0.8 if front else 0.0,
        relation_id=relation, context=context, route_phase=f"phase-{index % 11}",
    )
    truth = EvaluatorTruth(frame_id, scenario_class, expected, matched_pair)
    return WorldCase(frame_id, runtime, truth)


def generate_long_world(seed: int = 6101, horizon: int = 512) -> tuple[WorldCase, ...]:
    """Generate a mixed long world; labels remain in evaluator-owned objects only."""
    if horizon < 256:
        raise ValueError("GH-1L horizon must preserve a genuinely late re-entry interval")
    rng = random.Random(seed)
    cases: list[WorldCase] = []
    neutral_classes = ("history-neutral", "novel")
    for index in range(1, horizon + 1):
        cls = neutral_classes[index % 2]
        relation = f"N{index % 17}"
        context = "clear" if index % 3 else "open"
        speed = round(2.0 + rng.uniform(-0.08, 0.08), 3)
        cases.append(_case(index, cls, relation=relation, context=context,
                           speed=speed, front=index % 5 != 0, expected="continue"))

    # Same current observation, different relationship histories.
    shared_tick = horizon // 3
    cases[shared_tick - 1] = _case(
        shared_tick, "history-critical", relation="REL-A", context="closing",
        speed=1.1, front=True, expected="yield-space", matched_pair="MATCH-1")
    cases[shared_tick] = _case(
        shared_tick + 1, "relational-mismatch", relation="REL-B", context="closing",
        speed=1.1, front=True, expected="hold-course", matched_pair="MATCH-1")
    cases[horizon // 2 - 1] = _case(
        horizon // 2, "context-reversal", relation="REL-A", context="reversed",
        speed=1.0, front=False, expected="continue")
    cases[(horizon * 2) // 3 - 1] = _case(
        (horizon * 2) // 3, "conflicting-history", relation="REL-C", context="closing",
        speed=1.0, front=True, expected="yield-space")
    cases[-1] = _case(
        horizon, "long-re-entry", relation="REL-A", context="closing",
        speed=1.0, front=True, expected="yield-space")
    return tuple(cases)


def runtime_stream(world: tuple[WorldCase, ...]):
    """The runner receives no evaluator object or label."""
    return tuple((case.frame_id, case.runtime.as_runtime_mapping()) for case in world)
