from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from research.g3_three_layer_carla_02 import protocol
from research.g3_three_layer_carla_02.release_gate import build_request, authorize, verify
from host_tools.g3_three_layer_carla_02 import external_runner


class _Settings:
    synchronous_mode = False
    fixed_delta_seconds = None


class _Map:
    name = "Town10HD_Opt"


class _World:
    def __init__(self):
        self.settings = _Settings()
    def get_map(self):
        return _Map()
    def get_settings(self):
        return self.settings
    def apply_settings(self, settings):
        self.settings = settings


class _TM:
    def set_synchronous_mode(self, value):
        self.sync = value
    def set_random_device_seed(self, seed):
        self.seed = seed


class _Client:
    def __init__(self):
        self.world = _World()
        self.tm = _TM()
        self.load_world = mock.Mock()
    def get_client_version(self):
        return "0.9.16"
    def get_server_version(self):
        return "0.9.16"
    def get_world(self):
        return self.world
    def get_trafficmanager(self, port):
        self.tm_port = port
        return self.tm


class ThreeLayerQualificationProtocolTests(unittest.TestCase):
    def test_preregistration_scope_is_fixed(self):
        p = protocol.load_preregistration()
        self.assertEqual(p["protocol_id"], "G3-THREE-LAYER-CARLA-02")
        self.assertEqual(p["environment"]["map"], "Town10HD_Opt")
        self.assertEqual(p["environment"]["planned_horizon_ticks_per_flow"], 5000)
        self.assertEqual(protocol.flow_spec(p, "TL-Q01")["seed"], 111268688)
        self.assertFalse(p["environment"]["horizon_is_semantic_threshold"])

    def test_external_world_is_reused_and_never_reloaded(self):
        client = _Client()
        world, tm = external_runner.prepare_existing_world(
            client, protocol.load_preregistration(), seed=111268688
        )
        client.load_world.assert_not_called()
        self.assertIs(world, client.world)
        self.assertTrue(world.settings.synchronous_mode)
        self.assertEqual(world.settings.fixed_delta_seconds, 0.05)
        self.assertTrue(tm.sync)
        self.assertEqual(tm.seed, 111268688)
        self.assertEqual(client.tm_port, 8000)

    def test_release_is_explicit_and_bound_to_request(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            status = {
                "protocol_id": protocol.PROTOCOL_ID,
                "phase": "PRE_FIRST_TICK_READY",
                "empirical_evidence": False,
                "empirical_ticks": 0,
            }
            (root / "status.json").write_text(json.dumps(status), encoding="utf-8")
            request_sha = build_request(
                run_dir=root, flow_id="TL-Q01", attempt=1,
                prereg_sha="p", source_hashes={"x": "y"},
                runtime_identity_sha="r", scene_manifest_sha="s",
                frame=100, tau=5.0, revision="rev",
            )
            status["release_request_sha256"] = request_sha
            (root / "status.json").write_text(json.dumps(status), encoding="utf-8")
            with self.assertRaises(RuntimeError):
                authorize(root, approve=False)
            authorize(root, approve=True)
            token = verify(root, expected_request_sha=request_sha)
            self.assertTrue(token["explicit_operator_action"])
            self.assertFalse(token["empirical_evidence"])

    def test_wrapper_patches_only_during_run(self):
        original_id = external_runner.split.PROTOCOL_ID
        original_prepare = external_runner.split.prepare_live_world
        observed = {}
        def fake_run_flow(**kwargs):
            observed["protocol_id"] = external_runner.split.PROTOCOL_ID
            observed["map"] = external_runner.split.load_preregistration()["environment"]["map"]
            observed["prepare"] = external_runner.split.prepare_live_world
            return "ok"
        with mock.patch.object(external_runner.split, "run_flow", side_effect=fake_run_flow):
            result = external_runner.run_flow(
                flow_id="TL-Q01", attempt=1, output_root=Path(tempfile.gettempdir()) / "g3-tl-test",
                host="unused", port=0,
            )
        self.assertEqual(result, "ok")
        self.assertEqual(observed["protocol_id"], protocol.PROTOCOL_ID)
        self.assertEqual(observed["map"], "Town10HD_Opt")
        self.assertIs(observed["prepare"], external_runner.prepare_existing_world)
        self.assertEqual(external_runner.split.PROTOCOL_ID, original_id)
        self.assertIs(external_runner.split.prepare_live_world, original_prepare)


if __name__ == "__main__":
    unittest.main()
