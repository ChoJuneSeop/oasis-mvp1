from __future__ import annotations

from copy import deepcopy
from dataclasses import replace

from research.g3_2_sidecar.common import RelationElementRef
from research.governance_harness_v01.harness_v04 import CompletedExperience, HistoryAccessPort
from research.oasis_core_v11.current_relational_core import HistoricalRelationRecord, PastRelationSemanticView


DYNAMIC_ARMS = frozenset({
    "H1_FULL_INTEGRATED",
    "H3_FEEDBACK_RECORD_ONLY",
    "H4_RESPONSIBILITY_RECORD_ONLY",
    "H5_NONSELECTIVE_HISTORY",
})


def _record(experience_id: str, completed_tau: float, selected: str) -> HistoricalRelationRecord:
    return HistoricalRelationRecord(
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
            (selected,),
        ),
    )


def baseline_experience(relation_id: str, density: int) -> CompletedExperience:
    experience_id = f"GH4-BASE:{relation_id}"
    selected = "continue-flow"
    completed_tau = 1.0
    record = _record(experience_id, completed_tau, selected)
    return CompletedExperience(
        experience_id=experience_id,
        relation_id=relation_id,
        provenance_ref=f"prov:{experience_id}",
        completed_tau=completed_tau,
        content={
            "relation_records": (record,),
            "scope_density": int(density),
            "selected": selected,
            "source": "frozen-baseline",
        },
        byte_size=256,
    )


class IntegratedHistoryPort(HistoryAccessPort):
    """Growing GH-4 archive with arm-specific decision eligibility and feedback exposure."""

    def __init__(self, baselines: tuple[CompletedExperience, ...], arm: str):
        super().__init__(baselines)
        self.arm = arm
        self._baseline_ids = frozenset(x.experience_id for x in baselines)
        self._current_scope_density: int | None = None
        self.last_decision_eligible_ids: tuple[str, ...] = ()
        self.last_decision_eligible_taus: tuple[float, ...] = ()
        self.last_feedback_exposed_count = 0
        self.search_calls = 0

    def set_current_scope(self, density: int) -> None:
        self._current_scope_density = int(density)

    def search(self, relation_id: str, decision_tau: float):
        self.search_calls += 1
        self.archive_access_count += 1
        if self.arm == "H2_FROZEN_NEW_CE":
            pool = tuple(x for x in self._experiences if x.experience_id in self._baseline_ids)
        else:
            pool = tuple(self._experiences)
        self.records_scanned += len(pool)
        self.bytes_read += sum(x.byte_size for x in pool)
        found = tuple(
            deepcopy(x) for x in pool
            if x.relation_id == relation_id and x.completed_tau < decision_tau
        )
        self.last_decision_eligible_ids = tuple(x.experience_id for x in found)
        self.last_decision_eligible_taus = tuple(float(x.completed_tau) for x in found)
        return found

    def contextual_feedback(self, relation_id: str):
        committed = super().contextual_feedback(relation_id)
        if self.arm == "H3_FEEDBACK_RECORD_ONLY":
            exposed = ()
        else:
            exposed = committed
        self.last_feedback_exposed_count = len(exposed)
        return deepcopy(exposed)

    def atomic_commit(self, history, completed, feedback, sidecar, prepared_sidecar):
        if self._current_scope_density is None:
            raise RuntimeError("GH-4 current scope was not set before commit")
        selected = str(history.selected_possibility_id)
        record = _record(completed.experience_id, completed.completed_tau, selected)
        enriched = replace(
            completed,
            content={
                "history_entry_id": history.entry_id,
                "selected": selected,
                "scope_density": int(self._current_scope_density),
                "relation_records": (record,),
                "source": "run-created",
            },
            byte_size=max(completed.byte_size, 256),
        )
        return super().atomic_commit(history, enriched, feedback, sidecar, prepared_sidecar)

    @property
    def decision_experience_count(self) -> int:
        return len(self._experiences)

    @property
    def run_created_experience_count(self) -> int:
        return sum(1 for x in self._experiences if x.experience_id not in self._baseline_ids)

    def last_search_has_run_created(self) -> bool:
        return any(x not in self._baseline_ids for x in self.last_decision_eligible_ids)
