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

from .history import FrozenDecisionHistoryPort, baseline_experience
from .models import ARMS, ChainResult, ChainRuntime
from .operators import (
    FeedbackAwareParticipation,
    FixedParticipationBoundResponsibility,
    OutcomeRevalidationOperator,
)
from .scenario import build_pilot_world


class ScenarioFlow:
    def __init__(self, relation_id: str, observation: PresentObservation):
        self.relation_id = relation_id
        self._observation = observation
        self.tau = 100.0
        self.version = 1
        self.last_ref = None
        self.apply_count = 0

    def atomic_current_snapshot(self) -> AtomicFlowSnapshot:
        o = self._observation
        return AtomicFlowSnapshot(
            tau=self.tau,
            observation=o,
            current_reality={"phase": "gh3-controlled-flow", "route": self.relation_id},
            version=self.version,
            fingerprint=(
                f"gh3:v{self.version}:t{self.tau}:s{o.ego_speed_mps}:"
                f"f{o.front_present}:h{o.local_heading_error_deg}:d{o.local_density}"
            ),
            relation_id=self.relation_id,
            realization_ref=self.last_ref,
        )

    def current_flow_version(self) -> int:
        return self.version

    def set_observation(self, observation: PresentObservation) -> None:
        self._observation = observation
        self.tau += 0.1
        self.version += 1

    def apply_single_actuation(self, _actuation):
        self.apply_count += 1
        self.tau += 0.05
        self.version += 1
        self.last_ref = f"gh3-real:{self.relation_id}:{self.apply_count}"
        return self.last_ref


def _obs_to_json(value: PresentObservation) -> dict:
    return asdict(value)


def _obs_from_json(value: dict) -> PresentObservation:
    return PresentObservation(**value)


def _runtime_to_json(value: ChainRuntime) -> dict:
    return {
        "chain_id": value.chain_id,
        "relation_id": value.relation_id,
        "antecedent_pre": _obs_to_json(value.antecedent_pre),
        "antecedent_decision": _obs_to_json(value.antecedent_decision),
        "antecedent_post": _obs_to_json(value.antecedent_post),
        "recurrence_pre": _obs_to_json(value.recurrence_pre),
        "recurrence_decision": _obs_to_json(value.recurrence_decision),
        "recurrence_post": _obs_to_json(value.recurrence_post),
    }


def _runtime_from_json(value: dict) -> ChainRuntime:
    return ChainRuntime(
        chain_id=str(value["chain_id"]),
        relation_id=str(value["relation_id"]),
        antecedent_pre=_obs_from_json(value["antecedent_pre"]),
        antecedent_decision=_obs_from_json(value["antecedent_decision"]),
        antecedent_post=_obs_from_json(value["antecedent_post"]),
        recurrence_pre=_obs_from_json(value["recurrence_pre"]),
        recurrence_decision=_obs_from_json(value["recurrence_decision"]),
        recurrence_post=_obs_from_json(value["recurrence_post"]),
    )


def _feedback_state(feedback, experience_id: str):
    if not feedback:
        return None
    states = dict(feedback[-1].experience_states)
    state = states.get(experience_id)
    return None if state is None else state.value


