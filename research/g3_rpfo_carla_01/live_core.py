from __future__ import annotations

from hashlib import sha256

from research.g3_rpfo_v1.canonical12 import StrictRPFOOrganicCoreV12
from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    CurrentContinuityClaimV12,
    HistoricalLinkProvenanceV12,
    HistoricalRelationLinkV12,
)

FRONT_RELATION_ID = "current:front-longitudinal"
FRONT_EVIDENCE_REFS = ("current:front-longitudinal", "observation:front-present")


def _digest(*parts):
    return sha256("|".join(str(x) for x in parts).encode("utf-8")).hexdigest()


class RPFOCARLALiveCore(StrictRPFOOrganicCoreV12):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._latest_front_relation = None

    def add_history_batch(self, envelopes):
        batch = tuple(envelopes)
        super().add_history_batch(batch)
        if not batch:
            return
        if len(batch) != 1:
            raise ValueError("front empirical lineage requires one relation per admission")
        envelope = batch[0]
        source = envelope.record.source
        if source.relation_element_id != "front-interaction":
            raise ValueError("non-front relation entered front empirical lineage")
        refs = tuple(envelope.occurrence_refs)
        if len(refs) != 1:
            raise ValueError("front relation requires one closure occurrence")
        key = (source.experience_id, source.relation_element_id)
        occurrence_ref = refs[0]
        formed = float(source.completed_at_tau)
        known = float(envelope.known_at_tau)
        edge_id = "front-edge:" + _digest(key, occurrence_ref)
        self.register_continuity_edge(ContinuityEdgeV12(
            edge_id=edge_id,
            key=key,
            provenance=ContinuityEdgeProvenanceV12(
                source_key=key,
                formation_basis="completed front process entered ordered lineage",
                evidence_refs=(occurrence_ref,),
                formed_at_tau=formed,
                known_at_tau=known,
            ),
        ))
        prior = self._latest_front_relation
        if prior is not None and prior[0] != key:
            prior_key, prior_occurrence, prior_formed = prior
            self.register_historical_link(HistoricalRelationLinkV12(
                link_id="front-order-link:" + _digest(prior_key, key),
                members=(prior_key, key),
                formed_at_tau=max(float(prior_formed), formed),
                known_at_tau=known,
                provenance=HistoricalLinkProvenanceV12(
                    formation_basis="observed order of completed front processes",
                    source_experience_ids=(prior_key[0], key[0]),
                    evidence_refs=(prior_occurrence, occurrence_ref),
                ),
            ))
        self._latest_front_relation = (key, occurrence_ref, formed)

    def _current_claims(self, frame):
        if not frame.observation.front_present or self._latest_front_relation is None:
            return ()
        frame.assert_current_evidence(FRONT_EVIDENCE_REFS)
        key, occurrence_ref, _ = self._latest_front_relation
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
