import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.rpfo import ParticipationDecision
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
    IndexedRelationRepositoryV12,
    RegisteredRelationV12,
    RelationalParticipationFoldOperatorV12,
)
from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    CurrentRelation,
    HistoricalRelationRecord,
    PastRelationSemanticView,
)


def record(exp="e1", rel="r1", completed=1.0):
    return HistoricalRelationRecord(
        RelationElementRef(exp, rel, completed, {}),
        PastRelationSemanticView("ego", "other", "relation", "completed"),
    )


def current(relation_id):
    return CurrentRelation(relation_id, "ego", "other", "relation", "flowing")


class NoopResolver:
    def resolve(self, **kwargs):
        opened = tuple(kwargs["frontier_records"])
        return ParticipationDecision(opened, ())


def repository_with_edge(*, known_at=1.0):
    repo = IndexedRelationRepositoryV12()
    item = RegisteredRelationV12(record(), 1.0, ("occ:e1",))
    repo.register_relation(item)
    edge = ContinuityEdgeV12(
        "edge:e1",
        item.key,
        ContinuityEdgeProvenanceV12(
            item.key,
            "recorded relational continuity",
            ("occ:e1",),
            1.0,
            known_at,
        ),
    )
    repo.register_continuity_edge(edge)
    return repo


class RPFO12ContractTests(unittest.TestCase):
    def test_one_edge_addresses_one_historical_relation(self):
        repo = repository_with_edge()
        snap = repo.freeze(current_tau=10.0)
        self.assertEqual(snap.resolve_edge("edge:e1").key, ("e1", "r1"))

    def test_unknown_future_edge_is_not_visible(self):
        repo = repository_with_edge(known_at=20.0)
        self.assertIsNone(repo.freeze(current_tau=10.0).resolve_edge("edge:e1"))
        self.assertIsNotNone(repo.freeze(current_tau=20.0).resolve_edge("edge:e1"))

    def test_edge_evidence_must_come_from_source_occurrence(self):
        repo = IndexedRelationRepositoryV12()
        item = RegisteredRelationV12(record(), 1.0, ("occ:e1",))
        repo.register_relation(item)
        bad = ContinuityEdgeV12(
            "edge:bad",
            item.key,
            ContinuityEdgeProvenanceV12(
                item.key, "recorded continuity", ("invented",), 1.0, 1.0
            ),
        )
        with self.assertRaises(CoreV11InvariantError):
            repo.register_continuity_edge(bad)

    def test_epoch_snapshot_cannot_see_later_publication(self):
        repo = repository_with_edge()
        before = repo.freeze(current_tau=10.0)
        item2 = RegisteredRelationV12(record("e2", "r2", 2.0), 2.0, ("occ:e2",))
        repo.register_relation(item2)
        edge2 = ContinuityEdgeV12(
            "edge:e2",
            item2.key,
            ContinuityEdgeProvenanceV12(
                item2.key, "later publication", ("occ:e2",), 2.0, 2.0
            ),
        )
        repo.register_continuity_edge(edge2)
        self.assertIsNone(before.resolve_edge("edge:e2"))
        self.assertIsNotNone(repo.freeze(current_tau=10.0).resolve_edge("edge:e2"))

    def test_same_past_relation_can_contact_multiple_current_relations(self):
        repo = repository_with_edge().freeze(current_tau=10.0)
        relations = (current("now:a"), current("now:b"))
        claims = (
            CurrentContinuityClaimV12("claim:a", "now:a", "edge:e1", ("ev:a",), 10.0),
            CurrentContinuityClaimV12("claim:b", "now:b", "edge:e1", ("ev:b",), 10.0),
        )
        op = RelationalParticipationFoldOperatorV12(resolver=NoopResolver())
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=relations,
            current_claims=claims,
            repository=repo,
        )
        self.assertEqual(len(frontier.contacts), 2)
        self.assertEqual(
            {x.current_relation_id for x in frontier.contacts},
            {"now:a", "now:b"},
        )


if __name__ == "__main__":
    unittest.main()
