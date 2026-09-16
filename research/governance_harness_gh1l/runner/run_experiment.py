from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any

from ..action_contract import CANONICAL_CORE_ACTIONS, canonical_action
from ..evaluator import IndependentEvaluator
from ..models import ARMS, ArmDecision
from ..scenario.generator import generate_long_world, runtime_stream
from ..scenario.prehistory import archive_hash, build_frozen_archive
from .engine import LongHorizonRunner


HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
PYTHON = sys.executable
MANIFEST_PATH = HERE / "design" / "FREEZE_MANIFEST.json"
COUNT_FREEZE_PATH = HERE / "design" / "CONFIRMATORY_COUNT_FREEZE.json"
_PROCESS_ARM_STATE: list[str] = []


def _manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def _require_confirmatory_freeze(manifest: dict[str, Any]) -> dict[str, Any]:
    if not COUNT_FREEZE_PATH.exists():
        raise RuntimeError("confirmatory is locked until pilot-derived count freeze exists")
    freeze = json.loads(COUNT_FREEZE_PATH.read_text(encoding="utf-8"))
    if freeze.get("status") != "COUNT_FROZEN":
        raise RuntimeError("confirmatory count freeze is not in COUNT_FROZEN state")
    if freeze.get("spec_version") != manifest["spec_version"]:
        raise RuntimeError("confirmatory count freeze spec version mismatch")
    blocks = freeze.get("confirmatory_blocks")
    if not isinstance(blocks, int) or blocks < int(manifest["power_analysis"]["min_confirmatory_blocks"]):
        raise RuntimeError("confirmatory count freeze contains an invalid block count")
    return freeze


def _runner_seed(environment_seed: int, manifest: dict[str, Any]) -> int:
    return environment_seed * 10_000 + int(manifest["rng_seeds"]["participation"])


def _claim_fresh_process(stage: str, block: int, arm: str) -> dict[str, Any]:
    before = list(_PROCESS_ARM_STATE)
    if before:
        raise RuntimeError(f"fresh-process contract violated; existing state={before}")
    marker = f"{stage}:{block}:{arm}"
    _PROCESS_ARM_STATE.append(marker)
    return {
        "pid": os.getpid(),
        "process_token": f"{os.getpid()}:{time.time_ns()}:{uuid.uuid4().hex}",
        "state_before": before,
        "state_after": list(_PROCESS_ARM_STATE),
        "marker": marker,
    }


def _history_sensitive_metrics(
    decisions: tuple[ArmDecision, ...],
    world,
    history_sensitive_classes: set[str],
) -> dict[str, float | int]:
    truth_by_frame = {
        case.frame_id: case.truth
        for case in world
        if case.truth.scenario_class in history_sensitive_classes
    }
    target = tuple(d for d in decisions if d.frame_id in truth_by_frame)
    resolved = sum(
        canonical_action(d.selected_action)
        == canonical_action(truth_by_frame[d.frame_id].expected_action)
        for d in target
    )
    unsafe = sum(canonical_action(d.selected_action) not in CANONICAL_CORE_ACTIONS for d in target)
    unresolved = sum(d.selected_action == "unresolved" for d in target)
    total = len(target)
    return {
        "history_sensitive_total": total,
        "history_sensitive_resolved": resolved,
        "history_sensitive_resolution_rate": (resolved / total) if total else 0.0,
        "history_sensitive_unsafe_or_invalid": unsafe,
        "history_sensitive_unresolved": unresolved,
    }


