from __future__ import annotations

from hashlib import sha1
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from host_tools.g3_rpfo_carla_01_a2.failure_guard import record
from host_tools.g3_rpfo_carla_01_a2.manifest_compat import verified_manifest
from research.g3_rpfo_carla_01.protocol import verify_experiment_manifest

ROOT = Path(__file__).resolve().parent


def git_blob_sha1(path: Path) -> str:
    data = path.read_bytes()
    return sha1((f"blob {len(data)}\0").encode("ascii") + data).hexdigest()


class A2HostContractTests(unittest.TestCase):
    def test_semantic_manifest_remains_valid(self):
        manifest = verify_experiment_manifest()
        self.assertFalse(manifest["experimental_evidence"])
        self.assertEqual(manifest["empirical_ticks"], 0)

    def test_legacy_snapshot_alias_is_derived_not_rewritten(self):
        manifest = verified_manifest()
        self.assertEqual(
            manifest["experiment_source_snapshot_commit"],
            manifest["source_snapshot_commit"],
        )

    def test_pre_first_tick_failure_is_recorded_at_zero(self):
        with TemporaryDirectory() as tmp:
            record(tmp, "OF-01", 2, RuntimeError("preflight-test"))
            status_path = (
                Path(tmp)
                / "G3-RPFO-ORGANIC-CARLA-01"
                / "OF-01-A2"
                / "status.json"
            )
            data = json.loads(status_path.read_text(encoding="utf-8"))
            self.assertEqual(data["phase"], "PRE_FIRST_TICK_FAIL")
            self.assertFalse(data["empirical_evidence"])
            self.assertEqual(data["empirical_ticks"], 0)

    def test_failure_guard_never_rewrites_empirical_attempt(self):
        with TemporaryDirectory() as tmp:
            run_dir = Path(tmp) / "G3-RPFO-ORGANIC-CARLA-01" / "OF-01-A2"
            run_dir.mkdir(parents=True)
            status_path = run_dir / "status.json"
            status_path.write_text(
                json.dumps({"phase": "LIVE_RUNNING", "empirical_evidence": True, "empirical_ticks": 1}),
                encoding="utf-8",
            )
            before = status_path.read_bytes()
            record(tmp, "OF-01", 2, RuntimeError("must-not-overwrite"))
            self.assertEqual(status_path.read_bytes(), before)

    def test_a1_is_preserved_and_launchers_target_a2(self):
        run_text = (ROOT / "run_existing_of01_a2.bat").read_text(encoding="utf-8")
        approve_text = (ROOT / "approve_of01_a2.bat").read_text(encoding="utf-8")
        self.assertIn("--attempt 2", run_text)
        self.assertIn("OF-01-A2", approve_text)
        self.assertIn("A1 is preserved", run_text)

    def test_minimal_host_profile_is_nonsemantic_and_frozen(self):
        profile = json.loads((ROOT / "HOST_LAUNCH_PROFILE.json").read_text(encoding="utf-8"))
        self.assertEqual(
            profile["arguments"],
            ["-dx11", "-RenderOffScreen", "-nosound", "-quality-level=Low", "-carla-port=2000"],
        )
        self.assertFalse(profile["semantic_effect_claimed"])
        self.assertFalse(profile["physics_changed"])
        self.assertTrue(profile["no_rendering_mode_is_separately_captured_from_live_world"])

    def test_host_execution_manifest_matches_host_files(self):
        manifest = json.loads((ROOT / "HOST_EXECUTION_MANIFEST.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["attempt"], 2)
        self.assertEqual(manifest["prior_attempt_policy"], "A1_PRESERVED_NO_OVERWRITE")
        for name, expected in manifest["host_files_git_blob_sha1"].items():
            self.assertEqual(git_blob_sha1(ROOT / name), expected, name)


if __name__ == "__main__":
    unittest.main()
