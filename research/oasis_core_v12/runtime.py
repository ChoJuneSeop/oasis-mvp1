"""선택·시도·적용 확인 분리 / selection, attempt and application acknowledgement.

Host-side only. SQLite reservation prevents automatic duplicate dispatch after restart.
The external actuator must atomically enforce expected_revision and idempotency_key.
No local transaction can prove exactly-once effects in an arbitrary external system.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import sqlite3
from typing import Protocol

from research.carla_v22_harness_v11.canonical_harness import Realization
from research.g3_2_sidecar.common import require_tau
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from .contracts import CurrentFrame, ResourcePlan, require_text


class StaleDecision(CoreV11InvariantError):
    pass


class DuplicateDispatch(CoreV11InvariantError):
    pass


@dataclass(frozen=True)
class ApplicationReceipt:
    applied: bool | None
    observed_at_tau: float
    realization_ref: str = ''
    reason: str = ''

    def __post_init__(self):
        require_tau('observed_at_tau', self.observed_at_tau)
        if self.applied is not True and self.applied is not False and self.applied is not None:
            raise CoreV11InvariantError('invalid application acknowledgement')
        if self.applied is True:
            require_text(self.realization_ref, 'actual application reference')
        else:
            require_text(self.reason, 'non-application/uncertainty reason')
            if self.realization_ref:
                raise CoreV11InvariantError('unconfirmed application cannot claim a realization ref')


class LiveActuationPort(Protocol):
    def capture(self) -> CurrentFrame:
        """Atomic approved observation and gateway revision; world continues outside this call."""
        ...

    def apply_if_current(self, realization: Realization, *, expected_revision: str,
                         idempotency_key: str) -> ApplicationReceipt:
        """Atomically check revision and deduplicate key before applying. Host holds raw world."""
        ...


class ExecutionJournal:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS dispatches (
                key TEXT PRIMARY KEY, selection TEXT NOT NULL, receipt TEXT);
            CREATE TABLE IF NOT EXISTS execution_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL);
        ''')

    def close(self):
        self.db.close()

    def event(self, key, kind, payload):
        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, allow_nan=False)
        with self.db:
            self.db.execute('INSERT INTO execution_events(key,kind,payload) VALUES (?,?,?)', (key, kind, encoded))

    def reserve(self, key, selection):
        encoded = json.dumps(selection, sort_keys=True, ensure_ascii=False, allow_nan=False)
        try:
            with self.db:
                self.db.execute('INSERT INTO dispatches VALUES (?,?,NULL)', (key, encoded))
                self.db.execute('INSERT INTO execution_events(key,kind,payload) VALUES (?,?,?)',
                                (key, 'attempt_reserved', encoded))
        except sqlite3.IntegrityError as exc:
            raise DuplicateDispatch('this subject/epoch was dispatched or has uncertain execution; do not retry') from exc

    def receipt(self, key, receipt: ApplicationReceipt):
        encoded = json.dumps(asdict(receipt), sort_keys=True, ensure_ascii=False, allow_nan=False)
        with self.db:
            row = self.db.execute('SELECT receipt FROM dispatches WHERE key=?', (key,)).fetchone()
            if row is None:
                raise CoreV11InvariantError('application receipt requires a dispatch attempt')
            if row[0] is not None and row[0] != encoded:
                raise CoreV11InvariantError('receipt cannot be overwritten')
            self.db.execute('UPDATE dispatches SET receipt=? WHERE key=?', (encoded, key))
            self.db.execute('INSERT INTO execution_events(key,kind,payload) VALUES (?,?,?)',
                            (key, 'application_observed', encoded))

    def inspect(self, key):
        row = self.db.execute('SELECT selection,receipt FROM dispatches WHERE key=?', (key,)).fetchone()
        if not row:
            return None
        return {'selection': json.loads(row[0]),
                'receipt': json.loads(row[1]) if row[1] else None}


class CurrentFlowExecutorV12:
    def __init__(self, core, journal: ExecutionJournal, *, authorize):
        self.core, self.journal, self.authorize = core, journal, authorize

    def execute(self, port: LiveActuationPort, *, run_id: str, subject_id: str,
                resource_plan: ResourcePlan, deadline_tau: float) -> ApplicationReceipt:
        require_text(run_id, 'run_id')
        require_text(subject_id, 'subject_id')
        require_tau('deadline_tau', deadline_tau)
        frame = port.capture()
        key = json.dumps([run_id, subject_id, frame.observation.epoch], separators=(',', ':'))
        if self.journal.inspect(key) is not None:
            raise DuplicateDispatch('epoch already dispatched; inspect application confirmation')
        if frame.tau > deadline_tau:
            self.journal.event(key, 'deferred', {'reason': 'available decision time exhausted'})
            raise CoreV11InvariantError('decision deadline already elapsed')
        self.core.open_current_epoch(frame)
        proposal = self.core.realize(frame.observation)
        self.journal.event(key, 'selected', {
            'decision_tau': frame.tau, 'revision': frame.revision,
            'proposal': asdict(proposal), 'resources': asdict(resource_plan)})
        current = port.capture()
        if current.tau < frame.tau:
            raise CoreV11InvariantError('gateway clock moved backwards')
        if (current.revision != frame.revision or current.observation != frame.observation):
            self.journal.event(key, 'invalidated', {'reason': 'current premises changed', 'tau': current.tau})
            raise StaleDecision('rebuild from current flow; no action has been dispatched')
        if current.tau > deadline_tau:
            self.journal.event(key, 'deferred', {'reason': 'decision deadline elapsed', 'tau': current.tau})
            raise CoreV11InvariantError('no verification time remains for this proposal')
        # Only present observation and proposal cross this authority boundary.
        if self.authorize(current.observation, proposal) is not True:
            self.journal.event(key, 'not_authorized', {'tau': current.tau})
            raise CoreV11InvariantError('current proposal lacks execution authority')
        self.journal.reserve(key, {'decision_tau': frame.tau, 'attempt_tau': current.tau,
                                  'revision': current.revision, 'proposal': asdict(proposal),
                                  'resources': asdict(resource_plan)})
        try:
            receipt = port.apply_if_current(proposal, expected_revision=current.revision,
                                            idempotency_key=key)
            if not isinstance(receipt, ApplicationReceipt) or receipt.observed_at_tau < current.tau:
                raise CoreV11InvariantError('invalid or backdated application receipt')
        except Exception as exc:
            # The call could have applied an action before communication failed.
            # Preserve the reservation, record uncertainty and never blindly replay.
            self.journal.event(key, 'application_unknown', {'error_type': type(exc).__name__})
            raise
        self.journal.receipt(key, receipt)
        # Applied means actuator acknowledged application, never outcome success.
        return receipt
