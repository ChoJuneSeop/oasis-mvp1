from __future__ import annotations

import unittest

from research.g3_realtime_split_v1.fold import RelationalFoldOperator
from research.g3_realtime_split_v1.test_fold_operator import historical_record
from research.oasis_core_v11.current_relational_core import (
    CurrentRelation,
    RelationContribution,
)


class ProcessContextContinuityOperator:
    """Adversarial alternative semantics used only to test Fold's declared boundary.

    A past relation may participate when its process context overlaps the current
    process, even when object role / relation type changed.  This is not proposed as
    the new OASIS rule; it is a counterexample showing what exact-signature Fold v1
    cannot establish on its own.
    """

    def relate(self, *, current_relations, past, candidate_ids):
        current_context = {
            token
            for relation in current_relations
            for token in relation.process_context
        }
        shared = tuple(x for x in past.process_context if x in current_context)
        if not shared or "maintain" not in set(candidate_ids):
            return ()
        anchors = tuple(relation.relation_id for relation in current_relations)
        return (
            RelationContribution(
                possibility_id="maintain",
                current_relation_ids=anchors,
                role_trace=("process-context-continuity",),
                generated_possibilities=("maintain",),
                trace={"shared_process_context": shared},
            ),
        )


class ProcessSensitiveOperator:
    """Adversarial operator that rejects exact role/type matches across processes."""

    def relate(self, *, current_relations, past, candidate_ids):
        anchors = tuple(
            relation.relation_id
            for relation in current_relations
            if relation.subject_role == past.subject_role
            and relation.object_role == past.object_role
            and relation.relation_type == past.relation_type
            and set(relation.process_context) & set(past.process_context)
        )
        if not anchors or "maintain" not in set(candidate_ids):
            return ()
        return (
            RelationContribution(
                possibility_id="maintain",
                current_relation_ids=anchors,
                role_trace=("process-sensitive-continuity",),
                generated_possibilities=("maintain",),
                trace={},
            ),
        )


class FoldCounterexampleQualificationTests(unittest.TestCase):
    def test_role_or_type_transformation_can_be_a_fold_false_negative(self):
        """Kill case: meaningful process continuity may cross the exact signature."""
        fold = RelationalFoldOperator()
        past = historical_record(
            "cross-role-exp",
            "cross-role-rel",
            relation_type="longitudinal-relative-motion",
            object_role="front-traffic-role",
            process_context=("shared-conflict-process",),
        )
        current = CurrentRelation(
            relation_id="current:crossing",
            subject_role="ego-role",
            object_role="crossing-traffic-role",
            relation_type="crossing-conflict",
            relation_state="active",
            process_context=("shared-conflict-process",),
        )
        snapshot = fold.fold(
            current_tau=10.0,
            current_relations=(current,),
            history_records=(past,),
        )
        self.assertEqual(snapshot.active_count, 0)
        self.assertEqual(snapshot.omitted_count, 1)

        misses = fold.validate_omissions(
            snapshot=snapshot,
            current_relations=(current,),
            candidate_ids=("maintain",),
            history_by_key={(past.source.experience_id, past.source.relation_element_id): past},
            relation_operator=ProcessContextContinuityOperator(),
        )
        self.assertEqual(misses, (("cross-role-exp", "cross-role-rel"),))

    def test_exact_signature_can_overactivate_when_process_context_diverges(self):
        """Kill case: exact role/type contact is not sufficient for all semantics."""
        fold = RelationalFoldOperator()
        past = historical_record(
            "different-process-exp",
            "same-signature-rel",
            relation_type="longitudinal-relative-motion",
            object_role="front-traffic-role",
            process_context=("parking-process",),
        )
        current = CurrentRelation(
            relation_id="current:front",
            subject_role="ego-role",
            object_role="front-traffic-role",
            relation_type="longitudinal-relative-motion",
            relation_state="closing",
            process_context=("highway-follow-process",),
        )
        snapshot = fold.fold(
            current_tau=10.0,
            current_relations=(current,),
            history_records=(past,),
        )
        self.assertEqual(snapshot.active_keys, (("different-process-exp", "same-signature-rel"),))
        contributions = ProcessSensitiveOperator().relate(
            current_relations=(current,),
            past=past.semantic,
            candidate_ids=("maintain",),
        )
        self.assertEqual(contributions, ())

    def test_counterexample_does_not_turn_omission_into_zero_or_delete_history(self):
        fold = RelationalFoldOperator()
        past = historical_record(
            "latent-exp",
            "latent-rel",
            relation_type="longitudinal-relative-motion",
            object_role="front-traffic-role",
            process_context=("latent-process",),
        )
        current = CurrentRelation(
            relation_id="current:lane",
            subject_role="ego-role",
            object_role="lane-flow-role",
            relation_type="lane-relative-heading",
            relation_state="aligned",
            process_context=("lane-following",),
        )
        snapshot = fold.fold(
            current_tau=10.0,
            current_relations=(current,),
            history_records=(past,),
        )
        self.assertEqual(snapshot.omitted_semantics, "unresolved_not_zero")
        self.assertEqual(snapshot.history_size, 1)
        self.assertEqual(snapshot.omitted_keys, (("latent-exp", "latent-rel"),))


if __name__ == "__main__":
    unittest.main()
