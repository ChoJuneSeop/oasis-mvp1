from __future__ import annotations

from dataclasses import replace
import unittest

from .design_gate import validate_design
from .models import AxisId, CausalContrast, DesignStatus, EvidenceLevel, ExperimentDesign
from .registry import MANDATORY_TEMPORAL_ORDER


CLAIM_BY_AXIS = {
    AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS: "GO-A1-C1",
    AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY: "GO-A2-C1",
    AxisId.A3_RESPONSIBILITY_SENSITIVITY: "GO-A3-C1",
    AxisId.A4_OVERGENERALIZATION_PREVENTION: "GO-A4-C1",
    AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING: "GO-A5-C1",
    AxisId.A6_WRONG_BEHAVIOR_RECOVERY: "GO-A6-C1",
}


def make_design(axis: AxisId) -> ExperimentDesign:
    mechanism = {
        AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS: "selective participation",
        AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY: "relation order history",
        AxisId.A3_RESPONSIBILITY_SENSITIVITY: "responsibility binding",
        AxisId.A4_OVERGENERALIZATION_PREVENTION: "scope local participation",
        AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING: "conflict handling",
        AxisId.A6_WRONG_BEHAVIOR_RECOVERY: "post outcome revalidation",
    }[axis]
    contrast = CausalContrast(
        contrast_id="C1",
        treatment="FULL",
        control="TARGETED_ABLATION",
        targeted_mechanism=mechanism,
        held_constant=("current_observation", "core", "possibility_set", "scenario_order"),
        observable_ids=("realized_choice", "outcome"),
        falsification_condition="The prespecified treatment-control causal contrast is zero or contradicts the claimed mechanism under the frozen matrix.",
        mechanism_removed_or_permuted=True,
    )
    contrasts = [contrast]
    if axis is AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY:
        contrasts.append(
            CausalContrast(
                contrast_id="C2",
                treatment="IDENTITY_INTACT",
                control="IDENTITY_PERMUTED",
                targeted_mechanism="experience identity",
                held_constant=("current_observation", "core", "possibility_set", "participation_count"),
                observable_ids=("realized_choice", "outcome"),
                falsification_condition="Identity permutation produces no distinguishable contribution under the frozen relation context.",
                mechanism_removed_or_permuted=True,
            )
        )
    return ExperimentDesign(
        experiment_id=f"TEST_{axis.value}",
        purpose="Falsifiable Governance OASIS mechanism test",
        targeted_axes=(axis,),
        claim_ids=(CLAIM_BY_AXIS[axis],),
        evidence_level=EvidenceLevel.CONFIRMATORY,
        hypothesis="The targeted Governance OASIS mechanism causally affects the prespecified later governance endpoint.",
        null_or_falsification="No causal treatment-control difference under the frozen contrast.",
        temporal_order=MANDATORY_TEMPORAL_ORDER,
        observables=("realized_choice", "outcome"),
        contrasts=tuple(contrasts),
        independent_evaluator=True,
        evaluator_blinded_to=("future_state", "expected_label"),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=True,
        decision_worker_forbidden_inputs=(
            "future_state",
            "expected_label",
            "evaluator_outcome",
        ),
        provenance_chain=(
            "COMPLETED_EXPERIENCE",
            "PARTICIPATION",
            "DECISION",
            "REALIZATION",
            "OUTCOME",
        ),
        replication_plan="Frozen finite confirmatory matrix with disjoint pilot and no result-derived retuning.",
        claim_boundary=("finite frozen mechanism scope", "no universal superiority claim"),
        pre_registered=True,
        confirmatory_size_or_matrix_rule_pre_registered=True,
        pilot_confirmatory_disjoint=True,
        post_result_retuning_forbidden=True,
        future_leakage_guard=True,
        no_aggregate_winner_score=True,
        integrated_flow_baseline=True,
        relation_context_controls=("SAME_SCOPE", "CHANGED_SCOPE", "UNRELATED_RELATION"),
        responsibility_controls=("RECORD_ONLY", "PERMUTED"),
        responsibility_non_scalar=True,
        selected_nonselected_obligations=True,
        experience_identity_control=True,
        relation_order_ablation=True,
        participation_yes_no_provenance=True,
        same_current_context_across_contrast=True,
        behavior_endpoint=True,
        effectiveness_endpoint=True,
        conflicting_experience_count=2,
        conflict_operational_definition=(
            "Two preserved Completed Experiences are conflict cases only when, "
            "under the same current relation and feasible possibility set, their "
            "provenance-linked records support incompatible feasible actions."
        ),
        conflict_order_preserved=True,
        no_scalar_conflict_overwrite=True,
        no_global_exclusion_control=True,
        attribution_controls=("DECISION_LINKED", "EXOGENOUS"),
        wrongness_defined_only_post_outcome=True,
        adverse_outcome_criterion=(
            "Independent post-realization evaluator marks the authoritative outcome "
            "adverse under the frozen directional criterion."
        ),
        wrong_change_realized=True,
        post_outcome_contradictory_evidence=True,
        recovery_epochs=3,
        recovery_endpoint=True,
        post_outcome_revalidation_control=True,
    )


