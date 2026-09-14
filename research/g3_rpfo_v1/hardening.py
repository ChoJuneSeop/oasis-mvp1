from __future__ import annotations

"""Fail-closed hardening for the canonical RPFO action path."""

from research.g3_rpfo_v1.rpfo import RelationalFrontier, RelationalParticipationFoldOperator
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class StrictRelationalParticipationFoldOperator(RelationalParticipationFoldOperator):
    """Preserve deterministic relation order and exact link-cause provenance."""

    def seed_frontier(self, *, current_tau, current_relations, current_anchors, visited_keys=(), trace=()):
        frontier = super().seed_frontier(
            current_tau=current_tau,
            current_relations=current_relations,
            current_anchors=current_anchors,
            visited_keys=visited_keys,
            trace=trace,
        )
        ordered_ids = tuple(str(item.relation_id) for item in current_relations)
        return RelationalFrontier(
            current_relation_ids=ordered_ids,
            contacts=frontier.contacts,
            visited_keys=frontier.visited_keys,
            trace=frontier.trace,
        )

    def step(self, **kwargs):
        snapshot = super().step(**kwargs)
        for activation in snapshot.activations:
            canonical = None
            for cause in activation.caused_by_keys:
                matches = tuple(
                    link for link in self.repository.links_for(cause)
                    if link.link_id == activation.link_id
                )
                if len(matches) != 1:
                    raise CoreV11InvariantError(
                        "every claimed activation cause must be incident to exactly one preserved link"
                    )
                if cause not in matches[0].members:
                    raise CoreV11InvariantError(
                        "activation provenance contains a cause outside the preserved link"
                    )
                if canonical is None:
                    canonical = matches[0]
                elif canonical != matches[0]:
                    raise CoreV11InvariantError(
                        "same link id resolved inconsistently across activation causes"
                    )
            if canonical is None or not set(activation.caused_by_keys) <= set(canonical.members):
                raise CoreV11InvariantError(
                    "activation causes must be a subset of the preserved historical link"
                )
        return snapshot
