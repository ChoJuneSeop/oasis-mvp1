import unittest

from research.g3_2_sidecar.common import G32InvariantError, RelationElementRef
from research.g3_2_sidecar.reconstruction import AxisObservation, ProvenanceLink, ReconstructionMeasurement
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder


class RuntimeExtensionTests(unittest.TestCase):
    def make_relation(self, completed=2.0):
        return RelationElementRef(
            experience_id="E1",
            relation_element_id="E1-r1",
            completed_at_tau=completed,
            relation_descriptor={"process": "approach"},
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
        self.assertGreater(p.degree, 0.0)

        link = ProvenanceLink(
            source=rel,
            participation_degree=p.degree,
            participation_roles=p.role_trace,
            contribution_trace={"possibility": "yield"},
        )
        r = ReconstructionMeasurement(
            possibility_id="yield",
            observed_at_tau=10.0,
            source_links=(link,),
            recombination=AxisObservation(0.2, "graph-delta", {"sources": 1}),
            role_transformation=AxisObservation(0.4, "role-delta", {"changed": True}),
            structural_transformation=AxisObservation(0.3, "structure-delta", {"new_edge": True}),
        )
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
