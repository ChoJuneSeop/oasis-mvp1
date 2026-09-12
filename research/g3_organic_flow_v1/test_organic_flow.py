from __future__ import annotations

from copy import deepcopy
from dataclasses import replace
import hashlib
import tempfile
import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.choice_responsibility_v01.integration import NoAdmissibleChoice
from research.g3_organic_flow_v1.core import OrganicIntegratedChoiceCore
from research.g3_organic_flow_v1.history import (
    FrontRelationEpisodeManager,
    OrganicHistoryCommitter,
)
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
    pareto_demand_layers,
)
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.integration_checkpoint.frame import (
    V12ResponsibilityEvidenceAdapter,
    current_frame_from_host,
)
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.process_archive import ProcessArchive
from research.oasis_core_v12.runtime import (
    ApplicationReceipt,
    DuplicateDispatch,
    ExecutionJournal,
    StaleDecision,
)


class Flow:
    def __init__(self, *, epoch=200, tau=10.0, heading=0.2):
        self.epoch = epoch
        self.tau = float(tau)
        self.heading = float(heading)
        self.front_present = True
        self.state = 0
        self.applied = 0
        self.keys = set()
        self.capture_count = 0
        self.mutate_on_capture_number = None
        self.fail_after_apply = False

    def current_tau(self):
        return self.tau

    def present_observation(self):
        return {
            "epoch": self.epoch,
            "ego_speed_mps": 4.0,
            "front_present": self.front_present,
            "front_gap_m": 10.0 if self.front_present else 0.0,
            "front_closing_mps": 0.5 if self.front_present else 0.0,
            "front_kind": "vehicle" if self.front_present else "none",
            "local_heading_error_deg": self.heading,
            "local_density": 2,
        }

    def flow_fingerprint(self):
        raw = f"{self.epoch}:{self.tau}:{self.state}:{self.heading}:{self.front_present}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def capture(self):
        self.capture_count += 1
        if self.mutate_on_capture_number == self.capture_count:
            self.state += 1
            self.heading = -0.15
        observation = PresentObservation.from_mapping(self.present_observation())
        return current_frame_from_host(
            observation,
            tau=self.tau,
            revision=self.flow_fingerprint(),
        )

    def apply_if_current(self, realization, *, expected_revision, idempotency_key):
        if expected_revision != self.flow_fingerprint():
            return ApplicationReceipt(
                False, self.tau, reason="premises changed at atomic apply"
            )
        if idempotency_key in self.keys:
            raise AssertionError("duplicate atomic application")
        self.keys.add(idempotency_key)
        self.applied += 1
        self.state += 1
        if self.fail_after_apply:
            raise TimeoutError("acknowledgement lost after application")
        return ApplicationReceipt(
            True,
            self.tau,
            realization_ref=f"fixture-realization-{self.epoch}-{self.applied}",
        )

    def post_observation(self, *, front_present):
        return PresentObservation(
            self.epoch + 1,
            4.0,
            front_present,
            10.0 if front_present else 0.0,
            0.5 if front_present else 0.0,
            "vehicle" if front_present else "none",
            self.heading,
            2,
        )


def build_core(*, available_work=None):
    base = build_domain_bundle().core
    return OrganicIntegratedChoiceCore(
        assessment_operator=OrganicCurrentAssessment(),
        verifier=OrganicCurrentVerifier(),
        preference_operator=ParetoContextPreference(),
        resource_allocator=OrganicResponsibilityResourceAllocator(available_work),
        relation_builder=base.relation_builder,
        candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator,
        reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=V12ResponsibilityEvidenceAdapter(
            base.responsibility_operator
        ),
        actuation_operator=base.actuation_operator,
    )


def execute(core, flow, journal, *, run_id="run", subject_id="ego"):
    return OrganicHarness(core, journal, authorize=lambda *_: True).execute_decision_epoch(
        flow,
        run_id=run_id,
        subject_id=subject_id,
        deadline_tau=flow.tau + 5.0,
    )


