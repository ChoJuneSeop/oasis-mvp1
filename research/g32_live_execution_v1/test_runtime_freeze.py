from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest

from research.g32_live_execution_v1.runtime_freeze import (
    freeze_runtime_identity_record,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class RuntimeFreezeTests(unittest.TestCase):
    def identity(self, *, no_rendering=False):
        return {
            "carla_python_version": "fixture",
            "carla_client_version": "fixture",
            "carla_server_version": "fixture",
            "map_name": "/Game/Carla/Maps/Town10HD_Opt",
            "synchronous_mode": True,
            "fixed_delta_seconds": 0.05,
            "no_rendering_mode": no_rendering,
        }

    def test_runtime_identity_is_frozen_with_source_snapshot_and_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            manifest = Path(tmp) / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "baseline_commit": "baseline-fixture",
                        "source_snapshot_commit": "source-fixture",
                    }
                ),
                encoding="utf-8",
            )
            output = Path(tmp) / "runtime-identity.json"
            first = freeze_runtime_identity_record(
                self.identity(),
                output,
                manifest_path=manifest,
            )
            second = freeze_runtime_identity_record(
                self.identity(),
                output,
                manifest_path=manifest,
            )
            self.assertEqual(first.sha256, second.sha256)
            self.assertEqual(first.sha256, sha256(output.read_bytes()).hexdigest())
            self.assertEqual(first.baseline_commit, "baseline-fixture")
            self.assertEqual(first.source_snapshot_commit, "source-fixture")

            with self.assertRaises(CoreV11InvariantError):
                freeze_runtime_identity_record(
                    self.identity(no_rendering=True),
                    output,
                    manifest_path=manifest,
                )


if __name__ == "__main__":
    unittest.main()
