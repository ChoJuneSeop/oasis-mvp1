from __future__ import annotations

import hashlib
import json
from pathlib import Path

from research.governance_oasis_scientific_proof_harness_v1.io import load_evidence_registry
from research.governance_oasis_scientific_proof_harness_v1.portfolio_gate import audit_portfolio

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REGISTRY=HERE/"PROGRAM_EVIDENCE_REGISTRY_AFTER_A5.json"

EXPECTED={
  "research/governance_oasis_a5_conflict_handling_v1/design_spec.py":"8f0166e308bd7da70c3ab04987a13bca87e62529",
  "research/governance_oasis_a5_conflict_handling_v1/CONFIRMATORY_PLAN.json":"af7557a05f6904badfa3a793af06cad517c3c604",
  "research/governance_oasis_a5_conflict_handling_v1/validation/confirmatory_35389172873/VALIDATION_RECORD.json":"e4ff1753bfab30b2e54ae122f883402ab2d5efad",
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
    }
    ready=required.issubset(supported) and report.next_required_axis=="A6_WRONG_BEHAVIOR_RECOVERY"
    payload={
        "schema":"governance-oasis-a5-sequence-closure-audit-v1",
        "source_blob_integrity":not errors,
        "source_blob_errors":errors,
        "supported_axes":list(report.supported_axes),
        "a5_claim_outcome":"SUPPORTS" if "A5_CONFLICTING_EXPERIENCE_HANDLING" in supported else "NOT_CLOSED",
        "next_required_axis":report.next_required_axis,
        "sequence_ready_for_a6":ready and not errors,
        "proof_complete":report.proof_complete,
        "portfolio_blockers":list(report.blockers),
    }
    print(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True))
    if errors or not ready:
        raise SystemExit(2)

if __name__=="__main__":
    main()
