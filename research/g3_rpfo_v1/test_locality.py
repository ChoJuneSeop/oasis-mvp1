from __future__ import annotations

import inspect
import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import ParticipationDecision, RelationalFrontier, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CurrentRelation, HistoricalRelationRecord, PastRelationSemanticView


def _record(exp: str, rel: str, tau: float) -> HistoricalRelationRecord:
    return HistoricalRelationRecord(
        source=RelationElementRef(exp, rel, tau, {"preserved": True}),
        semantic=PastRelationSemanticView("s", "o", "r", "completed"),
    )


def _current() -> CurrentRelation:
    return CurrentRelation("now", "s", "o", "r", "flowing")


class Repo:
    def __init__(self, records):
        self.records = records
        self.get_calls = []
        self.link_calls = []

    def get(self, key):
        self.get_calls.append(key)
        return self.records.get(key)

    def links_for(self, key):
        self.link_calls.append(key)
        return ()


class Resolver:
    def __init__(self, participating=(), unresolved=()):
        self.participating = participating
        self.unresolved = unresolved

    def resolve(self, **kwargs):
        return ParticipationDecision(self.participating, self.unresolved)


class LocalityTests(unittest.TestCase):
    def test_step_api_has_no_global_retrieval_controls(self):
        params = inspect.signature(RelationalParticipationFoldOperator.step).parameters
        for forbidden in ("history_records", "similarity", "score", "threshold", "top_k"):
            self.assertNotIn(forbidden, params)

    def test_only_frontier_key_is_opened(self):
        e1, e2, e3 = ("e1", "r1"), ("e2", "r2"), ("e3", "r3")
        repo = Repo({e1: _record(*e1, 1.0), e2: _record(*e2, 2.0), e3: _record(*e3, 3.0)})
        snapshot = RelationalParticipationFoldOperator(
            repository=repo,
            resolver=Resolver(participating=(e1,)),
        ).step(
            current_tau=10.0,
            current_relations=(_current(),),
            frontier=RelationalFrontier(("now",), (e1,)),
        )
        self.assertEqual(snapshot.opened_keys, (e1,))
        self.assertEqual(repo.get_calls, [e1])
        self.assertEqual(repo.link_calls, [e1])
        self.assertFalse(snapshot.global_history_scan)
        self.assertFalse(snapshot.recursive_history_fold)


if __name__ == "__main__":
    unittest.main()
