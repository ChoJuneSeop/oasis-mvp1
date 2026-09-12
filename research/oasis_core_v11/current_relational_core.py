from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping, Protocol, Sequence

from research.carla_v22_harness_v11.canonical_harness import (
    CoreEpochView,
    PresentObservation,
    Realization,
    VehicleActuation,
)
from research.g3_2_sidecar.common import RelationElementRef
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
                raise CoreV11InvariantError(f"additional responsibility {name} must be finite")


@dataclass(frozen=True)
class EpochEvaluation:
    observation: PresentObservation
    current_relations: tuple[CurrentRelation, ...]
    candidates: tuple[PossibilityCandidate, ...]
    contributions: tuple[BoundContribution, ...]
    possibility_distribution: Mapping[str, float]
    reconstructions: tuple[ReconstructionMeasurement, ...]
    responsibilities: Mapping[str, ResponsibilityVector]


class CurrentRelationBuilder(Protocol):
    def build(self, observation: PresentObservation) -> Sequence[CurrentRelation]:
        ...


class CandidateProvider(Protocol):
    def candidates(
        self,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
    ) -> Sequence[PossibilityCandidate]:
        ...


class RelationOperator(Protocol):
    def relate(
        self,
        *,
        current_relations: Sequence[CurrentRelation],
        past: PastRelationSemanticView,
        candidate_ids: Sequence[str],
    ) -> Sequence[RelationContribution]:
        """No age/timestamp argument is available by design."""
        ...


class ReconstructionOperator(Protocol):
    def reconstruct(
        self,
        *,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidates: Sequence[PossibilityCandidate],
        contributions: Sequence[BoundContribution],
    ) -> ReconstructionResult:
        ...


class ResponsibilityOperator(Protocol):
    def evaluate(
        self,
        *,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidate: PossibilityCandidate,
        contributions: Sequence[BoundContribution],
    ) -> ResponsibilityVector:
        ...


class ChoiceOperator(Protocol):
    def choose(
        self,
        *,
        observation: PresentObservation,
        candidates: Sequence[PossibilityCandidate],
        distribution: Mapping[str, float],
        responsibilities: Mapping[str, ResponsibilityVector],
        contributions: Sequence[BoundContribution],
    ) -> str:
        ...


class ActuationOperator(Protocol):
    def actuation(
        self,
        *,
        observation: PresentObservation,
        selected: PossibilityCandidate,
    ) -> VehicleActuation:
        ...


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
            source_key = f"past:{bound.source.experience_id}:{bound.source.relation_element_id}"
            evidence[pid].add(source_key)
        mass = {pid: float(len(tokens)) for pid, tokens in evidence.items()}
        total = sum(mass.values())
        if total <= 0.0:
            raise CoreV11InvariantError("current possibility distribution has no trace mass")
        return {pid: value / total for pid, value in mass.items()}


