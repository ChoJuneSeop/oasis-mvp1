from __future__ import annotations

import unittest

from research.carla_v22_canonical.harness_v1_1 import PresentObservation
from research.g3_2_sidecar.history import HistoryEntry
from research.governance_cbra_v1.models import (
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    ParticipationProvenance,
    ResponsibilityProvenance,
    TargetKind,
)
from research.governance_harness_v01.harness import RevalidationState

from .adapter import (
    changed_scope,
    eligible_revalidation_history,
    map_current_flow,
    map_relation_context,
    open_cbra_after_closure,
    record_carla_revalidation,
    same_scope,
    unrelated_relation,
)
from .models import CarlaOutcomeSignal


def obs(*, density=2, kind="vehicle", present=True):
    return PresentObservation(
        epoch=1,
        ego_speed_mps=4.0,
        front_present=present,
        front_gap_m=12.0,
        front_closing_mps=1.0,
        front_kind=kind,
        local_heading_error_deg=0.5,
        local_density=density,
    )


def snapshot():
    return DecisionProvenanceSnapshot(
        entry_id="H1",
        relation_id="REL-1",
        decision_tau=10.0,
        closure_tau=10.2,
        participation=(
            ParticipationProvenance("CE-1", True, "matched current relation", "prov:yes"),
            ParticipationProvenance("CE-2", False, "not matched", "prov:no"),
        ),
        responsibility=ResponsibilityProvenance(
            selected_candidate_id="continue-flow",
            nonselected_candidate_ids=("yield-space",),
            uncertainty=("u-risk",),
            impact=("i-impact",),
            vulnerability=("v-user",),
            temporality=("t-window",),
            selected_obligations=("selected-obligation",),
            nonselected_obligations=("nonselected-obligation",),
            axis_obligations=(
                ("U", ("u-risk",)),
                ("I", ("i-impact",)),
                ("V", ("v-user",)),
                ("T", ("t-window",)),
            ),
        ),
    )


def history():
    return HistoryEntry(
        entry_id="H1",
        decision_tau=10.0,
        realized_tau=10.05,
        outcome_tau=10.1,
        relation_end_tau=10.2,
        selected_possibility_id="continue-flow",
        realization_ref="carla-actuation-1",
        realization_count=1,
        outcome_description="host-observed result",
        closure_method="relation-process observation",
        closure_evidence={"closed": True},
    )


class MappingTests(unittest.TestCase):
    def test_current_flow_is_exact_approved_observation_projection(self):
        x=map_current_flow(obs())
        self.assertEqual(x.ego_speed_mps,4.0)
        self.assertEqual(x.front_gap_m,12.0)
        self.assertEqual(x.local_density,2)

    def test_scope_mapping_is_exact_and_contextual(self):
        a=map_relation_context(obs(density=2),relation_id="REL-1")
        b=map_relation_context(obs(density=2),relation_id="REL-1")
        c=map_relation_context(obs(density=3),relation_id="REL-1")
        d=map_relation_context(obs(density=2),relation_id="REL-2")
        self.assertTrue(same_scope(a,b))
        self.assertTrue(changed_scope(a,c))
        self.assertTrue(unrelated_relation(a,d))

    def test_cbra_opens_only_from_closed_matching_history(self):
        axis=open_cbra_after_closure(history=history(),snapshot=snapshot())
        self.assertEqual(axis.history(),())

    def test_post_closure_participation_revalidation(self):
        axis=open_cbra_after_closure(history=history(),snapshot=snapshot())
        cp=record_carla_revalidation(axis,CarlaOutcomeSignal(
            observed_tau=10.3,
            relation_id="REL-1",
            event_id="event-1",
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE-1",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("sensor:10.3","actuation:1"),
        ))
        self.assertEqual(cp.participation_findings[0].state,RevalidationState.REVISED)

    def test_exogenous_bad_outcome_does_not_become_revision(self):
        axis=open_cbra_after_closure(history=history(),snapshot=snapshot())
        cp=record_carla_revalidation(axis,CarlaOutcomeSignal(
            observed_tau=10.3,
            relation_id="REL-1",
            event_id="event-weather",
            target_kind=TargetKind.SELECTED_CHOICE,
            target_id="continue-flow",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.EXOGENOUS,
            evidence_refs=("weather-injection:1",),
        ))
        self.assertEqual(cp.selected_choice_finding.state,RevalidationState.INCONCLUSIVE)

    def test_delayed_checkpoints_are_append_only_and_as_of_gated(self):
        axis=open_cbra_after_closure(history=history(),snapshot=snapshot())
        record_carla_revalidation(axis,CarlaOutcomeSignal(
            observed_tau=10.3,relation_id="REL-1",event_id="early",
            target_kind=TargetKind.PARTICIPATION,target_id="CE-1",
            direction=EvidenceDirection.INDETERMINATE,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("sensor:early",),
        ))
        record_carla_revalidation(axis,CarlaOutcomeSignal(
            observed_tau=10.8,relation_id="REL-1",event_id="late",
            target_kind=TargetKind.PARTICIPATION,target_id="CE-1",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("sensor:late",),
        ))
        self.assertEqual(len(axis.history()),2)
        self.assertEqual(len(eligible_revalidation_history(axis,later_decision_tau=10.5)),1)
        self.assertEqual(len(eligible_revalidation_history(axis,later_decision_tau=11.0)),2)

    def test_cross_relation_is_rejected_by_cbra(self):
        axis=open_cbra_after_closure(history=history(),snapshot=snapshot())
        with self.assertRaises(ValueError):
            record_carla_revalidation(axis,CarlaOutcomeSignal(
                observed_tau=10.3,relation_id="REL-X",event_id="bad",
                target_kind=TargetKind.PARTICIPATION,target_id="CE-1",
                direction=EvidenceDirection.SUPPORTS,
                attribution=AttributionKind.DECISION_LINKED,
                evidence_refs=("sensor:bad",),
            ))


if __name__=="__main__":
    unittest.main()
