from __future__ import annotations

import json
import unittest
from pathlib import Path

from .execution_gate import validate_runtime_identities


ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent


class PilotFreezeTests(unittest.TestCase):
    def test_manifest_matrix_is_frozen(self):
        x=json.loads((HERE/"FREEZE_MANIFEST.json").read_text())
        self.assertEqual(len(x["arms"]),3)
        self.assertEqual(len(x["failure_classes"]),6)
        self.assertEqual(len(x["reentry_contexts"]),3)
        self.assertEqual(x["minimum_case_arm_units"],54)
        self.assertTrue(x["pilot_structural_only"])
        self.assertIsNone(x["aggregate_score"])

    def test_runtime_gate_is_intentionally_blocked_until_four_identities_exist(self):
        result=validate_runtime_identities(ROOT)
        self.assertFalse(result.passed)
        self.assertEqual(len(result.violations),4)

    def test_no_runtime_execution_claim_exists(self):
        x=json.loads((HERE/"FREEZE_MANIFEST.json").read_text())
        self.assertFalse(x["real_carla_executed"])
        self.assertFalse(x["scientific_superiority_metric_enabled"])


if __name__=="__main__":
    unittest.main()
