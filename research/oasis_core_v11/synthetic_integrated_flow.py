from __future__ import annotations

from research.carla_v22_harness_v11.canonical_harness import (
    CanonicalHarnessV11,
    PresentObservation,
    VehicleActuation,
)
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import (
    CurrentRelation,
    CurrentRelationalCoreV11,
    HistoricalRelationRecord,
    PastRelationSemanticView,
    PossibilityCandidate,
    ReconstructionResult,
    RelationContribution,
    ResponsibilityVector,
)
from research.oasis_core_v11.history_admission import HistoryAdmissionBridge


class ContinuousSyntheticFlow:
    """Two-epoch continuous-flow wiring test only; never experimental evidence."""

    def __init__(self):
        self.tau = 20.0
        self.epoch = 1
        self.fingerprint = "synthetic-flow@20.00"
        self._applied_this_epoch = 0

    def current_tau(self):
        return self.tau

    def present_observation(self):
        return {
            "epoch": self.epoch,
            "ego_speed_mps": 2.0,
            "front_present": True,
            "front_gap_m": 12.0,
            "front_closing_mps": 0.8,
            "front_kind": "vehicle",
            "local_heading_error_deg": 0.0,
            "local_density": 2,
        }

    def current_reality(self):
        return {"flow_phase": "approach", "epoch": self.epoch}

    def flow_fingerprint(self):
        return self.fingerprint

    def apply_single_actuation(self, actuation):
        self._applied_this_epoch += 1
        if self._applied_this_epoch != 1:
            raise RuntimeError("synthetic flow received more than one realization in one epoch")
        self.tau += 0.05
        self.fingerprint = f"synthetic-flow@{self.tau:.2f}:realized:{self.epoch}"
        return f"synthetic-realization-{self.epoch}"

    def advance_after_relation_closure(self, closure_tau):
        if closure_tau < self.tau:
            raise RuntimeError("closure cannot precede realized synthetic flow")
        self.tau = float(closure_tau) + 0.05
        self.epoch += 1
        self._applied_this_epoch = 0
        self.fingerprint = f"synthetic-flow@{self.tau:.2f}:epoch:{self.epoch}"


class RelationBuilder:
    def build(self, observation):
        return (
            CurrentRelation(
                relation_id="current-front-closing",
                subject_role="ego-role",
                object_role="front-role",
                relation_type="closing-gap",
                relation_state="approaching",
                process_context=("approach",),
                environment_context={"front_present": True},
            ),
        )


class CandidateProvider:
    def candidates(self, observation, current_relations):
        return (
            PossibilityCandidate("proceed", ("current:lane-open",)),
            PossibilityCandidate("yield", ("current:front-relation",)),
        )


class RelationOperator:
    def relate(self, *, current_relations, past, candidate_ids):
        anchors = tuple(
            r.relation_id
            for r in current_relations
            if r.subject_role == past.subject_role
            and r.object_role == past.object_role
            and r.relation_type == past.relation_type
        )
        if not anchors:
            return ()
        return tuple(
            RelationContribution(
                possibility_id=pid,
                current_relation_ids=anchors,
                role_trace=("current-relation-reentry", "historical-comparison"),
                generated_possibilities=(pid,),
                trace={"operator": "synthetic exact role/type continuity"},
            )
            for pid in past.possibility_links
            if pid in candidate_ids
        )


class ReconstructionOperator:
    def reconstruct(self, **kwargs):
        return ReconstructionResult()


class ResponsibilityOperator:
    def evaluate(self, *, candidate, **kwargs):
        return ResponsibilityVector(
            uncertainty=0.2,
            impact=0.3,
            irreversibility=0.1,
            time_constraint=0.2,
            evidence={"synthetic_candidate": candidate.possibility_id},
        )


class ChoiceOperator:
    def choose(self, *, candidates, distribution, **kwargs):
        return max(
            candidates,
            key=lambda c: (distribution[c.possibility_id], c.possibility_id),
        ).possibility_id


class ActuationOperator:
    def actuation(self, *, selected, **kwargs):
        if selected.possibility_id == "yield":
            return VehicleActuation(throttle=0.1, brake=0.0, steer=0.0)
        return VehicleActuation(throttle=0.2, brake=0.0, steer=0.0)


class ClosedRelationExtractor:
    def extract(self, entry):
        return (
            HistoricalRelationRecord(
                source=RelationElementRef(
                    entry.entry_id,
                    "closed-front-approach",
                    entry.relation_end_tau,
                    {
                        "origin_entry_id": entry.entry_id,
                        "selected_possibility": entry.selected_possibility_id,
                    },
                ),
                semantic=PastRelationSemanticView(
                    subject_role="ego-role",
                    object_role="front-role",
                    relation_type="closing-gap",
                    relation_state="approaching",
                    process_context=("approach", "realization", "closure"),
                    environment_context={"relation_context": "front-interaction"},
                    historical_roles=("realized-relation",),
                    possibility_links=(entry.selected_possibility_id,),
                ),
            ),
        )


def build_core():
    return CurrentRelationalCoreV11(
        relation_builder=RelationBuilder(),
        candidate_provider=CandidateProvider(),
        relation_operator=RelationOperator(),
        reconstruction_operator=ReconstructionOperator(),
        responsibility_operator=ResponsibilityOperator(),
        choice_operator=ChoiceOperator(),
        actuation_operator=ActuationOperator(),
        history=(),
    )


def run_integrated_flow():
    flow = ContinuousSyntheticFlow()
    core = build_core()
    harness = CanonicalHarnessV11(core)
    admission = HistoryAdmissionBridge(core=core, extractor=ClosedRelationExtractor())

    first = harness.execute_decision_epoch(flow)
    assert len(first.recorder.participation) == 0
    assert len(core.history_records()) == 0

    entry = first.recorder.complete_history_entry(
        entry_id="synthetic-completed-E1",
        realized_tau=20.05,
        outcome_tau=20.10,
        relation_end_tau=20.20,
        selected_possibility_id=first.realization.selected_possibility_id,
        realization_ref=first.realization_ref,
        realization_count=1,
        outcome_description="synthetic relation outcome observed and process closed",
        closure_method="synthetic participant relation closure",
        closure_evidence={"closed": True},
    )
    admitted = admission.admit(entry)
    assert len(admitted) == 1
    assert len(core.history_records()) == 1

    flow.advance_after_relation_closure(20.20)
    second = harness.execute_decision_epoch(flow)
    assert second.tau > entry.relation_end_tau
    assert len(second.recorder.participation) == 1
    participation = second.recorder.participation[0]
    assert participation.has_structural_participation
    assert "current-relation-reentry" in participation.role_trace
    assert participation.relation.experience_id == entry.entry_id

    return {
        "integrated_dry_run": "PASS",
        "experimental_evidence": False,
        "first_epoch_history_count": 0,
        "admitted_relation_count": 1,
        "second_epoch_participation_count": len(second.recorder.participation),
        "second_epoch_source_experience": participation.relation.experience_id,
    }


if __name__ == "__main__":
    print(run_integrated_flow())
