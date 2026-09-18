from __future__ import annotations

import json
import unittest
from pathlib import Path

from .pilot_runner import ARMS, load_matrix, unit_by_id


HERE = Path(__file__).resolve().parent


class DedicatedPilotRunnerContractTests(unittest.TestCase):
    def test_frozen_matrix_is_exactly_54_unique_units(self):
        matrix = load_matrix()
        self.assertEqual(matrix["unit_count"], 54)
        self.assertEqual(len(matrix["units"]), 54)
        ids = [x["unit_id"] for x in matrix["units"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_matrix_is_full_cartesian_product(self):
        matrix = load_matrix()
        expected = {
            (arm, failure, context)
            for arm in matrix["arms"]
            for failure in matrix["failure_classes"]
            for context in matrix["reentry_contexts"]
        }
        actual = {
            (x["arm"], x["failure_class"], x["reentry_context"])
            for x in matrix["units"]
        }
        self.assertEqual(actual, expected)
        self.assertEqual(tuple(matrix["arms"]), ARMS)

    def test_runtime_contract_is_offscreen_no_render(self):
        matrix = load_matrix()
        self.assertTrue(matrix["synchronous_mode"])
        self.assertTrue(matrix["no_rendering_mode"])
        self.assertEqual(matrix["fixed_delta_seconds"], 0.05)
        self.assertEqual(matrix["carla_version"], "0.9.16")
        self.assertEqual(matrix["map"], "Town10HD_Opt")
        self.assertEqual(matrix["render_mode"], "RenderOffScreen")

    def test_no_post_result_tuning_surface(self):
        matrix = load_matrix()
        self.assertEqual(matrix["status"], "FROZEN_BEFORE_FIRST_PILOT_UNIT")
        self.assertTrue(matrix["structural_only"])
        self.assertFalse(matrix["confirmatory"])
        for unit in matrix["units"]:
            self.assertEqual(unit["npc_count"], 1)
            self.assertEqual(unit["max_closure_ticks"], 8)

    def test_unit_lookup_is_stable(self):
        matrix = load_matrix()
        first = matrix["units"][0]
        self.assertEqual(unit_by_id(first["unit_id"]), first)

    def test_general_harness_is_first_frozen_arm(self):
        matrix = json.loads((HERE / "PILOT_MATRIX.json").read_text())
        self.assertEqual(
            matrix["arms"],
            ["GENERAL_HARNESS", "GOVERNANCE_NO_CBRA", "GOVERNANCE_PLUS_CBRA"],
        )


if __name__ == "__main__":
    unittest.main()