def run_chain(arm: str, runtime: ChainRuntime) -> ChainResult:
    if arm not in ARMS:
        raise ValueError(arm)

    baseline = baseline_experience(
        runtime.relation_id,
        runtime.antecedent_decision.local_density,
    )
    port = FrozenDecisionHistoryPort(baseline, arm)
    bundle = build_domain_bundle()
    harness = GovernanceHarnessV04(
        core=bundle.core,
        history_port=port,
        gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
        reengagement_operator=FeedbackAwareParticipation(),
        responsibility_operator=FixedParticipationBoundResponsibility(),
        revalidation_operator=OutcomeRevalidationOperator(),
    )
    if harness.admission.state is not AdmissionState.ADMITTED:
        raise RuntimeError(f"GH-3 Core admission blocked: {harness.admission.reasons}")

    flow = ScenarioFlow(runtime.relation_id, runtime.antecedent_pre)

    # Antecedent epoch: current flow first, then gap, then baseline CE participation.
    harness.capture_current(flow, runtime.relation_id)
    flow.set_observation(runtime.antecedent_decision)
    antecedent = harness.execute_decision_epoch(flow, relation_id=runtime.relation_id)
    if not antecedent.gap.detected:
        raise RuntimeError("GH-3 antecedent failed to form the frozen current-flow gap")
    antecedent_participants = tuple(
        x.experience_id for x in antecedent.reengagement if x.participate
    )
    if antecedent_participants != (baseline.experience_id,):
        raise RuntimeError(f"GH-3 antecedent participant contract changed: {antecedent_participants}")
    if antecedent.responsibility.selected_candidate_id != antecedent.decision.realization.selected_possibility_id:
        raise RuntimeError("GH-3 antecedent selected != realized")

    flow.set_observation(runtime.antecedent_post)
    closed = harness.observe_post(flow)
    if closed.pending or closed.revalidation is None or closed.history_entry is None:
        raise RuntimeError("GH-3 antecedent did not close and commit")

    antecedent_state = dict(closed.revalidation.reengagement_judgments)[baseline.experience_id].value
    committed = port.committed_feedback(runtime.relation_id)
    if len(committed) != 1:
        raise RuntimeError("GH-3 antecedent feedback was not atomically committed exactly once")
    committed_state = _feedback_state(committed, baseline.experience_id)
    if committed_state != antecedent_state:
        raise RuntimeError("GH-3 committed feedback differs from revalidation")
    stored_after_antecedent = port.stored_experience_count

    # Recurrence epoch: same frozen baseline archive; newly committed CE is not eligible.
    flow.set_observation(runtime.recurrence_pre)
    harness.capture_current(flow, runtime.relation_id)
    flow.set_observation(runtime.recurrence_decision)
    recurrence = harness.execute_decision_epoch(flow, relation_id=runtime.relation_id)
    if not recurrence.gap.detected:
        raise RuntimeError("GH-3 recurrence failed to form the frozen current-flow gap")
    recurrence_participants = tuple(
        x.experience_id for x in recurrence.reengagement if x.participate
    )
    exposed_state = _feedback_state(port.last_exposed_feedback, baseline.experience_id)
    recurrence_decision_eligible_count = len(port.last_decision_eligible_ids)
    new_ce_exposed = port.new_ce_was_decision_eligible()
    if recurrence.responsibility.selected_candidate_id != recurrence.decision.realization.selected_possibility_id:
        raise RuntimeError("GH-3 recurrence selected != realized")

    flow.set_observation(runtime.recurrence_post)
    recurrence_closed = harness.observe_post(flow)
    if recurrence_closed.pending:
        raise RuntimeError("GH-3 recurrence did not reach Closure")
    if flow.apply_count != 2:
        raise RuntimeError(f"GH-3 chain must realize exactly twice, got {flow.apply_count}")

    return ChainResult(
        arm=arm,
        chain_id=runtime.chain_id,
        relation_id=runtime.relation_id,
        antecedent_gap=True,
        antecedent_participants=antecedent_participants,
        antecedent_selected=antecedent.responsibility.selected_candidate_id,
        antecedent_realized=antecedent.decision.realization.selected_possibility_id,
        antecedent_revalidation_state=antecedent_state,
        committed_feedback_state=committed_state,
        recurrence_gap=True,
        recurrence_exposed_feedback_state=exposed_state,
        recurrence_participants=recurrence_participants,
        recurrence_selected=recurrence.responsibility.selected_candidate_id,
        recurrence_realized=recurrence.decision.realization.selected_possibility_id,
        baseline_decision_eligible_count=port.baseline_decision_eligible_count,
        stored_experience_count_after_antecedent=stored_after_antecedent,
        recurrence_decision_eligible_count=recurrence_decision_eligible_count,
        recurrence_new_ce_exposed=new_ce_exposed,
        realization_count=flow.apply_count,
    )


def run_arm(arm: str, runtimes: tuple[ChainRuntime, ...]) -> dict:
    results = tuple(run_chain(arm, runtime) for runtime in runtimes)
    return {
        "arm": arm,
        "pid": os.getpid(),
        "worker_token": str(uuid.uuid4()),
        "chain_count": len(results),
        "results": [asdict(x) for x in results],
    }


def _worker() -> int:
    payload = json.load(sys.stdin)
    runtimes = tuple(_runtime_from_json(x) for x in payload["runtimes"])
    json.dump(run_arm(payload["arm"], runtimes), sys.stdout)
    return 0


def run_runtime(runtimes: tuple[ChainRuntime, ...]) -> dict:
    workers = []
    for arm in ARMS:
        proc = subprocess.run(
            [sys.executable, "-m", "research.governance_harness_gh3.runner", "--worker"],
            input=json.dumps({
                "arm": arm,
                "runtimes": [_runtime_to_json(x) for x in runtimes],
            }),
            text=True,
            capture_output=True,
            check=True,
        )
        workers.append(json.loads(proc.stdout))
    return {"workers": workers}


def dry_run() -> dict:
    """Structural Pilot-equivalent preflight. No evaluator truth is joined here."""
    cases = build_pilot_world()
    block = run_runtime(tuple(case.runtime for case in cases))
    pids = [x["pid"] for x in block["workers"]]
    tokens = [x["worker_token"] for x in block["workers"]]
    structural = {}
    for worker in block["workers"]:
        chain_results = worker["results"]
        for item in chain_results:
            if item["antecedent_selected"] != item["antecedent_realized"]:
                raise RuntimeError("dry-run antecedent selected != realized")
            if item["recurrence_selected"] != item["recurrence_realized"]:
                raise RuntimeError("dry-run recurrence selected != realized")
            if item["realization_count"] != 2:
                raise RuntimeError("dry-run chain realization count changed")
            if item["recurrence_new_ce_exposed"]:
                raise RuntimeError("dry-run exposed newly committed CE")
            if item["recurrence_decision_eligible_count"] != 1:
                raise RuntimeError("dry-run decision-eligible archive changed")
            if item["antecedent_revalidation_state"] not in {"confirmed", "revised", "inconclusive"}:
                raise RuntimeError("dry-run produced invalid typed revalidation")
            if item["committed_feedback_state"] != item["antecedent_revalidation_state"]:
                raise RuntimeError("dry-run feedback commit mismatch")
        structural[worker["arm"]] = {
            "chain_count": len(chain_results),
            "two_realizations_per_chain": True,
            "selected_equals_realized": True,
            "new_ce_decision_reuse": False,
        }
    return {
        "stage": "dry-run-structural-only",
        "experiment_executed": False,
        "evaluator_used": False,
        "confirmatory_metric_computed": False,
        "fresh_process": len(set(pids)) == len(ARMS) and len(set(tokens)) == len(ARMS),
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
        raise SystemExit("GH-3 v1.0 Pilot/Confirmatory is locked on the pre-execution branch")
    payload = dry_run()
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
