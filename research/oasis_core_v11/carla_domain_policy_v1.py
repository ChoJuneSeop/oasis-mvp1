from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Mapping, Sequence

from research.carla_v22_harness_v11.canonical_harness import PresentObservation, VehicleActuation
from research.g3_2_sidecar.reconstruction import AxisObservation, ProvenanceLink, ReconstructionMeasurement
from research.oasis_core_v11.current_relational_core import (
    BoundContribution,
    CurrentRelation,
    PastRelationSemanticView,
    PossibilityCandidate,
    ReconstructionResult,
    RelationContribution,
    ResponsibilityVector,
)


class DomainPolicyInvariantError(RuntimeError):
    pass


def _bounded_nonnegative(value: float) -> float:
    value = max(0.0, float(value))
    return value / (1.0 + value)


def _bounded_magnitude(value: float) -> float:
    value = abs(float(value))
    return value / (1.0 + value)


def _clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


def _jaccard_distance(left: Sequence[str], right: Sequence[str]) -> float:
    a, b = set(left), set(right)
    if not a and not b:
        return 0.0
    union = a | b
    return 1.0 - (len(a & b) / len(union))


class CurrentFeasibleCandidateGenerator:
    """Generate only possibilities with explicit current-reality evidence.

    No past relation can create feasibility here. Past relations may only participate
    after these present candidates exist, or Reconstruction may add a candidate that
    itself carries new present-current evidence.
    """

    def candidates(
        self,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
    ) -> Sequence[PossibilityCandidate]:
        relation_ids = {r.relation_id for r in current_relations}
        result = [
            PossibilityCandidate(
                "continue-flow",
                tuple(x for x in ("current:lane-heading", "current:local-participation") if x in relation_ids),
                {"longitudinal_intent": "preserve", "heading_intent": "follow-current-lane"},
            )
        ]
        if observation.front_present and "current:front-longitudinal" in relation_ids:
            result.append(
                PossibilityCandidate(
                    "yield-space",
                    ("current:front-longitudinal", "observation:front-present"),
                    {"longitudinal_intent": "decelerate", "heading_intent": "follow-current-lane"},
                )
            )
        if observation.local_heading_error_deg > 0.0:
            result.append(
                PossibilityCandidate(
                    "align-heading-negative",
                    ("current:lane-heading", "observation:positive-heading-offset"),
                    {"longitudinal_intent": "preserve", "heading_intent": "negative-correction"},
                )
            )
        elif observation.local_heading_error_deg < 0.0:
            result.append(
                PossibilityCandidate(
                    "align-heading-positive",
                    ("current:lane-heading", "observation:negative-heading-offset"),
                    {"longitudinal_intent": "preserve", "heading_intent": "positive-correction"},
                )
            )
        return tuple(result)


class SemanticContinuityRelationOperator:
    """Relate historical semantics to present relations without age or timestamp access."""

    def relate(
        self,
        *,
        current_relations: Sequence[CurrentRelation],
        past: PastRelationSemanticView,
        candidate_ids: Sequence[str],
    ) -> Sequence[RelationContribution]:
        anchors = tuple(
            relation.relation_id
            for relation in current_relations
            if relation.subject_role == past.subject_role
            and relation.object_role == past.object_role
            and relation.relation_type == past.relation_type
        )
        if not anchors:
            return ()
        candidates = set(candidate_ids)
        contributions: list[RelationContribution] = []
        for possibility_id in past.possibility_links:
            if possibility_id not in candidates:
                continue
            contributions.append(
                RelationContribution(
                    possibility_id=possibility_id,
                    current_relation_ids=anchors,
                    role_trace=("relation-continuity", "historical-comparison"),
                    generated_possibilities=(possibility_id,),
                    trace={
                        "basis": "role/type continuity in current relations",
                        "historical_relation_state": past.relation_state,
                        "current_anchor_ids": anchors,
                    },
                )
            )
        return tuple(contributions)


