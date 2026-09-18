from __future__ import annotations

import inspect
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.governance_cbra_carla_mapping_v1.adapter import (
    eligible_revalidation_history,
    record_carla_revalidation,
)
from research.governance_cbra_carla_mapping_v1.models import CarlaOutcomeSignal
from research.governance_cbra_v1.axis import ContinuousBidirectionalRevalidationAxis
from research.governance_cbra_v1.models import (
    AttributionKind,
    DecisionProvenanceSnapshot,
    EvidenceDirection,
    ParticipationProvenance,
    ResponsibilityProvenance,
    TargetKind,
)
from research.governance_harness_v01.harness import RevalidationState
from research.governance_harness_v01.harness_v04 import (
    CompletedExperience,
    GovernanceFeedbackV04,
    PresentFlowEvidence,
    PresentSample,
)

from .pilot_runtime import (
    PilotHistoryAccessPort,
    PilotParticipation,
    PilotResponsibility,
    cbra_feedback_from_checkpoint,
    scope_signature,
)
from .pilot_runner import (
    ARMS,
    _failure_semantics,
    _target_for_failure,
    load_matrix,
)
from .telemetry import UNAVAILABLE, ProbeSnapshot, summarize


HERE = Path(__file__).resolve().parent


def obs(
    *,
    epoch=10,
    speed=1.0,
    front=True,
    closing=1.0,
    kind="vehicle",
    density=1,
):
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=speed,
        front_present=front,
        front_gap_m=10.0 if front else 0.0,
        front_closing_mps=closing if front else 0.0,
        front_kind=kind if front else "none",
        local_heading_error_deg=0.0,
        local_density=density,
    )


def snapshot():
    return DecisionProvenanceSnapshot(
        entry_id="E:1",
        relation_id="REL:A",
        decision_tau=10.0,
        closure_tau=11.0,
        participation=(
            ParticipationProvenance(
                "CE:seed",
                True,
                "current relation supported participation",
                "prov:seed",
            ),
        ),
        responsibility=ResponsibilityProvenance(
            selected_candidate_id="continue-flow",
            nonselected_candidate_ids=("yield-space",),
            uncertainty=("u-current",),
            impact=("i-current",),
            vulnerability=("v-current",),
            temporality=("t-current",),
            selected_obligations=("selected-bound",),
            nonselected_obligations=("nonselected-preserved",),
            axis_obligations=(
                ("U", ("u-current",)),
                ("I", ("i-current",)),
                ("V", ("v-current",)),
                ("T", ("t-current",)),
            ),
        ),
    )


