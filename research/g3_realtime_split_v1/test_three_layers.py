from __future__ import annotations

from dataclasses import replace
from copy import deepcopy
import json
import os
import sys
from pathlib import Path
import tempfile
import time
import unittest
from types import SimpleNamespace
from contextlib import ExitStack
from unittest.mock import patch

from research.g3_organic_flow_v1.history import FrontRelationEpisodeManager, OrganicHistoryCommitter
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_organic_flow_v1.test_organic_flow import Flow
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness, DeferredProbes, validate_result
from research.g3_realtime_split_v1.test_split_runtime import build_split_core, execute
from research.g3_realtime_split_v1.worker import DeferredRelationWorker, DeferredWorkerError
from research.oasis_core_v12.process_archive import ProcessArchive
from research.oasis_core_v12.runtime import ExecutionJournal, StaleDecision, DuplicateDispatch


class ChildOnlyRelationOperator:
    def __init__(self, delegate, *, delay=0.0, fail=False):
        self.delegate, self.delay, self.fail = delegate, delay, fail
        self.owner = os.getpid()

    def relate(self, **kwargs):
        if os.getpid() != self.owner:
            if self.fail:
                raise RuntimeError("injected validation failure")
            time.sleep(self.delay)
        return self.delegate.relate(**kwargs)


class BrokenClosure:
    def evaluate(self, **kwargs):
        raise RuntimeError("injected Closure failure")


def seed_history(core, closure, root):
    journal = ExecutionJournal(":memory:")
    archive = ProcessArchive(str(root / "seed.sqlite"))
    manager = FrontRelationEpisodeManager(closure)
    flow = Flow(epoch=100, tau=1.0)
    manager.begin(execute(core, flow, journal))
    flow.epoch, flow.tau = 101, 1.1
    manager.begin(execute(core, flow, journal))
    committer = OrganicHistoryCommitter(core=core, archive=archive)
    for item in manager.observe_post(post_observation=flow.post_observation(front_present=False), post_tau=1.2):
        committer.admit(item)
    archive.close()
    journal.close()
    return core.published_history_envelopes()


class ThreeLayerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.core, self.closure = build_split_core()
        self.journal = ExecutionJournal(":memory:")
        self.worker = None

    def tearDown(self):
        if self.worker is not None:
            self.worker.close(timeout=5)
        self.journal.close()
        self.tmp.cleanup()

    def start(self, closure=None):
        self.worker = DeferredRelationWorker(core=self.core,
            closure_evaluator=self.closure if closure is None else closure,
            scope_id="three-layer", archive_path=self.root / "archive.sqlite",
            evidence_path=self.root / "relations.sqlite", trace_path=self.root / "trace.jsonl")
        self.worker.start()
        return RealtimeOrganicHarness(self.core, self.journal, authorize=lambda *_: True, worker=self.worker)

    def decide(self, harness, flow):
        return harness.execute_decision_epoch(flow, run_id="three-layer", subject_id="ego",
                                             deadline_tau=flow.tau + 5)

    def post(self, flow, *, front=False):
        self.worker.submit_post(post_observation=flow.post_observation(front_present=front),
            post_tau=flow.tau + 0.1, tick_index=1, carla_frame=flow.epoch + 1)

    def test_validation_matches_frozen_and_relation_preserves_independent_provenance(self):
        seed_history(self.core, self.closure, self.root)
        reference = deepcopy(self.core)
        reference_journal = ExecutionJournal(":memory:")
        expected = execute(reference, Flow(epoch=200, tau=10), reference_journal, run_id="three-layer")
        reference_journal.close()
        self.assertTrue(expected.execution.recorder.group_participation)
        harness = self.start()
        flow = Flow(epoch=200, tau=10)
        with patch.object(self.core, "ablate_relation", side_effect=AssertionError("action ablation")), \
             patch.object(self.core, "ablate_relation_group", side_effect=AssertionError("action joint probe")):
            actual = self.decide(harness, flow)
        deferred = actual.execution.recorder
        self.assertIsInstance(deferred, DeferredProbes)
        self.assertEqual(actual.selected, expected.selected)
        self.assertEqual(actual.responsibility_record, expected.responsibility_record)
        actual.responsibility_record["after_submit_mutation"] = True
        self.post(flow)
        health = self.worker.drain(10)
        self.assertEqual(health.closures_committed, 1)
        self.assertNotEqual(health.validation_pid, os.getpid())
        self.assertNotEqual(health.relation_pid, os.getpid())
        self.assertNotEqual(health.validation_pid, health.relation_pid)

        # Observation/Validation remains the full frozen G3.2 measurement record.
        ledger = OrganicEvidenceLedger(str(self.worker.validation_evidence_path))
        decision = ledger.events()[0]["payload"]
        ledger.close()
        self.assertNotIn("after_submit_mutation", decision["responsibility"])
        self.assertEqual(
            decision["decision_record"],
            json.loads(json.dumps(expected.execution.recorder.decision_record())),
        )

        # Relation/Experience must not wait for that measurement. It preserves the
        # realized/Closure facts and decision-time relation genealogy, but does not
        # mislabel unobserved deferred measurements as zero-valued participation.
        ledger = OrganicEvidenceLedger(str(self.worker.evidence_path))
        completed = ledger.events()[0]["payload"]["history_entry"]
        ledger.close()
        manager = FrontRelationEpisodeManager(self.closure, scope_id="three-layer")
        manager.begin(expected)
        from dataclasses import asdict
        expected_entry = manager.observe_post(
            post_observation=flow.post_observation(front_present=False), post_tau=10.1
        )[0].record.history_entry
        expected_dict = json.loads(json.dumps(asdict(expected_entry)))
        for key in (
            "entry_id", "decision_tau", "realized_tau", "outcome_tau",
            "relation_end_tau", "selected_possibility_id", "realization_ref",
            "realization_count", "outcome_description", "current_reality",
            "closure_method",
        ):
            self.assertEqual(completed[key], expected_dict[key], key)
        for key, value in expected_dict["closure_evidence"].items():
            self.assertEqual(completed["closure_evidence"][key], value, key)
        self.assertEqual(completed["participation"], [])
        self.assertEqual(completed["group_participation"], [])
        self.assertEqual(completed["reconstruction"], [])
        self.assertEqual(completed["provenance"], [])
        self.assertEqual(
            completed["closure_evidence"]["decision_snapshot_digest"], deferred.digest
        )
        self.assertEqual(
            completed["closure_evidence"]["observational_validation"],
            "independent_deferred",
        )
        relation_refs = tuple(
            (
                item["experience_id"],
                item["relation_element_id"],
                float(item["completed_at_tau"]),
            )
            for item in completed["closure_evidence"]["decision_relation_refs"]
        )
        self.assertEqual(relation_refs, deferred.relation_refs)
        self.assertEqual(health.queued_events, 0)
        self.assertEqual(health.validation_backlog, 0)
        self.assertGreaterEqual(health.publication_lag_seconds, 0)

    def test_slow_validation_cannot_hold_two_actions(self):
        seed_history(self.core, self.closure, self.root)
        self.core.relation_operator = ChildOnlyRelationOperator(self.core.relation_operator, delay=0.2)
        harness = self.start()
        flow = Flow(epoch=200, tau=10)
        self.decide(harness, flow)
        self.post(flow)
        flow.epoch, flow.tau = 201, 10.2
        self.decide(harness, flow)
        self.assertEqual(flow.applied, 2)
        self.assertLess(harness.metrics["decision_latency_seconds"], 0.2)
        health = self.worker.drain(15)
        self.assertGreater(health.validation_max_processing_seconds, 0.2)
        self.assertGreaterEqual(health.validation_max_backlog, 1)

    def test_validation_failure_keeps_action_and_relation_but_fails_completeness(self):
        seed_history(self.core, self.closure, self.root)
        self.core.relation_operator = ChildOnlyRelationOperator(self.core.relation_operator, fail=True)
        harness = self.start()
        flow = Flow(epoch=200, tau=10)
        self.decide(harness, flow)
        self.post(flow)
        with self.assertRaises(DeferredWorkerError):
            self.worker.drain(10)
        health = self.worker.health()
        self.assertTrue(health.degraded)
        self.assertTrue(health.validation_degraded)
        self.assertFalse(health.relation_degraded)
        self.assertEqual(health.closures_committed, 1)
        flow.epoch, flow.tau = 201, 10.2
        self.assertTrue(self.decide(harness, flow).realized)
        self.assertFalse(harness.metrics["validation_submission_accepted"])

    def test_relation_failure_and_hard_exit_are_detected(self):
        harness = self.start(BrokenClosure())
        flow = Flow(epoch=200, tau=10)
        self.decide(harness, flow)
        self.post(flow)
        with self.assertRaises(DeferredWorkerError):
            self.worker.drain(10)
        health = self.worker.health()
        self.assertTrue(health.degraded)
        self.assertTrue(health.relation_degraded)
        self.assertFalse(health.validation_degraded)
        self.assertGreaterEqual(health.validation_processed_events, 2)
        self.worker.close()
        self.worker = None
        harness = self.start()
        self.worker._validation.terminate()
        self.worker._validation.join(2)
        flow.epoch, flow.tau = 201, 10.2
        self.assertTrue(self.decide(harness, flow).realized)
        health = self.worker.health()
        self.assertTrue(health.degraded)
        self.assertTrue(health.validation_degraded)
        self.assertFalse(health.relation_degraded)

    def test_snapshot_corruption_rejected_before_history(self):
        harness = self.start()
        result = self.decide(harness, Flow(epoch=200, tau=10))
        deferred = result.execution.recorder
        damaged = replace(deferred, snapshot=deferred.snapshot + b"corruption")
        with self.assertRaisesRegex(ValueError, "digest"):
            validate_result(replace(result, execution=replace(result.execution, recorder=damaged)))

    def test_later_parent_history_cannot_change_decision_snapshot(self):
        seed_history(self.core, self.closure, self.root)
        harness = self.start()
        result = self.decide(harness, Flow(epoch=200, tau=10))
        before = validate_result(result).execution.recorder.decision_record()
        other, _ = build_split_core()
        self.core._history = other._history
        self.core.open_current_epoch(Flow(epoch=201, tau=11).capture())
        after = validate_result(result).execution.recorder.decision_record()
        self.assertEqual(before, after)

    def test_drain_timeout_and_serialization_failure_are_explicit(self):
        harness = self.start()
        self.worker._validation.terminate()
        self.worker._validation.join(2)
        self.assertFalse(self.worker.submit_begin(lambda: None))
        self.assertTrue(self.worker.health().degraded)
        self.worker.close(timeout=0.1)
        self.worker = None
        harness = self.start()
        self.assertFalse(self.worker.submit_begin(lambda: None))
        self.assertIn("serialization", self.worker.health().fatal_error)
        self.worker.close(timeout=0.1)
        self.worker = None
        harness = self.start()
        with self.assertRaises(DeferredWorkerError):
            self.worker.drain(timeout=0)
        self.assertTrue(self.worker.health().degraded)

    def test_same_epoch_reopen_never_imports_new_publication(self):
        frame = Flow(epoch=200, tau=10).capture()
        self.core.open_current_epoch(frame)
        other, _ = build_split_core()
        envelopes = seed_history(other, self.closure, self.root)
        self.core.publish_validated_history_batch(envelopes)
        self.core.open_current_epoch(frame)
        self.assertFalse(self.core.history_envelopes())
        self.core.open_current_epoch(Flow(epoch=201, tau=10.1).capture())
        self.assertEqual(len(self.core.history_envelopes()), 2)
        with self.assertRaisesRegex(Exception, "backwards"):
            self.core.open_current_epoch(frame)

    def test_atomic_stale_authority_and_duplicate_contracts_survive(self):
        harness = self.start()
        flow = Flow(epoch=200, tau=10)
        flow.mutate_on_capture_number = 2
        with self.assertRaises(StaleDecision):
            self.decide(harness, flow)
        self.assertEqual(flow.applied, 0)
        flow = Flow(epoch=201, tau=11)
        harness.authorize = lambda *_: False
        with self.assertRaisesRegex(Exception, "authority"):
            self.decide(harness, flow)
        self.assertEqual(flow.applied, 0)
        harness.authorize = lambda *_: True
        self.decide(harness, Flow(epoch=202, tau=12))
        with self.assertRaises(DuplicateDispatch):
            self.decide(harness, Flow(epoch=202, tau=12))

    def test_control_boundary_cannot_drain_or_close(self):
        harness = self.start()
        def authorize(*_):
            with self.assertRaisesRegex(DeferredWorkerError, "control"):
                self.worker.drain(1)
            with self.assertRaisesRegex(DeferredWorkerError, "control"):
                self.worker.close(timeout=1)
            return True
        harness.authorize = authorize
        self.assertTrue(self.decide(harness, Flow(epoch=200, tau=10)).realized)

    def test_multiple_closures_are_counted_and_share_occurrence(self):
        harness = self.start()
        flow = Flow(epoch=200, tau=10)
        self.decide(harness, flow)
        flow.epoch, flow.tau = 201, 10.1
        self.decide(harness, flow)
        self.post(flow)
        health = self.worker.drain(10)
        self.assertEqual(health.closures_committed, 2)
        self.assertEqual(len(self.core.published_history_envelopes()), 2)
        self.assertEqual(len({x.occurrence_refs for x in self.core.published_history_envelopes()}), 1)

    def test_protected_a6_rejected_before_any_output(self):
        from research.g3_realtime_split_v1.live_runner import run_flow
        with self.assertRaisesRegex(Exception, "preserved"):
            run_flow(flow_id="OF-01", attempt=6, output_root=self.root, host="unused", port=0)
        with self.assertRaisesRegex(Exception, "protected"):
            run_flow(flow_id="OF-01", attempt=7, output_root=self.root / "OF-01-A6", host="unused", port=0)
        self.assertFalse(list(self.root.iterdir()))

    def test_candidate_runner_terminal_status_with_fake_flow(self):
        from research.g3_realtime_split_v1 import live_runner as runner
        for fail in (False, True):
            with self.subTest(worker_failure=fail), ExitStack() as stack:
                protocol = deepcopy(runner.load_preregistration())
                protocol["environment"]["planned_horizon_ticks_per_flow"] = 2
                protocol["environment"]["npc_count"] = 0
                flow = Flow(epoch=200, tau=10)
                class World:
                    def get_snapshot(self):
                        return SimpleNamespace(frame=flow.epoch,
                            timestamp=SimpleNamespace(elapsed_seconds=flow.tau))
                    def tick(self):
                        flow.epoch += 1
                        flow.tau += 0.05
                        flow.front_present = False
                        return flow.epoch
                world = World()
                class Guard:
                    record = SimpleNamespace(sha256="fixture", source_snapshot_commit="fixture")
                    def __init__(self, **kwargs):
                        pass
                    def assert_current(self):
                        return {"carla_client_version": runner.EXPECTED_CARLA_VERSION,
                                "carla_server_version": runner.EXPECTED_CARLA_VERSION}
                core, closure = build_split_core()
                mocks = {
                    "load_preregistration": lambda: protocol,
                    "prepare_live_world": lambda *a, **k: (world, None),
                    "build_scene_plan": lambda *a, **k: {},
                    "spawn_scene": lambda *a, **k: (None, [None]),
                    "OrganicRuntimeIdentityGuard": Guard,
                    "OrganicCARLAAtomicPort": lambda **k: flow,
                    "build_organic_core": lambda: (core, BrokenClosure() if fail else closure),
                    "_cleanup": lambda *a: None,
                }
                for name, value in mocks.items():
                    stack.enter_context(patch.object(runner, name, value))
                prior_carla = sys.modules.get("carla")
                sys.modules["carla"] = SimpleNamespace(
                    Client=lambda *a: SimpleNamespace(set_timeout=lambda *_: None))
                def restore_carla(prior=prior_carla):
                    if prior is None:
                        sys.modules.pop("carla", None)
                    else:
                        sys.modules["carla"] = prior
                stack.callback(restore_carla)
                output = self.root / ("failed" if fail else "complete")
                if fail:
                    with self.assertRaises(DeferredWorkerError):
                        runner.run_flow(flow_id="OF-01", attempt=7, output_root=output, host="fixture", port=0)
                else:
                    runner.run_flow(flow_id="OF-01", attempt=7, output_root=output, host="fixture", port=0)
                status = json.loads((output / runner.PROTOCOL_ID / "OF-01-A7" / "status.json").read_text())
                self.assertEqual(status["valid_complete"], not fail)
                self.assertEqual(status["empirical_ticks"], 2)
                self.assertEqual(status["layer_health"]["degraded"], fail)
                self.assertEqual(flow.epoch, 202)


if __name__ == "__main__":
    unittest.main()
