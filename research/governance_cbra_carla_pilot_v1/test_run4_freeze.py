from __future__ import annotations

import inspect
import json
from pathlib import Path
import subprocess
import unittest

from .pilot_runtime import PilotScene
from .pilot_runner import RUN_BASIS, validate_run4_freeze


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "RUN4_FREEZE_MANIFEST.json"
SPEC = HERE / "RUN4_FREEZE_SPEC.md"


class Run4FreezeTests(unittest.TestCase):
    def _blob(self, path: str) -> str:
        return subprocess.check_output(
            ["git", "rev-parse", f"HEAD:{path}"], cwd=ROOT, text=True
        ).strip()

    def test_run4_manifest_is_frozen_before_execution(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["status"], "FROZEN_BEFORE_RUN4_EXECUTION")
        self.assertEqual(
            data["freeze_id"],
            "GOVERNANCE_CBRA_CARLA_PILOT_RUN4_FREEZE_V1",
        )
        self.assertEqual(
            RUN_BASIS,
            "RUN4_GATEWAY_APPROVED_COUNTERPART_FREEZE_V1",
        )
        self.assertEqual(data["unchanged_scientific_design"]["matrix_units"], 54)
        self.assertTrue(data["unchanged_scientific_design"]["seeds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["decision_thresholds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["responsibility_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["cbra_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["closure_rule_unchanged"])
        self.assertFalse(data["unchanged_scientific_design"]["post_result_retuning"])

    def test_run4_preserves_exact_matrix_blob(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        path = "research/governance_cbra_carla_pilot_v1/PILOT_MATRIX.json"
        self.assertEqual(
            data["unchanged_scientific_design"]["matrix_git_blob"],
            "be6f3192fe316776e7f9915f6e318f47e03e5f1b",
        )
        self.assertEqual(
            self._blob(path),
            data["frozen_source_git_blobs"][path],
        )

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

    def test_run4_counterpart_candidates_are_exactly_frozen_and_gateway_gated(self):
        source = inspect.getsource(PilotScene.spawn_counterpart)
        self.assertIn("distances = (18.0, 22.0, 26.0, 30.0, 34.0)", source)
        self.assertIn("observed.front_present and observed.front_kind == kind", source)
        self.assertIn("actor.destroy()", source)
        self.assertIn("gateway-front-relation-not-approved", source)
        self.assertIn("ScenarioAdmissionError", source)
        self.assertNotIn("failure_class", source)

    def test_manifest_forbids_post_run3_parameter_substitution(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        gate = data["run4_addition_only"]
        self.assertEqual(
            gate["frozen_candidate_distances_m"],
            [18.0, 22.0, 26.0, 30.0, 34.0],
        )
        self.assertTrue(gate["candidate_distance_set_unchanged"])
        self.assertTrue(gate["no_new_candidate_distance_after_run3"])
        self.assertTrue(gate["no_seed_substitution"])
        self.assertTrue(gate["no_threshold_substitution"])
        self.assertTrue(gate["no_policy_substitution"])
        self.assertTrue(gate["no_failure_label_visibility"])
        self.assertTrue(gate["no_evaluator_truth_visibility"])
        self.assertTrue(gate["no_post_result_repair"])

    def test_run4_static_preflight_freeze_check_passes(self):
        checks = validate_run4_freeze()
        self.assertEqual(
            set(checks),
            set(json.loads(MANIFEST.read_text())["frozen_source_git_blobs"]),
        )

    def test_spec_preserves_run3_diagnosis_and_claim_boundary(self):
        text = SPEC.read_text(encoding="utf-8")
        self.assertIn("FROZEN BEFORE RUN4 EXECUTION", text)
        self.assertIn("Fifteen units passed", text)
        self.assertIn("thirty-nine units", text)
        self.assertIn("18m, 22m, 26m, 30m, 34m", text)
        self.assertIn("not confirmatory evidence", text.lower())


if __name__ == "__main__":
    unittest.main()
