from __future__ import annotations

import argparse
import hashlib
import json
import sys
from copy import deepcopy
from dataclasses import asdict, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
AXIS1_DIR = REPO_ROOT / "experiments/governance_axis1"
if str(AXIS1_DIR) not in sys.path:
    sys.path.insert(0, str(AXIS1_DIR))

from experiments.governance_axis1.axis1_behavior_probe_v21 import (
    decision_snapshot,
    field_diff,
)
from experiments.governance_axis1.axis1_empirical_v2 import (
    ProvenancePreservingExtractor,
    admit_experience,
    build_core,
    environment_result,
    generate_observation,
    make_archive,
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
    RecallDirective,
)
from research.governance_reality_gap_v1.integration import GapMediatedIntegratedChoiceCore
from research.integration_checkpoint.harness_adapter import CorePortAdapter, IntegratedHarness
from research.oasis_core_v12.history_admission import HistoryAdmissionBridgeV12


EXPERIMENT = "governance-oasis-axis2-track-a-stage01"
DEFAULT_OUT = Path(
    "runs/governance_axis2/track_a_stage01_001/axis2_track_a_stage01.json"
)
FROZEN_AXIS1 = (
    REPO_ROOT / "experiments/governance_axis1/axis1_empirical_v2.py",
    REPO_ROOT / "experiments/governance_axis1/axis1_behavior_probe_v21.py",
    REPO_ROOT / "experiments/governance_axis1/axis1_paper_closeout_v30.py",
)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return canonical(asdict(value))
    if isinstance(value, dict):
        return {str(key): canonical(value[key]) for key in sorted(value, key=str)}
    if isinstance(value, (list, tuple)):
        return [canonical(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return repr(value)


def make_signature(
    *,
    revision: str,
    tau: float,
    relation_ids: tuple[str, ...],
    present: bool,
) -> RealityGapSignature:
    status = GapStatus.PRESENT if present else GapStatus.ABSENT
    observation = RealityGapObservation(
        observation_id=f"gap:relation:{revision}",
        axis=RealityGapAxis.RELATION,
        status=status,
        current_relation_ids=relation_ids,
        current_evidence_refs=(f"current-observation:{revision}",) if present else (),
        description=(
            "current relation structure has an evidenced unresolved gap"
            if present
            else "current relation structure has no evidenced gap"
        ),
        observed_at_tau=tau,
    )
    return RealityGapSignature(revision, tau, (observation,))


def build_gap_mediated_core() -> GapMediatedIntegratedChoiceCore:
    return GapMediatedIntegratedChoiceCore.from_integrated_core(build_core())


def run(*, seed: int, out_path: Path) -> dict[str, Any]:
    if out_path.exists():
        raise SystemExit(f"refusing to overwrite existing Axis 2 output: {out_path}")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    frozen_before = {str(path): file_sha256(path) for path in FROZEN_AXIS1}
    history_core = build_gap_mediated_core()
    no_history_core = build_gap_mediated_core()
    history_harness = IntegratedHarness(CorePortAdapter(history_core))
    no_history_harness = IntegratedHarness(CorePortAdapter(no_history_core))
    resources = resources_zero()

    archive = make_archive(out_path.parent / "_process_archive" / "process.sqlite")
    extractor = ProvenancePreservingExtractor()
    bridge = HistoryAdmissionBridgeV12(history_core, extractor, archive)

    try:
        bootstrap_observation = generate_observation(seed, 0, 20)
        bootstrap_tau = 20.0
        bootstrap_revision = "axis2-track-a:bootstrap"
        bootstrap_access = MaintainCurrentFlow(bootstrap_revision, bootstrap_tau)
        history_core.bind_gap_access(bootstrap_access)
        no_history_core.bind_gap_access(bootstrap_access)
        history_action, _, history_bootstrap = run_c2(
            history_harness,
            history_core,
            deepcopy(bootstrap_observation),
            bootstrap_tau,
            bootstrap_revision,
            resources,
        )
        twin_action, _, _ = run_c2(
            no_history_harness,
            no_history_core,
            deepcopy(bootstrap_observation),
            bootstrap_tau,
            bootstrap_revision,
            resources,
        )
        if history_action != twin_action:
            raise RuntimeError("bootstrap twins selected different actions")

        evaluation = history_bootstrap["context"]["inputs"]["evaluation"]
        current_relations = tuple(
            str(item["relation_id"])
            for item in evaluation.get("current_relations", ())
        )
        if not current_relations:
            raise RuntimeError("bootstrap produced no current relation IDs")

        _, _, outcome_description = environment_result(
            seed, 0, bootstrap_observation, history_action
        )
        admitted = admit_experience(
            bridge,
            extractor,
            t=0,
            tau=bootstrap_tau,
            selected=history_action,
            description=outcome_description,
            current_relations=evaluation.get("current_relations", ()),
        )

        comparison_tau = 21.0
        comparison_revision = "axis2-track-a:no-gap-core-audit"
        current_observation = deepcopy(bootstrap_observation)
        current_observation["epoch"] = 2
        no_gap_signature = make_signature(
            revision=comparison_revision,
            tau=comparison_tau,
            relation_ids=current_relations,
            present=False,
        )
        gap_signature_history = make_signature(
            revision=comparison_revision,
            tau=comparison_tau,
            relation_ids=current_relations,
            present=True,
        )
        gap_signature_twin = make_signature(
            revision=comparison_revision,
            tau=comparison_tau,
            relation_ids=current_relations,
            present=True,
        )

        gate = GapTriggeredRecallGate()
        no_gap_decision = gate.evaluate(no_gap_signature, relation_terms_by_axis={})
        gap_decision = gate.evaluate(
            gap_signature_history,
            relation_terms_by_axis={RealityGapAxis.RELATION: current_relations},
        )

        history_core.bind_gap_access(no_gap_decision)
        no_history_core.bind_gap_access(no_gap_decision)
        history_selected, _, history_record = run_c2(
            history_harness,
            history_core,
            deepcopy(current_observation),
            comparison_tau,
            comparison_revision,
            resources,
        )
        twin_selected, _, twin_record = run_c2(
            no_history_harness,
            no_history_core,
            deepcopy(current_observation),
            comparison_tau,
            comparison_revision,
            resources,
        )
        history_snapshot = decision_snapshot(history_record)
        twin_snapshot = decision_snapshot(twin_record)
        differences = field_diff(history_snapshot, twin_snapshot)
        history_effect_fields = [
            field for field, item in differences.items() if item["different"]
        ]
        bypass_observed = bool(
            history_snapshot["reentered_unresolved"]
            or history_snapshot["contributions"]
            or history_snapshot["reconstructions"]
            or history_effect_fields
        )

        stage0_pass = (
            isinstance(no_gap_decision, MaintainCurrentFlow)
            and not no_gap_decision.recall_requested
            and not no_gap_decision.candidate_generation_requested
            and not no_gap_decision.reevaluation_requested
            and isinstance(gap_decision, RecallDirective)
            and not gap_decision.permits_direct_probability_update
            and not gap_decision.permits_direct_choice
            and not gap_decision.constitutes_reentry
            and not gap_decision.constitutes_reevaluation
            and canonical(gap_signature_history) == canonical(gap_signature_twin)
        )
        stage1_pass = stage0_pass and admitted > 0 and not bypass_observed
        status = (
            "STAGE1_PASS_GAP_GATE_CONTROLS_HISTORY_ACCESS"
            if stage1_pass
            else "STAGE1_WIRING_FAIL_HISTORY_BYPASSES_GAP_GATE"
            if stage0_pass and bypass_observed
            else "STAGE0_CONTRACT_FAIL"
        )

        frozen_after = {str(path): file_sha256(path) for path in FROZEN_AXIS1}
        result = {
            "experiment": EXPERIMENT,
            "seed": seed,
            "status": status,
            "stage0_contract": {
                "pass": stage0_pass,
                "no_gap_decision": canonical(no_gap_decision),
                "gap_decision": canonical(gap_decision),
                "history_no_history_gap_signature_identical": (
                    canonical(gap_signature_history) == canonical(gap_signature_twin)
                ),
            },
            "stage1_official_admission": {
                "bridge": "HistoryAdmissionBridgeV12",
                "admitted_envelope_count": admitted,
                "history_envelope_count": len(history_core.history_envelopes()),
                "no_history_envelope_count": len(no_history_core.history_envelopes()),
            },
            "stage1_no_gap_wiring_audit": {
                "declared_gate_decision": "MaintainCurrentFlow",
                "history_bypass_observed": bypass_observed,
                "changed_fields": history_effect_fields,
                "history_enabled": history_snapshot,
                "no_history_twin": twin_snapshot,
                "diff": differences,
                "history_selected_id": history_selected,
                "no_history_selected_id": twin_selected,
                "pass": stage1_pass,
            },
            "controls": {
                "same_current_observation": True,
                "same_current_tau": True,
                "same_current_revision": True,
                "history_only_runtime_difference": True,
                "current_observation": canonical(current_observation),
                "current_relation_ids": list(current_relations),
            },
            "axis1_freeze": {
                "before": frozen_before,
                "after": frozen_after,
                "unchanged": frozen_before == frozen_after,
            },
            "interpretation": (
                "Contracts are valid, but the current core is not yet mediated by the gap gate; "
                "a no-gap declaration cannot prevent history participation."
                if status == "STAGE1_WIRING_FAIL_HISTORY_BYPASSES_GAP_GATE"
                else "The no-gap gate controls history access before current judgment."
                if stage1_pass
                else "The gap contract itself failed and integration must not proceed."
            ),
        }
        out_path.write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return result
    finally:
        archive.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=9152026)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    run(seed=args.seed, out_path=args.out)


if __name__ == "__main__":
    main()
