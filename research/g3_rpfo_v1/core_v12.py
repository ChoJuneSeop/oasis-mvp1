from __future__ import annotations

from copy import deepcopy

from research.g3_rpfo_v1.core import RPFOOrganicCore
from research.g3_rpfo_v1.rpfo import ParticipationState
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
    FrontierV12,
    HistoricalRelationLinkV12,
    IndexedRelationRepositoryV12,
    RegisteredRelationV12,
    RelationalParticipationFoldOperatorV12,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.current_relational_core import CurrentRelationalCoreV12


class ContinuityInboxV12:
    def __init__(self):
        self._claims = {}

    def publish(self, *, epoch, claims):
        claims = tuple(deepcopy(tuple(claims)))
        ids = [x.claim_id for x in claims]
        if len(ids) != len(set(ids)):
            raise CoreV11InvariantError("duplicate current continuity claim")
        staged = dict(self._claims)
        prior = staged.get(epoch)
        if prior is not None and prior != claims:
            raise CoreV11InvariantError("continuity claims are immutable within an epoch")
        staged[epoch] = claims
        self._claims = staged

    def claims(self, *, epoch):
        return deepcopy(tuple(self._claims.get(epoch, ())))


class StrictRPFOOrganicCoreV12(RPFOOrganicCore):
    """Canonical v1.2: no history-derived contact discovery."""

    def __init__(self, *, participation_resolver, continuity_inbox=None,
                 continuity_edges=(), historical_links=(), **kwargs):
        initial_history = tuple(kwargs.pop("history", ()))
        super().__init__(participation_resolver=participation_resolver,
                         historical_links=(), history=(), **kwargs)
        self.rpfo_repository = IndexedRelationRepositoryV12()
        self.continuity_inbox = continuity_inbox or ContinuityInboxV12()
        if not isinstance(self.continuity_inbox, ContinuityInboxV12):
            raise CoreV11InvariantError("canonical v1.2 requires current-only ContinuityInboxV12")
        self.rpfo_operator = RelationalParticipationFoldOperatorV12(participation_resolver)
        self._participation_state = ParticipationState()
        self._carried_frontier = None
        self._epoch_repo_snapshot = None
        self._epoch_history_snapshot = None
        self._epoch_identity = None
        self._epoch_frame_copy = None
        self._epoch_rpfo_snapshot = None
        if initial_history:
            self.add_history_batch(initial_history)
        for edge in continuity_edges:
            self.register_continuity_edge(edge)
        for link in historical_links:
            self.register_historical_link(link)

    def publish_current_continuity(self, *, epoch, claims):
        self.continuity_inbox.publish(epoch=epoch, claims=claims)

    def add_history_batch(self, envelopes):
        envelopes = deepcopy(tuple(envelopes))
        staged = CurrentRelationalCoreV12.validate_history_batch(self, envelopes)
        for envelope in envelopes:
            self.rpfo_repository.register_relation(
                RegisteredRelationV12(envelope.record, envelope.known_at_tau,
                                      tuple(envelope.occurrence_refs)))
        self._history = staged
        self._last_evaluation = None

    def publish_validated_history_batch(self, envelopes):
        envelopes = deepcopy(tuple(envelopes))
        staged = dict(self._history)
        for envelope in envelopes:
            key = self._source_key(envelope.record.source)
            prior = staged.get(key)
            if prior is not None and prior != envelope:
                raise CoreV11InvariantError("conflicting relation-process publication")
            staged[key] = envelope
            self.rpfo_repository.register_relation(
                RegisteredRelationV12(envelope.record, envelope.known_at_tau,
                                      tuple(envelope.occurrence_refs)))
        self._history = staged

    def register_continuity_edge(self, edge: ContinuityEdgeV12):
        self.rpfo_repository.register_continuity_edge(deepcopy(edge))

    def register_historical_link(self, link: HistoricalRelationLinkV12):
        self.rpfo_repository.register_link(deepcopy(link))

    @staticmethod
    def _merge_frontiers(current_relation_ids, seed, carried):
        contacts, seen, visited, trace = [], set(), [], []
        if carried is not None:
            for key in carried.visited_keys:
                if key not in visited:
                    visited.append(key)
            trace.extend(carried.trace)
            for contact in carried.contacts:
                if contact.current_relation_id in current_relation_ids and contact.contact_id not in seen:
                    seen.add(contact.contact_id)
                    contacts.append(contact)
        for contact in seed.contacts:
            if contact.contact_id not in seen:
                seen.add(contact.contact_id)
                contacts.append(contact)
        trace.extend(seed.trace)
        return FrontierV12(tuple(current_relation_ids), tuple(contacts), tuple(visited), tuple(trace))

    def _current_relations_and_claims(self):
        if self._frame is None:
            raise CoreV11InvariantError("current frame required before RPFO")
        relations = tuple(self.relation_builder.build(self._frame.observation))
        relation_ids = {x.relation_id for x in relations}
        claims = self.continuity_inbox.claims(epoch=self._frame.observation.epoch)
        for claim in claims:
            if claim.current_relation_id not in relation_ids:
                raise CoreV11InvariantError("continuity claim references absent current relation")
            if float(claim.observed_at_tau) != float(self._frame.tau):
                raise CoreV11InvariantError("continuity claim is not bound to current tau")
            self._frame.assert_current_evidence(claim.current_evidence_refs)
        return relations, claims

    def _ensure_rpfo_snapshot(self):
        if self._frame is None or self._epoch_repo_snapshot is None:
            raise CoreV11InvariantError("epoch repository snapshot required")
        if self._epoch_rpfo_snapshot is not None:
            return self._epoch_rpfo_snapshot
        relations, claims = self._current_relations_and_claims()
        relation_ids = tuple(x.relation_id for x in relations)
        seed = self.rpfo_operator.seed_frontier(
            current_tau=self._frame.tau, current_relations=relations,
            current_claims=claims, repository=self._epoch_repo_snapshot)
        frontier = self._merge_frontiers(relation_ids, seed, self._carried_frontier)
        self._epoch_rpfo_snapshot = self.rpfo_operator.step(
            current_tau=self._frame.tau, current_relations=relations,
            current_claims=claims, repository=self._epoch_repo_snapshot,
            frontier=frontier, prior_state=self._participation_state)
        return self._epoch_rpfo_snapshot

    def open_current_epoch(self, frame):
        identity = frame.observation.epoch
        if self._epoch_identity is not None:
            if identity < self._epoch_identity or frame.tau < self._epoch_frame_copy.tau:
                raise CoreV11InvariantError("Decision Epoch or current tau moved backwards")
            if identity == self._epoch_identity and frame != self._epoch_frame_copy:
                raise CoreV11InvariantError("same Decision Epoch has conflicting current frame")
        old = (self._participation_state, self._carried_frontier,
               self._epoch_repo_snapshot, self._epoch_history_snapshot,
               self._epoch_identity, self._epoch_frame_copy, self._epoch_rpfo_snapshot)
        try:
            if identity != self._epoch_identity:
                self._epoch_history_snapshot = self._history
                self._epoch_repo_snapshot = self.rpfo_repository.freeze(current_tau=frame.tau)
                self._epoch_identity = identity
                self._epoch_frame_copy = deepcopy(frame)
                self._epoch_rpfo_snapshot = None
            self.relation_builder.bind(frame.observation)
            view = super().open_current_epoch(frame)
            snapshot = self._ensure_rpfo_snapshot()
            self._participation_state = snapshot.participation_state
            self._carried_frontier = snapshot.next_frontier
            return view
        except Exception:
            (self._participation_state, self._carried_frontier,
             self._epoch_repo_snapshot, self._epoch_history_snapshot,
             self._epoch_identity, self._epoch_frame_copy, self._epoch_rpfo_snapshot) = old
            raise

    def history_records(self):
        snapshot = self._ensure_rpfo_snapshot()
        records = []
        for key in snapshot.participating_keys:
            record = self._epoch_repo_snapshot.get(key)
            if record is None:
                raise CoreV11InvariantError("participating history unavailable in epoch snapshot")
            records.append(record)
        return tuple(records)
