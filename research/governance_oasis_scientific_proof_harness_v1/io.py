from __future__ import annotations

import json
from pathlib import Path

from .models import AxisId, ClaimOutcome, EvidenceLevel, EvidenceRecord


def load_evidence_registry(path: Path) -> tuple[str, tuple[EvidenceRecord, ...]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records = []
    for raw in data.get("records", ()):
        records.append(
            EvidenceRecord(
                evidence_id=str(raw["evidence_id"]),
                experiment_id=str(raw["experiment_id"]),
                axes=tuple(AxisId(x) for x in raw.get("axes", ())),
                level=EvidenceLevel(raw["level"]),
                design_report_passed=bool(raw["design_report_passed"]),
                result_status=str(raw["result_status"]),
                source_refs=tuple(str(x) for x in raw.get("source_refs", ())),
                claim_boundary=tuple(str(x) for x in raw.get("claim_boundary", ())),
                counts_toward_axis_proof=bool(raw["counts_toward_axis_proof"]),
                claim_outcome=ClaimOutcome(raw["claim_outcome"]),
                verified_obligations=tuple(
                    str(x) for x in raw.get("verified_obligations", ())
                ),
                review_method=str(raw.get("review_method", "")),
                result_rule_ref=str(raw.get("result_rule_ref", "")),
                notes=tuple(str(x) for x in raw.get("notes", ())),
            )
        )
    return str(data["program_id"]), tuple(records)
