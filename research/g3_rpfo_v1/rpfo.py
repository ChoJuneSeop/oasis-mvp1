from __future__ import annotations

"""OASIS G3 RPFO v1 / 관계참여 접힘 연산자.

RPFO is intentionally NOT a historical-retrieval operator.

It never receives the whole history on the action path and it has no API for
similarity scores, ranking, top-k, recency decay, or global thresholds. The
current relational process must provide an explicit ``RelationalFrontier``:
historical relation keys that the current flow has actually reached through
preserved provenance/relationship links.

A step performs only three jobs:

1. open the records named by the current frontier;
2. let an injected ParticipationResolver decide which opened relations actually
   participate in the present relational process and which preserved local links
   are activated by that participation;
3. produce the next frontier from those activated links.

The next frontier is NOT consumed in the same step. The caller must advance the
reality/decision flow and explicitly invoke another step. This prevents RPFO
from recursively folding the entire connected past merely to look for a contact.

Historical records are immutable inputs. Relation traversal may move in either
direction across a preserved link, but RPFO never rewrites a past event, its
completion time, or its provenance. Multi-member links support joint
participation without reducing the relation to pairwise similarity.
"""

from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping, Protocol, Sequence

from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    CurrentRelation,
    HistoricalRelationRecord,
    RelationKey,
)


def _clean_key(key: RelationKey) -> RelationKey:
    experience_id, relation_element_id = (str(key[0]).strip(), str(key[1]).strip())
    if not experience_id or not relation_element_id:
        raise CoreV11InvariantError("relation key requires experience_id and relation_element_id")
    return (experience_id, relation_element_id)


def _unique_keys(values: Sequence[RelationKey]) -> tuple[RelationKey, ...]:
    result: list[RelationKey] = []
    seen: set[RelationKey] = set()
    for raw in values:
        key = _clean_key(raw)
        if key not in seen:
            seen.add(key)
            result.append(key)
    return tuple(result)


@dataclass(frozen=True)
class HistoricalRelationLink:
    """Preserved link created by an actually occurred historical relation process.

    ``members`` may contain two or more historical relation elements. RPFO may
    traverse the same preserved link from any member, but that traversal does not
    alter historical time or causality.
    """

    link_id: str
    members: tuple[RelationKey, ...]
    formed_at_tau: float
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        link_id = str(self.link_id).strip()
        if not link_id:
            raise CoreV11InvariantError("historical relation link requires link_id")
        object.__setattr__(self, "link_id", link_id)

        tau = float(self.formed_at_tau)
        if not isfinite(tau):
            raise CoreV11InvariantError("historical relation link formed_at_tau must be finite")
        object.__setattr__(self, "formed_at_tau", tau)

        members = _unique_keys(self.members)
        if len(members) < 2:
            raise CoreV11InvariantError("historical relation link requires at least two unique members")
        object.__setattr__(self, "members", members)


class RelationRepository(Protocol):
    """Local-address repository contract.

    Deliberately exposes no ``all()``, iterator, similarity query, score query,
    or top-k query. RPFO can only dereference a frontier key and inspect links
    already incident to that local key.
    """

    def get(self, key: RelationKey) -> HistoricalRelationRecord | None: ...

    def links_for(self, key: RelationKey) -> Sequence[HistoricalRelationLink]: ...


@dataclass(frozen=True)
class RelationalFrontier:
    """Current-flow boundary that has actually reached preserved history."""

    current_relation_ids: tuple[str, ...]
    entry_keys: tuple[RelationKey, ...]
    visited_keys: tuple[RelationKey, ...] = ()
    trace: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        relation_ids = tuple(
            dict.fromkeys(str(x).strip() for x in self.current_relation_ids if str(x).strip())
        )
        if not relation_ids:
            raise CoreV11InvariantError("relational frontier requires a current-relation anchor")
        object.__setattr__(self, "current_relation_ids", relation_ids)

        object.__setattr__(self, "entry_keys", _unique_keys(self.entry_keys))
        object.__setattr__(self, "visited_keys", _unique_keys(self.visited_keys))


@dataclass(frozen=True)
class ParticipationDecision:
    """Present-tense participation result for only the locally opened records."""

    participating_keys: tuple[RelationKey, ...]
    unresolved_keys: tuple[RelationKey, ...]
    activated_link_ids: tuple[str, ...] = ()
    joint_participations: tuple[tuple[RelationKey, ...], ...] = ()
    role_descriptors: Mapping[RelationKey, tuple[str, ...]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "participating_keys", _unique_keys(self.participating_keys))
        object.__setattr__(self, "unresolved_keys", _unique_keys(self.unresolved_keys))
        object.__setattr__(
            self,
            "activated_link_ids",
            tuple(dict.fromkeys(str(x).strip() for x in self.activated_link_ids if str(x).strip())),
        )
        groups: list[tuple[RelationKey, ...]] = []
        for raw_group in self.joint_participations:
            group = _unique_keys(raw_group)
            if len(group) < 2:
                raise CoreV11InvariantError("joint participation requires at least two relation elements")
            groups.append(group)
        object.__setattr__(self, "joint_participations", tuple(groups))


class ParticipationResolver(Protocol):
    """Domain/current-flow semantics injected into RPFO.

    The resolver sees only records opened by the current frontier and their
    incident preserved links. It cannot request arbitrary history through this
    interface.
    """

    def resolve(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        opened_records: Mapping[RelationKey, HistoricalRelationRecord],
        incident_links: Mapping[str, HistoricalRelationLink],
    ) -> ParticipationDecision: ...


