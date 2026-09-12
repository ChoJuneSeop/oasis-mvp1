from __future__ import annotations

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


def _responsibility_vector(inputs, candidate_id: str):
    vector = inputs.evaluation.responsibilities[candidate_id]
    return (
        float(vector.uncertainty),
        float(vector.impact),
        float(vector.irreversibility),
        float(vector.time_constraint),
    )


def _demand_dominates(left, right):
    """Partial order only: U/I/V/T are never combined into a scalar risk score."""
    return all(x >= y for x, y in zip(left, right)) and any(
        x > y for x, y in zip(left, right)
    )


def _pareto_demand_layers(inputs):
    """Higher responsibility-demand frontiers receive deeper current verification."""
    remaining = {c.possibility_id for c in inputs.evaluation.candidates}
    layers = []
    while remaining:
        layer = []
        for candidate_id in sorted(remaining):
            current = _responsibility_vector(inputs, candidate_id)
            if not any(
                other != candidate_id
                and _demand_dominates(
                    _responsibility_vector(inputs, other),
                    current,
                )
                for other in remaining
            ):
                layer.append(candidate_id)
        if not layer:
            raise CoreV11InvariantError("responsibility demand frontier is empty")
        layers.append(tuple(layer))
        remaining.difference_update(layer)
    return tuple(layers)


class LiveCurrentAssessment:
    """Build current verification demands without a scalar responsibility score.

    Verification depth is relative to the current U/I/V/T Pareto partial order.
    A candidate on a strictly higher responsibility-demand layer receives greater
    declared verification depth. Incomparable candidates are not forcibly ranked.
    The depth unit is execution accounting, not a universal OASIS risk value.
    """

    def assess(self, *, inputs):
        by_id = {c.possibility_id: c for c in inputs.evaluation.candidates}
        layers = _pareto_demand_layers(inputs)
        layer_count = len(layers)
        requests, conditions = [], []

        for layer_index, layer in enumerate(layers):
            verification_depth = float(layer_count - layer_index)
            for candidate_id in layer:
                candidate = by_id[candidate_id]
                evidence_refs = tuple(candidate.current_evidence)
                request_id = f"verify-current:{candidate_id}"
                requests.append(
                    VerificationRequest(
                        request_id,
                        (candidate_id,),
                        f"Verify present premises for {candidate_id}",
                        verification_depth,
                        evidence_refs,
                    )
                )
                conditions.append(
                    CurrentCondition(
                        f"current-evidence-condition:{candidate_id}",
                        candidate_id,
                        (request_id,),
                        False,
                        "Candidate requires verified present-frame evidence.",
                        evidence_refs,
                    )
                )

        conflicts = []
        for index, contribution in enumerate(inputs.evaluation.contributions):
            refs = tuple(contribution.contribution.current_relation_ids)
            if refs:
                conflicts.append(
                    ConflictTrace(
                        f"current-past:{index}:{contribution.source.experience_id}:"
                        f"{contribution.source.relation_element_id}",
                        refs,
                        (contribution.source,),
                        "Past relation participates in the current possibility and is re-evaluated against the present relation.",
                        refs,
                        (),
                    )
                )
        return ResponsibilityAssessment(
            tuple(requests),
            tuple(conditions),
            tuple(conflicts),
            "Verification depth follows current Pareto layers over separate U/I/V/T components; incomparable vectors are not scalar-ranked.",
        )


class LiveCurrentVerifier:
    """Verify only the already frozen CurrentFrame supplied to the decision Core."""

    def verify(self, *, request, inputs, work_limit):
        if len(request.candidate_ids) != 1:
            raise CoreV11InvariantError(
                "one current candidate is required per verification request"
            )
        candidate_id = request.candidate_ids[0]
        candidate = next(
            (
                c
                for c in inputs.evaluation.candidates
                if c.possibility_id == candidate_id
            ),
            None,
        )
        if candidate is None or request.estimated_work > work_limit:
            raise CoreV11InvariantError(
                "invalid live verification request or allocation"
            )
        frame = inputs.frame
        frame.assert_current_evidence(request.evidence_refs)
        observation = frame.observation
        satisfied = set(candidate.current_evidence) <= set(request.evidence_refs)
        if candidate_id == "yield-space":
            satisfied = (
                satisfied
                and observation.front_present
                and "current:front-longitudinal" in candidate.current_evidence
            )
        elif candidate_id == "align-heading-negative":
            satisfied = satisfied and observation.local_heading_error_deg > 0.0
        elif candidate_id == "align-heading-positive":
            satisfied = satisfied and observation.local_heading_error_deg < 0.0
        elif candidate_id == "continue-flow":
            satisfied = (
                satisfied and "current:lane-heading" in candidate.current_evidence
            )
        return VerificationFinding(
            request.request_id,
            bool(satisfied),
            float(request.estimated_work),
            tuple(request.evidence_refs),
            "Verified only against the frozen current frame at the declared Pareto-derived depth.",
            frame.revision,
        )


class ParetoResponsibilityResourceAllocator:
    """Allocate verification capacity after current demands exist.

    `available_work=None` means the current environment permits the full demanded
    verification depth. A finite external capacity is a host execution constraint,
    not an OASIS semantic threshold; shortfalls remain explicit Omega.
    """

    def __init__(self, available_work=None):
        if available_work is not None and (
            not isfinite(float(available_work)) or float(available_work) < 0.0
        ):
            raise ValueError("available_work must be finite and non-negative")
        self.available_work = (
            None if available_work is None else float(available_work)
        )

    def allocate(self, *, inputs, assessment):
        del inputs
        required = float(
            sum(request.estimated_work for request in assessment.requests)
        )
        available = required if self.available_work is None else self.available_work
        allocated = min(required, available)
        unverified = (
            ()
            if allocated >= required
            else (
                "Current verification capacity is smaller than current Pareto-derived demand; unresolved requests remain Omega.",
            )
        )
        return ResourcePlan(
            required,
            available,
            allocated,
            WORK_UNIT,
            "Current verification depth was derived from the U/I/V/T Pareto partial order without scalar responsibility collapse.",
            unverified,
        )
