from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Mapping, Sequence


def _text(value: str, field: str) -> str:
    normalized = str(value).strip()
    if not normalized:
        raise ValueError(f"{field} must be non-empty")
    return normalized


def _refs(values: Sequence[str], field: str) -> tuple[str, ...]:
    normalized = tuple(_text(value, field) for value in values)
    if len(normalized) != len(set(normalized)):
        raise ValueError(f"{field} must not contain duplicates")
    return normalized


class ResearchAxis(str, Enum):
    """Paper-level validation coordinates; never runtime gap observations."""

    REALIZATION_AND_PAST_STRUCTURE_INCORPORATION = "research-axis-1"
    NEW_PAST_STRUCTURE_AND_SUBSEQUENT_REALITY_RELATION = "research-axis-2"
    RELATIONAL_REAPPEARANCE = "research-axis-3"
    RELATIONAL_PERSISTENCE_LIMIT = "research-axis-4"
    CHOICE = "research-axis-5-choice"
    RESPONSIBILITY = "research-axis-6-responsibility"


class RealityGapAxis(str, Enum):
    """Current-reality observations that may start possibility exploration."""

    RELATION = "reality-gap-relation"
    ROLE = "reality-gap-role"
    PROCESS = "reality-gap-process"
    POSSIBILITY_COVERAGE = "reality-gap-possibility-coverage"
    RESPONSIBILITY_COVERAGE = "reality-gap-responsibility-coverage"


class ResearchVerdict(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"
    NOT_TESTABLE = "NOT_TESTABLE"


class GapStatus(str, Enum):
    ABSENT = "ABSENT"
    PRESENT = "PRESENT"
    UNRESOLVED = "UNRESOLVED"
    CONFLICTING = "CONFLICTING"


@dataclass(frozen=True)
class ResearchAxisAssessment:
    """Evidence-backed experimental assessment of one of the paper's six axes."""

    axis: ResearchAxis
    verdict: ResearchVerdict
    evidence_refs: tuple[str, ...]
    rationale: str

    def __post_init__(self) -> None:
        if not isinstance(self.axis, ResearchAxis):
            raise TypeError("research assessment requires ResearchAxis, not RealityGapAxis")
        if not isinstance(self.verdict, ResearchVerdict):
            raise TypeError("research assessment requires ResearchVerdict")
        object.__setattr__(self, "evidence_refs", _refs(self.evidence_refs, "evidence_refs"))
        object.__setattr__(self, "rationale", _text(self.rationale, "rationale"))


@dataclass(frozen=True)
class RealityGapObservation:
    """One current-only gap observation; not a score, verdict, or choice."""

    observation_id: str
    axis: RealityGapAxis
    status: GapStatus
    current_relation_ids: tuple[str, ...]
    current_evidence_refs: tuple[str, ...]
    description: str
    observed_at_tau: float

    def __post_init__(self) -> None:
        if not isinstance(self.axis, RealityGapAxis):
            raise TypeError("gap observation requires RealityGapAxis, not ResearchAxis")
        if not isinstance(self.status, GapStatus):
            raise TypeError("gap observation requires GapStatus, not a research verdict")
        if not isinstance(self.observed_at_tau, (int, float)):
            raise TypeError("observed_at_tau must be numeric")
        object.__setattr__(self, "observation_id", _text(self.observation_id, "observation_id"))
        object.__setattr__(
            self, "current_relation_ids", _refs(self.current_relation_ids, "current_relation_ids")
        )
        object.__setattr__(
            self, "current_evidence_refs", _refs(self.current_evidence_refs, "current_evidence_refs")
        )
        object.__setattr__(self, "description", _text(self.description, "description"))
        object.__setattr__(self, "observed_at_tau", float(self.observed_at_tau))
        if self.status is not GapStatus.ABSENT and not self.current_evidence_refs:
            raise ValueError("an active or unresolved reality gap requires current evidence")

    @property
    def activates_exploration(self) -> bool:
        return self.status in {GapStatus.PRESENT, GapStatus.UNRESOLVED, GapStatus.CONFLICTING}


@dataclass(frozen=True)
class RealityGapSignature:
    """Non-scalar composition of distinct current-reality gap axes."""

    revision: str
    observed_at_tau: float
    observations: tuple[RealityGapObservation, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "revision", _text(self.revision, "revision"))
        object.__setattr__(self, "observed_at_tau", float(self.observed_at_tau))
        observations = tuple(self.observations)
        axes = tuple(item.axis for item in observations)
        if len(axes) != len(set(axes)):
            raise ValueError("a gap signature may contain at most one observation per gap axis")
        if any(item.observed_at_tau != self.observed_at_tau for item in observations):
            raise ValueError("all gap observations must belong to the same current-flow tau")
        object.__setattr__(self, "observations", observations)

    @property
    def active_observations(self) -> tuple[RealityGapObservation, ...]:
        return tuple(item for item in self.observations if item.activates_exploration)

    @property
    def has_gap(self) -> bool:
        return bool(self.active_observations)


@dataclass(frozen=True)
class MaintainCurrentFlow:
    """No gap occurred: recall, candidate generation, and reevaluation stay closed."""

    revision: str
    observed_at_tau: float
    reason: str = "no current reality gap; preserve current flow"
    recall_requested: bool = False
    candidate_generation_requested: bool = False
    reevaluation_requested: bool = False


@dataclass(frozen=True)
class RecallDirective:
    """Gap-bound request to look up relevant past relations; it is not re-entry."""

    directive_id: str
    revision: str
    observed_at_tau: float
    gap_observation_ids: tuple[str, ...]
    relation_query: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    permits_direct_probability_update: bool = False
    permits_direct_choice: bool = False
    constitutes_reentry: bool = False
    constitutes_reevaluation: bool = False


class GapTriggeredRecallGate:
    """Open recall only for an evidenced current gap, without selecting or reevaluating."""

    def evaluate(
        self,
        signature: RealityGapSignature,
        *,
        relation_terms_by_axis: Mapping[RealityGapAxis, Sequence[str]],
    ) -> MaintainCurrentFlow | RecallDirective:
        if not signature.has_gap:
            return MaintainCurrentFlow(signature.revision, signature.observed_at_tau)

        active = signature.active_observations
        terms = []
        evidence = []
        for observation in active:
            terms.extend(relation_terms_by_axis.get(observation.axis, ()))
            terms.extend(observation.current_relation_ids)
            evidence.extend(observation.current_evidence_refs)
        relation_query = tuple(dict.fromkeys(_text(item, "relation_query") for item in terms))
        if not relation_query:
            raise ValueError("an active reality gap must produce a relation-bound recall query")
        return RecallDirective(
            directive_id=f"recall:{signature.revision}",
            revision=signature.revision,
            observed_at_tau=signature.observed_at_tau,
            gap_observation_ids=tuple(item.observation_id for item in active),
            relation_query=relation_query,
            evidence_refs=tuple(dict.fromkeys(evidence)),
        )
