from __future__ import annotations

from pathlib import Path
import unittest

from .io import load_evidence_registry
from .models import AxisId, ClaimOutcome, EvidenceLevel, EvidenceRecord
from .portfolio_gate import audit_portfolio
from .registry import AXIS_CONTRACTS


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
            claim_outcome=ClaimOutcome.SUPPORTS,
            verified_obligations=tuple(
                sorted(
                    {
                        obligation
                        for axis in AxisId
                        for obligation in AXIS_CONTRACTS[axis].mandatory_obligations
                    }
                )
            ),
            review_method="test integrated review",
            result_rule_ref="frozen-result-rule",
        )
        report = audit_portfolio(program_id="TEST", evidence=(integrated,))
        self.assertFalse(report.proof_complete)
        self.assertEqual(set(report.weak_axes), {axis.value for axis in AxisId})
        self.assertEqual(report.integration_evidence_ids, ("E-INTEGRATED-ONLY",))

    def test_completed_null_result_does_not_count_as_proof_support(self):
        axis = AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS
        record = EvidenceRecord(
            evidence_id="E-NULL",
            experiment_id="X-NULL",
            axes=(axis,),
            level=EvidenceLevel.CONFIRMATORY,
            design_report_passed=True,
            result_status="COMPLETE",
            source_refs=("spec", "result"),
            claim_boundary=("finite scope",),
            counts_toward_axis_proof=True,
            claim_outcome=ClaimOutcome.DOES_NOT_SUPPORT,
            verified_obligations=AXIS_CONTRACTS[axis].mandatory_obligations,
            review_method="test review",
            result_rule_ref="frozen-result-rule",
        )
        report = audit_portfolio(program_id="TEST", evidence=(record,))
        self.assertFalse(report.proof_complete)
        self.assertIn(axis.value, report.unsupported_axes)
        self.assertNotIn(axis.value, report.supported_axes)

    def test_conflicting_confirmatory_outcomes_are_inconclusive_not_proof(self):
        axis = AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS
        base = dict(
            experiment_id="X",
            axes=(axis,),
            level=EvidenceLevel.CONFIRMATORY,
            design_report_passed=True,
            result_status="COMPLETE",
            source_refs=("spec", "result"),
            claim_boundary=("finite scope",),
            counts_toward_axis_proof=True,
            verified_obligations=AXIS_CONTRACTS[axis].mandatory_obligations,
            review_method="test review",
            result_rule_ref="frozen-result-rule",
        )
        records = (
            EvidenceRecord(evidence_id="E-S", claim_outcome=ClaimOutcome.SUPPORTS, **base),
            EvidenceRecord(evidence_id="E-N", claim_outcome=ClaimOutcome.DOES_NOT_SUPPORT, **base),
        )
        report = audit_portfolio(program_id="TEST", evidence=records)
        self.assertIn(axis.value, report.inconclusive_axes)
        self.assertNotIn(axis.value, report.supported_axes)

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
                    verified_obligations=AXIS_CONTRACTS[axis].mandatory_obligations,
                    review_method="test axis review",
                    result_rule_ref="frozen-result-rule",
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
                verified_obligations=tuple(
                    sorted(
                        {
                            obligation
                            for axis in AxisId
                            for obligation in AXIS_CONTRACTS[axis].mandatory_obligations
                        }
                    )
                ),
                review_method="test integrated review",
            result_rule_ref="frozen-result-rule",
            )
        )
        report = audit_portfolio(program_id="TEST", evidence=records)
        self.assertTrue(report.proof_complete)
        self.assertEqual(report.missing_axes, ())
        self.assertEqual(report.weak_axes, ())
        self.assertEqual(report.integration_evidence_ids, ("E-INTEGRATED",))


if __name__ == "__main__":
    unittest.main()
