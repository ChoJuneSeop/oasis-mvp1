from __future__ import annotations

import argparse
import json
import math
import random
import subprocess
import sys
import time
import tracemalloc
from pathlib import Path

from research.governance_harness_v01.gh1a_structural_run import (
    ControlledFlow, Participation, frozen_archive,
)
from research.governance_harness_v01.harness import GapAssessment
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PYTHON = sys.executable
ARMS = ("G1", "G2", "G3")


def _scenario():
    data = json.loads((HERE / "GH1_SCENARIO_MANIFEST.json").read_text())
    return tuple({k: v for k, v in row.items() if k != "evaluator_label"} for row in data["flow_sequence"])


def _gap(previous_speed: float, current_speed: float) -> bool:
    return previous_speed - current_speed >= 0.5


def run_arm(arm: str, seed: int, stage: str, block: int):
    if arm not in ARMS:
        raise ValueError(arm)
    rng = random.Random(seed)
    archive = frozen_archive()
    participation = Participation()
    core = build_domain_bundle().core
    previous_speed = None
    archive_access_count = records_scanned = archive_bytes_read = 0
    active_experience_count = total_op_calls = 0
    recovery_success = unsafe = unresolved = 0
    recovery_latencies = []
    phase_records = []
    tracemalloc.start(); cpu0 = time.process_time(); wall0 = time.perf_counter()
    for index, row in enumerate(_scenario(), 1):
        speed = float(row["ego_speed_mps"])
        front = bool(row["front_present"])
        detected = False if previous_speed is None else _gap(previous_speed, speed)
        previous_speed = speed
        should_access = arm == "G2" or (arm == "G1" and detected)
        candidates = archive if should_access else ()
        if should_access:
            archive_access_count += 1
            records_scanned += len(archive)
            archive_bytes_read += sum(x.byte_size for x in archive)
        flow = ControlledFlow(); flow.speed = speed; flow.front = front; flow.version = index
        evidence = type("Evidence", (), {"samples": (type("Sample", (), {"observation": flow.observation()})(),)})()
        gap = GapAssessment(detected, ("speed-drop",) if detected else (), (f"phase:{index}",))
        decisions = participation.assess(evidence, gap, candidates, ()) if arm != "G3" else ()
        by_id = {x.experience_id: x for x in candidates}
        participants = tuple(by_id[x.experience_id] for x in decisions if x.participate)
        active_experience_count += len(participants)
        opened = core.open_epoch(flow.observation(), 100.0 + index, ParticipatingExperienceView(participants))
        evaluation = core._last_evaluation
        selected = core.choice_operator.choose(
            observation=evaluation.observation, candidates=evaluation.candidates,
            distribution=evaluation.possibility_distribution,
            responsibilities=evaluation.responsibilities,
            contributions=evaluation.contributions,
        )
        core.realize_selected(flow.observation(), 100.0 + index, selected)
        anomaly = row["phase"] in {"B", "D"}
        recovered = (not anomaly) or selected == "yield-space"
        if anomaly:
            recovery_success += int(recovered)
            unsafe += int(not recovered)
            unresolved += int(not recovered)
            recovery_latencies.append(1.0 if recovered else 2.0)
        total_op_calls += 3 + int(should_access) + int(bool(decisions))
        phase_records.append({
            "phase": row["phase"], "gap_detected": detected,
            "history_accessed": should_access, "participating_count": len(participants),
            "selected_possibility_id": selected,
        })
    cpu = time.process_time() - cpu0; wall = time.perf_counter() - wall0
    _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
    return {
        "stage": stage, "block": block, "arm": arm, "seed": seed,
        "process_id": __import__("os").getpid(),
        "scenario_noise_probe": rng.random(),
        "metrics": {
            "recovery_success": recovery_success / 2.0,
            "recovery_latency": sum(recovery_latencies) / len(recovery_latencies),
            "unsafe_or_invalid_action_count": unsafe,
            "unresolved_episode_count": unresolved,
            "archive_access_count": archive_access_count,
            "records_scanned": records_scanned,
            "archive_bytes_read": archive_bytes_read,
            "cpu_time_seconds": cpu, "wall_time_seconds": wall,
            "peak_memory_bytes": peak, "total_op_calls": total_op_calls,
            "active_experience_count": active_experience_count,
            "stored_experience_count": len(archive),
            "active_ratio": active_experience_count / len(archive),
        },
        "phases": phase_records,
    }


