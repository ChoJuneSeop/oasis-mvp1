import hashlib
import unittest

from research.g32_live_execution_v1.live_core import LiveIntegratedChoiceCore
from research.g32_live_execution_v1.operators import (
    LiveCurrentAssessment,
    LiveCurrentVerifier,
    ParetoResponsibilityResourceAllocator,
)
from research.g32_live_execution_v1.runner import inert_resource_sentinel
from research.integration_checkpoint.frame import V12ResponsibilityEvidenceAdapter
from research.integration_checkpoint.harness_adapter import CorePortAdapter, IntegratedHarness
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class Flow:
    def __init__(self):
        self.tau = 10.0
        self.applied = 0
        self.state = 0

    def current_tau(self):
        return self.tau

    def present_observation(self):
        return {
            "epoch": 200,
            "ego_speed_mps": 4.0,
            "front_present": True,
            "front_gap_m": 10.0,
            "front_closing_mps": 0.5,
            "front_kind": "vehicle",
            "local_heading_error_deg": 0.2,
            "local_density": 2,
        }

    def current_reality(self):
        return {"fixture": "current"}

    def flow_fingerprint(self):
        return hashlib.sha256(f"{self.tau}:{self.state}".encode()).hexdigest()

    def apply_single_actuation(self, actuation):
        self.applied += 1
        if self.applied != 1:
            raise RuntimeError("duplicate application")
        self.state += 1
        return "fixture-realization-1"


def build_core(available_work=None):
    base = build_domain_bundle().core
    return LiveIntegratedChoiceCore(
        assessment_operator=LiveCurrentAssessment(),
        verifier=LiveCurrentVerifier(),
        preference_operator=ParetoContextPreference(),
        resource_allocator=ParetoResponsibilityResourceAllocator(available_work),
        relation_builder=base.relation_builder,
        candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator,
        reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=V12ResponsibilityEvidenceAdapter(base.responsibility_operator),
        actuation_operator=base.actuation_operator,
    )


class LiveCoreTests(unittest.TestCase):
    def execute(self, core):
        flow = Flow()
        execution = IntegratedHarness(CorePortAdapter(core)).execute_decision_epoch(
            flow,
            resources=inert_resource_sentinel(),
        )
        return flow, execution

    def test_assessment_precedes_live_resource_plan_and_one_realization(self):
        core = build_core()
        flow, execution = self.execute(core)
        record = core.responsibility_record()
        requests = record["context"]["assessment"]["requests"]
        plan = core.live_resource_plan()
        self.assertEqual(plan.required, sum(x["estimated_work"] for x in requests))
        self.assertEqual(plan.allocated, plan.required)
        self.assertEqual(flow.applied, 1)
        self.assertIn(
            execution.realization.selected_possibility_id,
            execution.recorder.possibility_distribution,
        )

    def test_limited_capacity_preserves_omega(self):
        core = build_core(available_work=1.0)
        self.execute(core)
        verification = core.responsibility_record()["context"]["verification"]
        self.assertGreater(len(verification["omega"]), 0)
        self.assertGreater(len(verification["additional_unverified_scope"]), 0)


if __name__ == "__main__":
    unittest.main()
