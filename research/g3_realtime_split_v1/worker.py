from __future__ import annotations

"""Three independent process layers with immutable fan-out transport.

Reality/Action publishes one immutable event to Relation/Experience and
Observation/Validation independently. Neither deferred layer may gate the other.
No live flow, forced Closure, fixed pending threshold, or semantic timeout is used.
"""

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
    validation_error: str | None = None
    relation_error: str | None = None
    validation_degraded: bool = False
    relation_degraded: bool = False


def _encode(message) -> bytes:
    return pickle.dumps(message, protocol=pickle.HIGHEST_PROTOCOL)


def _put_encoded(channel, encoded: bytes) -> None:
    channel.put(encoded)


def _send(channel, message) -> None:
    _put_encoded(channel, _encode(message))


def _trace(handle, **payload):
    handle.write(json.dumps(payload, sort_keys=True, allow_nan=False) + "\n")
    handle.flush()


def _validation_process(events, reports, evidence_path, trace_path):
    """Observation/Validation only; it never forwards or authorizes relation work."""
    try:
        with ExitStack() as stack:
            evidence = OrganicEvidenceLedger(str(evidence_path))
            stack.callback(evidence.close)
            trace = stack.enter_context(Path(trace_path).open("a", encoding="utf-8"))
            while True:
                kind, serial, payload, enqueued = pickle.loads(events.get())
                started = time.perf_counter()
                if kind == "stop":
                    _send(reports, ("validation_stopped", serial))
                    break
                if kind == "begin":
                    validated = validate_result(payload)
                    evidence.record_decision(validated)
                elif kind not in ("post", "barrier"):
                    raise DeferredWorkerError(f"unknown validation event {kind!r}")
                processing = time.perf_counter() - started
                _send(reports, ("validation", serial, started - enqueued, processing))
                _trace(
                    trace,
                    layer="validation",
                    serial=serial,
                    kind=kind,
                    queue_delay_seconds=started - enqueued,
                    processing_seconds=processing,
                )
                if kind == "barrier":
                    _send(reports, ("validation_barrier", serial))
    except BaseException as exc:
        _send(reports, ("failure", "validation", f"{type(exc).__name__}: {exc}"))


def _relation_process(events, reports, *, core, closure_evaluator, scope_id,
                      archive_path, evidence_path, trace_path):
    """Relation/Experience only; it never waits for validation output."""
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
                    _send(reports, ("relation_stopped", serial))
                    break
                admitted = 0
                publication = None
                source_epoch = None
                if kind == "begin":
                    manager.begin(payload)
                elif kind == "post":
                    observation, tau, tick, frame = payload
                    completed = manager.observe_post(
                        post_observation=observation,
                        post_tau=tau,
                    )
                    for item in completed:
                        admission = committer.admit(item, known_at_tau=tau)
                        evidence.record_closure_admission(item, admission)
                        admitted += 1
                    if completed:
                        publication = core._history
                        source_epoch = observation.epoch
                elif kind != "barrier":
                    raise DeferredWorkerError(f"unknown relation event {kind!r}")
                processing = time.perf_counter() - started
                _trace(
                    trace,
                    layer="relation",
                    serial=serial,
                    kind=kind,
                    queue_delay_seconds=started - enqueued,
                    processing_seconds=processing,
                    pending=manager.pending_count,
                    closures=admitted,
                    source_epoch=source_epoch,
                )
                _send(
                    reports,
                    (
                        "relation",
                        serial,
                        started - enqueued,
                        processing,
                        manager.pending_count,
                        admitted,
                        publication,
                        time.perf_counter(),
                        source_epoch,
                    ),
                )
                if kind == "barrier":
                    _send(reports, ("relation_barrier", serial))
    except BaseException as exc:
        _send(reports, ("failure", "relation", f"{type(exc).__name__}: {exc}"))


