from __future__ import annotations

import unittest

from research.governance_harness_v01.harness import RevalidationState
from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    AssessmentBasis,
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    MonitorState,
    ParticipationProvenance,
    ResponsibilityProvenance,
    TargetEvidence,
    TargetKind,
)

REL="R-1"

def _snapshot():
    return DecisionProvenanceSnapshot(
        entry_id="E-1",
        relation_id=REL,
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
            axis_obligations=(
                ("U", ("u-ref",)),
                ("I", ("i-ref",)),
                ("V", ("v-ref",)),
                ("T", ("t-ref",)),
            ),
        ),
    )

def ev(event_id, kind, target, direction, attribution=AttributionKind.DECISION_LINKED):
    return TargetEvidence(REL, event_id, kind, target, direction, attribution, (f"ref:{event_id}",))

class CBRATests(unittest.TestCase):
    def test_yes_and_no_are_both_revalidated(self):
        axis = ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp = axis.observe(observed_tau=12.0,evidence=(
            ev("e1", TargetKind.PARTICIPATION, "CE-YES", EvidenceDirection.CONTRADICTS),
            ev("e2", TargetKind.PARTICIPATION, "CE-NO", EvidenceDirection.CONTRADICTS),
        ))
        by_id={x.target_id:x for x in cp.participation_findings}
        self.assertEqual(by_id["CE-YES"].state, RevalidationState.REVISED)
        self.assertEqual(by_id["CE-YES"].basis, AssessmentBasis.DIRECT_REALIZED)
        self.assertEqual(by_id["CE-NO"].state, RevalidationState.REVISED)
        self.assertEqual(by_id["CE-NO"].basis, AssessmentBasis.EVIDENCE_CONSISTENCY)
        self.assertIn("counterfactual outcome is not inferred", by_id["CE-NO"].note)

    def test_nonselected_never_claims_counterfactual_outcome(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp=axis.observe(observed_tau=12.0,evidence=(ev("e1",TargetKind.NONSELECTED_CHOICE,"yield-space",EvidenceDirection.SUPPORTS),))
        finding=cp.nonselected_choice_findings[0]
        self.assertEqual(finding.basis, AssessmentBasis.EVIDENCE_CONSISTENCY)
        self.assertIn("counterfactual outcome is not inferred", finding.note)

    def test_exogenous_failure_does_not_revise_selected_choice(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp=axis.observe(observed_tau=12.0,evidence=(ev("e1",TargetKind.SELECTED_CHOICE,"continue-flow",EvidenceDirection.CONTRADICTS,AttributionKind.EXOGENOUS),))
        self.assertEqual(cp.selected_choice_finding.state, RevalidationState.INCONCLUSIVE)
        self.assertEqual(cp.selected_choice_finding.attribution, AttributionKind.EXOGENOUS)

    def test_responsibility_axes_and_obligations_remain_separate(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        cp=axis.observe(observed_tau=12.0,evidence=(
            ev("e1",TargetKind.RESPONSIBILITY_U,"U",EvidenceDirection.CONTRADICTS),
            ev("e2",TargetKind.RESPONSIBILITY_I,"I",EvidenceDirection.SUPPORTS),
            ev("e3",TargetKind.RESPONSIBILITY_OBLIGATION,"U:u-ref",EvidenceDirection.CONTRADICTS),
        ))
        states={x.target_id:x.state for x in cp.responsibility_findings}
        obligations={x.target_id:x.state for x in cp.responsibility_obligation_findings}
        self.assertEqual(states["U"],RevalidationState.REVISED)
        self.assertEqual(states["I"],RevalidationState.CONFIRMED)
        self.assertEqual(states["V"],RevalidationState.INCONCLUSIVE)
        self.assertEqual(states["T"],RevalidationState.INCONCLUSIVE)
        self.assertEqual(obligations["U:u-ref"],RevalidationState.REVISED)

    def test_history_is_append_only_ordered_and_as_of_gated(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        first=axis.observe(observed_tau=12.0,evidence=())
        second=axis.observe(observed_tau=13.0,evidence=())
        self.assertEqual(axis.history(),(first,second))
        self.assertEqual(axis.history_as_of(12.5),(first,))
        self.assertEqual(axis.history_as_of(12.0),())
        self.assertEqual((first.ordinal,second.ordinal),(1,2))

    def test_monitoring_lifecycle(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        axis.set_dormant()
        self.assertEqual(axis.monitor_state,MonitorState.DORMANT)
        with self.assertRaises(ValueError): axis.observe(observed_tau=12.0,evidence=())
        axis.reopen()
        axis.observe(observed_tau=12.0,evidence=())
        axis.close()
        self.assertEqual(axis.monitor_state,MonitorState.CLOSED)
        with self.assertRaises(ValueError): axis.reopen()

    def test_monitoring_must_be_after_closure_and_monotonic(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError): axis.observe(observed_tau=11.0,evidence=())
        axis.observe(observed_tau=12.0,evidence=())
        with self.assertRaises(ValueError): axis.observe(observed_tau=12.0,evidence=())

    def test_cross_relation_contamination_rejected(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        bad=TargetEvidence("R-OTHER","e1",TargetKind.SELECTED_CHOICE,"continue-flow",EvidenceDirection.SUPPORTS,AttributionKind.DECISION_LINKED,("ref:e1",))
        with self.assertRaises(ValueError): axis.observe(observed_tau=12.0,evidence=(bad,))

    def test_duplicate_evidence_rejected_within_and_across_checkpoints(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        a=ev("e1",TargetKind.SELECTED_CHOICE,"continue-flow",EvidenceDirection.SUPPORTS)
        b=ev("e1",TargetKind.RESPONSIBILITY_U,"U",EvidenceDirection.SUPPORTS)
        with self.assertRaises(ValueError): axis.observe(observed_tau=12.0,evidence=(a,b))
        axis.observe(observed_tau=12.0,evidence=(a,))
        with self.assertRaises(ValueError): axis.observe(observed_tau=13.0,evidence=(a,))

    def test_unknown_provenance_target_is_rejected(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        with self.assertRaises(ValueError):
            axis.observe(observed_tau=12.0,evidence=(ev("e1",TargetKind.PARTICIPATION,"CE-FUTURE",EvidenceDirection.SUPPORTS),))

    def test_no_scalar_or_latest_state_api(self):
        axis=ContinuousBidirectionalRevalidationAxis(_snapshot())
        self.assertFalse(hasattr(axis,"score")); self.assertFalse(hasattr(axis,"weight")); self.assertFalse(hasattr(axis,"latest_state"))

if __name__=="__main__":
    unittest.main()
