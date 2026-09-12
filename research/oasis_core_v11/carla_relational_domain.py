from __future__ import annotations

from typing import Any, Mapping, Sequence

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.current_relational_core import (
    CurrentRelation,
    HistoricalRelationRecord,
    PastRelationSemanticView,
)


class CARLARelationalDomainError(RuntimeError):
    pass


def _sign_state(value: float, *, positive: str, negative: str, zero: str) -> str:
    value = float(value)
    if value > 0.0:
        return positive
    if value < 0.0:
        return negative
    return zero


class CurrentObservationRelationBuilder:
    """Build role-based current relations from the approved Protocol-v2.2 observation only.

    Numeric present observations may remain in *current-only* context for traceability.
    No arbitrary distance/speed/time threshold creates a semantic category here.
    """

    def build(self, observation: PresentObservation) -> Sequence[CurrentRelation]:
        relations: list[CurrentRelation] = []

        if observation.front_present:
            relations.append(
                CurrentRelation(
                    relation_id="current:front-longitudinal",
                    subject_role="ego-role",
                    object_role="front-traffic-role",
                    relation_type="longitudinal-relative-motion",
                    relation_state=_sign_state(
                        observation.front_closing_mps,
                        positive="closing",
                        negative="opening",
                        zero="no-relative-motion",
                    ),
                    process_context=("front-interaction",),
                    environment_context={
                        "current_only": True,
                        "front_kind": observation.front_kind,
                        "observed_gap_m": float(observation.front_gap_m),
                        "observed_closing_mps": float(observation.front_closing_mps),
                    },
                )
            )

        relations.append(
            CurrentRelation(
                relation_id="current:lane-heading",
                subject_role="ego-role",
                object_role="lane-flow-role",
                relation_type="lane-relative-heading",
                relation_state=_sign_state(
                    observation.local_heading_error_deg,
                    positive="positive-heading-offset",
                    negative="negative-heading-offset",
                    zero="zero-heading-offset",
                ),
                process_context=("lane-following",),
                environment_context={
                    "current_only": True,
                    "observed_heading_error_deg": float(observation.local_heading_error_deg),
                },
            )
        )

        relations.append(
            CurrentRelation(
                relation_id="current:local-participation",
                subject_role="ego-role",
                object_role="local-traffic-field-role",
                relation_type="local-participation-state",
                relation_state="observed",
                process_context=("local-flow",),
                environment_context={
                    "current_only": True,
                    "observed_participant_count": int(observation.local_density),
                },
            )
        )
        return tuple(relations)


_ALLOWED_CLOSED_RELATION_FIELDS = {
    "relation_element_id",
    "subject_role",
    "object_role",
    "relation_type",
    "relation_state",
    "process_context",
    "historical_roles",
    "possibility_links",
    "symbolic_context",
}

_FORBIDDEN_SYMBOLIC_CONTEXT_TOKENS = (
    "coordinate",
    "position",
    "location",
    "latitude",
    "longitude",
    "actor_id",
    "raw_id",
    "gap_m",
    "speed_mps",
    "heading_error_deg",
    "timestamp",
    "completed_at",
    "recency",
    "age",
    "score",
    "weight",
)


def _walk_context_keys(value: Any):
    if isinstance(value, Mapping):
        for key, child in value.items():
            yield str(key).lower()
            yield from _walk_context_keys(child)
    elif isinstance(value, (tuple, list)):
        for child in value:
            yield from _walk_context_keys(child)


class ClosedCARLARelationExtractor:
    """Convert evaluator-certified relation closure evidence into reusable historical relations.

    Expected `closure_evidence['closed_relations']` entries are symbolic relation/process
    descriptions. Raw CARLA coordinates, actor ids, present numeric geometry, recency and
    memory scores are deliberately rejected from the historical semantic view.
    """

    def extract(self, entry: HistoryEntry) -> Sequence[HistoricalRelationRecord]:
        raw_relations = entry.closure_evidence.get("closed_relations")
        if not isinstance(raw_relations, (tuple, list)) or not raw_relations:
            raise CARLARelationalDomainError(
                "closure evidence must contain at least one evaluator-certified closed_relations entry"
            )

        records: list[HistoricalRelationRecord] = []
        for raw in raw_relations:
            if not isinstance(raw, Mapping):
                raise CARLARelationalDomainError("closed relation entry must be a mapping")
            extra = set(raw) - _ALLOWED_CLOSED_RELATION_FIELDS
            missing = {
                "relation_element_id",
                "subject_role",
                "object_role",
                "relation_type",
                "relation_state",
            } - set(raw)
            if extra or missing:
                raise CARLARelationalDomainError(
                    f"closed relation schema mismatch: missing={sorted(missing)}, extra={sorted(extra)}"
                )

            symbolic_context = dict(raw.get("symbolic_context", {}))
            bad_keys = [
                key
                for key in _walk_context_keys(symbolic_context)
                if any(token in key for token in _FORBIDDEN_SYMBOLIC_CONTEXT_TOKENS)
            ]
            if bad_keys:
                raise CARLARelationalDomainError(
                    f"historical symbolic context contains prohibited fixed/raw field(s): {sorted(set(bad_keys))}"
                )

            possibility_links = tuple(
                str(x) for x in raw.get("possibility_links", (entry.selected_possibility_id,))
            )
            if entry.selected_possibility_id not in possibility_links:
                # Provenance may include other generated possibilities, but the actually realized
                # possibility must remain represented in this completed relational experience.
                possibility_links = possibility_links + (entry.selected_possibility_id,)

            records.append(
                HistoricalRelationRecord(
                    source=RelationElementRef(
                        entry.entry_id,
                        str(raw["relation_element_id"]),
                        entry.relation_end_tau,
                        {
                            "origin_entry_id": entry.entry_id,
                            "closure_method": entry.closure_method,
                            "realized_possibility": entry.selected_possibility_id,
                        },
                    ),
                    semantic=PastRelationSemanticView(
                        subject_role=str(raw["subject_role"]),
                        object_role=str(raw["object_role"]),
                        relation_type=str(raw["relation_type"]),
                        relation_state=str(raw["relation_state"]),
                        process_context=tuple(str(x) for x in raw.get("process_context", ())),
                        environment_context=symbolic_context,
                        historical_roles=tuple(str(x) for x in raw.get("historical_roles", ())),
                        possibility_links=possibility_links,
                    ),
                )
            )
        return tuple(records)
