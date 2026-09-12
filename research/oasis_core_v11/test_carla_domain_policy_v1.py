import inspect
import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import (
    BoundContribution,
    CurrentRelation,
    PastRelationSemanticView,
    PossibilityCandidate,
    RelationContribution,
    ResponsibilityVector,
)
from research.oasis_core_v11.carla_domain_policy_v1 import (
    ContinuousUVITResponsibilityOperator,
    CurrentFeasibleCandidateGenerator,
    FrontInteractionClosureEvaluator,
    MemoryIsolatedActuationOperator,
    ParetoThenDistributionChoiceOperator,
    SemanticContinuityRelationOperator,
    TraceDerivedReconstructionOperator,
)


def obs(**changes):
    data = dict(
        epoch=100,
        ego_speed_mps=3.0,
        front_present=True,
        front_gap_m=10.0,
        front_closing_mps=0.7,
        front_kind="vehicle",
        local_heading_error_deg=0.2,
        local_density=2,
    )
    data.update(changes)
    return PresentObservation(**data)


def current_relations():
    return (
        CurrentRelation("current:front-longitudinal", "ego-role", "front-traffic-role", "longitudinal-relative-motion", "closing"),
        CurrentRelation("current:lane-heading", "ego-role", "lane-flow-role", "lane-relative-heading", "positive-heading-offset"),
        CurrentRelation("current:local-participation", "ego-role", "local-traffic-field-role", "local-participation-state", "observed"),
    )


def bound(exp, rel, roles=("relation-continuity",), hist_roles=("recognition",)):
    source = RelationElementRef(exp, rel, 1.0, {})
    semantic = PastRelationSemanticView(
        "ego-role",
        "front-traffic-role",
        "longitudinal-relative-motion",
        "closing",
        historical_roles=hist_roles,
        possibility_links=("yield-space",),
    )
    contribution = RelationContribution(
        "yield-space",
        ("current:front-longitudinal",),
        roles,
        ("yield-space",),
        {"basis": "test"},
    )
    return BoundContribution(source, semantic, contribution)


class DomainPolicyTests(unittest.TestCase):
    def test_candidate_generation_uses_current_evidence_only(self):
        candidates = CurrentFeasibleCandidateGenerator().candidates(obs(), current_relations())
        ids = {c.possibility_id for c in candidates}
        self.assertIn("continue-flow", ids)
        self.assertIn("yield-space", ids)
        self.assertIn("align-heading-negative", ids)
        self.assertTrue(all(c.current_evidence for c in candidates))

    def test_no_front_relation_means_no_yield_candidate(self):
        relations = tuple(r for r in current_relations() if r.relation_id != "current:front-longitudinal")
        ids = {c.possibility_id for c in CurrentFeasibleCandidateGenerator().candidates(obs(front_present=False), relations)}
        self.assertNotIn("yield-space", ids)

    def test_relation_operator_has_no_time_or_age_parameter(self):
        params = inspect.signature(SemanticContinuityRelationOperator.relate).parameters
        self.assertNotIn("tau", params)
        self.assertNotIn("age", params)
        self.assertNotIn("completed_at_tau", params)

    def test_reconstruction_marks_effect_unmeasured_until_probe(self):
        items = (bound("E1", "r1"), bound("E2", "r2", roles=("generation",)))
        result = TraceDerivedReconstructionOperator().reconstruct(
            tau=13.7,
            observation=obs(),
            current_relations=current_relations(),
            candidates=(PossibilityCandidate("yield-space", ("current:front-longitudinal",)),),
            contributions=items,
        )
        self.assertEqual(len(result.measurements), 1)
        measurement = result.measurements[0]
        self.assertEqual(measurement.observed_at_tau, 13.7)
        self.assertTrue(all(link.distribution_effect is None for link in measurement.source_links))
        self.assertGreater(measurement.recombination.value, 0.0)

    def test_responsibility_is_uvit_not_scalar(self):
        op = ContinuousUVITResponsibilityOperator()
        candidate = PossibilityCandidate("continue-flow", ("current:lane-heading",), {"longitudinal_intent": "preserve"})
        vector = op.evaluate(observation=obs(), current_relations=current_relations(), candidate=candidate, contributions=())
        self.assertIsInstance(vector, ResponsibilityVector)
        self.assertFalse(hasattr(vector, "score"))
        for value in (vector.uncertainty, vector.impact, vector.irreversibility, vector.time_constraint):
            self.assertGreaterEqual(value, 0.0)
            self.assertLessEqual(value, 1.0)

    def test_choice_uses_pareto_frontier_without_weighted_score(self):
        candidates = (
            PossibilityCandidate("a", ("current:a",)),
            PossibilityCandidate("b", ("current:b",)),
            PossibilityCandidate("c", ("current:c",)),
        )
        responsibilities = {
            "a": ResponsibilityVector(0.2, 0.2, 0.2, 0.2),
            "b": ResponsibilityVector(0.4, 0.4, 0.4, 0.4),
            "c": ResponsibilityVector(0.1, 0.5, 0.1, 0.5),
        }
        selected = ParetoThenDistributionChoiceOperator().choose(
            observation=obs(),
            candidates=candidates,
            distribution={"a": 0.45, "b": 0.50, "c": 0.05},
            responsibilities=responsibilities,
            contributions=(),
        )
        self.assertEqual(selected, "a")

    def test_actuation_interface_has_no_history_or_memory_input(self):
        params = inspect.signature(MemoryIsolatedActuationOperator.actuation).parameters
        self.assertEqual(set(params), {"self", "observation", "selected"})

    def test_closure_depends_on_relation_process_not_timeout(self):
        evaluator = FrontInteractionClosureEvaluator()
        open_result = evaluator.evaluate(
            realized_observation=obs(front_present=True),
            post_observation=obs(epoch=999, front_present=True, front_gap_m=1000.0),
            selected_possibility_id="yield-space",
        )
        self.assertFalse(open_result.closed)
        closed = evaluator.evaluate(
            realized_observation=obs(front_present=True),
            post_observation=obs(epoch=101, front_present=False, front_gap_m=0.0, front_closing_mps=0.0, front_kind="none"),
            selected_possibility_id="yield-space",
        )
        self.assertTrue(closed.closed)
        self.assertIn("closed_relations", closed.evidence)


if __name__ == "__main__":
    unittest.main()
