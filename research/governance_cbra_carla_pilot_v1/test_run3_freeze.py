from __future__ import annotations

import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "RUN3_FREEZE_MANIFEST.json"
SPEC = HERE / "RUN3_FREEZE_SPEC.md"


class Run3FreezeTests(unittest.TestCase):
    def _blob(self, path: str) -> str:
        return subprocess.check_output(
            ["git", "rev-parse", f"HEAD:{path}"], cwd=ROOT, text=True
        ).strip()

    def test_run3_manifest_is_frozen_before_execution(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["status"], "FROZEN_BEFORE_RUN3_EXECUTION")
        self.assertEqual(
            data["freeze_id"],
            "GOVERNANCE_CBRA_CARLA_PILOT_RUN3_FREEZE_V1",
        )
        self.assertTrue(data["unchanged_scientific_design"]["seeds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["decision_thresholds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["responsibility_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["cbra_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["closure_rule_unchanged"])
        self.assertFalse(data["unchanged_scientific_design"]["post_result_retuning"])
        self.assertIsNone(data["unchanged_scientific_design"]["aggregate_score"])

    def test_original_54_unit_matrix_blob_is_unchanged(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        path = "research/governance_cbra_carla_pilot_v1/PILOT_MATRIX.json"
        self.assertEqual(
            data["frozen_source_git_blobs"][path],
            "be6f3192fe316776e7f9915f6e318f47e03e5f1b",
        )
        self.assertEqual(self._blob(path), data["frozen_source_git_blobs"][path])

    def test_frozen_runtime_sources_match_manifest(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for path, expected in data["frozen_source_git_blobs"].items():
            self.assertEqual(self._blob(path), expected)

    def test_source_freeze_commit_is_ancestor_of_head(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        code = subprocess.run(
            [
                "git",
                "merge-base",
                "--is-ancestor",
                data["source_freeze_commit"],
                "HEAD",
            ],
            cwd=ROOT,
        ).returncode
        self.assertEqual(code, 0)

    def test_admission_is_non_evidence_and_fail_closed(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        gate = data["run3_addition_only"]
        self.assertEqual(gate["layer"], "PRE_EXECUTION_SCENARIO_ADMISSION")
        self.assertFalse(gate["experimental_evidence"])
        self.assertEqual(
            gate["admission_failure_status"],
            "PRE_EXECUTION_SCENARIO_INVALID",
        )
        self.assertTrue(gate["admission_failure_starts_no_decision_epoch"])
        self.assertTrue(gate["no_seed_substitution_after_admission_failure"])
        self.assertTrue(gate["no_threshold_substitution_after_admission_failure"])
        self.assertTrue(gate["no_distance_substitution_after_admission_failure"])
        self.assertTrue(gate["no_post_result_repair"])

    def test_run3_spec_exists_and_preserves_prior_runs(self):
        self.assertTrue(SPEC.is_file())
        text = SPEC.read_text(encoding="utf-8")
        self.assertIn("Run1 failed", text)
        self.assertIn("Run2 progressed", text)
        self.assertIn("54 units", text)
        self.assertIn("PRE_EXECUTION_SCENARIO_INVALID", text)


if __name__ == "__main__":
    unittest.main()
