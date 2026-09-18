from __future__ import annotations

from research.governance_oasis_scientific_proof_harness_v1.models import (
    AxisId, CausalContrast, EvidenceLevel, ExperimentDesign,
)
from research.governance_oasis_scientific_proof_harness_v1.registry import (
    MANDATORY_EXECUTION_CHECK_IDS, MANDATORY_TEMPORAL_ORDER,
)

EXPERIMENT_ID = "GO_A4_SCOPE_LOCALITY_V1"
EXECUTION_PROFILE_ID = "GO_A4_SCOPE_LOCALITY_EXECUTION_V1"
A4_CHECKS = (
    "context_matrix_complete",
    "scope_guard_isolation",
    "unrelated_base_eligibility",
    "no_global_exclusion_endpoint",
    "participation_provenance",
    "selected_realized_single",
)

def build_design() -> ExperimentDesign:
    observables = (
        "later participation YES/NO",
        "participation provenance",
        "feedback visibility by context",
        "selected possibility",
        "realized possibility",
        "global exclusion incidence",
        "archive preservation",
    )
    held = (
        "same current observation within each matched context",
        "same Core and possibility set",
        "same responsibility rule",
        "same committed feedback provenance",
        "same evaluator",
    )
    return ExperimentDesign(
        experiment_id=EXPERIMENT_ID,
        execution_profile_id=EXECUTION_PROFILE_ID,
        required_execution_check_ids=tuple(MANDATORY_EXECUTION_CHECK_IDS) + A4_CHECKS,
        purpose=(
            "Test whether prior provenance-bound REVISED feedback remains local to its "
            "relation/scope instead of becoming a global exclusion."
        ),
        targeted_axes=(AxisId.A4_OVERGENERALIZATION_PREVENTION,),
        claim_ids=("GO-A4-C1",),
        evidence_level=EvidenceLevel.CONFIRMATORY,
        hypothesis=(
            "Scope-local production feedback changes the matched SAME_SCOPE recurrence "
            "but does not suppress otherwise-eligible CHANGED_SCOPE or UNRELATED_RELATION "
            "recurrences; removing the scope/relation guard causes inappropriate global suppression."
        ),
        null_or_falsification=(
            "A valid run does not support A4 if production suppresses an otherwise-eligible "
            "changed/unrelated recurrence, fails to preserve legitimate same-scope influence, "
            "or cannot be distinguished from the guard-ablated control."
        ),
        temporal_order=tuple(MANDATORY_TEMPORAL_ORDER),
        observables=observables,
        contrasts=(
            CausalContrast(
                contrast_id="A4-SCOPE-GUARD",
                treatment="scope-local production relation/scope guard",
                control="scope guard ablated so prior REVISED feedback is globally applied",
                targeted_mechanism="scope and relation locality guard",
                held_constant=held,
                observable_ids=observables,
                falsification_condition=(
                    "production and guard-ablated arms cannot be distinguished on changed "
                    "or unrelated contexts while base eligibility is preserved"
                ),
            ),
            CausalContrast(
                contrast_id="A4-RECORD-ONLY",
                treatment="scope-local production feedback exposed",
                control="record_only feedback stored with identical provenance but hidden from later participation",
                targeted_mechanism="participation effect of scoped feedback exposure",
                held_constant=held,
                observable_ids=observables,
                falsification_condition=(
                    "same-scope production does not differ from record-only or changed/unrelated "
                    "production differs from record-only despite base eligibility"
                ),
            ),
        ),
        independent_evaluator=True,
        evaluator_blinded_to=("future outcome", "expected label/truth", "arm identity until worker output sealed"),
        evaluator_truth_joined_after_worker_sealed=True,
        authoritative_outcome_observation=True,
        decision_worker_forbidden_inputs=("future outcome", "expected evaluator label", "evaluator truth"),
        provenance_chain=(
            "COMPLETED_EXPERIENCE provenance",
            "PARTICIPATION YES/NO",
            "DECISION",
            "SINGLE_REALIZATION",
            "OUTCOME observation",
        ),
        replication_plan=(
            "Three frozen observation families x SAME_SCOPE/CHANGED_SCOPE/UNRELATED_RELATION "
            "x three arms; 27 decision-realization units."
        ),
        claim_boundary=(
            "Finite deterministic synthetic scope-locality contract.",
            "Tests contextual locality, not universal safety or performance superiority.",
            "REVISED remains contextual evidence, not deletion or permanent memory weight.",
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
        no_global_exclusion_control=True,
        participation_yes_no_provenance=True,
        metadata={"frozen_matrix_units":27},
    )
