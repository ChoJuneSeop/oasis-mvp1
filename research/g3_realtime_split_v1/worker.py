from __future__ import annotations

"""Deferred relation/Closure/history processing for the G3 split candidate.

The Decision/actuation caller only submits immutable already-observed records. Closure
checking, Completed Experience construction, archive admission and closure evidence I/O
run on a separate worker thread. The worker never advances CARLA and never chooses or
applies an action.

A Python thread is an execution-path separation, not CPU isolation and not a hard
real-time guarantee. A process-isolated successor can preserve this interface if CPU
contention remains material in empirical latency measurements.
"""

from dataclasses import dataclass
import json
from pathlib import Path
from queue import SimpleQueue
import threading
import time
from typing import Any

from research.g3_organic_flow_v1.history import (
    FrontRelationEpisodeManager,
    OrganicHistoryCommitter,
)
from research.g3_organic_flow_v1.ledger import OrganicEvidenceLedger
from research.oasis_core_v12.process_archive import ProcessArchive


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


@dataclass(frozen=True)
class _BeginEvent:
    result: Any
    enqueued_at: float


@dataclass(frozen=True)
class _PostEvent:
    observation: Any
    tau: float
    tick_index: int
    carla_frame: int
    enqueued_at: float


@dataclass(frozen=True)
class _BarrierEvent:
    signal: threading.Event
    enqueued_at: float


@dataclass(frozen=True)
class _StopEvent:
    pass


