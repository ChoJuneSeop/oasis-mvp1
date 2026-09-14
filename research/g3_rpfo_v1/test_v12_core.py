import unittest

from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
)
from research.g3_rpfo_v1.canonical12 import StrictRPFOOrganicCoreV12
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
)
from research.g3_rpfo_v1.test_core_path_v11 import ParticipateLocal, Responsibility
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v11.test_current_relational_core import make_core as legacy_core
from research.oasis_core_v12.test_supplement import envelope, frame


class RaisingResolver:
    def resolve(self, **kwargs):
        raise CoreV11InvariantError("intentional RPFO transaction failure")


def make_v12(resolver):
    base = legacy_core(())
    past = envelope()
    core = StrictRPFOOrganicCoreV12(
        participation_resolver=resolver,
        history=(past,),
        assessment_operator=OrganicCurrentAssessment(),
        verifier=OrganicCurrentVerifier(),
        preference_operator=ParetoContextPreference(),
        resource_allocator=OrganicResponsibilityResourceAllocator(),
        relation_builder=base.relation_builder,
        candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator,
        reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=Responsibility(base.responsibility_operator),
        actuation_operator=base.actuation_operator,
    )
    key = (past.record.source.experience_id, past.record.source.relation_element_id)
    evidence = (past.occurrence_refs[0],)
    formed = float(past.record.source.completed_at_tau)
    known = max(formed, float(past.known_at_tau))
    core.register_continuity_edge(
        ContinuityEdgeV12(
            "edge:past",
            key,
            ContinuityEdgeProvenanceV12(
                key,
                "recorded completed relation continuity",
                evidence,
                formed,
                known,
            ),
        )
    )
    return core


class RPFO12CoreTests(unittest.TestCase):
    def test_failed_epoch_restores_full_current_state_and_can_retry(self):
        current_frame = frame()
        core = make_v12(RaisingResolver())
        relation = core._domain_relation_builder.build(current_frame.observation)[0]
        core.publish_current_continuity(
            epoch=current_frame.observation.epoch,
            claims=(
                CurrentContinuityClaimV12(
                    "claim:past",
                    relation.relation_id,
                    "edge:past",
                    ("obs:front-relation",),
                    current_frame.tau,
                ),
            ),
        )
        with self.assertRaises(CoreV11InvariantError):
            core.open_current_epoch(current_frame)
        self.assertIsNone(core._frame)
        self.assertIsNone(core._last_evaluation)
        self.assertIsNone(core._epoch_identity)
        self.assertIsNone(core.relation_builder._observation)
        self.assertEqual(core.variable_ledger.events(), ())

        core.rpfo_operator.resolver = ParticipateLocal()
        view = core.open_current_epoch(current_frame)
        self.assertEqual(len(view.relation_elements), 1)
        self.assertEqual(core.rpfo_snapshot().opened_keys, (("exp-1", "rel-1"),))


if __name__ == "__main__":
    unittest.main()
