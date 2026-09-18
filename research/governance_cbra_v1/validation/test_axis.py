from __future__ import annotations

import unittest

from research.governance_harness_v01.harness import RevalidationState
from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    AssessmentBasis,
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    ParticipationProvenance,
    ResponsibilityProvenance,
    TargetEvidence,
    TargetKind,
)


def _snapshot():
    return DecisionProvenanceSnapshot(
        entry_id="E-1",
        relation_id="R-1",
        decision_tau=10.0,
        closure_tau=11.0,
        participation=(
            ParticipationProvenance("CE-YES", True, "current relation matched", "P-YES"),
            ParticipationProvenance("CE-NO", False, "current relation did not match", "P-NO"),
        ),
        responsibility=ResponsibilityProvenance(
            selected_candidate_id="continue-flow",
            nonselected_candidate_ids=("yield-space",),
            uncertainty=("u-ref",),
            impact=("i-ref",),
            vulnerability=("v-ref",),
            temporality=("t-ref",),
            selected_obligations=("selected-obligation",),
            nonselected_obligations=("nonselected-obligation",),
        ),
    )


class CBRATests(unittest.TestCase):
    def test_yes_and_no_are_both_revalidated(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                TargetEvidence(TargetKind.PARTICIPATION, "CE-YES", EvidenceDirection.CONTRADICTS, AttributionKind.DECISION_LINKED, ("obs:1",)),
                TargetEvidence(TargetKind.PARTICIPATION, "CE-NO", EvidenceDirection.CONTRADICTS, AttributionKind.DECISION_LINKED, ("obs:2",)),
            ),
        )
        by_id = {x.target_id: x for x in cp.participation_findings}
        self.assertEqual(by_id["CE-YES"].state, RevalidationState.REVISED)
        self.assertEqual(by_id["CE-YES"].basis, AssessmentBasis.DIRECT_REALIZED)
        self.assertEqual(by_id["CE-NO"].state, RevalidationState.REVISED)
        self.assertEqual(by_id["CE-NO"].basis, AssessmentBasis.EVIDENCE_CONSISTENCY)
        self.assertIn("counterfactual outcome is not inferred", by_id["CE-NO"].note)

    def test_nonselected_never_claims_counterfactual_outcome(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                TargetEvidence(TargetKind.NONSELECTED_CHOICE, "yield-space", EvidenceDirection.SUPPORTS, AttributionKind.DECISION_LINKED, ("obs:n1",)),
            ),
        )
        finding = cp.nonselected_choice_findings[0]
        self.assertEqual(finding.basis, AssessmentBasis.EVIDENCE_CONSISTENCY)
        self.assertIn("counterfactual outcome is not inferred", finding.note)

    def test_exogenous_failure_does_not_revise_selected_choice(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                TargetEvidence(TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.CONTRADICTS, AttributionKind.EXOGENOUS, ("weather:shock",)),
            ),
        )
        self.assertEqual(cp.selected_choice_finding.state, RevalidationState.INCONCLUSIVE)
        self.assertEqual(cp.selected_choice_finding.attribution, AttributionKind.EXOGENOUS)

    def test_responsibility_axes_remain_separate(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                TargetEvidence(TargetKind.RESPONSIBILITY_U, "U", EvidenceDirection.CONTRADICTS, AttributionKind.DECISION_LINKED, ("u:later",)),
                TargetEvidence(TargetKind.RESPONSIBILITY_I, "I", EvidenceDirection.SUPPORTS, AttributionKind.DECISION_LINKED, ("i:later",)),
            ),
        )
        states = {x.target_id: x.state for x in cp.responsibility_findings}
        self.assertEqual(states["U"], RevalidationState.REVISED)
        self.assertEqual(states["I"], RevalidationState.CONFIRMED)
        self.assertEqual(states["V"], RevalidationState.INCONCLUSIVE)
        self.assertEqual(states["T"], RevalidationState.INCONCLUSIVE)

    def test_history_is_append_only_and_ordered(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        first = axis.observe(observed_tau=12.0, evidence=())
        second = axis.observe(observed_tau=13.0, evidence=())
        self.assertEqual(axis.history(), (first, second))
        self.assertEqual((first.ordinal, second.ordinal), (1, 2))

    def test_monitoring_must_be_after_closure_and_monotonic(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(observed_tau=11.0, evidence=())
        axis.observe(observed_tau=12.0, evidence=())
        with self.assertRaises(ValueError):
            axis.observe(observed_tau=12.0, evidence=())

    def test_unknown_provenance_target_is_rejected(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=12.0,
                evidence=(
                    TargetEvidence(TargetKind.PARTICIPATION, "CE-FUTURE", EvidenceDirection.SUPPORTS, AttributionKind.DECISION_LINKED, ("bad:future",)),
                ),
            )

    def test_no_scalar_or_latest_state_api(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        self.assertFalse(hasattr(axis, "score"))
        self.assertFalse(hasattr(axis, "weight"))
        self.assertFalse(hasattr(axis, "latest_state"))


if __name__ == "__main__":
    unittest.main()
