import unittest

from research.governance_reality_gap_v1.contracts import (
    GapStatus,
    GapTriggeredRecallGate,
    MaintainCurrentFlow,
    RealityGapAxis,
    RealityGapObservation,
    RealityGapSignature,
    RecallDirective,
    ResearchAxis,
    ResearchAxisAssessment,
    ResearchVerdict,
)
from research.governance_reality_gap_v1.eligibility import (
    ProvenanceRelationEligibilityGate,
    RetrievedExperience,
)


def observation(status=GapStatus.PRESENT):
    return RealityGapObservation(
        observation_id="gap:relation:1",
        axis=RealityGapAxis.RELATION,
        status=status,
        current_relation_ids=("current:front",),
        current_evidence_refs=("observation:front",) if status is not GapStatus.ABSENT else (),
        description="current relation is incomplete",
        observed_at_tau=10.0,
    )


class SemanticSeparationTests(unittest.TestCase):
    def test_research_and_gap_axes_are_disjoint_types_and_values(self):
        self.assertFalse(set(ResearchAxis) & set(RealityGapAxis))
        self.assertTrue(set(item.value for item in ResearchAxis).isdisjoint(
            item.value for item in RealityGapAxis
        ))

    def test_gap_axis_cannot_be_used_as_research_assessment(self):
        with self.assertRaises(TypeError):
            ResearchAxisAssessment(
                axis=RealityGapAxis.RELATION,
                verdict=ResearchVerdict.PASS,
                evidence_refs=("run:1",),
                rationale="invalid semantic reuse",
            )

    def test_research_axis_cannot_be_used_as_gap_observation(self):
        with self.assertRaises(TypeError):
            RealityGapObservation(
                "bad", ResearchAxis.CHOICE, GapStatus.PRESENT,
                ("current:r",), ("observation:r",), "invalid", 10.0,
            )

    def test_no_gap_preserves_current_flow_without_recall_or_reevaluation(self):
        signature = RealityGapSignature("rev:1", 10.0, (observation(GapStatus.ABSENT),))
        result = GapTriggeredRecallGate().evaluate(signature, relation_terms_by_axis={})
        self.assertIsInstance(result, MaintainCurrentFlow)
        self.assertFalse(result.recall_requested)
        self.assertFalse(result.candidate_generation_requested)
        self.assertFalse(result.reevaluation_requested)

    def test_gap_opens_recall_only_not_reentry_reevaluation_probability_or_choice(self):
        signature = RealityGapSignature("rev:2", 10.0, (observation(),))
        result = GapTriggeredRecallGate().evaluate(
            signature,
            relation_terms_by_axis={RealityGapAxis.RELATION: ("front-interaction",)},
        )
        self.assertIsInstance(result, RecallDirective)
        self.assertFalse(result.constitutes_reentry)
        self.assertFalse(result.constitutes_reevaluation)
        self.assertFalse(result.permits_direct_probability_update)
        self.assertFalse(result.permits_direct_choice)
        self.assertEqual(result.gap_observation_ids, ("gap:relation:1",))

    def test_signature_is_non_scalar_and_rejects_duplicate_axes(self):
        with self.assertRaises(ValueError):
            RealityGapSignature("rev:3", 10.0, (observation(), observation()))

    def test_surface_retrieval_does_not_imply_relation_eligibility(self):
        directive = GapTriggeredRecallGate().evaluate(
            RealityGapSignature("rev:4", 10.0, (observation(),)),
            relation_terms_by_axis={},
        )
        retrieved = (
            RetrievedExperience(
                ("experience:exact", "current:front"),
                "current:front",
                "surface-family matched recall query",
            ),
            RetrievedExperience(
                ("experience:decoy", "current:front::surface-decoy"),
                "current:front::surface-decoy",
                "surface-family matched recall query",
            ),
        )
        authorization = ProvenanceRelationEligibilityGate().assess(
            directive, retrieved
        )
        self.assertEqual(
            authorization.authorized_source_keys,
            (("experience:exact", "current:front"),),
        )
        self.assertEqual(
            tuple(item.eligible for item in authorization.assessments),
            (True, False),
        )
        self.assertFalse(authorization.constitutes_reevaluation)
        self.assertFalse(authorization.permits_direct_probability_update)
        self.assertFalse(authorization.permits_direct_choice)


if __name__ == "__main__":
    unittest.main()
