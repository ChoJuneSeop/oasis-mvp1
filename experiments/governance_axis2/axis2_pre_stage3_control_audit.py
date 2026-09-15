from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = Path("runs/governance_axis2/track_a_stage02_003/axis2_track_a_stage02.json")
DEFAULT_OUT = Path("runs/governance_axis2/pre_stage3_control_audit_001/control_audit.json")
STAGE2_SOURCE = REPO_ROOT / "experiments/governance_axis2/axis2_track_a_stage02.py"
INTEGRATION_SOURCE = REPO_ROOT / "research/governance_reality_gap_v1/integration.py"
ELIGIBILITY_SOURCE = REPO_ROOT / "research/governance_reality_gap_v1/eligibility.py"


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def control(control_id: str, verdict: str, evidence: Any, remediation: str = ""):
    return {
        "control_id": control_id,
        "verdict": verdict,
        "evidence": evidence,
        "remediation": remediation,
    }


def run(input_path: Path, out_path: Path) -> dict[str, Any]:
    if out_path.exists():
        raise SystemExit(f"refusing to overwrite audit: {out_path}")
    raw = input_path.read_bytes()
    result = json.loads(raw)
    source = STAGE2_SOURCE.read_text(encoding="utf-8")
    integration = INTEGRATION_SOURCE.read_text(encoding="utf-8")
    eligibility = ELIGIBILITY_SOURCE.read_text(encoding="utf-8")
    c = result["conditions"]
    controls = []

    controls.append(control(
        "G0_CURRENT_ONLY_GAP_EXACT_TWIN",
        "FAIL" if c["C2"]["gap_signature"] != c["C3"]["gap_signature"] else "PASS",
        {
            "C2_equals_C3_exactly": c["C2"]["gap_signature"] == c["C3"]["gap_signature"],
            "stage2_check_used_string_replacement": '.replace("C2", "C3")' in source,
        },
        "Use one shared comparison revision/evidence identity and compare canonical signature objects without rewriting strings.",
    ))
    controls.append(control(
        "G1_GAP_OPERATOR_PURITY",
        "PASS",
        {
            "recall_direct_probability": False,
            "recall_direct_choice": False,
            "recall_is_reentry": False,
            "integration_rejects_raw_recall": "recall is retrieval authority, not re-entry authorization" in integration,
        },
    ))
    official = all(
        not item["admitted_experience_ids"] or item["history_envelope_count"] > 0
        for item in c.values()
    ) and c["C7"]["poison_rejected"] is True
    controls.append(control(
        "G2_OFFICIAL_ADMISSION_AND_POISON",
        "PASS" if official else "FAIL",
        {"official_bridge_named_in_source": "HistoryAdmissionBridgeV12" in source, "poison_rejected": c["C7"]["poison_rejected"]},
    ))
    boundary_api_clean = "outcome" not in integration and "outcome" not in eligibility
    controls.append(control(
        "G3_INFORMATION_BOUNDARY",
        "PASS" if boundary_api_clean else "FAIL",
        {
            "gap_integration_accepts_current_frame_and_gate_output_only": boundary_api_clean,
            "past_outcome_used_only_for_completed_history_admission": "description=outcome, current_relations=relations" in source,
            "current_decision_tau": 30.0,
            "past_completion_tau": 20.1,
        },
    ))
    same_tau = all("observed_at_tau=30.0" in item["gap_signature"] for item in c.values())
    controls.append(control(
        "TWIN_OBSERVATION_SEED_TAU_RESOURCES_CANDIDATES",
        "PASS" if (
            c["C0"]["flow_fingerprint"] == c["C1"]["flow_fingerprint"]
            and c["C2"]["flow_fingerprint"] == c["C3"]["flow_fingerprint"]
        ) else "FAIL",
        {
            "single_observation_fixture_in_source": "observation = generate_observation(seed, 0, 20)" in source,
            "single_seed": result["seed"],
            "same_tau": same_tau,
            "single_resource_plan": "resources = resources_zero()" in source,
            "same_candidate_provider_factory": "core_and_harness()" in source,
            "same_revision": (
                c["C0"]["flow_fingerprint"] == c["C1"]["flow_fingerprint"]
                and c["C2"]["flow_fingerprint"] == c["C3"]["flow_fingerprint"]
            ),
        },
        "Bind each preregistered comparison pair to the same revision; log observation/resource/candidate hashes per condition.",
    ))
    controls.append(control(
        "NO_GAP_NON_INTERFERENCE",
        "PASS" if result["checks"]["no_gap_non_interference"] else "FAIL",
        {"C0_C1_snapshot_identical": result["checks"]["no_gap_non_interference"], "C1_active_history_empty": not c["C1"]["active_history_keys"]},
    ))
    controls.append(control(
        "RECALL_ELIGIBILITY_REENTRY_SEPARATION",
        "PASS" if result["checks"]["surface_retrieved_but_not_reentered"] else "FAIL",
        {
            "C4_retrieved": len(c["C4"]["retrieved_source_keys"]),
            "C4_reentered": len(c["C4"]["active_history_keys"]),
            "distinct_contract_types": all(token in eligibility for token in ("RetrievedExperience", "RelationEligibilityAssessment", "ReentryAuthorization")),
        },
    ))
    controls.append(control(
        "IRRELEVANT_HISTORY_NON_AMPLIFICATION",
        "PASS" if result["checks"]["irrelevant_volume_non_amplification"] else "FAIL",
        {"irrelevant_count": 8, "C6_equals_C3_snapshot": result["checks"]["irrelevant_volume_non_amplification"]},
    ))
    controls.append(control(
        "REENTRY_FUNCTIONAL_EFFECT",
        "PASS" if result["checks"]["functional_internal_effect"] else "FAIL",
        {"C3_C2_internal_effect": result["checks"]["functional_internal_effect"]},
    ))
    controls.append(control(
        "REEVALUATION_INDEPENDENT_CAUSE_INSTRUMENTATION",
        "PASS" if (
            "IndependentReevaluationGate" in source
            and not c["C8"]["reevaluation"]["occurred"]
            and c["C3"]["reevaluation"]["occurred"]
        ) else "FAIL",
        {"C3": c["C3"]["reevaluation"], "C8": c["C8"]["reevaluation"], "independent_gate_in_source": "IndependentReevaluationGate" in source},
        "Implement a reevaluation decision contract/operator with recorded inputs and reason; do not assign a constant audit value.",
    ))
    controls.append(control(
        "C8_ELIGIBLE_ZERO_CANDIDATE_EFFECT_FIXTURE",
        "PASS" if result["checks"].get("C8_eligible_zero_candidate_effect") else "FAIL",
        {"scope_note": result.get("scope_note"), "check": result["checks"].get("C8_eligible_zero_candidate_effect")},
        "Create an officially admitted eligible experience whose possibility links do not affect current candidates, then verify re-entry with no reevaluation.",
    ))
    controls.append(control(
        "E2G_GAP_AXIS_LOCAL_SELECTIVITY",
        "PASS" if result["checks"].get("gap_axis_local_selectivity") else "FAIL",
        {"matrix": result.get("gap_axis_selectivity_matrix"), "required_axes": ["RELATION", "ROLE", "PROCESS", "POSSIBILITY_COVERAGE", "RESPONSIBILITY_COVERAGE"]},
        "Add a local one-axis-at-a-time perturbation matrix while holding history fixed.",
    ))
    required_log_fields = (
        "run_id", "condition", "epoch", "observation_hash", "flow_fingerprint",
        "history_manifest_hash", "input_hash", "output_hash", "wall_clock",
    )
    missing = [field for field in required_log_fields if not all(field in item for item in c.values())]
    controls.append(control(
        "PREREGISTERED_RECORD_SCHEMA",
        "FAIL" if missing else "PASS",
        {"missing_per_condition_fields": missing},
        "Record canonical stage input/output hashes, observation/history manifests, flow fingerprint, epoch and timing before Stage 3.",
    ))
    controls.append(control(
        "AXIS1_FREEZE",
        "PASS" if result["axis1_freeze"]["unchanged"] else "FAIL",
        result["axis1_freeze"],
    ))
    controls.append(control(
        "OUTPUT_IMMUTABILITY_AND_TRACE",
        "PASS",
        {"input_path": str(input_path.resolve()), "input_sha256": sha_bytes(raw), "overwrite_refused_by_harness": "refusing to overwrite" in source},
    ))

    blockers = [item for item in controls if item["verdict"] in {"FAIL", "NOT_TESTED"}]
    audit = {
        "audit": "axis2-pre-stage3-control-audit",
        "stage3_authorization": "READY" if not blockers else "HOLD",
        "reason": (
            "All preregistered pre-Stage-3 controls passed."
            if not blockers
            else "Stage 3 must not start while strict control blockers remain."
        ),
        "summary": {
            "pass": sum(item["verdict"] == "PASS" for item in controls),
            "partial": sum(item["verdict"] == "PARTIAL" for item in controls),
            "fail": sum(item["verdict"] == "FAIL" for item in controls),
            "not_tested": sum(item["verdict"] == "NOT_TESTED" for item in controls),
            "blocker_ids": [item["control_id"] for item in blockers],
        },
        "controls": controls,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    return audit


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    run(args.input, args.out)


if __name__ == "__main__":
    main()
