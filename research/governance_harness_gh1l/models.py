from __future__ import annotations

from dataclasses import asdict, dataclass
from types import MappingProxyType
from typing import Any, Mapping


ARMS = ("G1", "G2", "G3", "G4", "G5")
FORBIDDEN_RUNTIME_KEYS = frozenset({
    "scenario_class", "evaluator_label", "future_state", "future_anomaly_tau",
    "correct_action", "expected_action",
})


@dataclass(frozen=True)
class RuntimeFrame:
    tick: int
    epoch: int
    ego_speed_mps: float
    front_present: bool
    front_distance_m: float
    relative_speed_mps: float
    relation_id: str
    context: str
    route_phase: str

    def as_runtime_mapping(self) -> Mapping[str, Any]:
        value = asdict(self)
        if FORBIDDEN_RUNTIME_KEYS.intersection(value):
            raise ValueError("evaluator-only field leaked into runtime frame")
        return MappingProxyType(value)


@dataclass(frozen=True)
class EvaluatorTruth:
    frame_id: str
    scenario_class: str
    expected_action: str
    matched_pair_id: str | None = None


@dataclass(frozen=True)
class WorldCase:
    frame_id: str
    runtime: RuntimeFrame
    truth: EvaluatorTruth


@dataclass(frozen=True)
class Experience:
    experience_id: str
    relation_id: str
    context: str
    recommended_action: str
    completed_tau: float
    provenance_ref: str
    closure_entry_id: str
    byte_size: int = 256


@dataclass(frozen=True)
class ArmDecision:
    arm: str
    frame_id: str
    gap: bool
    archive_accessed: bool
    scanned: int
    bytes_read: int
    candidates: tuple[str, ...]
    participants: tuple[str, ...]
    selected_action: str
    realized_action: str | None
    counterfactual: bool
    actuator_count: int
