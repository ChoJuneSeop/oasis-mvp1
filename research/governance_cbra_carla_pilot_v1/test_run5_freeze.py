from __future__ import annotations

import inspect
import json
from pathlib import Path
import subprocess
import unittest

from .pilot_runtime import PilotScene
from .pilot_runner import RUN_BASIS, validate_run5_freeze


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "RUN5_FREEZE_MANIFEST.json"
SPEC = HERE / "RUN5_FREEZE_SPEC.md"


class Run5FreezeTests(unittest.TestCase):
    def _blob(self, path: str) -> str:
        return subprocess.check_output(
            ["git", "rev-parse", f"HEAD:{path}"], cwd=ROOT, text=True
        ).strip()

    def test_run5_manifest_is_frozen_before_execution(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["status"], "FROZEN_BEFORE_RUN5_EXECUTION")
        self.assertEqual(
            data["freeze_id"],
            "GOVERNANCE_CBRA_CARLA_PILOT_RUN5_FREEZE_V1",
        )
        self.assertEqual(
            RUN_BASIS,
            "RUN5_GATEWAY_TOPOLOGY_ADMISSION_FREEZE_V1",
        )
        self.assertEqual(data["unchanged_scientific_design"]["matrix_units"], 54)
        self.assertTrue(data["unchanged_scientific_design"]["seeds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["gateway_relation_definition_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["decision_thresholds_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["responsibility_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["cbra_policy_unchanged"])
        self.assertTrue(data["unchanged_scientific_design"]["closure_rule_unchanged"])
        self.assertFalse(data["unchanged_scientific_design"]["post_result_retuning"])

    def test_run5_preserves_exact_matrix_and_frozen_distances(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(
            data["unchanged_scientific_design"]["matrix_git_blob"],
            "be6f3192fe316776e7f9915f6e318f47e03e5f1b",
        )
        self.assertEqual(
            data["unchanged_scientific_design"]["candidate_distances_m"],
            [18.0, 22.0, 26.0, 30.0, 34.0],
        )
        self.assertTrue(
            data["unchanged_scientific_design"]["candidate_distances_unchanged"]
        )

    def test_frozen_runtime_sources_match_manifest(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for path, expected in data["frozen_source_git_blobs"].items():
            self.assertEqual(self._blob(path), expected)

    def test_source_freeze_commit_is_ancestor_of_head(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        code = subprocess.run(
            ["git", "merge-base", "--is-ancestor", data["source_freeze_commit"], "HEAD"],
            cwd=ROOT,
        ).returncode
        self.assertEqual(code, 0)

    def test_topology_admission_matches_unchanged_gateway_contract(self):
        source = inspect.getsource(PilotScene._spawn_ego)
        self.assertIn("frozen_distances = (18.0, 22.0, 26.0, 30.0, 34.0)", source)
        self.assertIn("target.road_id == wp.road_id", source)
        self.assertIn("target.lane_id == wp.lane_id", source)
        self.assertIn("nxt[0]", source)
        self.assertIn("topology_matches", source)
        self.assertNotIn("failure_class", source)
        self.assertNotIn("SUCCESS_CONTROL", source)
        self.assertNotIn("EXOGENOUS_FAILURE", source)
        self.assertNotIn("DELAYED_FAILURE", source)

    def test_manifest_forbids_gateway_or_parameter_relaxation(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        gate = data["run5_addition_only"]
        self.assertFalse(gate["experimental_evidence"])
        self.assertTrue(gate["no_gateway_relaxation"])
        self.assertTrue(gate["no_seed_substitution"])
        self.assertTrue(gate["no_distance_substitution"])
        self.assertTrue(gate["no_threshold_substitution"])
        self.assertTrue(gate["no_policy_substitution"])
        self.assertTrue(gate["no_post_result_repair"])
        self.assertFalse(gate["topology_test_uses_failure_label"])
        self.assertFalse(gate["topology_test_uses_evaluator_truth"])
        self.assertFalse(gate["topology_test_uses_post_outcome"])

    def test_static_preflight_freeze_check_passes(self):
        checks = validate_run5_freeze()
        expected = json.loads(MANIFEST.read_text(encoding="utf-8"))["frozen_source_git_blobs"]
        self.assertEqual(set(checks), set(expected))

    def test_spec_preserves_run4_diagnosis_and_claim_boundary(self):
        text = SPEC.read_text(encoding="utf-8")
        self.assertIn("FROZEN BEFORE RUN5 EXECUTION", text)
        self.assertIn("ego road/lane: `466 / 2`", text)
        self.assertIn("SAME_LANE=True", text)
        self.assertIn("SAME_ROAD=False", text)
        self.assertIn("does not relax the Gateway", text)
        self.assertIn("not Pilot evidence", text)


if __name__ == "__main__":
    unittest.main()
