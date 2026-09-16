from __future__ import annotations

from copy import deepcopy
from dataclasses import replace

from research.g3_2_sidecar.common import RelationElementRef
from research.governance_harness_v01.harness import RevalidationState
from research.governance_harness_v01.harness_v04 import (
    CompletedExperience,
    GovernanceFeedbackV04,
    HistoryAccessPort,
)
from research.oasis_core_v11.current_relational_core import (
    HistoricalRelationRecord,
    PastRelationSemanticView,
)


_STATE_PERMUTATION = {
    RevalidationState.CONFIRMED: RevalidationState.REVISED,
    RevalidationState.REVISED: RevalidationState.INCONCLUSIVE,
    RevalidationState.INCONCLUSIVE: RevalidationState.CONFIRMED,
}


def baseline_experience(relation_id: str, density: int) -> CompletedExperience:
    experience_id = f"E1:{relation_id}"
    completed_tau = 1.0
    record = HistoricalRelationRecord(
        RelationElementRef(
            experience_id,
            f"rel-{experience_id}",
            completed_tau,
            {"relation": "longitudinal-relative-motion"},
        ),
        PastRelationSemanticView(
            "ego-role",
            "front-traffic-role",
            "longitudinal-relative-motion",
            "closing",
            ("front-interaction",),
            {"visibility": "clear"},
            ("recognition",),
            ("continue-flow",),
        ),
    )
    return CompletedExperience(
        experience_id=experience_id,
        relation_id=relation_id,
        provenance_ref=f"prov:{experience_id}",
        completed_tau=completed_tau,
        content={
            "relation_records": (record,),
            "feedback_scope_density": int(density),
        },
        byte_size=256,
    )


def _permute_feedback(item: GovernanceFeedbackV04) -> GovernanceFeedbackV04:
    return replace(
        item,
        gap_state=_STATE_PERMUTATION[item.gap_state],
        choice_state=_STATE_PERMUTATION[item.choice_state],
        responsibility_state=_STATE_PERMUTATION[item.responsibility_state],
        experience_states=tuple(
            (experience_id, _STATE_PERMUTATION[state])
            for experience_id, state in item.experience_states
        ),
    )


class FrozenDecisionHistoryPort(HistoryAccessPort):
    """GH-3 archive policy: commit everything, but only baseline CE is decision eligible."""

    def __init__(self, baseline: CompletedExperience, arm: str):
        super().__init__((baseline,))
        self._baseline = (deepcopy(baseline),)
        self._baseline_ids = frozenset(x.experience_id for x in self._baseline)
        self.arm = arm
        self.last_exposed_feedback: tuple[GovernanceFeedbackV04, ...] = ()
        self.last_decision_eligible_ids: tuple[str, ...] = ()
        self.search_calls = 0

    def search(self, relation_id: str, decision_tau: float):
        self.search_calls += 1
        self.archive_access_count += 1
        self.records_scanned += len(self._baseline)
        self.bytes_read += sum(x.byte_size for x in self._baseline)
        found = tuple(
            deepcopy(x)
            for x in self._baseline
            if x.relation_id == relation_id and x.completed_tau < decision_tau
        )
        self.last_decision_eligible_ids = tuple(x.experience_id for x in found)
        return found

    def contextual_feedback(self, relation_id: str):
        committed = tuple(
            deepcopy(x) for x in self._feedback if x.relation_id == relation_id
        )
        if self.arm == "F1_ACTIVE_CORRECT":
            exposed = committed
        elif self.arm == "F2_RECORD_ONLY":
            exposed = ()
        elif self.arm == "F3_PERMUTED_STATE":
            exposed = tuple(_permute_feedback(x) for x in committed)
        else:
            raise ValueError(self.arm)
        self.last_exposed_feedback = exposed
        return deepcopy(exposed)

    def committed_feedback(self, relation_id: str):
        return tuple(deepcopy(x) for x in self._feedback if x.relation_id == relation_id)

    @property
    def baseline_decision_eligible_count(self) -> int:
        return len(self._baseline)

    def new_ce_was_decision_eligible(self) -> bool:
        return any(x not in self._baseline_ids for x in self.last_decision_eligible_ids)
