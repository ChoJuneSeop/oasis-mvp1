from __future__ import annotations

import unittest
from dataclasses import dataclass

from research.carla_v22_harness_v11.canonical_harness import PresentObservation, Realization, VehicleActuation
from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ExperienceReengagement,
    JudgmentRevalidation,
    ResponsibilityJudgment,
    RevalidationState,
)
from research.governance_harness_v01.harness_v04 import (
    AdmissionState,
    AtomicFlowSnapshot,
    CompletedExperience,
    CurrentFlowGapRule,
    GovernanceHarnessV04,
    HistoryAccessPort,
    ParticipatingExperienceView,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v11.test_current_relational_core import (
    Actuation,
    Choice,
    Experience,
    View,
    history_record,
    make_core,
    observation,
    view_for,
)


class Flow:
    def __init__(self):
        self.tau = 10.0
        self.version = 1
        self.speed = 2.0
        self.front = True
        self.apply_count = 0
        self.route = "A"
        self.last_ref = None

    def observation(self):
        return PresentObservation(
            200 + self.version,
            self.speed,
            self.front,
            12.0 if self.front else 0.0,
            0.8 if self.front else 0.0,
            "vehicle" if self.front else "none",
            0.2,
            2,
        )

    def atomic_current_snapshot(self):
        return AtomicFlowSnapshot(
            self.tau,
            self.observation(),
            {"phase": "approach", "route": self.route},
            self.version,
            f"v{self.version}:t{self.tau}:s{self.speed}:f{self.front}",
            self.route,
            self.last_ref,
        )

    def current_flow_version(self):
        return self.version

    def apply_single_actuation(self, actuation):
        self.apply_count += 1
        self.tau += 0.05
        self.version += 1
        self.last_ref = f"real:{self.apply_count}"
        return self.last_ref

    def advance(self, *, speed=None, front=None):
        if speed is not None:
            self.speed = speed
        if front is not None:
            self.front = front
        self.tau += 0.1
        self.version += 1


class Reengage:
    def assess(self, evidence, gap, candidates, feedback):
        return tuple(
            ExperienceReengagement(
                x.experience_id,
                x.experience_id == "E1",
                "current relation permits only E1",
                provenance_ref=x.provenance_ref,
            )
            for x in candidates
        )


class GovernanceResponsibility:
    def assess(self, context):
        selected = "yield" if "yield" in context.candidate_ids else context.candidate_ids[0]
        return ResponsibilityJudgment(
            context.candidate_ids,
            selected,
            tuple(x for x in context.candidate_ids if x != selected),
            DynamicResponsibilityAxes(("uncertain",), ("impact",), ("vulnerable",), ("now",)),
            ("bind selected",),
            ("retain alternatives",),
        )


class Revalidate:
    def revalidate(self, context, audit, decision, outcome):
        return JudgmentRevalidation(
            RevalidationState.CONFIRMED,
            tuple((x.experience_id, RevalidationState.CONFIRMED) for x in audit),
            RevalidationState.CONFIRMED,
            RevalidationState.CONFIRMED,
        )


def completed(exp_id: str, relation_id: str, completed_tau: float):
    record = history_record(exp_id, f"rel-{exp_id}", completed_tau)
    return CompletedExperience(
        exp_id,
        relation_id,
        f"prov:{exp_id}",
        completed_tau,
        {"relation_records": (record,)},
        256,
    )


def build_harness():
    core = make_core()
    port = HistoryAccessPort((completed("E1", "A", 1.0), completed("E2", "A", 2.0)))
    harness = GovernanceHarnessV04(
        core=core,
        history_port=port,
        gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
        reengagement_operator=Reengage(),
        responsibility_operator=GovernanceResponsibility(),
        revalidation_operator=Revalidate(),
    )
    return harness, port, core


class CoreGovernanceAdmissionTests(unittest.TestCase):
    def test_adm_01_real_core_has_no_forbidden_owned_capability_and_is_admitted(self):
        harness, _, core = build_harness()
        forbidden = ("archive", "history", "catalog", "future", "scenario", "seed")
        names = tuple(vars(core)) + tuple(vars(type(core)))
        self.assertFalse([name for name in names if any(token in name.lower() for token in forbidden)])
        self.assertEqual(harness.admission.state, AdmissionState.ADMITTED)

    def test_adm_02_core_receives_only_participating_view(self):
        core = make_core()
        e1 = completed("E1", "A", 1.0)
        e2 = completed("E2", "A", 2.0)
        view = ParticipatingExperienceView((e1,))
        opened = core.open_epoch(observation(), 10.0, view)
        ids = tuple(x.experience_id for x in opened.relation_elements)
        self.assertEqual(ids, ("E1",))
        self.assertNotIn("E2", ids)
        self.assertIsNot(view, getattr(core, "_epoch_records"))
        self.assertIsNot(e2, getattr(core, "_epoch_records"))

    def test_adm_03_gap_no_means_zero_archive_access(self):
        harness, port, _ = build_harness()
        result = harness.execute_decision_epoch(Flow(), relation_id="A")
        self.assertEqual(result.branch, "NO")
        self.assertEqual(port.archive_access_count, 0)
        self.assertEqual(port.records_scanned, 0)
        self.assertEqual(result.metrics.archive_bytes_read, 0)
        self.assertEqual(result.metrics.core_exposed_count, 0)

    def test_adm_04_nonparticipant_is_not_exposed_to_actual_core(self):
        harness, _, _ = build_harness()
        flow = Flow()
        harness.capture_current(flow, "A")
        flow.advance(speed=0.5)
        result = harness.execute_decision_epoch(flow, relation_id="A")
        self.assertEqual(result.branch, "YES")
        decisions = {x.experience_id: x.participate for x in result.reengagement}
        self.assertEqual(decisions, {"E1": True, "E2": False})
        exposed_ids = tuple(x.experience_id for x in result.decision.recorder.relation_elements)
        self.assertEqual(exposed_ids, ("E1",))

    def test_adm_05_actual_core_exposes_mandatory_realize_selected(self):
        core = make_core()
        self.assertTrue(callable(getattr(core, "realize_selected", None)))

    def test_adm_06_governance_selected_id_binds_realization(self):
        core = make_core()
        core.open_epoch(observation(), 10.0, View(()))
        realized = core.realize_selected(observation(), 10.0, "proceed")
        self.assertEqual(realized.selected_possibility_id, "proceed")

    def test_adm_07_realize_selected_does_not_call_internal_choice(self):
        class ChoiceMustNotRun:
            def __init__(self): self.calls = 0
            def choose(self, **kwargs):
                self.calls += 1
                return "proceed"

        choice = ChoiceMustNotRun()
        core = make_core(choice_operator=choice)
        core.open_epoch(observation(), 10.0, View(()))
        realized = core.realize_selected(observation(), 10.0, "yield")
        self.assertEqual(realized.selected_possibility_id, "yield")
        self.assertEqual(choice.calls, 0)

    def test_adm_08_future_completed_experience_is_rejected(self):
        core = make_core()
        future = completed("E-future", "A", 11.0)
        with self.assertRaises(CoreV11InvariantError):
            core.open_epoch(observation(), 10.0, ParticipatingExperienceView((future,)))

    def test_adm_09_probes_are_pure_and_do_not_request_actuation(self):
        class CountingActuation:
            def __init__(self): self.calls = 0
            def actuation(self, **kwargs):
                self.calls += 1
                return VehicleActuation(0.1, 0.0, 0.0)

        actuator = CountingActuation()
        core = make_core(actuation_operator=actuator)
        r = history_record("E1", "rel-E1", 1.0)
        opened = core.open_epoch(observation(), 10.0, view_for((r,)))
        self.assertEqual(actuator.calls, 0)
        core.ablate_relation(observation(), opened.relation_elements[0], 10.0)
        self.assertEqual(actuator.calls, 0)

    def test_adm_10_one_open_epoch_permits_only_one_realization(self):
        core = make_core()
        core.open_epoch(observation(), 10.0, View(()))
        first = core.realize_selected(observation(), 10.0, "yield")
        self.assertIsInstance(first, Realization)
        with self.assertRaises(CoreV11InvariantError):
            core.realize_selected(observation(), 10.0, "yield")

    def test_adm_11_core_cannot_create_or_commit_completed_experience(self):
        core = make_core()
        self.assertFalse(hasattr(core, "add_history"))
        self.assertFalse(hasattr(core, "history_records"))
        self.assertFalse(hasattr(core, "atomic_commit"))
        self.assertTrue(callable(getattr(HistoryAccessPort(), "atomic_commit", None)))

    def test_adm_12_participating_epoch_records_are_cleared_after_realization(self):
        core = make_core()
        r = history_record("E1", "rel-E1", 1.0)
        participant_view = view_for((r,))
        core.open_epoch(observation(), 10.0, participant_view)
        self.assertEqual(len(core._epoch_records), 1)
        core.realize_selected(observation(), 10.0, "yield")
        self.assertEqual(core._epoch_records, ())
        self.assertIsNone(core._last_evaluation)
        self.assertNotIn(participant_view, tuple(vars(core).values()))


if __name__ == "__main__":
    unittest.main()
