from __future__ import annotations

import json
import os
import random
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from research.governance_harness_v01.harness import GapAssessment
from research.governance_harness_v01.harness_v04 import CurrentFlowGapRule, PresentFlowEvidence


class GH1PreexecutionError(RuntimeError):
    pass


@dataclass(frozen=True)
class DetectorValidationCase:
    case_id: str
    speeds: tuple[float, ...]
    expected_gap: bool


def evaluate_current_flow_gap(
    evidence: PresentFlowEvidence,
    rule: CurrentFlowGapRule,
) -> GapAssessment:
    """Frozen GH-1 detector semantics: current-flow-only speed-drop detection."""
    samples = evidence.samples
    detected = False
    if len(samples) > 1:
        detected = (
            samples[-2].observation.ego_speed_mps
            - samples[-1].observation.ego_speed_mps
            >= rule.speed_drop_threshold
        )
    return GapAssessment(
        detected,
        progress_anomalies=("speed-drop",) if detected else (),
        current_evidence_refs=(f"sample:{len(samples)}",),
    )


def build_rng_streams(seed_manifest: Mapping[str, int]) -> dict[str, random.Random]:
    required = {
        "environment_rng",
        "core_rng",
        "history_rng",
        "participation_rng",
        "evaluator_rng",
        "run_order_rng",
    }
    if set(seed_manifest) != required:
        raise GH1PreexecutionError("RNG manifest must contain exactly the frozen subsystem streams")
    seeds = [int(seed_manifest[name]) for name in sorted(required)]
    if len(seeds) != len(set(seeds)):
        raise GH1PreexecutionError("subsystem RNG seeds must be distinct")
    return {name: random.Random(int(seed)) for name, seed in seed_manifest.items()}


def run_fresh_process_probe(arm: str) -> dict[str, object]:
    cmd = [
        sys.executable,
        "-m",
        "research.governance_harness_v01.gh1_process_probe",
        arm,
    ]
    completed = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(completed.stdout.strip())


def load_json(path: str | os.PathLike[str]) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def repository_root() -> Path:
    return Path(__file__).resolve().parents[2]