class DeferredRelationWorker:
    """Own independent validation and relation processes behind one fan-out boundary."""

    def __init__(self, *, core, closure_evaluator, scope_id, archive_path, evidence_path, trace_path):
        self.core, self.closure_evaluator, self.scope_id = core, closure_evaluator, str(scope_id)
        self.archive_path, self.evidence_path, self.trace_path = map(
            Path, (archive_path, evidence_path, trace_path)
        )
        self.validation_evidence_path = self.evidence_path.with_name(
            "validation_" + self.evidence_path.name
        )
        self.validation_trace_path = self.trace_path.with_name(
            "validation_" + self.trace_path.name
        )
        self._ctx = mp.get_context("spawn")
        self._events = self._ctx.Queue()
        self._relations = self._ctx.Queue()
        self._validation_reports = self._ctx.Queue()
        self._results = self._ctx.Queue()
        self._process = self._validation = None
        self._submitted = self._processed = self._validated = self._max_queued = 0
        self._pending = self._closures = self._dropped = 0
        self._fatal_error = None
        self._validation_error = None
        self._relation_error = None
        self._last_queue_delay = self._max_queue_delay = 0.0
        self._last_processing = self._max_processing = 0.0
        self._last_publication_lag = self._max_publication_lag = 0.0
        self._validation_delay = self._validation_processing = 0.0
        self._validation_max_delay = self._validation_max_processing = 0.0
        self._validation_max_backlog = self._relation_max_backlog = 0
        self._publication_lag_epochs = 0
        self._validation_barriers_seen = set()
        self._relation_barriers_seen = set()
        self._serial = 0
        self._in_control = self._closed = self._closing = False
        self._validation_stopped = self._relation_stopped = False

    def start(self):
        if self._process is not None:
            raise DeferredWorkerError("workers already started")
        for path in (self.archive_path, self.evidence_path, self.trace_path):
            path.parent.mkdir(parents=True, exist_ok=True)
        self._process = self._ctx.Process(
            target=_relation_process,
            kwargs=dict(
                events=self._relations,
                reports=self._results,
                core=self.core,
                closure_evaluator=self.closure_evaluator,
                scope_id=self.scope_id,
                archive_path=self.archive_path,
                evidence_path=self.evidence_path,
                trace_path=self.trace_path,
            ),
            name="oasis-relation-experience",
            daemon=True,
        )
        self._validation = self._ctx.Process(
            target=_validation_process,
            args=(
                self._events,
                self._validation_reports,
                self.validation_evidence_path,
                self.validation_trace_path,
            ),
            name="oasis-observation-validation",
            daemon=True,
        )
        try:
            self._process.start()
            self._validation.start()
        except BaseException:
            self._fatal_error = "worker startup failed"
            self.close(timeout=1.0)
            raise

    def _check_workers(self):
        if self._closed or self._closing:
            return
        if (
            self._validation is not None
            and self._validation.pid is not None
            and not self._validation.is_alive()
            and not self._validation_stopped
        ):
            self._validation_error = self._validation_error or (
                f"validation process exited ({self._validation.exitcode})"
            )
        if (
            self._process is not None
            and self._process.pid is not None
            and not self._process.is_alive()
            and not self._relation_stopped
        ):
            self._relation_error = self._relation_error or (
                f"relation process exited ({self._process.exitcode})"
            )

    def _combined_error(self) -> str | None:
        parts = []
        if self._fatal_error:
            parts.append(self._fatal_error)
        if self._validation_error:
            parts.append(f"validation: {self._validation_error}")
        if self._relation_error:
            parts.append(f"relation: {self._relation_error}")
        return "; ".join(parts) if parts else None

    def _layer_available(self, layer: str) -> bool:
        if layer == "validation":
            process = self._validation
            return bool(
                process
                and process.pid is not None
                and process.is_alive()
                and not self._validation_error
                and not self._validation_stopped
            )
        process = self._process
        return bool(
            process
            and process.pid is not None
            and process.is_alive()
            and not self._relation_error
            and not self._relation_stopped
        )

    def _enqueue(self, kind, payload, *, count_event: bool):
        if self._closed or self._fatal_error:
            self._dropped += 1
            return None, False, False
        try:
            serial = self._serial + 1
            enqueued = time.perf_counter()
            encoded = _encode((kind, serial, payload, enqueued))
        except Exception as exc:
            self._fatal_error = (
                f"submission serialization failed: {type(exc).__name__}: {exc}"
            )
            self._dropped += 1
            return None, False, False

        self._check_workers()
        relation_ok = self._layer_available("relation")
        validation_ok = self._layer_available("validation")

        if relation_ok:
            try:
                _put_encoded(self._relations, encoded)
            except Exception as exc:
                relation_ok = False
                self._relation_error = (
                    f"relation submission failed: {type(exc).__name__}: {exc}"
                )
        if validation_ok:
            try:
                _put_encoded(self._events, encoded)
            except Exception as exc:
                validation_ok = False
                self._validation_error = (
                    f"validation submission failed: {type(exc).__name__}: {exc}"
                )

        self._serial = serial
        if count_event:
            self._submitted += 1
            relation_backlog = max(0, self._submitted - self._processed)
            validation_backlog = max(0, self._submitted - self._validated)
            self._max_queued = max(self._max_queued, relation_backlog)
            self._relation_max_backlog = max(
                self._relation_max_backlog, relation_backlog
            )
            self._validation_max_backlog = max(
                self._validation_max_backlog, validation_backlog
            )
        if not relation_ok or not validation_ok:
            self._dropped += 1
        return serial, relation_ok, validation_ok

    def _accept(self, kind, payload):
        _, relation_ok, validation_ok = self._enqueue(
            kind,
            payload,
            count_event=kind not in ("barrier", "stop"),
        )
        return relation_ok and validation_ok

    def submit_begin(self, decision_result):
        return self._accept("begin", decision_result)

    def submit_post(self, *, post_observation, post_tau, tick_index, carla_frame):
        return self._accept(
            "post",
            (
                post_observation,
                float(post_tau),
                int(tick_index),
                int(carla_frame),
            ),
        )

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
                    if message[1] == "validation":
                        self._validation_error = message[2]
                    elif message[1] == "relation":
                        self._relation_error = message[2]
                    else:
                        self._fatal_error = f"{message[1]}: {message[2]}"
                elif kind == "validation":
                    _, serial, delay, processing = message
                    if serial not in self._barrier_tickets:
                        self._validated += 1
                    self._validation_delay = delay
                    self._validation_processing = processing
                    self._validation_max_delay = max(
                        self._validation_max_delay, delay
                    )
                    self._validation_max_processing = max(
                        self._validation_max_processing, processing
                    )
                elif kind == "relation":
                    (
                        _, serial, delay, processing, pending, closures,
                        history, completed, epoch,
                    ) = message
                    if serial not in self._barrier_tickets:
                        self._processed += 1
                    self._pending = pending
                    self._closures += closures
                    self._last_queue_delay = delay
                    self._last_processing = processing
                    self._max_queue_delay = max(self._max_queue_delay, delay)
                    self._max_processing = max(self._max_processing, processing)
                    if history is not None:
                        self.core._history = history
                        lag = max(0.0, time.perf_counter() - completed)
                        self._last_publication_lag = lag
                        self._max_publication_lag = max(
                            self._max_publication_lag, lag
                        )
                        self.core._publication_received_at = time.perf_counter()
                        self.core._publication_source_epoch = epoch
                        if self.core._frame is not None:
                            self._publication_lag_epochs = max(
                                0,
                                self.core._frame.observation.epoch - epoch,
                            )
                        count += closures
                elif kind == "validation_barrier":
                    self._validation_barriers_seen.add(message[1])
                elif kind == "relation_barrier":
                    self._relation_barriers_seen.add(message[1])
                elif kind == "validation_stopped":
                    self._validation_stopped = True
                elif kind == "relation_stopped":
                    self._relation_stopped = True
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
        relation_alive = bool(self._process and self._process.is_alive())
        validation_alive = bool(self._validation and self._validation.is_alive())
        error = self._combined_error()
        return DeferredWorkerHealth(
            relation_alive and validation_alive,
            error,
            self._submitted,
            self._processed,
            max(0, self._submitted - self._processed),
            self._max_queued,
            self._pending,
            self._closures,
            self._dropped,
            self._last_queue_delay,
            self._max_queue_delay,
            self._last_processing,
            self._max_processing,
            self._last_publication_lag,
            self._max_publication_lag,
            bool(error),
            validation_alive,
            self._validated,
            max(0, self._submitted - self._validated),
            self._validation_delay,
            self._validation_processing,
            self._validation_max_delay,
            self._validation_max_processing,
            max(0, self._submitted - self._processed),
            self._validation_max_backlog,
            self._relation_max_backlog,
            self._publication_lag_epochs,
            self._validation.pid if self._validation else None,
            self._process.pid if self._process else None,
            self._validation_error,
            self._relation_error,
            bool(self._validation_error),
            bool(self._relation_error),
        )

    def drain(self, timeout=None):
        if self._in_control:
            raise DeferredWorkerError("drain is forbidden inside the control boundary")
        if self._fatal_error:
            raise DeferredWorkerError(self._combined_error() or "workers unavailable")

        ticket = self._serial + 1
        self._barrier_tickets.add(ticket)
        serial, relation_ok, validation_ok = self._enqueue(
            "barrier", None, count_event=False
        )
        if serial is None or (not relation_ok and not validation_ok):
            raise DeferredWorkerError(self._combined_error() or "workers unavailable")

        deadline = None if timeout is None else time.monotonic() + timeout
        while True:
            self.publish_available()
            if self._relation_error:
                relation_ok = False
            if self._validation_error:
                validation_ok = False
            relation_done = (not relation_ok) or ticket in self._relation_barriers_seen
            validation_done = (not validation_ok) or ticket in self._validation_barriers_seen
            if relation_done and validation_done:
                break
            if deadline is not None and time.monotonic() >= deadline:
                self._fatal_error = (
                    "non-control drain deadline exceeded; evidence incomplete"
                )
                raise DeferredWorkerError(self._combined_error())
            time.sleep(0.005)

        health = self.health()
        if health.degraded:
            raise DeferredWorkerError(health.fatal_error or "deferred layer degraded")
        return health

    def close(self, *, timeout=5.0):
        if self._in_control:
            raise DeferredWorkerError("close is forbidden inside the control boundary")
        if self._closed:
            return self._health_closed()

        deadline = None if timeout is None else time.monotonic() + timeout
        try:
            if not self._combined_error():
                try:
                    self.drain(timeout)
                except DeferredWorkerError:
                    pass

            if not self._fatal_error:
                serial, relation_ok, validation_ok = self._enqueue(
                    "stop", None, count_event=False
                )
                self._closing = True
                if serial is not None:
                    while True:
                        self.publish_available()
                        relation_done = (
                            (not relation_ok)
                            or self._relation_stopped
                            or bool(self._relation_error)
                        )
                        validation_done = (
                            (not validation_ok)
                            or self._validation_stopped
                            or bool(self._validation_error)
                        )
                        if relation_done and validation_done:
                            break
                        if deadline is not None and time.monotonic() >= deadline:
                            self._fatal_error = self._fatal_error or (
                                "worker shutdown incomplete"
                            )
                            break
                        time.sleep(0.005)

                while not self._fatal_error and any(
                    process is not None
                    and process.pid is not None
                    and process.is_alive()
                    for process in (self._validation, self._process)
                ):
                    self.publish_available()
                    if deadline is not None and time.monotonic() >= deadline:
                        self._fatal_error = (
                            "worker resource finalization timed out"
                        )
                        break
                    time.sleep(0.005)
        finally:
            self._closing = True
            for process in (self._validation, self._process):
                if process is not None and process.pid is not None:
                    process.join(0.2)
                    if process.is_alive():
                        self._fatal_error = self._fatal_error or (
                            "worker required termination"
                        )
                        process.terminate()
                        process.join(2.0)
            self.publish_available()
            self._final_health = self.health()
            self._closed = True
            for channel in (
                self._events,
                self._relations,
                self._validation_reports,
                self._results,
            ):
                channel.cancel_join_thread()
                channel.close()
        return self._health_closed()

    def _health_closed(self):
        return self._final_health
