from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CBRASchedulingPolicy:
    mode: str = "EVENT_DRIVEN_POST_CLOSURE"
    per_tick_required: bool = False
    full_archive_scan_required: bool = False
    may_block_hot_path: bool = False
    evaluator_telemetry_visible_to_core: bool = False
    energy_telemetry_visible_to_core: bool = False

    def __post_init__(self):
        if self.mode != "EVENT_DRIVEN_POST_CLOSURE":
            raise ValueError("CBRA CARLA scheduling must remain event-driven post-Closure")
        if self.per_tick_required:
            raise ValueError("CBRA must not require per-tick execution")
        if self.full_archive_scan_required:
            raise ValueError("CBRA mapping must not require full-archive scan")
        if self.may_block_hot_path:
            raise ValueError("CBRA side path must not block the real-time hot path")
        if self.evaluator_telemetry_visible_to_core or self.energy_telemetry_visible_to_core:
            raise ValueError("measurement telemetry cannot enter OASIS Core")


FROZEN_CBRA_SCHEDULING_POLICY = CBRASchedulingPolicy()