class OrganicFlowTests(unittest.TestCase):
    def test_assessment_then_allocation_then_verification_choice_and_one_realization(self):
        events = []

        class Assessment(OrganicCurrentAssessment):
            def assess(self, *, inputs):
                events.append("assessment")
                return super().assess(inputs=inputs)

        class Allocator(OrganicResponsibilityResourceAllocator):
            def allocate(self, *, inputs, assessment):
                events.append("allocation")
                return super().allocate(inputs=inputs, assessment=assessment)

        class Verifier(OrganicCurrentVerifier):
            def verify(self, **kwargs):
                events.append("verification")
                return super().verify(**kwargs)

        base = build_domain_bundle().core
        core = OrganicIntegratedChoiceCore(
            assessment_operator=Assessment(),
            verifier=Verifier(),
            preference_operator=ParetoContextPreference(),
            resource_allocator=Allocator(),
            relation_builder=base.relation_builder,
            candidate_provider=base.candidate_provider,
            relation_operator=base.relation_operator,
            reconstruction_operator=base.reconstruction_operator,
            responsibility_operator=V12ResponsibilityEvidenceAdapter(
                base.responsibility_operator
            ),
            actuation_operator=base.actuation_operator,
        )
        journal = ExecutionJournal(":memory:")
        flow = Flow()
        result = execute(core, flow, journal)
        self.assertTrue(result.realized)
        self.assertEqual(flow.applied, 1)
        self.assertLess(events.index("assessment"), events.index("allocation"))
        self.assertLess(events.index("allocation"), events.index("verification"))
        record = result.responsibility_record
        self.assertEqual(
            record["organic_process_id"], "oasis-g3-organic-flow-v1"
        )
        self.assertTrue(record["possibility_scope"]["open_world_not_exhaustive"])
        journal.close()

    def test_atomic_capture_binds_observation_tau_revision_and_evidence(self):
        flow = Flow()
        frame = flow.capture()
        self.assertEqual(frame.tau, flow.tau)
        self.assertEqual(frame.revision, flow.flow_fingerprint())
        self.assertEqual(frame.observation.local_heading_error_deg, flow.heading)
        self.assertTrue(frame.evidence)

    def test_pareto_demand_is_not_scalarized_and_dynamic_variable_enters_verification(self):
        core = build_core()
        flow = Flow()
        frame = flow.capture()
        core.open_current_epoch(frame)
        inputs = core._inputs(frame.observation)
        layers = pareto_demand_layers(inputs)
        self.assertGreaterEqual(len(layers), 1)
        assessment = core.assessment_operator.assess(inputs=inputs)
        dynamic = [
            x
            for x in assessment.requests
            if x.request_id.startswith("verify-current-additional:")
        ]
        self.assertTrue(dynamic)
        core.realize(frame.observation)
        record = core.responsibility_record()
        self.assertTrue(
            any(
                x["event"] == "activated"
                and x["variable"] == "heading_magnitude"
                for x in record["responsibility_variable_transitions"]
            )
        )
        self.assertNotIn("risk_score", str(record).lower())

    def test_resource_shortfall_remains_explicit_omega(self):
        probe = build_core()
        flow = Flow()
        frame = flow.capture()
        obs = frame.observation
        probe.open_current_epoch(frame)
        probe.realize(obs)
        required = probe.organic_resource_plan().required
        self.assertGreater(required, 1.0)

        core = build_core(available_work=max(0.0, required - 1.0))
        core.open_current_epoch(frame)
        try:
            core.realize(obs)
        except NoAdmissibleChoice:
            pass
        record = core.responsibility_record()
        verification = record["context"]["verification"]
        self.assertTrue(verification["omega"])
        self.assertTrue(verification["additional_unverified_scope"])
        self.assertLess(
            record["resource_plan"]["allocated"],
            record["resource_plan"]["required"],
        )

    def test_stale_current_reality_aborts_before_dispatch(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow()
        # Capture #1 is the decision premise; #2 is probe-preservation check;
        # #3 is the final pre-dispatch recapture.
        flow.mutate_on_capture_number = 3
        with self.assertRaises(StaleDecision):
            execute(core, flow, journal)
        self.assertEqual(flow.applied, 0)
        journal.close()

    def test_probe_detects_reality_change_without_dispatch(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow()
        flow.mutate_on_capture_number = 2
        with self.assertRaises(Exception) as caught:
            execute(core, flow, journal)
        self.assertIn("counterfactual probing", str(caught.exception))
        self.assertEqual(flow.applied, 0)
        journal.close()

    def test_uncertain_application_is_never_blindly_retried(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow()
        flow.fail_after_apply = True
        with self.assertRaises(TimeoutError):
            execute(core, flow, journal)
        self.assertEqual(flow.applied, 1)
        with self.assertRaises(DuplicateDispatch):
            execute(core, flow, journal)
        self.assertEqual(flow.applied, 1)
        journal.close()

    def test_relation_stays_open_until_observed_closure_and_horizon_does_not_force_it(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow()
        result = execute(core, flow, journal)
        manager = FrontRelationEpisodeManager(build_domain_bundle().closure_evaluator)
        self.assertTrue(manager.begin(result))
        self.assertEqual(manager.pending_count, 1)
        self.assertEqual(
            manager.observe_post(
                post_observation=flow.post_observation(front_present=True),
                post_tau=10.1,
            ),
            (),
        )
        snapshot = manager.observation_horizon_snapshot()
        self.assertEqual(snapshot["pending_relation_processes"], 1)
        self.assertFalse(snapshot["forced_closure"])
        completed = manager.observe_post(
            post_observation=flow.post_observation(front_present=False),
            post_tau=10.2,
        )
        self.assertEqual(len(completed), 1)
        self.assertEqual(completed[0].record.history_entry.realization_count, 1)
        journal.close()

    def test_closure_preserves_unresolved_provenance_and_later_reparticipates(self):
        core = build_core()
        execution_journal = ExecutionJournal(":memory:")
        flow = Flow()
        result = execute(core, flow, execution_journal)

        responsibility = deepcopy(result.responsibility_record)
        responsibility["context"]["verification"]["omega"] = [
            {
                "request": {
                    "request_id": "fixture-unresolved",
                    "question": "fixture pending verification",
                },
                "reason": "fixture current capacity ended",
            }
        ]
        result = replace(result, responsibility_record=responsibility)

        manager = FrontRelationEpisodeManager(build_domain_bundle().closure_evaluator)
        self.assertTrue(manager.begin(result))
        completed = manager.observe_post(
            post_observation=flow.post_observation(front_present=False),
            post_tau=10.2,
        )[0]

        with tempfile.TemporaryDirectory() as tmp:
            archive = ProcessArchive(f"{tmp}/process.sqlite")
            evidence = OrganicEvidenceLedger(f"{tmp}/evidence.sqlite")
            admission = OrganicHistoryCommitter(core=core, archive=archive).admit(
                completed, known_at_tau=10.2
            )
            evidence.record_decision(result)
            evidence.record_closure_admission(completed, admission)
            self.assertTrue(admission.unresolved)
            self.assertEqual(len(core.history_envelopes()), 1)

            later = Flow(epoch=201, tau=11.0, heading=0.0)
            later_frame = later.capture()
            view = core.open_current_epoch(later_frame)
            source = core.history_envelopes()[0].record.source
            key = (source.experience_id, source.relation_element_id)
            self.assertIn(source, view.relation_elements)
            self.assertIn(key, view.role_trace_by_relation)
            self.assertTrue(view.role_trace_by_relation[key])
            self.assertEqual(
                tuple(x["kind"] for x in evidence.events()),
                ("decision_realization", "closure_history_admission"),
            )
            evidence.close()
            archive.close()
        execution_journal.close()

    def test_dynamic_responsibility_deactivation_is_recorded_without_deleting_history(self):
        core = build_core()
        first = Flow(epoch=1, tau=1.0, heading=0.2)
        core.open_current_epoch(first.capture())
        second = Flow(epoch=2, tau=2.0, heading=0.0)
        core.open_current_epoch(second.capture())
        events = core.variable_ledger.events()
        self.assertTrue(any(x.event == "deactivated" for x in events))
        self.assertTrue(any(x.event == "activated" for x in events))


if __name__ == "__main__":
    unittest.main()
