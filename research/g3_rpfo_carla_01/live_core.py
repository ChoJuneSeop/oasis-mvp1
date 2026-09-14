from __future__ import annotations

from copy import deepcopy
from hashlib import sha256

from research.g3_rpfo_v1.canonical12 import StrictRPFOOrganicCoreV12
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
    HistoricalLinkProvenanceV12,
    HistoricalRelationLinkV12,
    RegisteredRelationV12,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

FRONT_RELATION_ID = "current:front-longitudinal"
FRONT_EVIDENCE_REFS = ("current:front-longitudinal", "observation:front-present")


def _digest(*parts):
    return sha256("|".join(str(x) for x in parts).encode("utf-8")).hexdigest()


class RPFOCARLALiveCore(StrictRPFOOrganicCoreV12):
    def __init__(self, *args, **kwargs):
        initial_history = tuple(kwargs.pop("history", ()))
        self._latest_front_relation = None
        super().__init__(*args, history=(), **kwargs)
        for envelope in initial_history:
            self.add_history_batch((envelope,))

    @staticmethod
    def _front_admission(batch):
        if not batch:
            return None
        if len(batch) != 1:
            raise CoreV11InvariantError(
                "front empirical lineage requires one relation per admission"
            )
        envelope = batch[0]
        source = envelope.record.source
        if source.relation_element_id != "front-interaction":
            raise CoreV11InvariantError(
                "non-front relation entered front empirical lineage"
            )
        refs = tuple(envelope.occurrence_refs)
        if len(refs) != 1:
            raise CoreV11InvariantError(
                "front relation requires one closure occurrence"
            )
        return envelope, source, refs[0]

    @staticmethod
    def _edge_for(envelope, source, occurrence_ref):
        key = (source.experience_id, source.relation_element_id)
        formed = float(source.completed_at_tau)
        known = float(envelope.known_at_tau)
        return ContinuityEdgeV12(
            edge_id="front-edge:" + _digest(key, occurrence_ref),
            key=key,
            provenance=ContinuityEdgeProvenanceV12(
                source_key=key,
                formation_basis="completed front process entered ordered lineage",
                evidence_refs=(occurrence_ref,),
                formed_at_tau=formed,
                known_at_tau=known,
            ),
        )

    def add_history_batch(self, envelopes):
        batch = tuple(envelopes)
        checked = self._front_admission(batch)
        if checked is None:
            return super().add_history_batch(batch)

        envelope, source, occurrence_ref = checked
        key = (source.experience_id, source.relation_element_id)
        existing = self._history.get(key)
        if existing is not None:
            if existing == envelope:
                return
            super().add_history_batch(batch)
            raise CoreV11InvariantError("conflicting replay was not rejected")

        edge = self._edge_for(envelope, source, occurrence_ref)
        formed = float(source.completed_at_tau)
        known = float(envelope.known_at_tau)
        prior = self._latest_front_relation
        link = None
        if prior is not None and prior[0] != key and prior[1] != occurrence_ref:
            prior_key, prior_occurrence, prior_formed, prior_known = prior
            link = HistoricalRelationLinkV12(
                link_id="front-order-link:" + _digest(prior_key, key),
                members=(prior_key, key),
                formed_at_tau=max(float(prior_formed), formed),
                known_at_tau=max(float(prior_known), known),
                provenance=HistoricalLinkProvenanceV12(
                    formation_basis="observed order of distinct completed front-process occurrences",
                    source_experience_ids=(prior_key[0], key[0]),
                    evidence_refs=(prior_occurrence, occurrence_ref),
                ),
            )

        staged = deepcopy(self.rpfo_repository)
        staged.register_relation(
            RegisteredRelationV12(
                envelope.record,
                envelope.known_at_tau,
                tuple(envelope.occurrence_refs),
            )
        )
        staged.register_continuity_edge(edge)
        if link is not None:
            staged.register_link(link)

        super().add_history_batch(batch)
        self.register_continuity_edge(edge)
        if link is not None:
            self.register_historical_link(link)

        if prior is None or prior[1] != occurrence_ref:
            self._latest_front_relation = (key, occurrence_ref, formed, known)

    def _current_claims(self, frame):
        if not frame.observation.front_present or self._latest_front_relation is None:
            return ()
        frame.assert_current_evidence(FRONT_EVIDENCE_REFS)
        key, occurrence_ref, _, _ = self._latest_front_relation
        edge_id = "front-edge:" + _digest(key, occurrence_ref)
        return (CurrentContinuityClaimV12(
            claim_id="front-claim:%s:%s" % (frame.observation.epoch, edge_id),
            current_relation_id=FRONT_RELATION_ID,
            edge_id=edge_id,
            current_evidence_refs=FRONT_EVIDENCE_REFS,
            observed_at_tau=float(frame.tau),
        ),)

    def open_current_epoch(self, frame):
        self.publish_current_continuity(
            epoch=frame.observation.epoch,
            claims=self._current_claims(frame),
        )
        return super().open_current_epoch(frame)
