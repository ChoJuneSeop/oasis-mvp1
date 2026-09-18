from __future__ import annotations

import unittest

from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    ParticipationProvenance,
    ResponsibilityProvenance,
    TargetEvidence,
    TargetKind,
)
from research.governance_cbra_v1.review import ReviewDirective, project_current_review


def _snapshot():
    return DecisionProvenanceSnapshot(
        entry_id="E-R",
        relation_id="R-1",
        scope_key="scope:1",
        decision_tau=10.0,
        closure_tau=11.0,
        participation=(ParticipationProvenance("CE-1", True, "yes", "P-1"),),
        responsibility=ResponsibilityProvenance(
            "continue-flow",
            ("yield-space",),
            ("u",),
            ("i",),
            ("v",),
            ("t",),
            ("selected",),
            ("nonselected",),
        ),
    )


def _e(eid, tau, direction):
    return TargetEvidence(
        eid,
        tau,
        "R-1",
        "scope:1",
        TargetKind.PARTICIPATION,
        "CE-1",
        direction,
        AttributionKind.DECISION_LINKED,
        (f"ref:{eid}",),
    )


class ReviewTests(unittest.TestCase):
    def test_revised_same_context_requests_reconsideration(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.observe(observed_tau=12.0, evidence=(_e("rev", 11.5, EvidenceDirection.CONTRADICTS),))
        p = project_current_review(
            axis,
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            current_decision_tau=13.0,
            current_relation_id="R-1",
            current_scope_key="scope:1",
        )
        self.assertEqual(p.directive, ReviewDirective.RECONSIDER)

    def test_later_confirmation_changes_ephemeral_projection_not_history(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        first = axis.observe(observed_tau=12.0, evidence=(_e("rev", 11.5, EvidenceDirection.CONTRADICTS),))
        second = axis.observe(observed_tau=14.0, evidence=(_e("conf", 13.5, EvidenceDirection.SUPPORTS),))
        p = project_current_review(
            axis,
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            current_decision_tau=15.0,
            current_relation_id="R-1",
            current_scope_key="scope:1",
        )
        self.assertEqual(p.directive, ReviewDirective.PRESERVE_ORIGINAL)
        self.assertEqual(axis.history(), (first, second))

    def test_future_checkpoint_is_not_visible(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.observe(observed_tau=12.0, evidence=(_e("rev", 11.5, EvidenceDirection.CONTRADICTS),))
        axis.observe(observed_tau=14.0, evidence=(_e("conf", 13.5, EvidenceDirection.SUPPORTS),))
        p = project_current_review(
            axis,
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            current_decision_tau=13.0,
            current_relation_id="R-1",
            current_scope_key="scope:1",
        )
        self.assertEqual(p.directive, ReviewDirective.RECONSIDER)
        self.assertEqual(len(p.observed_sequence), 1)

    def test_changed_scope_does_not_globalize_revision(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.observe(observed_tau=12.0, evidence=(_e("rev", 11.5, EvidenceDirection.CONTRADICTS),))
        p = project_current_review(
            axis,
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            current_decision_tau=13.0,
            current_relation_id="R-1",
            current_scope_key="scope:2",
        )
        self.assertEqual(p.directive, ReviewDirective.NO_DECISIVE_EVIDENCE)
        self.assertEqual(len(p.observed_sequence), 1)
        self.assertEqual(len(p.decisive_sequence), 0)

    def test_changed_relation_does_not_cross_pollute(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.observe(observed_tau=12.0, evidence=(_e("rev", 11.5, EvidenceDirection.CONTRADICTS),))
        p = project_current_review(
            axis,
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            current_decision_tau=13.0,
            current_relation_id="R-OTHER",
            current_scope_key="scope:1",
        )
        self.assertEqual(p.directive, ReviewDirective.NO_DECISIVE_EVIDENCE)


if __name__ == "__main__":
    unittest.main()
