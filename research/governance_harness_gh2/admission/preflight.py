from __future__ import annotations

import json
import subprocess
from pathlib import Path

from research.governance_harness_gh2.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh2.responsibility import current_trace
from research.governance_harness_gh2.runner import dry_run, run_runtime
from research.governance_harness_gh2.scenario import (
    CONFIRMATORY_COMBOS,
    OBSERVATION_FAMILIES,
    PILOT_COMBOS,
    build_confirmatory_world,
    build_pilot_world,
)
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
BASE = "5861b08d6b48f79b88f4f160bbb425690708ccd4"


def _pair_map(world):
    result = {}
    for case in world:
        result.setdefault(case.truth.pair_id, []).append(case)
    return result


def evaluate_gates() -> dict[str, dict]:
    gates = {}
    manifest = json.loads((HERE / "design" / "FREEZE_MANIFEST.json").read_text())
    gates["freeze_manifest"] = {
        "pass": tuple(manifest["arms"]) == ARMS
        and manifest["experiment_executed"] is False
        and manifest["spec_version"] == "GH2_EXPERIMENT_V1_1_PREEXECUTION"
    }

    changed = subprocess.check_output([
        "git", "diff", "--name-only", BASE, "HEAD", "--",
        "research/governance_harness_v01",
        "research/governance_harness_gh1l",
        "research/oasis_core_v11",
    ], cwd=ROOT, text=True).strip()
    gates["frozen_lineage_unchanged"] = {
        "pass": changed == "",
        "changed": changed.splitlines() if changed else [],
    }

    pilot = build_pilot_world()
    confirmatory = build_confirmatory_world()
    gates["pilot_matrix_frozen"] = {
        "pass": len(PILOT_COMBOS) == 4 and len(pilot) == 8,
        "frames": len(pilot),
    }
    gates["confirmatory_matrix_frozen"] = {
        "pass": len(CONFIRMATORY_COMBOS) == 11 and len(confirmatory) == 66,
        "frames": len(confirmatory),
    }

    pilot_classes = {x.truth.scenario_class for x in pilot}
    confirmatory_classes = {x.truth.scenario_class for x in confirmatory}
    gates["pilot_confirmatory_disjoint"] = {
        "pass": pilot_classes.isdisjoint(confirmatory_classes),
        "pilot_classes": sorted(pilot_classes),
        "confirmatory_class_count": len(confirmatory_classes),
    }

    all_pairs = _pair_map(pilot)
    all_pairs.update(_pair_map(confirmatory))
    pair_ok = all(
        len(items) == 2
        and items[0].runtime.observation == items[1].runtime.observation
        and items[0].runtime.relation_id == items[1].runtime.relation_id
        and items[0].truth.expected_action != items[1].truth.expected_action
        for items in all_pairs.values()
    )
    gates["matched_observation_context_reversal"] = {
        "pass": pair_ok and len(all_pairs) == 37,
        "pairs": len(all_pairs),
    }

    runtime_keys = set(pilot[0].runtime.__dict__)
    gates["evaluator_leakage"] = {
        "pass": not FORBIDDEN_RUNTIME_KEYS.intersection(runtime_keys),
    }

    candidate_contract_ok = True
    candidate_sets = []
    for observation in OBSERVATION_FAMILIES:
        core = build_domain_bundle().core
        view = core.open_epoch(observation, 5000.0, ParticipatingExperienceView(()))
        candidates = tuple(view.possibility_distribution)
        candidate_sets.append(list(candidates))
        candidate_contract_ok = candidate_contract_ok and candidates == ("continue-flow", "yield-space")
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
        "pass": set(x.candidate_id for x in trace.profiles) == set(candidates),
    }
    gates["no_scalar_responsibility"] = {
        "pass": all(isinstance(axis, frozenset) for profile in trace.profiles for axis in profile.axes())
        and all(not hasattr(profile, "score") for profile in trace.profiles),
    }

    dry = dry_run()
    dry_text = json.dumps(dry, sort_keys=True)
    gates["fresh_process_actual_path"] = {
        "pass": dry["fresh_process"],
        "arms": list(dry["arms"]),
    }
    gates["preexecution_blindness"] = {
        "pass": dry["evaluator_used"] is False
        and "resolution_rate" not in dry_text
        and dry["stage"] == "dry-run-structural-only",
    }
    gates["structural_realization_invariants"] = {
        "pass": all(
            item["selected_equals_realized"]
            and item["one_realization_per_decision"]
            and item["decision_count"] == 8
            and item["realization_count"] == 8
            for item in dry["arms"].values()
        ),
    }

    raw = run_runtime(case.runtime for case in pilot)
    r4 = next(x for x in raw["workers"] if x["arm"] == "R4_STALE")
    r4_decisions = r4["decisions"]
    stale_ok = True
    for index, decision in enumerate(r4_decisions):
        if index % 2 == 0:
            stale_ok = stale_ok and decision["stale_source_frame_id"] is None
        else:
            stale_ok = stale_ok and decision["stale_source_frame_id"] == r4_decisions[index - 1]["frame_id"]
    gates["r4_pair_local_stale"] = {"pass": stale_ok}

    gates["pilot_absent"] = {
        "pass": not (HERE / "results" / "PILOT_RESULT_V1_1.json").exists(),
    }
    gates["confirmatory_absent"] = {
        "pass": not (HERE / "results" / "CONFIRMATORY_RESULT_V1_1.json").exists(),
    }
    gates["execution_lock"] = {
        "pass": manifest["experiment_executed"] is False,
        "detail": "v1.1 pilot/confirmatory remain locked until exact-snapshot execution lineage",
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
