from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import unittest

from .io import load_evidence_registry
from .models import AxisId, EvidenceLevel
from .portfolio_gate import audit_portfolio
from .program_sequence import validate_program_sequence
from .test_design_gate import make_design


HERE = Path(__file__).resolve().parent


class ProgramSequenceTests(unittest.TestCase):
    def setUp(self):
        program_id, records = load_evidence_registry(
            HERE / "PROGRAM_EVIDENCE_REGISTRY.json"
        )
        self.program_id = program_id
        self.portfolio = audit_portfolio(
            program_id=program_id,
            evidence=records,
        )

    def test_current_official_next_axis_is_a2(self):
        self.assertEqual(
            self.portfolio.next_required_axis,
            AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY.value,
        )

    def test_a2_design_is_sequence_admissible(self):
        report = validate_program_sequence(
            program_id=self.program_id,
            design=make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            portfolio=self.portfolio,
        )
        self.assertTrue(report.sequence_ready, report.as_dict())

    def test_later_axis_cannot_skip_unclosed_a2(self):
        report = validate_program_sequence(
            program_id=self.program_id,
            design=make_design(AxisId.A4_OVERGENERALIZATION_PREVENTION),
            portfolio=self.portfolio,
        )
        self.assertFalse(report.sequence_ready)
        self.assertTrue(
            any("official_axis_sequence_requires" in x for x in report.blockers)
        )

    def test_explicit_replication_of_closed_axis_does_not_advance_sequence(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            metadata={"replication_of_closed_axis": True},
        )
        report = validate_program_sequence(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
        )
        self.assertTrue(report.sequence_ready)
        self.assertEqual(
            report.next_required_axis,
            AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY.value,
        )

    def test_integration_is_blocked_until_all_six_axes_are_supported(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            experiment_id="GH4-TEST",
            evidence_level=EvidenceLevel.INTEGRATED_CONFIRMATORY,
            targeted_axes=tuple(AxisId),
            claim_ids=("GO-INTEGRATED-C1",),
        )
        report = validate_program_sequence(
            program_id=self.program_id,
            design=design,
            portfolio=self.portfolio,
        )
        self.assertFalse(report.sequence_ready)
        self.assertTrue(
            any(
                "integrated_experiment_blocked_until_all_axes_supported" in x
                for x in report.blockers
            )
        )


if __name__ == "__main__":
    unittest.main()
