from __future__ import annotations

from typing import Mapping, Sequence

from research.g3_rpfo_v1.rpfo import LinkActivation, ParticipationDecision, ParticipationState
from research.g3_rpfo_v1.rpfo_v12 import HistoricalRelationLinkV12
from research.oasis_core_v11.current_relational_core import (
    CurrentRelation,
    PastRelationSemanticView,
    RelationContribution,
    RelationKey,
)

FRONT_RELATION_ID = "current:front-longitudinal"


class FrontProcessParticipationResolver:
    """Resolve only the already-opened local RPFO surface; never search history."""

    def resolve(
        self,
        *,
        current_tau: float,
        current_relations: Sequence[CurrentRelation],
        frontier_records: Mapping[RelationKey, object],
        active_records: Mapping[RelationKey, object],
        incident_links: Mapping[str, HistoricalRelationLinkV12],
        prior_state: ParticipationState,
    ) -> ParticipationDecision:
        del current_tau, prior_state
        front = next((r for r in current_relations if r.relation_id == FRONT_RELATION_ID), None)
        opened = tuple(frontier_records)
        if front is None:
            return ParticipationDecision((), opened)

        participating = tuple(dict.fromkeys(tuple(active_records) + opened))
        participating_set = set(participating)
        activations = []
        joint = []
        for link_id, link in incident_links.items():
            causes = tuple(key for key in link.members if key in participating_set)
            if not causes:
                continue
            activations.append(
                LinkActivation(
                    link_id=str(link_id),
                    current_relation_ids=(FRONT_RELATION_ID,),
                    caused_by_keys=causes,
                )
            )
            if len(causes) >= 2:
                joint.append(causes)

        roles = {
            key: (
                "front-process:new-contact" if key in frontier_records else "front-process:continuing-participation",
                f"current-state:{front.relation_state}",
                "provenance-mediated",
            )
            for key in participating
        }
        return ParticipationDecision(
            participating_keys=participating,
            unresolved_opened_keys=(),
            activations=tuple(activations),
            joint_participations=tuple(joint),
            role_descriptors=roles,
        )


class RPFOParticipationContributionOperator:
    """Contribute an already-participating past relation without historical matching."""

    def relate(
        self,
        *,
        current_relations: Sequence[CurrentRelation],
        past: PastRelationSemanticView,
        candidate_ids: Sequence[str],
    ) -> Sequence[RelationContribution]:
        front = next((r for r in current_relations if r.relation_id == FRONT_RELATION_ID), None)
        if front is None:
            return ()
        current_candidates = set(str(x) for x in candidate_ids)
        result = []
        for possibility_id in past.possibility_links:
            possibility_id = str(possibility_id)
            if possibility_id not in current_candidates:
                continue
            result.append(
                RelationContribution(
                    possibility_id=possibility_id,
                    current_relation_ids=(FRONT_RELATION_ID,),
                    role_trace=(
                        "rpfo-current-participation",
                        f"current-state:{front.relation_state}",
                        f"historical-state:{past.relation_state}",
                    ),
                    generated_possibilities=(possibility_id,),
                    trace={
                        "basis": "already-participating provenance path; no historical matching",
                        "current_relation": FRONT_RELATION_ID,
                    },
                )
            )
        return tuple(result)
