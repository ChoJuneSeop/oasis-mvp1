from __future__ import annotations

import hashlib
import json
from pathlib import Path

from research.governance_oasis_scientific_proof_harness_v1.io import load_evidence_registry
from research.governance_oasis_scientific_proof_harness_v1.portfolio_gate import audit_portfolio


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REGISTRY = HERE / "PROGRAM_EVIDENCE_REGISTRY_AFTER_A2.json"

EXPECTED_BLOBS = {
    "research/governance_oasis_scientific_proof_harness_v1/PROGRAM_EVIDENCE_REGISTRY.json":
        "189b9b1e578f8a9da6a642b17cc1d011c0d3b084",
    "research/governance_harness_gh2/README.md":
        "b031326a56daa4c00b5260e6ee68217e828d8b6f",
    "research/governance_harness_gh2/results/GH2_V1_1_CONFIRMATORY_INTERPRETATION.md":
        "a7e54c3c72545dbe7ac6600d2c57295e41e77580",
    "research/governance_oasis_a2_traceability_v1/design_spec.py":
        "416e3e56aae2611501d15adb44ae36569d838a50",
    "research/governance_oasis_a2_traceability_v1/CONFIRMATORY_PLAN.json":
        "37fef7614caad2dfb34a55266d828d348b647c4d",
    "research/governance_oasis_a2_traceability_v1/validation/confirmatory_35385728934/VALIDATION_RECORD.json":
        "ffd4e35d0ec75893afca84dc672bd3e6b425a27d",
}


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}".encode("ascii") + bytes([0])
    return hashlib.sha1(header + data).hexdigest()


def main() -> None:
    blob_errors = []
    for rel, expected in EXPECTED_BLOBS.items():
        actual = git_blob_sha(ROOT / rel)
        if actual != expected:
            blob_errors.append(f"{rel}:{actual}!={expected}")

    program_id, evidence = load_evidence_registry(REGISTRY)
    report = audit_portfolio(program_id=program_id, evidence=evidence)

    expected_supported = {
        "A1_BEHAVIOR_CHANGE_EFFECTIVENESS",
        "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY",
        "A3_RESPONSIBILITY_SENSITIVITY",
    }
    supported = set(report.supported_axes)
    sequence_ok = expected_supported.issubset(supported) and report.next_required_axis == "A4_OVERGENERALIZATION_PREVENTION"

    payload = {
        "schema": "governance-oasis-a3-sequence-closure-audit-v1",
        "frozen_registry_unchanged": not any(
            x.startswith("research/governance_oasis_scientific_proof_harness_v1/PROGRAM_EVIDENCE_REGISTRY.json:")
            for x in blob_errors
        ),
        "source_blob_integrity": not blob_errors,
        "source_blob_errors": blob_errors,
        "supported_axes": list(report.supported_axes),
        "next_required_axis": report.next_required_axis,
        "a3_existing_evidence_id": "E-GH2-A3",
        "a3_claim_outcome": "SUPPORTS" if "A3_RESPONSIBILITY_SENSITIVITY" in supported else "NOT_CLOSED",
        "a3_new_confirmatory_run_required": False,
        "sequence_ready_for_a4": sequence_ok and not blob_errors,
        "proof_complete": report.proof_complete,
        "portfolio_blockers": list(report.blockers),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    if blob_errors or not sequence_ok:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
