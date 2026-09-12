from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_realtime_split_v1.fold import RelationalFoldOperator
from research.g3_realtime_split_v1.test_split_runtime import build_split_core
from research.g3_realtime_split_v1.test_three_layers import Flow
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness
from research.g3_realtime_split_v1.worker import DeferredRelationWorker
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.oasis_core_v11.current_relational_core import (
    CurrentRelation,
    HistoricalRelationRecord,
    PastRelationSemanticView,
)
from research.oasis_core_v12.contracts import (
    CompletedProcess,
    HistoricalEnvelope,
    ObservedOccurrence,
)
from research.oasis_core_v12.runtime import ExecutionJournal


def historical_record(
    experience_id: str,
    relation_element_id: str,
    *,
    relation_type: str,
    object_role: str,
    process_context: tuple[str, ...],
    completed_at_tau: float = 1.0,
):
    return HistoricalRelationRecord(
        source=RelationElementRef(
            experience_id,
            relation_element_id,
            completed_at_tau,
            {"origin": "fold-test"},
        ),
        semantic=PastRelationSemanticView(
            subject_role="ego-role",
            object_role=object_role,
            relation_type=relation_type,
            relation_state="historical",
            process_context=process_context,
            environment_context={},
            historical_roles=(),
            possibility_links=("maintain",),
        ),
    )


def envelope(record: HistoricalRelationRecord):
    tau = float(record.source.completed_at_tau)
    occurrence = ObservedOccurrence(
        occurrence_id=f"occ:{record.source.experience_id}",
        occurred_at_tau=tau,
        received_at_tau=tau,
        description="fold regression historical occurrence",
        source_ref="fold-regression",
    )
    completion = CompletedProcess(
        experience_id=record.source.experience_id,
        start_tau=max(0.0, tau - 0.1),
        boundary_tau=tau,
        known_at_tau=tau,
        occurrences=(occurrence,),
        scope_description="fold regression completed process",
        closure_method="fixture",
        closure_evidence_refs=(occurrence.occurrence_id,),
    )
    return HistoricalEnvelope(
        record=record,
        completion=completion,
        occurrence_refs=(occurrence.occurrence_id,),
    )


def front_record(exp="front-exp", completed_at_tau=1.0):
    return historical_record(
        exp,
        "front-rel",
        relation_type="longitudinal-relative-motion",
        object_role="front-traffic-role",
        process_context=("front-interaction",),
        completed_at_tau=completed_at_tau,
    )


def lane_record(exp="lane-exp", completed_at_tau=1.0):
    return historical_record(
        exp,
        "lane-rel",
        relation_type="lane-relative-heading",
        object_role="lane-flow-role",
        process_context=("lane-following",),
        completed_at_tau=completed_at_tau,
    )


