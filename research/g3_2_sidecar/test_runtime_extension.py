import unittest

from research.g3_2_sidecar.common import G32InvariantError, RelationElementRef
from research.g3_2_sidecar.reconstruction import AxisObservation, ProvenanceLink, ReconstructionMeasurement
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder


class RuntimeExtensionTests(unittest.TestCase):
    def make_relation(self, rid="E1-r1", completed=2.0):
        return RelationElementRef(
            experience_id="E1",
            relation_element_id=rid,
            completed_at_tau=completed,
            relation_descriptor={"process": "approach"},
        )

    def make_link(self, rel, effect=0.0):
        return ProvenanceLink(
            source=rel,
            distribution_effect=effect,
            participation_roles=("possibility-generation",),
            generated_possibilities=("yield",),
            contribution_trace={"possibility": "yield"},
        )

    def make_reconstruction(self, links):
        return ReconstructionMeasurement(
            possibility_id="yield",
            observed_at_tau=10.0,
            source_links=tuple(links),
            recombination=AxisObservation(0.2, "graph-delta", {"sources": len(links)}),
            role_transformation=AxisObservation(0.4, "role-delta", {"changed": True}),
            structural_transformation=AxisObservation(0.3, "structure-delta", {"new_edge": True}),
        )

    def test_epoch_to_history_flow(self):
        rel = self.make_relation()
        rec = G32EpochRecorder(
            tau=10.0,
            flow_fingerprint="flow-10",
            current_reality={"front_present": True},
            relation_elements=(rel,),
            possibility_distribution={"yield": 0.4, "continue": 0.6},
        )
        p = rec.record_relation_probe(
            rel,
            before_fingerprint="flow-10",
            after_fingerprint="flow-10",
            relation_ablated_distribution={"yield": 0.1, "continue": 0.9},
            role_trace=("possibility-generation",),
            generated_possibilities=("yield",),
        )
        self.assertGreater(p.distribution_effect, 0.0)
        self.assertTrue(p.has_structural_participation)

        r = self.make_reconstruction((self.make_link(rel, p.distribution_effect),))
        rec.record_reconstruction(r)

        entry = rec.complete_history_entry(
            entry_id="E-new",
            realized_tau=10.1,
            outcome_tau=10.4,
            relation_end_tau=10.6,
            selected_possibility_id="yield",
            realization_ref="epoch-10-action",
            realization_count=1,
            outcome_description="relation persisted without material state change",
            closure_method="relation-process evidence",
            closure_evidence={"closed": True},
        )
        self.assertEqual(entry.realization_count, 1)
        self.assertEqual(len(entry.provenance), 1)
        self.assertEqual(entry.reconstruction[0].vector, (0.2, 0.4, 0.3))

    def test_zero_individual_effect_does_not_mean_nonparticipation(self):
        rel1 = self.make_relation("E1-r1")
        rel2 = self.make_relation("E1-r2")
        rec = G32EpochRecorder(
            tau=10.0,
            flow_fingerprint="flow-10",
            current_reality={},
            relation_elements=(rel1, rel2),
            possibility_distribution={"a": 0.5, "b": 0.5},
        )
        p1 = rec.record_relation_probe(
            rel1,
            before_fingerprint="flow-10",
            after_fingerprint="flow-10",
            relation_ablated_distribution={"a": 0.5, "b": 0.5},
            role_trace=("constraint-support",),
            generated_possibilities=("a",),
        )
        p2 = rec.record_relation_probe(
            rel2,
            before_fingerprint="flow-10",
            after_fingerprint="flow-10",
            relation_ablated_distribution={"a": 0.5, "b": 0.5},
            role_trace=("constraint-support",),
            generated_possibilities=("a",),
        )
        self.assertEqual(p1.distribution_effect, 0.0)
        self.assertEqual(p2.distribution_effect, 0.0)
        self.assertTrue(p1.has_structural_participation)
        self.assertTrue(p2.has_structural_participation)

        group = rec.record_group_probe(
            (rel1, rel2),
            before_fingerprint="flow-10",
            after_fingerprint="flow-10",
            group_ablated_distribution={"a": 0.1, "b": 0.9},
            generated_possibilities=("a",),
        )
        self.assertGreater(group.joint_distribution_effect, 0.0)

    def test_multi_relation_reconstruction_requires_matching_joint_probe(self):
        rel1 = self.make_relation("E1-r1")
        rel2 = self.make_relation("E1-r2")
        rec = G32EpochRecorder(
            tau=10.0,
            flow_fingerprint="flow-10",
            current_reality={},
            relation_elements=(rel1, rel2),
            possibility_distribution={"yield": 0.5, "continue": 0.5},
        )
        for rel in (rel1, rel2):
            rec.record_relation_probe(
                rel,
                before_fingerprint="flow-10",
                after_fingerprint="flow-10",
                relation_ablated_distribution={"yield": 0.5, "continue": 0.5},
                role_trace=("joint-source",),
                generated_possibilities=("yield",),
            )
        reconstruction = self.make_reconstruction((self.make_link(rel1), self.make_link(rel2)))
        with self.assertRaises(G32InvariantError):
            rec.record_reconstruction(reconstruction)

        rec.record_group_probe(
            (rel1, rel2),
            before_fingerprint="flow-10",
            after_fingerprint="flow-10",
            group_ablated_distribution={"yield": 0.2, "continue": 0.8},
            generated_possibilities=("yield",),
        )
        rec.record_reconstruction(reconstruction)
        self.assertEqual(len(rec.reconstruction), 1)

    def test_probe_must_not_change_flow(self):
        rel = self.make_relation()
        rec = G32EpochRecorder(
            tau=10.0,
            flow_fingerprint="flow-10",
            current_reality={},
            relation_elements=(rel,),
            possibility_distribution={"a": 1.0},
        )
        with self.assertRaises(G32InvariantError):
            rec.record_relation_probe(
                rel,
                before_fingerprint="flow-10",
                after_fingerprint="changed",
                relation_ablated_distribution={"a": 1.0},
            )

    def test_future_relation_is_rejected(self):
        with self.assertRaises(G32InvariantError):
            G32EpochRecorder(
                tau=10.0,
                flow_fingerprint="flow-10",
                current_reality={},
                relation_elements=(self.make_relation(completed=11.0),),
                possibility_distribution={"a": 1.0},
            )

    def test_realization_is_single(self):
        rel = self.make_relation()
        rec = G32EpochRecorder(
            tau=10.0,
            flow_fingerprint="flow-10",
            current_reality={},
            relation_elements=(rel,),
            possibility_distribution={"a": 1.0},
        )
        with self.assertRaises(G32InvariantError):
            rec.complete_history_entry(
                entry_id="bad",
                realized_tau=10.1,
                outcome_tau=10.2,
                relation_end_tau=10.3,
                selected_possibility_id="a",
                realization_ref="two-actions",
                realization_count=2,
                outcome_description="observed",
                closure_method="relation-process evidence",
                closure_evidence={"closed": True},
            )


if __name__ == "__main__":
    unittest.main()
