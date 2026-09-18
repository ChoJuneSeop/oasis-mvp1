from __future__ import annotations

from collections import Counter
from typing import Iterable

from .models import (
    AxisId,
    DesignCheck,
    DesignStatus,
    EvidenceLevel,
    ExperimentDesign,
    ProofDesignReport,
)
from .registry import CLAIM_AXIS_MAP, MANDATORY_TEMPORAL_ORDER


def _pass(check_id: str, summary: str, *, axis: AxisId | None = None, evidence=()):
    return DesignCheck(check_id, DesignStatus.PASS, summary, axis, tuple(evidence), True)


def _fail(check_id: str, summary: str, *, axis: AxisId | None = None, evidence=()):
    return DesignCheck(check_id, DesignStatus.FAIL, summary, axis, tuple(evidence), True)


def _blocked(check_id: str, summary: str, *, axis: AxisId | None = None, evidence=()):
    return DesignCheck(check_id, DesignStatus.BLOCKED, summary, axis, tuple(evidence), True)


def _subsequence(required: tuple[str, ...], actual: tuple[str, ...]) -> bool:
    it = iter(actual)
    for needle in required:
        for value in it:
            if value == needle:
                break
        else:
            return False
    return True


def _matching_contrast_ids(
    design: ExperimentDesign,
    *keywords: str,
) -> tuple[str, ...]:
    wanted = tuple(item.lower() for item in keywords if item)
    matched = []
    for contrast in design.contrasts:
        haystack = " ".join(
            (
                contrast.targeted_mechanism,
                contrast.treatment,
                contrast.control,
            )
        ).lower()
        if not wanted or any(keyword in haystack for keyword in wanted):
            if contrast.mechanism_removed_or_permuted:
                matched.append(contrast.contrast_id)
    return tuple(matched)


def _mechanism_contrast(design: ExperimentDesign, keyword: str | None = None) -> bool:
    if keyword is None:
        return bool(_matching_contrast_ids(design))
    return bool(_matching_contrast_ids(design, keyword))


def _contrast_integrity(design: ExperimentDesign) -> DesignCheck:
    bad = []
    ids = []
    for item in design.contrasts:
        ids.append(item.contrast_id)
        if not item.contrast_id.strip():
            bad.append("empty contrast_id")
        if not item.treatment.strip() or not item.control.strip():
            bad.append(f"{item.contrast_id}: treatment/control missing")
        if not item.targeted_mechanism.strip():
            bad.append(f"{item.contrast_id}: targeted_mechanism missing")
        if not item.held_constant:
            bad.append(f"{item.contrast_id}: held_constant empty")
        held_text = " ".join(item.held_constant).lower()
        if not ("current" in held_text or "observation" in held_text):
            bad.append(f"{item.contrast_id}: current context not explicitly held constant")
        if not ("core" in held_text or "possibility" in held_text):
            bad.append(f"{item.contrast_id}: Core/possibility path not explicitly held constant")
        if not item.observable_ids:
            bad.append(f"{item.contrast_id}: observable_ids empty")
        unknown_observables = sorted(set(item.observable_ids) - set(design.observables))
        if unknown_observables:
            bad.append(
                f"{item.contrast_id}: observable_ids not declared by design={unknown_observables}"
            )
        if not item.falsification_condition.strip():
            bad.append(f"{item.contrast_id}: falsification_condition missing")
    duplicates = sorted(k for k, n in Counter(ids).items() if n > 1)
    if duplicates:
        bad.append(f"duplicate contrast ids={duplicates}")
    return (
        _pass(
            "crosscut_causal_contrast_integrity",
            "Every causal contrast has a targeted mechanism, held constants, observables, and a falsification condition.",
        )
        if design.contrasts and not bad
        else _fail(
            "crosscut_causal_contrast_integrity",
            "Causal contrasts are incomplete or not uniquely specified.",
            evidence=tuple(bad) if bad else ("no causal contrast",),
        )
    )


