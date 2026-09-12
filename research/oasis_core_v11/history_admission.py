from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.current_relational_core import (
    CurrentRelationalCoreV11,
    HistoricalRelationRecord,
)


class HistoryAdmissionError(RuntimeError):
    pass


class CompletedHistoryRelationExtractor(Protocol):
    """Domain operator that derives closed relation elements from one realized HistoryEntry."""

    def extract(self, entry: HistoryEntry) -> Sequence[HistoricalRelationRecord]:
        ...


_FORBIDDEN_SEMANTIC_KEY_TOKENS = (
    "completed_at",
    "timestamp",
    "time_since",
    "recency",
    "age",
    "memory_score",
    "memory_weight",
    "importance_score",
    "priority_score",
)


def _walk_keys(value: Any):
    if isinstance(value, Mapping):
        for key, child in value.items():
            yield str(key).lower()
            yield from _walk_keys(child)
    elif isinstance(value, (tuple, list, set)):
        for child in value:
            yield from _walk_keys(child)


def _assert_semantic_context_has_no_recency_lockin(record: HistoricalRelationRecord) -> None:
    keys = tuple(_walk_keys(record.semantic.environment_context))
    bad = [
        key
        for key in keys
        if any(token in key for token in _FORBIDDEN_SEMANTIC_KEY_TOKENS)
    ]
    if bad:
        raise HistoryAdmissionError(
            f"historical semantic context contains recency/fixed-memory key(s): {sorted(set(bad))}"
        )


@dataclass
class HistoryAdmissionBridge:
    """Admits only closed, actually realized HistoryEntry outputs into Core history.

    The bridge preserves absolute completion time in the RelationElementRef provenance,
    but rejects attempts to copy recency/importance semantics into the PastRelationSemanticView.
    """

    core: CurrentRelationalCoreV11
    extractor: CompletedHistoryRelationExtractor

    def admit(self, entry: HistoryEntry) -> tuple[HistoricalRelationRecord, ...]:
        records = tuple(self.extractor.extract(entry))
        if not records:
            raise HistoryAdmissionError(
                "a completed history entry produced no closed relation element; "
                "do not invent an empty historical anchor"
            )

        seen: set[tuple[str, str]] = set()
        for record in records:
            source = record.source
            if source.experience_id != entry.entry_id:
                raise HistoryAdmissionError(
                    "new historical relation must retain the realized HistoryEntry id as experience_id"
                )
            if float(source.completed_at_tau) != float(entry.relation_end_tau):
                raise HistoryAdmissionError(
                    "new relation element completion time must equal evidenced relation-process closure time"
                )
            key = (source.experience_id, source.relation_element_id)
            if key in seen:
                raise HistoryAdmissionError("duplicate relation element emitted from one completion")
            seen.add(key)
            _assert_semantic_context_has_no_recency_lockin(record)

        for record in records:
            self.core.add_history(record)
        return records
