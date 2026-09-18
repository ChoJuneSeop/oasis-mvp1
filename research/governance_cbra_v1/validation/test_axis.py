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
        scope_key="scope:1",
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


def _ev(
    evidence_id,
    kind,
    target_id,
    direction,
    *,
    tau=11.5,
    relation="R-1",
    scope="scope:1",
    attribution=AttributionKind.DECISION_LINKED,
):
    return TargetEvidence(
        evidence_id=evidence_id,
        observed_tau=tau,
        relation_id=relation,
        scope_key=scope,
        target_kind=kind,
        target_id=target_id,
        direction=direction,
        attribution=attribution,
        evidence_refs=(f"ref:{evidence_id}",),
    )


class CBRATests(unittest.TestCase):
    def test_yes_and_no_are_both_revalidated(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                _ev("e1", TargetKind.PARTICIPATION, "CE-YES", EvidenceDirection.CONTRADICTS),
                _ev("e2", TargetKind.PARTICIPATION, "CE-NO", EvidenceDirection.CONTRADICTS),
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
                _ev("e3", TargetKind.NONSELECTED_CHOICE, "yield-space", EvidenceDirection.SUPPORTS),
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
                _ev(
                    "e4",
                    TargetKind.SELECTED_CHOICE,
                    "continue-flow",
                    EvidenceDirection.CONTRADICTS,
                    attribution=AttributionKind.EXOGENOUS,
                ),
            ),
        )
        self.assertEqual(cp.selected_choice_finding.state, RevalidationState.INCONCLUSIVE)
        self.assertEqual(cp.selected_choice_finding.attribution, AttributionKind.EXOGENOUS)

    def test_responsibility_axes_remain_separate(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                _ev("e5", TargetKind.RESPONSIBILITY_U, "U", EvidenceDirection.CONTRADICTS),
                _ev("e6", TargetKind.RESPONSIBILITY_I, "I", EvidenceDirection.SUPPORTS),
            ),
        )
        states = {x.target_id: x.state for x in cp.responsibility_findings}
        self.assertEqual(states["U"], RevalidationState.REVISED)
        self.assertEqual(states["I"], RevalidationState.CONFIRMED)
        self.assertEqual(states["V"], RevalidationState.INCONCLUSIVE)
        self.assertEqual(states["T"], RevalidationState.INCONCLUSIVE)

    def test_history_is_append_only_and_ordered(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        first = axis.observe(
            observed_tau=12.0,
            evidence=(_ev("e7", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS),),
        )
        second = axis.observe(
            observed_tau=13.0,
            evidence=(_ev("e8", TargetKind.RESPONSIBILITY_T, "T", EvidenceDirection.INDETERMINATE, tau=12.5),),
        )
        self.assertEqual(axis.history(), (first, second))
        self.assertEqual((first.ordinal, second.ordinal), (1, 2))

    def test_monitoring_must_be_after_closure_and_monotonic(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=11.0,
                evidence=(_ev("e9", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS, tau=10.9),),
            )
        axis.observe(
            observed_tau=12.0,
            evidence=(_ev("e10", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS),),
        )
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=12.0,
                evidence=(_ev("e11", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS),),
            )

    def test_evidence_time_must_be_after_closure_and_not_future(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=12.0,
                evidence=(_ev("e12", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS, tau=11.0),),
            )
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=12.0,
                evidence=(_ev("e13", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS, tau=12.1),),
            )

    def test_unknown_provenance_target_is_rejected(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=12.0,
                evidence=(_ev("e14", TargetKind.PARTICIPATION, "CE-FUTURE", EvidenceDirection.SUPPORTS),),
            )

    def test_relation_mismatch_is_preserved_but_nondecisive(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                _ev(
                    "e15",
                    TargetKind.PARTICIPATION,
                    "CE-YES",
                    EvidenceDirection.CONTRADICTS,
                    relation="R-OTHER",
                ),
            ),
        )
        finding = {x.target_id: x for x in cp.participation_findings}["CE-YES"]
        self.assertEqual(finding.state, RevalidationState.INCONCLUSIVE)
        self.assertIn("non-decisive", finding.note)
        self.assertIn("ref:e15", finding.evidence_refs)

    def test_scope_mismatch_is_preserved_but_nondecisive(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                _ev(
                    "e16",
                    TargetKind.PARTICIPATION,
                    "CE-YES",
                    EvidenceDirection.CONTRADICTS,
                    scope="scope:changed",
                ),
            ),
        )
        finding = {x.target_id: x for x in cp.participation_findings}["CE-YES"]
        self.assertEqual(finding.state, RevalidationState.INCONCLUSIVE)
        self.assertIn("non-decisive", finding.note)

    def test_duplicate_event_target_evidence_is_rejected_across_checkpoints(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.observe(
            observed_tau=12.0,
            evidence=(_ev("same-event", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS),),
        )
        with self.assertRaises(ValueError):
            axis.observe(
                observed_tau=13.0,
                evidence=(_ev("same-event", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS, tau=12.5),),
            )

    def test_same_event_may_target_distinct_provenance_nodes_once_each(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(
            observed_tau=12.0,
            evidence=(
                _ev("multi-target", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.CONTRADICTS),
                _ev("multi-target", TargetKind.RESPONSIBILITY_U, "U", EvidenceDirection.CONTRADICTS),
            ),
        )
        self.assertEqual(cp.selected_choice_finding.state, RevalidationState.REVISED)
        self.assertEqual({x.target_id: x.state for x in cp.responsibility_findings}["U"], RevalidationState.REVISED)

    def test_history_as_of_excludes_future_checkpoint(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        first = axis.observe(
            observed_tau=12.0,
            evidence=(_ev("e17", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.SUPPORTS),),
        )
        axis.observe(
            observed_tau=14.0,
            evidence=(_ev("e18", TargetKind.SELECTED_CHOICE, "continue-flow", EvidenceDirection.CONTRADICTS, tau=13.5),),
        )
        self.assertEqual(axis.history_as_of(13.0), (first,))
        self.assertEqual(axis.history_as_of(12.0), ())

    def test_empty_checkpoint_is_rejected(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(observed_tau=12.0, evidence=())

    def test_no_scalar_or_latest_state_api(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        self.assertFalse(hasattr(axis, "score"))
        self.assertFalse(hasattr(axis, "weight"))
        self.assertFalse(hasattr(axis, "latest_state"))


if __name__ == "__main__":
    unittest.main()
