from __future__ import annotations

import hashlib
import json
from pathlib import Path

from research.governance_oasis_scientific_proof_harness_v1.io import load_evidence_registry
from research.governance_oasis_scientific_proof_harness_v1.portfolio_gate import audit_portfolio

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REGISTRY=HERE/"PROGRAM_EVIDENCE_REGISTRY_AFTER_GH4.json"

EXPECTED={
  "research/governance_oasis_gh4_integrated_v1/design_spec.py":"45e1136a457bc4866e37b0b6e3ed82b5040dcb9a",
  "research/governance_oasis_gh4_integrated_v1/CONFIRMATORY_PLAN.json":"8b11aefb102dc3aefbfe5b3f03bad2d47ce5ebb5",
  "research/governance_oasis_gh4_integrated_v1/validation/confirmatory_35403562192/VALIDATION_RECORD.json":"114b03931fca119180e49d833252700b97a099fd",
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

    expected_axes={
        "A1_BEHAVIOR_CHANGE_EFFECTIVENESS",
        "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY",
        "A3_RESPONSIBILITY_SENSITIVITY",
        "A4_OVERGENERALIZATION_PREVENTION",
        "A5_CONFLICTING_EXPERIENCE_HANDLING",
        "A6_WRONG_BEHAVIOR_RECOVERY",
    }
    supported=set(report.supported_axes)
    exact=(
        not errors
        and supported==expected_axes
        and report.next_required_axis is None
        and report.integration_supported
        and "E-GH4-INTEGRATED-V1" in set(report.integration_evidence_ids)
        and report.proof_complete
        and not report.blockers
        and not report.missing_axes
        and not report.weak_axes
        and not report.unsupported_axes
        and not report.inconclusive_axes
    )
    payload={
        "schema":"governance-oasis-gh4-proof-closure-audit-v1",
        "source_blob_integrity":not errors,
        "source_blob_errors":errors,
        "supported_axes":list(report.supported_axes),
        "next_required_axis":report.next_required_axis,
        "integration_evidence_ids":list(report.integration_evidence_ids),
        "integration_supported":report.integration_supported,
        "proof_complete":report.proof_complete,
        "portfolio_blockers":list(report.blockers),
        "canonical_synthetic_proof_program_closed":exact,
    }
    print(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True))
    if not exact:
        raise SystemExit(2)

if __name__=="__main__":
    main()
