from __future__ import annotations

import json
import subprocess
from pathlib import Path

from research.governance_harness_gh2.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh2.responsibility import current_trace
from research.governance_harness_gh2.runner import dry_run, run_cases
from research.governance_harness_gh2.scenario import (
    CONFIRMATORY_AXIS_COMBINATIONS,
    OBSERVATION_FAMILIES,
    build_confirmatory_world,
    build_pilot_world,
)
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
BASE = "5861b08d6b48f79b88f4f160bbb425690708ccd4"


def _pair_contract(world):
    pairs = {}
    for case in world:
        pairs.setdefault(case.truth.pair_id, []).append(case)
    ok = all(
        len(items) == 2
        and items[0].runtime.observation == items[1].runtime.observation
        and items[0].runtime.relation_id == items[1].runtime.relation_id
        and items[0].truth.expected_action != items[1].truth.expected_action
        for items in pairs.values()
    )
    return ok, pairs


def evaluate_gates() -> dict[str, dict]:
    gates: dict[str, dict] = {}
    manifest = json.loads((HERE / "design" / "FREEZE_MANIFEST.json").read_text())
    pilot = build_pilot_world()
    confirmatory = build_confirmatory_world()

    gates["freeze_manifest"] = {
        "pass": (
            manifest["spec_version"] == "GH2_EXPERIMENT_V1_1_PREEXECUTION"
            and tuple(manifest["arms"]) == ARMS
            and manifest["experiment_executed"] is False
            and manifest["aggregate_score"] is None
        )
    }

    changed = subprocess.check_output(
        [
            "git",
            "diff",
            "--name-only",
            BASE,
            "HEAD",
            "--",
            "research/governance_harness_v01",
            "research/governance_harness_gh1l",
            "research/oasis_core_v11",
        ],
        cwd=ROOT,
        text=True,
    ).strip()
    gates["frozen_lineage_unchanged"] = {
        "pass": changed == "",
        "changed": changed.splitlines() if changed else [],
    }

    pilot_pair_ok, pilot_pairs = _pair_contract(pilot)
    confirm_pair_ok, confirm_pairs = _pair_contract(confirmatory)
    gates["matched_observation_context_reversal"] = {
        "pass": pilot_pair_ok and confirm_pair_ok,
        "pilot_pairs": len(pilot_pairs),
        "confirmatory_pairs": len(confirm_pairs),
    }

    pilot_classes = {case.truth.scenario_class for case in pilot}
    confirm_classes = {case.truth.scenario_class for case in confirmatory}
    gates["pilot_confirmatory_disjoint"] = {
        "pass": pilot_classes.isdisjoint(confirm_classes),
        "pilot_classes": len(pilot_classes),
        "confirmatory_classes": len(confirm_classes),
    }

    gates["finite_matrix_count_frozen"] = {
        "pass": (
            len(CONFIRMATORY_AXIS_COMBINATIONS) == 11
            and len(OBSERVATION_FAMILIES) == 3
            and len(confirmatory) == 66
            and manifest["confirmatory_frames_per_arm"] == 66
            and manifest["confirmatory_decision_realization_units"] == 264
            and manifest["confirmatory_count_method"] == "PRE_FROZEN_FINITE_MATRIX_NO_PILOT_DERIVATION"
            and manifest["pilot_may_change_confirmatory_count"] is False
            and manifest["seed_is_experimental_factor"] is False
            and manifest["pilot_seeds"] == []
        )
    }

    all_runtime_keys = set()
    for case in pilot + confirmatory:
        all_runtime_keys.update(case.runtime.__dict__)
    gates["evaluator_leakage"] = {
        "pass": not FORBIDDEN_RUNTIME_KEYS.intersection(all_runtime_keys),
        "runtime_keys": sorted(all_runtime_keys),
    }

    candidate_contract_ok = True
    candidate_sets = []
    for _, observation in OBSERVATION_FAMILIES:
        core = build_domain_bundle().core
        view = core.open_epoch(observation, 5000.0, ParticipatingExperienceView(()))
        candidates = tuple(view.possibility_distribution)
        candidate_sets.append(list(candidates))
        candidate_contract_ok &= candidates == ("continue-flow", "yield-space")
    gates["actual_core_candidate_contract"] = {
        "pass": candidate_contract_ok,
        "candidate_sets": candidate_sets,
    }

    case = pilot[0]
    core = build_domain_bundle().core
    view = core.open_epoch(case.runtime.observation, 5001.0, ParticipatingExperienceView(()))
    candidates = tuple(view.possibility_distribution)
    trace = current_trace(candidates, view.possibility_distribution, case.runtime.responsibility_context)
    gates["responsibility_after_possibilities"] = {
        "pass": {profile.candidate_id for profile in trace.profiles} == set(candidates)
    }
    gates["no_scalar_responsibility"] = {
        "pass": all(isinstance(axis, frozenset) for profile in trace.profiles for axis in profile.axes())
    }

    structural_block = run_cases(pilot)
    r4 = next(worker for worker in structural_block["workers"] if worker["arm"] == "R4_STALE")
    pair_local = True
    for index in range(0, len(r4["decisions"]), 2):
        critical, relief = r4["decisions"][index], r4["decisions"][index + 1]
        pair_local &= critical["stale_source_frame_id"] is None
        pair_local &= relief["stale_source_frame_id"] == critical["frame_id"]
    gates["r4_pair_local_stale"] = {"pass": pair_local}

    dry = dry_run()
    dry_text = json.dumps(dry)
    gates["fresh_process_actual_path"] = {
        "pass": dry["fresh_process"],
        "arms": list(dry["arms"]),
    }
    gates["dry_run_not_experiment"] = {
        "pass": dry["experiment_executed"] is False and dry["stage"] == "dry-run-structural-only"
    }
    gates["preexecution_no_effect_peeking"] = {
        "pass": (
            "resolution_rate" not in dry_text
            and "expected_action" not in dry_text
            and "evaluator" not in dry_text
        )
    }

    gates["pilot_absent"] = {
        "pass": not (HERE / "results" / "PILOT_RESULT.json").exists()
    }
    gates["confirmatory_absent"] = {
        "pass": not (HERE / "results" / "CONFIRMATORY_RESULT.json").exists()
    }
    gates["execution_lock"] = {
        "pass": manifest["experiment_executed"] is False,
        "detail": "v1.1 pilot/confirmatory remain locked until a new exact-snapshot execution lineage is created",
    }
    return gates


def main() -> int:
    gates = evaluate_gates()
    ready = all(item["pass"] for item in gates.values())
    payload = {
        "status": "EXPERIMENT_READY" if ready else "ADMISSION_FAIL",
        "spec_version": "GH2_EXPERIMENT_V1_1_PREEXECUTION",
        "experiment_executed": False,
        "gates": gates,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
