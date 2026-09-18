from __future__ import annotations

import json
from pathlib import Path

from .models import AxisId, CausalContrast, EvidenceLevel, ExperimentDesign


def load_design(path: Path) -> ExperimentDesign:
    raw = json.loads(path.read_text(encoding="utf-8"))
    contrasts = tuple(
        CausalContrast(
            contrast_id=str(item["contrast_id"]),
            treatment=str(item["treatment"]),
            control=str(item["control"]),
            targeted_mechanism=str(item["targeted_mechanism"]),
            held_constant=tuple(str(x) for x in item.get("held_constant", ())),
            observable_ids=tuple(str(x) for x in item.get("observable_ids", ())),
            falsification_condition=str(item["falsification_condition"]),
            mechanism_removed_or_permuted=bool(
                item.get("mechanism_removed_or_permuted", True)
            ),
            expected_direction_required=bool(
                item.get("expected_direction_required", False)
            ),
        )
        for item in raw.get("contrasts", ())
    )
    return ExperimentDesign(
        experiment_id=str(raw["experiment_id"]),
        purpose=str(raw["purpose"]),
        targeted_axes=tuple(AxisId(x) for x in raw.get("targeted_axes", ())),
        claim_ids=tuple(str(x) for x in raw.get("claim_ids", ())),
        evidence_level=EvidenceLevel(raw["evidence_level"]),
        hypothesis=str(raw["hypothesis"]),
        null_or_falsification=str(raw["null_or_falsification"]),
        temporal_order=tuple(str(x) for x in raw.get("temporal_order", ())),
        observables=tuple(str(x) for x in raw.get("observables", ())),
        contrasts=contrasts,
        independent_evaluator=bool(raw["independent_evaluator"]),
        evaluator_blinded_to=tuple(str(x) for x in raw.get("evaluator_blinded_to", ())),
        evaluator_truth_joined_after_worker_sealed=bool(
            raw["evaluator_truth_joined_after_worker_sealed"]
        ),
        authoritative_outcome_observation=bool(raw["authoritative_outcome_observation"]),
        decision_worker_forbidden_inputs=tuple(
            str(x) for x in raw.get("decision_worker_forbidden_inputs", ())
        ),
        provenance_chain=tuple(str(x) for x in raw.get("provenance_chain", ())),
        replication_plan=str(raw["replication_plan"]),
        claim_boundary=tuple(str(x) for x in raw.get("claim_boundary", ())),
        pre_registered=bool(raw["pre_registered"]),
        confirmatory_size_or_matrix_rule_pre_registered=bool(
            raw["confirmatory_size_or_matrix_rule_pre_registered"]
        ),
        pilot_confirmatory_disjoint=bool(raw["pilot_confirmatory_disjoint"]),
        post_result_retuning_forbidden=bool(raw["post_result_retuning_forbidden"]),
        future_leakage_guard=bool(raw["future_leakage_guard"]),
        no_aggregate_winner_score=bool(raw["no_aggregate_winner_score"]),
        integrated_flow_baseline=bool(raw["integrated_flow_baseline"]),
        relation_context_controls=tuple(str(x) for x in raw.get("relation_context_controls", ())),
        responsibility_controls=tuple(str(x) for x in raw.get("responsibility_controls", ())),
        responsibility_non_scalar=bool(raw.get("responsibility_non_scalar", False)),
        selected_nonselected_obligations=bool(raw.get("selected_nonselected_obligations", False)),
        experience_identity_control=bool(raw.get("experience_identity_control", False)),
        relation_order_ablation=bool(raw.get("relation_order_ablation", False)),
        same_current_context_across_contrast=bool(raw.get("same_current_context_across_contrast", False)),
        behavior_endpoint=bool(raw.get("behavior_endpoint", False)),
        effectiveness_endpoint=bool(raw.get("effectiveness_endpoint", False)),
        conflicting_experience_count=int(raw.get("conflicting_experience_count", 0)),
        conflict_order_preserved=bool(raw.get("conflict_order_preserved", False)),
        no_scalar_conflict_overwrite=bool(raw.get("no_scalar_conflict_overwrite", False)),
        no_global_exclusion_control=bool(raw.get("no_global_exclusion_control", False)),
        wrong_change_realized=bool(raw.get("wrong_change_realized", False)),
        post_outcome_contradictory_evidence=bool(raw.get("post_outcome_contradictory_evidence", False)),
        recovery_epochs=int(raw.get("recovery_epochs", 0)),
        recovery_endpoint=bool(raw.get("recovery_endpoint", False)),
        post_outcome_revalidation_control=bool(raw.get("post_outcome_revalidation_control", False)),
        structural_only=bool(raw.get("structural_only", False)),
        metadata=dict(raw.get("metadata", {})),
    )