class TraceDerivedReconstructionOperator:
    """Record multi-source relational reconstruction without semantic thresholds.

    The three axis values are descriptive normalized observables derived from the
    current provenance graph. They do not classify reconstruction as high/low and do
    not feed back into candidate feasibility.
    """

    def reconstruct(
        self,
        *,
        tau: float,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidates: Sequence[PossibilityCandidate],
        contributions: Sequence[BoundContribution],
    ) -> ReconstructionResult:
        by_possibility: dict[str, list[BoundContribution]] = {}
        for item in contributions:
            by_possibility.setdefault(item.contribution.possibility_id, []).append(item)

        measurements: list[ReconstructionMeasurement] = []
        for possibility_id, items in by_possibility.items():
            unique: dict[tuple[str, str], BoundContribution] = {}
            for item in items:
                key = (item.source.experience_id, item.source.relation_element_id)
                unique[key] = item
            sources = tuple(unique.values())
            if len(sources) < 2:
                continue

            all_anchors = {
                anchor
                for item in sources
                for anchor in item.contribution.current_relation_ids
            }
            role_distances = [
                _jaccard_distance(item.semantic.historical_roles, item.contribution.role_trace)
                for item in sources
            ]
            recombination = (len(sources) - 1) / len(sources)
            role_transformation = sum(role_distances) / len(role_distances)
            joint_edge_count = 1
            graph_total = len(sources) + len(all_anchors) + joint_edge_count
            structural_transformation = joint_edge_count / graph_total

            links = tuple(
                ProvenanceLink(
                    source=item.source,
                    distribution_effect=None,
                    participation_roles=item.contribution.role_trace,
                    generated_possibilities=item.contribution.generated_possibilities,
                    contribution_trace=item.contribution.trace,
                )
                for item in sources
            )
            measurements.append(
                ReconstructionMeasurement(
                    possibility_id=possibility_id,
                    observed_at_tau=tau,
                    source_links=links,
                    recombination=AxisObservation(
                        recombination,
                        "source-incidence-recombination",
                        {"source_count": len(sources)},
                    ),
                    role_transformation=AxisObservation(
                        role_transformation,
                        "historical-to-current-role-jaccard-distance",
                        {"per_source_distance": role_distances},
                    ),
                    structural_transformation=AxisObservation(
                        structural_transformation,
                        "joint-hyperedge-graph-delta",
                        {
                            "source_nodes": len(sources),
                            "current_anchor_nodes": len(all_anchors),
                            "joint_edges_added": joint_edge_count,
                        },
                    ),
                    relation_graph_before={
                        "source_relations": [
                            [item.source.experience_id, item.source.relation_element_id]
                            for item in sources
                        ],
                        "current_anchors": sorted(all_anchors),
                    },
                    relation_graph_after={
                        "joint_relation": {
                            "sources": len(sources),
                            "possibility": possibility_id,
                            "current_anchors": sorted(all_anchors),
                        }
                    },
                )
            )
        return ReconstructionResult(measurements=tuple(measurements))


class ContinuousUVITResponsibilityOperator:
    """Current-only U/I/V/T responsibility vector; never collapsed to one score."""

    def evaluate(
        self,
        *,
        observation: PresentObservation,
        current_relations: Sequence[CurrentRelation],
        candidate: PossibilityCandidate,
        contributions: Sequence[BoundContribution],
    ) -> ResponsibilityVector:
        density = _bounded_nonnegative(observation.local_density)
        speed = _bounded_nonnegative(observation.ego_speed_mps)
        closing = _bounded_nonnegative(observation.front_closing_mps) if observation.front_present else 0.0
        heading = _bounded_magnitude(observation.local_heading_error_deg)
        gap_relief = 1.0 / (1.0 + max(0.0, float(observation.front_gap_m))) if observation.front_present else 0.0

        intent = str(candidate.domain_payload.get("longitudinal_intent", "preserve"))
        if intent == "decelerate":
            uncertainty = (density + heading) / 2.0
            impact = (speed + closing) / 4.0
            irreversibility = speed / 2.0
            time_constraint = closing * gap_relief
        else:
            uncertainty = density
            impact = (speed + closing) / 2.0
            irreversibility = speed
            time_constraint = min(1.0, closing + gap_relief)

        return ResponsibilityVector(
            uncertainty=uncertainty,
            impact=impact,
            irreversibility=irreversibility,
            time_constraint=time_constraint,
            additional={"heading_magnitude": heading},
            evidence={
                "candidate": candidate.possibility_id,
                "current_relation_ids": tuple(r.relation_id for r in current_relations),
                "historical_contribution_count": len(contributions),
                "formula": "continuous-current-observation-only",
            },
        )


