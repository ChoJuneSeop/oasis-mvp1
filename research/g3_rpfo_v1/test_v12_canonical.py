import unittest

from research.g3_rpfo_v1.operator_v12 import (
    CanonicalRelationalParticipationFoldOperatorV12,
)
from research.g3_rpfo_v1.test_v12_contract import (
    NoopResolver,
    current,
    repository_with_edge,
)
from research.g3_rpfo_v1.rpfo_v12 import CurrentContinuityClaimV12


class CanonicalRPFO12Tests(unittest.TestCase):
    def test_same_past_relation_keeps_two_current_contacts(self):
        repo = repository_with_edge().freeze(current_tau=10.0)
        relations = (current("now:a"), current("now:b"))
        claims = (
            CurrentContinuityClaimV12(
                "claim:a", "now:a", "edge:e1", ("ev:a",), 10.0
            ),
            CurrentContinuityClaimV12(
                "claim:b", "now:b", "edge:e1", ("ev:b",), 10.0
            ),
        )
        op = CanonicalRelationalParticipationFoldOperatorV12(
            resolver=NoopResolver()
        )
        frontier = op.seed_frontier(
            current_tau=10.0,
            current_relations=relations,
            current_claims=claims,
            repository=repo,
        )
        self.assertEqual(len(frontier.contacts), 2)
        self.assertEqual(
            {item.current_relation_id for item in frontier.contacts},
            {"now:a", "now:b"},
        )
        snapshot = op.step(
            current_tau=10.0,
            current_relations=relations,
            current_claims=claims,
            repository=repo,
            frontier=frontier,
        )
        self.assertEqual(snapshot.opened_keys, (("e1", "r1"),))
        self.assertEqual(snapshot.participating_keys, (("e1", "r1"),))


if __name__ == "__main__":
    unittest.main()
