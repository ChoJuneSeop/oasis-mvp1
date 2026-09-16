from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from ..evaluator import IndependentEvaluator
from ..models import ARMS
from ..scenario.generator import generate_long_world, runtime_stream
from ..scenario.prehistory import archive_hash, build_frozen_archive
from .engine import LongHorizonRunner


HERE = Path(__file__).resolve().parents[1]


def run_stage(stage: str, seed: int, horizon: int) -> dict:
    if stage not in {"pilot", "confirmatory"}:
        raise ValueError(stage)
    if stage == "confirmatory":
        freeze = HERE / "design" / "CONFIRMATORY_COUNT_FREEZE.json"
        if not freeze.exists():
            raise RuntimeError("confirmatory is locked until pilot-derived count freeze exists")
    archive = build_frozen_archive()
    world = generate_long_world(seed, horizon)
    decisions = []
    for arm in ARMS:
        runner = LongHorizonRunner(archive, seed=seed)
        for frame_id, runtime in runtime_stream(world):
            decisions.append(runner.decide(arm, frame_id, runtime))
    evaluator = IndependentEvaluator(tuple(x.truth for x in world))
    return {
        "stage": stage, "seed": seed, "horizon": horizon,
        "archive_sha256": archive_hash(archive),
        "metrics": evaluator.evaluate(tuple(decisions)),
        "decisions": [asdict(x) for x in decisions],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("pilot", "confirmatory"), required=True)
    parser.add_argument("--seed", type=int, default=6101)
    parser.add_argument("--horizon", type=int, default=512)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run_stage(args.stage, args.seed, args.horizon)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
