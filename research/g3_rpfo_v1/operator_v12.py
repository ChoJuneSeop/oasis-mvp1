from __future__ import annotations

from research.g3_rpfo_v1.rpfo import ParticipationState
from research.g3_rpfo_v1.rpfo_v12 import (
    FrontierContactV12,
    RPFOSnapshotV12,
    RelationalFrontierV12,
    RelationalParticipationFoldOperatorV12,
    _key,
    _keys,
    _tau,
    _texts,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class CanonicalRelationalParticipationFoldOperatorV12(
    RelationalParticipationFoldOperatorV12
):
    """Preserve every provenance-distinct current contact to the same past relation."""

    def seed_frontier(
        self, *, current_tau, current_relations, current_claims, repository,
        visited_keys=(), trace=()
    ):
        tau = _tau(current_tau, "current_tau")
        relation_ids = tuple(str(item.relation_id) for item in current_relations)
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")
        visited = set(_keys(tuple(visited_keys)))
        seen_claim_ids = set()
        seen_contacts = set()
        contacts = []
        for claim in current_claims:
            if claim.claim_id in seen_claim_ids:
                raise CoreV11InvariantError("duplicate continuity claim")
            seen_claim_ids.add(claim.claim_id)
            if claim.current_relation_id not in relation_ids or claim.observed_at_tau != tau:
                raise CoreV11InvariantError("claim is not bound to current relation/tau")
            edge = repository.resolve_edge(claim.edge_id)
            if edge is None:
                raise CoreV11InvariantError("claim references unavailable historical edge")
            marker = (edge.key, claim.current_relation_id, edge.edge_id)
            if edge.key in visited or marker in seen_contacts:
                continue
            seen_contacts.add(marker)
            contacts.append(
                FrontierContactV12(
                    f"continuity:{claim.claim_id}:{edge.edge_id}",
                    edge.key,
                    claim.current_relation_id,
                    continuity_edge_id=edge.edge_id,
                )
            )
        return RelationalFrontierV12(
            relation_ids,
            tuple(contacts),
            tuple(visited_keys),
            tuple(trace) + tuple(f"claim:{item.claim_id}" for item in current_claims),
        )

    def step(
        self, *, current_tau, current_relations, current_claims, repository,
        frontier, prior_state=ParticipationState()
    ):
        tau = _tau(current_tau, "current_tau")
        relation_ids = tuple(str(item.relation_id) for item in current_relations)
        if tuple(frontier.current_relation_ids) != relation_ids:
            raise CoreV11InvariantError("frontier relation surface is stale or reordered")

        claims = {}
        for claim in current_claims:
            marker = (claim.edge_id, claim.current_relation_id)
            prior = claims.get(marker)
            if prior is not None and prior != claim:
                raise CoreV11InvariantError("conflicting claims for one current contact")
            claims[marker] = claim

        visited = set(frontier.visited_keys)
        for contact in frontier.contacts:
            if contact.continuity_edge_id is not None:
                claim = claims.get(
                    (contact.continuity_edge_id, contact.current_relation_id)
                )
                edge = repository.resolve_edge(contact.continuity_edge_id)
                if claim is None or edge is None or edge.key != contact.key:
                    raise CoreV11InvariantError("continuity contact provenance invalid")
            else:
                causes = set(contact.caused_by_keys)
                if not causes <= (set(prior_state.participating_keys) | visited):
                    raise CoreV11InvariantError("link contact lacks participating/visited cause")
                matches = []
                for cause in contact.caused_by_keys:
                    matches.extend(
                        item for item in repository.links_for(cause)
                        if item.link_id == contact.via_link_id
                    )
                if (
                    not matches
                    or any(item != matches[0] for item in matches)
                    or not causes <= set(matches[0].members)
                    or contact.key not in matches[0].members
                ):
                    raise CoreV11InvariantError("link contact provenance invalid")

        frontier_records, active_records, links = {}, {}, {}
        for key in frontier.entry_keys:
            record = repository.get(key)
            if record is None:
                raise CoreV11InvariantError("frontier points to unavailable history")
            frontier_records[key] = record
            for link in repository.links_for(key):
                links[link.link_id] = link
        for key in prior_state.participating_keys:
            record = repository.get(key)
            if record is None:
                raise CoreV11InvariantError("active participation disappeared")
            active_records[key] = record
            for link in repository.links_for(key):
                links[link.link_id] = link

        decision = self.resolver.resolve(
            current_tau=tau,
            current_relations=current_relations,
            frontier_records=frontier_records,
            active_records=active_records,
            incident_links=links,
            prior_state=prior_state,
        )
        opened = set(frontier_records)
        participating = set(decision.participating_keys)
        if not participating <= opened | set(prior_state.participating_keys):
            raise CoreV11InvariantError("resolver attempted non-local participation")
        if set(decision.unresolved_opened_keys) != opened - participating:
            raise CoreV11InvariantError("opened nonparticipants must remain unresolved")

        roles = {}
        for raw_key, raw_roles in decision.role_descriptors.items():
            key = _key(raw_key)
            if key not in participating:
                raise CoreV11InvariantError("role descriptor requires participation")
            roles[key] = _texts(tuple(raw_roles), "role_descriptor") if raw_roles else ()
        groups = []
        for raw_group in decision.joint_participations:
            group = _keys(raw_group)
            if len(group) < 2 or not set(group) <= participating:
                raise CoreV11InvariantError("joint participation requires current participants")
            groups.append(group)

        activations = []
        for activation in decision.activations:
            causes = set(activation.caused_by_keys)
            link = links.get(activation.link_id)
            if (
                not set(activation.current_relation_ids) <= set(relation_ids)
                or not causes
                or not causes <= participating
                or link is None
                or not causes <= set(link.members)
            ):
                raise CoreV11InvariantError("link activation provenance invalid")
            activations.append(activation)

        unfolded = tuple(
            key for key in prior_state.participating_keys if key not in participating
        )
        state = ParticipationState(
            tuple(decision.participating_keys), tuple(groups), roles
        )
        next_visited = set(visited) | opened
        next_contacts, seen_next = [], set()
        for activation in activations:
            link = links[activation.link_id]
            for member in link.members:
                if member in next_visited or member in participating:
                    continue
                for relation_id in activation.current_relation_ids:
                    marker = (link.link_id, member, relation_id)
                    if marker in seen_next:
                        continue
                    seen_next.add(marker)
                    next_contacts.append(
                        FrontierContactV12(
                            f"link:{link.link_id}:{relation_id}:{member[0]}:{member[1]}",
                            member,
                            relation_id,
                            via_link_id=link.link_id,
                            caused_by_keys=activation.caused_by_keys,
                        )
                    )
        next_frontier = RelationalFrontierV12(
            relation_ids,
            tuple(next_contacts),
            tuple(next_visited),
            frontier.trace + tuple(f"activated:{item.link_id}" for item in activations),
        )
        return RPFOSnapshotV12(
            tau,
            frontier,
            frontier.entry_keys,
            prior_state.participating_keys,
            state.participating_keys,
            tuple(decision.unresolved_opened_keys),
            unfolded,
            tuple(activations),
            state.joint_participations,
            state.role_descriptors,
            state,
            next_frontier,
        )
