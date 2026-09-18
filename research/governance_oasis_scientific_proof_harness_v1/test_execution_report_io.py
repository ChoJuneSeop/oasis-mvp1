from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from research.oasis_experiment_freeze_harness_v1.models import GateState

from .execution_report_io import load_execution_report


class ExecutionReportIOTests(unittest.TestCase):
    def _load(self, payload: dict):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "report.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            return load_execution_report(path)

    def _pass_check(self, check_id: str) -> dict:
        return {
            "check_id": check_id,
            "category": "EXECUTION",
            "status": "PASS",
            "summary": check_id,
            "evidence": [],
            "blocking": True,
            "metadata": {},
        }

    def test_declared_ready_without_concrete_checks_is_recomputed_false(self):
        report = self._load(
            {
                "profile_id": "X",
                "state": "FREEZE_READY",
                "checks": [],
                "required_check_ids": ["world_isolation"],
                "unresolved_check_ids": [],
                "missing_check_ids": [],
                "duplicate_check_ids": [],
                "freeze_ready": True,
            }
        )
        self.assertFalse(report.freeze_ready)
        self.assertEqual(report.missing_check_ids, ("world_isolation",))

    def test_nonpassing_required_check_is_recomputed_unresolved(self):
        payload = {
            "profile_id": "X",
            "state": "FREEZE_READY",
            "checks": [
                {
                    "check_id": "world_isolation",
                    "category": "EXECUTION",
                    "status": "FAIL",
                    "summary": "failed",
                    "evidence": [],
                    "blocking": True,
                    "metadata": {},
                }
            ],
            "required_check_ids": ["world_isolation"],
            "unresolved_check_ids": [],
            "missing_check_ids": [],
            "duplicate_check_ids": [],
            "freeze_ready": True,
        }
        report = self._load(payload)
        self.assertFalse(report.freeze_ready)
        self.assertIn("world_isolation", report.unresolved_check_ids)

    def test_duplicate_concrete_results_are_not_accepted(self):
        payload = {
            "profile_id": "X",
            "state": "FREEZE_READY",
            "checks": [
                self._pass_check("world_isolation"),
                self._pass_check("world_isolation"),
            ],
            "required_check_ids": ["world_isolation"],
            "unresolved_check_ids": [],
            "missing_check_ids": [],
            "duplicate_check_ids": [],
            "freeze_ready": True,
        }
        report = self._load(payload)
        self.assertFalse(report.freeze_ready)
        self.assertIn("world_isolation", report.duplicate_check_ids)

    def test_complete_concrete_pass_report_remains_ready(self):
        payload = {
            "profile_id": "X",
            "state": "FREEZE_READY",
            "checks": [
                self._pass_check("source_freeze"),
                self._pass_check("world_isolation"),
            ],
            "required_check_ids": ["source_freeze", "world_isolation"],
            "unresolved_check_ids": [],
            "missing_check_ids": [],
            "duplicate_check_ids": [],
            "freeze_ready": True,
        }
        report = self._load(payload)
        self.assertTrue(report.freeze_ready)
        self.assertEqual(report.state, GateState.FREEZE_READY)


if __name__ == "__main__":
    unittest.main()
