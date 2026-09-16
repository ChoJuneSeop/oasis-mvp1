from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from typing import Mapping

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.governance_harness_v01.harness_v04 import (
    CompletedExperience, ParticipatingExperienceView,
)
from research.governance_harness_v01.gh1a_structural_run import _record
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

from ..action_contract import canonical_action
from ..models import ARMS, ArmDecision, Experience, FORBIDDEN_RUNTIME_KEYS


@dataclass
class NonActuatingActuator:
    count: int = 0
    def actuate(self, action: str) -> None:
        self.count += 1


def _gap(previous: Mapping[str, object] | None, current: Mapping[str, object]) -> bool:
    current_structural_gap = (
        bool(current["front_present"])
        and float(current["front_distance_m"]) <= 12.0
        and float(current["ego_speed_mps"]) <= 1.2
    )
    flow_drop = (
        previous is not None
        and float(previous["ego_speed_mps"]) - float(current["ego_speed_mps"]) >= 0.5
    )
    return bool(current_structural_gap or flow_drop)


def _eligible(experience: Experience, current: Mapping[str, object]) -> bool:
    return (experience.relation_id == current["relation_id"]
            and experience.context == current["context"])


def _permute_identity(selected: tuple[Experience, ...], archive: tuple[Experience, ...],
                      seed: int, frame_id: str) -> tuple[Experience, ...]:
    if not selected:
        return ()
    pool = [x for x in archive if x.experience_id not in {s.experience_id for s in selected}]
    rng = random.Random(f"{seed}:{frame_id}:G5")
    rng.shuffle(pool)
    if len(pool) < len(selected):
        raise RuntimeError("permutation pool cannot preserve participation count")
    return tuple(pool[:len(selected)])


def _to_core_view(items: tuple[Experience, ...], tau: float) -> ParticipatingExperienceView:
    converted = tuple(CompletedExperience(
        x.experience_id, x.relation_id, x.provenance_ref, x.completed_tau,
        {"relation_records": (_record(x.experience_id, x.completed_tau,
             relation_type="longitudinal-relative-motion"),)}, x.byte_size,
    ) for x in items if x.completed_tau < tau)
    return ParticipatingExperienceView(converted)


class LongHorizonRunner:
    """Frozen five-arm runner. Evaluator truth is intentionally not accepted."""
    def __init__(self, archive: tuple[Experience, ...], *, seed: int = 6101):
        self.archive = tuple(archive)
        self.seed = seed
        self.previous: dict[str, Mapping[str, object] | None] = {arm: None for arm in ARMS}
        self.confirmatory_commits: list[str] = []

    def decide(self, arm: str, frame_id: str, current: Mapping[str, object], *,
               counterfactual: bool = False) -> ArmDecision:
        if arm not in ARMS:
            raise ValueError(arm)
        leaked = FORBIDDEN_RUNTIME_KEYS.intersection(current)
        if leaked:
            raise ValueError(f"evaluator leakage: {sorted(leaked)}")
        gap = _gap(self.previous[arm], current)
        self.previous[arm] = current
        access = arm == "G2" or (arm in ("G1", "G4", "G5") and gap)
        candidates = self.archive if access else ()
        selective = tuple(x for x in candidates if _eligible(x, current))
        if arm == "G3":
            participants = ()
        elif arm == "G4":
            participants = tuple(candidates)
        elif arm == "G5":
            participants = _permute_identity(selective, self.archive, self.seed, frame_id)
        else:
            participants = selective

        observation = PresentObservation(
            int(current["epoch"]), float(current["ego_speed_mps"]),
            bool(current["front_present"]), float(current["front_distance_m"]),
            float(current["relative_speed_mps"]),
            "vehicle" if current["front_present"] else "none", 0.0, 2,
        )
        core = build_domain_bundle().core
        tau = 10_000.0 + int(current["tick"])
        view = core.open_epoch(observation, tau, _to_core_view(participants, tau))
        distribution = dict(view.possibility_distribution)
        recommendations = [canonical_action(x.recommended_action) for x in participants]
        if recommendations:
            selected = max(sorted(set(recommendations)), key=recommendations.count)
        else:
            selected = "continue-flow"
        if selected not in distribution:
            selected = max(distribution, key=distribution.get)
        actuator = NonActuatingActuator()
        realized = None
        if not counterfactual:
            actuator.actuate(selected)
            realized = selected
        return ArmDecision(
            arm, frame_id, gap, access, len(candidates) if access else 0,
            sum(x.byte_size for x in candidates) if access else 0,
            tuple(x.experience_id for x in candidates),
            tuple(x.experience_id for x in participants), selected, realized,
            counterfactual, actuator.count,
        )

    def record_confirmatory_closure(self, frame_id: str) -> None:
        """Results may be logged, but never enter self.archive."""
        self.confirmatory_commits.append(hashlib.sha256(frame_id.encode()).hexdigest())
