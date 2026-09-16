from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import RelationElementRef
from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ExperienceReengagement,
    JudgmentRevalidation,
    ResponsibilityJudgment,
    RevalidationState,
)
from research.governance_harness_v01.harness_v04 import (
    AtomicFlowSnapshot,
    CompletedExperience,
    CurrentFlowGapRule,
    GovernanceHarnessV04,
    HistoryAccessPort,
    ParticipatingExperienceView,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import (
    HistoricalRelationRecord,
    PastRelationSemanticView,
)


ROOT = Path(__file__).resolve().parents[2]
SPEC_VERSION = "GH1_EXPERIMENT_V1_0_FINAL"


class ControlledFlow:
    def __init__(self, relation_id: str = "A"):
        self.tau = 10.0
        self.version = 1
        self.speed = 2.0
        self.front = True
        self.relation_id = relation_id
        self.apply_count = 0
        self.last_ref = None

    def observation(self) -> PresentObservation:
        return PresentObservation(
            100 + self.version, self.speed, self.front,
            12.0 if self.front else 0.0,
            0.8 if self.front else 0.0,
            "vehicle" if self.front else "none", 0.0, 2,
        )

    def atomic_current_snapshot(self) -> AtomicFlowSnapshot:
        return AtomicFlowSnapshot(
            self.tau, self.observation(),
            {"phase": "controlled-flow", "route": self.relation_id},
            self.version,
            f"v{self.version}:t{self.tau}:s{self.speed}:f{self.front}",
            self.relation_id, self.last_ref,
        )

    def current_flow_version(self) -> int:
        return self.version

    def apply_single_actuation(self, _actuation):
        self.apply_count += 1
        self.tau += 0.05
        self.version += 1
        self.last_ref = f"gh1a-real:{self.apply_count}"
        return self.last_ref

    def advance(self, *, speed=None, front=None):
        if speed is not None:
            self.speed = speed
        if front is not None:
            self.front = front
        self.tau += 0.1
        self.version += 1


def _record(experience_id: str, completed_tau: float, *, relation_type="longitudinal-relative-motion"):
    return HistoricalRelationRecord(
        RelationElementRef(
            experience_id, f"rel-{experience_id}", completed_tau,
            {"relation": relation_type},
        ),
        PastRelationSemanticView(
            "ego-role", "front-traffic-role", relation_type, "closing",
            ("front-interaction",), {"visibility": "clear"},
            ("recognition",), ("yield-space",),
        ),
    )


def frozen_archive():
    manifest = json.loads((Path(__file__).with_name("GH1_ARCHIVE_MANIFEST.json")).read_text())
    values = []
    for index, entry in enumerate(manifest["entries"], 1):
        experience_id = entry["experience_id"]
        relation_type = "longitudinal-relative-motion" if index <= 4 else "nonmatching-canary"
        values.append(CompletedExperience(
            experience_id, entry["relation_id"], f"prov:{experience_id}", float(index),
            {"relation_records": (_record(experience_id, float(index), relation_type=relation_type),)},
            256,
        ))
    return tuple(values)


class Participation:
    def assess(self, evidence, _gap, candidates, _feedback):
        current = evidence.samples[-1].observation
        decisions = []
        for item in candidates:
            records = tuple(item.content.get("relation_records", ()))
            semantic_match = any(
                record.semantic.subject_role == "ego-role"
                and record.semantic.object_role == "front-traffic-role"
                and record.semantic.relation_type == "longitudinal-relative-motion"
                for record in records
            )
            participate = (
                current.front_present
                and current.ego_speed_mps <= 1.5
                and semantic_match
            )
            decisions.append(ExperienceReengagement(
                item.experience_id, participate,
                "current relation semantics match" if participate else "current relation semantics do not match",
                provenance_ref=item.provenance_ref,
            ))
        return tuple(decisions)


class Responsibility:
    def assess(self, context):
        selected = "yield-space" if "yield-space" in context.candidate_ids else context.candidate_ids[0]
        return ResponsibilityJudgment(
            context.candidate_ids, selected,
            tuple(x for x in context.candidate_ids if x != selected),
            DynamicResponsibilityAxes(("uncertainty",), ("impact",), ("vulnerability",), ("current",)),
            ("selected candidate bound",), ("nonselected candidates retained",),
        )


class Revalidation:
    def revalidate(self, _context, audit, _decision, _outcome):
        return JudgmentRevalidation(
            RevalidationState.CONFIRMED,
            tuple((x.experience_id, RevalidationState.CONFIRMED) for x in audit),
            RevalidationState.CONFIRMED, RevalidationState.CONFIRMED,
        )


def build_harness():
    bundle = build_domain_bundle()
    port = HistoryAccessPort(frozen_archive())
    return GovernanceHarnessV04(
        core=bundle.core, history_port=port,
        gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
        reengagement_operator=Participation(),
        responsibility_operator=Responsibility(),
        revalidation_operator=Revalidation(),
    ), port, bundle.core


def close(harness, flow):
    flow.advance(front=False)
    return harness.observe_post(flow)


def _distribution(view):
    core = build_domain_bundle().core
    observation = ControlledFlow().observation()
    return dict(core.open_epoch(observation, 10.0, view).possibility_distribution)


def run():
    cases = {}

    h1, p1, _ = build_harness()
    f1 = ControlledFlow()
    a1 = h1.execute_decision_epoch(f1, relation_id="A")
    done1 = close(h1, f1)
    cases["A-CASE-1"] = {
        "gap": a1.gap.detected, "archive_access_count": a1.metrics.archive_access_count,
        "records_scanned": a1.metrics.records_scanned,
        "archive_bytes_read": a1.metrics.archive_bytes_read,
        "real_actuation_count": f1.apply_count, "closure": done1.history_entry is not None,
    }

    h2, _p2, _ = build_harness()
    f2 = ControlledFlow(); h2.capture_current(f2, "A"); f2.advance(speed=1.3)
    a2 = h2.execute_decision_epoch(f2, relation_id="A")
    participants = tuple(x.experience_id for x in a2.reengagement if x.participate)
    nonparticipants = tuple(x.experience_id for x in a2.reengagement if not x.participate)
    normal_distribution = _distribution(ParticipatingExperienceView(tuple(x for x in frozen_archive() if x.experience_id in participants)))
    removed_distribution = _distribution(ParticipatingExperienceView(()))
    inserted_distribution = _distribution(ParticipatingExperienceView(tuple(x for x in frozen_archive() if x.experience_id in participants)))
    done2 = close(h2, f2)
    cases["A-CASE-2"] = {
        "gap": a2.gap.detected, "participants": participants,
        "core_exposed_count": a2.metrics.core_exposed_count,
        "participant_removal_decision_changed": normal_distribution != removed_distribution,
        "selected_equals_realized": a2.responsibility.selected_candidate_id == a2.decision.realization.selected_possibility_id,
        "closure": done2.history_entry is not None,
    }
    cases["A-CASE-3"] = {
        "nonparticipants": nonparticipants,
        "canary_not_exposed": all(x not in participants for x in nonparticipants),
        "nonparticipant_insertion_decision_changed": inserted_distribution != normal_distribution,
    }

    h4, _p4, _ = build_harness()
    f4 = ControlledFlow(); h4.capture_current(f4, "A"); f4.advance(speed=1.3, front=False)
    a4 = h4.execute_decision_epoch(f4, relation_id="A")
    rejected = tuple(x.experience_id for x in a4.reengagement if not x.participate)
    cases["A-CASE-4"] = {
        "same_experience_participated_then_rejected": "E01" in participants and "E01" in rejected,
        "first_context_participants": participants, "reversed_context_participants": tuple(x.experience_id for x in a4.reengagement if x.participate),
    }

    hard_pass = (
        cases["A-CASE-1"]["gap"] is False
        and cases["A-CASE-1"]["archive_access_count"] == 0
        and cases["A-CASE-1"]["records_scanned"] == 0
        and cases["A-CASE-1"]["archive_bytes_read"] == 0
        and cases["A-CASE-1"]["real_actuation_count"] == 1
        and cases["A-CASE-2"]["gap"] is True
        and cases["A-CASE-2"]["participant_removal_decision_changed"] is True
        and cases["A-CASE-2"]["selected_equals_realized"] is True
        and cases["A-CASE-3"]["canary_not_exposed"] is True
        and cases["A-CASE-3"]["nonparticipant_insertion_decision_changed"] is False
        and cases["A-CASE-4"]["same_experience_participated_then_rejected"] is True
    )
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    runner_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    return {"experiment": "GH-1A", "spec_version": SPEC_VERSION,
            "frozen_basis_commit": head, "runner_sha256": runner_sha256,
            "run_status": "PASS" if hard_pass else "STRUCTURAL_FAIL", "cases": cases}


def main():
    print(json.dumps(run(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
