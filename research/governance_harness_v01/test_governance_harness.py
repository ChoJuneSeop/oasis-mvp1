from __future__ import annotations

import unittest

from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11
from research.carla_v22_harness_v11.synthetic_dry_run import SyntheticCore, SyntheticFlow
from research.governance_harness_v01.harness import (
    ExperienceReengagement,
    GapAssessment,
    GovernanceHarnessV01,
    GovernanceInvariantError,
    JudgmentRevalidation,
    OutcomeObservation,
    ResponsibilityJudgment,
)


class GapDetector:
    def __init__(self, events, detected):
        self.events, self.detected = events, detected

    def assess(self, snapshot):
        self.events.append("gap")
        self.assert_snapshot_has_no_history(snapshot)
        return GapAssessment(
            self.detected,
            progress_anomalies=("stalled",) if self.detected else (),
            current_evidence_refs=("present:progress",),
        )

    @staticmethod
    def assert_snapshot_has_no_history(snapshot):
        assert not hasattr(snapshot, "history")
        assert not hasattr(snapshot, "experiences")


class Reengagement:
    def __init__(self, events):
        self.events = events

    def assess(self, snapshot, gap):
        self.events.append("history")
        return (
            ExperienceReengagement("completed-exp-1", True, "relevant after current gap"),
            ExperienceReengagement("completed-exp-2", False, "not needed in this relation"),
        )


class Responsibility:
    def __init__(self, events):
        self.events = events

    def assess(self, snapshot, gap, reengagement):
        self.events.append("responsibility")
        return ResponsibilityJudgment(
            selected_obligations=("verify braking outcome",),
            nonselected_obligations=("record why acceleration was rejected",),
        )


class Outcome:
    def __init__(self, events):
        self.events = events

    def observe(self, execution, flow):
        self.events.append("outcome")
        return OutcomeObservation(
            "host result observed",
            {"realization_ref": execution.realization_ref},
            float(flow.current_tau()),
            flow.flow_fingerprint(),
        )


class Revalidation:
    def __init__(self, events):
        self.events = events

    def revalidate(self, context, execution, outcome):
        self.events.append("revalidate")
        return JudgmentRevalidation(
            "confirmed",
            (("completed-exp-1", "confirmed"), ("completed-exp-2", "revise")),
            "confirmed",
            "revise",
        )


class ContextPort:
    def __init__(self, events):
        self.events, self.context = events, None

    def bind_governance_context(self, context):
        self.events.append("bind")
        self.context = context


class GovernanceHarnessTests(unittest.TestCase):
    def build(self, detected, events, *, revalidator=True):
        return GovernanceHarnessV01(
            CanonicalHarnessV11(SyntheticCore()),
            gap_detector=GapDetector(events, detected),
            outcome_observer=Outcome(events),
            reengagement_operator=Reengagement(events),
            responsibility_operator=Responsibility(events),
            revalidation_operator=Revalidation(events) if revalidator else None,
            context_port=ContextPort(events),
        )

    def test_no_gap_preserves_canonical_flow_without_history_access(self):
        events, flow = [], SyntheticFlow()
        result = self.build(False, events).execute_decision_epoch(flow)
        self.assertEqual(result.branch, "NO")
        self.assertEqual(events, ["gap", "outcome"])
        self.assertEqual(flow.apply_count, 1)
        self.assertEqual(result.reengagement, ())
        self.assertIsNone(result.responsibility)
        self.assertIsNone(result.revalidation)

    def test_gap_uses_history_only_after_current_flow_assessment(self):
        events, flow = [], SyntheticFlow()
        result = self.build(True, events).execute_decision_epoch(flow)
        self.assertEqual(result.branch, "YES")
        self.assertEqual(events, ["gap", "history", "responsibility", "bind", "outcome", "revalidate"])
        self.assertEqual(flow.apply_count, 1)
        self.assertEqual([x.participate for x in result.reengagement], [True, False])
        self.assertTrue(result.responsibility.nonselected_obligations)
        self.assertEqual(result.revalidation.responsibility_judgment, "revise")

    def test_no_can_transition_to_yes_on_a_later_present_flow(self):
        events, first_flow = [], SyntheticFlow()
        detector = GapDetector(events, False)
        harness = GovernanceHarnessV01(
            CanonicalHarnessV11(SyntheticCore()),
            gap_detector=detector,
            outcome_observer=Outcome(events),
            reengagement_operator=Reengagement(events),
            responsibility_operator=Responsibility(events),
            revalidation_operator=Revalidation(events),
        )
        self.assertEqual(harness.execute_decision_epoch(first_flow).branch, "NO")
        detector.detected = True
        later_flow = SyntheticFlow()
        later_flow.tau = first_flow.tau
        later_flow.fingerprint = first_flow.fingerprint
        self.assertEqual(harness.execute_decision_epoch(later_flow).branch, "YES")
        self.assertEqual(first_flow.apply_count + later_flow.apply_count, 2)

    def test_yes_requires_result_based_revalidation(self):
        with self.assertRaises(GovernanceInvariantError):
            self.build(True, [], revalidator=False).execute_decision_epoch(SyntheticFlow())

    def test_revalidation_covers_participation_and_nonparticipation(self):
        class Incomplete(Revalidation):
            def revalidate(self, context, execution, outcome):
                return JudgmentRevalidation(
                    "confirmed", (("completed-exp-1", "confirmed"),), "confirmed", "confirmed"
                )

        events = []
        harness = self.build(True, events)
        harness.revalidation_operator = Incomplete(events)
        with self.assertRaises(GovernanceInvariantError):
            harness.execute_decision_epoch(SyntheticFlow())


if __name__ == "__main__":
    unittest.main()
