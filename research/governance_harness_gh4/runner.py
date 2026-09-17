from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import asdict
from pathlib import Path

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.governance_harness_v01.harness_v04 import (
    AdmissionState,
    AtomicFlowSnapshot,
    CurrentFlowGapRule,
    GovernanceHarnessV04,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

from .history import IntegratedHistoryPort, baseline_experience
from .models import ARMS, EpisodeRuntime, EpochResult
from .operators import IntegratedResponsibility, IntegratedSelectiveParticipation, OutcomeRevalidationOperator
from .scenario import RELATIONS, build_pilot_world


BASELINE_DENSITIES = {
    "GH4-REL-A": 1,
    "GH4-REL-B": 2,
    "GH4-REL-C": 3,
}


class LongHorizonFlow:
    def __init__(self):
        self.relation_id = RELATIONS[0]
        self._observation = PresentObservation(
            epoch=0,
            ego_speed_mps=0.0,
            front_present=False,
            front_gap_m=0.0,
            front_closing_mps=0.0,
            front_kind="none",
            local_heading_error_deg=0.0,
            local_density=0,
        )
        self.tau = 100.0
        self.version = 1
        self.last_ref = None
        self.apply_count = 0

    def start_episode(self, relation_id: str, observation: PresentObservation) -> None:
        self.relation_id = relation_id
        self._observation = observation
        self.tau += 1.0
        self.version += 1

    def set_observation(self, observation: PresentObservation) -> None:
        self._observation = observation
        self.tau += 0.1
        self.version += 1

    def atomic_current_snapshot(self) -> AtomicFlowSnapshot:
        o = self._observation
        return AtomicFlowSnapshot(
            tau=self.tau,
            observation=o,
            current_reality={"phase": "gh4-long-flow", "route": self.relation_id},
            version=self.version,
            fingerprint=(
                f"gh4:v{self.version}:t{self.tau}:r{self.relation_id}:"
                f"e{o.epoch}:s{o.ego_speed_mps}:g{o.front_gap_m}:"
                f"c{o.front_closing_mps}:h{o.local_heading_error_deg}:d{o.local_density}"
            ),
            relation_id=self.relation_id,
            realization_ref=self.last_ref,
        )

    def current_flow_version(self) -> int:
        return self.version

    def apply_single_actuation(self, _actuation):
        self.apply_count += 1
        self.tau += 0.05
        self.version += 1
        self.last_ref = f"gh4-real:{self.apply_count}:{self.relation_id}"
        return self.last_ref


def _obs_to_json(value: PresentObservation) -> dict:
    return asdict(value)


def _obs_from_json(value: dict) -> PresentObservation:
    return PresentObservation(**value)


def _runtime_to_json(value: EpisodeRuntime) -> dict:
    return {
        "episode_id": value.episode_id,
        "relation_id": value.relation_id,
        "pre_observation": _obs_to_json(value.pre_observation),
        "decision_observation": _obs_to_json(value.decision_observation),
        "post_observation": _obs_to_json(value.post_observation),
    }


def _runtime_from_json(value: dict) -> EpisodeRuntime:
    return EpisodeRuntime(
        episode_id=str(value["episode_id"]),
        relation_id=str(value["relation_id"]),
        pre_observation=_obs_from_json(value["pre_observation"]),
        decision_observation=_obs_from_json(value["decision_observation"]),
        post_observation=_obs_from_json(value["post_observation"]),
    )


def _make_harness(arm: str):
    baselines = tuple(baseline_experience(relation, BASELINE_DENSITIES[relation]) for relation in RELATIONS)
    port = IntegratedHistoryPort(baselines, arm)
    bundle = build_domain_bundle()
    harness = GovernanceHarnessV04(
        core=bundle.core,
        history_port=port,
        gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
        reengagement_operator=IntegratedSelectiveParticipation(arm),
        responsibility_operator=IntegratedResponsibility(arm),
        revalidation_operator=OutcomeRevalidationOperator(),
    )
    if harness.admission.state is not AdmissionState.ADMITTED:
        raise RuntimeError(f"GH-4 Core admission blocked: {harness.admission.reasons}")
    return harness, port


def run_arm(arm: str, episodes: tuple[EpisodeRuntime, ...]) -> dict:
    if arm not in ARMS:
        raise ValueError(arm)

    harness, port = _make_harness(arm)
    flow = LongHorizonFlow()
    results = []
    worker_token = str(uuid.uuid4())

    for episode in episodes:
        port.last_decision_eligible_ids = ()
        port.last_decision_eligible_taus = ()
        port.set_current_scope(episode.decision_observation.local_density)

        flow.start_episode(episode.relation_id, episode.pre_observation)
        harness.capture_current(flow, episode.relation_id)
        flow.set_observation(episode.decision_observation)
        before_apply = flow.apply_count

        decision = harness.execute_decision_epoch(flow, relation_id=episode.relation_id)
        if decision.responsibility.selected_candidate_id != decision.decision.realization.selected_possibility_id:
            raise RuntimeError("GH-4 selected != realized")
        if flow.apply_count != before_apply + 1:
            raise RuntimeError("GH-4 requires exactly one realization per epoch")
        if any(tau >= decision.decision.tau for tau in port.last_decision_eligible_taus):
            raise RuntimeError("GH-4 same/future completed experience entered decision archive")

        eligible_ids = tuple(port.last_decision_eligible_ids)
        eligible_taus = tuple(port.last_decision_eligible_taus)
        participants = tuple(x.experience_id for x in decision.reengagement if x.participate)
        revised_blocks = sum(1 for x in decision.reengagement if x.rationale == "revised-same-scope-block")
        archive_access = int(decision.metrics.archive_access_count)
        feedback_count = int(port.last_feedback_exposed_count)

        flow.set_observation(episode.post_observation)
        closed = harness.observe_post(flow)
        if closed.pending or closed.history_entry is None or closed.revalidation is None:
            raise RuntimeError("GH-4 epoch did not reach Closure and commit")
        if flow.apply_count != before_apply + 1:
            raise RuntimeError("GH-4 Closure changed realization count")

        obligations = tuple(closed.responsibility.selected_obligations)
        bound = any(x == "responsibility-bound:true" for x in obligations)

        results.append(EpochResult(
            arm=arm,
            episode_id=episode.episode_id,
            relation_id=episode.relation_id,
            gap_detected=bool(closed.gap.detected),
            archive_access_count=archive_access,
            decision_eligible_ids=eligible_ids,
            decision_eligible_completed_taus=eligible_taus,
            participant_ids=participants,
            revised_block_count=revised_blocks,
            feedback_exposed_count=feedback_count,
            responsibility_candidate_ids=tuple(closed.responsibility.candidate_ids),
            responsibility_selected=str(closed.responsibility.selected_candidate_id),
            responsibility_bound=bound,
            selected=str(closed.responsibility.selected_candidate_id),
            realized=str(closed.decision.realization.selected_possibility_id),
            realization_count=1,
            revalidation_state=closed.revalidation.choice_judgment.value,
            closure_entry_id=closed.history_entry.entry_id,
            stored_experience_count_after=port.decision_experience_count,
            run_created_experience_count_after=port.run_created_experience_count,
        ))

    return {
        "arm": arm,
        "pid": os.getpid(),
        "worker_token": worker_token,
        "persistent_core": True,
        "persistent_harness": True,
        "persistent_history_port": True,
        "reset_count": 0,
        "decision_count": len(results),
        "realization_count": flow.apply_count,
        "commit_count": port.committed_count,
        "final_decision_experience_count": port.decision_experience_count,
        "final_run_created_experience_count": port.run_created_experience_count,
        "results": [asdict(x) for x in results],
    }


def _worker() -> int:
    payload = json.load(sys.stdin)
    episodes = tuple(_runtime_from_json(x) for x in payload["episodes"])
    json.dump(run_arm(payload["arm"], episodes), sys.stdout)
    return 0


def run_runtime(episodes: tuple[EpisodeRuntime, ...]) -> dict:
    workers = []
    for arm in ARMS:
        proc = subprocess.run(
            [sys.executable, "-m", "research.governance_harness_gh4.runner", "--worker"],
            input=json.dumps({
                "arm": arm,
                "episodes": [_runtime_to_json(x) for x in episodes],
            }),
            text=True,
            capture_output=True,
            check=True,
        )
        workers.append(json.loads(proc.stdout))
    return {"workers": workers}


def dry_run() -> dict:
    """Structural preflight only. No scientific evaluator or pairwise contrast is computed."""
    cases = build_pilot_world()
    block = run_runtime(tuple(case.runtime for case in cases))
    pids = [x["pid"] for x in block["workers"]]
    tokens = [x["worker_token"] for x in block["workers"]]
    structural = {}

    for worker in block["workers"]:
        rows = worker["results"]
        if worker["decision_count"] != 12 or worker["realization_count"] != 12 or worker["commit_count"] != 12:
            raise RuntimeError("GH-4 dry-run horizon contract changed")
        for row in rows:
            if row["selected"] != row["realized"] or row["realization_count"] != 1:
                raise RuntimeError("GH-4 dry-run realization invariant failed")
            if row["gap_detected"] and row["archive_access_count"] != 1:
                raise RuntimeError("GH-4 Gap epoch must perform one archive search")
            if (not row["gap_detected"]) and row["archive_access_count"] != 0:
                raise RuntimeError("GH-4 no-Gap epoch accessed archive")
        structural[worker["arm"]] = {
            "decision_count": worker["decision_count"],
            "realization_count": worker["realization_count"],
            "commit_count": worker["commit_count"],
            "persistent_core": worker["persistent_core"],
            "persistent_harness": worker["persistent_harness"],
            "persistent_history_port": worker["persistent_history_port"],
            "reset_count": worker["reset_count"],
            "selected_equals_realized": True,
            "one_realization_per_epoch": True,
            "no_gap_zero_archive_access": True,
        }

    return {
        "stage": "dry-run-structural-only",
        "spec_version": "GH4_EXPERIMENT_V1_0_FINAL",
        "experiment_executed": False,
        "scientific_evaluator_used": False,
        "confirmatory_metric_computed": False,
        "fresh_process": len(set(pids)) == len(ARMS) and len(set(tokens)) == len(ARMS),
        "pilot_shape_used_for_structure_only": {"epochs_per_arm": 12, "arm_count": 5},
        "arms": structural,
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
        raise SystemExit("GH-4 v1.0 Pilot/Confirmatory is locked on the pre-execution branch")
    payload = dry_run()
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
