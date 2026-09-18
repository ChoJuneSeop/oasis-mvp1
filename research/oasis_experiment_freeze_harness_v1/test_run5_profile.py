from __future__ import annotations

from pathlib import Path
import unittest

from .models import CheckStatus, GateState
from .run5_profile import audit_run5


ROOT = Path(__file__).resolve().parents[2]


class Run5ProfileTests(unittest.TestCase):
    def test_current_run5_lineage_is_blocked_before_execution(self):
        report = audit_run5(ROOT, target_ref="HEAD")
        self.assertFalse(report.freeze_ready)
        self.assertEqual(report.state, GateState.DRAFT)

        by_id = {item.check_id: item for item in report.checks}

        # Existing Run5 strengths must remain recognized.
        self.assertEqual(
            by_id["definition_matrix_contract"].status,
            CheckStatus.PASS,
        )
        self.assertEqual(
            by_id["causal_predecision_leakage"].status,
            CheckStatus.PASS,
        )
        self.assertEqual(
            by_id["evaluator_boundary"].status,
            CheckStatus.PASS,
        )
        self.assertEqual(
            by_id["closure_integrity"].status,
            CheckStatus.PASS,
        )
        self.assertEqual(
            by_id["cbra_lifecycle"].status,
            CheckStatus.PASS,
        )
        self.assertEqual(
            by_id["freeze_triple_integrity"].status,
            CheckStatus.PASS,
        )

        # These unresolved contracts are precisely why execution remains blocked.
        expected_blockers = {
            "execution_world_isolation",
            "cross_arm_scene_identity",
            "scope_ambient_contamination",
            "topology_spawn_binding",
            "telemetry_window",
            "immutable_execution_ref",
            "adversarial_recheck",
        }
        self.assertTrue(expected_blockers.issubset(set(report.unresolved_check_ids)))

    def test_adversarial_recheck_cannot_pass_while_prior_blockers_exist(self):
        report = audit_run5(ROOT, target_ref="HEAD")
        by_id = {item.check_id: item for item in report.checks}
        self.assertEqual(
            by_id["adversarial_recheck"].status,
            CheckStatus.BLOCKED,
        )


if __name__ == "__main__":
    unittest.main()
