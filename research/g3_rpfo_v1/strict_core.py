from __future__ import annotations

"""Canonical fail-closed RPFO Core path."""

from research.g3_rpfo_v1.core import RPFOOrganicCore
from research.g3_rpfo_v1.hardening import StrictRelationalParticipationFoldOperator


class StrictRPFOOrganicCore(RPFOOrganicCore):
    """RPFO Core with deterministic frontier order and strict link-cause provenance."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        resolver = self.rpfo_operator.resolver
        self.rpfo_operator = StrictRelationalParticipationFoldOperator(
            repository=self.relation_repository,
            resolver=resolver,
        )
