from __future__ import annotations

"""Relation-episode Closure and provenance-preserving history admission."""

from copy import deepcopy
from dataclasses import dataclass, replace

from research.carla_v22_harness_v11.independent_evaluator_v1 import (
    EvaluatorRecord,
    IndependentEvaluatorV1,
)
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11.carla_relational_domain import ClosedCARLARelationExtractor
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import ObservedOccurrence
from research.oasis_core_v12.history_admission import HistoryAdmissionBridgeV12


@dataclass(frozen=True)
class CompletedOrganicEpisode:
    record: EvaluatorRecord
    decision_responsibility: dict


@dataclass
class _PendingDecisionRelation:
    evaluator: IndependentEvaluatorV1
    decision_responsibility: dict


class FrontRelationEpisodeManager:
    """Decision Epochs remain distinct from the continuing front Relation Episode."""

    def __init__(self, closure_evaluator):
        self.closure_evaluator = closure_evaluator
        self._pending: list[_PendingDecisionRelation] = []

    @property
    def active(self) -> bool:
        return bool(self._pending)

    @property
    def pending_count(self) -> int:
        return len(self._pending)

    def begin(self, decision_result) -> bool:
        execution = decision_result.execution
        if execution is None or decision_result.application_receipt.applied is not True:
            return False
        if not execution.observation.front_present:
            return False
        evaluator = IndependentEvaluatorV1(self.closure_evaluator)
        evaluator.begin(execution)
        self._pending.append(
            _PendingDecisionRelation(
                evaluator=evaluator,
                decision_responsibility=deepcopy(decision_result.responsibility_record),
            )
        )
        return True

    def observe_post(self, *, post_observation, post_tau: float):
        if not self._pending:
            return ()
        completed: list[CompletedOrganicEpisode] = []
        remaining: list[_PendingDecisionRelation] = []
        for pending in self._pending:
            record = pending.evaluator.observe_post(
                post_observation=post_observation, post_tau=float(post_tau)
            )
            if record.closed:
                if record.history_entry is None:
                    raise CoreV11InvariantError(
                        "closed relation process lacks its realized HistoryEntry"
                    )
                completed.append(
                    CompletedOrganicEpisode(
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

    def observation_horizon_snapshot(self) -> dict:
        """Report right-censoring without inventing a Closure event."""
        return {
            "pending_relation_processes": len(self._pending),
            "forced_closure": False,
            "interpretation": "Observation horizon ended while these relation processes remained open; no timeout/frame threshold was applied.",
        }


@dataclass(frozen=True)
class OrganicAdmissionRecord:
    experience_id: str
    known_at_tau: float
    occurrence: ObservedOccurrence
    unresolved: tuple[str, ...]
    admitted_relation_keys: tuple[tuple[str, str], ...]


def unresolved_from_responsibility(record: dict) -> tuple[str, ...]:
    context = record.get("context", {})
    verification = context.get("verification", {})
    pending: list[str] = []
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
    pending.extend(
        str(x) for x in verification.get("additional_unverified_scope", ())
    )
    return tuple(dict.fromkeys(pending))


class OrganicHistoryCommitter:
    """Admit only actually realized, independently evaluated, closed processes."""

    def __init__(self, *, core, archive):
        self.core = core
        self.archive = archive
        self.extractor = ClosedCARLARelationExtractor()
        self.bridge = HistoryAdmissionBridgeV12(core, self.extractor, archive)

    def admit(
        self,
        completed_episode: CompletedOrganicEpisode,
        *,
        known_at_tau: float | None = None,
    ) -> OrganicAdmissionRecord:
        record = completed_episode.record
        entry: HistoryEntry | None = record.history_entry
        if not record.closed or entry is None:
            raise CoreV11InvariantError(
                "only an independently evaluated, closed, realized relation process may enter history"
            )

        known = float(entry.relation_end_tau if known_at_tau is None else known_at_tau)
        if known < float(entry.relation_end_tau):
            raise CoreV11InvariantError(
                "history knowledge time cannot precede relation-process Closure"
            )

        responsibility = deepcopy(completed_episode.decision_responsibility)
        unresolved = unresolved_from_responsibility(responsibility)
        occurrence = ObservedOccurrence(
            occurrence_id=f"{entry.entry_id}:closure",
            occurred_at_tau=float(entry.relation_end_tau),
            received_at_tau=known,
            description="Independent evaluator observed the realized relation-process boundary.",
            source_ref="independent-evaluator-v1",
        )

        evidence = deepcopy(dict(entry.closure_evidence))
        closed_relations = evidence.get("closed_relations")
        if not isinstance(closed_relations, (tuple, list)) or not closed_relations:
            raise CoreV11InvariantError(
                "Closure lacks evaluator-certified closed_relations"
            )
        evidence["occurrence_refs"] = (occurrence.occurrence_id,)
        evidence["unresolved"] = tuple(
            dict.fromkeys(tuple(evidence.get("unresolved", ())) + unresolved)
        )
        evidence["decision_responsibility_provenance"] = responsibility
        augmented = replace(entry, closure_evidence=evidence)

        relation_occurrence_refs = {}
        for item in closed_relations:
            relation_id = str(item.get("relation_element_id", "")).strip()
            if not relation_id:
                raise CoreV11InvariantError("closed relation lacks relation_element_id")
            relation_occurrence_refs[relation_id] = (occurrence.occurrence_id,)

        envelopes = self.bridge.admit(
            augmented,
            known_at_tau=known,
            occurrences=(occurrence,),
            relation_occurrence_refs=relation_occurrence_refs,
        )
        keys = tuple(
            (
                envelope.record.source.experience_id,
                envelope.record.source.relation_element_id,
            )
            for envelope in envelopes
        )
        return OrganicAdmissionRecord(
            experience_id=entry.entry_id,
            known_at_tau=known,
            occurrence=occurrence,
            unresolved=tuple(evidence["unresolved"]),
            admitted_relation_keys=keys,
        )