def _run_arm(stage: str, arm: str, seed: int, horizon: int, block: int) -> dict[str, Any]:
    if arm not in ARMS:
        raise ValueError(arm)
    manifest = _manifest()
    if horizon != int(manifest["horizon"]):
        raise RuntimeError("worker horizon differs from frozen manifest")
    if stage == "confirmatory":
        _require_confirmatory_freeze(manifest)

    process = _claim_fresh_process(stage, block, arm)
    archive = build_frozen_archive()
    world = generate_long_world(seed, horizon)
    runner = LongHorizonRunner(archive, seed=_runner_seed(seed, manifest))
    decisions = tuple(
        runner.decide(arm, frame_id, runtime)
        for frame_id, runtime in runtime_stream(world)
    )

    evaluator = IndependentEvaluator(tuple(case.truth for case in world))
    metrics = evaluator.evaluate(decisions)
    total = int(metrics.get("total", 0))
    normalized = {
        "resolution_rate": (metrics.get("resolved", 0) / total) if total else 0.0,
        "unsafe_or_invalid_rate": (metrics.get("unsafe_or_invalid", 0) / total) if total else 0.0,
        "unresolved_rate": (metrics.get("unresolved", 0) / total) if total else 0.0,
        "archive_access_rate": (metrics.get("archive_access", 0) / total) if total else 0.0,
    }
    normalized.update(_history_sensitive_metrics(
        decisions, world, set(manifest["history_sensitive_classes"])
    ))
    return {
        "stage": stage,
        "block": block,
        "arm": arm,
        "seed": seed,
        "horizon": horizon,
        "spec_version": manifest["spec_version"],
        "archive_sha256": archive_hash(archive),
        "process": process,
        "metrics": metrics,
        "normalized": normalized,
        "decisions": [asdict(item) for item in decisions],
    }


def _probe_worker(arm: str) -> dict[str, Any]:
    manifest = _manifest()
    return {
        "arm": arm,
        "spec_version": manifest["spec_version"],
        "process": _claim_fresh_process("probe", 0, arm),
    }


def _spawn_worker(stage: str, arm: str, seed: int, horizon: int, block: int, *, probe: bool = False) -> dict[str, Any]:
    command = [PYTHON, "-m", "research.governance_harness_gh1l.runner.run_experiment"]
    if probe:
        command += ["--probe-process", "--arm", arm]
    else:
        command += [
            "--stage", stage,
            "--arm", arm,
            "--seed", str(seed),
            "--horizon", str(horizon),
            "--block", str(block),
        ]
    completed = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(completed.stdout)


def probe_fresh_arm_processes() -> dict[str, Any]:
    probes = [_spawn_worker("pilot", arm, 0, 0, 0, probe=True) for arm in ARMS]
    clean = all(
        item["process"]["state_before"] == []
        and item["process"]["state_after"] == [item["process"]["marker"]]
        for item in probes
    )
    tokens = [item["process"]["process_token"] for item in probes]
    return {
        "pass": clean and len(tokens) == len(set(tokens)),
        "arms": list(ARMS),
        "worker_tokens_unique": len(tokens) == len(set(tokens)),
        "all_workers_clean": clean,
        "pids": [item["process"]["pid"] for item in probes],
    }


def _mean(rows: list[dict[str, Any]], key: str) -> float:
    return sum(float(row[key]) for row in rows) / len(rows)


def _summarize_runs(runs: list[dict[str, Any]], manifest: dict[str, Any]) -> dict[str, Any]:
    block_ids = sorted({int(run["block"]) for run in runs})
    paired_primary: list[float] = []
    archive_delta: list[float] = []
    g1_g4_resolution_delta: list[float] = []
    g1_g5_resolution_delta: list[float] = []

    for block in block_ids:
        by_arm = {run["arm"]: run for run in runs if int(run["block"]) == block}
        if set(by_arm) != set(ARMS):
            raise RuntimeError(f"block {block} does not contain all frozen arms")
        g1 = by_arm["G1"]["normalized"]
        g2 = by_arm["G2"]["normalized"]
        g3 = by_arm["G3"]["normalized"]
        g4 = by_arm["G4"]["normalized"]
        g5 = by_arm["G5"]["normalized"]
        paired_primary.append(float(g1["history_sensitive_resolution_rate"]) - float(g3["history_sensitive_resolution_rate"]))
        archive_delta.append(float(g1["archive_access_rate"]) - float(g2["archive_access_rate"]))
        g1_g4_resolution_delta.append(float(g1["history_sensitive_resolution_rate"]) - float(g4["history_sensitive_resolution_rate"]))
        g1_g5_resolution_delta.append(float(g1["history_sensitive_resolution_rate"]) - float(g5["history_sensitive_resolution_rate"]))

    arm_means: dict[str, dict[str, float]] = {}
    for arm in ARMS:
        rows = [run["normalized"] for run in runs if run["arm"] == arm]
        arm_means[arm] = {
            "resolution_rate": _mean(rows, "resolution_rate"),
            "history_sensitive_resolution_rate": _mean(rows, "history_sensitive_resolution_rate"),
            "archive_access_rate": _mean(rows, "archive_access_rate"),
            "unsafe_or_invalid_rate": _mean(rows, "unsafe_or_invalid_rate"),
            "unresolved_rate": _mean(rows, "unresolved_rate"),
        }

    return {
        "arm_metric_means": arm_means,
        "paired_metrics": {
            manifest["primary_paired_metric"]: paired_primary,
            "archive_access_rate_G1_minus_G2": archive_delta,
            "history_sensitive_resolution_rate_G1_minus_G4": g1_g4_resolution_delta,
            "history_sensitive_resolution_rate_G1_minus_G5": g1_g5_resolution_delta,
        },
    }