def _falsifiability(design: ExperimentDesign) -> DesignCheck:
    missing = []
    if not design.purpose.strip():
        missing.append("purpose")
    if not design.hypothesis.strip():
        missing.append("hypothesis")
    if not design.null_or_falsification.strip():
        missing.append("null_or_falsification")
    if not design.observables:
        missing.append("observables")
    return (
        _pass(
            "crosscut_falsifiability",
            "Purpose, hypothesis, falsification condition, and observables are prespecified.",
        )
        if not missing
        else _fail(
            "crosscut_falsifiability",
            "The design cannot produce a scientific test because core falsifiability fields are missing.",
            evidence=(f"missing={missing}",),
        )
    )


def _claim_alignment(design: ExperimentDesign) -> DesignCheck:
    targeted = set(design.targeted_axes)
    errors = []
    if not design.claim_ids:
        errors.append("no claim_ids")
    for claim_id in design.claim_ids:
        if claim_id not in CLAIM_AXIS_MAP:
            errors.append(f"unknown claim_id={claim_id}")
            continue
        axis = CLAIM_AXIS_MAP[claim_id]
        if axis is not None and axis not in targeted:
            errors.append(f"{claim_id} maps to {axis.value} but axis is not targeted")
    if not targeted and not design.structural_only:
        errors.append("non-structural design targets no governance axis")
    return (
        _pass(
            "crosscut_claim_alignment",
            "Claim identifiers are registered and aligned with targeted governance axes.",
        )
        if not errors
        else _fail(
            "crosscut_claim_alignment",
            "The experiment purpose is not aligned to the Governance OASIS claim registry.",
            evidence=tuple(errors),
        )
    )


def _temporal_causality(design: ExperimentDesign) -> DesignCheck:
    ok = (
        design.future_leakage_guard
        and _subsequence(MANDATORY_TEMPORAL_ORDER, design.temporal_order)
    )
    return (
        _pass(
            "crosscut_temporal_causality",
            "Current flow precedes decision/realization/outcome/Closure/commit and only later flow can reuse the result.",
            evidence=("future_leakage_guard=True",),
        )
        if ok
        else _fail(
            "crosscut_temporal_causality",
            "Temporal causality is incomplete; reverse/same-epoch outcome influence is not ruled out.",
            evidence=(
                f"future_leakage_guard={design.future_leakage_guard}",
                f"temporal_order={list(design.temporal_order)}",
            ),
        )
    )


def _evaluator_independence(design: ExperimentDesign) -> DesignCheck:
    if design.evidence_level in {
        EvidenceLevel.CONFIRMATORY,
        EvidenceLevel.INTEGRATED_CONFIRMATORY,
    }:
        blind = {x.lower() for x in design.evaluator_blinded_to}
        required_blindness = (
            any("future" in x for x in blind)
            and any("expected" in x or "label" in x or "truth" in x for x in blind)
        )
        ok = (
            design.independent_evaluator
            and required_blindness
            and design.evaluator_truth_joined_after_worker_sealed
        )
    else:
        ok = design.independent_evaluator or design.structural_only
    return (
        _pass(
            "crosscut_evaluator_independence",
            "Evaluator truth is separated from decision-time inputs at the required evidence level.",
        )
        if ok
        else _fail(
            "crosscut_evaluator_independence",
            "Confirmatory inference lacks an independent, future/expected-truth-blinded evaluator boundary.",
            evidence=(
                f"independent_evaluator={design.independent_evaluator}",
                f"evaluator_blinded_to={list(design.evaluator_blinded_to)}",
                f"evaluator_truth_joined_after_worker_sealed={design.evaluator_truth_joined_after_worker_sealed}",
            ),
        )
    )