class FoldOperatorContractTests(unittest.TestCase):
    def test_current_relation_change_changes_active_fold_without_scores_or_thresholds(self):
        operator = RelationalFoldOperator()
        records = (front_record(), lane_record())
        front = CurrentRelation(
            relation_id="current:front",
            subject_role="ego-role",
            object_role="front-traffic-role",
            relation_type="longitudinal-relative-motion",
            relation_state="closing",
            process_context=("front-interaction",),
        )
        lane = CurrentRelation(
            relation_id="current:lane",
            subject_role="ego-role",
            object_role="lane-flow-role",
            relation_type="lane-relative-heading",
            relation_state="positive-heading-offset",
            process_context=("lane-following",),
        )
        front_fold = operator.fold(current_tau=10.0, current_relations=(front,), history_records=records)
        lane_fold = operator.fold(current_tau=10.0, current_relations=(lane,), history_records=records)
        self.assertEqual(front_fold.active_keys, (("front-exp", "front-rel"),))
        self.assertEqual(lane_fold.active_keys, (("lane-exp", "lane-rel"),))
        self.assertEqual(front_fold.omitted_semantics, "unresolved_not_zero")
        self.assertEqual(front_fold.selection_basis, "symbolic_relational_contact")
        for forbidden in ("threshold", "score", "top_k", "decay", "recency_weight"):
            self.assertFalse(hasattr(operator, forbidden), forbidden)

    def test_future_history_cannot_enter_fold(self):
        operator = RelationalFoldOperator()
        current = CurrentRelation(
            relation_id="current:front",
            subject_role="ego-role",
            object_role="front-traffic-role",
            relation_type="longitudinal-relative-motion",
            relation_state="closing",
            process_context=("front-interaction",),
        )
        with self.assertRaisesRegex(Exception, "future"):
            operator.fold(
                current_tau=10.0,
                current_relations=(current,),
                history_records=(front_record(completed_at_tau=11.0),),
            )

    def test_core_action_view_uses_fold_and_preserves_same_epoch_history_snapshot(self):
        core, _ = build_split_core()
        front = envelope(front_record())
        lane = envelope(lane_record())
        core.add_history_batch((front, lane))

        flow = Flow(epoch=200, tau=10.0)
        flow.front_present = False
        frame = flow.capture()
        view = core.open_current_epoch(frame)
        active = {(r.experience_id, r.relation_element_id) for r in view.relation_elements}
        self.assertIn(("lane-exp", "lane-rel"), active)
        self.assertNotIn(("front-exp", "front-rel"), active)
        fold = core.fold_snapshot()
        self.assertIn(("front-exp", "front-rel"), fold.omitted_keys)

        # A relation published after the epoch opened cannot retroactively enter it.
        late = envelope(front_record("late-front"))
        core.publish_validated_history_batch((late,))
        same = core.open_current_epoch(frame)
        same_active = {(r.experience_id, r.relation_element_id) for r in same.relation_elements}
        self.assertNotIn(("late-front", "front-rel"), same_active)

        flow.epoch = 201
        flow.tau = 10.1
        flow.front_present = True
        later = core.open_current_epoch(flow.capture())
        later_active = {(r.experience_id, r.relation_element_id) for r in later.relation_elements}
        self.assertIn(("late-front", "front-rel"), later_active)

    def test_validation_ledger_keeps_fold_omission_audit_without_gating_relation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            core, closure = build_split_core()
            core.add_history_batch((envelope(front_record()), envelope(lane_record())))
            journal = ExecutionJournal(":memory:")
            worker = DeferredRelationWorker(
                core=core,
                closure_evaluator=closure,
                scope_id="fold-validation",
                archive_path=root / "archive.sqlite",
                evidence_path=root / "relations.sqlite",
                trace_path=root / "relations.jsonl",
            )
            worker.start()
            try:
                harness = RealtimeOrganicHarness(core, journal, authorize=lambda *_: True, worker=worker)
                flow = Flow(epoch=300, tau=20.0)
                flow.front_present = False
                result = harness.execute_decision_epoch(
                    flow,
                    run_id="fold-validation",
                    subject_id="ego",
                    deadline_tau=25.0,
                )
                self.assertTrue(result.realized)
                worker.submit_post(
                    post_observation=flow.post_observation(front_present=False),
                    post_tau=20.1,
                    tick_index=1,
                    carla_frame=301,
                )
                worker.drain(10.0)
                ledger = OrganicEvidenceLedger(str(worker.validation_evidence_path))
                try:
                    payload = ledger.events()[0]["payload"]
                finally:
                    ledger.close()
                audit = payload["responsibility"]["fold_validation"]
                self.assertEqual(audit["selection_basis"], "symbolic_relational_contact")
                self.assertTrue(audit["omitted_relation_refs"])
                self.assertIn("false_negative_relation_refs", audit)
                encoded = json.dumps(audit, sort_keys=True)
                for forbidden in ("future_trajectory", "scenario_label", "seed", "raw_actor_id", "map_topology"):
                    self.assertNotIn(forbidden, encoded)
            finally:
                worker.close(timeout=5.0)
                journal.close()


if __name__ == "__main__":
    unittest.main()