class PilotPreExecutionAttackTests(unittest.TestCase):
    def test_matrix_is_exact_cartesian_product_and_shared_seed_per_scenario(self):
        matrix = load_matrix()
        expected = {
            (a, f, c)
            for a in matrix["arms"]
            for f in matrix["failure_classes"]
            for c in matrix["reentry_contexts"]
        }
        actual = {
            (u["arm"], u["failure_class"], u["reentry_context"])
            for u in matrix["units"]
        }
        self.assertEqual(actual, expected)
        self.assertEqual(len(matrix["units"]), 54)
        for failure in matrix["failure_classes"]:
            for context in matrix["reentry_contexts"]:
                group = [
                    u for u in matrix["units"]
                    if u["failure_class"] == failure
                    and u["reentry_context"] == context
                ]
                self.assertEqual({u["arm"] for u in group}, set(ARMS))
                self.assertEqual(len({u["seed"] for u in group}), 1)

    def test_failure_label_cannot_enter_governance_operators(self):
        participation_src = inspect.getsource(PilotParticipation.assess)
        responsibility_src = inspect.getsource(PilotResponsibility.assess)
        for source in (participation_src, responsibility_src):
            self.assertNotIn("failure_class", source)
            self.assertNotIn("SUCCESS_CONTROL", source)
            self.assertNotIn("EXOGENOUS_FAILURE", source)
            self.assertNotIn("DELAYED_FAILURE", source)

    def test_participation_is_current_contextual_and_no_is_preserved(self):
        port = PilotHistoryAccessPort()
        operator = PilotParticipation(port)
        candidate = CompletedExperience(
            "CE:seed", "REL:A", "prov:seed", 1.0, {}, 1
        )
        current = obs(closing=-1.0)
        evidence = PresentFlowEvidence(
            (PresentSample(10.0, current, {"front_state": "opening"}),)
        )
        result = operator.assess(
            evidence,
            SimpleNamespace(),
            (candidate,),
            (),
        )
        self.assertEqual(len(result), 1)
        self.assertFalse(result[0].participate)
        self.assertEqual(result[0].provenance_ref, "prov:seed")
        self.assertTrue(result[0].rationale)

    def test_cbra_revision_applies_only_to_same_scope(self):
        port = PilotHistoryAccessPort()
        operator = PilotParticipation(port)
        candidate = CompletedExperience(
            "CE:seed", "REL:A", "prov:seed", 1.0, {}, 1
        )
        current = obs(closing=1.0, kind="vehicle", density=1)
        evidence = PresentFlowEvidence(
            (PresentSample(10.0, current, {"front_state": "closing"}),)
        )
        feedback = GovernanceFeedbackV04(
            prior_entry_id="CBRA:E:1:1",
            relation_id="REL:A",
            provenance_refs=("ev:1",),
            gap_state=RevalidationState.INCONCLUSIVE,
            choice_state=RevalidationState.INCONCLUSIVE,
            responsibility_state=RevalidationState.INCONCLUSIVE,
            experience_states=(("CE:seed", RevalidationState.REVISED),),
        )
        port.publish_cbra_feedback(
            feedback,
            original_scope_signature=scope_signature(current),
        )
        same = operator.assess(
            evidence, SimpleNamespace(), (candidate,), (feedback,)
        )
        self.assertFalse(same[0].participate)

        changed_obs = obs(closing=1.0, kind="pedestrian", density=1)
        changed_evidence = PresentFlowEvidence(
            (PresentSample(11.0, changed_obs, {"front_state": "closing"}),)
        )
        changed = operator.assess(
            changed_evidence, SimpleNamespace(), (candidate,), (feedback,)
        )
        self.assertTrue(changed[0].participate)

    def test_responsibility_revision_is_scope_local(self):
        port = PilotHistoryAccessPort()
        operator = PilotResponsibility(port)
        current = obs(kind="vehicle", density=1)
        feedback = GovernanceFeedbackV04(
            prior_entry_id="CBRA:E:2:1",
            relation_id="REL:A",
            provenance_refs=("ev:2",),
            gap_state=RevalidationState.INCONCLUSIVE,
            choice_state=RevalidationState.INCONCLUSIVE,
            responsibility_state=RevalidationState.REVISED,
            experience_states=(),
        )
        port.publish_cbra_feedback(
            feedback,
            original_scope_signature=scope_signature(current),
        )
        context = SimpleNamespace(
            candidate_ids=("yield-space", "continue-flow"),
            flow=PresentFlowEvidence(
                (PresentSample(10.0, current, {"front_state": "closing"}),)
            ),
            feedback=(feedback,),
        )
        judgment = operator.assess(context)
        self.assertEqual(judgment.selected_candidate_id, "continue-flow")
        self.assertEqual(
            judgment.nonselected_candidate_ids, ("yield-space",)
        )
        self.assertTrue(judgment.axes.uncertainty)
        self.assertTrue(judgment.axes.impact)
        self.assertTrue(judgment.axes.vulnerability)
        self.assertTrue(judgment.axes.temporality)

    def test_failure_semantics_and_targets_are_typed(self):
        s = snapshot()
        self.assertEqual(
            _failure_semantics("SUCCESS_CONTROL"),
            (EvidenceDirection.SUPPORTS, AttributionKind.DECISION_LINKED),
        )
        self.assertEqual(
            _failure_semantics("EXOGENOUS_FAILURE"),
            (EvidenceDirection.CONTRADICTS, AttributionKind.EXOGENOUS),
        )
        self.assertEqual(
            _target_for_failure(s, "PARTICIPATION_COMMISSION_FAILURE"),
            (TargetKind.PARTICIPATION, "CE:seed"),
        )
        self.assertEqual(
            _target_for_failure(s, "RESPONSIBILITY_AXIS_FAILURE"),
            (TargetKind.RESPONSIBILITY_OBLIGATION, "U:u-current"),
        )
        self.assertEqual(
            _target_for_failure(s, "EXOGENOUS_FAILURE"),
            (TargetKind.SELECTED_CHOICE, "continue-flow"),
        )

    def test_cbra_preclosure_duplicate_cross_relation_asof_and_closed_reopen(self):
        s = snapshot()
        axis = ContinuousBidirectionalRevalidationAxis(s)
        signal = CarlaOutcomeSignal(
            observed_tau=12.0,
            relation_id="REL:A",
            event_id="EV:1",
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE:seed",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("obs:12",),
        )
        cp = record_carla_revalidation(axis, signal)
        self.assertEqual(cp.ordinal, 1)
        self.assertEqual(
            cp.participation_findings[0].state,
            RevalidationState.REVISED,
        )
        self.assertEqual(eligible_revalidation_history(axis, later_decision_tau=12.0), ())
        self.assertEqual(
            tuple(x.ordinal for x in eligible_revalidation_history(axis, later_decision_tau=12.1)),
            (1,),
        )

        duplicate = CarlaOutcomeSignal(
            observed_tau=12.1,
            relation_id="REL:A",
            event_id="EV:1",
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE:seed",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("obs:duplicate",),
        )
        with self.assertRaises(ValueError):
            record_carla_revalidation(axis, duplicate)

        cross = CarlaOutcomeSignal(
            observed_tau=12.2,
            relation_id="REL:B",
            event_id="EV:cross",
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE:seed",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("obs:cross",),
        )
        with self.assertRaises(ValueError):
            record_carla_revalidation(axis, cross)

        preclosure = ContinuousBidirectionalRevalidationAxis(s)
        early = CarlaOutcomeSignal(
            observed_tau=11.0,
            relation_id="REL:A",
            event_id="EV:early",
            target_kind=TargetKind.PARTICIPATION,
            target_id="CE:seed",
            direction=EvidenceDirection.CONTRADICTS,
            attribution=AttributionKind.DECISION_LINKED,
            evidence_refs=("obs:early",),
        )
        with self.assertRaises(ValueError):
            record_carla_revalidation(preclosure, early)

        axis.close()
        with self.assertRaises(ValueError):
            axis.reopen()

    def test_cbra_feedback_never_claims_counterfactual_outcome(self):
        s = snapshot()
        axis = ContinuousBidirectionalRevalidationAxis(s)
        cp = record_carla_revalidation(
            axis,
            CarlaOutcomeSignal(
                observed_tau=12.0,
                relation_id="REL:A",
                event_id="EV:no",
                target_kind=TargetKind.PARTICIPATION,
                target_id="CE:seed",
                direction=EvidenceDirection.CONTRADICTS,
                attribution=AttributionKind.DECISION_LINKED,
                evidence_refs=("obs:no",),
            ),
        )
        feedback = cbra_feedback_from_checkpoint(cp)
        self.assertEqual(
            feedback.experience_states,
            (("CE:seed", RevalidationState.REVISED),),
        )
        self.assertNotIn("counterfactual", repr(feedback).lower())

    def test_telemetry_preserves_unavailable_energy_without_estimate_or_score(self):
        begin = ProbeSnapshot(0.0, 0.0, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE)
        end = ProbeSnapshot(2.0, 1.0, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE)
        result = summarize(
            decision_latencies=[0.01, 0.02, 0.03],
            begin=begin,
            end=end,
            simulated_seconds=1.0,
            realized_decisions=3,
            closure_count=2,
            archive_reads=4,
            candidates_examined=6,
            cbra_wakeups=1,
            cbra_active_seconds=0.01,
            checkpoint_writes=1,
            storage_growth_bytes=100,
        )
        self.assertEqual(result["cpu_energy_joules"], UNAVAILABLE)
        self.assertEqual(result["gpu_energy_joules"], UNAVAILABLE)
        self.assertEqual(result["joules_per_decision"], UNAVAILABLE)
        self.assertFalse(result["unavailable_counters_are_estimated"])
        self.assertNotIn("score", result)


if __name__ == "__main__":
    unittest.main()