def _outcome_evidence_boundary(design: ExperimentDesign) -> DesignCheck:
    forbidden = {x.lower() for x in design.decision_worker_forbidden_inputs}
    future_hidden = any("future" in x for x in forbidden)
    expected_hidden = any(
        "expected" in x or "label" in x or "truth" in x for x in forbidden
    )
    evaluator_hidden = any(
        "evaluator" in x or "outcome" in x for x in forbidden
    )

    outcome_dependent = (
        AxisId.A6_WRONG_BEHAVIOR_RECOVERY in design.targeted_axes
        or bool(design.metadata.get("requires_authoritative_post_outcome"))
    )
    authoritative_ok = (
        design.authoritative_outcome_observation if outcome_dependent else True
    )
    ok = (
        future_hidden
        and expected_hidden
        and evaluator_hidden
        and authoritative_ok
    )
    return (
        _pass(
            "crosscut_outcome_evidence_boundary",
            (
                "Decision workers are blind to future/evaluator truth; "
                "authoritative post-realization observation is required whenever "
                "the targeted claim depends on outcome evidence."
            ),
        )
        if ok
        else _fail(
            "crosscut_outcome_evidence_boundary",
            (
                "The design could leak future/evaluator truth or use a supplied "
                "label where authoritative post-realization evidence is required."
            ),
            evidence=(
                f"outcome_dependent={outcome_dependent}",
                f"authoritative_outcome_observation={design.authoritative_outcome_observation}",
                f"decision_worker_forbidden_inputs={list(design.decision_worker_forbidden_inputs)}",
            ),
        )
    )


def _preregistration_and_boundary(design: ExperimentDesign) -> DesignCheck:
    confirmatory = design.evidence_level in {
        EvidenceLevel.CONFIRMATORY,
        EvidenceLevel.INTEGRATED_CONFIRMATORY,
    }
    freeze_plan_ok = (
        not confirmatory
        or (
            design.confirmatory_size_or_matrix_rule_pre_registered
            and design.pilot_confirmatory_disjoint
            and design.post_result_retuning_forbidden
        )
    )
    ok = (
        design.pre_registered
        and freeze_plan_ok
        and bool(design.replication_plan.strip())
        and bool(design.claim_boundary)
        and design.no_aggregate_winner_score
        and design.integrated_flow_baseline
    )
    return (
        _pass(
            "crosscut_preregistration_boundary",
            "Hypothesis, replication, claim boundary, no-winner-score rule, and integrated baseline are fixed before evidence.",
        )
        if ok
        else _fail(
            "crosscut_preregistration_boundary",
            "Pre-registration or interpretation boundary is incomplete.",
            evidence=(
                f"pre_registered={design.pre_registered}",
                f"confirmatory_size_or_matrix_rule_pre_registered={design.confirmatory_size_or_matrix_rule_pre_registered}",
                f"pilot_confirmatory_disjoint={design.pilot_confirmatory_disjoint}",
                f"post_result_retuning_forbidden={design.post_result_retuning_forbidden}",
                f"replication_plan_present={bool(design.replication_plan.strip())}",
                f"claim_boundary_present={bool(design.claim_boundary)}",
                f"no_aggregate_winner_score={design.no_aggregate_winner_score}",
                f"integrated_flow_baseline={design.integrated_flow_baseline}",
            ),
        )
    )


def _history_integrity(design: ExperimentDesign) -> DesignCheck:
    ok = (
        design.production_history_append_only
        and design.production_no_permanent_memory_weight
        and design.production_no_destructive_no
        and design.ablation_mutations_declared
    )
    return (
        _pass(
            "crosscut_history_integrity",
            (
                "Production Governance preserves append-only history, forbids "
                "permanent memory weights and destructive NO semantics, while "
                "all comparator mutations are explicitly declared."
            ),
        )
        if ok
        else _fail(
            "crosscut_history_integrity",
            "History semantics are not protected from destructive or undeclared mutation.",
            evidence=(
                f"production_history_append_only={design.production_history_append_only}",
                f"production_no_permanent_memory_weight={design.production_no_permanent_memory_weight}",
                f"production_no_destructive_no={design.production_no_destructive_no}",
                f"ablation_mutations_declared={design.ablation_mutations_declared}",
            ),
        )
    )


