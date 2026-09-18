from __future__ import annotations

import unittest

from .smoke_runner import run_smoke


class SmokeRunnerContractTests(unittest.TestCase):
    def test_rejects_zero_ticks_before_carla_access(self):
        with self.assertRaises(ValueError):
            run_smoke(output_root="unused", host="127.0.0.1", port=2000, ticks=0, npc_count=2)

    def test_rejects_large_smoke_horizon_before_carla_access(self):
        with self.assertRaises(ValueError):
            run_smoke(output_root="unused", host="127.0.0.1", port=2000, ticks=1001, npc_count=2)

    def test_rejects_large_npc_count_before_carla_access(self):
        with self.assertRaises(ValueError):
            run_smoke(output_root="unused", host="127.0.0.1", port=2000, ticks=200, npc_count=5)


if __name__ == "__main__":
    unittest.main()
