from __future__ import annotations

"""RPFO-integrated OASIS G3 Core.

This execution lineage keeps Fold-v1 / G3-FOLD-QUAL A1 untouched as historical
falsification evidence.  The action path does not discover contacts by iterating the
complete past.  It uses current-only lineage anchors, direct indexes, persistent
participation, and one-step deferred frontier expansion.
"""

from copy import deepcopy
import inspect
from math import isfinite

from research.choice_responsibility_v01.integration import DecisionInputs
from research.g3_organic_flow_v1.core import OrganicIntegratedChoiceCore
from research.g3_rpfo_v1.rpfo import (
    CurrentLineageProvider,
    HistoricalRelationLink,
    IndexedRelationRepository,
    ParticipationResolver,
    ParticipationState,
    RelationContextLineageProvider,
    RelationalFrontier,
    RelationalParticipationFoldOperator,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.current_relational_core import CurrentRelationalCoreV12


class EpochStableRelationBuilder:
    """Build the present relation surface once and reuse it inside one Decision Epoch."""

    def __init__(self, inner):
        self.inner = inner
        self._observation = None
        self._relations = None

    def bind(self, observation):
        if self._observation == observation and self._relations is not None:
            return deepcopy(self._relations)
        relations = tuple(deepcopy(self.inner.build(observation)))
        ids = [str(item.relation_id) for item in relations]
        if len(ids) != len(set(ids)):
            raise CoreV11InvariantError("current relation ids must be unique")
        self._observation = deepcopy(observation)
        self._relations = deepcopy(relations)
        return deepcopy(relations)

    def build(self, observation):
        if self._observation != observation or self._relations is None:
            raise CoreV11InvariantError(
                "current relation surface must be bound before Decision Epoch evaluation"
            )
        return deepcopy(self._relations)


class RPFOOrganicCore(OrganicIntegratedChoiceCore):
    """Organic Core whose action path sees only RPFO-participating historical relations."""

    def __init__(
        self,
        *,
        participation_resolver: ParticipationResolver,
        lineage_provider: CurrentLineageProvider | None = None,
        historical_links=(),
        **kwargs,
    ):
        initial_history = tuple(kwargs.pop("history", ()))
        self.relation_repository = IndexedRelationRepository()
        self.lineage_provider = lineage_provider or RelationContextLineageProvider()
        self.rpfo_operator = RelationalParticipationFoldOperator(
            repository=self.relation_repository,
            resolver=participation_resolver,
        )
        self._participation_state = ParticipationState()
        self._carried_frontier = None
        self._epoch_history_snapshot = None
        self._epoch_identity = None
        self._epoch_frame_copy = None
        self._epoch_rpfo_snapshot = None

        params = inspect.signature(self.lineage_provider.anchors).parameters
        for forbidden in ("history", "history_records", "repository", "relation_repository"):
            if forbidden in params:
                raise CoreV11InvariantError(
                    "current lineage provider must not receive historical storage"
                )

        super().__init__(history=(), **kwargs)
        self._domain_relation_builder = self.relation_builder
        self.relation_builder = EpochStableRelationBuilder(self._domain_relation_builder)
        if initial_history:
            self.add_history_batch(initial_history)
        for link in historical_links:
            self.register_historical_link(link)

    @staticmethod
    def _lineage_refs(record):
        raw = record.source.relation_descriptor.get("rpfo_lineage_refs", ())
        if raw in (None, ()):
            return ()
        if not isinstance(raw, (tuple, list)):
            raise CoreV11InvariantError("rpfo_lineage_refs must be an explicit sequence")
        refs = tuple(str(x).strip() for x in raw if str(x).strip())
        if len(refs) != len(set(refs)):
            raise CoreV11InvariantError("rpfo_lineage_refs must be unique")
        return refs

    def add_history_batch(self, envelopes):
        envelopes = deepcopy(tuple(envelopes))
        staged = CurrentRelationalCoreV12.validate_history_batch(self, envelopes)
        registrations = tuple(
            (envelope.record, self._lineage_refs(envelope.record))
            for envelope in envelopes
        )
        self.relation_repository.register_records(registrations)
        self._history = staged
        self._last_evaluation = None

    def publish_validated_history_batch(self, envelopes):
        envelopes = deepcopy(tuple(envelopes))
        staged = dict(self._history)
        registrations = []
        for envelope in envelopes:
            key = self._source_key(envelope.record.source)
            prior = staged.get(key)
            if prior is not None and prior != envelope:
                raise CoreV11InvariantError("conflicting relation-process publication")
            staged[key] = envelope
            registrations.append((envelope.record, self._lineage_refs(envelope.record)))
        self.relation_repository.register_records(tuple(registrations))
        self._history = staged

    def register_historical_link(self, link: HistoricalRelationLink):
        self.relation_repository.register_link(deepcopy(link))

    def _history_view(self):
        if self._epoch_history_snapshot is not None:
            return self._epoch_history_snapshot
        return self._history

    def _visible_key(self, key) -> bool:
        if self._frame is None:
            raise CoreV11InvariantError("current frame is required for RPFO visibility")
        envelope = self._history_view().get(key)
        return bool(
            envelope is not None
            and float(envelope.known_at_tau) <= float(self._frame.tau)
            and float(envelope.record.source.completed_at_tau) <= float(self._frame.tau)
        )

    @staticmethod
    def _merge_frontiers(current_relation_ids, seed, carried):
        contacts = []
        seen_contacts = set()
        visited = []
        trace = []
        if carried is not None:
            for key in carried.visited_keys:
                if key not in visited:
                    visited.append(key)
            trace.extend(carried.trace)
            for contact in carried.contacts:
                if (
                    contact.current_relation_id in current_relation_ids
                    and contact.contact_id not in seen_contacts
                ):
                    seen_contacts.add(contact.contact_id)
                    contacts.append(contact)
        for contact in seed.contacts:
            if contact.contact_id not in seen_contacts:
                seen_contacts.add(contact.contact_id)
                contacts.append(contact)
        trace.extend(seed.trace)
        return RelationalFrontier(
            current_relation_ids=tuple(current_relation_ids),
            contacts=tuple(contacts),
            visited_keys=tuple(visited),
            trace=tuple(trace),
        )

    def _current_relations_and_anchors(self):
        if self._frame is None:
            raise CoreV11InvariantError("current frame required before RPFO")
        current_relations = tuple(self.relation_builder.build(self._frame.observation))
        anchors = tuple(
            self.lineage_provider.anchors(
                frame=deepcopy(self._frame),
                current_relations=deepcopy(current_relations),
            )
        )
        for anchor in anchors:
            self._frame.assert_current_evidence(anchor.evidence_refs)
            if float(anchor.observed_at_tau) != float(self._frame.tau):
                raise CoreV11InvariantError("lineage anchor is not bound to current reality")
        return current_relations, anchors

    def _ensure_rpfo_snapshot(self):
        if self._frame is None:
            raise CoreV11InvariantError("explicit current frame required before RPFO")
        if self._epoch_rpfo_snapshot is not None:
            return self._epoch_rpfo_snapshot

        current_relations, anchors = self._current_relations_and_anchors()
        current_relation_ids = tuple(r.relation_id for r in current_relations)
        seed = self.rpfo_operator.seed_frontier(
            current_tau=float(self._frame.tau),
            current_relations=current_relations,
            current_anchors=anchors,
        )
        frontier = self._merge_frontiers(
            current_relation_ids,
            seed,
            self._carried_frontier,
        )
        frontier = RelationalFrontier(
            current_relation_ids=frontier.current_relation_ids,
            contacts=tuple(
                contact for contact in frontier.contacts if self._visible_key(contact.key)
            ),
            visited_keys=frontier.visited_keys,
            trace=frontier.trace,
        )
        self._epoch_rpfo_snapshot = self.rpfo_operator.step(
            current_tau=float(self._frame.tau),
            current_relations=current_relations,
            current_anchors=anchors,
            frontier=frontier,
            prior_state=self._participation_state,
        )
        return self._epoch_rpfo_snapshot

    def open_current_epoch(self, frame):
        identity = frame.observation.epoch
        if self._epoch_identity is not None:
            if identity < self._epoch_identity or frame.tau < self._epoch_frame_copy.tau:
                raise CoreV11InvariantError("Decision Epoch or current tau moved backwards")
            if identity == self._epoch_identity and frame != self._epoch_frame_copy:
                raise CoreV11InvariantError("same Decision Epoch has conflicting current frame")

        if identity != self._epoch_identity:
            self._epoch_history_snapshot = self._history
            self._epoch_rpfo_snapshot = None
            self._epoch_identity = identity
            self._epoch_frame_copy = deepcopy(frame)

        self.relation_builder.bind(frame.observation)
        previous_state = self._participation_state
        previous_frontier = self._carried_frontier
        try:
            view = super().open_current_epoch(frame)
            snapshot = self._ensure_rpfo_snapshot()
        except Exception:
            self._participation_state = previous_state
            self._carried_frontier = previous_frontier
            self._epoch_rpfo_snapshot = None
            raise
        self._participation_state = snapshot.participation_state
        self._carried_frontier = snapshot.next_frontier
        return view

    def history_records(self):
        snapshot = self._ensure_rpfo_snapshot()
        records = []
        for key in snapshot.participating_keys:
            if not self._visible_key(key):
                raise CoreV11InvariantError(
                    "participating history is not visible in current reality"
                )
            record = self.relation_repository.get(key)
            if record is None:
                raise CoreV11InvariantError(
                    "participating history disappeared from repository"
                )
            records.append(record)
        return tuple(records)

    def history_envelopes(self):
        """Complete epoch history is diagnostic/archival, not a contact-discovery API."""
        history = self._history_view()
        return deepcopy(tuple(history[key] for key in sorted(history)))

    def active_history_envelopes(self):
        snapshot = self._ensure_rpfo_snapshot()
        history = self._history_view()
        return deepcopy(
            tuple(history[key] for key in snapshot.participating_keys if key in history)
        )

    def published_history_envelopes(self):
        return deepcopy(tuple(self._history[key] for key in sorted(self._history)))

    def _inputs(self, observation):
        """Choice/Responsibility reentry lookup uses only sources already in evaluation."""
        frame = self._require_frame(observation)
        evaluation = self._last_evaluation
        if evaluation is None or evaluation.observation != observation:
            evaluation = self._evaluate(observation)

        keys = {self._source_key(x.source) for x in evaluation.contributions}
        keys.update(
            self._source_key(link.source)
            for measurement in evaluation.reconstructions
            for link in measurement.source_links
        )
        history = self._history_view()
        reentered = {}
        for key in keys:
            envelope = history.get(key)
            if envelope is None:
                raise CoreV11InvariantError(
                    "evaluation references history absent from epoch provenance snapshot"
                )
            if envelope.completion.unresolved:
                reentered[envelope.completion.experience_id] = envelope.completion.unresolved
        return deepcopy(DecisionInputs(frame, evaluation, tuple(reentered.items())))

    def rpfo_snapshot(self):
        return deepcopy(self._ensure_rpfo_snapshot())

    def responsibility_record(self):
        record = super().responsibility_record()
        snapshot = self._ensure_rpfo_snapshot()
        record["rpfo_action"] = {
            "access_basis": snapshot.access_basis,
            "opened_relation_refs": tuple(snapshot.opened_keys),
            "participating_relation_refs": tuple(snapshot.participating_keys),
            "unresolved_relation_refs": tuple(snapshot.unresolved_keys),
            "unfolded_relation_refs": tuple(snapshot.unfolded_keys),
            "joint_participations": tuple(snapshot.joint_participations),
            "next_frontier_contact_ids": tuple(
                x.contact_id for x in snapshot.next_frontier.contacts
            ),
            "global_history_scan": snapshot.global_history_scan,
            "recursive_history_fold": snapshot.recursive_history_fold,
            "interpretation": (
                "Past experience enters the present only through current lineage provenance "
                "or a preserved link reached by current participation; absence is not zero."
            ),
        }
        return deepcopy(record)

    def _distribution(self, candidates, contributions, measurements):
        history = self._history_view()
        tokens = {
            candidate.possibility_id: {("current", ref) for ref in candidate.current_evidence}
            for candidate in candidates
        }

        def origins(source):
            key = self._source_key(source)
            if key not in history:
                raise CoreV11InvariantError(
                    "epoch history provenance changed or disappeared during evaluation"
                )
            envelope = history[key]
            return {("past", occurrence_id) for occurrence_id in envelope.occurrence_refs}

        for bound in contributions:
            tokens[bound.contribution.possibility_id].update(origins(bound.source))
        for measurement in measurements:
            for link in measurement.source_links:
                tokens[measurement.possibility_id].update(origins(link.source))

        mass = {key: float(len(value)) for key, value in tokens.items()}
        total = sum(mass.values())
        if total <= 0 or not isfinite(total):
            raise CoreV11InvariantError(
                "no constructed possibilities; no realization or terminal claim"
            )
        return {key: value / total for key, value in mass.items()}
