from __future__ import annotations

"""RPFO v1.2: provenance-local participation without history search."""

from dataclasses import dataclass
from math import isfinite
from typing import Mapping, Sequence

from research.oasis_core_v11.current_relational_core import CoreV11InvariantError, CurrentRelation, HistoricalRelationRecord, RelationKey
from research.g3_rpfo_v1.rpfo import LinkActivation, ParticipationDecision, ParticipationResolver, ParticipationState


def _text(value, name):
    value = str(value).strip()
    if not value:
        raise CoreV11InvariantError(f"{name} is required")
    return value


def _tau(value, name):
    value = float(value)
    if not isfinite(value):
        raise CoreV11InvariantError(f"{name} must be finite")
    return value


def _key(value):
    if not isinstance(value, tuple) or len(value) != 2:
        raise CoreV11InvariantError("relation key must be a pair")
    return (_text(value[0], "experience_id"), _text(value[1], "relation_element_id"))


def _keys(values):
    out, seen = [], set()
    for value in values:
        value = _key(value)
        if value not in seen:
            seen.add(value); out.append(value)
    return tuple(out)


def _texts(values, name):
    out, seen = [], set()
    for value in values:
        value = _text(value, name)
        if value not in seen:
            seen.add(value); out.append(value)
    return tuple(out)


@dataclass(frozen=True)
class RegisteredRelationV12:
    record: HistoricalRelationRecord
    known_at_tau: float
    occurrence_refs: tuple[str, ...]

    def __post_init__(self):
        known = _tau(self.known_at_tau, "known_at_tau")
        if known < float(self.record.source.completed_at_tau):
            raise CoreV11InvariantError("history cannot be known before completion")
        refs = _texts(self.occurrence_refs, "occurrence_ref")
        if not refs:
            raise CoreV11InvariantError("history requires occurrence provenance")
        object.__setattr__(self, "known_at_tau", known)
        object.__setattr__(self, "occurrence_refs", refs)

    @property
    def key(self):
        return _key((self.record.source.experience_id, self.record.source.relation_element_id))


@dataclass(frozen=True)
class ContinuityEdgeProvenanceV12:
    source_key: RelationKey
    formation_basis: str
    evidence_refs: tuple[str, ...]
    formed_at_tau: float
    known_at_tau: float

    def __post_init__(self):
        object.__setattr__(self, "source_key", _key(self.source_key))
        object.__setattr__(self, "formation_basis", _text(self.formation_basis, "formation_basis"))
        refs = _texts(self.evidence_refs, "evidence_ref")
        if not refs:
            raise CoreV11InvariantError("continuity edge requires evidence")
        formed, known = _tau(self.formed_at_tau, "formed_at_tau"), _tau(self.known_at_tau, "known_at_tau")
        if known < formed:
            raise CoreV11InvariantError("continuity edge cannot be known before formation")
        object.__setattr__(self, "evidence_refs", refs)
        object.__setattr__(self, "formed_at_tau", formed)
        object.__setattr__(self, "known_at_tau", known)


@dataclass(frozen=True)
class ContinuityEdgeV12:
    edge_id: str
    key: RelationKey
    provenance: ContinuityEdgeProvenanceV12

    def __post_init__(self):
        object.__setattr__(self, "edge_id", _text(self.edge_id, "edge_id"))
        clean = _key(self.key)
        if clean != self.provenance.source_key:
            raise CoreV11InvariantError("continuity edge key/provenance mismatch")
        object.__setattr__(self, "key", clean)


@dataclass(frozen=True)
class HistoricalLinkProvenanceV12:
    formation_basis: str
    source_experience_ids: tuple[str, ...]
    evidence_refs: tuple[str, ...]

    def __post_init__(self):
        object.__setattr__(self, "formation_basis", _text(self.formation_basis, "formation_basis"))
        exps = _texts(self.source_experience_ids, "source_experience_id")
        refs = _texts(self.evidence_refs, "evidence_ref")
        if not exps or not refs:
            raise CoreV11InvariantError("historical link requires experience and occurrence provenance")
        object.__setattr__(self, "source_experience_ids", exps)
        object.__setattr__(self, "evidence_refs", refs)


@dataclass(frozen=True)
class HistoricalRelationLinkV12:
    link_id: str
    members: tuple[RelationKey, ...]
    formed_at_tau: float
    known_at_tau: float
    provenance: HistoricalLinkProvenanceV12

    def __post_init__(self):
        object.__setattr__(self, "link_id", _text(self.link_id, "link_id"))
        members = _keys(self.members)
        if len(members) < 2:
            raise CoreV11InvariantError("historical link requires at least two members")
        formed, known = _tau(self.formed_at_tau, "formed_at_tau"), _tau(self.known_at_tau, "known_at_tau")
        if known < formed:
            raise CoreV11InvariantError("historical link cannot be known before formation")
        if not {x[0] for x in members} <= set(self.provenance.source_experience_ids):
            raise CoreV11InvariantError("link provenance must name every member experience")
        object.__setattr__(self, "members", members)
        object.__setattr__(self, "formed_at_tau", formed)
        object.__setattr__(self, "known_at_tau", known)


