from __future__ import annotations

import sys
import types
import unittest

from research.carla_v22_harness_v11.canonical_harness import Realization, VehicleActuation
from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    CARLARuntimeInvariantError,
    ControlledOracleObservationGateway,
)
from research.carla_v22_harness_v11.test_carla_runtime_adapter_v1 import (
    Actor,
    Snap,
    World,
)
from research.g3_organic_flow_v1.carla_atomic_port import OrganicCARLAAtomicPort
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_organic_flow_v1.test_organic_flow import build_core
from research.oasis_core_v12.contracts import CurrentFrame
from research.oasis_core_v12.runtime import ExecutionJournal


class CARLAModule:
    class VehicleControl:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)


class OrganicCARLAAtomicPortTests(unittest.TestCase):
    def setUp(self):
        self.ego = Actor(1, "vehicle.ego", 0, vx=5)
        self.front = Actor(2, "vehicle.other", 30, vx=3)
        self.other = Actor(3, "vehicle.side", 10, road=2, lane=1, vx=1)
        self.world = World([self.ego, self.front, self.other])
        self.gateway = ControlledOracleObservationGateway(self.world, self.ego)
        self.port = OrganicCARLAAtomicPort(
            world=self.world,
            ego_actor=self.ego,
            gateway=self.gateway,
        )
        self.old_carla = sys.modules.get("carla")
        sys.modules["carla"] = CARLAModule

    def tearDown(self):
        if self.old_carla is None:
            sys.modules.pop("carla", None)
        else:
            sys.modules["carla"] = self.old_carla

    def test_capture_binds_current_observation_tau_revision_and_registered_evidence(self):
        frame = self.port.capture()
        self.assertIsInstance(frame, CurrentFrame)
        self.assertEqual(frame.observation.epoch, self.world.snap.frame)
        self.assertEqual(frame.tau, self.world.snap.timestamp.elapsed_seconds)
        self.assertTrue(frame.revision)
        self.assertTrue(frame.evidence)
        evidence_ids = {item.evidence_id for item in frame.evidence}
        self.assertIn("observation:front-present", evidence_ids)
        exported = str(frame)
        self.assertNotIn("actor_id", exported)
        self.assertNotIn("flow_seed", exported)
        self.assertNotIn("scenario_label", exported)

    def test_stale_revision_returns_explicit_non_application(self):
        frame = self.port.capture()
        self.other.t.location.x += 1.0
        receipt = self.port.apply_if_current(
            Realization("continue-flow", VehicleActuation(0.1, 0.0, 0.0)),
            expected_revision=frame.revision,
            idempotency_key="stale-key",
        )
        self.assertFalse(receipt.applied)
        self.assertEqual(len(self.ego.applied), 0)

    def test_same_idempotency_key_never_reapplies(self):
        frame = self.port.capture()
        realization = Realization(
            "continue-flow", VehicleActuation(0.1, 0.0, 0.0)
        )
        first = self.port.apply_if_current(
            realization,
            expected_revision=frame.revision,
            idempotency_key="same-key",
        )
        second = self.port.apply_if_current(
            realization,
            expected_revision=frame.revision,
            idempotency_key="same-key",
        )
        self.assertTrue(first.applied)
        self.assertEqual(first, second)
        self.assertEqual(len(self.ego.applied), 1)

    def test_second_different_dispatch_in_same_carla_frame_is_rejected(self):
        frame = self.port.capture()
        realization = Realization(
            "continue-flow", VehicleActuation(0.1, 0.0, 0.0)
        )
        self.port.apply_if_current(
            realization,
            expected_revision=frame.revision,
            idempotency_key="first-key",
        )
        with self.assertRaises(CARLARuntimeInvariantError):
            self.port.apply_if_current(
                realization,
                expected_revision=frame.revision,
                idempotency_key="second-key",
            )
        self.assertEqual(len(self.ego.applied), 1)

    def test_capture_fails_closed_when_carla_frame_moves_during_capture(self):
        calls = {"n": 0}
        original = self.world.get_snapshot

        def moving_snapshot():
            calls["n"] += 1
            snap = original()
            if calls["n"] >= 3:
                return Snap(frame=snap.frame + 1, t=snap.timestamp.elapsed_seconds + 0.05)
            return snap

        self.world.get_snapshot = moving_snapshot
        with self.assertRaises(CARLARuntimeInvariantError):
            self.port.capture()

    def test_organic_harness_uses_real_adapter_contract_for_one_realization(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        try:
            result = OrganicHarness(
                core,
                journal,
                authorize=lambda *_: True,
            ).execute_decision_epoch(
                self.port,
                run_id="adapter-contract",
                subject_id="ego",
                deadline_tau=20.0,
            )
            self.assertTrue(result.realized)
            self.assertEqual(len(self.ego.applied), 1)
            self.assertEqual(result.application_receipt.applied, True)
        finally:
            journal.close()


if __name__ == "__main__":
    unittest.main()
