from __future__ import annotations

from research.oasis_experiment_freeze_harness_v1.models import CheckStatus, GateReport

from .models import ProofDesignReport, ThreeLensReviewReport


DEFINITION_CHECKS = {
    "crosscut_claim_alignment",
    "crosscut_execution_contract_declared",
    "crosscut_falsifiability",
    "crosscut_preregistration_boundary",
    "crosscut_history_integrity",
    "crosscut_provenance_continuity",
    "crosscut_scientific_evidence_level",
}

CAUSAL_CHECKS = {
    "crosscut_causal_contrast_integrity",
    "crosscut_temporal_causality",
    "crosscut_evaluator_independence",
    "crosscut_outcome_evidence_boundary",
}


def three_lens_review(
    *,
    proof_report: ProofDesignReport,
    execution_report: GateReport,
) -> ThreeLensReviewReport:
    by_id = {item.check_id: item for item in proof_report.checks}

    definition_blockers = [
        check_id
        for check_id in DEFINITION_CHECKS
        if check_id not in by_id or by_id[check_id].status.value != "PASS"
    ]

    causal_blockers = [
        check_id
        for check_id in CAUSAL_CHECKS
        if check_id not in by_id or by_id[check_id].status.value != "PASS"
    ]
    causal_blockers.extend(
        item.check_id
        for item in proof_report.checks
        if item.check_id.startswith("axis_") and item.status.value != "PASS"
    )

    execution_blockers = list(execution_report.unresolved_check_ids)
    declared_execution_checks = set(execution_report.required_check_ids)
    missing_scientific_execution_checks = sorted(
        set(proof_report.required_execution_check_ids) - declared_execution_checks
    )
    if missing_scientific_execution_checks:
        execution_blockers.append(
            "execution_profile_missing_required_checks:"
            + ",".join(missing_scientific_execution_checks)
        )

    check_counts: dict[str, int] = {}
    check_status: dict[str, CheckStatus] = {}
    for item in execution_report.checks:
        check_counts[item.check_id] = check_counts.get(item.check_id, 0) + 1
        if check_counts[item.check_id] == 1:
            check_status[item.check_id] = item.status

    missing_concrete_results = sorted(
        check_id
        for check_id in proof_report.required_execution_check_ids
        if check_counts.get(check_id, 0) != 1
    )
    if missing_concrete_results:
        execution_blockers.append(
            "execution_profile_missing_concrete_pass_results:"
            + ",".join(missing_concrete_results)
        )

    nonpassing_concrete_results = sorted(
        check_id
        for check_id in proof_report.required_execution_check_ids
        if check_counts.get(check_id, 0) == 1
        and check_status.get(check_id) is not CheckStatus.PASS
    )
    if nonpassing_concrete_results:
        execution_blockers.append(
            "execution_profile_nonpassing_required_results:"
            + ",".join(nonpassing_concrete_results)
        )
    if proof_report.execution_profile_id != execution_report.profile_id:
        execution_blockers.append(
            "execution_profile_mismatch:"
            + proof_report.execution_profile_id
            + "!="
            + execution_report.profile_id
        )
    execution_blockers.extend(execution_report.missing_check_ids)
    execution_blockers.extend(execution_report.duplicate_check_ids)
    if not execution_report.freeze_ready and not execution_blockers:
        execution_blockers.append("execution_freeze_report_not_ready")

    definition_pass = not definition_blockers
    causal_pass = not causal_blockers
    execution_pass = execution_report.freeze_ready and not execution_blockers

    return ThreeLensReviewReport(
        experiment_id=proof_report.experiment_id,
        definition_pass=definition_pass,
        causal_pass=causal_pass,
        execution_pass=execution_pass,
        all_three_pass=definition_pass and causal_pass and execution_pass,
        definition_blockers=tuple(sorted(set(definition_blockers))),
        causal_blockers=tuple(sorted(set(causal_blockers))),
        execution_blockers=tuple(sorted(set(execution_blockers))),
    )
