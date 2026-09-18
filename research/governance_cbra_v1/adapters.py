from __future__ import annotations

from .models import (
    DecisionProvenanceSnapshot,
    ParticipationProvenance,
    ResponsibilityProvenance,
)


def _axis_obligations(responsibility):
    axes = responsibility.axes
    return (
        ("U", tuple(str(x) for x in axes.uncertainty)),
        ("I", tuple(str(x) for x in axes.impact)),
        ("V", tuple(str(x) for x in axes.vulnerability)),
        ("T", tuple(str(x) for x in axes.temporality)),
    )


def snapshot_from_governance_provenance(provenance) -> DecisionProvenanceSnapshot:
    reengagement = getattr(provenance, "original_reengagement", None)
    if reengagement is None:
        reengagement = getattr(provenance, "reengagement_audit", None)
    if reengagement is None:
        raise ValueError("unsupported Governance provenance: missing participation audit")

    responsibility = getattr(provenance, "original_responsibility", None)
    if responsibility is None:
        responsibility = getattr(provenance, "responsibility", None)
    if responsibility is None:
        raise ValueError("unsupported Governance provenance: missing responsibility")

    outcome = getattr(provenance, "outcome", None)
    if outcome is None:
        raise ValueError("unsupported Governance provenance: missing authoritative outcome")

    relation_id = getattr(provenance, "relation_id", None) or getattr(outcome, "relation_id", None)
    if not relation_id:
        raise ValueError("unsupported Governance provenance: missing relation id")

    decision_tau = getattr(outcome, "decision_tau", None)
    if decision_tau is None:
        decision_tau = getattr(outcome, "realization_tau", None)
    closure_tau = getattr(outcome, "post_tau", None)
    if closure_tau is None:
        closure_tau = getattr(outcome, "observed_tau", None)
    if decision_tau is None or closure_tau is None:
        raise ValueError("unsupported Governance provenance: missing decision/Closure time")

    participation = tuple(
        ParticipationProvenance(
            experience_id=x.experience_id,
            participate=bool(x.participate),
            rationale=str(x.rationale),
            provenance_ref=str(x.provenance_ref),
        )
        for x in reengagement
    )
    axes = responsibility.axes
    normalized_responsibility = ResponsibilityProvenance(
        selected_candidate_id=str(responsibility.selected_candidate_id),
        nonselected_candidate_ids=tuple(str(x) for x in responsibility.nonselected_candidate_ids),
        uncertainty=tuple(str(x) for x in axes.uncertainty),
        impact=tuple(str(x) for x in axes.impact),
        vulnerability=tuple(str(x) for x in axes.vulnerability),
        temporality=tuple(str(x) for x in axes.temporality),
        selected_obligations=tuple(str(x) for x in responsibility.selected_obligations),
        nonselected_obligations=tuple(str(x) for x in responsibility.nonselected_obligations),
        axis_obligations=_axis_obligations(responsibility),
    )
    return DecisionProvenanceSnapshot(
        entry_id=str(provenance.entry_id),
        relation_id=str(relation_id),
        decision_tau=float(decision_tau),
        closure_tau=float(closure_tau),
        participation=participation,
        responsibility=normalized_responsibility,
    )
