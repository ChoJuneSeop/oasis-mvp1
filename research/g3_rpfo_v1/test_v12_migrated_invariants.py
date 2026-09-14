from __future__ import annotations

import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_v1.operator_v12 import CanonicalRelationalParticipationFoldOperatorV12
from research.g3_rpfo_v1.rpfo import LinkActivation, ParticipationDecision
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
    HistoricalLinkProvenanceV12,
    HistoricalRelationLinkV12,
    IndexedRelationRepositoryV12,
    RegisteredRelationV12,
)
from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    CurrentRelation,
    HistoricalRelationRecord,
    PastRelationSemanticView,
)


def _record(exp: str, rel: str, completed: float) -> HistoricalRelationRecord:
    return HistoricalRelationRecord(
        RelationElementRef(exp, rel, completed, {}),
        PastRelationSemanticView("ego", "other", "relation", "completed"),
    )


def _current() -> CurrentRelation:
    return CurrentRelation("now", "ego", "other", "relation", "flowing")


def _register(repo: IndexedRelationRepositoryV12, exp: str, rel: str, completed: float):
    occurrence = f"occ:{exp}"
    item = RegisteredRelationV12(_record(exp, rel, completed), completed, (occurrence,))
    repo.register_relation(item)
    edge = ContinuityEdgeV12(
        f"edge:{exp}",
        item.key,
        ContinuityEdgeProvenanceV12(
            item.key,
            "recorded completed relation continuity",
            (occurrence,),
            completed,
            completed,
        ),
    )
    repo.register_continuity_edge(edge)
    return item, edge


def _claim(exp: str, tau: float = 10.0):
    return CurrentContinuityClaimV12(
        f"claim:{exp}", "now", f"edge:{exp}", (f"ev:{exp}",), tau
    )


class StaticResolver:
    def __init__(self, *, participating=(), unresolved=(), activations=(), joint=()):
        self.participating = tuple(participating)
        self.unresolved = tuple(unresolved)
        self.activations = tuple(activations)
        self.joint = tuple(joint)

    def resolve(self, **kwargs):
        return ParticipationDecision(
            participating_keys=self.participating,
            unresolved_opened_keys=self.unresolved,
            activations=self.activations,
            joint_participations=self.joint,
        )


class ActivateOpenedResolver:
    def resolve(self, **kwargs):
        opened = tuple(kwargs["frontier_records"])
        if len(opened) != 1:
            raise AssertionError("test expects exactly one opened historical relation")
        key = opened[0]
        return ParticipationDecision(
            participating_keys=(key,),
            unresolved_opened_keys=(),
            activations=(LinkActivation("link:12", ("now",), (key,)),),
        )


class RPFO12MigratedInvariantTests(unittest.TestCase):
    def test_unresolved_is_not_zero_or_history_deletion(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        frozen = repo.freeze(current_tau=10.0)
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=StaticResolver(unresolved=(e1.key,))
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
        )
        result = op.step(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
            frontier=frontier,
        )
        self.assertEqual(result.unresolved_keys, (e1.key,))
        self.assertEqual(result.unresolved_semantics, "not_currently_participating_not_zero")
        self.assertIsNotNone(frozen.get(e1.key))

    def test_future_historical_link_is_not_visible(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        e2, _ = _register(repo, "e2", "r2", 2.0)
        link = HistoricalRelationLinkV12(
            "link:12",
            (e1.key, e2.key),
            2.0,
            20.0,
            HistoricalLinkProvenanceV12(
                "recorded joint relation",
                ("e1", "e2"),
                ("occ:e1", "occ:e2"),
            ),
        )
        repo.register_link(link)
        self.assertEqual(repo.freeze(current_tau=10.0).links_for(e1.key), ())
        self.assertEqual(repo.freeze(current_tau=20.0).links_for(e1.key), (link,))

    def test_nonlocal_link_activation_is_rejected(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        frozen = repo.freeze(current_tau=10.0)
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=StaticResolver(
                participating=(e1.key,),
                activations=(LinkActivation("missing-link", ("now",), (e1.key,)),),
            )
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
        )
        with self.assertRaises(CoreV11InvariantError):
            op.step(
                current_tau=10.0,
                current_relations=(_current(),),
                current_claims=(_claim("e1"),),
                repository=frozen,
                frontier=frontier,
            )

    def test_only_explicit_current_contact_is_opened(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        _register(repo, "e2", "r2", 2.0)
        frozen = repo.freeze(current_tau=10.0)
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=StaticResolver(unresolved=(e1.key,))
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
        )
        result = op.step(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
            frontier=frontier,
        )
        self.assertEqual(result.opened_keys, (e1.key,))

    def test_historical_link_opens_other_member_only_in_next_frontier(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        e2, _ = _register(repo, "e2", "r2", 2.0)
        repo.register_link(
            HistoricalRelationLinkV12(
                "link:12",
                (e1.key, e2.key),
                2.0,
                2.0,
                HistoricalLinkProvenanceV12(
                    "recorded joint relation",
                    ("e1", "e2"),
                    ("occ:e1", "occ:e2"),
                ),
            )
        )
        frozen = repo.freeze(current_tau=10.0)
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=ActivateOpenedResolver()
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
        )
        result = op.step(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=(_claim("e1"),),
            repository=frozen,
            frontier=frontier,
        )
        self.assertEqual(result.opened_keys, (e1.key,))
        self.assertEqual(result.next_frontier.entry_keys, (e2.key,))

    def test_same_preserved_link_can_expand_from_either_member(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        e2, _ = _register(repo, "e2", "r2", 2.0)
        repo.register_link(
            HistoricalRelationLinkV12(
                "link:12",
                (e1.key, e2.key),
                2.0,
                2.0,
                HistoricalLinkProvenanceV12(
                    "recorded joint relation",
                    ("e1", "e2"),
                    ("occ:e1", "occ:e2"),
                ),
            )
        )
        frozen = repo.freeze(current_tau=10.0)
        for start, other in ((e1, e2), (e2, e1)):
            op = CanonicalRelationalParticipationFoldOperatorV12(
                resolver=ActivateOpenedResolver()
            )
            frontier = op.seed_frontier(
                current_tau=10.0,
                current_relations=(_current(),),
                current_claims=(_claim(start.key[0]),),
                repository=frozen,
            )
            result = op.step(
                current_tau=10.0,
                current_relations=(_current(),),
                current_claims=(_claim(start.key[0]),),
                repository=frozen,
                frontier=frontier,
            )
            self.assertEqual(result.next_frontier.entry_keys, (other.key,))

    def test_joint_participation_requires_currently_opened_participants(self):
        repo = IndexedRelationRepositoryV12()
        e1, _ = _register(repo, "e1", "r1", 1.0)
        e2, _ = _register(repo, "e2", "r2", 2.0)
        frozen = repo.freeze(current_tau=10.0)
        claims = (_claim("e1"), _claim("e2"))
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=StaticResolver(
                participating=(e1.key, e2.key),
                joint=((e1.key, e2.key),),
            )
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=claims,
            repository=frozen,
        )
        result = op.step(
            current_tau=10.0,
            current_relations=(_current(),),
            current_claims=claims,
            repository=frozen,
            frontier=frontier,
        )
        self.assertEqual(result.joint_participations, ((e1.key, e2.key),))


if __name__ == "__main__":
    unittest.main()