class CurrentRelationalCoreV11:
    """Current-formalization Core scaffold for G3.2.

    The Core owns history provenance and orchestration, while domain semantics remain
    explicit injected operators. Historical timestamps are retained in source records
    but are never supplied to the relation-participation operator.
    """

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
        self.relation_builder = relation_builder
        self.candidate_provider = candidate_provider
        self.relation_operator = relation_operator
        self.reconstruction_operator = reconstruction_operator
        self.responsibility_operator = responsibility_operator
        self.choice_operator = choice_operator
        self.actuation_operator = actuation_operator
        self._history: dict[RelationKey, HistoricalRelationRecord] = {}
        for record in history:
            self.add_history(record)
        self._last_evaluation: EpochEvaluation | None = None

    @staticmethod
    def _source_key(source: RelationElementRef) -> RelationKey:
        return (source.experience_id, source.relation_element_id)

    def add_history(self, record: HistoricalRelationRecord) -> None:
        self._history[self._source_key(record.source)] = record

    def history_records(self) -> tuple[HistoricalRelationRecord, ...]:
        # Stable order exists only for reproducible serialization; semantic operators
        # receive no age and must not infer recency from iteration order.
        return tuple(self._history[k] for k in sorted(self._history))

    def _evaluate(
        self,
        observation: PresentObservation,
        *,
        excluded: frozenset[RelationKey] = frozenset(),
    ) -> EpochEvaluation:
        current_relations = tuple(self.relation_builder.build(observation))
        relation_ids = [r.relation_id for r in current_relations]
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")

        candidates = tuple(self.candidate_provider.candidates(observation, current_relations))
        by_id = {c.possibility_id: c for c in candidates}
        if len(by_id) != len(candidates):
            raise CoreV11InvariantError("candidate possibility ids must be unique")

        bound: list[BoundContribution] = []
        candidate_ids = tuple(by_id)
        for record in self.history_records():
            source_key = self._source_key(record.source)
            if source_key in excluded:
                continue
            # Crucial: record.source.completed_at_tau is intentionally not supplied.
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
                    BoundContribution(
                        source=record.source,
                        semantic=record.semantic,
                        contribution=contribution,
                    )
                )

        reconstruction = self.reconstruction_operator.reconstruct(
            observation=observation,
            current_relations=current_relations,
            candidates=candidates,
            contributions=tuple(bound),
        )
        if reconstruction.additional_candidates:
            merged = list(candidates)
            for candidate in reconstruction.additional_candidates:
                if candidate.possibility_id in by_id:
                    raise CoreV11InvariantError("reconstruction emitted duplicate possibility id")
                # PossibilityCandidate itself requires present-current evidence.
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
                    x for x in bound if x.contribution.possibility_id == candidate.possibility_id
                ),
            )
            for candidate in candidates
        }

        return EpochEvaluation(
            observation=observation,
            current_relations=current_relations,
            candidates=candidates,
            contributions=tuple(bound),
            possibility_distribution=distribution,
            reconstructions=tuple(reconstruction.measurements),
            responsibilities=responsibilities,
        )

    @staticmethod
    def _relation_ref(record: HistoricalRelationRecord) -> RelationElementRef:
        return record.source

    def open_epoch(self, observation: PresentObservation) -> CoreEpochView:
        evaluation = self._evaluate(observation)
        self._last_evaluation = evaluation

        roles: dict[RelationKey, list[str]] = {}
        generated: dict[RelationKey, list[str]] = {}
        for bound in evaluation.contributions:
            key = self._source_key(bound.source)
            roles.setdefault(key, []).extend(bound.contribution.role_trace)
            generated.setdefault(key, []).extend(bound.contribution.generated_possibilities)

        def unique(values: Sequence[str]) -> tuple[str, ...]:
            return tuple(dict.fromkeys(str(x) for x in values if str(x)))

        return CoreEpochView(
            relation_elements=tuple(r.source for r in self.history_records()),
            possibility_distribution=evaluation.possibility_distribution,
            role_trace_by_relation={k: unique(v) for k, v in roles.items()},
            generated_by_relation={k: unique(v) for k, v in generated.items()},
            reconstructions=evaluation.reconstructions,
        )

    def ablate_relation(
        self,
        observation: PresentObservation,
        relation: RelationElementRef,
    ) -> Mapping[str, float]:
        return self._evaluate(
            observation,
            excluded=frozenset({self._source_key(relation)}),
        ).possibility_distribution

    def ablate_relation_group(
        self,
        observation: PresentObservation,
        relations: Sequence[RelationElementRef],
    ) -> Mapping[str, float]:
        return self._evaluate(
            observation,
            excluded=frozenset(self._source_key(r) for r in relations),
        ).possibility_distribution

    def realize(self, observation: PresentObservation) -> Realization:
        evaluation = self._last_evaluation
        if evaluation is None or evaluation.observation != observation:
            evaluation = self._evaluate(observation)
            self._last_evaluation = evaluation
        selected_id = self.choice_operator.choose(
            observation=observation,
            candidates=evaluation.candidates,
            distribution=evaluation.possibility_distribution,
            responsibilities=evaluation.responsibilities,
            contributions=evaluation.contributions,
        )
        by_id = {c.possibility_id: c for c in evaluation.candidates}
        if selected_id not in by_id:
            raise CoreV11InvariantError("choice operator returned a non-current possibility")
        selected = by_id[selected_id]
        return Realization(
            selected_possibility_id=selected_id,
            actuation=self.actuation_operator.actuation(
                observation=observation,
                selected=selected,
            ),
        )