def _provenance_chain(design: ExperimentDesign) -> DesignCheck:
    chain = tuple(x.upper() for x in design.provenance_chain)
    required_tokens = ("COMPLETED_EXPERIENCE", "PARTICIPATION", "DECISION", "REALIZATION", "OUTCOME")
    present = tuple(token for token in required_tokens if any(token in x for x in chain))
    ok = len(present) == len(required_tokens)
    return (
        _pass(
            "crosscut_provenance_continuity",
            "The evidence plan preserves a CE→participation→decision→realization→outcome provenance chain.",
        )
        if ok
        else _fail(
            "crosscut_provenance_continuity",
            "The scientific trace cannot bind a later effect back to a specific governance path.",
            evidence=(f"present_tokens={list(present)}",),
        )
    )


def _axis_a1(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS
    held_current = any(
        any("current" in item.lower() or "observation" in item.lower() for item in contrast.held_constant)
        for contrast in design.contrasts
    )
    ok = (
        design.behavior_endpoint
        and design.effectiveness_endpoint
        and design.same_current_context_across_contrast
        and held_current
        and _mechanism_contrast(design)
    )
    return (
        _pass(
            "axis_a1_behavior_effectiveness",
            "Behavior/effectiveness has a mechanism-removal causal contrast under a held current context.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a1_behavior_effectiveness",
            "A1 cannot be supported by structural PASS alone; behavior, effectiveness, held-context, and mechanism-removal evidence are required.",
            axis=axis,
            evidence=(
                f"behavior_endpoint={design.behavior_endpoint}",
                f"effectiveness_endpoint={design.effectiveness_endpoint}",
                f"same_current_context_across_contrast={design.same_current_context_across_contrast}",
                f"held_current_context={held_current}",
                f"mechanism_contrast={_mechanism_contrast(design)}",
            ),
        )
    )


def _axis_a2(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY
    identity_ids = set(_matching_contrast_ids(design, "identity"))
    relation_order_ids = set(
        _matching_contrast_ids(design, "order", "relation")
    )
    distinct_contrasts = bool(
        identity_ids
        and relation_order_ids
        and any(a != b for a in identity_ids for b in relation_order_ids)
    )
    ok = (
        design.experience_identity_control
        and design.relation_order_ablation
        and design.participation_yes_no_provenance
        and distinct_contrasts
        and len(design.provenance_chain) >= 5
    )
    return (
        _pass(
            "axis_a2_experience_traceability",
            "Specific experience identity plus relation/order contribution is causally isolated with end-to-end provenance.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a2_experience_traceability",
            "A2 requires more than a generic memory effect: identity and relation/order contribution must both be isolated.",
            axis=axis,
            evidence=(
                f"experience_identity_control={design.experience_identity_control}",
                f"relation_order_ablation={design.relation_order_ablation}",
                f"participation_yes_no_provenance={design.participation_yes_no_provenance}",
                f"identity_contrast_ids={sorted(identity_ids)}",
                f"relation_order_contrast_ids={sorted(relation_order_ids)}",
                f"distinct_contrasts={distinct_contrasts}",
                f"provenance_length={len(design.provenance_chain)}",
            ),
        )
    )


def _axis_a3(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A3_RESPONSIBILITY_SENSITIVITY
    controls = {x.upper() for x in design.responsibility_controls}
    content_control_names = {"PERMUTED", "STALE", "AXIS_ABLATION"}
    content_control = bool(controls.intersection(content_control_names))
    binding_ids = set(_matching_contrast_ids(design, "record_only", "binding"))
    content_ids = set(
        _matching_contrast_ids(
            design,
            "permuted",
            "stale",
            "axis_ablation",
            "candidate identity",
        )
    )
    distinct_responsibility_contrasts = bool(
        binding_ids
        and content_ids
        and any(a != b for a in binding_ids for b in content_ids)
    )
    ok = (
        "RECORD_ONLY" in controls
        and content_control
        and distinct_responsibility_contrasts
        and design.responsibility_non_scalar
        and design.selected_nonselected_obligations
    )
    return (
        _pass(
            "axis_a3_responsibility_sensitivity",
            "Responsibility is tested as a non-scalar causal binding against record-only and content/staleness controls.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a3_responsibility_sensitivity",
            "A3 requires causal responsibility controls, not responsibility telemetry alone.",
            axis=axis,
            evidence=(
                f"responsibility_controls={sorted(controls)}",
                f"responsibility_non_scalar={design.responsibility_non_scalar}",
                f"selected_nonselected_obligations={design.selected_nonselected_obligations}",
                f"binding_contrast_ids={sorted(binding_ids)}",
                f"content_contrast_ids={sorted(content_ids)}",
                f"distinct_responsibility_contrasts={distinct_responsibility_contrasts}",
            ),
        )
    )


def _axis_a4(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A4_OVERGENERALIZATION_PREVENTION
    contexts = {x.upper() for x in design.relation_context_controls}
    required = {"SAME_SCOPE", "CHANGED_SCOPE", "UNRELATED_RELATION"}
    scope_contrast = (
        _mechanism_contrast(design, "scope")
        or _mechanism_contrast(design, "relation")
        or _mechanism_contrast(design, "participation")
    )
    ok = (
        required.issubset(contexts)
        and design.no_global_exclusion_control
        and design.participation_yes_no_provenance
        and scope_contrast
    )
    return (
        _pass(
            "axis_a4_overgeneralization",
            "Same/changed/unrelated relation controls test relation-local influence and forbid global exclusion.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a4_overgeneralization",
            "A4 requires all three relation-context controls and an explicit no-global-exclusion endpoint.",
            axis=axis,
            evidence=(
                f"contexts={sorted(contexts)}",
                f"no_global_exclusion_control={design.no_global_exclusion_control}",
                f"participation_yes_no_provenance={design.participation_yes_no_provenance}",
                f"scope_contrast={scope_contrast}",
            ),
        )
    )


def _axis_a5(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING
    conflict_defined = bool(design.conflict_operational_definition.strip())
    context_variation = len(set(design.relation_context_controls)) >= 2
    ok = (
        design.conflicting_experience_count >= 2
        and conflict_defined
        and design.conflict_order_preserved
        and design.no_scalar_conflict_overwrite
        and design.participation_yes_no_provenance
        and context_variation
        and _mechanism_contrast(design, "conflict")
    )
    return (
        _pass(
            "axis_a5_conflicting_experience",
            "At least two conflicting Completed Experiences are preserved and causally tested without destructive/scalar overwrite.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a5_conflicting_experience",
            "A5 requires an actual conflict condition, preserved order/provenance, and a conflict-specific causal contrast.",
            axis=axis,
            evidence=(
                f"conflicting_experience_count={design.conflicting_experience_count}",
                f"conflict_operational_definition_present={conflict_defined}",
                f"conflict_order_preserved={design.conflict_order_preserved}",
                f"participation_yes_no_provenance={design.participation_yes_no_provenance}",
                f"conflict_context_variation={context_variation}",
                f"no_scalar_conflict_overwrite={design.no_scalar_conflict_overwrite}",
                f"conflict_contrast={_mechanism_contrast(design, 'conflict')}",
            ),
        )
    )


def _axis_a6(design: ExperimentDesign) -> DesignCheck:
    axis = AxisId.A6_WRONG_BEHAVIOR_RECOVERY
    contexts = {x.upper() for x in design.relation_context_controls}
    attributions = {x.upper() for x in design.attribution_controls}
    required_contexts = {"SAME_SCOPE", "UNRELATED_RELATION"}
    outcome_defined_after_realization = (
        design.wrongness_defined_only_post_outcome
        and bool(design.adverse_outcome_criterion.strip())
        and design.authoritative_outcome_observation
    )
    initial_effect_ids = set(
        _matching_contrast_ids(
            design,
            "experience",
            "participation",
            "history",
        )
    )
    recovery_ids = set(_matching_contrast_ids(design, "revalidation"))
    distinct_causal_links = bool(
        initial_effect_ids
        and recovery_ids
        and any(a != b for a in initial_effect_ids for b in recovery_ids)
    )
    ok = (
        design.wrong_change_realized
        and outcome_defined_after_realization
        and design.post_outcome_contradictory_evidence
        and design.recovery_epochs >= 3
        and design.recovery_endpoint
        and design.post_outcome_revalidation_control
        and design.participation_yes_no_provenance
        and "EXOGENOUS" in attributions
        and "DECISION_LINKED" in attributions
        and required_contexts.issubset(contexts)
        and distinct_causal_links
    )
    return (
        _pass(
            "axis_a6_wrong_behavior_recovery",
            "A realized wrong change is followed by contradictory real outcome evidence and a later recovery contrast.",
            axis=axis,
        )
        if ok
        else _fail(
            "axis_a6_wrong_behavior_recovery",
            "A6 is not merely revalidation visibility; it requires wrong behavior, later contradiction, and observed later recovery.",
            axis=axis,
            evidence=(
                f"wrong_change_realized={design.wrong_change_realized}",
                f"wrongness_defined_only_post_outcome={design.wrongness_defined_only_post_outcome}",
                f"adverse_outcome_criterion_present={bool(design.adverse_outcome_criterion.strip())}",
                f"authoritative_outcome_observation={design.authoritative_outcome_observation}",
                f"attribution_controls={sorted(attributions)}",
                f"relation_context_controls={sorted(contexts)}",
                f"post_outcome_contradictory_evidence={design.post_outcome_contradictory_evidence}",
                f"recovery_epochs={design.recovery_epochs}",
                f"recovery_endpoint={design.recovery_endpoint}",
                f"post_outcome_revalidation_control={design.post_outcome_revalidation_control}",
                f"participation_yes_no_provenance={design.participation_yes_no_provenance}",
                f"initial_effect_contrast_ids={sorted(initial_effect_ids)}",
                f"revalidation_contrast_ids={sorted(recovery_ids)}",
                f"distinct_causal_links={distinct_causal_links}",
            ),
        )
    )


AXIS_CHECKS = {
    AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS: _axis_a1,
    AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY: _axis_a2,
    AxisId.A3_RESPONSIBILITY_SENSITIVITY: _axis_a3,
    AxisId.A4_OVERGENERALIZATION_PREVENTION: _axis_a4,
    AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING: _axis_a5,
    AxisId.A6_WRONG_BEHAVIOR_RECOVERY: _axis_a6,
}


def validate_design(design: ExperimentDesign) -> ProofDesignReport:
    checks: list[DesignCheck] = [
        _claim_alignment(design),
        _falsifiability(design),
        _contrast_integrity(design),
        _temporal_causality(design),
        _evaluator_independence(design),
        _outcome_evidence_boundary(design),
        _preregistration_and_boundary(design),
        _history_integrity(design),
        _provenance_chain(design),
    ]

    if design.structural_only or design.evidence_level in {
        EvidenceLevel.STRUCTURAL_ONLY,
        EvidenceLevel.PILOT_ONLY,
    }:
        checks.append(
            _blocked(
                "crosscut_scientific_evidence_level",
                "Structural/Pilot execution is useful for admission but cannot count as Governance OASIS proof evidence.",
                evidence=(f"evidence_level={design.evidence_level.value}",),
            )
        )
    else:
        checks.append(
            _pass(
                "crosscut_scientific_evidence_level",
                "The design is eligible to produce scientific evidence if all causal gates pass.",
            )
        )

    for axis in design.targeted_axes:
        checks.append(AXIS_CHECKS[axis](design))

    unresolved = tuple(
        item.check_id
        for item in checks
        if item.blocking and item.status is not DesignStatus.PASS
    )
    return ProofDesignReport(
        experiment_id=design.experiment_id,
        execution_profile_id=design.execution_profile_id,
        checks=tuple(checks),
        targeted_axes=design.targeted_axes,
        proof_ready=not unresolved,
        unresolved_check_ids=unresolved,
    )
