from __future__ import annotations

from collections import defaultdict

from research.governance_harness_v01.harness import RevalidationState

from .models import (
    AssessmentBasis,
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    RevalidationCheckpoint,
    RevalidationFinding,
    TargetEvidence,
    TargetKind,
)


RESPONSIBILITY_TARGETS = (
    (TargetKind.RESPONSIBILITY_U, "U"),
    (TargetKind.RESPONSIBILITY_I, "I"),
    (TargetKind.RESPONSIBILITY_V, "V"),
    (TargetKind.RESPONSIBILITY_T, "T"),
)


def _overall_attribution(items: tuple[TargetEvidence, ...]) -> AttributionKind:
    if not items:
        return AttributionKind.UNRESOLVED
    kinds = {x.attribution for x in items}
    if kinds == {AttributionKind.DECISION_LINKED}:
        return AttributionKind.DECISION_LINKED
    if kinds == {AttributionKind.EXOGENOUS}:
        return AttributionKind.EXOGENOUS
    if kinds == {AttributionKind.UNRESOLVED}:
        return AttributionKind.UNRESOLVED
    return AttributionKind.MIXED


def _derive_state(items: tuple[TargetEvidence, ...]) -> tuple[RevalidationState, AttributionKind, tuple[str, ...], str]:
    if not items:
        return (
            RevalidationState.INCONCLUSIVE,
            AttributionKind.UNRESOLVED,
            (),
            "no later evidence for this target",
        )

    attribution = _overall_attribution(items)
    decision_linked = tuple(x for x in items if x.attribution is AttributionKind.DECISION_LINKED)
    supports = any(x.direction is EvidenceDirection.SUPPORTS for x in decision_linked)
    contradicts = any(x.direction is EvidenceDirection.CONTRADICTS for x in decision_linked)
    refs = tuple(dict.fromkeys(ref for item in items for ref in item.evidence_refs))

    if contradicts and not supports:
        return RevalidationState.REVISED, attribution, refs, "decision-linked later evidence contradicts the original judgment"
    if supports and not contradicts:
        return RevalidationState.CONFIRMED, attribution, refs, "decision-linked later evidence supports the original judgment"
    if not decision_linked and all(x.attribution is AttributionKind.EXOGENOUS for x in items):
        return RevalidationState.INCONCLUSIVE, attribution, refs, "exogenous evidence does not by itself revise the original judgment"
    return RevalidationState.INCONCLUSIVE, attribution, refs, "later evidence is mixed, unresolved, or non-causal for this judgment"


class ContinuousBidirectionalRevalidationAxis:
    """Append-only monitoring axis for post-Closure governance provenance.

    CBRA never mutates the original decision. It emits ordered revalidation
    checkpoints. Nonparticipation and nonselection are evaluated only for
    evidence consistency; no counterfactual outcome is invented.
    """

    def __init__(self, snapshot: DecisionProvenanceSnapshot):
        self.snapshot = snapshot
        self._records: list[RevalidationCheckpoint] = []

    def _valid_targets(self) -> set[tuple[TargetKind, str]]:
        targets = {
            (TargetKind.PARTICIPATION, x.experience_id)
            for x in self.snapshot.participation
        }
        targets.add((TargetKind.SELECTED_CHOICE, self.snapshot.responsibility.selected_candidate_id))
        targets.update(
            (TargetKind.NONSELECTED_CHOICE, x)
            for x in self.snapshot.responsibility.nonselected_candidate_ids
        )
        targets.update(RESPONSIBILITY_TARGETS)
        return targets

    def _basis(self, kind: TargetKind, target_id: str) -> AssessmentBasis:
        if kind is TargetKind.PARTICIPATION:
            item = next(x for x in self.snapshot.participation if x.experience_id == target_id)
            return AssessmentBasis.DIRECT_REALIZED if item.participate else AssessmentBasis.EVIDENCE_CONSISTENCY
        if kind is TargetKind.SELECTED_CHOICE:
            return AssessmentBasis.DIRECT_REALIZED
        if kind is TargetKind.NONSELECTED_CHOICE:
            return AssessmentBasis.EVIDENCE_CONSISTENCY
        return AssessmentBasis.DIRECT_REALIZED

    def _finding(
        self,
        kind: TargetKind,
        target_id: str,
        grouped: dict[tuple[TargetKind, str], tuple[TargetEvidence, ...]],
    ) -> RevalidationFinding:
        items = grouped.get((kind, target_id), ())
        state, attribution, refs, note = _derive_state(items)
        basis = self._basis(kind, target_id)
        if basis is AssessmentBasis.EVIDENCE_CONSISTENCY:
            note = f"{note}; counterfactual outcome is not inferred"
        return RevalidationFinding(kind, target_id, state, basis, attribution, refs, note)

    def observe(
        self,
        *,
        observed_tau: float,
        evidence: tuple[TargetEvidence, ...],
    ) -> RevalidationCheckpoint:
        if observed_tau <= self.snapshot.closure_tau:
            raise ValueError("CBRA monitoring checkpoint must occur after Closure")
        if self._records and observed_tau <= self._records[-1].observed_tau:
            raise ValueError("CBRA monitoring time must increase monotonically")

        valid = self._valid_targets()
        invalid = tuple((x.target_kind, x.target_id) for x in evidence if (x.target_kind, x.target_id) not in valid)
        if invalid:
            raise ValueError(f"CBRA evidence targets are not in original provenance: {invalid}")

        bucket: dict[tuple[TargetKind, str], list[TargetEvidence]] = defaultdict(list)
        for item in evidence:
            bucket[(item.target_kind, item.target_id)].append(item)
        grouped = {key: tuple(value) for key, value in bucket.items()}

        participation = tuple(
            self._finding(TargetKind.PARTICIPATION, x.experience_id, grouped)
            for x in self.snapshot.participation
        )
        selected = self._finding(
            TargetKind.SELECTED_CHOICE,
            self.snapshot.responsibility.selected_candidate_id,
            grouped,
        )
        nonselected = tuple(
            self._finding(TargetKind.NONSELECTED_CHOICE, x, grouped)
            for x in self.snapshot.responsibility.nonselected_candidate_ids
        )
        responsibility = tuple(
            self._finding(kind, target_id, grouped)
            for kind, target_id in RESPONSIBILITY_TARGETS
        )
        refs = tuple(dict.fromkeys(ref for item in evidence for ref in item.evidence_refs))
        checkpoint = RevalidationCheckpoint(
            entry_id=self.snapshot.entry_id,
            relation_id=self.snapshot.relation_id,
            observed_tau=float(observed_tau),
            ordinal=len(self._records) + 1,
            participation_findings=participation,
            selected_choice_finding=selected,
            nonselected_choice_findings=nonselected,
            responsibility_findings=responsibility,
            overall_attribution=_overall_attribution(evidence),
            evidence_refs=refs,
        )
        self._records.append(checkpoint)
        return checkpoint

    def history(self) -> tuple[RevalidationCheckpoint, ...]:
        """Return ordered checkpoints. Deliberately no scalar/latest-state collapse."""
        return tuple(self._records)
