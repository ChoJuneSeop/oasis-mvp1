"""기존 완결경험 추출기 연결 / bridge to the existing completed-history extractor."""
from research.oasis_core_v11.history_admission import HistoryAdmissionError
from .contracts import CompletedProcess, HistoricalEnvelope


class HistoryAdmissionBridgeV12:
    """Single-Core writer. The archive commits before in-memory history admission.

    Replay the same admitted batch after a crash. Exact identity replay is idempotent.
    Recorded observed processes without an action can use CompletedProcess directly;
    this bridge specifically consumes the existing realized HistoryEntry interface.
    """
    def __init__(self, core, extractor, archive):
        self.core, self.extractor, self.archive = core, extractor, archive

    def admit(self, entry, *, known_at_tau, occurrences, relation_occurrence_refs):
        if not entry.closure_evidence:
            raise HistoryAdmissionError('closure evidence required')
        process = CompletedProcess(
            experience_id=entry.entry_id, start_tau=entry.decision_tau,
            boundary_tau=entry.relation_end_tau, known_at_tau=known_at_tau,
            occurrences=tuple(occurrences), scope_description=entry.outcome_description,
            closure_method=entry.closure_method,
            closure_evidence_refs=tuple(entry.closure_evidence.get('occurrence_refs', ())),
            unresolved=tuple(entry.closure_evidence.get('unresolved', ())),
        )
        records = tuple(self.extractor.extract(entry))
        if not records:
            raise HistoryAdmissionError('no evidenced closed relation extracted')
        keys = [r.source.relation_element_id for r in records]
        if len(keys) != len(set(keys)) or set(keys) != set(relation_occurrence_refs):
            raise HistoryAdmissionError('relation occurrence provenance must match extracted relations')
        envelopes = tuple(HistoricalEnvelope(r, process, tuple(relation_occurrence_refs[r.source.relation_element_id]))
                          for r in records)
        self.core.validate_history_batch(envelopes)
        self.archive.complete(process)
        self.core.add_history_batch(envelopes)
        return envelopes
