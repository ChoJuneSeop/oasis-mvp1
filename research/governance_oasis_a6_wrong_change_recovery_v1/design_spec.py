from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.models import (
    AxisId, CausalContrast, EvidenceLevel, ExperimentDesign,
)
from research.governance_oasis_scientific_proof_harness_v1.registry import (
    MANDATORY_EXECUTION_CHECK_IDS, MANDATORY_TEMPORAL_ORDER,
)

EXPERIMENT_ID = "GO_A6_WRONG_CHANGE_RECOVERY_V1"
EXECUTION_PROFILE_ID = "GO_A6_WRONG_CHANGE_RECOVERY_EXECUTION_V1"

A6_CHECKS = (
    "three_epoch_chain",
    "initial_experience_contrast",
    "wrongness_absent_at_decision",
    "authoritative_outcome_after_realization",
    "evaluator_postseal",
    "decision_linked_exogenous_separation",
    "revalidation_commit_after_closure",
    "revalidation_exposed_record_only",
    "same_scope_recovery_endpoint",
    "unrelated_relation_noninheritance",
    "participation_revision_provenance",
    "no_counterfactual_recovery",
    "selected_realized_single",
)

def build_design() -> ExperimentDesign:
    observables=(
        "initial CE participation",
        "initial selected and realized action",
        "authoritative post-realization observation",
        "post-outcome adverse classification",
        "attribution DECISION_LINKED or EXOGENOUS",
        "revalidation state and provenance",
        "later CE participation revision",
        "later selected and realized action",
        "prespecified recovery endpoint",
    )
    common=(
        "same initial current-flow observation",
        "same antecedent Completed Experience and provenance",
        "same Core and possibility set",
        "same participation and responsibility rules",
        "same independent evaluator",
    )
    return ExperimentDesign(
        experiment_id=EXPERIMENT_ID,
        execution_profile_id=EXECUTION_PROFILE_ID,
        required_execution_check_ids=tuple(MANDATORY_EXECUTION_CHECK_IDS)+A6_CHECKS,
        purpose=(
            "Test the complete causal chain from prior Completed Experience induced behavior "
            "change, through authoritative post-realization adverse evidence and provenance-bound "
            "revalidation, to later related behavior recovery."
        ),
        targeted_axes=(AxisId.A6_WRONG_BEHAVIOR_RECOVERY,),
        claim_ids=("GO-A6-C1",),
        evidence_level=EvidenceLevel.CONFIRMATORY,
        hypothesis=(
            "Prior CE exposure causally changes the initial realized action; only after that "
            "realization an authoritative adverse observation can create decision-linked "
            "REVISED feedback; exposing that committed feedback in the later same relation "
            "causally restores the prespecified baseline action relative to record-only, while "
            "exogenous evidence and unrelated relations do not inherit the recovery feedback."
        ),
        null_or_falsification=(
            "A valid experiment does not support A6 if prior CE exposure fails to alter the "
            "initial realized behavior, if wrongness exists before realization, if adverse "
            "classification is not post-outcome, if revalidation exposure fails to alter the "
            "later same-scope realized action relative to record-only, or if exogenous/unrelated "
            "controls inherit decision-linked recovery."
        ),
        temporal_order=tuple(MANDATORY_TEMPORAL_ORDER),
        observables=observables,
        contrasts=(
            CausalContrast(
                contrast_id="A6-INITIAL-EXPERIENCE",
                treatment="INITIAL_EXPERIENCE_EXPOSED",
                control="INITIAL_EXPERIENCE_HIDDEN",
                targeted_mechanism="experience participation induced initial behavior change",
                held_constant=common,
                observable_ids=observables,
                falsification_condition=(
                    "exposed and hidden arms realize the same initial action or the exposed "
                    "behavior is not later classified adverse from authoritative observation"
                ),
            ),
            CausalContrast(
                contrast_id="A6-REVALIDATION-RECOVERY",
                treatment="REVALIDATION_EXPOSED",
                control="REVALIDATION_RECORD_ONLY",
                targeted_mechanism="post-outcome revalidation feedback causing later recovery",
                held_constant=common+(
                    "same initial realized action",
                    "same authoritative outcome observation stream",
                    "same decision-linked revalidation commit",
                ),
                observable_ids=observables,
                falsification_condition=(
                    "same-scope later realized action does not differ between exposed and "
                    "record-only revalidation or does not meet the prespecified recovery endpoint"
                ),
            ),
            CausalContrast(
                contrast_id="A6-ATTRIBUTION",
                treatment="decision-linked adverse evidence",
                control="EXOGENOUS_ATTRIBUTION_CONTROL",
                targeted_mechanism="post-outcome attribution separation",
                held_constant=common+("same initial realized action","same raw adverse impact code"),
                observable_ids=observables,
                falsification_condition="exogenous evidence is converted into decision-linked CE revision or recovery",
            ),
            CausalContrast(
                contrast_id="A6-UNRELATED-RELATION",
                treatment="same-scope revalidation exposure",
                control="unrelated relation with the same committed feedback",
                targeted_mechanism="relation-local revalidation participation",
                held_constant=common+("same revalidation commit","same later CE semantic eligibility"),
                observable_ids=observables,
                falsification_condition="unrelated relation inherits same-scope recovery suppression",
            ),
        ),
        independent_evaluator=True,
        evaluator_blinded_to=("future outcome","expected label/truth","arm identity until initial worker outputs are sealed"),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=True,
        decision_worker_forbidden_inputs=(
            "future outcome",
            "expected adverse label",
            "evaluator truth",
            "post-outcome wrongness classification",
        ),
        provenance_chain=(
            "COMPLETED_EXPERIENCE identity",
            "PARTICIPATION YES/NO",
            "DECISION",
            "SINGLE_REALIZATION",
            "POST_OUTCOME_OBSERVATION",
            "CLOSURE",
            "REVALIDATION COMMIT",
            "LATER PARTICIPATION",
            "LATER DECISION",
            "LATER SINGLE_REALIZATION",
        ),
        replication_plan=(
            "Disjoint structural pilot P; confirmatory F1/F2/F3, each with SAME_SCOPE and "
            "UNRELATED_RELATION recurrences across five preregistered arms. "
            "30 chains and 60 realized decision epochs in confirmatory."
        ),
        claim_boundary=(
            "Finite deterministic synthetic wrong-change/recovery mechanism.",
            "Adversity is operational, not a universal moral or legal wrongness judgment.",
            "No real-world safety, CARLA, or general performance superiority claim.",
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
        relation_context_controls=("SAME_SCOPE","UNRELATED_RELATION"),
        attribution_controls=("DECISION_LINKED","EXOGENOUS"),
        wrongness_defined_only_post_outcome=True,
        adverse_outcome_criterion=(
            "After initial realization is sealed, classify authoritative observation "
            "impact_code == 'constraint_breach' as ADVERSE; no decision worker receives this rule result."
        ),
        adverse_change_realization_endpoint=True,
        post_outcome_contradiction_endpoint=True,
        recovery_epochs=3,
        recovery_endpoint=True,
        post_outcome_revalidation_control=True,
        participation_yes_no_provenance=True,
        metadata={
            "requires_authoritative_post_outcome":True,
            "pilot_chains":10,
            "confirmatory_chains":30,
            "confirmatory_decision_realization_units":60,
        },
    )
