"""G3 responsibility/choice genealogy interface draft.

STATUS: DRAFT / NOT FROZEN / NOT INTEGRATED.

This module defines provenance containers only. It intentionally does not define:
- a universal OASIS choice formula,
- a scalar responsibility/risk score,
- fixed conflict classes,
- fixed participation roles,
- fixed deliberation thresholds.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping


class G3TraceInvariantError(ValueError):
    pass


def _tau(value: float) -> float:
    value = float(value)
    if not isfinite(value):
        raise G3TraceInvariantError("tau must be finite")
    return value


@dataclass(frozen=True)
class CurrentEvidenceAnchor:
    """Epoch-local current-reality evidence; never a permanent candidate attribute."""

    anchor_id: str
    relation_id: str
    descriptor: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.anchor_id or not self.relation_id:
            raise G3TraceInvariantError("current evidence anchor requires ids")


@dataclass(frozen=True)
class CandidateGroundingTrace:
    possibility_id: str
    observed_at_tau: float
    anchors: tuple[CurrentEvidenceAnchor, ...]
    derivation_trace: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau))
        if not self.possibility_id:
            raise G3TraceInvariantError("possibility_id is required")
        if not self.anchors:
            raise G3TraceInvariantError(
                "every realizable possibility requires at least one current-reality anchor"
            )


@dataclass(frozen=True)
class ResponsibilityDimensionTrace:
    """One current observation for a responsibility dimension.

    `value` is intentionally not interpreted here. Its method and evidence must travel
    with it so a domain cannot silently reuse a value under a different meaning.
    """

    name: str
    value: Any
    measurement_method: str
    evidence: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.name or not self.measurement_method:
            raise G3TraceInvariantError("responsibility dimension requires name and method")


@dataclass(frozen=True)
class ResponsibilityObservationTrace:
    possibility_id: str
    observed_at_tau: float
    uncertainty: ResponsibilityDimensionTrace
    impact: ResponsibilityDimensionTrace
    irreversibility: ResponsibilityDimensionTrace
    time_constraint: ResponsibilityDimensionTrace
    additional: tuple[ResponsibilityDimensionTrace, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau))
        if not self.possibility_id:
            raise G3TraceInvariantError("responsibility trace requires possibility_id")


@dataclass(frozen=True)
class DeliberationRequirementTrace:
    """A dynamically formed pre-realization responsibility requirement.

    No priority/risk score is stored. The descriptor is derived from the current
    relation/evidence context and may vary by domain and epoch.
    """

    requirement_id: str
    possibility_id: str
    observed_at_tau: float
    descriptor: Mapping[str, Any]
    basis: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau))
        if not self.requirement_id or not self.possibility_id:
            raise G3TraceInvariantError("deliberation requirement requires ids")
        if not self.descriptor:
            raise G3TraceInvariantError("deliberation requirement requires a descriptor")


@dataclass(frozen=True)
class DeliberationExecutionTrace:
    """What was actually executed for one required deliberation item."""

    requirement_id: str
    possibility_id: str
    observed_at_tau: float
    execution_trace: Mapping[str, Any]
    evidence: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau))
        if not self.requirement_id or not self.possibility_id:
            raise G3TraceInvariantError("deliberation execution requires ids")
        if not self.execution_trace:
            raise G3TraceInvariantError("executed deliberation requires a trace")


@dataclass(frozen=True)
class UnresolvedResponsibilityTrace:
    """A required responsibility relation not fully discharged before realization.

    This is structural provenance, not a debt/risk score.
    """

    requirement_id: str
    possibility_id: str
    observed_at_tau: float
    unresolved_trace: Mapping[str, Any]
    current_constraints: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "observed_at_tau", _tau(self.observed_at_tau))
        if not self.requirement_id or not self.possibility_id:
            raise G3TraceInvariantError("unresolved responsibility requires ids")
        if not self.unresolved_trace:
            raise G3TraceInvariantError("unresolved responsibility requires a trace")


@dataclass(frozen=True)
class ChoiceGenealogy:
    """Pre-realization genealogy for one epoch.

    Equal final actions do not imply equal ChoiceGenealogy.
    """

    observed_at_tau: float
    candidate_ids: tuple[str, ...]
    selected_possibility_id: str
    grounding: tuple[CandidateGroundingTrace, ...]
    responsibility: tuple[ResponsibilityObservationTrace, ...]
    required_deliberation: tuple[DeliberationRequirementTrace, ...]
    executed_deliberation: tuple[DeliberationExecutionTrace, ...]
    unresolved_responsibility: tuple[UnresolvedResponsibilityTrace, ...]
    possibility_distribution: Mapping[str, float]
    hard_constraint_trace: Mapping[str, Any] = field(default_factory=dict)
    selection_trace: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        tau = _tau(self.observed_at_tau)
        object.__setattr__(self, "observed_at_tau", tau)

        if not self.candidate_ids:
            raise G3TraceInvariantError("choice genealogy requires current candidates")
        if len(self.candidate_ids) != len(set(self.candidate_ids)):
            raise G3TraceInvariantError("candidate ids must be unique")
        if self.selected_possibility_id not in self.candidate_ids:
            raise G3TraceInvariantError("selected possibility must be a current candidate")

        grounded = {x.possibility_id for x in self.grounding}
        if grounded != set(self.candidate_ids):
            raise G3TraceInvariantError(
                "every current candidate must have exactly current-epoch grounding coverage"
            )

        responsibility_ids = {x.possibility_id for x in self.responsibility}
        if not responsibility_ids.issubset(set(self.candidate_ids)):
            raise G3TraceInvariantError("responsibility trace references non-current candidate")

        requirements = {x.requirement_id: x for x in self.required_deliberation}
        if len(requirements) != len(self.required_deliberation):
            raise G3TraceInvariantError("deliberation requirement ids must be unique")

        for item in (
            *self.grounding,
            *self.responsibility,
            *self.required_deliberation,
            *self.executed_deliberation,
            *self.unresolved_responsibility,
        ):
            if item.observed_at_tau != tau:
                raise G3TraceInvariantError("choice genealogy traces must align to one tau")

        for item in (*self.executed_deliberation, *self.unresolved_responsibility):
            req = requirements.get(item.requirement_id)
            if req is None:
                raise G3TraceInvariantError(
                    "executed/unresolved deliberation must reference a required item"
                )
            if req.possibility_id != item.possibility_id:
                raise G3TraceInvariantError("deliberation lineage changed candidate identity")
