from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from .models import AxisId, EvidenceLevel, EvidenceRecord, PortfolioReport
from .registry import AXIS_CONTRACTS


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
    missing = []
    weak = []

    for axis in AxisId:
        axis_records = by_axis.get(axis, [])
        axis_coverage[axis.value] = tuple(item.evidence_id for item in axis_records)
        empirical_records = [
            item
            for item in axis_records
            if item.level is not EvidenceLevel.DESIGN_ONLY
            and item.result_status not in {"NOT_STARTED", "NOT_EXECUTED"}
        ]
        if not empirical_records:
            missing.append(axis.value)
            continue

        required_obligations = set(AXIS_CONTRACTS[axis].mandatory_obligations)
        qualifying = [
            item
            for item in empirical_records
            if item.counts_toward_axis_proof
            and item.design_report_passed
            and item.result_status == "COMPLETE"
            and item.level is EvidenceLevel.CONFIRMATORY
            and required_obligations.issubset(set(item.verified_obligations))
            and bool(item.review_method.strip())
        ]
        if not qualifying:
            weak.append(axis.value)

    integrated = tuple(
        item.evidence_id
        for item in records
        if item.counts_toward_axis_proof
        and item.design_report_passed
        and item.result_status == "COMPLETE"
        and item.level is EvidenceLevel.INTEGRATED_CONFIRMATORY
        and set(item.axes) == set(AxisId)
        and bool(item.review_method.strip())
        and all(
            set(AXIS_CONTRACTS[axis].mandatory_obligations).issubset(
                set(item.verified_obligations)
            )
            for axis in AxisId
        )
    )

    blockers = []
    if missing:
        blockers.append("missing_axis_evidence:" + ",".join(missing))
    if weak:
        blockers.append("axis_evidence_not_confirmatory_or_not_design-qualified:" + ",".join(weak))
    if not integrated:
        blockers.append("missing_flow_preserving_integrated_confirmatory_evidence")

    proof_complete = not blockers
    return PortfolioReport(
        program_id=program_id,
        axis_coverage=axis_coverage,
        missing_axes=tuple(missing),
        weak_axes=tuple(weak),
        integration_evidence_ids=integrated,
        proof_complete=proof_complete,
        blockers=tuple(blockers),
    )
