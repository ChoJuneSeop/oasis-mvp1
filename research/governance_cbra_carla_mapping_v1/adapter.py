from __future__ import annotations

from research.carla_v22_canonical.harness_v1_1 import PresentObservation
from research.g3_2_sidecar.history import HistoryEntry
from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    DecisionProvenanceSnapshot,
    TargetEvidence,
)

from .models import CarlaCurrentFlow, CarlaOutcomeSignal, CarlaRelationContext


class CarlaMappingInvariantError(RuntimeError):
    pass


def map_current_flow(observation: PresentObservation) -> CarlaCurrentFlow:
    return CarlaCurrentFlow(
        epoch=observation.epoch,
        ego_speed_mps=observation.ego_speed_mps,
        front_present=observation.front_present,
        front_gap_m=observation.front_gap_m,
        front_closing_mps=observation.front_closing_mps,
        front_kind=observation.front_kind,
        local_heading_error_deg=observation.local_heading_error_deg,
        local_density=observation.local_density,
    )


def map_relation_context(
    observation: PresentObservation,
    *,
    relation_id: str,
) -> CarlaRelationContext:
    if not relation_id:
        raise CarlaMappingInvariantError("relation_id is required")
    return CarlaRelationContext(
        relation_id=relation_id,
        front_present=observation.front_present,
        front_kind=observation.front_kind,
        local_density=observation.local_density,
    )


def same_scope(a: CarlaRelationContext, b: CarlaRelationContext) -> bool:
    return a.relation_id == b.relation_id and a.scope_signature == b.scope_signature


def changed_scope(a: CarlaRelationContext, b: CarlaRelationContext) -> bool:
    return a.relation_id == b.relation_id and a.scope_signature != b.scope_signature


def unrelated_relation(a: CarlaRelationContext, b: CarlaRelationContext) -> bool:
    return a.relation_id != b.relation_id


def validate_closed_history(
    history: HistoryEntry,
    snapshot: DecisionProvenanceSnapshot,
) -> None:
    if history.realization_count != 1:
        raise CarlaMappingInvariantError("CARLA history must contain exactly one realization")
    if history.entry_id != snapshot.entry_id:
        raise CarlaMappingInvariantError("history/provenance entry mismatch")
    if history.decision_tau != snapshot.decision_tau:
        raise CarlaMappingInvariantError("history/provenance decision time mismatch")
    if history.relation_end_tau != snapshot.closure_tau:
        raise CarlaMappingInvariantError("CBRA Closure must equal CARLA relation-process closure")
    if not history.closure_method.strip() or not history.closure_evidence:
        raise CarlaMappingInvariantError("authoritative CARLA Closure evidence is required")


def open_cbra_after_closure(
    *,
    history: HistoryEntry,
    snapshot: DecisionProvenanceSnapshot,
) -> ContinuousBidirectionalRevalidationAxis:
    validate_closed_history(history, snapshot)
    return ContinuousBidirectionalRevalidationAxis(snapshot)


def record_carla_revalidation(
    axis: ContinuousBidirectionalRevalidationAxis,
    signal: CarlaOutcomeSignal,
):
    evidence = TargetEvidence(
        relation_id=signal.relation_id,
        event_id=signal.event_id,
        target_kind=signal.target_kind,
        target_id=signal.target_id,
        direction=signal.direction,
        attribution=signal.attribution,
        evidence_refs=signal.evidence_refs,
    )
    return axis.observe(observed_tau=signal.observed_tau, evidence=(evidence,))


def eligible_revalidation_history(
    axis: ContinuousBidirectionalRevalidationAxis,
    *,
    later_decision_tau: float,
):
    return axis.history_as_of(later_decision_tau)