class RelationRepositorySnapshotV12:
    def __init__(self, *, tau, records, edges, links, incident):
        self.tau = _tau(tau, "snapshot_tau")
        self._records, self._edges, self._links, self._incident = records, edges, links, incident

    def get(self, key):
        entry = self._records.get(_key(key))
        if entry is None or entry.known_at_tau > self.tau or float(entry.record.source.completed_at_tau) > self.tau:
            return None
        return entry.record

    def occurrence_refs(self, key):
        entry = self._records.get(_key(key))
        return () if entry is None or entry.known_at_tau > self.tau else entry.occurrence_refs

    def resolve_edge(self, edge_id):
        edge = self._edges.get(_text(edge_id, "edge_id"))
        if edge is None:
            return None
        p = edge.provenance
        if p.formed_at_tau > self.tau or p.known_at_tau > self.tau or self.get(edge.key) is None:
            return None
        return edge

    def links_for(self, key):
        clean = _key(key)
        return tuple(self._links[x] for x in self._incident.get(clean, ()) if self._links[x].formed_at_tau <= self.tau and self._links[x].known_at_tau <= self.tau)


class IndexedRelationRepositoryV12:
    """Copy-on-write direct-address store; freeze is O(1) and does not scan history."""
    def __init__(self):
        self._records, self._edges, self._links, self._incident = {}, {}, {}, {}

    def register_relation(self, entry):
        prior = self._records.get(entry.key)
        if prior is not None and prior != entry:
            raise CoreV11InvariantError("relation repository is append-only")
        records, incident = dict(self._records), dict(self._incident)
        records[entry.key] = entry; incident.setdefault(entry.key, ())
        self._records, self._incident = records, incident

    def register_continuity_edge(self, edge):
        entry = self._records.get(edge.key)
        if entry is None:
            raise CoreV11InvariantError("continuity edge references unregistered history")
        if edge.provenance.formed_at_tau < float(entry.record.source.completed_at_tau):
            raise CoreV11InvariantError("continuity edge predates completed relation")
        if not set(edge.provenance.evidence_refs) <= set(entry.occurrence_refs):
            raise CoreV11InvariantError("continuity evidence is not source occurrence provenance")
        prior = self._edges.get(edge.edge_id)
        if prior is not None and prior != edge:
            raise CoreV11InvariantError("continuity edge id conflict")
        edges = dict(self._edges); edges[edge.edge_id] = edge; self._edges = edges

    def register_link(self, link):
        evidence = set()
        for key in link.members:
            entry = self._records.get(key)
            if entry is None:
                raise CoreV11InvariantError("historical link references unregistered history")
            if float(entry.record.source.completed_at_tau) > link.formed_at_tau:
                raise CoreV11InvariantError("historical link predates a member")
            evidence.update(entry.occurrence_refs)
        if not set(link.provenance.evidence_refs) <= evidence:
            raise CoreV11InvariantError("link evidence is not backed by member occurrences")
        prior = self._links.get(link.link_id)
        if prior is not None and prior != link:
            raise CoreV11InvariantError("historical link id conflict")
        links, incident = dict(self._links), dict(self._incident); links[link.link_id] = link
        for key in link.members:
            ids = list(incident.get(key, ()))
            if link.link_id not in ids: ids.append(link.link_id)
            incident[key] = tuple(ids)
        self._links, self._incident = links, incident

    def freeze(self, *, current_tau):
        return RelationRepositorySnapshotV12(tau=current_tau, records=self._records, edges=self._edges, links=self._links, incident=self._incident)


@dataclass(frozen=True)
class CurrentContinuityClaimV12:
    claim_id: str
    current_relation_id: str
    edge_id: str
    current_evidence_refs: tuple[str, ...]
    observed_at_tau: float

    def __post_init__(self):
        object.__setattr__(self, "claim_id", _text(self.claim_id, "claim_id")); object.__setattr__(self, "current_relation_id", _text(self.current_relation_id, "current_relation_id")); object.__setattr__(self, "edge_id", _text(self.edge_id, "edge_id"))
        refs = _texts(self.current_evidence_refs, "current_evidence_ref")
        if not refs: raise CoreV11InvariantError("current continuity claim requires current evidence")
        object.__setattr__(self, "current_evidence_refs", refs); object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau, "observed_at_tau"))


