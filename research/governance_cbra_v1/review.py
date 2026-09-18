from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from research.governance_harness_v01.harness import RevalidationState

from .axis import ContinuousBidirectionalRevalidationAxis
from .models import AttributionKind, RevalidationFinding, TargetKind


class ReviewDirective(str, Enum):
    PRESERVE_ORIGINAL = "preserve_original"
    RECONSIDER = "reconsider"
    NO_DECISIVE_EVIDENCE = "no_decisive_evidence"


@dataclass(frozen=True)
class CurrentReviewProjection:
    entry_id: str
    target_kind: TargetKind
    target_id: str
    current_decision_tau: float
    current_relation_id: str
    current_scope_key: str
    observed_sequence: tuple[RevalidationFinding, ...]
    decisive_sequence: tuple[RevalidationFinding, ...]
    directive: ReviewDirective
    rationale: str


def _finding_from_checkpoint(checkpoint, kind: TargetKind, target_id: str):
    if kind is TargetKind.PARTICIPATION:
        return next((x for x in checkpoint.participation_findings if x.target_id == target_id), None)
    if kind is TargetKind.SELECTED_CHOICE:
        x = checkpoint.selected_choice_finding
        return x if x.target_id == target_id else None
    if kind is TargetKind.NONSELECTED_CHOICE:
        return next((x for x in checkpoint.nonselected_choice_findings if x.target_id == target_id), None)
    return next((x for x in checkpoint.responsibility_findings if x.target_kind is kind and x.target_id == target_id), None)


def project_current_review(
    axis: ContinuousBidirectionalRevalidationAxis,
    *,
    target_kind: TargetKind,
    target_id: str,
    current_decision_tau: float,
    current_relation_id: str,
    current_scope_key: str,
) -> CurrentReviewProjection:
    """Build an ephemeral current-time interpretation without rewriting CBRA history."""

    history = axis.history_as_of(current_decision_tau)
    observed = tuple(
        finding
        for checkpoint in history
        for finding in (_finding_from_checkpoint(checkpoint, target_kind, target_id),)
        if finding is not None
    )

    if current_relation_id != axis.snapshot.relation_id or current_scope_key != axis.snapshot.scope_key:
        return CurrentReviewProjection(
            axis.snapshot.entry_id,
            target_kind,
            target_id,
            float(current_decision_tau),
            current_relation_id,
            current_scope_key,
            observed,
            (),
            ReviewDirective.NO_DECISIVE_EVIDENCE,
            "original-context findings are preserved but not automatically projected into a changed current relation/scope",
        )

    decisive = tuple(
        x for x in observed
        if x.attribution is AttributionKind.DECISION_LINKED
        and x.state in (RevalidationState.CONFIRMED, RevalidationState.REVISED)
    )
    if not decisive:
        directive = ReviewDirective.NO_DECISIVE_EVIDENCE
        rationale = "no decision-linked decisive finding exists before the current decision"
    elif decisive[-1].state is RevalidationState.REVISED:
        directive = ReviewDirective.RECONSIDER
        rationale = "the ordered as-of sequence ends in an unresolved decision-linked revision"
    else:
        directive = ReviewDirective.PRESERVE_ORIGINAL
        rationale = "the ordered as-of sequence ends in a decision-linked confirmation"

    return CurrentReviewProjection(
        axis.snapshot.entry_id,
        target_kind,
        target_id,
        float(current_decision_tau),
        current_relation_id,
        current_scope_key,
        observed,
        decisive,
        directive,
        rationale,
    )
