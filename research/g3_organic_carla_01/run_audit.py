from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class RunAuditLedger:
    """Append-only empirical tick/infrastructure audit ledger."""

    def __init__(self, path: str | Path, *, create_new: bool = True):
        self.path = Path(path)
        if create_new and self.path.exists():
            raise CoreV11InvariantError(f"run audit already exists: {self.path}")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ticks (
                tick_index INTEGER PRIMARY KEY,
                carla_frame INTEGER NOT NULL UNIQUE,
                elapsed_seconds REAL NOT NULL,
                realized INTEGER NOT NULL,
                closures INTEGER NOT NULL,
                pending_relations INTEGER NOT NULL
            );
            """
        )
        self.db.commit()

    def close(self):
        self.db.close()

    def event(self, kind: str, payload: dict):
        text = json.dumps(payload, sort_keys=True, ensure_ascii=False, allow_nan=False)
        with self.db:
            self.db.execute("INSERT INTO events(kind,payload) VALUES (?,?)", (kind, text))

    def tick(
        self,
        *,
        tick_index: int,
        carla_frame: int,
        elapsed_seconds: float,
        realized: bool,
        closures: int,
        pending_relations: int,
    ):
        with self.db:
            self.db.execute(
                "INSERT INTO ticks(tick_index,carla_frame,elapsed_seconds,realized,closures,pending_relations) VALUES (?,?,?,?,?,?)",
                (
                    int(tick_index),
                    int(carla_frame),
                    float(elapsed_seconds),
                    1 if realized else 0,
                    int(closures),
                    int(pending_relations),
                ),
            )

    def tick_count(self) -> int:
        return int(self.db.execute("SELECT COUNT(*) FROM ticks").fetchone()[0])

    def realized_count(self) -> int:
        return int(self.db.execute("SELECT COALESCE(SUM(realized),0) FROM ticks").fetchone()[0])

    def validate_tick_sequence(self, expected_ticks: int) -> dict:
        rows = self.db.execute(
            "SELECT tick_index,carla_frame,elapsed_seconds FROM ticks ORDER BY tick_index"
        ).fetchall()
        if len(rows) != int(expected_ticks):
            raise CoreV11InvariantError(
                f"empirical tick count mismatch: {len(rows)} != {expected_ticks}"
            )
        for expected_index, row in enumerate(rows, start=1):
            if int(row[0]) != expected_index:
                raise CoreV11InvariantError(
                    f"tick index discontinuity at {row[0]}, expected {expected_index}"
                )
            if expected_index > 1:
                previous = rows[expected_index - 2]
                if int(row[1]) != int(previous[1]) + 1:
                    raise CoreV11InvariantError(
                        f"CARLA frame discontinuity: {previous[1]} -> {row[1]}"
                    )
                if float(row[2]) <= float(previous[2]):
                    raise CoreV11InvariantError("CARLA elapsed time did not increase")
        return {
            "ticks": len(rows),
            "first_frame": int(rows[0][1]) if rows else None,
            "last_frame": int(rows[-1][1]) if rows else None,
            "realized": self.realized_count(),
        }
