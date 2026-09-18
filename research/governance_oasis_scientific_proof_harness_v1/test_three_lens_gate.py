from __future__ import annotations

from dataclasses import replace
import unittest

from research.oasis_experiment_freeze_harness_v1.models import (
    GateReport,
    GateState,
)

from .design_gate import validate_design
from .models import AxisId
from .test_design_gate import make_design
from .three_lens_gate import three_lens_review


def execution_report(ready: bool) -> GateReport:
    return GateReport(
        profile_id="TEST_EXEC",
        state=GateState.FREEZE_READY if ready else GateState.DRAFT,
        checks=(),
        required_check_ids=(),
        unresolved_check_ids=() if ready else ("world_isolation",),
        missing_check_ids=(),
        duplicate_check_ids=(),
        freeze_ready=ready,
    )


class ThreeLensReviewTests(unittest.TestCase):
    def test_definition_causal_execution_all_must_pass(self):
        proof = validate_design(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        )
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(True),
        )
        self.assertTrue(review.definition_pass)
        self.assertTrue(review.causal_pass)
        self.assertTrue(review.execution_pass)
        self.assertTrue(review.all_three_pass)

    def test_execution_failure_blocks_full_review_even_when_science_passes(self):
        proof = validate_design(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        )
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(False),
        )
        self.assertFalse(review.execution_pass)
        self.assertFalse(review.all_three_pass)

    def test_causal_failure_blocks_full_review_even_when_execution_passes(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            future_leakage_guard=False,
        )
        proof = validate_design(design)
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(True),
        )
        self.assertFalse(review.causal_pass)
        self.assertFalse(review.all_three_pass)

    def test_definition_failure_blocks_full_review(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            pre_registered=False,
        )
        proof = validate_design(design)
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(True),
        )
        self.assertFalse(review.definition_pass)
        self.assertFalse(review.all_three_pass)


if __name__ == "__main__":
    unittest.main()
