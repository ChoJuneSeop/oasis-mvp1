from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, replace

from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.carla_relational_domain import ClosedCARLARelationExtractor
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import ObservedOccurrence
from research.oasis_core_v12.history_admission import HistoryAdmissionBridgeV12


@dataclass(frozen=True)
class LiveAdmissionRecord:
    experience_id: str
    known_at_tau: float
    occurrence: ObservedOccurrence
    unresolved: tuple[str, ...]
    admitted_relation_keys: tuple[tuple[str, str], ...]


def _unresolved_from_responsibility(record: dict) -> tuple[str, ...]:
    context = record.get("context", {})
    verification = context.get("verification", {})
    pending = []
    for item in verification.get("omega", ()):
        request = item.get("request", {})
        pending.append(
            "unverified:"
            + str(request.get("request_id", "unknown"))
            + ":"
            + str(request.get("question", ""))
            + ":"
            + str(item.get("reason", ""))
        )
    pending.extend(str(x) for x in verification.get("additional_unverified_scope", ()))
    return tuple(dict.fromkeys(pending))


class LiveHistoryCommitter:
    """Commit only actually realized, evaluator-closed relation processes.

    Full decision responsibility remains attached as non-semantic provenance.
    Reusable historical relation semantics still come only from evaluator-certified
    closed_relations through ClosedCARLARelationExtractor.
    """

    def __init__(self, *, core, archive):
        self.core = core
        self.archive = archive
        self.extractor = ClosedCARLARelationExtractor()
        self.bridge = HistoryAdmissionBridgeV12(core, self.extractor, archive)

    def admit(self, completed_episode, *, known_at_tau: float | None = None) -> LiveAdmissionRecord:
        record = completed_episode.record
        entry: HistoryEntry | None = record.history_entry
        if not record.closed or entry is None:
            raise CoreV11InvariantError("only an evaluator-closed realized relation process may enter live history")

        known = float(entry.relation_end_tau if known_at_tau is None else known_at_tau)
        if known < float(entry.relation_end_tau):
            raise CoreV11InvariantError("history knowledge time cannot precede relation-process Closure")

        responsibility = deepcopy(completed_episode.decision_responsibility)
        unresolved = _unresolved_from_responsibility(responsibility)

        occurrence = ObservedOccurrence(
            occurrence_id=f"{entry.entry_id}:closure",
            occurred_at_tau=float(entry.relation_end_tau),
            received_at_tau=known,
            description="Independent evaluator observed the realized front-relation process Closure.",
            source_ref="independent-evaluator-v1",
        )

        evidence = deepcopy(dict(entry.closure_evidence))
        closed_relations = evidence.get("closed_relations")
        if not isinstance(closed_relations, (tuple, list)) or not closed_relations:
            raise CoreV11InvariantError("live Closure lacks evaluator-certified closed_relations")

        evidence["occurrence_refs"] = (occurrence.occurrence_id,)
        evidence["unresolved"] = tuple(
            dict.fromkeys(tuple(evidence.get("unresolved", ())) + unresolved)
        )
        evidence["decision_responsibility_provenance"] = responsibility
        augmented = replace(entry, closure_evidence=evidence)

        relation_occurrence_refs = {}
        for item in closed_relations:
            relation_id = str(item.get("relation_element_id", "")).strip()
            if not relation_id:
                raise CoreV11InvariantError("closed relation lacks relation_element_id")
            relation_occurrence_refs[relation_id] = (occurrrence.occurrence_id,

        envelopes = self.bridge.admit(
            augmented,
            known_at_tau=known,
            occurrences=(occurrence,),
            relation_occurrence_refs=relation_occurrence_refs,
        )
        keys = tuple(
            (envelope.record.source.experience_id, envelope.record.source.relation_element_id)
            for envelope in envelopes
        )
        return LiveAdmissionRecord(
            experience_id=entry.entry_id,
            known_at_tau=known,
            occurrence=occurrence,
            unresolved=tuple(evidence["unresolved"]),
            admitted_relation_keys=keys,
        )
