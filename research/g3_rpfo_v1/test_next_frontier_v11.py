import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor, HistoricalLinkProvenance, HistoricalRelationLink, IndexedRelationRepository, LinkActivation, ParticipationDecision, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def record(exp, tau):
    return HistoricalRelationRecord(RelationElementRef(exp, "r", tau, {}), PastRelationSemanticView("s", "o", "r", "done"))


class Resolver:
    def resolve(self, **kwargs):
        key = ("a", "r")
        return ParticipationDecision((key,), (), (LinkActivation("L", ("now",), (key,)),))


class TestNextFrontier(unittest.TestCase):
    def test_link_is_opened_only_on_next_step(self):
        a, b = ("a", "r"), ("b", "r")
        repo = IndexedRelationRepository()
        repo.register_records(((record("a", 1), ("lineage:a",)), (record("b", 2), ())))
        proof = HistoricalLinkProvenance("actual process", ("a", "b"), ("occ",))
        repo.register_link(HistoricalRelationLink("L", (a, b), 2, proof))
        op = RelationalParticipationFoldOperator(repository=repo, resolver=Resolver())
        current = (CurrentRelation("now", "s", "o", "r", "flow"),)
        anchors = (CurrentLineageAnchor("lineage:a", "now", ("ev",), 10, "current flow"),)
        frontier = op.seed_frontier(current_tau=10, current_relations=current, current_anchors=anchors)
        snap = op.step(current_tau=10, current_relations=current, current_anchors=anchors, frontier=frontier)
        self.assertEqual(snap.opened_keys, (a,))
        self.assertEqual(snap.next_frontier.entry_keys, (b,))
        self.assertNotIn(b, snap.opened_keys)


if __name__ == "__main__":
    unittest.main()
