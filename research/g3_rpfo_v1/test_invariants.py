from __future__ import annotations

import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import HistoricalRelationLink, ParticipationDecision, RelationalFrontier, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError, CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def _record(exp: str, rel: str, tau: float) -> HistoricalRelationRecord:
    return HistoricalRelationRecord(
        source=RelationElementRef(exp, rel, tau, {"preserved": True}),
        semantic=PastRelationSemanticView("s", "o", "r", "completed"),
    )


def _current() -> CurrentRelation:
    return CurrentRelation("now", "s", "o", "r", "flowing")


class Repo:
    def __init__(self, records, links=()):
        self.records = records
        self.links = links

    def get(self, key):
        return self.records.get(key)

    def links_for(self, key):
        return tuple(link for link in self.links if key in link.members)


class Resolver:
    def __init__(self, participating=(), unresolved=(), activated=()):
        self.participating = participating
        self.unresolved = unresolved
        self.activated = activated

    def resolve(self, **kwargs):
        return ParticipationDecision(self.participating, self.unresolved, self.activated)


class InvariantTests(unittest.TestCase):
    def test_unresolved_is_not_zero_or_deletion(self):
        e1 = ("e1", "r1")
        repo = Repo({e1: _record(*e1, 1.0)})
        snapshot = RelationalParticipationFoldOperator(
            repository=repo,
            resolver=Resolver(unresolved=(e1,)),
        ).step(
            current_tau=10.0,
            current_relations=(_current(),),
            frontier=RelationalFrontier(("now",), (e1,)),
        )
        self.assertEqual(snapshot.unresolved_keys, (e1,))
        self.assertEqual(snapshot.unresolved_semantics, "not_currently_participating_not_zero")
        self.assertIn(e1, repo.records)

    def test_future_record_fails_closed(self):
        e1 = ("e1", "r1")
        repo = Repo({e1: _record(*e1, 20.0)})
        with self.assertRaises(CoreV11InvariantError):
            RelationalParticipationFoldOperator(
                repository=repo,
                resolver=Resolver(participating=(e1,)),
            ).step(
                current_tau=10.0,
                current_relations=(_current(),),
                frontier=RelationalFrontier(("now",), (e1,)),
            )

    def test_future_link_fails_closed(self):
        e1, e2 = ("e1", "r1"), ("e2", "r2")
        link = HistoricalRelationLink("future", (e1, e2), 20.0)
        repo = Repo({e1: _record(*e1, 1.0), e2: _record(*e2, 2.0)}, (link,))
        with self.assertRaises(CoreV11InvariantError):
            RelationalParticipationFoldOperator(
                repository=repo,
                resolver=Resolver(participating=(e1,)),
            ).step(
                current_tau=10.0,
                current_relations=(_current(),),
                frontier=RelationalFrontier(("now",), (e1,)),
            )

    def test_nonlocal_link_activation_is_rejected(self):
        e1 = ("e1", "r1")
        repo = Repo({e1: _record(*e1, 1.0)})
        with self.assertRaises(CoreV11InvariantError):
            RelationalParticipationFoldOperator(
                repository=repo,
                resolver=Resolver(participating=(e1,), activated=("outside",)),
            ).step(
                current_tau=10.0,
                current_relations=(_current(),),
                frontier=RelationalFrontier(("now",), (e1,)),
            )


if __name__ == "__main__":
    unittest.main()
