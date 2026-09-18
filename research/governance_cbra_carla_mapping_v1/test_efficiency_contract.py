from __future__ import annotations

import unittest

from .efficiency_contract import CBRASchedulingPolicy, FROZEN_CBRA_SCHEDULING_POLICY


class EfficiencyContractTests(unittest.TestCase):
    def test_frozen_policy_is_event_driven(self):
        p=FROZEN_CBRA_SCHEDULING_POLICY
        self.assertEqual(p.mode,"EVENT_DRIVEN_POST_CLOSURE")
        self.assertFalse(p.per_tick_required)
        self.assertFalse(p.full_archive_scan_required)
        self.assertFalse(p.may_block_hot_path)

    def test_measurement_telemetry_is_not_core_input(self):
        p=FROZEN_CBRA_SCHEDULING_POLICY
        self.assertFalse(p.evaluator_telemetry_visible_to_core)
        self.assertFalse(p.energy_telemetry_visible_to_core)

    def test_per_tick_policy_is_rejected(self):
        with self.assertRaises(ValueError):
            CBRASchedulingPolicy(per_tick_required=True)

    def test_hot_path_blocking_policy_is_rejected(self):
        with self.assertRaises(ValueError):
            CBRASchedulingPolicy(may_block_hot_path=True)


if __name__=="__main__":
    unittest.main()
