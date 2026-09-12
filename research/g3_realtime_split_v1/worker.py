from __future__ import annotations

"""Three-layer process transport; no live flow, forced Closure, or semantic timeout."""

from contextlib import ExitStack
from dataclasses import dataclass
import json
import multiprocessing as mp
from pathlib import Path
import pickle
import queue
import time

from research.g3_organic_flow_v1.history import FrontRelationEpisodeManager, OrganicHistoryCommitter
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.oasis_core_v12.process_archive import ProcessArchive
from research.g3_realtime_split_v1.runtime import validate_result


class DeferredWorkerError(RuntimeError):
    pass


@dataclass(frozen=True)
class DeferredWorkerHealth:
    alive: bool
    fatal_error: str | None
    submitted_events: int
    processed_events: int
    queued_events: int
    max_queued_events: int
    pending_relation_processes: int
    closures_committed: int
    dropped_after_failure: int
    last_queue_delay_seconds: float
    max_queue_delay_seconds: float
    last_processing_seconds: float
    max_processing_seconds: float
    publication_lag_seconds: float = 0.0
    max_publication_lag_seconds: float = 0.0
    degraded: bool = False
    validation_alive: bool = False
    validation_processed_events: int = 0
    validation_backlog: int = 0
    validation_queue_delay_seconds: float = 0.0
    validation_processing_seconds: float = 0.0
    validation_max_queue_delay_seconds: float = 0.0
    validation_max_processing_seconds: float = 0.0
    relation_backlog: int = 0
    validation_max_backlog: int = 0
    relation_max_backlog: int = 0
    publication_lag_epochs: int = 0
    validation_pid: int | None = None
    relation_pid: int | None = None


def _send(channel, message):
    # Serialize before Queue.put: the feeder thread only ever handles immutable bytes.
    channel.put(pickle.dumps(message, protocol=pickle.HIGHEST_PROTOCOL))


def _trace(handle, **payload):
    handle.write(json.dumps(payload, sort_keys=True, allow_nan=False) + "\n")
    handle.flush()


def _validation_process(events, relations, reports, evidence_path, trace_path):
    try:
        with ExitStack() as stack:
            evidence = OrganicEvidenceLedger(str(evidence_path))
            stack.callback(evidence.close)
            trace = stack.enter_context(Path(trace_path).open("a", encoding="utf-8"))
            while True:
                event = pickle.loads(events.get())
                kind, serial, payload, enqueued = event
                started = time.perf_counter()
                if kind == "stop":
                    _send(relations, event)
                    break
                if kind == "begin":
                    payload = validate_result(payload)
                    evidence.record_decision(payload)
                # One producer and FIFO preserve begin/post order even when validation
                # lags across many epochs. Relation construction never uses a placeholder.
                _send(relations, (kind, serial, payload, time.perf_counter()))
                processing = time.perf_counter() - started
                _send(reports, ("validation", serial, started - enqueued, processing))
                _trace(trace, layer="validation", serial=serial, kind=kind,
                       queue_delay_seconds=started - enqueued, processing_seconds=processing)
    except BaseException as exc:
        _send(reports, ("failure", "validation", f"{type(exc).__name__}: {exc}"))


def _relation_process(events, reports, *, core, closure_evaluator, scope_id,
                      archive_path, evidence_path, trace_path):
    try:
        with ExitStack() as stack:
            archive = ProcessArchive(str(archive_path))
            stack.callback(archive.close)
            evidence = OrganicEvidenceLedger(str(evidence_path))
            stack.callback(evidence.close)
            trace = stack.enter_context(Path(trace_path).open("a", encoding="utf-8"))
            manager = FrontRelationEpisodeManager(closure_evaluator, scope_id=scope_id)
            committer = OrganicHistoryCommitter(core=core, archive=archive)
            while True:
                kind, serial, payload, enqueued = pickle.loads(events.get())
                started = time.perf_counter()
                if kind == "stop":
                    evidence.record_horizon(manager.observation_horizon_snapshot())
                    _send(reports, ("stopped",))
                    break
                admitted = 0
                publication = None
                source_epoch = None
                if kind == "begin":
                    manager.begin(payload)
                elif kind == "post":
                    observation, tau, tick, frame = payload
                    completed = manager.observe_post(post_observation=observation, post_tau=tau)
                    for item in completed:
                        admission = committer.admit(item, known_at_tau=tau)
                        evidence.record_closure_admission(item, admission)
                        admitted += 1
                    if completed:
                        # Complete validated state: parent installs one reference.
                        publication = core._history
                        source_epoch = observation.epoch
                elif kind != "barrier":
                    raise DeferredWorkerError(f"unknown relation event {kind!r}")
                processing = time.perf_counter() - started
                _trace(trace, layer="relation", serial=serial, kind=kind,
                       queue_delay_seconds=started - enqueued, processing_seconds=processing,
                       pending=manager.pending_count, closures=admitted, source_epoch=source_epoch)
                _send(reports, ("relation", serial, started - enqueued, processing,
                      manager.pending_count, admitted, publication, time.perf_counter(), source_epoch))
                # Acknowledgment follows all archive writes and publications on the
                # same queue. Queue.empty/qsize never establish drain completeness.
                if kind == "barrier":
                    _send(reports, ("barrier", serial))
    except BaseException as exc:
        _send(reports, ("failure", "relation", f"{type(exc).__name__}: {exc}"))


