from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.models import (
    AxisId,
    CausalContrast,
    EvidenceLevel,
    ExperimentDesign,
)
from research.governance_oasis_scientific_proof_harness_v1.registry import (
    MANDATORY_EXECUTION_CHECK_IDS,
    MANDATORY_TEMPORAL_ORDER,
)

from .models import EXECUTION_PROFILE_ID, EXPERIMENT_ID


A2_SPECIFIC_EXECUTION_CHECK_IDS = (
    "dual_evidence_independence",
    "pre_realization_seal",
    "decision_invocation_binding",
    "fixture_isolation",
    "negative_control_coverage",
    "hash_chain_integrity",
    "production_choice_boundary",
)


def build_design() -> ExperimentDesign:
    observables = (
        "experience participation identities",
        "participation YES/NO provenance for every eligible candidate",
        "reference decision-consumption identities",
        "system claimed decision-consumption identities",
        "relation provenance digest",
        "order provenance digest",
        "selected and realized possibility",
    )
    held = (
        "same current-flow observation",
        "same Core and possibility set",
        "same responsibility rule",
        "same evaluator",
    )
    contrasts = (
        CausalContrast(
            contrast_id="A2-I",
            treatment="identity binding CE-B",
            control="identity binding CE-A",
            targeted_mechanism="experience identity provenance specificity",
            held_constant=held + ("same semantic CE payload", "same relation and order metadata"),
            observable_ids=observables,
            falsification_condition="sealed trace identifies an instance other than the independently consumed CE instance",
        ),
        CausalContrast(
            contrast_id="A2-R",
            treatment="relation metadata ablated",
            control="relation metadata intact",
            targeted_mechanism="relation/process contribution provenance",
            held_constant=held + ("same CE identities and payload", "same order metadata"),
            observable_ids=observables,
            falsification_condition="relation provenance is unchanged or falsely attributed when the independently observed relation input differs",
        ),
        CausalContrast(
            contrast_id="A2-O",
            treatment="order history permuted",
            control="order history intact",
            targeted_mechanism="order-history contribution provenance",
            held_constant=held + ("same CE identities and payload", "same relation topology"),
            observable_ids=observables,
            falsification_condition="order provenance does not match the independently observed order input",
        ),
        CausalContrast(
            contrast_id="A2-N",
            treatment="candidate/revalidated/participating decoy not consumed",
            control="decision-consumed contribution criterion",
            targeted_mechanism="false attribution prevention for non-consumed experience",
            held_constant=held + ("same decoy CE payload", "same relation and order metadata"),
            observable_ids=observables,
            falsification_condition="a CE not observed at the decision-consumption boundary is reported as decision-linked contribution",
        ),
    )

    return ExperimentDesign(
        experiment_id=EXPERIMENT_ID,
        execution_profile_id=EXECUTION_PROFILE_ID,
        required_execution_check_ids=tuple(MANDATORY_EXECUTION_CHECK_IDS)
        + A2_SPECIFIC_EXECUTION_CHECK_IDS,
        purpose=(
            "Test whether Governance OASIS can trace the exact Completed Experience "
            "identity, relation-process provenance, and order history actually consumed "
            "by the current decision invocation without false attribution."
        ),
        targeted_axes=(AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY,),
        claim_ids=("GO-A2-C1", "GO-A2-C2"),
        evidence_level=EvidenceLevel.CONFIRMATORY,
        hypothesis=(
            "Pre-realization OASIS provenance agrees with an independent decision-boundary "
            "reference plane for identity, relation, order, participation and consumption."
        ),
        null_or_falsification=(
            "Any valid informative contrast may show missing/incorrect provenance or false "
            "attribution; such evidence does not support A2."
        ),
        temporal_order=tuple(MANDATORY_TEMPORAL_ORDER),
        observables=observables,
        contrasts=contrasts,
        independent_evaluator=True,
        evaluator_blinded_to=("future outcome", "expected label/truth", "arm identity until trace comparison"),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=False,
        decision_worker_forbidden_inputs=("future information", "expected label/truth", "evaluator outcome truth"),
        provenance_chain=(
            "COMPLETED_EXPERIENCE identity/provenance",
            "PARTICIPATION YES/NO",
            "DECISION input consumption",
            "SINGLE_REALIZATION",
            "OUTCOME observation",
        ),
        replication_plan=(
            "Run the preregistered finite A2-I/A2-R/A2-O/A2-N matrix with isolated "
            "replicates; contradictory valid confirmatory results yield INCONCLUSIVE."
        ),
        claim_boundary=(
            "Tests contribution traceability, not action quality.",
            "Tests the frozen synthetic/controlled execution contract, not universal deployment safety.",
            "Participation is distinct from decision consumption and behavior change.",
        ),
        pre_registered=True,
        confirmatory_size_or_matrix_rule_pre_registered=True,
        pilot_confirmatory_disjoint=True,
        post_result_retuning_forbidden=True,
        future_leakage_guard=True,
        no_aggregate_winner_score=True,
        integrated_flow_baseline=True,
        production_history_append_only=True,
        production_no_permanent_memory_weight=True,
        production_no_destructive_no=True,
        ablation_mutations_declared=True,
        experience_identity_control=True,
        relation_order_ablation=True,
        participation_yes_no_provenance=True,
        same_current_context_across_contrast=True,
        metadata={
            "dual_evidence_architecture": True,
            "decision_consumed_is_contribution": True,
            "behavior_change_not_required": True,
        },
    )
