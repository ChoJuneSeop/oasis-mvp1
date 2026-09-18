from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.models import (
    AxisId, CausalContrast, EvidenceLevel, ExperimentDesign,
)
from research.governance_oasis_scientific_proof_harness_v1.registry import (
    MANDATORY_EXECUTION_CHECK_IDS, MANDATORY_TEMPORAL_ORDER,
)

EXPERIMENT_ID = "GH4_FLOW_PRESERVING_INTEGRATED_CONFIRMATORY_V1"
EXECUTION_PROFILE_ID = "GH4_INTEGRATED_EXECUTION_V1"

GH4_CHECKS = (
    "all_six_axes_prior_supported",
    "long_horizon_accumulation",
    "current_flow_first_history_gate",
    "full_temporal_chain_each_epoch",
    "seed_ce_identity_order_provenance_immutable",
    "conflicting_ce_coexist",
    "responsibility_non_scalar_runtime",
    "selected_nonselected_obligations_runtime",
    "same_changed_unrelated_contexts",
    "wrong_change_recovery_chain_runtime",
    "fresh_decision_process_per_epoch",
    "no_future_or_evaluator_truth_to_worker",
    "one_realization_per_epoch",
    "append_only_history",
    "no_scalar_memory_weight_runtime",
    "post_result_retuning_zero",
)

AXES = tuple(AxisId)

OBSERVABLES = (
    "history-need gate and candidate access count",
    "candidate CE identities",
    "participation YES/NO with relation/order provenance",
    "possibility identities",
    "U/I/V/T responsibility envelopes",
    "selected and nonselected obligations",
    "selected and realized action",
    "authoritative post-realization outcome",
    "Closure and revalidation commit",
    "archive size and immutable CE fingerprints",
    "later recovery and context-local reuse",
)

HELD = (
    "same current observation for the matched epoch",
    "same Core and possibility set",
    "same frozen epoch schedule",
    "same initial CE archive",
    "same environment outcome rule",
    "same independent evaluator",
)

def _c(cid,treatment,control,mechanism,falsification):
    return CausalContrast(
        contrast_id=cid,
        treatment=treatment,
        control=control,
        targeted_mechanism=mechanism,
        held_constant=HELD,
        observable_ids=OBSERVABLES,
        falsification_condition=falsification,
    )

