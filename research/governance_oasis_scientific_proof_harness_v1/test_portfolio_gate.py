from __future__ import annotations

from pathlib import Path
import unittest

from .io import load_evidence_registry
from .models import AxisId, EvidenceLevel, EvidenceRecord
from .portfolio_gate import audit_portfolio


HERE = Path(__file__).resolve().parent


class PortfolioGateTests(unittest.TestCase):
    def test_current_program_is_not_proof_complete_and_gaps_are_explicit(self):
        program_id, records = load_evidence_registry(HERE / "PROGRAM_EVIDENCE_REGISTRY.json")
        report = audit_portfolio(program_id=program_id, evidence=records)

        self.assertFalse(report.proof_complete)
        self.assertIn(
            AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING.value,
            report.missing_axes,
        )
        self.assertIn(
            AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY.value,
            report.weak_axes,
        )
        self.assertIn(
            AxisId.A4_OVERGENERALIZATION_PREVENTION.value,
            report.weak_axes,
        )
        self.assertIn(
            AxisId.A6_WRONG_BEHAVIOR_RECOVERY.value,
            report.weak_axes,
        )
        self.assertEqual(report.integration_evidence_ids, ())

    def test_structural_run5_is_preserved_but_never_counts_as_axis_proof(self):
        _, records = load_evidence_registry(HERE / "PROGRAM_EVIDENCE_REGISTRY.json")
        run5 = next(x for x in records if x.evidence_id == "E-RUN5-CARLA-STRUCTURAL")
        self.assertEqual(run5.level, EvidenceLevel.STRUCTURAL_ONLY)
        self.assertFalse(run5.counts_toward_axis_proof)
        self.assertEqual(run5.axes, ())

    def test_integrated_evidence_cannot_replace_axis_specific_confirmatory(self):
        integrated = EvidenceRecord(
            evidence_id="E-INTEGRATED-ONLY",
            experiment_id="GH4-INTEGRATED",
            axes=tuple(AxisId),
            level=EvidenceLevel.INTEGRATED_CONFIRMATORY,
            design_report_passed=True,
            result_status="COMPLETE",
            source_refs=("integrated-spec", "integrated-result"),
            claim_boundary=("finite integrated scope",),
            counts_toward_axis_proof=True,
        )
        report = audit_portfolio(program_id="TEST", evidence=(integrated,))
        self.assertFalse(report.proof_complete)
        self.assertEqual(set(report.weak_axes), {axis.value for axis in AxisId})
        self.assertEqual(report.integration_evidence_ids, ("E-INTEGRATED-ONLY",))

    def test_program_can_close_only_with_all_axis_confirmatory_and_integration(self):
        records = []
        for axis in AxisId:
            records.append(
                EvidenceRecord(
                    evidence_id=f"E-{axis.value}",
                    experiment_id=f"X-{axis.value}",
                    axes=(axis,),
                    level=EvidenceLevel.CONFIRMATORY,
                    design_report_passed=True,
                    result_status="COMPLETE",
                    source_refs=("frozen-spec", "result"),
                    claim_boundary=("finite scope",),
                    counts_toward_axis_proof=True,
                )
            )
        records.append(
            EvidenceRecord(
                evidence_id="E-INTEGRATED",
                experiment_id="GH4-INTEGRATED",
                axes=tuple(AxisId),
                level=EvidenceLevel.INTEGRATED_CONFIRMATORY,
                design_report_passed=True,
                result_status="COMPLETE",
                source_refs=("integrated-spec", "integrated-result"),
                claim_boundary=("finite integrated scope",),
                counts_toward_axis_proof=True,
            )
        )
        report = audit_portfolio(program_id="TEST", evidence=records)
        self.assertTrue(report.proof_complete)
        self.assertEqual(report.missing_axes, ())
        self.assertEqual(report.weak_axes, ())
        self.assertEqual(report.integration_evidence_ids, ("E-INTEGRATED",))


if __name__ == "__main__":
    unittest.main()
