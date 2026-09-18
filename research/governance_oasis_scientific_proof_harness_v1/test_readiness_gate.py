from __future__ import annotations

from pathlib import Path
import unittest

from research.oasis_experiment_freeze_harness_v1.models import GateReport, GateState

from .io import load_evidence_registry
from .models import AxisId
from .portfolio_gate import audit_portfolio
from .readiness_gate import evaluate_experiment_readiness
from .test_design_gate import make_design


HERE = Path(__file__).resolve().parent


def execution_for(design, *, profile_id: str | None = None, required=None, ready=True):
    return GateReport(
        profile_id=profile_id or design.execution_profile_id,
        state=GateState.FREEZE_READY if ready else GateState.DRAFT,
        checks=(),
        required_check_ids=tuple(required or design.required_execution_check_ids),
        unresolved_check_ids=() if ready else ("runtime_gate",),
        missing_check_ids=(),
        duplicate_check_ids=(),
        freeze_ready=ready,
    )


class CanonicalReadinessGateTests(unittest.TestCase):
    def setUp(self):
        self.program_id, records = load_evidence_registry(
            HERE / "PROGRAM_EVIDENCE_REGISTRY.json"
        )
        self.portfolio = audit_portfolio(
            program_id=self.program_id,
            evidence=records,
        )

    def test_current_next_axis_a2_can_become_ready_only_with_all_gates(self):
        design = make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        report = evaluate_experiment_readiness(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
            execution_report=execution_for(design),
        )
        self.assertTrue(report.scientific_design_ready)
        self.assertTrue(report.sequence_ready)
        self.assertTrue(report.three_lens_ready)
        self.assertTrue(report.experiment_ready)

    def test_later_axis_remains_blocked_even_with_perfect_execution_report(self):
        design = make_design(AxisId.A4_OVERGENERALIZATION_PREVENTION)
        report = evaluate_experiment_readiness(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
            execution_report=execution_for(design),
        )
        self.assertTrue(report.scientific_design_ready)
        self.assertFalse(report.sequence_ready)
        self.assertFalse(report.experiment_ready)

    def test_wrong_execution_profile_blocks_canonical_ready_gate(self):
        design = make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        report = evaluate_experiment_readiness(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
            execution_report=execution_for(design, profile_id="WRONG"),
        )
        self.assertFalse(report.three_lens_ready)
        self.assertFalse(report.experiment_ready)

    def test_incomplete_execution_contract_blocks_canonical_ready_gate(self):
        design = make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY)
        report = evaluate_experiment_readiness(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
            execution_report=execution_for(
                design,
                required=("source_freeze",),
            ),
        )
        self.assertFalse(report.three_lens_ready)
        self.assertFalse(report.experiment_ready)


if __name__ == "__main__":
    unittest.main()
