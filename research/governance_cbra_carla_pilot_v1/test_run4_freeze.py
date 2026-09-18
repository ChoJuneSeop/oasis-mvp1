from __future__ import annotations

import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "RUN4_FREEZE_MANIFEST.json"
SPEC = HERE / "RUN4_FREEZE_SPEC.md"


class Run4FreezeHistoricalTests(unittest.TestCase):
    def _blob_at(self, commit: str, path: str) -> str:
        return subprocess.check_output(
            ["git", "rev-parse", f"{commit}:{path}"], cwd=ROOT, text=True
        ).strip()

    def _source_at(self, commit: str, path: str) -> str:
        return subprocess.check_output(
            ["git", "show", f"{commit}:{path}"], cwd=ROOT, text=True
        )

    def test_run4_manifest_remains_frozen_historical_evidence(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["status"], "FROZEN_BEFORE_RUN4_EXECUTION")
        self.assertEqual(
            data["freeze_id"],
            "GOVERNANCE_CBRA_CARLA_PILOT_RUN4_FREEZE_V1",
        )
        self.assertEqual(data["unchanged_scientific_design"]["matrix_units"], 54)
        self.assertTrue(data["unchanged_scientific_design"]["seeds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["decision_thresholds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["responsibility_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["cbra_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["closure_rule_unchanged"])
        self.assertFalse(data["unchanged_scientific_design"]["post_result_retuning"])

    def test_run4_frozen_blobs_match_its_source_freeze_commit(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for path, expected in data["frozen_source_git_blobs"].items():
            self.assertEqual(
                self._blob_at(data["source_freeze_commit"], path),
                expected,
            )

    def test_run4_historical_counterpart_rule_used_frozen_distances_and_gateway_gate(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        source = self._source_at(
            data["source_freeze_commit"],
            "research/governance_cbra_carla_pilot_v1/pilot_runtime.py",
        )
        self.assertIn("distances = (18.0, 22.0, 26.0, 30.0, 34.0)", source)
        self.assertIn("observed.front_present and observed.front_kind == kind", source)
        self.assertIn("gateway-front-relation-not-approved", source)

    def test_source_freeze_commit_is_ancestor_of_head(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        code = subprocess.run(
            ["git", "merge-base", "--is-ancestor", data["source_freeze_commit"], "HEAD"],
            cwd=ROOT,
        ).returncode
        self.assertEqual(code, 0)

    def test_run4_spec_preserves_run3_diagnosis_and_claim_boundary(self):
        text = SPEC.read_text(encoding="utf-8")
        self.assertIn("FROZEN BEFORE RUN4 EXECUTION", text)
        self.assertIn("Fifteen units passed", text)
        self.assertIn("thirty-nine units", text)
        self.assertIn("18m, 22m, 26m, 30m, 34m", text)
        self.assertIn("not confirmatory evidence", text.lower())


if __name__ == "__main__":
    unittest.main()