@dataclass(frozen=True)
class RPFOSnapshot:
    current_tau: float
    frontier: RelationalFrontier
    opened_keys: tuple[RelationKey, ...]
    participating_keys: tuple[RelationKey, ...]
    unresolved_keys: tuple[RelationKey, ...]
    activated_link_ids: tuple[str, ...]
    joint_participations: tuple[tuple[RelationKey, ...], ...]
    role_descriptors: Mapping[RelationKey, tuple[str, ...]]
    next_frontier: RelationalFrontier
    access_basis: str = "current_relational_frontier_provenance"
    unresolved_semantics: str = "not_currently_participating_not_zero"
    recursive_history_fold: bool = False
    global_history_scan: bool = False


class RelationalParticipationFoldOperator:
    """RPFO v1: current-flow-driven local historical participation.

    One invocation processes exactly the supplied current frontier. Newly
    reached historical keys are returned as ``next_frontier`` and are never
    dereferenced during the same invocation.
    """

    access_basis = "current_relational_frontier_provenance"
    unresolved_semantics = "not_currently_participating_not_zero"

    def __init__(self, *, repository: RelationRepository, resolver: ParticipationResolver) -> None:
        self.repository = repository
        self.resolver = resolver

    @staticmethod
    def _validate_current_anchor(
        current_relations: Sequence[CurrentRelation],
        frontier: RelationalFrontier,
    ) -> None:
        relation_ids = tuple(str(r.relation_id) for r in current_relations)
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")
        missing = set(frontier.current_relation_ids) - set(relation_ids)
        if missing:
            raise CoreV11InvariantError(
                f"frontier references current relations absent from present flow: {sorted(missing)!r}"
            )

    def step(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        frontier: RelationalFrontier,
    ) -> RPFOSnapshot:
        tau = float(current_tau)
        if not isfinite(tau):
            raise CoreV11InvariantError("current_tau must be finite")
        self._validate_current_anchor(current_relations, frontier)

        opened: dict[RelationKey, HistoricalRelationRecord] = {}
        links_by_id: dict[str, HistoricalRelationLink] = {}

        # Crucial invariant: only explicit current-frontier keys are dereferenced.
        for key in frontier.entry_keys:
            record = self.repository.get(key)
            if record is None:
                raise CoreV11InvariantError(
                    f"frontier provenance points to missing historical relation: {key!r}"
                )
            source_key = (str(record.source.experience_id), str(record.source.relation_element_id))
            if source_key != key:
                raise CoreV11InvariantError("repository returned a historical relation under the wrong key")
            if float(record.source.completed_at_tau) > tau:
                raise CoreV11InvariantError("future historical relation cannot participate in current RPFO")
            opened[key] = record

            for link in self.repository.links_for(key):
                if key not in link.members:
                    raise CoreV11InvariantError(
                        "repository returned a non-incident historical relation link"
                    )
                if float(link.formed_at_tau) > tau:
                    raise CoreV11InvariantError(
                        "future historical relation link cannot participate in current RPFO"
                    )
                prior = links_by_id.get(link.link_id)
                if prior is not None and prior != link:
                    raise CoreV11InvariantError(
                        "same link_id resolved to inconsistent historical relation links"
                    )
                links_by_id[link.link_id] = link

        decision = self.resolver.resolve(
            current_tau=tau,
            current_relations=current_relations,
            opened_records=opened,
            incident_links=links_by_id,
        )

        opened_keys = tuple(opened)
        opened_set = set(opened_keys)
        participating_set = set(decision.participating_keys)
        unresolved_set = set(decision.unresolved_keys)

        if participating_set & unresolved_set:
            raise CoreV11InvariantError(
                "a relation cannot be participating and unresolved in the same RPFO step"
            )
        if participating_set | unresolved_set != opened_set:
            raise CoreV11InvariantError(
                "participation resolver must explicitly partition every opened relation into "
                "participating or unresolved"
            )

        for key in decision.role_descriptors:
            clean = _clean_key(key)
            if clean not in participating_set:
                raise CoreV11InvariantError(
                    "current role descriptor may only describe a participating relation"
                )

        for group in decision.joint_participations:
            if not set(group).issubset(participating_set):
                raise CoreV11InvariantError(
                    "joint participation may only contain participating relations"
                )

        activated: list[HistoricalRelationLink] = []
        for link_id in decision.activated_link_ids:
            link = links_by_id.get(link_id)
            if link is None:
                raise CoreV11InvariantError(
                    "resolver cannot activate a link outside the local frontier surface"
                )
            if not participating_set.intersection(link.members):
                raise CoreV11InvariantError(
                    "historical expansion must be caused by a currently participating relation"
                )
            activated.append(link)

        visited = set(frontier.visited_keys)
        visited.update(opened_set)
        next_keys: list[RelationKey] = []
        next_seen: set[RelationKey] = set()
        for link in activated:
            for member in link.members:
                if member in visited or member in next_seen:
                    continue
                next_seen.add(member)
                next_keys.append(member)

        next_frontier = RelationalFrontier(
            current_relation_ids=frontier.current_relation_ids,
            entry_keys=tuple(next_keys),
            visited_keys=tuple(visited),
            trace=frontier.trace + tuple(f"activated:{x.link_id}" for x in activated),
        )

        return RPFOSnapshot(
            current_tau=tau,
            frontier=frontier,
            opened_keys=opened_keys,
            participating_keys=decision.participating_keys,
            unresolved_keys=decision.unresolved_keys,
            activated_link_ids=decision.activated_link_ids,
            joint_participations=decision.joint_participations,
            role_descriptors=dict(decision.role_descriptors),
            next_frontier=next_frontier,
        )