class ScientificProofDesignGateTests(unittest.TestCase):
    def test_each_axis_has_a_satisfiable_but_strict_contract(self):
        for axis in AxisId:
            with self.subTest(axis=axis):
                report = validate_design(make_design(axis))
                self.assertTrue(report.proof_ready, report.as_dict())

    def test_structural_pilot_cannot_be_miscounted_as_proof(self):
        design = replace(
            make_design(AxisId.A4_OVERGENERALIZATION_PREVENTION),
            evidence_level=EvidenceLevel.STRUCTURAL_ONLY,
            structural_only=True,
        )
        report = validate_design(design)
        self.assertFalse(report.proof_ready)
        by_id = {x.check_id: x for x in report.checks}
        self.assertEqual(
            by_id["crosscut_scientific_evidence_level"].status,
            DesignStatus.BLOCKED,
        )

    def test_a1_requires_effectiveness_not_only_behavior_trace(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            effectiveness_endpoint=False,
        )
        report = validate_design(design)
        self.assertIn("axis_a1_behavior_effectiveness", report.unresolved_check_ids)

    def test_a2_requires_relation_order_ablation_not_memory_identity_alone(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            relation_order_ablation=False,
        )
        report = validate_design(design)
        self.assertIn("axis_a2_experience_traceability", report.unresolved_check_ids)

    def test_a3_requires_record_only_and_content_control(self):
        design = replace(
            make_design(AxisId.A3_RESPONSIBILITY_SENSITIVITY),
            responsibility_controls=("RECORD_ONLY",),
        )
        report = validate_design(design)
        self.assertIn("axis_a3_responsibility_sensitivity", report.unresolved_check_ids)

    def test_a4_requires_same_changed_and_unrelated_contexts(self):
        design = replace(
            make_design(AxisId.A4_OVERGENERALIZATION_PREVENTION),
            relation_context_controls=("SAME_SCOPE", "CHANGED_SCOPE"),
        )
        report = validate_design(design)
        self.assertIn("axis_a4_overgeneralization", report.unresolved_check_ids)

    def test_a2_requires_yes_no_participation_provenance(self):
        design = replace(
            make_design(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY),
            participation_yes_no_provenance=False,
        )
        report = validate_design(design)
        self.assertIn("axis_a2_experience_traceability", report.unresolved_check_ids)

    def test_a5_requires_real_conflict_and_preserved_order(self):
        design = replace(
            make_design(AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING),
            conflicting_experience_count=1,
            conflict_order_preserved=False,
        )
        report = validate_design(design)
        self.assertIn("axis_a5_conflicting_experience", report.unresolved_check_ids)

    def test_a5_requires_operational_conflict_definition(self):
        design = replace(
            make_design(AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING),
            conflict_operational_definition="",
        )
        report = validate_design(design)
        self.assertIn("axis_a5_conflicting_experience", report.unresolved_check_ids)

    def test_a6_wrongness_cannot_be_known_before_outcome(self):
        design = replace(
            make_design(AxisId.A6_WRONG_BEHAVIOR_RECOVERY),
            wrongness_defined_only_post_outcome=False,
        )
        report = validate_design(design)
        self.assertIn("axis_a6_wrong_behavior_recovery", report.unresolved_check_ids)

    def test_a6_requires_exogenous_and_decision_linked_attribution_controls(self):
        design = replace(
            make_design(AxisId.A6_WRONG_BEHAVIOR_RECOVERY),
            attribution_controls=("DECISION_LINKED",),
        )
        report = validate_design(design)
        self.assertIn("axis_a6_wrong_behavior_recovery", report.unresolved_check_ids)

    def test_a6_requires_unrelated_relation_control(self):
        design = replace(
            make_design(AxisId.A6_WRONG_BEHAVIOR_RECOVERY),
            relation_context_controls=("SAME_SCOPE",),
        )
        report = validate_design(design)
        self.assertIn("axis_a6_wrong_behavior_recovery", report.unresolved_check_ids)

    def test_a6_requires_realized_wrong_change_then_later_recovery(self):
        design = replace(
            make_design(AxisId.A6_WRONG_BEHAVIOR_RECOVERY),
            wrong_change_realized=False,
            recovery_epochs=2,
        )
        report = validate_design(design)
        self.assertIn("axis_a6_wrong_behavior_recovery", report.unresolved_check_ids)

    def test_confirmatory_matrix_or_size_rule_must_be_preregistered(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            confirmatory_size_or_matrix_rule_pre_registered=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_preregistration_boundary", report.unresolved_check_ids)

    def test_pilot_and_confirmatory_must_be_disjoint(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            pilot_confirmatory_disjoint=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_preregistration_boundary", report.unresolved_check_ids)

    def test_post_result_retuning_must_be_forbidden(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            post_result_retuning_forbidden=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_preregistration_boundary", report.unresolved_check_ids)

    def test_evaluator_truth_must_join_only_after_worker_output_is_sealed(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            evaluator_truth_joined_after_worker_sealed=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_evaluator_independence", report.unresolved_check_ids)

    def test_supplied_label_cannot_substitute_for_authoritative_outcome(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            authoritative_outcome_observation=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_outcome_evidence_boundary", report.unresolved_check_ids)

    def test_decision_worker_must_forbid_evaluator_truth_inputs(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            decision_worker_forbidden_inputs=("future_state",),
        )
        report = validate_design(design)
        self.assertIn("crosscut_outcome_evidence_boundary", report.unresolved_check_ids)

    def test_future_leakage_guard_cannot_be_omitted(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            future_leakage_guard=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_temporal_causality", report.unresolved_check_ids)

    def test_confirmatory_evaluator_must_be_blinded(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            evaluator_blinded_to=("current_state",),
        )
        report = validate_design(design)
        self.assertIn("crosscut_evaluator_independence", report.unresolved_check_ids)

    def test_claim_cannot_target_wrong_axis(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            claim_ids=("GO-A3-C1",),
        )
        report = validate_design(design)
        self.assertIn("crosscut_claim_alignment", report.unresolved_check_ids)

    def test_aggregate_winner_score_is_not_required_or_allowed_by_contract(self):
        design = replace(
            make_design(AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS),
            no_aggregate_winner_score=False,
        )
        report = validate_design(design)
        self.assertIn("crosscut_preregistration_boundary", report.unresolved_check_ids)


if __name__ == "__main__":
    unittest.main()
