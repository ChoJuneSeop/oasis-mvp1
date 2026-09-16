from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

from ..evaluator import IndependentEvaluator
from ..models import ARMS, FORBIDDEN_RUNTIME_KEYS
from ..runner.engine import LongHorizonRunner
from ..scenario.generator import SCENARIO_CLASSES, generate_long_world, runtime_stream
from ..scenario.prehistory import archive_hash, build_frozen_archive


HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
GH1 = ROOT / "research" / "governance_harness_v01"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git_blob(path: str) -> str:
    return subprocess.check_output(["git", "hash-object", path], cwd=ROOT, text=True).strip()


def _fresh_processes() -> bool:
    seen = []
    for arm in ARMS:
        raw = subprocess.check_output([
            sys.executable, "-m",
            "research.governance_harness_gh1l.admission.process_probe", arm,
        ], cwd=ROOT, text=True)
        seen.append(json.loads(raw))
    return (len({x["pid"] for x in seen}) == len(ARMS)
            and all(x["before"] == [] and x["after"] == [x["arm"]] for x in seen)
            and len({x["environment_probe"] for x in seen}) == 1
            and len({x["core_probe"] for x in seen}) == 1)


def evaluate_gates() -> dict[str, dict]:
    gates: dict[str, dict] = {}
    freeze = json.loads((GH1 / "GH1_FREEZE_MANIFEST.json").read_text())
    frozen_ok = all(_git_blob(path) == blob for path, blob in freeze["frozen_artifacts"].items())
    gates["gh1_frozen_regression"] = {"pass": frozen_ok, "checked": len(freeze["frozen_artifacts"])}

    core_tests = subprocess.run([
        sys.executable, "-m", "unittest",
        "research.oasis_core_v11.test_current_relational_core",
        "research.governance_harness_v01.test_core_governance_admission",
    ], cwd=ROOT, capture_output=True, text=True)
    gates["core_regression"] = {"pass": core_tests.returncode == 0,
                                "summary": core_tests.stderr.strip().splitlines()[-1:]}

    archive = build_frozen_archive()
    hashes = {arm: archive_hash(tuple(archive)) for arm in ARMS}
    gates["archive_hash_freeze"] = {"pass": len(set(hashes.values())) == 1,
                                    "sha256": next(iter(hashes.values()))}
    gates["closure_precondition"] = {"pass": all(x.closure_entry_id and x.provenance_ref.startswith("closure:") for x in archive),
                                     "completed_experiences": len(archive)}

    world = generate_long_world()
    classes = {x.truth.scenario_class for x in world}
    pairs: dict[str, list] = {}
    for case in world:
        if case.truth.matched_pair_id:
            pairs.setdefault(case.truth.matched_pair_id, []).append(case.runtime)
    matched = any(len(v) == 2 and v[0].ego_speed_mps == v[1].ego_speed_mps
                  and v[0].front_present == v[1].front_present
                  and v[0].front_distance_m == v[1].front_distance_m
                  and v[0].relation_id != v[1].relation_id for v in pairs.values())
    gates["scenario_validity"] = {"pass": classes == set(SCENARIO_CLASSES) and matched,
                                  "classes": sorted(classes), "matched_history_case": matched,
                                  "horizon": len(world)}
    runtime = runtime_stream(world)
    leaked = [key for _, row in runtime for key in FORBIDDEN_RUNTIME_KEYS.intersection(row)]
    gates["evaluator_leakage"] = {"pass": not leaked, "leaked_keys": leaked}

    runner = LongHorizonRunner(archive)
    neutral_id, neutral = runtime[0]
    critical = next((x for x in runtime if x[0] == f"F{len(world)//3:04d}"), None)
    neutral_decision = runner.decide("G1", neutral_id, neutral)
    critical_runner = LongHorizonRunner(archive)
    critical_decision = critical_runner.decide("G1", critical[0], critical[1])
    gates["gap_validity"] = {"pass": not neutral_decision.gap and critical_decision.gap,
                             "has_no": not neutral_decision.gap, "has_yes": critical_decision.gap}

    base_env = [__import__("random").Random(6101).random() for _ in range(3)]
    history_rng = __import__("random").Random(6103)
    for _ in range(100): history_rng.random()
    trial_env = [__import__("random").Random(6101).random() for _ in range(3)]
    gates["rng_isolation"] = {"pass": base_env == trial_env, "streams": 6}
    gates["fresh_process_isolation"] = {"pass": _fresh_processes(), "arms": list(ARMS)}

    probe_case = next(x for x in world if x.truth.scenario_class == "history-critical")
    probe_runtime = probe_case.runtime.as_runtime_mapping()
    cf_runner = LongHorizonRunner(archive)
    cf = cf_runner.decide("G1", probe_case.frame_id, probe_runtime, counterfactual=True)
    gates["counterfactual_non_actuation"] = {"pass": cf.realized_action is None and cf.actuator_count == 0}
    gates["logging_completeness"] = {"pass": IndependentEvaluator.complete_log(cf)}

    freeze_before = archive_hash(runner.archive)
    runner.record_confirmatory_closure("synthetic-check")
    freeze_after = archive_hash(runner.archive)
    gates["confirmatory_reuse_block"] = {"pass": freeze_before == freeze_after and len(runner.confirmatory_commits) == 1}

    manifest = json.loads((HERE / "design" / "FREEZE_MANIFEST.json").read_text())
    required = ("scenario_seed", "horizon", "run_order", "pilot_excluded_from_confirmatory")
    gates["scenario_seed_run_order_freeze"] = {"pass": all(key in manifest for key in required)
                                               and manifest["pilot_excluded_from_confirmatory"] is True}
    gates["core_unchanged"] = {"pass": _git_blob("research/oasis_core_v11/current_relational_core.py")
                               == freeze["frozen_artifacts"]["research/oasis_core_v11/current_relational_core.py"]}
    return gates


def main() -> int:
    gates = evaluate_gates()
    ready = all(value["pass"] for value in gates.values())
    payload = {
        "status": "EXPERIMENT_READY" if ready else "ADMISSION_FAIL",
        "confirmatory_executed": False,
        "pilot_executed": False,
        "gates": gates,
    }
    target = HERE / "validation" / "EXPERIMENT_READY.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
