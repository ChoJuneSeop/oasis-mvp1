from __future__ import annotations

import hashlib
import json
from pathlib import Path

from research.governance_oasis_scientific_proof_harness_v1.io import load_evidence_registry
from research.governance_oasis_scientific_proof_harness_v1.portfolio_gate import audit_portfolio

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REGISTRY=HERE/"PROGRAM_EVIDENCE_REGISTRY_AFTER_A6.json"

EXPECTED={
  "research/governance_oasis_a6_wrong_change_recovery_v1/design_spec.py":"6c61f5c5afe139baafdf7aa2ddc1069fea315cfe",
  "research/governance_oasis_a6_wrong_change_recovery_v1/CONFIRMATORY_PLAN.json":"956d82184ab1056d63d6794866af9a88ad969bb0",
  "research/governance_oasis_a6_wrong_change_recovery_v1/validation/confirmatory_35390180217/VALIDATION_RECORD.json":"1483042dbf709b891c5bd5a8a5c13685513fb1f6",
}

def blob_sha(path:Path)->str:
    data=path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}".encode("ascii")+bytes([0])+data).hexdigest()

def main()->None:
    errors=[]
    for rel,expected in EXPECTED.items():
        actual=blob_sha(ROOT/rel)
        if actual!=expected:
            errors.append(f"{rel}:{actual}!={expected}")

    program_id,evidence=load_evidence_registry(REGISTRY)
    report=audit_portfolio(program_id=program_id,evidence=evidence)
    supported=set(report.supported_axes)
    required={
        "A1_BEHAVIOR_CHANGE_EFFECTIVENESS",
        "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY",
        "A3_RESPONSIBILITY_SENSITIVITY",
        "A4_OVERGENERALIZATION_PREVENTION",
        "A5_CONFLICTING_EXPERIENCE_HANDLING",
        "A6_WRONG_BEHAVIOR_RECOVERY",
    }
    all_axes_supported=required.issubset(supported)
    integration_only_remaining=(
        all_axes_supported
        and report.next_required_axis is None
        and not report.proof_complete
        and "missing_flow_preserving_integrated_confirmatory_evidence" in set(report.blockers)
        and not report.missing_axes
        and not report.weak_axes
        and not report.unsupported_axes
        and not report.inconclusive_axes
    )
    payload={
        "schema":"governance-oasis-a6-sequence-closure-audit-v1",
        "source_blob_integrity":not errors,
        "source_blob_errors":errors,
        "supported_axes":list(report.supported_axes),
        "a6_claim_outcome":"SUPPORTS" if "A6_WRONG_BEHAVIOR_RECOVERY" in supported else "NOT_CLOSED",
        "all_six_axes_supported":all_axes_supported,
        "next_required_axis":report.next_required_axis,
        "integration_supported":report.integration_supported,
        "integration_only_remaining":integration_only_remaining,
        "proof_complete":report.proof_complete,
        "portfolio_blockers":list(report.blockers),
    }
    print(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True))
    if errors or not integration_only_remaining:
        raise SystemExit(2)

if __name__=="__main__":
    main()
