from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping, Protocol, Sequence

from research.carla_v22_harness_v11.canonical_harness import (
    CoreEpochView,
    PresentObservation,
    Realization,
    VehicleActuation,
)
from research.g3_2_sidecar.common import RelationElementRef, require_tau
from research.g3_2_sidecar.reconstruction import ReconstructionMeasurement


class CoreV11InvariantError(RuntimeError):
    pass


RelationKey = tuple[str, str]


@dataclass(frozen=True)
class CurrentRelation:
    relation_id: str
    subject_role: str
    object_role: str
    relation_type: str
    relation_state: str
    process_context: tuple[str, ...] = ()
    environment_context: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class PastRelationSemanticView:
    """Semantic view deliberately excludes age/completed_at_tau and raw actor identity."""

    subject_role: str
    object_role: str
    relation_type: str
    relation_state: str
    process_context: tuple[str, ...] = ()
    environment_context: Mapping[str, Any] = field(default_factory=dict)
    historical_roles: tuple[str, ...] = ()
    possibility_links: tuple[str, ...] = ()


@dataclass(frozen=True)
class HistoricalRelationRecord:
    source: RelationElementRef
    semantic: PastRelationSemanticView


@dataclass(frozen=True)
class PossibilityCandidate:
    possibility_id: str
    current_evidence: tuple[str, ...]
    domain_payload: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.possibility_id:
            raise CoreV11InvariantError("possibility_id is required")
        if not self.current_evidence:
            raise CoreV11InvariantError(
                "every current possibility must be anchored by current-reality evidence"
            )


@dataclass(frozen=True)
class RelationContribution:
    possibility_id: str
    current_relation_ids: tuple[str, ...]
    role_trace: tuple[str, ...]
    generated_possibilities: tuple[str, ...] = ()
    trace: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.possibility_id:
            raise CoreV11InvariantError("relation contribution requires a possibility")
        if not self.current_relation_ids:
            raise CoreV11InvariantError(
                "past relation cannot participate without an explicit current-relation anchor"
            )


@dataclass(frozen=True)
class BoundContribution:
    source: RelationElementRef
    semantic: PastRelationSemanticView
    contribution: RelationContribution


@dataclass(frozen=True)
class ReconstructionResult:
    additional_candidates: tuple[PossibilityCandidate, ...] = ()
    measurements: tuple[ReconstructionMeasurement, ...] = ()


@dataclass(frozen=True)
class ResponsibilityVector:
    uncertainty: float
    impact: float
    irreversibility: float
    time_constraint: float
    additional: Mapping[str, float] = field(default_factory=dict)
    evidence: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for name, value in (
            ("uncertainty", self.uncertainty),
            ("impact", self.impact),
            ("irreversibility", self.irreversibility),
            ("time_constraint", self.time_constraint),
        ):
            if not isfinite(float(value)):
                raise CoreV11InvariantError(f"responsibility {name} must be finite")
        for name, value in self.additional.items():
            if not isfinite(float(value)):
                raise CoreV11InvariantError(
                    f"additional responsibility {name} must be finite"
                )


@dataclass(frozen=True)
class EpochEvaluation:
    tau: float
    observation: PresentObservation
    current_relations: tuple[CurrentRelation, ...]
    candidates: tuple[PossibilityCandidate, ...]
    contributions: tuple[BoundContribution, ...]
    possibility_distribution: Mapping[str, float]
    reconstructions: tuple[ReconstructionMeasurement, ...]
    responsibilities: Mapping[str, ResponsibilityVector]

    def __post_init__(self) -> None:
        object.__setattr__(self, "tau", require_tau("tau", self.tau))


class CurrentRelationBuilder(Protocol):
    def build(self, observation: PresentObservation) -> Sequence[CurrentRelation]: ...


class CandidateProvider(Protocol):
    def candidates(
        self,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
    ) -> Sequence[PossibilityCandidate]: ...


class RelationOperator(Protocol):
    def relate(
        self,
        *,
        current_relations: Sequence[CurrentRelation],
        past: PastRelationSemanticView,
        candidate_ids: Sequence[str],
    ) -> Sequence[RelationContribution]:
        """No age/timestamp/current-tau argument is available by design."""
        ...


