from __future__ import annotations

import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import HistoricalRelationLink, ParticipationDecision, RelationalFrontier, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def _record(exp: str, rel: str, tau: float) -> HistoricalRelationRecord:
    return HistoricalRelationRecord(
        source=RelationElementRef(exp, rel, tau, {"preserved": True}),
        semantic=PastRelationSemanticView("s", "o", "r", "completed"),
    )


def _current() -> CurrentRelation:
    return CurrentRelation("now", "s", "o", "r", "flowing")


class Repo:
    def __init__(self, records, links):
        self.records = records
        self.links = links
        self.get_calls = []

    def get(self, key):
        self.get_calls.append(key)
        return self.records.get(key)

    def links_for(self, key):
        return tuple(link for link in self.links if key in link.members)


class Resolver:
    def __init__(self, participating, activated=(), joint=()):
        self.participating = participating
        self.activated = activated
        self.joint = joint

    def resolve(self, **kwargs):
        return ParticipationDecision(
            participating_keys=self.participating,
            unresolved_keys=(),
            activated_link_ids=self.activated,
            joint_participations=self.joint,
        )


class TraversalTests(unittest.TestCase):
    def test_next_frontier_is_not_opened_in_same_step(self):
        e1, e2 = ("e1", "r1"), ("e2", "r2")
        link = HistoricalRelationLink("l12", (e1, e2), 2.0)
        repo = Repo({e1: _record(*e1, 1.0), e2: _record(*e2, 2.0)}, (link,))
        first = RelationalParticipationFoldOperator(
            repository=repo,
            resolver=Resolver((e1,), ("l12",)),
        ).step(
            current_tau=10.0,
            current_relations=(_current(),),
            frontier=RelationalFrontier(("now",), (e1,)),
        )
        self.assertEqual(first.next_frontier.entry_keys, (e2,))
        self.assertEqual(repo.get_calls, [e1])

    def test_same_link_can_be_traversed_from_either_member(self):
        e1, e2 = ("e1", "r1"), ("e2", "r2")
        link = HistoricalRelationLink("l12", (e1, e2), 2.0)
        repo = Repo({e1: _record(*e1, 1.0), e2: _record(*e2, 2.0)}, (link,))
        reverse = RelationalParticipationFoldOperator(
            repository=repo,
            resolver=Resolver((e2,), ("l12",)),
        ).step(
            current_tau=10.0,
            current_relations=(_current(),),
            frontier=RelationalFrontier(("now",), (e2,)),
        )
        self.assertEqual(reverse.next_frontier.entry_keys, (e1,))
        self.assertEqual(repo.records[e1].source.completed_at_tau, 1.0)
        self.assertEqual(repo.records[e2].source.completed_at_tau, 2.0)

    def test_multi_member_link_can_express_joint_participation(self):
        e1, e2, e3 = ("e1", "r1"), ("e2", "r2"), ("e3", "r3")
        link = HistoricalRelationLink("j123", (e1, e2, e3), 3.0)
        repo = Repo({e1: _record(*e1, 1.0), e2: _record(*e2, 2.0), e3: _record(*e3, 3.0)}, (link,))
        snapshot = RelationalParticipationFoldOperator(
            repository=repo,
            resolver=Resolver((e1, e2), ("j123",), ((e1, e2),)),
        ).step(
            current_tau=10.0,
            current_relations=(_current(),),
            frontier=RelationalFrontier(("now",), (e1, e2)),
        )
        self.assertEqual(snapshot.joint_participations, ((e1, e2),))
        self.assertEqual(snapshot.next_frontier.entry_keys, (e3,))
        self.assertNotIn(e3, repo.get_calls)


if __name__ == "__main__":
    unittest.main()
