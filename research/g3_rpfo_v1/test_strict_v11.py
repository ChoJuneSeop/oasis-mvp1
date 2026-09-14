import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.hardening import StrictRelationalParticipationFoldOperator
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor, HistoricalLinkProvenance, HistoricalRelationLink, IndexedRelationRepository, LinkActivation, ParticipationDecision
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError, CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def rec(exp):
    return HistoricalRelationRecord(RelationElementRef(exp, "r", 1, {}), PastRelationSemanticView("s", "o", "r", "done"))


class BadResolver:
    def resolve(self, **kwargs):
        a, c = ("a", "r"), ("c", "r")
        return ParticipationDecision((a, c), (), (LinkActivation("L", ("r2",), (a, c)),))


class StrictTests(unittest.TestCase):
    def test_nonincident_claimed_cause_fails_closed(self):
        a, b, c = ("a", "r"), ("b", "r"), ("c", "r")
        repo = IndexedRelationRepository()
        repo.register_records(((rec("a"), ("x",)), (rec("b"), ()), (rec("c"), ("x",))))
        repo.register_link(HistoricalRelationLink("L", (a, b), 2, HistoricalLinkProvenance("actual process", ("a", "b"), ("occ",))))
        current = (CurrentRelation("r2", "s", "o", "r", "flow"), CurrentRelation("r1", "s", "o", "r", "flow"))
        anchors = (CurrentLineageAnchor("x", "r2", ("ev",), 10, "current flow"),)
        op = StrictRelationalParticipationFoldOperator(repository=repo, resolver=BadResolver())
        frontier = op.seed_frontier(current_tau=10, current_relations=current, current_anchors=anchors)
        self.assertEqual(frontier.current_relation_ids, ("r2", "r1"))
        with self.assertRaises(CoreV11InvariantError):
            op.step(current_tau=10, current_relations=current, current_anchors=anchors, frontier=frontier)


if __name__ == "__main__": unittest.main()