class DeferredRelationWorker:
    """Single-writer deferred processor preserving relation-event order.

    Queue order is the observed order:
      realized decision -> post-tick observation -> next realized decision -> ...

    No pending-count limit, timeout-based Closure, or forced history admission is used.
    A failure does not block the action caller; it is retained as an explicit degraded
    state and must invalidate any claim of complete relation/history evidence.
    """

    def __init__(
        self,
        *,
        core,
        closure_evaluator,
        scope_id: str,
        archive_path: str | Path,
        evidence_path: str | Path,
        trace_path: str | Path,
    ) -> None:
        self.core = core
        self.closure_evaluator = closure_evaluator
        self.scope_id = str(scope_id)
        self.archive_path = Path(archive_path)
        self.evidence_path = Path(evidence_path)
        self.trace_path = Path(trace_path)
        self._queue: SimpleQueue = SimpleQueue()
        self._thread: threading.Thread | None = None
        self._state_lock = threading.Lock()
        self._submitted = 0
        self._processed = 0
        self._queued = 0
        self._max_queued = 0
        self._pending = 0
        self._closures = 0
        self._dropped = 0
        self._fatal_error: str | None = None
        self._last_queue_delay = 0.0
        self._max_queue_delay = 0.0
        self._last_processing = 0.0
        self._max_processing = 0.0

    def start(self) -> None:
        if self._thread is not None:
            raise DeferredWorkerError("deferred relation worker already started")
        self.archive_path.parent.mkdir(parents=True, exist_ok=True)
        self.evidence_path.parent.mkdir(parents=True, exist_ok=True)
        self.trace_path.parent.mkdir(parents=True, exist_ok=True)
        self._thread = threading.Thread(
            target=self._run,
            name="oasis-g3-deferred-relation-worker",
            daemon=True,
        )
        self._thread.start()

    def _accept(self, event) -> bool:
        # Only short bookkeeping occurs on the caller path; Closure/history work never
        # executes here.
        with self._state_lock:
            if self._fatal_error is not None:
                self._dropped += 1
                return False
            self._submitted += 1
            self._queued += 1
            self._max_queued = max(self._max_queued, self._queued)
        self._queue.put(event)
        return True

    def submit_begin(self, decision_result) -> bool:
        return self._accept(_BeginEvent(decision_result, time.perf_counter()))

    def submit_post(
        self,
        *,
        post_observation,
        post_tau: float,
        tick_index: int,
        carla_frame: int,
    ) -> bool:
        return self._accept(
            _PostEvent(
                post_observation,
                float(post_tau),
                int(tick_index),
                int(carla_frame),
                time.perf_counter(),
            )
        )

    def _trace(self, handle, kind: str, payload: dict) -> None:
        handle.write(
            json.dumps(
                {"kind": kind, **payload},
                sort_keys=True,
                ensure_ascii=False,
                allow_nan=False,
            )
            + "\n"
        )
        handle.flush()

    def _mark_processed(self, *, queue_delay: float, processing: float, pending: int) -> None:
        with self._state_lock:
            self._processed += 1
            self._queued = max(0, self._queued - 1)
            self._pending = int(pending)
            self._last_queue_delay = float(queue_delay)
            self._max_queue_delay = max(self._max_queue_delay, float(queue_delay))
            self._last_processing = float(processing)
            self._max_processing = max(self._max_processing, float(processing))

    def _fail(self, exc: BaseException) -> None:
        with self._state_lock:
            if self._fatal_error is None:
                self._fatal_error = f"{type(exc).__name__}: {exc}"

    def _run(self) -> None:
        manager = FrontRelationEpisodeManager(
            self.closure_evaluator,
            scope_id=self.scope_id,
        )
        archive = ProcessArchive(str(self.archive_path))
        evidence = OrganicEvidenceLedger(str(self.evidence_path))
        trace = self.trace_path.open("a", encoding="utf-8")
        committer = OrganicHistoryCommitter(core=self.core, archive=archive)
        try:
            while True:
                event = self._queue.get()
                if isinstance(event, _StopEvent):
                    break
                started = time.perf_counter()
                enqueued_at = getattr(event, "enqueued_at", started)
                queue_delay = max(0.0, started - float(enqueued_at))
                try:
                    if isinstance(event, _BeginEvent):
                        accepted = manager.begin(event.result)
                        self._trace(
                            trace,
                            "relation_begin_processed",
                            {
                                "accepted": bool(accepted),
                                "pending_after": manager.pending_count,
                                "queue_delay_seconds": queue_delay,
                            },
                        )
                    elif isinstance(event, _PostEvent):
                        completed = manager.observe_post(
                            post_observation=event.observation,
                            post_tau=event.tau,
                        )
                        admitted = 0
                        for item in completed:
                            admission = committer.admit(item, known_at_tau=event.tau)
                            evidence.record_closure_admission(item, admission)
                            admitted += 1
                        with self._state_lock:
                            self._closures += admitted
                        self._trace(
                            trace,
                            "post_observation_processed",
                            {
                                "tick_index": event.tick_index,
                                "carla_frame": event.carla_frame,
                                "post_tau": event.tau,
                                "closed_processes": len(completed),
                                "admitted_processes": admitted,
                                "pending_after": manager.pending_count,
                                "queue_delay_seconds": queue_delay,
                            },
                        )
                    elif isinstance(event, _BarrierEvent):
                        self._trace(
                            trace,
                            "barrier_reached",
                            {
                                "pending_relations": manager.pending_count,
                                "queue_delay_seconds": queue_delay,
                            },
                        )
                        event.signal.set()
                    else:
                        raise DeferredWorkerError(
                            f"unknown deferred event: {type(event).__name__}"
                        )
                except BaseException as exc:
                    self._trace(
                        trace,
                        "worker_failure",
                        {
                            "error_type": type(exc).__name__,
                            "error": str(exc),
                            "pending_relations": manager.pending_count,
                        },
                    )
                    self._fail(exc)
                    if isinstance(event, _BarrierEvent):
                        event.signal.set()
                    break
                finally:
                    finished = time.perf_counter()
                    self._mark_processed(
                        queue_delay=queue_delay,
                        processing=max(0.0, finished - started),
                        pending=manager.pending_count,
                    )
        finally:
            try:
                evidence.record_horizon(manager.observation_horizon_snapshot())
            except Exception as exc:
                self._fail(exc)
            try:
                evidence.close()
            finally:
                try:
                    archive.close()
                finally:
                    trace.close()

    def health(self) -> DeferredWorkerHealth:
        thread = self._thread
        with self._state_lock:
            return DeferredWorkerHealth(
                alive=bool(thread is not None and thread.is_alive()),
                fatal_error=self._fatal_error,
                submitted_events=self._submitted,
                processed_events=self._processed,
                queued_events=self._queued,
                max_queued_events=self._max_queued,
                pending_relation_processes=self._pending,
                closures_committed=self._closures,
                dropped_after_failure=self._dropped,
                last_queue_delay_seconds=self._last_queue_delay,
                max_queue_delay_seconds=self._max_queue_delay,
                last_processing_seconds=self._last_processing,
                max_processing_seconds=self._max_processing,
            )

    def drain(self, timeout: float | None = None) -> DeferredWorkerHealth:
        """Wait only at an explicit non-control boundary, e.g. observation horizon."""
        signal = threading.Event()
        if not self._accept(_BarrierEvent(signal, time.perf_counter())):
            raise DeferredWorkerError(self.health().fatal_error or "deferred worker failed")
        if not signal.wait(timeout):
            raise DeferredWorkerError("deferred relation worker drain timed out")
        health = self.health()
        if health.fatal_error is not None:
            raise DeferredWorkerError(health.fatal_error)
        return health

    def close(self, *, timeout: float | None = None) -> DeferredWorkerHealth:
        thread = self._thread
        if thread is None:
            return self.health()
        health = self.health()
        if health.fatal_error is None:
            self.drain(timeout=timeout)
        self._queue.put(_StopEvent())
        thread.join(timeout)
        if thread.is_alive():
            raise DeferredWorkerError("deferred relation worker did not stop")
        return self.health()
