from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from research.carla_v22_harness_v11.canonical_harness import DecisionExecution, PresentObservation
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.carla_domain_policy_v1 import FrontInteractionClosureEvaluator


class EvaluatorInvariantError(RuntimeError):
    pass


@dataclass(frozen=True)
class PendingRelationProcess:
    entry_id: str
    execution: DecisionExecution
    realized_observation: PresentObservation


@dataclass(frozen=True)
class EvaluatorRecord:
    closed: bool
    history_entry: Optional[HistoryEntry]
    evidence: Mapping[str, object]


class IndependentEvaluatorV1:
    """Post-realization evaluator separated from OASIS Core and action selection."""

    def __init__(self, closure_evaluator: FrontInteractionClosureEvaluator):
        self.closure_evaluator = closure_evaluator
        self._pending: Optional[PendingRelationProcess] = None

    def begin(self, execution: DecisionExecution) -> PendingRelationProcess:
        if self._pending is not None:
            raise EvaluatorInvariantError("a relation process is already pending evaluation")
        if execution.recorder.tau != execution.tau:
            raise EvaluatorInvariantError("decision recorder tau mismatch")
        if execution.realization_tau < execution.tau:
            raise EvaluatorInvariantError("realization time precedes decision")
        if not execution.realization_ref:
            raise EvaluatorInvariantError("realization reference is required")
        pending = PendingRelationProcess(
            entry_id=f"CE:{execution.observation.epoch}:{execution.tau}",
            execution=execution,
            realized_observation=execution.observation,
        )
        self._pending = pending
        return pending

    def observe_post(self, *, post_observation: PresentObservation, post_tau: float) -> EvaluatorRecord:
        pending = self._pending
        if pending is None:
            raise EvaluatorInvariantError("no realized relation process is pending")
        if float(post_tau) < pending.execution.realization_tau:
            raise EvaluatorInvariantError("post observation cannot precede actual realization")

        closure = self.closure_evaluator.evaluate(
            realized_observation=pending.realized_observation,
            post_observation=post_observation,
            selected_possibility_id=pending.execution.realization.selected_possibility_id,
        )
        if not closure.closed:
            return EvaluatorRecord(
                closed=False,
                history_entry=None,
                evidence={
                    "closure_method": closure.method,
                    "closure_evidence": dict(closure.evidence),
                    "post_tau": float(post_tau),
                },
            )

        history = pending.execution.recorder.complete_history_entry(
            entry_id=pending.entry_id,
            realized_tau=pending.execution.realization_tau,
            outcome_tau=float(post_tau),
            relation_end_tau=float(post_tau),
            selected_possibility_id=pending.execution.realization.selected_possibility_id,
            realization_ref=pending.execution.realization_ref,
            realization_count=1,
            outcome_description="realized relation process reached symbolic closure under post-realization observation",
            closure_method=closure.method,
            closure_evidence=closure.evidence,
        )
        self._pending = None
        return EvaluatorRecord(
            closed=True,
            history_entry=history,
            evidence={
                "closure_method": closure.method,
                "closure_evidence": dict(closure.evidence),
                "post_tau": float(post_tau),
            },
        )

    @property
    def has_pending_relation(self) -> bool:
        return self._pending is not None
