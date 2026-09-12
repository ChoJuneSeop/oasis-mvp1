import unittest

from research.g3_2_sidecar.legacy_v1_compat import audit_legacy_v1_report


class LegacyV1CompatibilityTests(unittest.TestCase):
    def test_v1_purity_is_preserved_but_not_promoted_to_g32(self):
        report = {
            "protocol": "OASIS-CARLA Paper Validation Protocol v2.2",
            "harness": "OASIS-CARLA Paper Validation Harness v1.0",
            "counterfactual_probe_records": [
                {
                    "epoch": 5,
                    "observation": {"epoch": 5},
                    "probes": [
                        {
                            "intervention": "FULL",
                            "before_hash": "same",
                            "after_hash": "same",
                            "state_unchanged": True,
                            "decision": {"reactivated_keys": ["E-old"]},
                        },
                        {
                            "intervention": "NO_REACTIVATION",
                            "before_hash": "same",
                            "after_hash": "same",
                            "state_unchanged": True,
                            "decision": {"reactivated_keys": []},
                        },
                    ],
                }
            ],
        }
        result = audit_legacy_v1_report(report)
        self.assertTrue(result.g31_compatible)
        self.assertFalse(result.g32_evidence_complete)
        self.assertEqual(result.probe_count, 2)
        self.assertIn("relation_elements", result.missing_fields)
        self.assertIn("possibility_distribution", result.missing_fields)
        self.assertIn("reconstruction", result.missing_fields)

    def test_mutating_probe_fails_legacy_purity(self):
        report = {
            "protocol": "OASIS-CARLA Paper Validation Protocol v2.2",
            "harness": "OASIS-CARLA Paper Validation Harness v1.0",
            "counterfactual_probe_records": [
                {
                    "probes": [
                        {
                            "before_hash": "a",
                            "after_hash": "b",
                            "state_unchanged": False,
                        }
                    ]
                }
            ],
        }
        result = audit_legacy_v1_report(report)
        self.assertFalse(result.g31_compatible)
        self.assertEqual(result.purity_violations, 1)


if __name__ == "__main__":
    unittest.main()
