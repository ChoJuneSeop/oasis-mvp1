import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.current_relational_core import (
    HistoricalRelationRecord,
    PastRelationSemanticView,
)
from research.oasis_core_v11.history_admission import (
    HistoryAdmissionBridge,
    HistoryAdmissionError,
)
from research.oasis_core_v11.test_current_relational_core import make_core, observation


def closed_entry(entry_id="E-new", outcome="relation persisted after realization"):
    return HistoryEntry(
        entry_id=entry_id,
        decision_tau=10.0,
        realized_tau=10.05,
        outcome_tau=10.10,
        relation_end_tau=10.20,
        selected_possibility_id="yield",
        realization_ref="realization-1",
        realization_count=1,
        outcome_description=outcome,
        current_reality={"flow_phase": "approach"},
        closure_method="relation participants no longer share the active approach process",
        closure_evidence={"closed": True, "post_relation": "separated"},
    )


class GoodExtractor:
    def extract(self, entry):
        return (
            HistoricalRelationRecord(
                source=RelationElementRef(
                    entry.entry_id,
                    "rel-closed-approach",
                    entry.relation_end_tau,
                    {
                        "origin_entry_id": entry.entry_id,
                        "closure_method": entry.closure_method,
                    },
                ),
                semantic=PastRelationSemanticView(
                    subject_role="ego-role",
                    object_role="front-role",
                    relation_type="closing-gap",
                    relation_state="approaching",
                    process_context=("approach", "yield-realized", "relation-closed"),
                    environment_context={"visibility": "clear"},
                    historical_roles=("recognition", "constraint"),
                    possibility_links=(entry.selected_possibility_id,),
                ),
            ),
        )


class HistoryAdmissionTests(unittest.TestCase):
    def test_closed_realized_entry_enters_future_history(self):
        core = make_core(())
        bridge = HistoryAdmissionBridge(core=core, extractor=GoodExtractor())
        records = bridge.admit(closed_entry())
        self.assertEqual(len(records), 1)
        self.assertEqual(len(core.history_records()), 1)

        next_view = core.open_epoch(observation())
        key = ("E-new", "rel-closed-approach")
        self.assertIn(key, next_view.role_trace_by_relation)
        self.assertIn("yield", next_view.generated_by_relation[key])

    def test_no_change_or_persistence_outcome_can_still_be_completed_history(self):
        core = make_core(())
        bridge = HistoryAdmissionBridge(core=core, extractor=GoodExtractor())
        records = bridge.admit(closed_entry(outcome="no material state change; relation persisted until closure"))
        self.assertEqual(records[0].source.experience_id, "E-new")

    def test_wrong_experience_lineage_is_rejected(self):
        class WrongIdExtractor(GoodExtractor):
            def extract(self, entry):
                record = super().extract(entry)[0]
                return (
                    HistoricalRelationRecord(
                        source=RelationElementRef(
                            "different-entry",
                            record.source.relation_element_id,
                            entry.relation_end_tau,
                            {},
                        ),
                        semantic=record.semantic,
                    ),
                )

        with self.assertRaises(HistoryAdmissionError):
            HistoryAdmissionBridge(make_core(()), WrongIdExtractor()).admit(closed_entry())

    def test_preclosure_or_late_completion_timestamp_is_rejected(self):
        class WrongTimeExtractor(GoodExtractor):
            def extract(self, entry):
                record = super().extract(entry)[0]
                return (
                    HistoricalRelationRecord(
                        source=RelationElementRef(
                            entry.entry_id,
                            record.source.relation_element_id,
                            entry.relation_end_tau - 0.05,
                            {},
                        ),
                        semantic=record.semantic,
                    ),
                )

        with self.assertRaises(HistoryAdmissionError):
            HistoryAdmissionBridge(make_core(()), WrongTimeExtractor()).admit(closed_entry())

    def test_recency_or_memory_importance_cannot_be_smuggled_into_semantic_context(self):
        class RecencyExtractor(GoodExtractor):
            def extract(self, entry):
                record = super().extract(entry)[0]
                return (
                    HistoricalRelationRecord(
                        source=record.source,
                        semantic=PastRelationSemanticView(
                            subject_role=record.semantic.subject_role,
                            object_role=record.semantic.object_role,
                            relation_type=record.semantic.relation_type,
                            relation_state=record.semantic.relation_state,
                            process_context=record.semantic.process_context,
                            environment_context={"recency_score": 0.9},
                            historical_roles=record.semantic.historical_roles,
                            possibility_links=record.semantic.possibility_links,
                        ),
                    ),
                )

        with self.assertRaises(HistoryAdmissionError):
            HistoryAdmissionBridge(make_core(()), RecencyExtractor()).admit(closed_entry())

    def test_empty_relation_extraction_is_not_saved_as_fake_experience(self):
        class EmptyExtractor:
            def extract(self, entry):
                return ()

        with self.assertRaises(HistoryAdmissionError):
            HistoryAdmissionBridge(make_core(()), EmptyExtractor()).admit(closed_entry())


if __name__ == "__main__":
    unittest.main()
