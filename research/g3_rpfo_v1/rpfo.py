from __future__ import annotations

"""OASIS G3 RPFO v1.1 / 관계참여 접힘 연산자.

RPFO is not a historical retrieval operator.

The action path is intentionally split into:
1. current-only lineage anchors emitted by the present relational process;
2. O(1)-style local dereference through a prebuilt lineage/incident-link index;
3. present-tense participation over only those locally reached records plus already
   participating records;
4. one-step relational expansion that is returned as a future frontier and is never
   recursively consumed in the same call.

The operator therefore has no global-history iterator, similarity/ranking/top-k API,
recency decay, score threshold, or semantic exact-match selector.

Historical facts remain immutable. Relational traversal may move across a preserved
link in either direction, while event time/provenance are never rewritten.
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


def _text(value: Any, name: str) -> str:
    value = str(value).strip()
    if not value:
        raise CoreV11InvariantError(f"{name} is required")
    return value


def _clean_key(key: RelationKey) -> RelationKey:
    if not isinstance(key, tuple) or len(key) != 2:
        raise CoreV11InvariantError("relation key must be (experience_id, relation_element_id)")
    return (_text(key[0], "experience_id"), _text(key[1], "relation_element_id"))


def _unique_keys(values: Sequence[RelationKey]) -> tuple[RelationKey, ...]:
    out: list[RelationKey] = []
    seen: set[RelationKey] = set()
    for raw in values:
        key = _clean_key(raw)
        if key not in seen:
            seen.add(key)
            out.append(key)
    return tuple(out)


def _unique_text(values: Sequence[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(_text(x, "text value") for x in values))


@dataclass(frozen=True)
class CurrentLineageAnchor:
    """Opaque current-flow lineage handle, not a semantic similarity query.

    ``anchor_id`` must be produced without access to historical storage.  The Core
    separately validates ``evidence_refs`` against the current frame before it is
    allowed to seed a frontier.
    """

    anchor_id: str
    current_relation_id: str
    evidence_refs: tuple[str, ...]
    observed_at_tau: float
    provenance_note: str

    def __post_init__(self) -> None:
        object.__setattr__(self, "anchor_id", _text(self.anchor_id, "anchor_id"))
        object.__setattr__(
            self, "current_relation_id", _text(self.current_relation_id, "current_relation_id")
        )
        if not self.evidence_refs:
            raise CoreV11InvariantError("current lineage anchor requires current evidence")
        object.__setattr__(self, "evidence_refs", _unique_text(self.evidence_refs))
        tau = float(self.observed_at_tau)
        if not isfinite(tau):
            raise CoreV11InvariantError("lineage anchor observed_at_tau must be finite")
        object.__setattr__(self, "observed_at_tau", tau)
        object.__setattr__(
            self, "provenance_note", _text(self.provenance_note, "lineage provenance_note")
        )


class CurrentLineageProvider(Protocol):
    """Current-only lineage source. Historical repository is deliberately absent."""

    def anchors(
        self,
        *,
        frame: Any,
        current_relations: Sequence[CurrentRelation],
    ) -> Sequence[CurrentLineageAnchor]: ...


class RelationContextLineageProvider:
    """Read explicit lineage anchors carried by current relation context.

    Expected ``environment_context['rpfo_lineage_anchors']`` value:
        ({"anchor_id": "...", "evidence_refs": ("current-evidence-id", ...),
          "provenance_note": "..."}, ...)

    This provider never receives historical storage, so it cannot search memory.
    """

    field_name = "rpfo_lineage_anchors"

    def anchors(self, *, frame: Any, current_relations: Sequence[CurrentRelation]):
        result: list[CurrentLineageAnchor] = []
        for relation in current_relations:
            raw_entries = relation.environment_context.get(self.field_name, ())
            if raw_entries in (None, ()):
                continue
            if not isinstance(raw_entries, (tuple, list)):
                raise CoreV11InvariantError("rpfo_lineage_anchors must be a sequence")
            for raw in raw_entries:
                if not isinstance(raw, Mapping):
                    raise CoreV11InvariantError("lineage anchor entry must be a mapping")
                extra = set(raw) - {"anchor_id", "evidence_refs", "provenance_note"}
                missing = {"anchor_id", "evidence_refs", "provenance_note"} - set(raw)
                if extra or missing:
                    raise CoreV11InvariantError(
                        f"lineage anchor schema mismatch: missing={sorted(missing)}, extra={sorted(extra)}"
                    )
                result.append(
                    CurrentLineageAnchor(
                        anchor_id=raw["anchor_id"],
                        current_relation_id=relation.relation_id,
                        evidence_refs=tuple(raw["evidence_refs"]),
                        observed_at_tau=float(frame.tau),
                        provenance_note=raw["provenance_note"],
                    )
                )
        return tuple(result)


@dataclass(frozen=True)
class HistoricalLinkProvenance:
    """Proof that a historical link came from an actually recorded process."""

    formation_basis: str
    source_experience_ids: tuple[str, ...]
    evidence_refs: tuple[str, ...]

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "formation_basis", _text(self.formation_basis, "historical link formation_basis")
        )
        if not self.source_experience_ids:
            raise CoreV11InvariantError("historical link requires source experience provenance")
        if not self.evidence_refs:
            raise CoreV11InvariantError("historical link requires evidence provenance")
        object.__setattr__(
            self, "source_experience_ids", _unique_text(self.source_experience_ids)
        )
        object.__setattr__(self, "evidence_refs", _unique_text(self.evidence_refs))


@dataclass(frozen=True)
class HistoricalRelationLink:
    """Preserved multi-member relation created by an actual historical process."""

    link_id: str
    members: tuple[RelationKey, ...]
    formed_at_tau: float
    provenance: HistoricalLinkProvenance

    def __post_init__(self) -> None:
        object.__setattr__(self, "link_id", _text(self.link_id, "link_id"))
        tau = float(self.formed_at_tau)
        if not isfinite(tau):
            raise CoreV11InvariantError("historical relation link formed_at_tau must be finite")
        object.__setattr__(self, "formed_at_tau", tau)
        members = _unique_keys(self.members)
        if len(members) < 2:
            raise CoreV11InvariantError("historical relation link requires at least two members")
        object.__setattr__(self, "members", members)
        member_experiences = {key[0] for key in members}
        if not member_experiences <= set(self.provenance.source_experience_ids):
            raise CoreV11InvariantError(
                "historical link provenance must name every member experience"
            )


class RelationRepository(Protocol):
    """Action-path local-address repository.

    No ``all()``, iteration, similarity query, score query or top-k query is exposed.
    """

    def get(self, key: RelationKey) -> HistoricalRelationRecord | None: ...
    def links_for(self, key: RelationKey) -> Sequence[HistoricalRelationLink]: ...
    def keys_for_lineage(self, anchor_id: str) -> Sequence[RelationKey]: ...


class IndexedRelationRepository:
    """Incremental direct-address store used by the RPFO action path.

    Global work is allowed only when history is admitted/registered, never to discover
    a current contact.  Action-time reads use direct dict indexes.
    """

    def __init__(self) -> None:
        self._records: dict[RelationKey, HistoricalRelationRecord] = {}
        self._lineage_index: dict[str, tuple[RelationKey, ...]] = {}
        self._links: dict[str, HistoricalRelationLink] = {}
        self._incident_index: dict[RelationKey, tuple[str, ...]] = {}

    def register_records(
        self,
        entries: Sequence[tuple[HistoricalRelationRecord, Sequence[str]]],
    ) -> None:
        records = dict(self._records)
        lineage = dict(self._lineage_index)
        incident = dict(self._incident_index)
        for record, raw_refs in entries:
            key = _clean_key(
                (str(record.source.experience_id), str(record.source.relation_element_id))
            )
            prior = records.get(key)
            if prior is not None and prior != record:
                raise CoreV11InvariantError("relation repository history is append-only")
            refs = _unique_text(tuple(raw_refs)) if raw_refs else ()
            records[key] = record
            incident.setdefault(key, ())
            for anchor_id in refs:
                keys = list(lineage.get(anchor_id, ()))
                if key not in keys:
                    keys.append(key)
                lineage[anchor_id] = tuple(keys)
        self._records = records
        self._lineage_index = lineage
        self._incident_index = incident

    def register_link(self, link: HistoricalRelationLink) -> None:
        if link.link_id in self._links and self._links[link.link_id] != link:
            raise CoreV11InvariantError("historical relation link id conflict")
        for key in link.members:
            record = self._records.get(key)
            if record is None:
                raise CoreV11InvariantError("historical link references an unregistered relation")
            if float(record.source.completed_at_tau) > float(link.formed_at_tau):
                raise CoreV11InvariantError(
                    "historical link cannot form before a member relation completed"
                )
        links = dict(self._links)
        incident = dict(self._incident_index)
        links[link.link_id] = link
        for key in link.members:
            ids = list(incident.get(key, ()))
            if link.link_id not in ids:
                ids.append(link.link_id)
            incident[key] = tuple(ids)
        self._links = links
        self._incident_index = incident

    def get(self, key: RelationKey) -> HistoricalRelationRecord | None:
        return self._records.get(_clean_key(key))

    def links_for(self, key: RelationKey) -> tuple[HistoricalRelationLink, ...]:
        key = _clean_key(key)
        return tuple(self._links[link_id] for link_id in self._incident_index.get(key, ()))

    def keys_for_lineage(self, anchor_id: str) -> tuple[RelationKey, ...]:
        return self._lineage_index.get(_text(anchor_id, "anchor_id"), ())

    def contains(self, key: RelationKey) -> bool:
        return _clean_key(key) in self._records


@dataclass(frozen=True)
class FrontierContact:
    """One auditable current-to-history or history-to-history contact."""

    contact_id: str
    key: RelationKey
    current_relation_id: str
    anchor_id: str | None = None
    via_link_id: str | None = None
    current_evidence_refs: tuple[str, ...] = ()
    caused_by_keys: tuple[RelationKey, ...] = ()
    provenance_note: str = ""

    def __post_init__(self) -> None:
        object.__setattr__(self, "contact_id", _text(self.contact_id, "contact_id"))
        object.__setattr__(self, "key", _clean_key(self.key))
        object.__setattr__(
            self, "current_relation_id", _text(self.current_relation_id, "current_relation_id")
        )
        if (self.anchor_id is None) == (self.via_link_id is None):
            raise CoreV11InvariantError(
                "frontier contact must have exactly one provenance route: anchor or historical link"
            )
        if self.anchor_id is not None:
            object.__setattr__(self, "anchor_id", _text(self.anchor_id, "anchor_id"))
            if not self.current_evidence_refs:
                raise CoreV11InvariantError("anchor contact requires current evidence refs")
            object.__setattr__(
                self, "current_evidence_refs", _unique_text(self.current_evidence_refs)
            )
            if self.caused_by_keys:
                raise CoreV11InvariantError("anchor contact cannot claim historical caused_by keys")
        else:
            object.__setattr__(
                self, "via_link_id", _text(self.via_link_id, "historical link id")
            )
            causes = _unique_keys(self.caused_by_keys)
            if not causes:
                raise CoreV11InvariantError("link contact requires participating historical cause")
            object.__setattr__(self, "caused_by_keys", causes)
        object.__setattr__(
            self, "provenance_note", _text(self.provenance_note, "frontier provenance_note")
        )


@dataclass(frozen=True)
class RelationalFrontier:
    current_relation_ids: tuple[str, ...]
    contacts: tuple[FrontierContact, ...] = ()
    visited_keys: tuple[RelationKey, ...] = ()
    trace: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        relation_ids = _unique_text(self.current_relation_ids)
        if not relation_ids:
            raise CoreV11InvariantError("relational frontier requires current relation anchors")
        object.__setattr__(self, "current_relation_ids", relation_ids)
        seen_contacts: set[str] = set()
        contacts: list[FrontierContact] = []
        for contact in self.contacts:
            if contact.contact_id in seen_contacts:
                raise CoreV11InvariantError("duplicate frontier contact id")
            if contact.current_relation_id not in relation_ids:
                raise CoreV11InvariantError("frontier contact lacks a current relation anchor")
            seen_contacts.add(contact.contact_id)
            contacts.append(contact)
        object.__setattr__(self, "contacts", tuple(contacts))
        object.__setattr__(self, "visited_keys", _unique_keys(self.visited_keys))

    @property
    def entry_keys(self) -> tuple[RelationKey, ...]:
        return _unique_keys(tuple(contact.key for contact in self.contacts))


@dataclass(frozen=True)
class LinkActivation:
    """Present participation caused one preserved historical link to become reachable."""

    link_id: str
    current_relation_ids: tuple[str, ...]
    caused_by_keys: tuple[RelationKey, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "link_id", _text(self.link_id, "link activation id"))
        relation_ids = _unique_text(self.current_relation_ids)
        causes = _unique_keys(self.caused_by_keys)
        if not relation_ids or not causes:
            raise CoreV11InvariantError("link activation needs current relation and participating cause")
        object.__setattr__(self, "current_relation_ids", relation_ids)
        object.__setattr__(self, "caused_by_keys", causes)


@dataclass(frozen=True)
class ParticipationState:
    """Present participation carried across the moving reality flow."""

    participating_keys: tuple[RelationKey, ...] = ()
    joint_participations: tuple[tuple[RelationKey, ...], ...] = ()
    role_descriptors: Mapping[RelationKey, tuple[str, ...]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        keys = _unique_keys(self.participating_keys)
        object.__setattr__(self, "participating_keys", keys)
        key_set = set(keys)
        groups: list[tuple[RelationKey, ...]] = []
        for raw_group in self.joint_participations:
            group = _unique_keys(raw_group)
            if len(group) < 2 or not set(group) <= key_set:
                raise CoreV11InvariantError(
                    "joint participation must contain at least two currently participating relations"
                )
            groups.append(group)
        object.__setattr__(self, "joint_participations", tuple(groups))
        clean_roles: dict[RelationKey, tuple[str, ...]] = {}
        for raw_key, raw_roles in self.role_descriptors.items():
            key = _clean_key(raw_key)
            if key not in key_set:
                raise CoreV11InvariantError("role descriptor requires current participation")
            clean_roles[key] = _unique_text(tuple(raw_roles)) if raw_roles else ()
        object.__setattr__(self, "role_descriptors", clean_roles)


@dataclass(frozen=True)
class ParticipationDecision:
    """Resolver output over only frontier-opened + previously participating records."""

    participating_keys: tuple[RelationKey, ...]
    unresolved_opened_keys: tuple[RelationKey, ...]
    activations: tuple[LinkActivation, ...] = ()
    joint_participations: tuple[tuple[RelationKey, ...], ...] = ()
    role_descriptors: Mapping[RelationKey, tuple[str, ...]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "participating_keys", _unique_keys(self.participating_keys)
        )
        object.__setattr__(
            self, "unresolved_opened_keys", _unique_keys(self.unresolved_opened_keys)
        )


class ParticipationResolver(Protocol):
    """Current semantics over a strictly local historical surface."""

    def resolve(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        frontier_records: Mapping[RelationKey, HistoricalRelationRecord],
        active_records: Mapping[RelationKey, HistoricalRelationRecord],
        incident_links: Mapping[str, HistoricalRelationLink],
        prior_state: ParticipationState,
    ) -> ParticipationDecision: ...


@dataclass(frozen=True)
class RPFOSnapshot:
    current_tau: float
    frontier: RelationalFrontier
    opened_keys: tuple[RelationKey, ...]
    prior_participating_keys: tuple[RelationKey, ...]
    participating_keys: tuple[RelationKey, ...]
    unresolved_keys: tuple[RelationKey, ...]
    unfolded_keys: tuple[RelationKey, ...]
    activations: tuple[LinkActivation, ...]
    joint_participations: tuple[tuple[RelationKey, ...], ...]
    role_descriptors: Mapping[RelationKey, tuple[str, ...]]
    participation_state: ParticipationState
    next_frontier: RelationalFrontier
    access_basis: str = "current_lineage_provenance_plus_preserved_links"
    unresolved_semantics: str = "not_currently_participating_not_zero"
    recursive_history_fold: bool = False
    global_history_scan: bool = False


class RelationalParticipationFoldOperator:
    """RPFO v1.1: provenance-gated, local, stateful relational participation."""

    access_basis = "current_lineage_provenance_plus_preserved_links"
    unresolved_semantics = "not_currently_participating_not_zero"

    def __init__(self, *, repository: RelationRepository, resolver: ParticipationResolver) -> None:
        self.repository = repository
        self.resolver = resolver

    @staticmethod
    def _validate_current(
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        current_anchors: Sequence[CurrentLineageAnchor],
    ) -> tuple[set[str], dict[tuple[str, str], CurrentLineageAnchor]]:
        tau = float(current_tau)
        if not isfinite(tau):
            raise CoreV11InvariantError("current_tau must be finite")
        relation_ids = [str(r.relation_id) for r in current_relations]
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")
        relation_id_set = set(relation_ids)
        anchors: dict[tuple[str, str], CurrentLineageAnchor] = {}
        for anchor in current_anchors:
            if anchor.current_relation_id not in relation_id_set:
                raise CoreV11InvariantError("lineage anchor references absent current relation")
            if anchor.observed_at_tau != tau:
                raise CoreV11InvariantError("lineage anchor must be bound to current tau")
            key = (anchor.current_relation_id, anchor.anchor_id)
            prior = anchors.get(key)
            if prior is not None and prior != anchor:
                raise CoreV11InvariantError("conflicting current lineage anchor")
            anchors[key] = anchor
        return relation_id_set, anchors

    def seed_frontier(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        current_anchors: Sequence[CurrentLineageAnchor],
        visited_keys: Sequence[RelationKey] = (),
        trace: Sequence[str] = (),
    ) -> RelationalFrontier:
        relation_ids, _ = self._validate_current(
            current_tau=current_tau,
            current_relations=current_relations,
            current_anchors=current_anchors,
        )
        visited = set(_unique_keys(tuple(visited_keys)))
        contacts: list[FrontierContact] = []
        seen_keys: set[RelationKey] = set()
        for anchor in current_anchors:
            for key in self.repository.keys_for_lineage(anchor.anchor_id):
                key = _clean_key(key)
                if key in visited or key in seen_keys:
                    continue
                seen_keys.add(key)
                contacts.append(
                    FrontierContact(
                        contact_id=f"anchor:{anchor.current_relation_id}:{anchor.anchor_id}:{key[0]}:{key[1]}",
                        key=key,
                        current_relation_id=anchor.current_relation_id,
                        anchor_id=anchor.anchor_id,
                        current_evidence_refs=anchor.evidence_refs,
                        provenance_note=anchor.provenance_note,
                    )
                )
        return RelationalFrontier(
            current_relation_ids=tuple(relation_ids),
            contacts=tuple(contacts),
            visited_keys=tuple(visited_keys),
            trace=tuple(trace) + tuple(f"seed:{x.anchor_id}" for x in current_anchors),
        )

    def _validate_contact(
        self,
        *,
        contact: FrontierContact,
        anchor_map: Mapping[tuple[str, str], CurrentLineageAnchor],
        prior_state: ParticipationState,
        visited_keys: set[RelationKey],
    ) -> None:
        if contact.anchor_id is not None:
            anchor = anchor_map.get((contact.current_relation_id, contact.anchor_id))
            if anchor is None:
                raise CoreV11InvariantError("frontier anchor contact has no current provenance")
            if set(contact.current_evidence_refs) != set(anchor.evidence_refs):
                raise CoreV11InvariantError("frontier anchor evidence differs from current lineage anchor")
            if contact.key not in set(self.repository.keys_for_lineage(contact.anchor_id)):
                raise CoreV11InvariantError("frontier key is not indexed under claimed lineage anchor")
            return

        assert contact.via_link_id is not None
        prior_participating = set(prior_state.participating_keys)
        causes = set(contact.caused_by_keys)
        if not causes or not causes <= (prior_participating | visited_keys):
            raise CoreV11InvariantError(
                "historical-link contact lacks a previously participating/visited cause"
            )
        matching: list[HistoricalRelationLink] = []
        for cause in contact.caused_by_keys:
            matching.extend(
                link
                for link in self.repository.links_for(cause)
                if link.link_id == contact.via_link_id
            )
        if not matching or any(contact.key not in link.members for link in matching):
            raise CoreV11InvariantError("frontier historical-link provenance is invalid")

    def step(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        current_anchors: Sequence[CurrentLineageAnchor],
        frontier: RelationalFrontier,
        prior_state: ParticipationState = ParticipationState(),
    ) -> RPFOSnapshot:
        tau = float(current_tau)
        relation_ids, anchor_map = self._validate_current(
            current_tau=tau,
            current_relations=current_relations,
            current_anchors=current_anchors,
        )
        if set(frontier.current_relation_ids) != relation_ids:
            raise CoreV11InvariantError("frontier current relation surface is stale or incomplete")

        visited = set(frontier.visited_keys)
        frontier_records: dict[RelationKey, HistoricalRelationRecord] = {}
        active_records: dict[RelationKey, HistoricalRelationRecord] = {}
        links_by_id: dict[str, HistoricalRelationLink] = {}

        for contact in frontier.contacts:
            self._validate_contact(
                contact=contact,
                anchor_map=anchor_map,
                prior_state=prior_state,
                visited_keys=visited,
            )

        # Only frontier keys and already-participating keys are direct-address reads.
        for key in frontier.entry_keys:
            record = self.repository.get(key)
            if record is None:
                raise CoreV11InvariantError("frontier points to missing historical relation")
            if float(record.source.completed_at_tau) > tau:
                raise CoreV11InvariantError("future historical relation cannot participate")
            frontier_records[key] = record
            for link in self.repository.links_for(key):
                if float(link.formed_at_tau) > tau:
                    raise CoreV11InvariantError("future historical relation link cannot participate")
                links_by_id[link.link_id] = link

        for key in prior_state.participating_keys:
            record = self.repository.get(key)
            if record is None:
                raise CoreV11InvariantError("active participation lost its preserved history")
            if float(record.source.completed_at_tau) > tau:
                raise CoreV11InvariantError("future active relation cannot persist")
            active_records[key] = record
            for link in self.repository.links_for(key):
                if float(link.formed_at_tau) <= tau:
                    links_by_id[link.link_id] = link

        decision = self.resolver.resolve(
            current_tau=tau,
            current_relations=current_relations,
            frontier_records=frontier_records,
            active_records=active_records,
            incident_links=links_by_id,
            prior_state=prior_state,
        )

        opened_set = set(frontier_records)
        prior_set = set(prior_state.participating_keys)
        local_universe = opened_set | prior_set
        participating_set = set(decision.participating_keys)
        unresolved_set = set(decision.unresolved_opened_keys)

        if not participating_set <= local_universe:
            raise CoreV11InvariantError("resolver attempted to participate non-local history")
        expected_unresolved = opened_set - participating_set
        if unresolved_set != expected_unresolved:
            raise CoreV11InvariantError(
                "resolver must preserve every non-participating opened relation as unresolved"
            )

        clean_roles: dict[RelationKey, tuple[str, ...]] = {}
        for raw_key, raw_roles in decision.role_descriptors.items():
            key = _clean_key(raw_key)
            if key not in participating_set:
                raise CoreV11InvariantError(
                    "current role descriptor may only describe participating history"
                )
            clean_roles[key] = _unique_text(tuple(raw_roles)) if raw_roles else ()

        groups: list[tuple[RelationKey, ...]] = []
        for raw_group in decision.joint_participations:
            group = _unique_keys(raw_group)
            if len(group) < 2 or not set(group) <= participating_set:
                raise CoreV11InvariantError(
                    "joint participation must be made only of current participants"
                )
            groups.append(group)

        activations: list[LinkActivation] = []
        for activation in decision.activations:
            if not set(activation.current_relation_ids) <= relation_ids:
                raise CoreV11InvariantError("link activation references absent current relation")
            if not set(activation.caused_by_keys) <= participating_set:
                raise CoreV11InvariantError("link activation lacks current participating cause")
            link = links_by_id.get(activation.link_id)
            if link is None:
                raise CoreV11InvariantError("resolver activated a non-local historical link")
            if not set(activation.caused_by_keys) & set(link.members):
                raise CoreV11InvariantError("activation cause is not incident to historical link")
            activations.append(activation)

        unfolded = tuple(key for key in prior_state.participating_keys if key not in participating_set)
        state = ParticipationState(
            participating_keys=decision.participating_keys,
            joint_participations=tuple(groups),
            role_descriptors=clean_roles,
        )

        next_visited = set(visited)
        next_visited.update(opened_set)
        contacts: list[FrontierContact] = []
        seen_next: set[RelationKey] = set()
        for activation in activations:
            link = links_by_id[activation.link_id]
            for member in link.members:
                if member in next_visited or member in participating_set or member in seen_next:
                    continue
                seen_next.add(member)
                for relation_id in activation.current_relation_ids:
                    contacts.append(
                        FrontierContact(
                            contact_id=(
                                f"link:{activation.link_id}:{relation_id}:"
                                f"{member[0]}:{member[1]}"
                            ),
                            key=member,
                            current_relation_id=relation_id,
                            via_link_id=activation.link_id,
                            caused_by_keys=activation.caused_by_keys,
                            provenance_note=(
                                "Reached through preserved historical relation link "
                                f"{activation.link_id} from current participation."
                            ),
                        )
                    )

        next_frontier = RelationalFrontier(
            current_relation_ids=frontier.current_relation_ids,
            contacts=tuple(contacts),
            visited_keys=tuple(next_visited),
            trace=frontier.trace
            + tuple(f"activated:{activation.link_id}" for activation in activations),
        )

        return RPFOSnapshot(
            current_tau=tau,
            frontier=frontier,
            opened_keys=frontier.entry_keys,
            prior_participating_keys=prior_state.participating_keys,
            participating_keys=state.participating_keys,
            unresolved_keys=decision.unresolved_opened_keys,
            unfolded_keys=unfolded,
            activations=tuple(activations),
            joint_participations=state.joint_participations,
            role_descriptors=state.role_descriptors,
            participation_state=state,
            next_frontier=next_frontier,
        )
