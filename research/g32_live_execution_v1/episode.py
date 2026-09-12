from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, replace
from typing import Optional

from research.carla_v22_harness_v11.canonical_harness import (
    DecisionExecution,
    PresentObservation,
)
from research.carla_v22_harness_v11.independent_evaluator_v1 import (
    EvaluatorRecord,
    IndependentEvaluatorV1,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


@dataclass(frozen=True)
class CompletedLiveEpisode:
    record: EvaluatorRecord
    decision_responsibility: dict


class FrontRelationEpisodeManager:
    """One front-relation episode spans simulator ticks, not one tick per experience.

    G3.2 live v1 intentionally limits Closure scope to the existing frozen
    front-interaction evaluator. A new decision episode is not opened while the
    currently realized front-relation process remains unresolved.
    """

    def __init__(self, closure_evaluator):
        self.evaluator = IndependentEvaluatorV1(closure_evaluator)
        self._responsibility: Optional[dict] = None

    @property
    def active(self) -> bool:
        return self.evaluator.has_pending_relation

    def can_begin(self, execution: DecisionExecution) -> bool:
        return bool(execution.observation.front_present)

    def begin(self, execution: DecisionExecution, *, decision_responsibility: dict) -> bool:
        if self.active:
            raise CoreV11InvariantError("a front relation episode is already active")
        if not self.can_begin(execution):
            return False
        self.evaluator.begin(execution)
        self._responsibility = deepcopy(decision_responsibility)
        return True

    def observe_post(
        self,
        *,
        post_observation: PresentObservation,
        post_tau: float,
    ) -> CompletedLiveEpisode | None:
        if not self.active:
            return None
        record = self.evaluator.observe_post(
            post_observation=post_observation,
            post_tau=float(post_tau),
        )
        if not record.closed:
            return None
        if self._responsibility is None:
            raise CoreV11InvariantError("closed live episode lost decision responsibility provenance")
        result = CompletedLiveEpisode(
            record=record,
            decision_responsibility=deepcopy(self._responsibility),
        )
        self._responsibility = None
        return result


def attach_unresolved_responsibility(entry, responsibility_record: dict):
    """Carry Omega beyond Completion without turning it into a fixed command."""
    context = responsibility_record.get("context", {})
    verification = context.get("verification", {})
    pending = []
    for item in verification.get("omega", ()):
        request = item.get("request", {})
        pending.append(
            "unverified:"
            + str(request.get("request_id", "unknown"))
            + ":"
            + str(request.get("question", ""))
            + ":"
            + str(item.get("reason", ""))
        )
    pending.extend(str(x) for x in verification.get("additional_unverified_scope", ()))
    evidence = deepcopy(dict(entry.closure_evidence))
    evidence["unresolved"] = tuple(dict.fromkeys(
        tuple(evidence.get("unresolved", ())) + tuple(pending)
    ))
    return replace(entry, closure_evidence=evidence)
