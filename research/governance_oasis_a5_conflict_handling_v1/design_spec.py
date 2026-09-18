from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.models import (
    AxisId, CausalContrast, EvidenceLevel, ExperimentDesign,
)
from research.governance_oasis_scientific_proof_harness_v1.registry import (
    MANDATORY_EXECUTION_CHECK_IDS, MANDATORY_TEMPORAL_ORDER,
)

EXPERIMENT_ID = "GO_A5_CONFLICT_HANDLING_V1"
EXECUTION_PROFILE_ID = "GO_A5_CONFLICT_HANDLING_EXECUTION_V1"

A5_CHECKS = (
    "conflict_matrix_complete",
    "two_ce_preserved",
    "conflict_actions_opposed",
    "order_provenance_preserved",
    "relation_provenance_preserved",
    "participation_yes_no_provenance",
    "no_scalar_merge",
    "latest_only_is_ablation",
    "fresh_process_arms",
    "selected_realized_single",
)

def build_design() -> ExperimentDesign:
    observables = (
        "participating CE identities",
        "nonparticipating CE identities with NO provenance",
        "selected possibility",
        "realized possibility",
        "conflict-resolution provenance chain",
        "archive preservation",
        "order provenance",
        "relation provenance",
    )
    held = (
        "same current observation within each matched case",
        "same two conflicting Completed Experience records",
        "same Core and possibility set",
        "same responsibility rule",
        "same evaluator",
    )
    conflict_definition = (
        "Two preserved Completed Experiences are conflicting when, under the same frozen "
        "current relation and possibility set, their provenance-linked records support "
        "different feasible action identities."
    )
    return ExperimentDesign(
        experiment_id=EXPERIMENT_ID,
        execution_profile_id=EXECUTION_PROFILE_ID,
        required_execution_check_ids=tuple(MANDATORY_EXECUTION_CHECK_IDS)+A5_CHECKS,
        purpose=(
            "Test whether Governance OASIS preserves two conflicting Completed Experiences "
            "and resolves participation from current relation/order provenance without "
            "scalar overwrite, destructive deletion, or latest-wins collapse."
        ),
        targeted_axes=(AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING,),
        claim_ids=("GO-A5-C1",),
        evidence_level=EvidenceLevel.CONFIRMATORY,
        hypothesis=(
            "With the same conflicting CE pair and possibility set, contextual production "
            "selects the provenance-compatible CE while retaining the opposing CE as NO; "
            "erasing order, permuting relation provenance, or collapsing to latest-only "
            "causally changes the conflict resolution on the preregistered relevant subsets."
        ),
        null_or_falsification=(
            "A valid execution does not support A5 if production deletes/overwrites either CE, "
            "cannot preserve NO provenance, uses a scalar/latest-wins shortcut, or the declared "
            "order/relation ablations do not causally alter the corresponding conflict subset."
        ),
        temporal_order=tuple(MANDATORY_TEMPORAL_ORDER),
        observables=observables,
        contrasts=(
            CausalContrast(
                contrast_id="A5-ORDER",
                treatment="provenance-preserving contextual conflict resolution",
                control="ORDER_ERASED conflict control",
                targeted_mechanism="conflict order provenance",
                held_constant=held+("same relation provenance",),
                observable_ids=observables,
                falsification_condition="erasing order does not alter any preregistered order-sensitive conflict case",
            ),
            CausalContrast(
                contrast_id="A5-RELATION",
                treatment="provenance-preserving contextual conflict resolution",
                control="RELATION_PROVENANCE_PERMUTED conflict control",
                targeted_mechanism="conflict relation provenance",
                held_constant=held+("same order provenance",),
                observable_ids=observables,
                falsification_condition="permuting relation provenance does not alter any preregistered relation-sensitive conflict case",
            ),
            CausalContrast(
                contrast_id="A5-LATEST",
                treatment="provenance-preserving contextual conflict resolution",
                control="LATEST_ONLY conflict ablation",
                targeted_mechanism="conflict contextual resolution versus latest-only collapse",
                held_constant=held,
                observable_ids=observables,
                falsification_condition="latest-only is indistinguishable from contextual production on all cases that target the older CE",
            ),
        ),
        independent_evaluator=True,
        evaluator_blinded_to=("future outcome","expected label/truth","arm identity until worker output sealed"),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=False,
        decision_worker_forbidden_inputs=("future outcome","expected evaluator label","evaluator truth"),
        provenance_chain=(
            "COMPLETED_EXPERIENCE pair",
            "PARTICIPATION YES/NO for each CE",
            "DECISION",
            "SINGLE_REALIZATION",
            "OUTCOME observation",
        ),
        replication_plan=(
            "Three frozen confirmatory families; each contains two relation-sensitive and two "
            "order-sensitive conflict cases. Four arms yield 48 decision-realization units. "
            "A disjoint P-family pilot is structural only."
        ),
        claim_boundary=(
            "Finite deterministic synthetic conflict-handling mechanism.",
            "No claim of universal safety, optimal conflict policy, or real-world superiority.",
            "Both original CE records remain unchanged and inspectable in every arm.",
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
        relation_context_controls=("RELATION_DISCRIMINATIVE","ORDER_DISCRIMINATIVE"),
        participation_yes_no_provenance=True,
        conflicting_experience_count=2,
        conflict_operational_definition=conflict_definition,
        conflict_order_preserved=True,
        no_scalar_conflict_overwrite=True,
        metadata={"pilot_units":16,"confirmatory_units":48},
    )
