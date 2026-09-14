import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import IndexedRelationRepository, ParticipationDecision, ParticipationState, RelationalFrontier, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def record(exp):
    return HistoricalRelationRecord(RelationElementRef(exp, "r", 1, {}), PastRelationSemanticView("s", "o", "r", "done"))


class Resolver:
    def resolve(self, **kwargs):
        a, b = ("a", "r"), ("b", "r")
        return ParticipationDecision((b,), ())


class TestJointUnfold(unittest.TestCase):
    def test_prior_participant_can_unfold_without_history_deletion(self):
        a, b = ("a", "r"), ("b", "r")
        repo = IndexedRelationRepository()
        repo.register_records(((record("a"), ()), (record("b"), ())))
        op = RelationalParticipationFoldOperator(repository=repo, resolver=Resolver())
        current = (CurrentRelation("now", "s", "o", "r", "flow"),)
        prior = ParticipationState((a, b), ((a, b),), {a: ("old",), b: ("old",)})
        snap = op.step(current_tau=10, current_relations=current, current_anchors=(), frontier=RelationalFrontier(("now",)), prior_state=prior)
        self.assertEqual(snap.unfolded_keys, (a,))
        self.assertTrue(repo.contains(a))
        self.assertTrue(repo.contains(b))


if __name__ == "__main__":
    unittest.main()
