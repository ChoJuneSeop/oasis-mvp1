from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "research" / "governance_harness_v01" / "GH1_FREEZE_MANIFEST.json"


class GH1FreezeTests(unittest.TestCase):
    def test_freeze_manifest_uses_git_blob_sha1_and_has_basis_commit(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["manifest_version"], "GH1_FREEZE_V1")
        self.assertEqual(data["hash_type"], "git_blob_sha1")
        self.assertRegex(data["code_basis_commit"], r"^[0-9a-f]{40}$")
        self.assertGreaterEqual(len(data["frozen_artifacts"]), 10)

    def test_all_frozen_artifacts_match_recorded_git_blob_hashes(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for relative, expected in data["frozen_artifacts"].items():
            path = ROOT / relative
            self.assertTrue(path.is_file(), relative)
            actual = subprocess.check_output(
                ["git", "hash-object", str(path)],
                cwd=ROOT,
                text=True,
            ).strip()
            self.assertEqual(actual, expected, relative)

    def test_frozen_set_contains_required_gh1_execution_inputs(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        frozen = set(data["frozen_artifacts"])
        required = {
            "research/governance_harness_v01/GH1_EXPERIMENT_SPEC_V1_0_FINAL.md",
            "research/governance_harness_v01/GH1_EXPERIMENT_DESIGN_V1_0_FINAL.md",
            "research/governance_harness_v01/GH1_GAP_DETECTOR_SPEC.json",
            "research/governance_harness_v01/GH1_ARCHIVE_MANIFEST.json",
            "research/governance_harness_v01/GH1_SCENARIO_MANIFEST.json",
            "research/governance_harness_v01/GH1_SEED_MANIFEST.json",
            "research/governance_harness_v01/GH1_RUN_ORDER.json",
            "research/governance_harness_v01/GH1_METRICS_SCHEMA.json",
            "research/governance_harness_v01/GH1_PASS_FAIL_RULES.md",
            "research/governance_harness_v01/harness_v04.py",
            "research/oasis_core_v11/current_relational_core.py",
            "research/carla_v22_harness_v11/canonical_harness.py",
        }
        self.assertTrue(required.issubset(frozen), sorted(required - frozen))


if __name__ == "__main__":
    unittest.main()