def _coordinate_stage(stage: str) -> dict[str, Any]:
    manifest = _manifest()
    horizon = int(manifest["horizon"])
    order = tuple(manifest["run_order"])
    if order != ARMS:
        raise RuntimeError("frozen run order must enumerate G1-G5 exactly once")

    if stage == "pilot":
        seeds = [int(x) for x in manifest["pilot_seeds"]]
        if len(seeds) != int(manifest["pilot_blocks"]):
            raise RuntimeError("pilot seed count does not match frozen pilot block count")
        count_freeze = None
    elif stage == "confirmatory":
        count_freeze = _require_confirmatory_freeze(manifest)
        blocks = int(count_freeze["confirmatory_blocks"])
        base = int(manifest["confirmatory_seed_base"])
        seeds = [base + block for block in range(1, blocks + 1)]
    else:
        raise ValueError(stage)

    runs: list[dict[str, Any]] = []
    for block, seed in enumerate(seeds, 1):
        for arm in order:
            runs.append(_spawn_worker(stage, arm, seed, horizon, block))

    process_clean = all(
        run["process"]["state_before"] == []
        and run["process"]["state_after"] == [run["process"]["marker"]]
        for run in runs
    )
    tokens = [run["process"]["process_token"] for run in runs]
    hashes = {run["archive_sha256"] for run in runs}
    if len(hashes) != 1:
        raise RuntimeError("archive hash differs across fresh-process arm workers")

    summary = _summarize_runs(runs, manifest)
    return {
        "experiment": "GH-1L",
        "spec_version": manifest["spec_version"],
        "stage": stage,
        "block_count": len(seeds),
        "run_count": len(runs),
        "horizon": horizon,
        "run_order": list(order),
        "archive_sha256": next(iter(hashes)),
        "fresh_process_contract": {
            "all_workers_clean": process_clean,
            "worker_tokens_unique": len(tokens) == len(set(tokens)),
            "pass": process_clean and len(tokens) == len(set(tokens)),
        },
        "pilot_excluded_from_confirmatory": bool(manifest["pilot_excluded_from_confirmatory"]),
        "confirmatory_count_freeze": count_freeze,
        **summary,
        "runs": runs,
    }


def run_stage(stage: str, seed: int | None = None, horizon: int | None = None) -> dict[str, Any]:
    manifest = _manifest()
    if seed is not None or (horizon is not None and horizon != int(manifest["horizon"])):
        raise RuntimeError("stage-level seed/horizon overrides are not permitted by the frozen design")
    return _coordinate_stage(stage)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("pilot", "confirmatory"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--arm", choices=ARMS)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--horizon", type=int)
    parser.add_argument("--block", type=int)
    parser.add_argument("--probe-process", action="store_true")
    args = parser.parse_args()

    if args.probe_process:
        if not args.arm:
            parser.error("--probe-process requires --arm")
        result = _probe_worker(args.arm)
    elif args.arm:
        if args.stage is None or args.seed is None or args.horizon is None or args.block is None:
            parser.error("internal arm worker requires --stage --seed --horizon --block")
        result = _run_arm(args.stage, args.arm, args.seed, args.horizon, args.block)
    else:
        if args.stage is None:
            parser.error("coordinator requires --stage")
        result = _coordinate_stage(args.stage)

    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
