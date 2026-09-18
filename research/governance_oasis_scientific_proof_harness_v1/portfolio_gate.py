from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from .models import (
    AxisId,
    ClaimOutcome,
    EvidenceLevel,
    EvidenceRecord,
    PortfolioReport,
)
from .registry import AXIS_CONTRACTS


def _is_empirical(record: EvidenceRecord) -> bool:
    return (
        record.level is not EvidenceLevel.DESIGN_ONLY
        and record.result_status not in {"NOT_STARTED", "NOT_EXECUTED"}
        and record.claim_outcome is not ClaimOutcome.UNTESTED
    )


def _qualifies_for_axis(record: EvidenceRecord, axis: AxisId) -> bool:
    required = set(AXIS_CONTRACTS[axis].mandatory_obligations)
    return (
        record.counts_toward_axis_proof
        and record.design_report_passed
        and record.result_status == "COMPLETE"
        and record.level is EvidenceLevel.CONFIRMATORY
        and record.claim_outcome
        in {
            ClaimOutcome.SUPPORTS,
            ClaimOutcome.DOES_NOT_SUPPORT,
            ClaimOutcome.INCONCLUSIVE,
        }
        and required.issubset(set(record.verified_obligations))
        and bool(record.review_method.strip())
        and bool(record.result_rule_ref.strip())
    )


def audit_portfolio(
    *,
    program_id: str,
    evidence: Iterable[EvidenceRecord],
) -> PortfolioReport:
    records = tuple(evidence)
    by_axis: dict[AxisId, list[EvidenceRecord]] = defaultdict(list)
    for record in records:
        for axis in record.axes:
            by_axis[axis].append(record)

    axis_coverage: dict[str, tuple[str, ...]] = {}
    missing: list[str] = []
    weak: list[str] = []
    unsupported: list[str] = []
    inconclusive: list[str] = []
    supported: list[str] = []

    for axis in AxisId:
        axis_records = by_axis.get(axis, [])
        axis_coverage[axis.value] = tuple(item.evidence_id for item in axis_records)
        empirical_records = [item for item in axis_records if _is_empirical(item)]
        if not empirical_records:
            missing.append(axis.value)
            continue

        qualifying = [
            item for item in empirical_records if _qualifies_for_axis(item, axis)
        ]
        if not qualifying:
            weak.append(axis.value)
            continue

        outcomes = {item.claim_outcome for item in qualifying}
        if (
            ClaimOutcome.SUPPORTS in outcomes
            and ClaimOutcome.DOES_NOT_SUPPORT not in outcomes
        ):
            supported.append(axis.value)
        elif (
            ClaimOutcome.SUPPORTS in outcomes
            and ClaimOutcome.DOES_NOT_SUPPORT in outcomes
        ):
            inconclusive.append(axis.value)
        elif ClaimOutcome.DOES_NOT_SUPPORT in outcomes:
            unsupported.append(axis.value)
        else:
            inconclusive.append(axis.value)

    integrated_eligible = [
        item
        for item in records
        if item.counts_toward_axis_proof
        and item.design_report_passed
        and item.result_status == "COMPLETE"
        and item.level is EvidenceLevel.INTEGRATED_CONFIRMATORY
        and set(item.axes) == set(AxisId)
        and item.claim_outcome
        in {
            ClaimOutcome.SUPPORTS,
            ClaimOutcome.DOES_NOT_SUPPORT,
            ClaimOutcome.INCONCLUSIVE,
        }
        and bool(item.review_method.strip())
        and bool(item.result_rule_ref.strip())
        and all(
            set(AXIS_CONTRACTS[axis].mandatory_obligations).issubset(
                set(item.verified_obligations)
            )
            for axis in AxisId
        )
    ]
    integration_evidence_ids = tuple(item.evidence_id for item in integrated_eligible)
    integration_outcomes = {item.claim_outcome for item in integrated_eligible}
    integration_supported = (
        ClaimOutcome.SUPPORTS in integration_outcomes
        and ClaimOutcome.DOES_NOT_SUPPORT not in integration_outcomes
    )

    supported_set = set(supported)
    next_required_axis = next(
        (axis.value for axis in AxisId if axis.value not in supported_set),
        None,
    )

    blockers: list[str] = []
    if missing:
        blockers.append("missing_axis_evidence:" + ",".join(missing))
    if weak:
        blockers.append(
            "axis_evidence_not_confirmatory_or_not_design-qualified:"
            + ",".join(weak)
        )
    if unsupported:
        blockers.append("axis_claim_not_supported:" + ",".join(unsupported))
    if inconclusive:
        blockers.append("axis_claim_inconclusive:" + ",".join(inconclusive))
    if not integration_evidence_ids:
        blockers.append("missing_flow_preserving_integrated_confirmatory_evidence")
    elif not integration_supported:
        blockers.append("integrated_claim_not_supported_or_inconclusive")

    proof_complete = (
        len(supported) == len(AxisId)
        and integration_supported
        and not unsupported
        and not inconclusive
        and not missing
        and not weak
    )

    return PortfolioReport(
        program_id=program_id,
        axis_coverage=axis_coverage,
        missing_axes=tuple(missing),
        weak_axes=tuple(weak),
        unsupported_axes=tuple(unsupported),
        inconclusive_axes=tuple(inconclusive),
        supported_axes=tuple(supported),
        next_required_axis=next_required_axis,
        integration_evidence_ids=integration_evidence_ids,
        integration_supported=integration_supported,
        proof_complete=proof_complete,
        blockers=tuple(blockers),
    )