@dataclass(frozen=True)
class FrontierContactV12:
    contact_id: str; key: RelationKey; current_relation_id: str
    continuity_edge_id: str | None = None; via_link_id: str | None = None; caused_by_keys: tuple[RelationKey, ...] = ()
    def __post_init__(self):
        object.__setattr__(self, "contact_id", _text(self.contact_id, "contact_id")); object.__setattr__(self, "key", _key(self.key)); object.__setattr__(self, "current_relation_id", _text(self.current_relation_id, "current_relation_id"))
        if (self.continuity_edge_id is None) == (self.via_link_id is None): raise CoreV11InvariantError("contact needs exactly one provenance route")
        if self.continuity_edge_id is not None:
            object.__setattr__(self, "continuity_edge_id", _text(self.continuity_edge_id, "continuity_edge_id"))
            if self.caused_by_keys: raise CoreV11InvariantError("continuity contact cannot claim historical causes")
        else:
            object.__setattr__(self, "via_link_id", _text(self.via_link_id, "via_link_id")); causes = _keys(self.caused_by_keys)
            if not causes: raise CoreV11InvariantError("link contact requires participating causes")
            object.__setattr__(self, "caused_by_keys", causes)


@dataclass(frozen=True)
class RelationalFrontierV12:
    current_relation_ids: tuple[str, ...]; contacts: tuple[FrontierContactV12, ...] = (); visited_keys: tuple[RelationKey, ...] = (); trace: tuple[str, ...] = ()
    def __post_init__(self):
        ids = _texts(self.current_relation_ids, "current_relation_id")
        if not ids: raise CoreV11InvariantError("frontier requires current relations")
        seen = set()
        for contact in self.contacts:
            if contact.contact_id in seen: raise CoreV11InvariantError("duplicate contact id")
            if contact.current_relation_id not in ids: raise CoreV11InvariantError("contact lacks current relation")
            seen.add(contact.contact_id)
        object.__setattr__(self, "current_relation_ids", ids); object.__setattr__(self, "visited_keys", _keys(self.visited_keys))
    @property
    def entry_keys(self): return _keys(tuple(x.key for x in self.contacts))


@dataclass(frozen=True)
class RPFOSnapshotV12:
    current_tau: float; frontier: RelationalFrontierV12; opened_keys: tuple[RelationKey, ...]; prior_participating_keys: tuple[RelationKey, ...]; participating_keys: tuple[RelationKey, ...]; unresolved_keys: tuple[RelationKey, ...]; unfolded_keys: tuple[RelationKey, ...]; activations: tuple[LinkActivation, ...]; joint_participations: tuple[tuple[RelationKey, ...], ...]; role_descriptors: Mapping[RelationKey, tuple[str, ...]]; participation_state: ParticipationState; next_frontier: RelationalFrontierV12
    access_basis: str = "issued_continuity_edge_or_preserved_participation_link"; unresolved_semantics: str = "not_currently_participating_not_zero"; recursive_history_fold: bool = False; global_history_scan: bool = False


