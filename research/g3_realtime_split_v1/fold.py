from __future__ import annotations

"""OASIS relational Fold Operator / 인연필드 접힘 연산자.

The operator is deliberately narrower than a similarity search.  It does not rank,
score, decay, threshold, or top-k historical experiences.  It indexes the exact
symbolic contact predicate that the current CARLA relation operator already requires:
subject role + object role + relation type continuity.

Therefore a relation omitted by Fold is not declared irrelevant or zero.  It remains
unresolved for independent Observation/Validation.  The deferred validation layer can
re-run the original relation operator over omitted records and detect any semantic
false negative without blocking Reality/Action or Relation/Experience.
"""

from dataclasses import dataclass
from typing import Mapping, Sequence

from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    CurrentRelation,
    HistoricalRelationRecord,
    RelationKey,
)

ContactSignature = tuple[str, str, str]


def _signature(subject_role: str, object_role: str, relation_type: str) -> ContactSignature:
    values = tuple(str(x).strip() for x in (subject_role, object_role, relation_type))
    if any(not value for value in values):
        raise CoreV11InvariantError("fold contact signature requires role/type semantics")
    return values  # type: ignore[return-value]


def current_signature(relation: CurrentRelation) -> ContactSignature:
    return _signature(relation.subject_role, relation.object_role, relation.relation_type)


def historical_signature(record: HistoricalRelationRecord) -> ContactSignature:
    semantic = record.semantic
    return _signature(semantic.subject_role, semantic.object_role, semantic.relation_type)


@dataclass(frozen=True)
class FoldContact:
    source_key: RelationKey
    signature: ContactSignature
    current_relation_ids: tuple[str, ...]


@dataclass(frozen=True)
class FoldSnapshot:
    """Decision-epoch Fold result / 의사결정 시점 접힘 결과.

    ``active_keys`` are allowed into current deep relation/reconstruction work.
    ``omitted_keys`` are only outside this current contact surface; they are not
    classified as irrelevant, low-value, old, or impossible.
    """

    current_tau: float
    active_keys: tuple[RelationKey, ...]
    omitted_keys: tuple[RelationKey, ...]
    contacts: tuple[FoldContact, ...]
    current_signatures: tuple[ContactSignature, ...]
    history_size: int
    selection_basis: str = "symbolic_relational_contact"
    omitted_semantics: str = "unresolved_not_zero"

    @property
    def active_count(self) -> int:
        return len(self.active_keys)

    @property
    def omitted_count(self) -> int:
        return len(self.omitted_keys)


class RelationalFoldOperator:
    """Form the current active relation surface without numeric memory ranking.

    The exact role/type signature is a *necessary* condition of the frozen
    ``SemanticContinuityRelationOperator``.  Fold therefore acts as a semantics-safe
    pre-index for that operator rather than a new relevance heuristic.
    """

    selection_basis = "symbolic_relational_contact"
    omitted_semantics = "unresolved_not_zero"

    def fold(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        history_records: Sequence[HistoricalRelationRecord],
    ) -> FoldSnapshot:
        tau = float(current_tau)
        signatures: dict[ContactSignature, list[str]] = {}
        for relation in current_relations:
            signatures.setdefault(current_signature(relation), []).append(relation.relation_id)

        active: list[RelationKey] = []
        omitted: list[RelationKey] = []
        contacts: list[FoldContact] = []
        seen: set[RelationKey] = set()
        for record in history_records:
            source = record.source
            if float(source.completed_at_tau) > tau:
                raise CoreV11InvariantError("future historical relation cannot enter current Fold")
            key = (str(source.experience_id), str(source.relation_element_id))
            if key in seen:
                raise CoreV11InvariantError("duplicate historical relation in Fold input")
            seen.add(key)
            signature = historical_signature(record)
            anchors = tuple(dict.fromkeys(signatures.get(signature, ())))
            if anchors:
                active.append(key)
                contacts.append(FoldContact(key, signature, anchors))
            else:
                omitted.append(key)

        return FoldSnapshot(
            current_tau=tau,
            active_keys=tuple(active),
            omitted_keys=tuple(omitted),
            contacts=tuple(contacts),
            current_signatures=tuple(signatures),
            history_size=len(seen),
        )

    def validate_omissions(
        self,
        *,
        snapshot: FoldSnapshot,
        current_relations: Sequence[CurrentRelation],
        candidate_ids: Sequence[str],
        history_by_key: Mapping[RelationKey, HistoricalRelationRecord],
        relation_operator,
    ) -> tuple[RelationKey, ...]:
        """Independent false-negative check; never called on the action path."""
        misses: list[RelationKey] = []
        for key in snapshot.omitted_keys:
            record = history_by_key.get(key)
            if record is None:
                raise CoreV11InvariantError("Fold omission provenance disappeared before validation")
            contributions = relation_operator.relate(
                current_relations=current_relations,
                past=record.semantic,
                candidate_ids=candidate_ids,
            )
            if contributions:
                misses.append(key)
        return tuple(misses)