def build_design() -> ExperimentDesign:
    return ExperimentDesign(
        experiment_id=EXPERIMENT_ID,
        execution_profile_id=EXECUTION_PROFILE_ID,
        required_execution_check_ids=tuple(MANDATORY_EXECUTION_CHECK_IDS)+GH4_CHECKS,
        purpose=(
            "Test whether the six previously supported Governance OASIS functions coexist "
            "inside one append-only long-horizon flow while preserving current-flow-first gating, "
            "provenance continuity, temporal causality, and exactly one realization per epoch."
        ),
        targeted_axes=AXES,
        claim_ids=(
            "GO-A1-C1","GO-A1-C2","GO-A2-C1","GO-A2-C2","GO-A3-C1",
            "GO-A4-C1","GO-A5-C1","GO-A6-C1","GO-INTEGRATED-C1",
        ),
        evidence_level=EvidenceLevel.INTEGRATED_CONFIRMATORY,
        hypothesis=(
            "FULL_FLOW preserves the complete causal sequence across a growing CE archive and "
            "shows the preregistered behavior, provenance, responsibility, scope-locality, "
            "conflict, and recovery endpoints; targeted read-time ablations selectively break "
            "their corresponding endpoints without requiring destructive history mutation."
        ),
        null_or_falsification=(
            "The integrated claim is not supported if any required stage is skipped, history is "
            "destructively rewritten, future/evaluator truth reaches a decision worker, an epoch "
            "has other than one realization, any full-flow axis endpoint fails, or a registered "
            "ablation is indistinguishable on its prespecified discriminative epoch(s)."
        ),
        temporal_order=tuple(MANDATORY_TEMPORAL_ORDER),
        observables=OBSERVABLES,
        contrasts=(
            _c("GH4-A1-INITIAL-EXPERIENCE","FULL_FLOW","INITIAL_EXPERIENCE_HIDDEN",
               "experience participation history behavior mechanism",
               "initial CE exposure does not alter the preregistered realized behavior"),
            _c("GH4-A1-REVALIDATION-EFFECT","FULL_FLOW","REVALIDATION_RECORD_ONLY",
               "revalidation behavior effectiveness mechanism",
               "later recovery/effectiveness does not differ from record-only"),
            _c("GH4-A2-IDENTITY","FULL_FLOW","IDENTITY_PERMUTED",
               "experience identity provenance mechanism",
               "identity permutation does not alter the identity-discriminative epoch"),
            _c("GH4-A2-RELATION","FULL_FLOW","RELATION_ABLATED",
               "relation provenance mechanism",
               "relation ablation does not alter the relation-discriminative epoch"),
            _c("GH4-A2-ORDER","FULL_FLOW","ORDER_ABLATED",
               "order provenance mechanism",
               "order ablation does not alter the order-discriminative epochs"),
            _c("GH4-A3-BINDING","FULL_FLOW","RESPONSIBILITY_RECORD_ONLY",
               "responsibility record_only binding mechanism",
               "responsibility binding is indistinguishable from record-only"),
            _c("GH4-A3-CONTENT","FULL_FLOW","RESPONSIBILITY_PERMUTED",
               "responsibility permuted content mechanism",
               "responsibility content permutation does not alter the responsibility epoch"),
            _c("GH4-A4-SCOPE","FULL_FLOW","SCOPE_GUARD_ABLATED",
               "scope relation participation locality mechanism",
               "changed/unrelated contexts are indistinguishable from global scope-guard ablation"),
            _c("GH4-A5-CONFLICT","FULL_FLOW","CONFLICT_LATEST_ONLY",
               "conflict contextual resolution mechanism",
               "contextual conflict handling is indistinguishable from latest-only collapse"),
            _c("GH4-A6-REVALIDATION","FULL_FLOW","REVALIDATION_RECORD_ONLY",
               "revalidation recovery mechanism",
               "decision-linked post-outcome revalidation does not alter later realized recovery"),
            _c("GH4-A6-ATTRIBUTION","FULL_FLOW","EXOGENOUS_ATTRIBUTION_CONTROL",
               "revalidation exogenous attribution mechanism",
               "exogenous adverse evidence is treated as decision-linked recovery evidence"),
        ),
        independent_evaluator=True,
        evaluator_blinded_to=(
            "future outcome","expected label/truth","arm identity until each decision output is sealed"
        ),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=True,
        decision_worker_forbidden_inputs=(
            "future outcome","expected evaluator label","evaluator truth",
            "post-outcome adverse classification",
        ),
        provenance_chain=(
            "CURRENT_FLOW","RELATION_PROCESS","HISTORY_NEED_GATE","CE CANDIDATE IDENTITY",
            "PARTICIPATION YES/NO","POSSIBILITY_DISTRIBUTION","U/I/V/T RESPONSIBILITY",
            "DECISION","SINGLE_REALIZATION","POST_OUTCOME_OBSERVATION","CLOSURE",
            "REVALIDATION COMMIT","APPEND-ONLY COMPLETED EXPERIENCE","LATER CURRENT FLOW",
        ),
        replication_plan=(
            "Structural pilot P is disjoint. Confirmatory F1/F2/F3 each run the same frozen "
            "11-epoch long-horizon schedule under 11 arms; 363 arm-epochs and exactly 363 "
            "decision-realization units."
        ),
        claim_boundary=(
            "Finite deterministic synthetic integrated Governance OASIS mechanism.",
            "Supports coexistence and flow preservation inside the frozen proof contract only.",
            "Does not establish real-world safety, CARLA performance, population generalization, "
            "normative correctness, or universal system superiority.",
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
        relation_context_controls=("SAME_SCOPE","CHANGED_SCOPE","UNRELATED_RELATION"),
        responsibility_controls=("RECORD_ONLY","PERMUTED"),
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
            "Two preserved Completed Experiences conflict when their provenance-linked records "
            "support different feasible action identities under the same frozen current flow."
        ),
        conflict_order_preserved=True,
        no_scalar_conflict_overwrite=True,
        no_global_exclusion_control=True,
        attribution_controls=("DECISION_LINKED","EXOGENOUS"),
        wrongness_defined_only_post_outcome=True,
        adverse_outcome_criterion=(
            "Only after decision output and realization are sealed, authoritative impact_code "
            "constraint_breach is classified ADVERSE."
        ),
        adverse_change_realization_endpoint=True,
        post_outcome_contradiction_endpoint=True,
        recovery_epochs=3,
        recovery_endpoint=True,
        post_outcome_revalidation_control=True,
        metadata={
            "requires_authoritative_post_outcome":True,
            "long_horizon_epochs":11,
            "confirmatory_families":3,
            "arm_count":11,
            "confirmatory_decision_realization_units":363,
        },
    )