class DeferredRelationWorker:
    """Own validation + relation processes; preserve the previous submit interface.

    Poll at most 64 ready transport messages per call. This is a polling work budget,
    not a pending-relation limit: events are retained and no Closure is invented.
    Drain/close reject invocation inside the action harness boundary.
    """

    def __init__(self, *, core, closure_evaluator, scope_id, archive_path, evidence_path, trace_path):
        self.core, self.closure_evaluator, self.scope_id = core, closure_evaluator, str(scope_id)
        self.archive_path, self.evidence_path, self.trace_path = map(Path, (archive_path, evidence_path, trace_path))
        self.validation_evidence_path = self.evidence_path.with_name("validation_" + self.evidence_path.name)
        self.validation_trace_path = self.trace_path.with_name("validation_" + self.trace_path.name)
        self._ctx = mp.get_context("spawn")
        self._events, self._relations = self._ctx.Queue(), self._ctx.Queue()
        self._validation_reports, self._results = self._ctx.Queue(), self._ctx.Queue()
        self._process = self._validation = None
        self._submitted = self._processed = self._validated = self._max_queued = 0
        self._pending = self._closures = self._dropped = 0
        self._fatal_error = None
        self._last_queue_delay = self._max_queue_delay = 0.0
        self._last_processing = self._max_processing = 0.0
        self._last_publication_lag = self._max_publication_lag = 0.0
        self._validation_delay = self._validation_processing = 0.0
        self._validation_max_delay = self._validation_max_processing = 0.0
        self._validation_max_backlog = self._relation_max_backlog = 0
        self._publication_lag_epochs = 0
        self._barriers_seen = set()
        self._serial = 0
        self._in_control = self._closed = self._stopped = self._closing = False

    def start(self):
        if self._process is not None:
            raise DeferredWorkerError("workers already started")
        for path in (self.archive_path, self.evidence_path, self.trace_path):
            path.parent.mkdir(parents=True, exist_ok=True)
        self._process = self._ctx.Process(target=_relation_process, kwargs=dict(
            events=self._relations, reports=self._results, core=self.core,
            closure_evaluator=self.closure_evaluator, scope_id=self.scope_id,
            archive_path=self.archive_path, evidence_path=self.evidence_path,
            trace_path=self.trace_path), name="oasis-relation-experience", daemon=True)
        self._validation = self._ctx.Process(target=_validation_process, args=(
            self._events, self._relations, self._validation_reports,
            self.validation_evidence_path, self.validation_trace_path),
            name="oasis-observation-validation", daemon=True)
        try:
            self._process.start()
            self._validation.start()
        except BaseException:
            self._fatal_error = "worker startup failed"
            self.close(timeout=1.0)
            raise

    def _check_workers(self):
        if self._closed or self._stopped or self._closing:
            return
        for name, process in (("validation", self._validation), ("relation", self._process)):
            if process is not None and process.pid is not None and not process.is_alive():
                self._fatal_error = self._fatal_error or f"{name} process exited ({process.exitcode})"

    def _accept(self, kind, payload):
        self._check_workers()
        if self._closed or self._fatal_error or self._process is None:
            self._dropped += 1
            self._fatal_error = self._fatal_error or "workers are not running"
            return False
        try:
            serial = self._serial + 1
            _send(self._events, (kind, serial, payload, time.perf_counter()))
        except Exception as exc:
            self._fatal_error = f"submission serialization failed: {type(exc).__name__}: {exc}"
            self._dropped += 1
            return False
        self._serial = serial
        if kind not in ("barrier", "stop"):
            self._submitted += 1
            self._max_queued = max(self._max_queued, self._submitted - self._processed)
            self._validation_max_backlog = max(self._validation_max_backlog, self._submitted - self._validated)
        return True

    def submit_begin(self, decision_result):
        return self._accept("begin", decision_result)

    def submit_post(self, *, post_observation, post_tau, tick_index, carla_frame):
        return self._accept("post", (post_observation, float(post_tau), int(tick_index), int(carla_frame)))

    def publish_available(self):
        if self._closed:
            return 0
        count = 0
        for channel in (self._validation_reports, self._results):
            for _ in range(64):
                try:
                    message = pickle.loads(channel.get_nowait())
                except queue.Empty:
                    break
                kind = message[0]
                if kind == "failure":
                    self._fatal_error = f"{message[1]}: {message[2]}"
                elif kind == "validation":
                    _, serial, delay, processing = message
                    if serial not in self._barrier_tickets:
                        self._validated += 1
                    self._validation_delay, self._validation_processing = delay, processing
                    self._validation_max_delay = max(self._validation_max_delay, delay)
                    self._validation_max_processing = max(self._validation_max_processing, processing)
                    self._relation_max_backlog = max(self._relation_max_backlog, self._validated - self._processed)
                elif kind == "relation":
                    _, serial, delay, processing, pending, closures, history, completed, epoch = message
                    if serial not in self._barrier_tickets:
                        self._processed += 1
                    self._pending, self._closures = pending, self._closures + closures
                    self._last_queue_delay, self._last_processing = delay, processing
                    self._max_queue_delay = max(self._max_queue_delay, delay)
                    self._max_processing = max(self._max_processing, processing)
                    if history is not None:
                        self.core._history = history
                        lag = max(0.0, time.perf_counter() - completed)
                        self._last_publication_lag = lag
                        self._max_publication_lag = max(self._max_publication_lag, lag)
                        self.core._publication_received_at = time.perf_counter()
                        self.core._publication_source_epoch = epoch
                        if self.core._frame is not None:
                            self._publication_lag_epochs = max(0, self.core._frame.observation.epoch - epoch)
                        count += closures
                elif kind == "barrier":
                    self._barriers_seen.add(message[1])
                elif kind == "stopped":
                    self._stopped = True
        self._check_workers()
        return count

    @property
    def _barrier_tickets(self):
        if not hasattr(self, "_tickets"):
            self._tickets = set()
        return self._tickets

    def health(self):
        if self._closed:
            return self._final_health
        self.publish_available()
        alive = bool(self._process and self._process.is_alive())
        validation_alive = bool(self._validation and self._validation.is_alive())
        return DeferredWorkerHealth(
            alive, self._fatal_error, self._submitted, self._processed,
            max(0, self._submitted - self._processed), self._max_queued, self._pending,
            self._closures, self._dropped, self._last_queue_delay, self._max_queue_delay,
            self._last_processing, self._max_processing, self._last_publication_lag,
            self._max_publication_lag, bool(self._fatal_error), validation_alive,
            self._validated, max(0, self._submitted - self._validated),
            self._validation_delay, self._validation_processing,
            self._validation_max_delay, self._validation_max_processing,
            max(0, self._validated - self._processed), self._validation_max_backlog,
            self._relation_max_backlog, self._publication_lag_epochs,
            self._validation.pid if self._validation else None,
            self._process.pid if self._process else None)

    def drain(self, timeout=None):
        if self._in_control:
            raise DeferredWorkerError("drain is forbidden inside the control boundary")
        ticket = self._serial + 1
        self._barrier_tickets.add(ticket)
        if not self._accept("barrier", None):
            raise DeferredWorkerError(self._fatal_error or "workers unavailable")
        deadline = None if timeout is None else time.monotonic() + timeout
        while ticket not in self._barriers_seen or self._validated < self._submitted:
            self.publish_available()
            if self._fatal_error:
                raise DeferredWorkerError(self._fatal_error)
            if deadline is not None and time.monotonic() >= deadline:
                self._fatal_error = "non-control drain deadline exceeded; evidence incomplete"
                raise DeferredWorkerError(self._fatal_error)
            time.sleep(0.005)
        return self.health()

    def close(self, *, timeout=5.0):
        if self._in_control:
            raise DeferredWorkerError("close is forbidden inside the control boundary")
        if self._closed:
            return self.health()
        try:
            if self._process is not None and not self._fatal_error:
                self.drain(timeout)
                self._accept("stop", None)
                self._closing = True
                deadline = None if timeout is None else time.monotonic() + timeout
                while not self._stopped:
                    self.publish_available()
                    if self._fatal_error or (deadline is not None and time.monotonic() >= deadline):
                        self._fatal_error = self._fatal_error or "worker shutdown incomplete"
                        break
                    time.sleep(0.005)
                # A stop acknowledgment precedes resource finalizers. Allow those
                # to finish within the requested shutdown budget before termination.
                while not self._fatal_error and any(
                    process.is_alive() for process in (self._validation, self._process)
                ):
                    self.publish_available()
                    if deadline is not None and time.monotonic() >= deadline:
                        self._fatal_error = "worker resource finalization timed out"
                        break
                    time.sleep(0.005)
        finally:
            # Only the explicit non-control shutdown may terminate failed workers.
            # Their queues are discarded; partial evidence is never declared complete.
            for process in (self._validation, self._process):
                if process is not None and process.pid is not None:
                    process.join(0.2)
                    if process.is_alive():
                        self._fatal_error = self._fatal_error or "worker required termination"
                        process.terminate()
                        process.join(2.0)
            self.publish_available()
            self._final_health = self.health()
            self._closed = True
            for channel in (self._events, self._relations, self._validation_reports, self._results):
                channel.cancel_join_thread()
                channel.close()
        return self._health_closed()

    def _health_closed(self):
        # Closed queues cannot be polled again. Preserve final counters/diagnostics.
        return self._final_health
