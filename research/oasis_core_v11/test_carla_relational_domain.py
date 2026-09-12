import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.carla_relational_domain import (
    CARLARelationalDomainError,
    ClosedCARLARelationExtractor,
    CurrentObservationRelationBuilder,
)


def obs(*, present=True, gap=12.0, closing=0.8, heading=0.2, density=2):
    return PresentObservation(
        epoch=1,
        ego_speed_mps=2.0,
        front_present=present,
        front_gap_m=gap,
        front_closing_mps=closing,
        front_kind="vehicle" if present else "none",
        local_heading_error_deg=heading,
        local_density=density,
    )


def entry(symbolic_context=None, possibility_links=None):
    relation = {
        "relation_element_id": "r-closed-1",
        "subject_role": "ego-role",
        "object_role": "front-traffic-role",
        "relation_type": "longitudinal-relative-motion",
        "relation_state": "closing",
        "process_context": ["front-interaction", "yield-realized", "closure"],
        "historical_roles": ["recognition", "constraint"],
        "symbolic_context": symbolic_context or {"interaction_kind": "front-traffic"},
    }
    if possibility_links is not None:
        relation["possibility_links"] = possibility_links
    return HistoryEntry(
        entry_id="E-closed-1",
        decision_tau=10.0,
        realized_tau=10.05,
        outcome_tau=10.10,
        relation_end_tau=10.20,
        selected_possibility_id="yield",
        realization_ref="realization-1",
        realization_count=1,
        outcome_description="front relation closed after realization",
        closure_method="evaluator-certified relational closure",
        closure_evidence={"closed_relations": [relation]},
    )


class CARLARelationalDomainTests(unittest.TestCase):
    def test_current_relation_state_uses_sign_not_arbitrary_gap_threshold(self):
        builder = CurrentObservationRelationBuilder()
        near = builder.build(obs(gap=2.0, closing=0.8))
        far = builder.build(obs(gap=200.0, closing=0.8))
        near_front = next(r for r in near if r.relation_id == "current:front-longitudinal")
        far_front = next(r for r in far if r.relation_id == "current:front-longitudinal")
        self.assertEqual(near_front.relation_state, "closing")
        self.assertEqual(far_front.relation_state, "closing")
        self.assertNotEqual(
            near_front.environment_context["observed_gap_m"],
            far_front.environment_context["observed_gap_m"],
        )

    def test_closing_opening_and_zero_are_structural_sign_states(self):
        builder = CurrentObservationRelationBuilder()
        states = []
        for closing in (0.8, -0.8, 0.0):
            relations = builder.build(obs(closing=closing))
            states.append(next(r.relation_state for r in relations if r.relation_id == "current:front-longitudinal"))
        self.assertEqual(states, ["closing", "opening", "no-relative-motion"])

    def test_absent_front_object_does_not_create_front_relation(self):
        relations = CurrentObservationRelationBuilder().build(obs(present=False, closing=0.0))
        self.assertNotIn("current:front-longitudinal", {r.relation_id for r in relations})
        self.assertIn("current:lane-heading", {r.relation_id for r in relations})
        self.assertIn("current:local-participation", {r.relation_id for r in relations})

    def test_closed_relation_extractor_keeps_symbolic_process_not_raw_geometry(self):
        records = ClosedCARLARelationExtractor().extract(entry())
        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(record.source.experience_id, "E-closed-1")
        self.assertEqual(record.source.completed_at_tau, 10.20)
        self.assertEqual(record.semantic.relation_type, "longitudinal-relative-motion")
        self.assertEqual(record.semantic.environment_context, {"interaction_kind": "front-traffic"})
        self.assertIn("yield", record.semantic.possibility_links)

    def test_realized_possibility_is_preserved_even_if_not_supplied_in_links(self):
        records = ClosedCARLARelationExtractor().extract(entry(possibility_links=["proceed"]))
        self.assertEqual(records[0].semantic.possibility_links, ("proceed", "yield"))

    def test_raw_gap_or_actor_identity_is_rejected_from_historical_semantics(self):
        for context in (
            {"front_gap_m": 12.0},
            {"raw_actor_id": 991},
            {"position_x": 3.0},
            {"memory_score": 0.9},
        ):
            with self.subTest(context=context):
                with self.assertRaises(CARLARelationalDomainError):
                    ClosedCARLARelationExtractor().extract(entry(symbolic_context=context))

    def test_unexpected_closure_schema_is_rejected(self):
        bad = entry()
        relation = dict(bad.closure_evidence["closed_relations"][0])
        relation["future_trajectory"] = [1, 2, 3]
        bad = HistoryEntry(
            entry_id=bad.entry_id,
            decision_tau=bad.decision_tau,
            realized_tau=bad.realized_tau,
            outcome_tau=bad.outcome_tau,
            relation_end_tau=bad.relation_end_tau,
            selected_possibility_id=bad.selected_possibility_id,
            realization_ref=bad.realization_ref,
            realization_count=1,
            outcome_description=bad.outcome_description,
            closure_method=bad.closure_method,
            closure_evidence={"closed_relations": [relation]},
        )
        with self.assertRaises(CARLARelationalDomainError):
            ClosedCARLARelationExtractor().extract(bad)


if __name__ == "__main__":
    unittest.main()
