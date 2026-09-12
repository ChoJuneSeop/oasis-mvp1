from __future__ import annotations

"""Current-flow responsibility assessment and verification.

This module keeps U/I/V/T separate. Pareto layers are used only to order current
verification demand; they are not a scalar risk score or a permanent memory value.
Additional responsibility variables remain separately evidenced and each active
variable receives its own current-evidence verification request.
"""

from math import isfinite

from research.choice_responsibility_v01.integration import (
    ConflictTrace,
    CurrentCondition,
    ResponsibilityAssessment,
    VerificationFinding,
    VerificationRequest,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import ResourcePlan

WORK_UNIT = "current-evidence-verification-depth-unit"
ADDITIONAL_VARIABLE_WORK = 1.0


def _responsibility_vector(inputs, candidate_id: str) -> tuple[float, float, float, float]:
    vector = inputs.evaluation.responsibilities[candidate_id]
    return (
        float(vector.uncertainty),
        float(vector.impact),
        float(vector.irreversibility),
        float(vector.time_constraint),
    )


def _demand_dominates(left, right) -> bool:
    """Responsibility-demand partial order; no scalarization."""
    return all(x >= y for x, y in zip(left, right)) and any(
        x > y for x, y in zip(left, right)
    )


def pareto_demand_layers(inputs) -> tuple[tuple[str, ...], ...]:
    """Return current Pareto demand layers from higher to lower demand."""
    remaining = {c.possibility_id for c in inputs.evaluation.candidates}
    layers: list[tuple[str, ...]] = []
    while remaining:
        layer: list[str] = []
        for candidate_id in sorted(remaining):
            current = _responsibility_vector(inputs, candidate_id)
            if not any(
                other != candidate_id
                and _demand_dominates(_responsibility_vector(inputs, other), current)
                for other in remaining
            ):
                layer.append(candidate_id)
        if not layer:
            raise CoreV11InvariantError("responsibility demand frontier is empty")
        layers.append(tuple(layer))
        remaining.difference_update(layer)
    return tuple(layers)


class OrganicCurrentAssessment:
    """Build current verification demands after the current evaluation exists.

    Base U/I/V/T depth follows the current Pareto partial order. Dynamic additional
    variables are not folded into that four-axis ordering; each active variable creates
    an independent evidence-check request. The 1.0 work quantum is host accounting,
    not a semantic value of that responsibility variable.
    """

    def assess(self, *, inputs):
        by_id = {c.possibility_id: c for c in inputs.evaluation.candidates}
        layers = pareto_demand_layers(inputs)
        layer_count = len(layers)
        requests: list[VerificationRequest] = []
        conditions: list[CurrentCondition] = []

        for layer_index, layer in enumerate(layers):
            verification_depth = float(layer_count - layer_index)
            for candidate_id in layer:
                candidate = by_id[candidate_id]
                base_refs = tuple(candidate.current_evidence)
                base_request_id = f"verify-current:{candidate_id}"
                required_checks = [base_request_id]
                requests.append(
                    VerificationRequest(
                        base_request_id,
                        (candidate_id,),
                        f"Verify present premises for {candidate_id}",
                        verification_depth,
                        base_refs,
                    )
                )

                responsibility = inputs.evaluation.responsibilities[candidate_id]
                for name in sorted(responsibility.additional):
                    refs = responsibility.evidence.get(name)
                    if not isinstance(refs, (tuple, list)) or not refs:
                        raise CoreV11InvariantError(
                            f"dynamic responsibility variable {name!r} lacks named current evidence"
                        )
                    request_id = f"verify-current-additional:{candidate_id}:{name}"
                    requests.append(
                        VerificationRequest(
                            request_id,
                            (candidate_id,),
                            f"Verify current evidence for dynamic responsibility variable {name}",
                            ADDITIONAL_VARIABLE_WORK,
                            tuple(str(x) for x in refs),
                        )
                    )
                    required_checks.append(request_id)

                conditions.append(
                    CurrentCondition(
                        f"current-evidence-condition:{candidate_id}",
                        candidate_id,
                        tuple(required_checks),
                        False,
                        "Current execution requires the presently evidenced checks for this candidate.",
                        base_refs,
                    )
                )

        conflicts: list[ConflictTrace] = []
        for index, contribution in enumerate(inputs.evaluation.contributions):
            refs = tuple(contribution.contribution.current_relation_ids)
            if not refs:
                continue
            conflicts.append(
                ConflictTrace(
                    f"current-past:{index}:{contribution.source.experience_id}:"
                    f"{contribution.source.relation_element_id}",
                    refs,
                    (contribution.source,),
                    "A completed past relation participates in a current possibility and is re-evaluated against current relations.",
                    refs,
                    (),
                )
            )

        return ResponsibilityAssessment(
            tuple(requests),
            tuple(conditions),
            tuple(conflicts),
            "Base verification depth follows current Pareto layers over separate U/I/V/T components; active additional variables remain separate evidenced checks.",
        )


class OrganicCurrentVerifier:
    """Verify only the frozen CurrentFrame used by the current decision."""

    def verify(self, *, request, inputs, work_limit):
        if len(request.candidate_ids) != 1:
            raise CoreV11InvariantError("one current candidate is required per verification request")
        candidate_id = request.candidate_ids[0]
        candidate = next(
            (c for c in inputs.evaluation.candidates if c.possibility_id == candidate_id),
            None,
        )
        if candidate is None or request.estimated_work > work_limit:
            raise CoreV11InvariantError("invalid current verification request or allocation")

        frame = inputs.frame
        frame.assert_current_evidence(request.evidence_refs)
        observation = frame.observation
        satisfied = True

        if request.request_id.startswith("verify-current-additional:"):
            satisfied = bool(request.evidence_refs)
        elif candidate_id == "yield-space":
            satisfied = (
                observation.front_present
                and "current:front-longitudinal" in candidate.current_evidence
            )
        elif candidate_id == "align-heading-negative":
            satisfied = observation.local_heading_error_deg > 0.0
        elif candidate_id == "align-heading-positive":
            satisfied = observation.local_heading_error_deg < 0.0
        elif candidate_id == "continue-flow":
            satisfied = "current:lane-heading" in candidate.current_evidence
        else:
            satisfied = set(candidate.current_evidence) <= set(request.evidence_refs)

        return VerificationFinding(
            request.request_id,
            bool(satisfied),
            float(request.estimated_work),
            tuple(request.evidence_refs),
            "Checked only against registered evidence in the frozen current frame; this finding is not a global safety label.",
            frame.revision,
        )


class OrganicResponsibilityResourceAllocator:
    """Allocate actual verification capacity after current demand is constructed."""

    def __init__(self, available_work=None):
        if available_work is not None and (
            not isfinite(float(available_work)) or float(available_work) < 0.0
        ):
            raise ValueError("available_work must be finite and non-negative")
        self.available_work = None if available_work is None else float(available_work)

    def allocate(self, *, inputs, assessment):
        del inputs
        required = float(sum(request.estimated_work for request in assessment.requests))
        available = required if self.available_work is None else self.available_work
        allocated = min(required, available)
        unverified = (
            ()
            if allocated >= required
            else (
                "Current verification capacity is smaller than current evidenced responsibility demand; remaining scope stays unresolved Omega.",
            )
        )
        return ResourcePlan(
            required,
            available,
            allocated,
            WORK_UNIT,
            "Allocation occurs after current assessment; work units account execution depth and do not scalarize responsibility.",
            unverified,
        )
