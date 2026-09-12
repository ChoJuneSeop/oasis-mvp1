from __future__ import annotations

import tempfile
import threading
import unittest
from pathlib import Path

from research.g3_organic_flow_v1.operators import (
    OrganicCurrentAssessment,
    OrganicCurrentVerifier,
    OrganicResponsibilityResourceAllocator,
)
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_organic_flow_v1.test_organic_flow import Flow
from research.g3_realtime_split_v1.core import EpochSnapshotOrganicCore
from research.g3_realtime_split_v1.worker import DeferredRelationWorker
from research.integration_checkpoint.frame import V12ResponsibilityEvidenceAdapter
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.runtime import ExecutionJournal


def build_split_core():
    base_bundle = build_domain_bundle()
    base = base_bundle.core
    core = EpochSnapshotOrganicCore(
        assessment_operator=OrganicCurrentAssessment(),
        verifier=OrganicCurrentVerifier(),
        preference_operator=ParetoContextPreference(),
        resource_allocator=OrganicResponsibilityResourceAllocator(),
        relation_builder=base.relation_builder,
        candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator,
        reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=V12ResponsibilityEvidenceAdapter(
            base.responsibility_operator
        ),
        actuation_operator=base.actuation_operator,
    )
    return core, base_bundle.closure_evaluator


def execute(core, flow, journal, *, run_id="split-test"):
    harness = OrganicHarness(core, journal, authorize=lambda *_: True)
    return harness.execute_decision_epoch(
        flow,
        run_id=run_id,
        subject_id="ego",
        deadline_tau=flow.tau + 5.0,
    )


class GateClosureEvaluator:
    def __init__(self, delegate, gate: threading.Event):
        self.delegate = delegate
        self.gate = gate
        self.entered = threading.Event()

    def evaluate(self, **kwargs):
        self.entered.set()
        self.gate.wait(5.0)
        return self.delegate.evaluate(**kwargs)


class RealtimeSplitTests(unittest.TestCase):
    def test_deferred_worker_does_not_run_closure_on_submitter_path(self):
        core, closure = build_split_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow(epoch=500, tau=30.0)
        result = execute(core, flow, journal)
        gate = threading.Event()
        slow = GateClosureEvaluator(closure, gate)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = DeferredRelationWorker(
                core=core,
                closure_evaluator=slow,
                scope_id="test:ego/front-interaction",
                archive_path=root / "archive.sqlite",
                evidence_path=root / "deferred_evidence.sqlite",
                trace_path=root / "deferred_trace.jsonl",
            )
            worker.start()
            self.assertTrue(worker.submit_begin(result))
            self.assertTrue(
                worker.submit_post(
                    post_observation=flow.post_observation(front_present=False),
                    post_tau=30.1,
                    tick_index=1,
                    carla_frame=501,
                )
            )
            self.assertTrue(slow.entered.wait(1.0))
            # Closure evaluation is deliberately blocked inside the worker. The caller
            # has already returned from both submissions, so no Closure/history work is
            # executing on the decision/actuation submitter path.
            self.assertTrue(worker.health().alive)
            gate.set()
            health = worker.drain(timeout=5.0)
            self.assertEqual(health.closures_committed, 1)
            worker.close(timeout=5.0)
        journal.close()

    def test_history_published_after_closure_is_visible_only_from_next_epoch(self):
        core, closure = build_split_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow(epoch=600, tau=40.0)
        result = execute(core, flow, journal)
        # The current epoch captured empty history before the relation was completed.
        self.assertEqual(len(core.history_envelopes()), 0)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = DeferredRelationWorker(
                core=core,
                closure_evaluator=closure,
                scope_id="test:ego/front-interaction",
                archive_path=root / "archive.sqlite",
                evidence_path=root / "deferred_evidence.sqlite",
                trace_path=root / "deferred_trace.jsonl",
            )
            worker.start()
            worker.submit_begin(result)
            worker.submit_post(
                post_observation=flow.post_observation(front_present=False),
                post_tau=40.1,
                tick_index=1,
                carla_frame=601,
            )
            worker.drain(timeout=5.0)

            # Publication happened, but it must not rewrite the already-open epoch.
            self.assertEqual(len(core.published_history_envelopes()), 1)
            self.assertEqual(len(core.history_envelopes()), 0)

            flow.epoch = 601
            flow.tau = 40.2
            core.open_current_epoch(flow.capture())
            self.assertEqual(len(core.history_envelopes()), 1)
            worker.close(timeout=5.0)
        journal.close()

    def test_open_relation_is_not_forced_closed_by_drain(self):
        core, closure = build_split_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow(epoch=700, tau=50.0)
        result = execute(core, flow, journal)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = DeferredRelationWorker(
                core=core,
                closure_evaluator=closure,
                scope_id="test:ego/front-interaction",
                archive_path=root / "archive.sqlite",
                evidence_path=root / "deferred_evidence.sqlite",
                trace_path=root / "deferred_trace.jsonl",
            )
            worker.start()
            worker.submit_begin(result)
            worker.submit_post(
                post_observation=flow.post_observation(front_present=True),
                post_tau=50.1,
                tick_index=1,
                carla_frame=701,
            )
            health = worker.drain(timeout=5.0)
            self.assertEqual(health.closures_committed, 0)
            self.assertEqual(health.pending_relation_processes, 1)
            self.assertEqual(len(core.published_history_envelopes()), 0)
            worker.close(timeout=5.0)
        journal.close()


if __name__ == "__main__":
    unittest.main()