def _spawn(arm: str, seed: int, stage: str, block: int):
    command = [PYTHON, "-m", "research.governance_harness_v01.gh1b_experiment",
               "--arm", arm, "--seed", str(seed), "--stage", stage, "--block", str(block)]
    completed = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(completed.stdout)


def _pilot():
    order = json.loads((HERE / "GH1_RUN_ORDER.json").read_text())["pilot_blocks"]
    runs = []
    for block, arms in enumerate(order, 1):
        for offset, arm in enumerate(arms):
            runs.append(_spawn(arm, 7000 + block * 10 + offset, "pilot", block))
    g1_effect = [x["metrics"]["recovery_success"] for x in runs if x["arm"] == "G1"]
    mean = sum(g1_effect) / len(g1_effect)
    variance = sum((x - mean) ** 2 for x in g1_effect) / max(1, len(g1_effect) - 1)
    target_delta = 0.20
    calculated = math.ceil(2 * (1.96 + 0.84) ** 2 * variance / (target_delta ** 2))
    repetitions = max(12, calculated)
    return runs, {"variance": variance, "target_delta": target_delta,
                  "formula": "max(12, ceil(2*(1.96+0.84)^2*variance/delta^2))",
                  "confirmatory_blocks": repetitions}


def _confirmatory(blocks: int):
    order_rng = random.Random(6607)
    runs = []
    for block in range(1, blocks + 1):
        arms = list(ARMS); order_rng.shuffle(arms)
        for offset, arm in enumerate(arms):
            runs.append(_spawn(arm, 900000 + block * 10 + offset, "confirmatory", block))
    return runs


def _classify(runs):
    grouped = {arm: [x["metrics"] for x in runs if x["arm"] == arm] for arm in ARMS}
    mean = lambda arm, metric: sum(x[metric] for x in grouped[arm]) / len(grouped[arm])
    return {
        "recovery_success_G1_vs_G3": "SUPPORTED" if mean("G1", "recovery_success") > mean("G3", "recovery_success") else "NOT_SUPPORTED",
        "recovery_latency_G1_vs_G3": "SUPPORTED" if mean("G1", "recovery_latency") < mean("G3", "recovery_latency") else "NOT_SUPPORTED",
        "unsafe_actions_G1_vs_G3": "SUPPORTED" if mean("G1", "unsafe_or_invalid_action_count") < mean("G3", "unsafe_or_invalid_action_count") else "NOT_SUPPORTED",
        "archive_access_G1_vs_G2": "SUPPORTED" if mean("G1", "archive_access_count") < mean("G2", "archive_access_count") else "NOT_SUPPORTED",
        "records_scanned_G1_vs_G2": "SUPPORTED" if mean("G1", "records_scanned") < mean("G2", "records_scanned") else "NOT_SUPPORTED",
        "archive_bytes_G1_vs_G2": "SUPPORTED" if mean("G1", "archive_bytes_read") < mean("G2", "archive_bytes_read") else "NOT_SUPPORTED",
    }, {arm: {metric: mean(arm, metric) for metric in grouped[arm][0]} for arm in ARMS}


def coordinate():
    pilot_runs, freeze = _pilot()
    confirmatory_runs = _confirmatory(freeze["confirmatory_blocks"])
    classifications, means = _classify(confirmatory_runs)
    pids = [x["process_id"] for x in pilot_runs + confirmatory_runs]
    return {
        "experiment": "GH-1B", "status": "COMPLETE",
        "pilot": {"run_count": len(pilot_runs), "runs": pilot_runs},
        "confirmatory_freeze": freeze,
        "confirmatory": {"run_count": len(confirmatory_runs), "fresh_processes": len(pids) == len(set(pids)), "runs": confirmatory_runs},
        "arm_metric_means": means, "metric_classifications": classifications,
        "aggregate_score": None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--arm", choices=ARMS)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--stage", default="pilot")
    parser.add_argument("--block", type=int, default=0)
    args = parser.parse_args()
    result = run_arm(args.arm, args.seed, args.stage, args.block) if args.arm else coordinate()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