class RelationalParticipationFoldOperatorV12:
    def __init__(self, *, resolver: ParticipationResolver): self.resolver = resolver

    def seed_frontier(self, *, current_tau, current_relations, current_claims, repository, visited_keys=(), trace=()):
        tau = _tau(current_tau, "current_tau"); relation_ids = tuple(str(x.relation_id) for x in current_relations)
        if len(relation_ids) != len(set(relation_ids)): raise CoreV11InvariantError("current relation ids must be unique")
        visited, seen_claims, seen_keys, contacts = set(_keys(tuple(visited_keys))), set(), set(), []
        for claim in current_claims:
            if claim.claim_id in seen_claims: raise CoreV11InvariantError("duplicate continuity claim")
            seen_claims.add(claim.claim_id)
            if claim.current_relation_id not in relation_ids or claim.observed_at_tau != tau: raise CoreV11InvariantError("claim is not bound to current relation/tau")
            edge = repository.resolve_edge(claim.edge_id)
            if edge is None: raise CoreV11InvariantError("claim references unavailable historical edge")
            if edge.key in visited or edge.key in seen_keys: continue
            seen_keys.add(edge.key); contacts.append(FrontierContactV12(f"continuity:{claim.claim_id}:{edge.edge_id}", edge.key, claim.current_relation_id, continuity_edge_id=edge.edge_id))
        return RelationalFrontierV12(relation_ids, tuple(contacts), tuple(visited_keys), tuple(trace) + tuple(f"claim:{x.claim_id}" for x in current_claims))

    def step(self, *, current_tau, current_relations, current_claims, repository, frontier, prior_state=ParticipationState()):
        tau = _tau(current_tau, "current_tau"); relation_ids = tuple(str(x.relation_id) for x in current_relations)
        if tuple(frontier.current_relation_ids) != relation_ids: raise CoreV11InvariantError("frontier relation surface is stale or reordered")
        claims_by_edge = {}
        for claim in current_claims:
            prior = claims_by_edge.get(claim.edge_id)
            if prior is not None and prior != claim: raise CoreV11InvariantError("conflicting claims for one continuity edge")
            claims_by_edge[claim.edge_id] = claim
        visited = set(frontier.visited_keys)
        for contact in frontier.contacts:
            if contact.continuity_edge_id is not None:
                claim = claims_by_edge.get(contact.continuity_edge_id); edge = repository.resolve_edge(contact.continuity_edge_id)
                if claim is None or claim.current_relation_id != contact.current_relation_id or edge is None or edge.key != contact.key: raise CoreV11InvariantError("continuity contact provenance invalid")
            else:
                causes = set(contact.caused_by_keys)
                if not causes <= (set(prior_state.participating_keys) | visited): raise CoreV11InvariantError("link contact lacks participating/visited cause")
                matches = []
                for cause in contact.caused_by_keys: matches.extend(x for x in repository.links_for(cause) if x.link_id == contact.via_link_id)
                if not matches or any(x != matches[0] for x in matches) or not causes <= set(matches[0].members) or contact.key not in matches[0].members: raise CoreV11InvariantError("link contact provenance invalid")
        frontier_records, active_records, links_by_id = {}, {}, {}
        for key in frontier.entry_keys:
            record = repository.get(key)
            if record is None: raise CoreV11InvariantError("frontier points to unavailable history")
            frontier_records[key] = record
            for link in repository.links_for(key): links_by_id[link.link_id] = link
        for key in prior_state.participating_keys:
            record = repository.get(key)
            if record is None: raise CoreV11InvariantError("active participation disappeared")
            active_records[key] = record
            for link in repository.links_for(key): links_by_id[link.link_id] = link
        decision = self.resolver.resolve(current_tau=tau, current_relations=current_relations, frontier_records=frontier_records, active_records=active_records, incident_links=links_by_id, prior_state=prior_state)
        opened, participating = set(frontier_records), set(decision.participating_keys)
        if not participating <= opened | set(prior_state.participating_keys): raise CoreV11InvariantError("resolver attempted non-local participation")
        if set(decision.unresolved_opened_keys) != opened - participating: raise CoreV11InvariantError("opened nonparticipants must remain unresolved")
        roles = {}
        for raw_key, raw_roles in decision.role_descriptors.items():
            clean = _key(raw_key)
            if clean not in participating: raise CoreV11InvariantError("role descriptor requires participation")
            roles[clean] = _texts(tuple(raw_roles), "role_descriptor") if raw_roles else ()
        groups = []
        for raw in decision.joint_participations:
            group = _keys(raw)
            if len(group) < 2 or not set(group) <= participating: raise CoreV11InvariantError("joint participation requires current participants")
            groups.append(group)
        activations = []
        for activation in decision.activations:
            causes = set(activation.caused_by_keys); link = links_by_id.get(activation.link_id)
            if not set(activation.current_relation_ids) <= set(relation_ids) or not causes or not causes <= participating or link is None or not causes <= set(link.members): raise CoreV11InvariantError("link activation provenance invalid")
            activations.append(activation)
        unfolded = tuple(x for x in prior_state.participating_keys if x not in participating)
        state = ParticipationState(tuple(decision.participating_keys), tuple(groups), roles)
        next_visited = set(visited) | opened; next_contacts, seen_next = [], set()
        for activation in activations:
            link = links_by_id[activation.link_id]
            for member in link.members:
                if member in next_visited or member in participating: continue
                for relation_id in activation.current_relation_ids:
                    marker = (link.link_id, member, relation_id)
                    if marker in seen_next: continue
                    seen_next.add(marker); next_contacts.append(FrontierContactV12(f"link:{link.link_id}:{relation_id}:{member[0]}:{member[1]}", member, relation_id, via_link_id=link.link_id, caused_by_keys=activation.caused_by_keys))
        next_frontier = RelationalFrontierV12(relation_ids, tuple(next_contacts), tuple(next_visited), frontier.trace + tuple(f"activated:{x.link_id}" for x in activations))
        return RPFOSnapshotV12(tau, frontier, frontier.entry_keys, prior_state.participating_keys, state.participating_keys, tuple(decision.unresolved_opened_keys), unfolded, tuple(activations), state.joint_participations, state.role_descriptors, state, next_frontier)
