from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Sequence

from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

from .models import ARMS, ArmDecision, ResponsibilityContext, RuntimeFrame, ScenarioCase
from .responsibility import current_trace, permuted_trace, stale_trace
from .scenario import build_confirmatory_world, build_pilot_world

HERE = Path(__file__).resolve().parent
MANIFEST_PATH = HERE / "design" / "FREEZE_MANIFEST.json"
RESULTS_DIR = HERE / "results"


def _distribution_select(distribution):
    return max(distribution, key=lambda key: (float(distribution[key]), key))


def _jsonable(value):
    if is_dataclass(value):
        return _jsonable(asdict(value))
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [_jsonable(v) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(_jsonable(v) for v in value)
    return value


def _runtime_to_json(frame: RuntimeFrame) -> dict:
    return {
        "frame_id": frame.frame_id,
        "relation_id": frame.relation_id,
        "observation": asdict(frame.observation),
        "responsibility_context": asdict(frame.responsibility_context),
    }


def _runtime_from_json(data: dict) -> RuntimeFrame:
    from research.carla_v22_harness_v11.canonical_harness import PresentObservation

    return RuntimeFrame(
        str(data["frame_id"]),
        str(data["relation_id"]),
        PresentObservation(**data["observation"]),
        ResponsibilityContext(**data["responsibility_context"]),
    )


def run_arm(arm: str, frames: tuple[RuntimeFrame, ...]) -> dict:
    if arm not in ARMS:
        raise ValueError(arm)
    decisions = []
    previous_current_trace = None
    previous_frame_id = None
    previous_relation_id = None
    realization_count = 0
    worker_token = str(uuid.uuid4())

    for frame in frames:
        core = build_domain_bundle().core
        tau = 20_000.0 + len(decisions)
        view = core.open_epoch(frame.observation, tau, ParticipatingExperienceView(()))
        distribution = dict(view.possibility_distribution)
        candidate_ids = tuple(distribution)
        if candidate_ids != ("continue-flow", "yield-space"):
            raise RuntimeError(f"GH-2 candidate contract changed: {candidate_ids}")

        base = current_trace(candidate_ids, distribution, frame.responsibility_context)
        stale_source = None
        if arm == "R1_CURRENT_BOUND":
            trace = base
            selected = trace.responsibility_selected
            bound = True
        elif arm == "R2_RECORD_ONLY":
            trace = base
            selected = _distribution_select(distribution)
            bound = False
        elif arm == "R3_PERMUTED":
            trace = permuted_trace(base, distribution)
            selected = trace.responsibility_selected
            bound = True
        else:
            # v1.1 stale is pair-local. A new relation_id starts with current
            # responsibility; only the second frame of the same matched pair may
            # reuse the immediately preceding profile.
            same_pair = previous_relation_id == frame.relation_id
            if previous_current_trace is None or not same_pair:
                trace = base
            else:
                trace = stale_trace(previous_current_trace, candidate_ids, distribution)
                stale_source = previous_frame_id
            selected = trace.responsibility_selected
            bound = True

        realization = core.realize_selected(frame.observation, tau, selected)
        realization_count += 1
        if realization.selected_possibility_id != selected:
            raise RuntimeError("selected != realized")

        decisions.append(
            ArmDecision(
                arm,
                frame.frame_id,
                candidate_ids,
                distribution,
                trace,
                selected,
                realization.selected_possibility_id,
                1,
                bound,
                stale_source,
            )
        )
        previous_current_trace = base
        previous_frame_id = frame.frame_id
        previous_relation_id = frame.relation_id

    return {
        "arm": arm,
        "pid": os.getpid(),
        "worker_token": worker_token,
        "initial_previous_trace_empty": True,
        "decision_count": len(decisions),
        "realization_count": realization_count,
        "decisions": [_jsonable(x) for x in decisions],
    }


def _worker() -> int:
    payload = json.load(sys.stdin)
    frames = tuple(_runtime_from_json(x) for x in payload["frames"])
    json.dump(run_arm(payload["arm"], frames), sys.stdout)
    return 0


def run_runtime(frames: tuple[RuntimeFrame, ...]) -> dict:
    workers = []
    for arm in ARMS:
        proc = subprocess.run(
            [sys.executable, "-m", "research.governance_harness_gh2.runner", "--worker"],
            input=json.dumps({"arm": arm, "frames": [_runtime_to_json(x) for x in frames]}),
            text=True,
            capture_output=True,
            check=True,
        )
        workers.append(json.loads(proc.stdout))
    return {"workers": workers}


def run_cases(cases: Sequence[ScenarioCase]) -> dict:
    return run_runtime(tuple(case.runtime for case in cases))


def evaluate_cases(cases: Sequence[ScenarioCase]) -> dict:
    """Post-decision evaluator path.

    Evaluator truth is joined only after all worker decisions have returned. This
    function is intentionally excluded from preflight/dry-run and is reserved for
    the later exact-snapshot experimental execution lineage.
    """
    cases = tuple(cases)
    truth = {case.runtime.frame_id: case.truth for case in cases}
    block = run_cases(cases)
    by_arm = {}
    for worker in block["workers"]:
        resolved = []
        by_family: dict[str, list[int]] = {}
        for decision in worker["decisions"]:
            evaluator = truth[decision["frame_id"]]
            value = int(decision["realized_action"] == evaluator.expected_action)
            resolved.append(value)
            family = evaluator.pair_id.split("-")[1]
            by_family.setdefault(family, []).append(value)
        by_arm[worker["arm"]] = {
            "resolution_rate": sum(resolved) / len(resolved),
            "resolved": resolved,
            "resolution_by_observation_family": {
                family: sum(values) / len(values) for family, values in sorted(by_family.items())
            },
            "decisions": worker["decisions"],
            "pid": worker["pid"],
            "worker_token": worker["worker_token"],
        }
    return {"frame_count": len(cases), "arms": by_arm}


def dry_run() -> dict:
    # Structural-only preflight. No EvaluatorTruth is joined here and no
    # resolution/effect metric is calculated before the experiment.
    cases = build_pilot_world()
    block = run_runtime(tuple(case.runtime for case in cases))
    pids = [worker["pid"] for worker in block["workers"]]
    tokens = [worker["worker_token"] for worker in block["workers"]]
    arms = {}
    for worker in block["workers"]:
        decisions = worker["decisions"]
        arms[worker["arm"]] = {
            "decision_count": worker["decision_count"],
            "realization_count": worker["realization_count"],
            "selected_equals_realized": all(
                decision["enacted_selected"] == decision["realized_action"]
                for decision in decisions
            ),
            "single_realization": all(decision["realization_count"] == 1 for decision in decisions),
        }
    return {
        "stage": "dry-run-structural-only",
        "experiment_executed": False,
        "fresh_process": len(pids) == len(set(pids)) and len(tokens) == len(set(tokens)),
        "pilot_frame_count": len(cases),
        "confirmatory_frame_count_frozen": len(build_confirmatory_world()),
        "arms": arms,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--stage", choices=("dry-run", "pilot", "confirmatory"), default="dry-run")
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.worker:
        return _worker()
    if args.stage != "dry-run":
        raise SystemExit("GH-2 v1.1 pilot/confirmatory execution is locked in the pre-execution branch")
    payload = dry_run()
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
