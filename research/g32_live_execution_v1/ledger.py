from __future__ import annotations

from dataclasses import asdict
import json
import sqlite3

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class LiveEvidenceLedger:
    """Append-only experimental observer. It never feeds data back into OASIS Core."""

    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS runtime_identity (
                singleton INTEGER PRIMARY KEY CHECK(singleton=1),
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS live_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                tau REAL NOT NULL,
                payload TEXT NOT NULL
            );
            """
        )

    @staticmethod
    def _encode(payload):
        return json.dumps(payload, sort_keys=True, ensure_ascii=False, allow_nan=False)

    def close(self):
        self.db.close()

    def freeze_runtime_identity(self, identity):
        encoded = self._encode(dict(identity))
        with self.db:
            row = self.db.execute(
                "SELECT payload FROM runtime_identity WHERE singleton=1"
            ).fetchone()
            if row is not None and row[0] != encoded:
                raise CoreV11InvariantError(
                    "live runtime identity cannot change inside one experimental ledger"
                )
            self.db.execute(
                "INSERT OR IGNORE INTO runtime_identity(singleton,payload) VALUES (1,?)",
                (encoded,),
            )

    def record_decision(self, execution, responsibility_record):
        payload = {
            "decision": execution.recorder.decision_record(),
            "observation": asdict(execution.observation),
            "realization": asdict(execution.realization),
            "realization_ref": execution.realization_ref,
            "realization_tau": execution.realization_tau,
            "after_realization_fingerprint": execution.after_realization_fingerprint,
            "choice_responsibility": responsibility_record,
        }
        with self.db:
            self.db.execute(
                "INSERT INTO live_events(kind,tau,payload) VALUES (?,?,?)",
                (
                    "decision_realization",
                    float(execution.tau),
                    self._encode(payload),
                ),
            )

    def record_closure_admission(self, completed_episode, admission):
        entry = completed_episode.record.history_entry
        if entry is None:
            raise CoreV11InvariantError(
                "closure ledger requires a completed HistoryEntry"
            )
        payload = {
            "experience_id": admission.experience_id,
            "closure_method": entry.closure_method,
            "closure_evidence": dict(entry.closure_evidence),
            "outcome_description": entry.outcome_description,
            "selected_possibility_id": entry.selected_possibility_id,
            "realization_ref": entry.realization_ref,
            "unresolved": list(admission.unresolved),
            "admitted_relation_keys": [
                list(x) for x in admission.admitted_relation_keys
            ],
            "occurrence": asdict(admission.occurrence),
            "choice_responsibility": completed_episode.decision_responsibility,
        }
        with self.db:
            self.db.execute(
                "INSERT INTO live_events(kind,tau,payload) VALUES (?,?,?)",
                (
                    "closure_history_admission",
                    float(admission.known_at_tau),
                    self._encode(payload),
                ),
            )

    def events(self):
        rows = self.db.execute(
            "SELECT event_id,kind,tau,payload FROM live_events ORDER BY event_id"
        ).fetchall()
        return tuple(
            {
                "event_id": row[0],
                "kind": row[1],
                "tau": row[2],
                "payload": json.loads(row[3]),
            }
            for row in rows
        )
