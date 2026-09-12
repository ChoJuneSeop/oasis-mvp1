import tempfile
import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g32_live_execution_v1.episode import FrontRelationEpisodeManager
from research.g32_live_execution_v1.ledger import LiveEvidenceLedger
from research.g32_live_execution_v1.live_history import LiveHistoryCommitter
from research.g32_live_execution_v1.test_live_core import Flow, build_core
from research.g32_live_execution_v1.runner import inert_resource_sentinel
from research.integration_checkpoint.frame import current_frame_from_host
from research.integration_checkpoint.harness_adapter import CorePortAdapter, IntegratedHarness
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.process_archive import ProcessArchive


class LiveHistoryTests(unittest.TestCase):
    def execute(self, core, flow):
        return IntegratedHarness(CorePortAdapter(core)).execute_decision_epoch(
            flow,
            resources=inert_resource_sentinel(),
        )

    def test_multiple_decision_epochs_can_remain_pending_until_one_relation_closure(self):
        core = build_core()
        manager = FrontRelationEpisodeManager(
            build_domain_bundle().closure_evaluator
        )
        flow1 = Flow()
        first = self.execute(core, flow1)
        self.assertTrue(
            manager.begin(first, decision_responsibility=core.responsibility_record())
        )

        flow2 = Flow()
        flow2.tau = 10.05
        second = self.execute(core, flow2)
        self.assertTrue(
            manager.begin(second, decision_responsibility=core.responsibility_record())
        )
        self.assertEqual(manager.pending_count, 2)

        opened = manager.observe_post(
            post_observation=second.observation,
            post_tau=10.10,
        )
        self.assertEqual(opened, ())
        self.assertEqual(manager.pending_count, 2)

        o = second.observation
        closed_observation = PresentObservation(
            o.epoch + 1,
            o.ego_speed_mps,
            False,
            0.0,
            0.0,
            "none",
            o.local_heading_error_deg,
            o.local_density,
        )
        completed = manager.observe_post(
            post_observation=closed_observation,
            post_tau=10.20,
        )
        self.assertEqual(len(completed), 2)
        self.assertEqual(manager.pending_count, 0)
        self.assertEqual(
            {x.record.history_entry.realization_count for x in completed},
            {1},
        )

    def test_closure_admission_ledger_and_later_reparticipation(self):
        core = build_core(available_work=1.0)
        flow = Flow()
        execution = self.execute(core, flow)
        responsibility = core.responsibility_record()
        manager = FrontRelationEpisodeManager(
            build_domain_bundle().closure_evaluator
        )
        self.assertTrue(
            manager.begin(
                execution,
                decision_responsibility=responsibility,
            )
        )

        opened = manager.observe_post(
            post_observation=execution.observation,
            post_tau=10.1,
        )
        self.assertEqual(opened, ())
        self.assertTrue(manager.active)

        o = execution.observation
        closed_observation = PresentObservation(
            o.epoch + 1,
            o.ego_speed_mps,
            False,
            0.0,
            0.0,
            "none",
            o.local_heading_error_deg,
            o.local_density,
        )
        completed = manager.observe_post(
            post_observation=closed_observation,
            post_tau=10.2,
        )
        self.assertEqual(len(completed), 1)
        self.assertFalse(manager.active)
        completed_episode = completed[0]

        with tempfile.TemporaryDirectory() as tmp:
            archive = ProcessArchive(f"{tmp}/process.sqlite")
            ledger = LiveEvidenceLedger(f"{tmp}/ledger.sqlite")
            ledger.freeze_runtime_identity(
                {
                    "carla_client_version": "fixture",
                    "carla_server_version": "fixture",
                    "map_name": "Town10HD_Opt",
                    "synchronous_mode": True,
                    "fixed_delta_seconds": 0.05,
                    "no_rendering_mode": False,
                }
            )
            ledger.record_decision(execution, responsibility)

            admission = LiveHistoryCommitter(core=core, archive=archive).admit(
                completed_episode,
                known_at_tau=10.2,
            )
            ledger.record_closure_admission(completed_episode, admission)
            self.assertEqual(len(admission.admitted_relation_keys), 1)
            self.assertGreater(len(admission.unresolved), 0)
            self.assertEqual(len(core.history_envelopes()), 1)
            self.assertEqual(
                tuple(x["kind"] for x in ledger.events()),
                ("decision_realization", "closure_history_admission"),
            )

            current = PresentObservation(
                o.epoch + 2,
                o.ego_speed_mps,
                True,
                o.front_gap_m,
                o.front_closing_mps,
                o.front_kind,
                o.local_heading_error_deg,
                o.local_density,
            )
            frame = current_frame_from_host(
                current,
                tau=11.0,
                revision="later-current-relation",
            )
            view = core.open_current_epoch(frame)
            source = core.history_envelopes()[0].record.source
            key = (source.experience_id, source.relation_element_id)
            self.assertIn(source, view.relation_elements)
            self.assertIn(key, view.role_trace_by_relation)
            self.assertGreater(len(view.role_trace_by_relation[key]), 0)
            ledger.close()
            archive.close()


if __name__ == "__main__":
    unittest.main()