class ReconstructionOperator(Protocol):
    def reconstruct(
        self,
        *,
        tau: float,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidates: Sequence[PossibilityCandidate],
        contributions: Sequence[BoundContribution],
    ) -> ReconstructionResult: ...


class ResponsibilityOperator(Protocol):
    def evaluate(
        self,
        *,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidate: PossibilityCandidate,
        contributions: Sequence[BoundContribution],
    ) -> ResponsibilityVector: ...


class ChoiceOperator(Protocol):
    def choose(
        self,
        *,
        observation: PresentObservation,
        candidates: Sequence[PossibilityCandidate],
        distribution: Mapping[str, float],
        responsibilities: Mapping[str, ResponsibilityVector],
        contributions: Sequence[BoundContribution],
    ) -> str: ...


class ActuationOperator(Protocol):
    def actuation(
        self, *, observation: PresentObservation, selected: PossibilityCandidate
    ) -> VehicleActuation: ...


class ParticipatingExperienceLike(Protocol):
    experience_id: str
    provenance_ref: str
    completed_tau: float
    content: Mapping[str, Any]


class ParticipatingViewLike(Protocol):
    items: Sequence[ParticipatingExperienceLike]


class TraceIncidenceDistribution:
    """Reference P_t(c) operationalization for G3.2 measurement only.

    Mass is derived from current evidence and unique participating relation elements in
    the current epoch. It is recomputed from scratch after every ablation. It is not a
    permanent memory score, recency weight, quality score, or universal OASIS formula.
    """

    @staticmethod
    def build(
        candidates: Sequence[PossibilityCandidate],
        contributions: Sequence[BoundContribution],
    ) -> dict[str, float]:
        evidence: dict[str, set[str]] = {
            c.possibility_id: {f"current:{x}" for x in c.current_evidence}
            for c in candidates
        }
        valid = set(evidence)
        for bound in contributions:
            pid = bound.contribution.possibility_id
            if pid not in valid:
                continue
            evidence[pid].add(
                f"past:{bound.source.experience_id}:{bound.source.relation_element_id}"
            )
        mass = {pid: float(len(tokens)) for pid, tokens in evidence.items()}
        total = sum(mass.values())
        if total <= 0.0:
            raise CoreV11InvariantError(
                "current possibility distribution has no trace mass"
            )
        return {pid: value / total for pid, value in mass.items()}


