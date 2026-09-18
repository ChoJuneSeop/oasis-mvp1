from __future__ import annotations

import unittest

from .harness import ExperimentFreezeHarness, InvalidGateTransition
from .models import CheckCategory, CheckResult, CheckStatus, GateState


REQ = {
    "definition": CheckCategory.DEFINITION,
    "causal": CheckCategory.CAUSAL,
    "execution": CheckCategory.EXECUTION,
}


def result(check_id, category, status=CheckStatus.PASS):
    return CheckResult(
        check_id=check_id,
        category=category,
        status=status,
        summary=check_id,
    )


class ExperimentFreezeHarnessTests(unittest.TestCase):
    def setUp(self):
        self.h = ExperimentFreezeHarness(profile_id="TEST", required_checks=REQ)

    def test_all_required_pass_is_only_path_to_freeze_ready(self):
        report = self.h.evaluate(
            (
                result("definition", CheckCategory.DEFINITION),
                result("causal", CheckCategory.CAUSAL),
                result("execution", CheckCategory.EXECUTION),
            )
        )
        self.assertTrue(report.freeze_ready)
        self.assertEqual(report.state, GateState.FREEZE_READY)
        frozen = self.h.freeze(report)
        self.assertEqual(frozen.state, GateState.FROZEN)

    def test_missing_check_forces_draft(self):
        report = self.h.evaluate(
            (
                result("definition", CheckCategory.DEFINITION),
                result("causal", CheckCategory.CAUSAL),
            )
        )
        self.assertFalse(report.freeze_ready)
        self.assertEqual(report.state, GateState.DRAFT)
        self.assertEqual(report.missing_check_ids, ("execution",))
        with self.assertRaises(InvalidGateTransition):
            self.h.freeze(report)

    def test_fail_unverified_or_blocked_are_all_blocking(self):
        for status in (CheckStatus.FAIL, CheckStatus.UNVERIFIED, CheckStatus.BLOCKED):
            with self.subTest(status=status):
                report = self.h.evaluate(
                    (
                        result("definition", CheckCategory.DEFINITION),
                        result("causal", CheckCategory.CAUSAL, status),
                        result("execution", CheckCategory.EXECUTION),
                    )
                )
                self.assertFalse(report.freeze_ready)
                self.assertIn("causal", report.unresolved_check_ids)

    def test_duplicate_required_check_blocks_gate(self):
        report = self.h.evaluate(
            (
                result("definition", CheckCategory.DEFINITION),
                result("definition", CheckCategory.DEFINITION),
                result("causal", CheckCategory.CAUSAL),
                result("execution", CheckCategory.EXECUTION),
            )
        )
        self.assertFalse(report.freeze_ready)
        self.assertEqual(report.duplicate_check_ids, ("definition",))

    def test_category_mismatch_blocks_gate(self):
        report = self.h.evaluate(
            (
                result("definition", CheckCategory.CAUSAL),
                result("causal", CheckCategory.CAUSAL),
                result("execution", CheckCategory.EXECUTION),
            )
        )
        self.assertFalse(report.freeze_ready)
        self.assertIn("definition", report.unresolved_check_ids)

    def test_state_machine_cannot_skip_gates(self):
        with self.assertRaises(InvalidGateTransition):
            self.h.transition(
                current=GateState.DRAFT,
                target=GateState.FROZEN,
            )


if __name__ == "__main__":
    unittest.main()
