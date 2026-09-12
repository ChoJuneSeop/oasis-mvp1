from __future__ import annotations

"""Reality/Action and decision-time snapshots (현재 행동과 결정 시점 불변 기록)."""

from copy import deepcopy
from dataclasses import dataclass, replace
from hashlib import sha256
import pickle
import time

from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_realtime_split_v1.core import EpochSnapshotOrganicCore


@dataclass(frozen=True)
class DeferredProbes:
    """An explicitly unvalidated record, never a completed G3.2 recorder."""

    snapshot: bytes
    digest: str
    distribution: tuple

    @property
    def possibility_distribution(self):
        return dict(self.distribution)


@dataclass(frozen=True)
class SnapshotFlow:
    frame: object

    def capture(self):
        return deepcopy(self.frame)


def capture_probes(core, frame, view):
    # Only evaluation state is copied. No growing responsibility ledger, live port,
    # execution journal, runtime worker, or CARLA handle enters the child process.
    probe_core = object.__new__(EpochSnapshotOrganicCore)
    for name in ("relation_builder", "candidate_provider", "relation_operator",
                 "reconstruction_operator", "responsibility_operator"):
        setattr(probe_core, name, getattr(core, name))
    probe_core._frame = frame
    probe_core._history = core._history_view()
    probe_core._epoch_history_snapshot = probe_core._history
    payload = pickle.dumps((probe_core, frame, view), protocol=pickle.HIGHEST_PROTOCOL)
    return DeferredProbes(payload, sha256(payload).hexdigest(),
                          tuple(view.possibility_distribution.items()))


def validate_result(result):
    """Reproduce all frozen individual/joint probes with no live flow access."""
    if result.execution is None:
        return result
    deferred = result.execution.recorder
    if not isinstance(deferred, DeferredProbes):
        return result  # Compatibility: callers may submit a fully recorded decision.
    if sha256(deferred.snapshot).hexdigest() != deferred.digest:
        raise ValueError("decision-time snapshot digest mismatch")
    core, frame, view = pickle.loads(deferred.snapshot)
    execution = result.execution
    if (frame.tau != execution.tau or frame.observation != execution.observation
            or frame.revision != execution.before_fingerprint
            or view.possibility_distribution != deferred.possibility_distribution):
        raise ValueError("decision-time snapshot/execution binding mismatch")
    if core._evaluate(frame.observation).possibility_distribution != view.possibility_distribution:
        raise ValueError("snapshot evaluation does not reproduce decision distribution")
    harness = OrganicHarness(core, None, authorize=None)
    recorder = harness._record_probes(SnapshotFlow(frame), frame=frame, view=view)
    return replace(result, execution=replace(execution, recorder=recorder))


class TimedFlow:
    def __init__(self, flow, metrics, started):
        self.flow, self.metrics, self.started = flow, metrics, started

    def capture(self):
        return self.flow.capture()

    def apply_if_current(self, *args, **kwargs):
        started = time.perf_counter()
        self.metrics["decision_latency_seconds"] = started - self.started
        try:
            return self.flow.apply_if_current(*args, **kwargs)
        finally:
            self.metrics["actuation_latency_seconds"] = time.perf_counter() - started


class RealtimeOrganicHarness(OrganicHarness):
    """Keep the frozen atomic dispatch contract; defer observational ablations."""

    def __init__(self, core, journal, *, authorize, worker):
        super().__init__(core, journal, authorize=authorize)
        self.worker = worker
        self.metrics = {}

    def _record_probes(self, flow, *, frame, view):
        started = time.perf_counter()
        snapshot = capture_probes(self.core, frame, view)
        self.metrics["snapshot_latency_seconds"] = time.perf_counter() - started
        self.metrics["snapshot_bytes"] = len(snapshot.snapshot)
        return snapshot

    def execute_decision_epoch(self, flow, **kwargs):
        self.worker.publish_available()
        self.worker._in_control = True
        started = time.perf_counter()
        self.metrics = {
            "decision_latency_seconds": None, "actuation_latency_seconds": None,
            "action_backlog": 0, "action_queue_delay_seconds": 0.0,
        }
        try:
            result = super().execute_decision_epoch(TimedFlow(flow, self.metrics, started), **kwargs)
            self.metrics["validation_submission_accepted"] = self.worker.submit_begin(result)
            return result
        finally:
            self.metrics["action_path_latency_seconds"] = time.perf_counter() - started
            self.worker._in_control = False
