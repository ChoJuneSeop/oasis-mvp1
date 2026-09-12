from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import runtime_identity
from research.carla_v22_harness_v11.test_carla_runtime_adapter_v1 import (
    Actor,
    Client,
    Settings,
    World,
)
from research.g3_organic_flow_v1.runtime_freeze import (
    OrganicRuntimeIdentityGuard,
    freeze_organic_runtime_identity,
    validate_organic_runtime_identity,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class MutableSettings:
    def __init__(self):
        self.synchronous_mode = True
        self.fixed_delta_seconds = 0.05
        self.no_rendering_mode = True


class MutableWorld(World):
    def __init__(self, actors):
        super().__init__(actors)
        self.settings = MutableSettings()

    def get_settings(self):
        return self.settings


class OrganicRuntimeFreezeTests(unittest.TestCase):
    def setUp(self):
        self.ego = Actor(1, "vehicle.ego", 0, vx=5)
        self.world = MutableWorld([self.ego])
        self.client = Client("0.9.16", "0.9.16")

    @staticmethod
    def _manifest(path: Path):
        path.write_text(
            json.dumps(
                {
                    "baseline_commit": "5ccccc1fe9e3b25305ab2f133fd8cb0e63d1c954",
                    "source_snapshot_commit": "fixture-snapshot",
                    "experimental_evidence": False,
                },
                sort_keys=True,
            ),
            encoding="utf-8",
        )

    def test_protocol_identity_accepts_0916_town10_sync_delta_and_captures_no_rendering(self):
        identity = runtime_identity(self.world, self.client)
        checked = validate_organic_runtime_identity(identity)
        self.assertEqual(checked["carla_client_version"], "0.9.16")
        self.assertEqual(checked["carla_server_version"], "0.9.16")
        self.assertEqual(checked["map_name"], "Town10HD_Opt")
        self.assertTrue(checked["synchronous_mode"])
        self.assertEqual(checked["fixed_delta_seconds"], 0.05)
        self.assertTrue(checked["no_rendering_mode"])

    def test_freeze_is_byte_stable_and_manifest_bound(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "manifest.json"
            frozen = root / "runtime.json"
            self._manifest(manifest)
            identity = runtime_identity(self.world, self.client)
            first = freeze_organic_runtime_identity(
                identity, frozen, manifest_path=manifest
            )
            second = freeze_organic_runtime_identity(
                identity, frozen, manifest_path=manifest
            )
            self.assertEqual(first.sha256, second.sha256)
            self.assertEqual(first.source_manifest_sha256, second.source_manifest_sha256)
            self.assertEqual(frozen.read_bytes(), frozen.read_bytes())

    def test_runtime_drift_after_freeze_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "manifest.json"
            frozen = root / "runtime.json"
            self._manifest(manifest)
            guard = OrganicRuntimeIdentityGuard(
                client=self.client,
                world=self.world,
                output_path=frozen,
                manifest_path=manifest,
            )
            guard.assert_current()
            self.world.settings.no_rendering_mode = False
            with self.assertRaises(CoreV11InvariantError):
                guard.assert_current()

    def test_wrong_map_async_delta_or_version_mismatch_is_rejected(self):
        identity = runtime_identity(self.world, self.client)
        variants = (
            {**identity, "map_name": "Town04"},
            {**identity, "synchronous_mode": False},
            {**identity, "fixed_delta_seconds": 0.1},
            {**identity, "carla_server_version": "0.9.15"},
        )
        for bad in variants:
            with self.assertRaises(Exception):
                validate_organic_runtime_identity(bad)

    def test_no_rendering_must_be_explicit_boolean(self):
        identity = runtime_identity(self.world, self.client)
        bad = dict(identity)
        bad["no_rendering_mode"] = None
        with self.assertRaises(CoreV11InvariantError):
            validate_organic_runtime_identity(bad)


if __name__ == "__main__":
    unittest.main()
