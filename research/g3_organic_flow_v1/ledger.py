from __future__ import annotations

"""Append-only observer ledger. Ledger data never feeds back into OASIS Core."""

from dataclasses import asdict
import json
import sqlite3


class OrganicEvidenceLedger:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            """
        )

    def close(self):
        self.db.close()

    def _append(self, kind, payload):
        encoded = json.dumps(
            payload, sort_keys=True, ensure_ascii=False, allow_nan=False
        )
        with self.db:
            self.db.execute(
                "INSERT INTO events(kind,payload) VALUES (?,?)", (kind, encoded)
            )

    def record_decision(self, result):
        execution = result.execution
        payload = {
            "decision_tau": result.decision_tau,
            "dispatch_key": result.dispatch_key,
            "selected": asdict(result.selected),
            "application_receipt": asdict(result.application_receipt),
            "responsibility": result.responsibility_record,
            "resource_plan": result.resource_plan,
            "realized": result.realized,
            "decision_record": (
                execution.recorder.decision_record() if execution is not None else None
            ),
            "realization_ref": (
                execution.realization_ref if execution is not None else None
            ),
        }
        self._append(
            "decision_realization" if result.realized else "decision_not_realized",
            payload,
        )

    def record_closure_admission(self, completed_episode, admission):
        entry = completed_episode.record.history_entry
        self._append(
            "closure_history_admission",
            {
                "experience_id": admission.experience_id,
                "known_at_tau": admission.known_at_tau,
                "occurrence": asdict(admission.occurrence),
                "unresolved": admission.unresolved,
                "admitted_relation_keys": admission.admitted_relation_keys,
                "history_entry": asdict(entry) if entry is not None else None,
                "decision_responsibility": completed_episode.decision_responsibility,
            },
        )

    def record_horizon(self, snapshot):
        self._append("observation_horizon", dict(snapshot))

    def events(self):
        rows = self.db.execute(
            "SELECT event_id,kind,payload FROM events ORDER BY event_id"
        ).fetchall()
        return tuple(
            {"event_id": row[0], "kind": row[1], "payload": json.loads(row[2])}
            for row in rows
        )