class CurrentRelationalCoreV11:
    """Current relational Core with an externally governed experience boundary.

    The Core never owns an archive. For a governance epoch it receives only the
    already-filtered participating view, derives immutable relation records for that
    epoch, and discards those records after realization. The Governance-selected
    candidate is bound through ``realize_selected`` and cannot be replaced by the
    compatibility choice operator on that path.
    """

    experimental_contract = {
        "history_port_only": True,
        "present_only": True,
        "no_future": True,
        "pure_probes": True,
        "single_realization": True,
        "closure": True,
        "atomic_capture": True,
    }
    real_core_admission_profile = "GH1_CORE_ADMISSION_V1"

    def __init__(
        self,
        *,
        relation_builder: CurrentRelationBuilder,
        candidate_provider: CandidateProvider,
        relation_operator: RelationOperator,
        reconstruction_operator: ReconstructionOperator,
        responsibility_operator: ResponsibilityOperator,
        choice_operator: ChoiceOperator,
        actuation_operator: ActuationOperator,
        history: Sequence[HistoricalRelationRecord] = (),
    ) -> None:
        if history:
            raise CoreV11InvariantError(
                "direct historical injection is removed; pass only the current participating view"
            )
        self.relation_builder = relation_builder
        self.candidate_provider = candidate_provider
        self.relation_operator = relation_operator
        self.reconstruction_operator = reconstruction_operator
        self.responsibility_operator = responsibility_operator
        self.choice_operator = choice_operator
        self.actuation_operator = actuation_operator
        self._last_evaluation: EpochEvaluation | None = None
        self._epoch_records: tuple[HistoricalRelationRecord, ...] = ()

    @staticmethod
    def _source_key(source: RelationElementRef) -> RelationKey:
        return (source.experience_id, source.relation_element_id)

    def _clear_epoch(self) -> None:
        self._last_evaluation = None
        self._epoch_records = ()

    def _records_from_view(
        self,
        participating_view: ParticipatingViewLike | None,
        *,
        tau: float,
    ) -> tuple[HistoricalRelationRecord, ...]:
        if participating_view is None:
            return ()
        items = tuple(getattr(participating_view, "items", ()))
        records: list[HistoricalRelationRecord] = []
        seen: set[RelationKey] = set()
        for experience in items:
            experience_id = str(getattr(experience, "experience_id", ""))
            provenance_ref = str(getattr(experience, "provenance_ref", ""))
            completed_tau = float(getattr(experience, "completed_tau", float("nan")))
            content = getattr(experience, "content", None)
            if not experience_id or not provenance_ref or not isfinite(completed_tau):
                raise CoreV11InvariantError(
                    "participating experience lacks valid identity/provenance/completion time"
                )
            if completed_tau >= tau:
                raise CoreV11InvariantError(
                    "future completed experience cannot participate in the current epoch"
                )
            if not isinstance(content, Mapping):
                raise CoreV11InvariantError(
                    "participating experience content must be a data mapping"
                )
            raw_records = content.get("relation_records", ())
            if raw_records is None:
                raw_records = ()
            if not isinstance(raw_records, (tuple, list)):
                raise CoreV11InvariantError(
                    "relation_records must be a finite sequence of HistoricalRelationRecord values"
                )
            for record in raw_records:
                if not isinstance(record, HistoricalRelationRecord):
                    raise CoreV11InvariantError(
                        "participating experience emitted an invalid relation record"
                    )
                source = record.source
                if source.experience_id != experience_id:
                    raise CoreV11InvariantError(
                        "participating relation lineage does not match experience identity"
                    )
                if float(source.completed_at_tau) != completed_tau:
                    raise CoreV11InvariantError(
                        "participating relation completion time does not match experience closure"
                    )
                key = self._source_key(source)
                if key in seen:
                    raise CoreV11InvariantError(
                        "duplicate participating relation element in one epoch"
                    )
                seen.add(key)
                records.append(deepcopy(record))
        return tuple(records)

    def _evaluate(
        self,
        observation: PresentObservation,
        *,
        tau: float,
        records: Sequence[HistoricalRelationRecord],
        excluded: frozenset[RelationKey] = frozenset(),
    ) -> EpochEvaluation:
        tau = require_tau("tau", tau)
        current_relations = tuple(self.relation_builder.build(observation))
        relation_ids = [r.relation_id for r in current_relations]
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")

        candidates = tuple(
            self.candidate_provider.candidates(observation, current_relations)
        )
        by_id = {c.possibility_id: c for c in candidates}
        if len(by_id) != len(candidates):
            raise CoreV11InvariantError("candidate possibility ids must be unique")

        bound: list[BoundContribution] = []
        candidate_ids = tuple(by_id)
        for record in records:
            if record.source.completed_at_tau >= tau:
                raise CoreV11InvariantError(
                    "future relation is present in the current participating view"
                )
            source_key = self._source_key(record.source)
            if source_key in excluded:
                continue
            contributions = self.relation_operator.relate(
                current_relations=current_relations,
                past=record.semantic,
                candidate_ids=candidate_ids,
            )
            for contribution in contributions:
                if contribution.possibility_id not in by_id:
                    raise CoreV11InvariantError(
                        "relation operator cannot resurrect an action absent from current candidates; "
                        "new possibilities must be emitted by the reconstruction operator with current evidence"
                    )
                bound.append(
                    BoundContribution(record.source, record.semantic, contribution)
                )

        reconstruction = self.reconstruction_operator.reconstruct(
            tau=tau,
            observation=observation,
            current_relations=current_relations,
            candidates=candidates,
            contributions=tuple(bound),
        )
        for measurement in reconstruction.measurements:
            if float(measurement.observed_at_tau) != tau:
                raise CoreV11InvariantError(
                    "reconstruction measurement must use authoritative current flow tau"
                )

        if reconstruction.additional_candidates:
            merged = list(candidates)
            for candidate in reconstruction.additional_candidates:
                if candidate.possibility_id in by_id:
                    raise CoreV11InvariantError(
                        "reconstruction emitted duplicate possibility id"
                    )
                by_id[candidate.possibility_id] = candidate
                merged.append(candidate)
            candidates = tuple(merged)

        distribution = TraceIncidenceDistribution.build(candidates, bound)
        responsibilities = {
            candidate.possibility_id: self.responsibility_operator.evaluate(
                observation=observation,
                current_relations=current_relations,
                candidate=candidate,
                contributions=tuple(
                    x
                    for x in bound
                    if x.contribution.possibility_id == candidate.possibility_id
                ),
            )
            for candidate in candidates
        }

        return EpochEvaluation(
            tau=tau,
            observation=observation,
            current_relations=current_relations,
            candidates=candidates,
            contributions=tuple(bound),
            possibility_distribution=distribution,
            reconstructions=tuple(reconstruction.measurements),
            responsibilities=responsibilities,
        )

    def open_epoch(
        self,
        observation: PresentObservation,
        tau: float,
        participating_view: ParticipatingViewLike | None = None,
    ) -> CoreEpochView:
        tau = require_tau("tau", tau)
        self._clear_epoch()
        records = self._records_from_view(participating_view, tau=tau)
        evaluation = self._evaluate(
            observation,
            tau=tau,
            records=records,
        )
        self._epoch_records = records
        self._last_evaluation = evaluation

        roles: dict[RelationKey, list[str]] = {}
        generated: dict[RelationKey, list[str]] = {}
        for bound in evaluation.contributions:
            key = self._source_key(bound.source)
            roles.setdefault(key, []).extend(bound.contribution.role_trace)
            generated.setdefault(key, []).extend(
                bound.contribution.generated_possibilities
            )

        def unique(values: Sequence[str]) -> tuple[str, ...]:
            return tuple(dict.fromkeys(str(x) for x in values if str(x)))

        return CoreEpochView(
            relation_elements=tuple(r.source for r in records),
            possibility_distribution=evaluation.possibility_distribution,
            role_trace_by_relation={k: unique(v) for k, v in roles.items()},
            generated_by_relation={k: unique(v) for k, v in generated.items()},
            reconstructions=evaluation.reconstructions,
        )

    def ablate_relation(
        self,
        observation: PresentObservation,
        relation: RelationElementRef,
        tau: float,
    ) -> Mapping[str, float]:
        if self._last_evaluation is None:
            raise CoreV11InvariantError("ablation requires an open epoch")
        return self._evaluate(
            observation,
            tau=tau,
            records=self._epoch_records,
            excluded=frozenset({self._source_key(relation)}),
        ).possibility_distribution

    def ablate_relation_group(
        self,
        observation: PresentObservation,
        relations: Sequence[RelationElementRef],
        tau: float,
    ) -> Mapping[str, float]:
        if self._last_evaluation is None:
            raise CoreV11InvariantError("ablation requires an open epoch")
        return self._evaluate(
            observation,
            tau=tau,
            records=self._epoch_records,
            excluded=frozenset(self._source_key(r) for r in relations),
        ).possibility_distribution

    def realize_selected(
        self,
        observation: PresentObservation,
        tau: float,
        selected_possibility_id: str,
    ) -> Realization:
        tau = require_tau("tau", tau)
        evaluation = self._last_evaluation
        if (
            evaluation is None
            or evaluation.observation != observation
            or evaluation.tau != tau
        ):
            raise CoreV11InvariantError(
                "realize_selected requires the matching currently open epoch"
            )
        by_id = {c.possibility_id: c for c in evaluation.candidates}
        if selected_possibility_id not in by_id:
            raise CoreV11InvariantError(
                "Governance selected a possibility absent from the current epoch"
            )
        selected = by_id[selected_possibility_id]
        try:
            actuation = self.actuation_operator.actuation(
                observation=observation,
                selected=selected,
            )
            return Realization(
                selected_possibility_id=selected_possibility_id,
                actuation=actuation,
            )
        finally:
            self._clear_epoch()

    def realize(self, observation: PresentObservation, tau: float) -> Realization:
        """Compatibility path outside GH-1; Governance evidence must not use this method."""

        tau = require_tau("tau", tau)
        evaluation = self._last_evaluation
        if (
            evaluation is None
            or evaluation.observation != observation
            or evaluation.tau != tau
        ):
            raise CoreV11InvariantError("realize requires the matching open epoch")
        selected_id = self.choice_operator.choose(
            observation=observation,
            candidates=evaluation.candidates,
            distribution=evaluation.possibility_distribution,
            responsibilities=evaluation.responsibilities,
            contributions=evaluation.contributions,
        )
        return self.realize_selected(observation, tau, selected_id)
