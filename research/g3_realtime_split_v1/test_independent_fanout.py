from __future__ import annotations

from contextlib import suppress
from pathlib import Path
import tempfile
import time
import unittest

from research.g3_organic_flow_v1.test_organic_flow import Flow
from research.g3_realtime_split_v1.runtime import RealtimeOrganicHarness
from research.g3_realtime_split_v1.test_split_runtime import build_split_core
from research.g3_realtime_split_v1.test_three_layers import (
    ChildOnlyRelationOperator,
    seed_history,
)
from research.g3_realtime_split_v1.worker import DeferredRelationWorker
from research.oasis_core_v12.runtime import ExecutionJournal


class IndependentFanoutRegression(unittest.TestCase):
    """Relation/Experience and Observation/Validation must never gate each other."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.core, self.closure = build_split_core()
        self.journal = ExecutionJournal(":memory:")
        self.worker = None

    def tearDown(self):
        if self.worker is not None:
            with suppress(Exception):
                self.worker.close(timeout=0.5)
        self.journal.close()
        self.tmp.cleanup()

    def _start(self):
        self.worker = DeferredRelationWorker(
            core=self.core,
            closure_evaluator=self.closure,
            scope_id="independent-fanout",
            archive_path=self.root / "archive.sqlite",
            evidence_path=self.root / "relation.sqlite",
            trace_path=self.root / "relation.jsonl",
        )
        self.worker.start()
        return RealtimeOrganicHarness(
            self.core,
            self.journal,
            authorize=lambda *_: True,
            worker=self.worker,
        )

    def _close_front_relation(self, harness, *, epoch=200, tau=10.0):
        flow = Flow(epoch=epoch, tau=tau)
        result = harness.execute_decision_epoch(
            flow,
            run_id="fanout-regression",
            subject_id="ego",
            deadline_tau=flow.tau + 5.0,
        )
        self.assertTrue(result.realized)
        return self.worker.submit_post(
            post_observation=flow.post_observation(front_present=False),
            post_tau=flow.tau + 0.1,
            tick_index=1,
            carla_frame=flow.epoch + 1,
        )

    def _wait_for_relation_closure(self, seconds=1.5):
        deadline = time.monotonic() + seconds
        health = self.worker.health()
        while health.closures_committed < 1 and time.monotonic() < deadline:
            time.sleep(0.02)
            health = self.worker.health()
        return health

    def test_slow_validation_cannot_gate_relation_closure(self):
        seed_history(self.core, self.closure, self.root)
        self.core.relation_operator = ChildOnlyRelationOperator(
            self.core.relation_operator,
            delay=3.0,
        )
        harness = self._start()
        self._close_front_relation(harness)

        health = self._wait_for_relation_closure()
        self.assertEqual(
            health.closures_committed,
            1,
            f"Relation/Experience was gated by slow Observation/Validation: {health!r}",
        )
        self.assertLess(
            health.validation_processed_events,
            health.submitted_events,
            f"regression did not observe validation lag while relation advanced: {health!r}",
        )

    def test_dead_validation_cannot_gate_relation_closure(self):
        harness = self._start()
        self.worker._validation.terminate()
        self.worker._validation.join(2.0)

        accepted = self._close_front_relation(harness, epoch=210, tau=11.0)
        health = self._wait_for_relation_closure()
        self.assertEqual(
            health.closures_committed,
            1,
            f"Relation/Experience stopped because Observation/Validation exited; accepted={accepted}, health={health!r}",
        )
        self.assertTrue(health.degraded)


if __name__ == "__main__":
    unittest.main()
