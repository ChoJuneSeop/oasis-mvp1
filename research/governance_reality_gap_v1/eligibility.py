from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

from research.oasis_core_v12.contracts import HistoricalEnvelope

from .contracts import RecallDirective


@dataclass(frozen=True)
class RetrievedExperience:
    source_key: tuple[str, str]
    relation_element_id: str
    retrieval_reason: str


@dataclass(frozen=True)
class RelationEligibilityAssessment:
    source_key: tuple[str, str]
    eligible: bool
    reason: str


@dataclass(frozen=True)
class ReentryAuthorization:
    """Eligibility output only; it neither reevaluates nor changes a possibility."""

    revision: str
    observed_at_tau: float
    directive_id: str
    authorized_source_keys: tuple[tuple[str, str], ...]
    assessments: tuple[RelationEligibilityAssessment, ...]
    constitutes_reevaluation: bool = False
    permits_direct_probability_update: bool = False
    permits_direct_choice: bool = False


class BroadRecallRetriever:
    """Recall candidates broadly, leaving provenance eligibility to a later gate.

    A synthetic surface family is the portion before ``::``.  This deliberately
    permits a surface-similar negative control to be retrieved without making it
    eligible for re-entry.
    """

    @staticmethod
    def _surface(value: str) -> str:
        return str(value).split("::", 1)[0]

    def retrieve(
        self,
        directive: RecallDirective,
        envelopes: Iterable[HistoricalEnvelope],
    ) -> tuple[RetrievedExperience, ...]:
        query_surfaces = {self._surface(item) for item in directive.relation_query}
        found = []
        for envelope in envelopes:
            source = envelope.record.source
            relation_id = str(source.relation_element_id)
            if self._surface(relation_id) in query_surfaces:
                found.append(
                    RetrievedExperience(
                        (str(source.experience_id), relation_id),
                        relation_id,
                        "surface-family matched recall query",
                    )
                )
        return tuple(found)


class ProvenanceRelationEligibilityGate:
    """Authorize only exact, current-evidence-bound relation provenance."""

    def assess(
        self,
        directive: RecallDirective,
        retrieved: Sequence[RetrievedExperience],
    ) -> ReentryAuthorization:
        exact_query = frozenset(str(item) for item in directive.relation_query)
        assessments = tuple(
            RelationEligibilityAssessment(
                item.source_key,
                item.relation_element_id in exact_query,
                (
                    "exact relation provenance matches current gap evidence"
                    if item.relation_element_id in exact_query
                    else "surface similarity lacks exact current relation provenance"
                ),
            )
            for item in retrieved
        )
        return ReentryAuthorization(
            revision=directive.revision,
            observed_at_tau=directive.observed_at_tau,
            directive_id=directive.directive_id,
            authorized_source_keys=tuple(
                item.source_key
                for item, assessment in zip(retrieved, assessments)
                if assessment.eligible
            ),
            assessments=assessments,
        )
