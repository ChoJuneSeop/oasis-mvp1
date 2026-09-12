from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass

from research.carla_v22_harness_v11.canonical_harness import (
    DecisionExecution,
    PresentObservation,
)
from research.carla_v22_harness_v11.independent_evaluator_v1 import (
    IndependentEvaluatorV1,
    EvaluatorRecord,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


@dataclass(frozen=True)
class CompletedLiveEpisode:
    record: EvaluatorRecord
    decision_responsibility: dict


@dataclass
class _PendingDecisionRelation:
    evaluator: IndependentEvaluatorV1
    decision_responsibility: dict


class FrontRelationEpisodeManager:
    """Track multiple decision realizations inside one continuing front relation.

    Decision Epoch and Relation Episode remain distinct. Every Decision Epoch may
    realize exactly one action. If that decision was made while a front relation was
    present, its realized relation process remains pending until the existing frozen
    front-interaction Closure evaluator observes the relation end. Multiple decisions
    may therefore remain pending and close at the same later relation boundary.

    This v1 manager intentionally does not invent Closure rules for non-front
    relations. Decisions without a front relation may still be realized and logged,
    but they do not become front-relation Completed Experiences through this manager.
    """

    def __init__(self, closure_evaluator):
        self.closure_evaluator = closure_evaluator
        self._pending: list[_PendingDecisionRelation] = []

    @property
    def active(self) -> bool:
        return bool(self._pending)

    @property
    def pending_count(self) -> int:
        return len(self._pending)

    def can_begin(self, execution: DecisionExecution) -> bool:
        return bool(execution.observation.front_present)

    def begin(
        self,
        execution: DecisionExecution,
        *,
        decision_responsibility: dict,
    ) -> bool:
        if not self.can_begin(execution):
            return False
        evaluator = IndependentEvaluatorV1(self.closure_evaluator)
        evaluator.begin(execution)
        self._pending.append(
            _PendingDecisionRelation(
                evaluator=evaluator,
                decision_responsibility=deepcopy(decision_responsibility),
            )
        )
        return True

    def observe_post(
        self,
        *,
        post_observation: PresentObservation,
        post_tau: float,
    ) -> tuple[CompletedLiveEpisode, ...]:
        if not self._pending:
            return ()

        completed: list[CompletedLiveEpisode] = []
        remaining: list[_PendingDecisionRelation] = []
        for pending in self._pending:
            record = pending.evaluator.observe_post(
                post_observation=post_observation,
                post_tau=float(post_tau),
            )
            if record.closed:
                if record.history_entry is None:
                    raise CoreV11InvariantError(
                        "closed live relation process lacks its realized HistoryEntry"
                    )
                completed.append(
                    CompletedLiveEpisode(
                        record=record,
                        decision_responsibility=deepcopy(
                            pending.decision_responsibility
                        ),
                    )
                )
            else:
                remaining.append(pending)
        self._pending = remaining
        return tuple(completed)
