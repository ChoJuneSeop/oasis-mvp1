from __future__ import annotations

from dataclasses import replace
import unittest

from research.oasis_experiment_freeze_harness_v1.models import (
    CheckCategory,
    CheckResult,
    CheckStatus,
    GateReport,
    GateState,
)

from .design_gate import validate_design
from .models import AxisId
from .test_design_gate import make_design
from .three_lens_gate import three_lens_review


def execution_report(
    ready: bool,
    profile_id: str,
    required_check_ids=(
        "source_freeze",
        "world_isolation",
        "cross_arm_identity",
        "future_leakage",
        "evaluator_postjoin",
        "single_realization",
        "provenance_integrity",
        "output_immutability",
    ),
) -> GateReport:
    required_check_ids = tuple(required_check_ids)
    checks = tuple(
        CheckResult(
            check_id=check_id,
            category=CheckCategory.EXECUTION,
            status=(
                CheckStatus.PASS
                if ready or check_id != "world_isolation"
                else CheckStatus.FAIL
            ),
            summary=check_id,
        )
        for check_id in required_check_ids
    )
    return GateReport(
        profile_id=profile_id,
        state=GateState.FREEZE_READY if ready else GateState.DRAFT,
        checks=checks,
        required_check_ids=required_check_ids,
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
            execution_report=execution_report(True, proof.execution_profile_id),
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
            execution_report=execution_report(False, proof.execution_profile_id),
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
            execution_report=execution_report(True, proof.execution_profile_id),
        )
        self.assertFalse(review.causal_pass)
        self.assertFalse(review.all_three_pass)

    def test_missing_scientific_execution_check_blocks_full_review(self):
        proof = validate_design(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        )
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(
                True,
                proof.execution_profile_id,
                required_check_ids=("world_isolation",),
            ),
        )
        self.assertFalse(review.execution_pass)
        self.assertFalse(review.all_three_pass)
        self.assertTrue(
            any(
                "execution_profile_missing_required_checks" in x
                for x in review.execution_blockers
            )
        )

    def test_declared_execution_ids_without_concrete_results_are_rejected(self):
        proof = validate_design(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        )
        fake = GateReport(
            profile_id=proof.execution_profile_id,
            state=GateState.FREEZE_READY,
            checks=(),
            required_check_ids=proof.required_execution_check_ids,
            unresolved_check_ids=(),
            missing_check_ids=(),
            duplicate_check_ids=(),
            freeze_ready=True,
        )
        review = three_lens_review(
            proof_report=proof,
            execution_report=fake,
        )
        self.assertFalse(review.execution_pass)
        self.assertTrue(
            any(
                "execution_profile_missing_concrete_pass_results" in x
                for x in review.execution_blockers
            )
        )

    def test_execution_profile_mismatch_blocks_full_review(self):
        proof = validate_design(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        )
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(True, "WRONG_PROFILE"),
        )
        self.assertFalse(review.execution_pass)
        self.assertFalse(review.all_three_pass)
        self.assertTrue(
            any("execution_profile_mismatch" in x for x in review.execution_blockers)
        )

    def test_definition_failure_blocks_full_review(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            pre_registered=False,
        )
        proof = validate_design(design)
        review = three_lens_review(
            proof_report=proof,
            execution_report=execution_report(True, proof.execution_profile_id),
        )
        self.assertFalse(review.definition_pass)
        self.assertFalse(review.all_three_pass)


if __name__ == "__main__":
    unittest.main()
