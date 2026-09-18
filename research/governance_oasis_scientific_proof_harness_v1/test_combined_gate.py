from __future__ import annotations

import unittest

from research.oasis_experiment_freeze_harness_v1.models import GateReport, GateState

from .combined_gate import combine_readiness
from .models import AxisId, ProofDesignReport


def proof(ready: bool) -> ProofDesignReport:
    return ProofDesignReport(
        experiment_id="X",
        execution_profile_id="EXEC_X",
        required_execution_check_ids=(
            "source_freeze",
            "world_isolation",
            "cross_arm_identity",
            "future_leakage",
            "evaluator_postjoin",
            "single_realization",
            "provenance_integrity",
            "output_immutability",
        ),
        checks=(),
        targeted_axes=(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS,),
        proof_ready=ready,
        unresolved_check_ids=() if ready else ("scientific",),
    )


def freeze(ready: bool) -> GateReport:
    return GateReport(
        profile_id="EXEC_X",
        state=GateState.FREEZE_READY if ready else GateState.DRAFT,
        checks=(),
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
        unresolved_check_ids=() if ready else ("execution",),
        missing_check_ids=(),
        duplicate_check_ids=(),
        freeze_ready=ready,
    )


class CombinedReadinessTests(unittest.TestCase):
    def test_wrong_execution_profile_cannot_unlock_scientific_design(self):
        p = proof(True)
        f = freeze(True)
        wrong = GateReport(
            profile_id="OTHER_EXPERIMENT",
            state=f.state,
            checks=f.checks,
            required_check_ids=f.required_check_ids,
            unresolved_check_ids=f.unresolved_check_ids,
            missing_check_ids=f.missing_check_ids,
            duplicate_check_ids=f.duplicate_check_ids,
            freeze_ready=f.freeze_ready,
        )
        report = combine_readiness(p, wrong)
        self.assertFalse(report.execution_profile_matches)
        self.assertFalse(report.experiment_ready)

    def test_missing_required_execution_check_blocks_combined_readiness(self):
        p = proof(True)
        f = freeze(True)
        incomplete = GateReport(
            profile_id=f.profile_id,
            state=f.state,
            checks=f.checks,
            required_check_ids=("world_isolation",),
            unresolved_check_ids=(),
            missing_check_ids=(),
            duplicate_check_ids=(),
            freeze_ready=True,
        )
        report = combine_readiness(p, incomplete)
        self.assertFalse(report.execution_contract_matches)
        self.assertFalse(report.experiment_ready)

    def test_both_scientific_and_execution_gates_are_required(self):
        self.assertTrue(combine_readiness(proof(True), freeze(True)).experiment_ready)
        self.assertFalse(combine_readiness(proof(False), freeze(True)).experiment_ready)
        self.assertFalse(combine_readiness(proof(True), freeze(False)).experiment_ready)
        self.assertFalse(combine_readiness(proof(False), freeze(False)).experiment_ready)


if __name__ == "__main__":
    unittest.main()
