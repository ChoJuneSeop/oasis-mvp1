from __future__ import annotations

from dataclasses import dataclass

from research.governance_cbra_v1.models import (
    AttributionKind,
    EvidenceDirection,
    TargetKind,
)


@dataclass(frozen=True)
class CarlaCurrentFlow:
    epoch: int
    ego_speed_mps: float
    front_present: bool
    front_gap_m: float
    front_closing_mps: float
    front_kind: str
    local_heading_error_deg: float
    local_density: int


@dataclass(frozen=True)
class CarlaRelationContext:
    relation_id: str
    front_present: bool
    front_kind: str
    local_density: int

    @property
    def scope_signature(self) -> tuple[bool, str, int]:
        return (self.front_present, self.front_kind, self.local_density)


@dataclass(frozen=True)
class CarlaOutcomeSignal:
    observed_tau: float
    relation_id: str
    event_id: str
    target_kind: TargetKind
    target_id: str
    direction: EvidenceDirection
    attribution: AttributionKind
    evidence_refs: tuple[str, ...]

    def __post_init__(self):
        if not self.relation_id or not self.event_id:
            raise ValueError("CARLA outcome signal requires relation and event identity")
        if not self.evidence_refs:
            raise ValueError("CARLA outcome signal requires provenance-linked evidence")
