from __future__ import annotations

import inspect
import json
import subprocess
from pathlib import Path

from research.governance_harness_gh3.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh3.runner import dry_run, run_runtime
from research.governance_harness_gh3.scenario import (
    CONFIRMATORY_FAMILIES,
    OUTCOME_STATES,
    PILOT_FAMILIES,
    RECURRENCE_SCOPES,
    build_confirmatory_world,
    build_pilot_world,
)
from research.governance_harness_gh3 import runner as runner_module
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
BASE = "fb3b851413ac621b3d15c8082e2802c5b06d60f6"


def _git_changed(paths: tuple[str, ...]) -> list[str]:
    output = subprocess.check_output(
        ["git", "diff", "--name-only", BASE, "HEAD", "--", *paths],
        cwd=ROOT,
        text=True,
    ).strip()
    return output.splitlines() if output else []


def _candidate_contract(observation) -> tuple[str, ...]:
    core = build_domain_bundle().core
    view = core.open_epoch(observation, 20_000.0, ParticipatingExperienceView(()))
    return tuple(view.possibility_distribution)


def evaluate_gates() -> dict[str, dict]:
    gates: dict[str, dict] = {}
    manifest = json.loads((HERE / "design" / "FREEZE_MANIFEST.json").read_text(encoding="utf-8"))

    gates["freeze_manifest"] = {
        "pass": manifest["spec_version"] == "GH3_EXPERIMENT_V1_0_FINAL"
        and tuple(manifest["arms"]) == ARMS
        and manifest["pilot_executed"] is False
        and manifest["confirmatory_executed"] is False
        and manifest["confirmatory"]["total_decision_realization_epochs"] == 108
        and manifest["confirmatory"]["pilot_derived_count_freeze"] is False
        and manifest["aggregate_score"] is None,
    }

    changed = _git_changed((
        "research/governance_harness_v01",
        "research/governance_harness_gh1l",
        "research/governance_harness_gh2",
        "research/oasis_core_v11",
        "research/carla_v22_harness_v11",
    ))
    gates["frozen_lineage_unchanged"] = {
        "pass": not changed,
        "changed": changed,
    }

    pilot = build_pilot_world()
    confirmatory = build_confirmatory_world()
    gates["pilot_matrix_frozen"] = {
        "pass": len(pilot) == 3
        and set(x.truth.outcome_state for x in pilot) == set(OUTCOME_STATES)
        and set(x.truth.family for x in pilot) == set(PILOT_FAMILIES)
        and set(x.truth.scope_mode for x in pilot) == {"same_scope"},
        "chains": len(pilot),
    }
    gates["confirmatory_matrix_frozen"] = {
        "pass": len(confirmatory) == 18
        and set(x.truth.outcome_state for x in confirmatory) == set(OUTCOME_STATES)
        and set(x.truth.family for x in confirmatory) == set(CONFIRMATORY_FAMILIES)
        and set(x.truth.scope_mode for x in confirmatory) == set(RECURRENCE_SCOPES),
        "chains": len(confirmatory),
        "decision_realization_epochs": len(confirmatory) * 2 * len(ARMS),
    }

    pilot_ids = {x.runtime.chain_id for x in pilot}
    confirmatory_ids = {x.runtime.chain_id for x in confirmatory}
    gates["pilot_confirmatory_disjoint"] = {
        "pass": pilot_ids.isdisjoint(confirmatory_ids)
        and {x.truth.family for x in pilot}.isdisjoint({x.truth.family for x in confirmatory}),
    }

    runtime_ok = True
    opaque_ids = True
    for case in pilot + confirmatory:
        runtime_ok = runtime_ok and not bool(FORBIDDEN_RUNTIME_KEYS.intersection(vars(case.runtime)))
        opaque_ids = opaque_ids and case.truth.outcome_state not in case.runtime.chain_id.lower()
        opaque_ids = opaque_ids and case.truth.scope_mode not in case.runtime.chain_id.lower()
    gates["runtime_evaluator_leakage"] = {"pass": runtime_ok and opaque_ids}

    candidate_sets = []
    candidate_ok = True
    for case in pilot + confirmatory:
        for observation in (case.runtime.antecedent_decision, case.runtime.recurrence_decision):
            ids = _candidate_contract(observation)
            candidate_sets.append(ids)
            candidate_ok = candidate_ok and "continue-flow" in ids and "yield-space" in ids
    gates["actual_core_candidate_contract"] = {
        "pass": candidate_ok,
        "unique_candidate_sets": sorted({str(x) for x in candidate_sets}),
    }

    source = inspect.getsource(runner_module)
    gates["runner_blindness"] = {
        "pass": "from .evaluator import" not in source
        and "import evaluator" not in source
        and "expected_revalidation_state" not in source,
    }

    dry = dry_run()
    dry_text = json.dumps(dry, sort_keys=True)
    gates["fresh_process_actual_path"] = {
        "pass": dry["fresh_process"] and set(dry["arms"]) == set(ARMS),
    }
    gates["preexecution_blindness"] = {
        "pass": dry["evaluator_used"] is False
        and dry["confirmatory_metric_computed"] is False
        and "state_match_rate" not in dry_text
        and "F1_vs_F2" not in dry_text,
    }
    gates["structural_lifecycle"] = {
        "pass": all(
            item["selected_equals_realized"]
            and item["two_realizations_per_chain"]
            and item["new_ce_decision_reuse"] is False
            for item in dry["arms"].values()
        ),
    }

    raw = run_runtime(tuple(case.runtime for case in pilot))
    by_arm = {worker["arm"]: worker for worker in raw["workers"]}
    wiring_ok = True
    for index in range(len(pilot)):
        states = {
            by_arm[arm]["results"][index]["committed_feedback_state"]
            for arm in ARMS
        }
        wiring_ok = wiring_ok and len(states) == 1
        f1 = by_arm["F1_ACTIVE_CORRECT"]["results"][index]
        f2 = by_arm["F2_RECORD_ONLY"]["results"][index]
        f3 = by_arm["F3_PERMUTED_STATE"]["results"][index]
        wiring_ok = wiring_ok and f1["recurrence_exposed_feedback_state"] == f1["committed_feedback_state"]
        wiring_ok = wiring_ok and f2["recurrence_exposed_feedback_state"] is None
        wiring_ok = wiring_ok and f3["recurrence_exposed_feedback_state"] != f3["committed_feedback_state"]
        wiring_ok = wiring_ok and not f1["recurrence_new_ce_exposed"]
        wiring_ok = wiring_ok and not f2["recurrence_new_ce_exposed"]
        wiring_ok = wiring_ok and not f3["recurrence_new_ce_exposed"]
    gates["arm_wiring_without_hypothesis_metric"] = {"pass": wiring_ok}

    gates["pilot_absent"] = {
        "pass": not (HERE / "results" / "PILOT_RESULT_V1_0.json").exists(),
    }
    gates["confirmatory_absent"] = {
        "pass": not (HERE / "results" / "CONFIRMATORY_RESULT_V1_0.json").exists(),
    }
    gates["execution_lock"] = {
        "pass": "Pilot/Confirmatory is locked" in source,
        "detail": "Scientific execution remains locked on the feature branch.",
    }
    return gates


def main() -> int:
    gates = evaluate_gates()
    ready = all(item["pass"] for item in gates.values())
    payload = {
        "status": "EXPERIMENT_READY" if ready else "ADMISSION_FAIL",
        "spec_version": "GH3_EXPERIMENT_V1_0_FINAL",
        "experiment_executed": False,
        "gates": gates,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
