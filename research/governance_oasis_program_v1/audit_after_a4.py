from __future__ import annotations

import hashlib
import json
from pathlib import Path

from research.governance_oasis_scientific_proof_harness_v1.io import load_evidence_registry
from research.governance_oasis_scientific_proof_harness_v1.portfolio_gate import audit_portfolio

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REGISTRY=HERE/"PROGRAM_EVIDENCE_REGISTRY_AFTER_A4.json"

EXPECTED={
  "research/governance_oasis_a4_scope_locality_v1/design_spec.py":"41c4de92df59b6cc3c2dee7e67c483f752b501cb",
  "research/governance_oasis_a4_scope_locality_v1/CONFIRMATORY_PLAN.json":"8f3771422dfed68033f0d3c13028c5b07ee36ab9",
  "research/governance_oasis_a4_scope_locality_v1/validation/confirmatory_35388101677/VALIDATION_RECORD.json":"91a2e1a5d5097658011ad6fa9a7de5f7ecbfa414",
}

def blob_sha(path:Path)->str:
    data=path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}".encode("ascii")+bytes([0])+data).hexdigest()

def main()->None:
    blob_errors=[]
    for rel,expected in EXPECTED.items():
        actual=blob_sha(ROOT/rel)
        if actual!=expected:
            blob_errors.append(f"{rel}:{actual}!={expected}")

    program_id,evidence=load_evidence_registry(REGISTRY)
    report=audit_portfolio(program_id=program_id,evidence=evidence)
    supported=set(report.supported_axes)
    required={
        "A1_BEHAVIOR_CHANGE_EFFECTIVENESS",
        "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY",
        "A3_RESPONSIBILITY_SENSITIVITY",
        "A4_OVERGENERALIZATION_PREVENTION",
    }
    ready=required.issubset(supported) and report.next_required_axis=="A5_CONFLICTING_EXPERIENCE_HANDLING"
    payload={
        "schema":"governance-oasis-a4-sequence-closure-audit-v1",
        "source_blob_integrity":not blob_errors,
        "source_blob_errors":blob_errors,
        "supported_axes":list(report.supported_axes),
        "a4_claim_outcome":"SUPPORTS" if "A4_OVERGENERALIZATION_PREVENTION" in supported else "NOT_CLOSED",
        "next_required_axis":report.next_required_axis,
        "sequence_ready_for_a5":ready and not blob_errors,
        "proof_complete":report.proof_complete,
        "portfolio_blockers":list(report.blockers),
    }
    print(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True))
    if blob_errors or not ready:
        raise SystemExit(2)

if __name__=="__main__":
    main()
