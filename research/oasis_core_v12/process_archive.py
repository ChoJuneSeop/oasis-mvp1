"""완결경험과 지연관측의 추가 기록 / append-only completed processes and delayed observations."""
from copy import deepcopy
from dataclasses import asdict
import json
import sqlite3

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from .contracts import CompletedProcess, ObservedOccurrence, require_text


class ProcessArchive:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS occurrences(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS processes(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS additions(
                id TEXT PRIMARY KEY, process_id TEXT NOT NULL, payload TEXT NOT NULL);
        ''')

    def close(self):
        self.db.close()

    def _insert(self, table, identity, payload):
        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, allow_nan=False)
        row = self.db.execute(f'SELECT payload FROM {table} WHERE id=?', (identity,)).fetchone()
        if row:
            if row[0] != encoded:
                raise CoreV11InvariantError('source identity collision; append a correction instead')
            return
        self.db.execute(f'INSERT INTO {table}(id,payload) VALUES (?,?)', (identity, encoded))

    def complete(self, process: CompletedProcess):
        with self.db:
            for occurrence in process.occurrences:
                self._insert('occurrences', occurrence.occurrence_id, asdict(occurrence))
            self._insert('processes', process.experience_id, asdict(process))

    def append_observation(self, process_id: str, occurrence: ObservedOccurrence, *, reason: str):
        require_text(reason, 'relation/correction rationale')
        row = self.db.execute('SELECT payload FROM processes WHERE id=?', (process_id,)).fetchone()
        if row is None:
            raise CoreV11InvariantError('unknown past process')
        original = json.loads(row[0])
        if occurrence.received_at_tau < original['known_at_tau']:
            raise CoreV11InvariantError('late addition cannot backdate knowledge')
        # This is observed association, not a declaration of causal effect.
        payload = {'observation': asdict(occurrence), 'reason': reason}
        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, allow_nan=False)
        identity = json.dumps([process_id, occurrence.occurrence_id])
        with self.db:
            self._insert('occurrences', occurrence.occurrence_id, asdict(occurrence))
            prior = self.db.execute('SELECT payload FROM additions WHERE id=?', (identity,)).fetchone()
            if prior and prior[0] != encoded:
                raise CoreV11InvariantError('addition cannot overwrite earlier interpretation')
            self.db.execute('INSERT OR IGNORE INTO additions VALUES (?,?,?)', (identity, process_id, encoded))

    def view(self, process_id: str, *, as_of_tau: float):
        from research.g3_2_sidecar.common import require_tau
        require_tau('as_of_tau', as_of_tau)
        row = self.db.execute('SELECT payload FROM processes WHERE id=?', (process_id,)).fetchone()
        if not row:
            raise CoreV11InvariantError('unknown process')
        original = json.loads(row[0])
        if original['known_at_tau'] > as_of_tau:
            raise CoreV11InvariantError('process was not yet available at requested time')
        additions = [json.loads(x[0]) for x in self.db.execute(
            'SELECT payload FROM additions WHERE process_id=? ORDER BY rowid', (process_id,))]
        return deepcopy({'original': original, 'additions': [x for x in additions
                         if x['observation']['received_at_tau'] <= as_of_tau]})
