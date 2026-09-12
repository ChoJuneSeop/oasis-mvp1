from __future__ import annotations

from copy import deepcopy
from math import isfinite
from typing import Mapping, Sequence

from research.carla_v22_harness_v11.canonical_harness import CoreEpochView, PresentObservation, Realization
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import (
    ActuationOperator, BoundContribution, CandidateProvider, ChoiceOperator,
    CoreV11InvariantError, CurrentRelationBuilder, EpochEvaluation,
    HistoricalRelationRecord, ReconstructionOperator, RelationKey,
    RelationOperator, ResponsibilityOperator,
)
from .contracts import CurrentFrame, HistoricalEnvelope
from research.oasis_core_v11.history_admission import _assert_semantic_context_has_no_recency_lockin

class CurrentRelationalCoreV12:
    """G3 supplementary implementation / G3 보완 구현, v1.2.

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
        history: Sequence[HistoricalEnvelope] = (),
    ) -> None:
        self.relation_builder = relation_builder
        self.candidate_provider = candidate_provider
        self.relation_operator = relation_operator
        self.reconstruction_operator = reconstruction_operator
        self.responsibility_operator = responsibility_operator
        self.choice_operator = choice_operator
        self.actuation_operator = actuation_operator
        self._history: dict[RelationKey, HistoricalEnvelope] = {}
        self._frame: CurrentFrame | None = None
        self._last_evaluation: EpochEvaluation | None = None
        for envelope in history:
            self.add_history(envelope)

    @staticmethod
    def _source_key(source: RelationElementRef) -> RelationKey:
        return (source.experience_id, source.relation_element_id)

    def add_history(self, envelope: HistoricalEnvelope) -> None:
        self.add_history_batch((envelope,))

    def add_history_batch(self, envelopes: Sequence[HistoricalEnvelope]) -> None:
        self._history = self.validate_history_batch(envelopes)
        self._last_evaluation = None

    def validate_history_batch(self, envelopes: Sequence[HistoricalEnvelope]):
        # Validate the complete batch before committing: no partial admission.
        staged = dict(self._history)
        occurrences = {x.occurrence_id: x for old in staged.values() for x in old.completion.occurrences}
        for envelope in deepcopy(tuple(envelopes)):
            _assert_semantic_context_has_no_recency_lockin(envelope.record)
            for occurrence in envelope.completion.occurrences:
                if occurrence.occurrence_id in occurrences and occurrences[occurrence.occurrence_id] != occurrence:
                    raise CoreV11InvariantError("shared occurrence identity has conflicting evidence")
                occurrences[occurrence.occurrence_id] = occurrence
            key = self._source_key(envelope.record.source)
            if key in staged and staged[key] != envelope:
                raise CoreV11InvariantError("history is append-only; use a new sourced correction")
            staged[key] = envelope
        return staged

    def history_envelopes(self) -> tuple[HistoricalEnvelope, ...]:
        return deepcopy(tuple(self._history[k] for k in sorted(self._history)))

    def history_records(self) -> tuple[HistoricalRelationRecord, ...]:
        if self._frame is None:
            raise CoreV11InvariantError("explicit current frame required; epoch is not a clock")
        return tuple(x.record for x in self.history_envelopes()
                     if x.known_at_tau <= self._frame.tau
                     and x.record.source.completed_at_tau <= self._frame.tau)

    def open_current_epoch(self, frame: CurrentFrame) -> CoreEpochView:
        self._frame = deepcopy(frame)
        self._last_evaluation = None
        return self.open_epoch(frame.observation)

    def _require_frame(self, observation: PresentObservation) -> CurrentFrame:
        if self._frame is None or self._frame.observation != observation:
            raise CoreV11InvariantError("observation is not bound to the current frame")
        return self._frame

    def _evaluate(
        self,
        observation: PresentObservation,
        *,
        excluded: frozenset[RelationKey] = frozenset(),
    ) -> EpochEvaluation:
        frame = self._require_frame(observation)
        current_relations = tuple(self.relation_builder.build(observation))
        relation_ids = [r.relation_id for r in current_relations]
        if len(relation_ids) != len(set(relation_ids)):
            raise CoreV11InvariantError("current relation ids must be unique")

        candidates = tuple(self.candidate_provider.candidates(observation, current_relations))
        by_id = {c.possibility_id: c for c in candidates}
        if len(by_id) != len(candidates):
            raise CoreV11InvariantError("candidate possibility ids must be unique")

        for candidate in candidates:
            frame.assert_current_evidence(candidate.current_evidence)
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
                if not set(contribution.current_relation_ids) <= set(relation_ids):
                    raise CoreV11InvariantError("participation references an absent current relation")
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
            tau=frame.tau,
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
                frame.assert_current_evidence(candidate.current_evidence)
                by_id[candidate.possibility_id] = candidate
                merged.append(candidate)
            candidates = tuple(merged)

        valid_sources = {self._source_key(r.source): r.source
                         for r in self.history_records()
                         if self._source_key(r.source) not in excluded}
        covered = set()
        for measurement in reconstruction.measurements:
            if measurement.possibility_id not in by_id or measurement.observed_at_tau != frame.tau:
                raise CoreV11InvariantError("reconstruction must describe a current candidate at current tau")
            keys = [self._source_key(link.source) for link in measurement.source_links]
            if len(keys) != len(set(keys)):
                raise CoreV11InvariantError("duplicate reconstruction source")
            for link in measurement.source_links:
                if valid_sources.get(self._source_key(link.source)) != link.source:
                    raise CoreV11InvariantError("reconstruction source is unknown, excluded or altered")
            if not measurement.source_links:
                raise CoreV11InvariantError("historical reconstruction needs source provenance")
            covered.add(measurement.possibility_id)
        if not {c.possibility_id for c in reconstruction.additional_candidates} <= covered:
            raise CoreV11InvariantError("new reconstructed candidates require sourced measurements")
        for contribution in bound:
            if not set(contribution.contribution.generated_possibilities) <= set(by_id):
                raise CoreV11InvariantError("generation trace references absent possibilities")

        distribution = self._distribution(candidates, bound, reconstruction.measurements)
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

        for vector in responsibilities.values():
            for name in vector.additional:
                if name not in vector.evidence or not vector.evidence[name]:
                    raise CoreV11InvariantError("additional responsibility variable needs named current evidence")
                refs = vector.evidence[name]
                if not isinstance(refs, (tuple, list)):
                    raise CoreV11InvariantError("named responsibility evidence must contain current evidence references")
                frame.assert_current_evidence(refs)

        return EpochEvaluation(
            tau=frame.tau,
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
        self._last_evaluation = deepcopy(evaluation)

        roles: dict[RelationKey, list[str]] = {}
        generated: dict[RelationKey, list[str]] = {}
        for bound in evaluation.contributions:
            key = self._source_key(bound.source)
            roles.setdefault(key, []).extend(bound.contribution.role_trace)
            generated.setdefault(key, []).extend(bound.contribution.generated_possibilities)

        for measurement in evaluation.reconstructions:
            for link in measurement.source_links:
                key = self._source_key(link.source)
                roles.setdefault(key, []).extend(link.participation_roles)
                generated.setdefault(key, []).extend(link.generated_possibilities)

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
        self._require_frame(observation)
        evaluation = self._last_evaluation
        if evaluation is None or evaluation.observation != observation:
            evaluation = self._evaluate(observation)
            self._last_evaluation = evaluation
        evaluation = deepcopy(evaluation)
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

    def _distribution(self, candidates, contributions, measurements):
        """Trace incidence / 경로 수 정규화: reference observation, not calibrated probability.

        Overlapping completed experiences share occurrence tokens. More trace count
        is not asserted to mean a better, safer or more likely real-world choice.
        """
        tokens = {c.possibility_id: {("current", x) for x in c.current_evidence}
                  for c in candidates}
        def origins(source):
            envelope = self._history[self._source_key(source)]
            return {("past", x) for x in envelope.occurrence_refs}
        for bound in contributions:
            tokens[bound.contribution.possibility_id].update(origins(bound.source))
        for measurement in measurements:
            for link in measurement.source_links:
                tokens[measurement.possibility_id].update(origins(link.source))
        mass = {key: float(len(value)) for key, value in tokens.items()}
        total = sum(mass.values())
        if total <= 0 or not isfinite(total):
            raise CoreV11InvariantError("no constructed possibilities; no realization or terminal claim")
        return {key: value / total for key, value in mass.items()}
