from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from copy import deepcopy
from dataclasses import asdict, is_dataclass, replace
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for path in (REPO_ROOT, REPO_ROOT / "experiments/governance_axis1"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from experiments.governance_axis1.axis1_behavior_probe_v21 import decision_snapshot, field_diff
from experiments.governance_axis1.axis1_empirical_v2 import (
    ProvenancePreservingExtractor,
    admit_experience,
    build_core,
    environment_result,
    generate_observation,
    make_archive,
    poison_test,
    resources_zero,
    run_c2,
)
from research.governance_reality_gap_v1.contracts import (
    GapStatus,
    GapTriggeredRecallGate,
    MaintainCurrentFlow,
    RealityGapAxis,
    RealityGapObservation,
    RealityGapSignature,
)
from research.governance_reality_gap_v1.eligibility import (
    BroadRecallRetriever,
    ProvenanceRelationEligibilityGate,
)
from research.governance_reality_gap_v1.integration import GapMediatedIntegratedChoiceCore
from research.governance_reality_gap_v1.reevaluation import IndependentReevaluationGate
from research.integration_checkpoint.harness_adapter import CorePortAdapter, IntegratedHarness
from research.oasis_core_v12.history_admission import HistoryAdmissionBridgeV12


EXPERIMENT = "governance-oasis-axis2-track-a-stage02-calibration"
DEFAULT_OUT = Path("runs/governance_axis2/track_a_stage02_001/axis2_track_a_stage02.json")
FROZEN_AXIS1 = tuple(
    REPO_ROOT / "experiments/governance_axis1" / name
    for name in ("axis1_empirical_v2.py", "axis1_behavior_probe_v21.py", "axis1_paper_closeout_v30.py")
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(value: Any) -> Any:
    if is_dataclass(value):
        return canonical(asdict(value))
    if isinstance(value, dict):
        return {str(key): canonical(item) for key, item in sorted(value.items(), key=lambda pair: str(pair[0]))}
    if isinstance(value, (list, tuple)):
        return [canonical(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return repr(value)


def object_hash(value: Any) -> str:
    payload = json.dumps(canonical(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class ZeroCandidateEffectExtractor(ProvenancePreservingExtractor):
    """Officially extract relation provenance without linking a current candidate."""

    def extract(self, entry):
        return tuple(
            replace(record, semantic=replace(record.semantic, possibility_links=()))
            for record in super().extract(entry)
        )


def core_and_harness():
    core = GapMediatedIntegratedChoiceCore.from_integrated_core(build_core())
    return core, IntegratedHarness(CorePortAdapter(core))


def gap_decision(revision: str, tau: float, relation_ids: tuple[str, ...], present: bool):
    observation = RealityGapObservation(
        f"gap:{revision}", RealityGapAxis.RELATION,
        GapStatus.PRESENT if present else GapStatus.ABSENT,
        relation_ids, (f"evidence:{revision}",) if present else (),
        "evidenced current relation gap" if present else "no current relation gap", tau,
    )
    signature = RealityGapSignature(revision, tau, (observation,))
    return signature, GapTriggeredRecallGate().evaluate(
        signature,
        relation_terms_by_axis={RealityGapAxis.RELATION: relation_ids} if present else {},
    )


def altered_relations(relations, kind: str, index: int = 0):
    result = deepcopy(tuple(relations))
    for item in result:
        original = str(item["relation_id"])
        if kind == "surface":
            item["relation_id"] = f"{original}::surface-decoy-{index}"
        elif kind == "irrelevant":
            item["relation_id"] = f"unrelated-{index}-{original}"
    return result


def run(seed: int, out_path: Path) -> dict[str, Any]:
    if out_path.exists():
        raise SystemExit(f"refusing to overwrite existing Axis 2 output: {out_path}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    before = {str(path): sha(path) for path in FROZEN_AXIS1}
    observation = generate_observation(seed, 0, 20)
    resources = resources_zero()

    # One untouched bootstrap establishes the current relation fixture shared by all twins.
    fixture_core, fixture_harness = core_and_harness()
    fixture_core.bind_gap_access(MaintainCurrentFlow("axis2-stage02:fixture", 20.0))
    fixture_selected, _, fixture_record = run_c2(
        fixture_harness, fixture_core, deepcopy(observation), 20.0,
        "axis2-stage02:fixture", resources,
    )
    current_relations = tuple(fixture_record["context"]["inputs"]["evaluation"]["current_relations"])
    relation_ids = tuple(str(item["relation_id"]) for item in current_relations)
    _, _, outcome = environment_result(seed, 0, observation, fixture_selected)

    conditions = {
        "C0": {"gap": False, "history": []},
        "C1": {"gap": False, "history": [("relevant", 1)]},
        "C2": {"gap": True, "history": []},
        "C3": {"gap": True, "history": [("relevant", 1)]},
        "C4": {"gap": True, "history": [("surface", 1)]},
        "C5": {"gap": True, "history": [("irrelevant", 8)]},
        "C6": {"gap": True, "history": [("relevant", 1), ("irrelevant", 8)]},
        "C7": {"gap": True, "history": [("poison", 1)]},
        "C8": {"gap": True, "history": [("relevant", 1)]},
    }
    records: dict[str, Any] = {}
    for ordinal, (name, spec) in enumerate(conditions.items()):
        core, harness = core_and_harness()
        extractor = ZeroCandidateEffectExtractor() if name == "C8" else ProvenancePreservingExtractor()
        archive = make_archive(out_path.parent / "_process_archive" / name / "process.sqlite")
        bridge = HistoryAdmissionBridgeV12(core, extractor, archive)
        admitted_ids = []
        poison_rejected = None
        try:
            item_index = 0
            for history_kind, count in spec["history"]:
                for local_index in range(count):
                    item_index += 1
                    # The relevant experience is the same controlled historical
                    # component in C1/C3/C6/C8.  Negative controls keep distinct IDs.
                    t = 1 if history_kind == "relevant" else ordinal * 100 + item_index
                    if history_kind == "poison":
                        poison_rejected = poison_test(
                            bridge, t=t, tau=20.0, selected=fixture_selected
                        )
                        continue
                    relations = (
                        deepcopy(current_relations)
                        if history_kind == "relevant"
                        else altered_relations(current_relations, history_kind, local_index)
                    )
                    admit_experience(
                        bridge, extractor, t=t, tau=20.0, selected=fixture_selected,
                        description=outcome, current_relations=relations,
                    )
                    admitted_ids.append(f"AXIS1-V2-E{t}")

            revision = "axis2-stage02:gap-comparison" if spec["gap"] else "axis2-stage02:no-gap-comparison"
            tau = 30.0
            signature, recall = gap_decision(revision, tau, relation_ids, bool(spec["gap"]))
            retrieved = ()
            authorization = None
            if isinstance(recall, MaintainCurrentFlow):
                core.bind_gap_access(recall)
            else:
                retrieved = BroadRecallRetriever().retrieve(recall, core.history_envelopes())
                authorization = ProvenanceRelationEligibilityGate().assess(recall, retrieved)
                core.bind_gap_access(authorization)

            started = time.perf_counter()
            selected, elapsed_ms, decision_record = run_c2(
                harness, core, deepcopy(observation), tau, revision, resources
            )
            wall_clock_ms = (time.perf_counter() - started) * 1000.0
            snapshot = decision_snapshot(decision_record)
            history_manifest = canonical(core.history_envelopes())
            staged_input = {
                "seed": seed, "observation": observation, "tau": tau,
                "revision": revision, "resources": resources,
                "history_manifest_hash": object_hash(history_manifest),
                "gap_signature": signature, "recall": recall,
                "retrieved": retrieved, "authorization": authorization,
            }
            records[name] = {
                "run_id": f"{EXPERIMENT}:{seed}:{name}",
                "condition": name,
                "epoch": observation["epoch"],
                "observation_hash": object_hash(observation),
                "flow_fingerprint": revision,
                "history_manifest_hash": object_hash(history_manifest),
                "input_hash": object_hash(staged_input),
                "output_hash": object_hash(snapshot),
                "wall_clock": {"harness_elapsed_ms": elapsed_ms, "condition_elapsed_ms": wall_clock_ms},
                "gap_signature": repr(signature),
                "recall_decision": repr(recall),
                "history_envelope_count": len(core.history_envelopes()),
                "admitted_experience_ids": admitted_ids,
                "poison_rejected": poison_rejected,
                "retrieved_source_keys": [list(item.source_key) for item in retrieved],
                "eligibility": [] if authorization is None else [
                    {"source_key": list(item.source_key), "eligible": item.eligible, "reason": item.reason}
                    for item in authorization.assessments
                ],
                "reentry_authorized_source_keys": [] if authorization is None else [
                    list(item) for item in authorization.authorized_source_keys
                ],
                "active_history_keys": [list(item) for item in core.active_history_keys()],
                "snapshot": snapshot,
                "selected_id": selected,
            }
        finally:
            archive.close()

    diffs = {
        "E2_A_C0_vs_C1": field_diff(records["C1"]["snapshot"], records["C0"]["snapshot"]),
        "E2_D_C3_vs_C2": field_diff(records["C3"]["snapshot"], records["C2"]["snapshot"]),
        "E2_F_C6_vs_C3": field_diff(records["C6"]["snapshot"], records["C3"]["snapshot"]),
    }
    reevaluation_gate = IndependentReevaluationGate()
    for name, item in records.items():
        baseline_name = "C0" if name in {"C0", "C1"} else "C2"
        item["reevaluation"] = canonical(reevaluation_gate.evaluate(
            baseline=records[baseline_name]["snapshot"], current=item["snapshot"]
        ))

    axis_scope_history = tuple(
        f"axis-scope:{axis.value}" for axis in RealityGapAxis
    )
    axis_matrix = {}
    for axis, relation_id in zip(RealityGapAxis, axis_scope_history):
        axis_observation = RealityGapObservation(
            f"axis2-stage02:axis:{axis.value}", axis, GapStatus.PRESENT,
            (relation_id,), (f"evidence:{axis.value}",), "single-axis local perturbation", 31.0,
        )
        axis_signature = RealityGapSignature("axis2-stage02:axis-matrix", 31.0, (axis_observation,))
        axis_directive = GapTriggeredRecallGate().evaluate(
            axis_signature, relation_terms_by_axis={axis: (relation_id,)}
        )
        axis_matrix[axis.value] = {
            "query": list(axis_directive.relation_query),
            "expected_query": [relation_id],
            "other_axis_terms_absent": not bool(set(axis_directive.relation_query) & (set(axis_scope_history) - {relation_id})),
            "direct_choice": axis_directive.permits_direct_choice,
        }
    axis_selectivity_pass = all(
        item["query"] == item["expected_query"] and item["other_axis_terms_absent"] and not item["direct_choice"]
        for item in axis_matrix.values()
    ) and len({tuple(item["query"]) for item in axis_matrix.values()}) == len(RealityGapAxis)
    internal_effect = any(
        item["different"] for key, item in diffs["E2_D_C3_vs_C2"].items()
        if key != "selected_id"
    )
    checks = {
        "no_gap_non_interference": not any(item["different"] for item in diffs["E2_A_C0_vs_C1"].values()),
        "gap_current_only": records["C2"]["gap_signature"] == records["C3"]["gap_signature"],
        "relevant_retrieved_and_reentered": bool(records["C3"]["active_history_keys"]),
        "surface_retrieved_but_not_reentered": bool(records["C4"]["retrieved_source_keys"]) and not records["C4"]["active_history_keys"],
        "irrelevant_not_reentered": not records["C5"]["active_history_keys"],
        "mixed_only_relevant_reentered": records["C6"]["active_history_keys"] == records["C3"]["active_history_keys"],
        "irrelevant_volume_non_amplification": not any(item["different"] for item in diffs["E2_F_C6_vs_C3"].values()),
        "poison_rejected": records["C7"]["poison_rejected"] is True and records["C7"]["history_envelope_count"] == 0,
        "functional_internal_effect": internal_effect,
        "reentry_not_automatically_reevaluation": (
            records["C8"]["active_history_keys"]
            and not records["C8"]["reevaluation"]["occurred"]
            and records["C3"]["reevaluation"]["occurred"]
        ),
        "C8_eligible_zero_candidate_effect": (
            bool(records["C8"]["active_history_keys"])
            and records["C8"]["snapshot"]["possibility_distribution"] == records["C2"]["snapshot"]["possibility_distribution"]
            and records["C8"]["snapshot"]["responsibilities"] == records["C2"]["snapshot"]["responsibilities"]
            and not records["C8"]["snapshot"]["contributions"]
        ),
        "gap_axis_local_selectivity": axis_selectivity_pass,
    }
    # C8 is an explicit semantic-boundary audit here: it shares C3's eligible re-entry,
    # while the independent reevaluation gate remains closed. A no-effect fixture is a
    # later calibration concern, not fabricated by suppressing a real contribution.
    passed = all(checks.values())
    after = {str(path): sha(path) for path in FROZEN_AXIS1}
    result = {
        "experiment": EXPERIMENT,
        "status": "STAGE2_CALIBRATION_PASS" if passed else "STAGE2_CALIBRATION_FAIL",
        "seed": seed,
        "checks": checks,
        "conditions": records,
        "paired_diffs": diffs,
        "gap_axis_selectivity_matrix": axis_matrix,
        "axis1_freeze": {"unchanged": before == after, "before": before, "after": after},
        "scope_note": "C8 uses the official admission bridge with a provenance-preserving extractor whose completed relation has no current candidate link.",
    }
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=9152026)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    run(args.seed, args.out)


if __name__ == "__main__":
    main()