class ParetoThenDistributionChoiceOperator:
    """Choose from the non-dominated responsibility frontier, then use current P_t(c).

    Responsibility remains a vector. No weighted scalar responsibility score is made.
    The lexical final tie-break is reproducibility-only and carries no semantic value.
    """

    @staticmethod
    def _vector(v: ResponsibilityVector) -> tuple[float, float, float, float]:
        return (v.uncertainty, v.impact, v.irreversibility, v.time_constraint)

    @classmethod
    def _dominates(cls, a: ResponsibilityVector, b: ResponsibilityVector) -> bool:
        av, bv = cls._vector(a), cls._vector(b)
        return all(x <= y for x, y in zip(av, bv)) and any(x < y for x, y in zip(av, bv))

    def choose(
        self,
        *,
        observation: PresentObservation,
        candidates: Sequence[PossibilityCandidate],
        distribution: Mapping[str, float],
        responsibilities: Mapping[str, ResponsibilityVector],
        contributions: Sequence[BoundContribution],
    ) -> str:
        frontier = [
            candidate
            for candidate in candidates
            if not any(
                other.possibility_id != candidate.possibility_id
                and self._dominates(
                    responsibilities[other.possibility_id],
                    responsibilities[candidate.possibility_id],
                )
                for other in candidates
            )
        ]
        if not frontier:
            raise DomainPolicyInvariantError("responsibility frontier is empty")
        return max(
            frontier,
            key=lambda item: (float(distribution[item.possibility_id]), item.possibility_id),
        ).possibility_id


@dataclass(frozen=True)
class ControllerCoefficients:
    """Low-level control implementation values, not OASIS semantic thresholds."""
    continue_throttle: float = 0.18
    align_throttle: float = 0.12
    heading_gain: float = 0.04
    yield_speed_gain: float = 0.35
    yield_closing_gain: float = 0.55


class MemoryIsolatedActuationOperator:
    """Map current selected possibility + present observation to one actuation.

    Historical memory/provenance is intentionally absent from this interface.
    """

    def __init__(self, coefficients: ControllerCoefficients = ControllerCoefficients()) -> None:
        self.coefficients = coefficients

    def actuation(
        self,
        *,
        observation: PresentObservation,
        selected: PossibilityCandidate,
    ) -> VehicleActuation:
        heading = float(observation.local_heading_error_deg)
        steer_follow = _clip(-heading * self.coefficients.heading_gain, -1.0, 1.0)
        pid = selected.possibility_id
        if pid == "yield-space":
            speed_term = _bounded_nonnegative(observation.ego_speed_mps)
            closing_term = _bounded_nonnegative(observation.front_closing_mps)
            brake = _clip(
                self.coefficients.yield_speed_gain * speed_term
                + self.coefficients.yield_closing_gain * closing_term,
                0.0,
                1.0,
            )
            return VehicleActuation(throttle=0.0, brake=brake, steer=steer_follow)
        if pid == "align-heading-negative":
            return VehicleActuation(
                throttle=self.coefficients.align_throttle,
                brake=0.0,
                steer=-_bounded_magnitude(heading),
            )
        if pid == "align-heading-positive":
            return VehicleActuation(
                throttle=self.coefficients.align_throttle,
                brake=0.0,
                steer=_bounded_magnitude(heading),
            )
        if pid == "continue-flow":
            return VehicleActuation(
                throttle=self.coefficients.continue_throttle,
                brake=0.0,
                steer=steer_follow,
            )
        raise DomainPolicyInvariantError(f"unknown current possibility: {pid}")


@dataclass(frozen=True)
class ClosureResult:
    closed: bool
    method: str
    evidence: Mapping[str, object]


class FrontInteractionClosureEvaluator:
    """Relation-process closure without a universal time/distance/frame threshold.

    A front interaction closes when an interaction present at realization is no longer
    present in a later approved observation. If the relation persists, it remains open.
    """

    def evaluate(
        self,
        *,
        realized_observation: PresentObservation,
        post_observation: PresentObservation,
        selected_possibility_id: str,
    ) -> ClosureResult:
        if realized_observation.front_present and not post_observation.front_present:
            return ClosureResult(
                closed=True,
                method="front-participant-left-current-relation",
                evidence={
                    "closed": True,
                    "closed_relations": [
                        {
                            "relation_element_id": "front-interaction",
                            "subject_role": "ego-role",
                            "object_role": "front-traffic-role",
                            "relation_type": "longitudinal-relative-motion",
                            "relation_state": "interaction-ended",
                            "process_context": ["front-interaction", "realization", "closure"],
                            "historical_roles": ["realized-relation"],
                            "possibility_links": [selected_possibility_id],
                            "symbolic_context": {"closure_event": "front-participant-absent"},
                        }
                    ],
                },
            )
        return ClosureResult(
            closed=False,
            method="front-interaction-still-open",
            evidence={"closed": False, "relation": "front-interaction"},
        )


DOMAIN_POLICY_VERSION = "OASIS-CARLA G3.2 Domain Policy v1"
NO_POST_RESULT_RETUNING = True
