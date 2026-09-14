from hashlib import sha256

from research.g3_rpfo_v1.rpfo_v12 import (
    ContinuityEdgeProvenanceV12,
    ContinuityEdgeV12,
    HistoricalLinkProvenanceV12,
    HistoricalRelationLinkV12,
)
from .state import LatestContinuity, FrontContinuityState


def _id(prefix, *parts):
    payload = "|".join(str(x) for x in parts).encode("utf-8")
    return prefix + sha256(payload).hexdigest()


def register_admission(state: FrontContinuityState, *, core, completed_episode, admission):
    keys = tuple(admission.admitted_relation_keys)
    if len(keys) != 1:
        raise ValueError("front lineage requires exactly one admitted relation")
    if completed_episode.closure_scope_id != state.scope_id:
        raise ValueError("closure scope mismatch")

    key = keys[0]
    occurrence = admission.occurrence
    edge_id = _id("front-edge:", state.scope_id, key, occurrence.occurrence_id)
    edge = ContinuityEdgeV12(
        edge_id=edge_id,
        key=key,
        provenance=ContinuityEdgeProvenanceV12(
            source_key=key,
            formation_basis="completed front process order",
            evidence_refs=(occurrence.occurrence_id,),
            formed_at_tau=float(occurrence.occurred_at_tau),
            known_at_tau=float(admission.known_at_tau),
        ),
    )
    core.register_continuity_edge(edge)

    prior = state.latest
    if prior is not None and prior.key != key:
        link = HistoricalRelationLinkV12(
            link_id=_id("front-order-link:", state.scope_id, prior.key, key),
            members=(prior.key, key),
            formed_at_tau=max(prior.occurred_at_tau, float(occurrence.occurred_at_tau)),
            known_at_tau=float(admission.known_at_tau),
            provenance=HistoricalLinkProvenanceV12(
                formation_basis="observed order of completed front processes",
                source_experience_ids=(prior.key[0], key[0]),
                evidence_refs=(prior.occurrence_ref, occurrence.occurrence_id),
            ),
        )
        core.register_historical_link(link)

    state.latest = LatestContinuity(
        key=key,
        edge_id=edge_id,
        occurrence_ref=occurrence.occurrence_id,
        occurred_at_tau=float(occurrence.occurred_at_tau),
        known_at_tau=float(admission.known_at_tau),
    )
