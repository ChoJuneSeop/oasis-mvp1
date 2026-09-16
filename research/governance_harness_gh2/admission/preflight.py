from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from research.governance_harness_gh2.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh2.responsibility import current_trace
from research.governance_harness_gh2.runner import dry_run
from research.governance_harness_gh2.scenario import SCENARIO_PLAN, build_world
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
BASE = "5861b08d6b48f79b88f4f160bbb425690708ccd4"


def evaluate_gates() -> dict[str, dict]:
    gates = {}
    manifest = json.loads((HERE / "design" / "FREEZE_MANIFEST.json").read_text())
    gates["freeze_manifest"] = {
        "pass": tuple(manifest["arms"]) == ARMS and manifest["experiment_executed"] is False
    }

    changed = subprocess.check_output([
        "git", "diff", "--name-only", BASE, "HEAD", "--",
        "research/governance_harness_v01", "research/governance_harness_gh1l", "research/oasis_core_v11",
    ], cwd=ROOT, text=True).strip()
    gates["frozen_lineage_unchanged"] = {"pass": changed == "", "changed": changed.splitlines() if changed else []}

    world = build_world(manifest["pilot_seeds"][0])
    same_observation_pairs = {}
    for case in world:
        same_observation_pairs.setdefault(case.truth.pair_id, []).append(case)
    pair_ok = all(
        len(items) == 2 and items[0].runtime.observation == items[1].runtime.observation
        and items[0].truth.expected_action != items[1].truth.expected_action
        for items in same_observation_pairs.values()
    )
    gates["matched_observation_context_reversal"] = {"pass": pair_ok, "pairs": sorted(same_observation_pairs)}

    runtime_keys = set(world[0].runtime.__dict__)
    gates["evaluator_leakage"] = {"pass": not FORBIDDEN_RUNTIME_KEYS.intersection(runtime_keys)}

    case = world[0]
    core = build_domain_bundle().core
    view = core.open_epoch(case.runtime.observation, 5000.0, ParticipatingExperienceView(()))
    candidates = tuple(view.possibility_distribution)
    gates["actual_core_candidate_contract"] = {
        "pass": candidates == ("continue-flow", "yield-space"),
        "candidates": list(candidates),
    }
    trace = current_trace(candidates, view.possibility_distribution, case.runtime.responsibility_context)
    gates["responsibility_after_possibilities"] = {
        "pass": set(x.candidate_id for x in trace.profiles) == set(candidates)
    }
    gates["no_scalar_responsibility"] = {
        "pass": all(isinstance(axis, frozenset) for profile in trace.profiles for axis in profile.axes())
    }

    dry = dry_run()
    gates["fresh_process_actual_path"] = {"pass": dry["fresh_process"], "arms": list(dry["arms"])}
    gates["dry_run_not_experiment"] = {"pass": dry["experiment_executed"] is False and dry["stage"] == "dry-run-only"}
    gates["pilot_absent"] = {"pass": not (HERE / "results" / "PILOT_RESULT.json").exists()}
    gates["confirmatory_absent"] = {"pass": not (HERE / "results" / "CONFIRMATORY_RESULT.json").exists()}
    gates["execution_lock"] = {
        "pass": manifest["experiment_executed"] is False,
        "detail": "pilot/confirmatory locked in runner until post-readiness execution lineage",
    }
    return gates


def main() -> int:
    gates = evaluate_gates()
    ready = all(item["pass"] for item in gates.values())
    payload = {
        "status": "EXPERIMENT_READY" if ready else "ADMISSION_FAIL",
        "spec_version": "GH2_EXPERIMENT_V1_0_PREEXECUTION",
        "experiment_executed": False,
        "gates": gates,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
