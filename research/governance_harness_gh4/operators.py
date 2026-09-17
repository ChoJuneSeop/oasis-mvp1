from __future__ import annotations

from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ExperienceReengagement,
    JudgmentRevalidation,
    ResponsibilityJudgment,
    RevalidationState,
)

from .models import CandidateBurden


def _matching_feedback_state(candidate, feedback):
    for item in reversed(tuple(feedback)):
        if item.relation_id != candidate.relation_id:
            continue
        if candidate.provenance_ref not in item.provenance_refs:
            continue
        states = dict(item.experience_states)
        if candidate.experience_id in states:
            return states[candidate.experience_id]
    return None


class IntegratedSelectiveParticipation:
    """Current-context participation with provenance-bound feedback and no scalar memory score."""

    def __init__(self, arm: str):
        self.arm = arm

    def assess(self, evidence, _gap, candidates, feedback):
        current = evidence.samples[-1].observation
        decisions = []
        for candidate in candidates:
            scope_density = candidate.content.get("scope_density")
            if scope_density is None:
                base_eligible = False
            else:
                base_eligible = abs(int(current.local_density) - int(scope_density)) <= 1
            state = _matching_feedback_state(candidate, feedback)
            revised_same_scope = (
                state is RevalidationState.REVISED
                and scope_density is not None
                and int(current.local_density) == int(scope_density)
            )

            if self.arm == "H5_NONSELECTIVE_HISTORY":
                participate = True
                rationale = "nonselective relation-matched control"
            else:
                participate = bool(base_eligible and not revised_same_scope)
                if not base_eligible:
                    rationale = "current scope is not contextually eligible"
                elif revised_same_scope:
                    rationale = "revised-same-scope-block"
                elif state is RevalidationState.REVISED:
                    rationale = "revised feedback outside current scope; eligibility recomputed"
                elif state is RevalidationState.CONFIRMED:
                    rationale = "confirmed feedback preserved; current eligibility governs"
                elif state is RevalidationState.INCONCLUSIVE:
                    rationale = "inconclusive feedback preserved; current eligibility governs"
                else:
                    rationale = "current scope is contextually eligible"

            decisions.append(ExperienceReengagement(
                candidate.experience_id,
                participate,
                rationale,
                evidence_refs=(f"current-density:{current.local_density}",),
                provenance_ref=candidate.provenance_ref,
            ))
        return tuple(decisions)


def _profiles(candidate_ids: tuple[str, ...], observation, has_participant: bool) -> tuple[CandidateBurden, ...]:
    if tuple(candidate_ids) != ("continue-flow", "yield-space"):
        raise RuntimeError(f"GH-4 candidate contract changed: {candidate_ids}")

    uncertainty_risky = abs(float(observation.local_heading_error_deg)) >= 0.1
    impact_shared = int(observation.local_density) >= 2
    vulnerability_exposed = bool(observation.front_present) and float(observation.front_gap_m) <= 9.0
    temporality_closing = float(observation.front_closing_mps) >= 0.5

    continue_profile = CandidateBurden(
        "continue-flow",
        frozenset(
            ({"uncertain-current"} if uncertainty_risky else set())
            | ({"no-relational-support"} if not has_participant else set())
        ),
        frozenset({"shared-impact"}) if impact_shared else frozenset(),
        frozenset({"exposed-participant"}) if vulnerability_exposed else frozenset(),
        frozenset({"closing-window"}) if temporality_closing else frozenset(),
    )
    yield_profile = CandidateBurden(
        "yield-space",
        frozenset({"discarded-relational-support"}) if has_participant else frozenset(),
        frozenset({"isolated-flow-disruption"}) if not impact_shared else frozenset(),
        frozenset({"unnecessary-vulnerability-intervention"}) if not vulnerability_exposed else frozenset(),
        frozenset({"stable-window-interference"}) if not temporality_closing else frozenset(),
    )
    return (continue_profile, yield_profile)


def _dominates(a: CandidateBurden, b: CandidateBurden) -> bool:
    pairs = tuple(zip(a.axes(), b.axes()))
    return all(left.issubset(right) for left, right in pairs) and any(left != right for left, right in pairs)


def _responsibility_selected(profiles: tuple[CandidateBurden, ...]) -> str:
    frontier = [
        profile for profile in profiles
        if not any(
            other.candidate_id != profile.candidate_id and _dominates(other, profile)
            for other in profiles
        )
    ]
    if not frontier:
        raise RuntimeError("GH-4 responsibility frontier is empty")
    ordered = {"continue-flow": 0, "yield-space": 1}
    return min(frontier, key=lambda item: ordered[item.candidate_id]).candidate_id


class IntegratedResponsibility:
    """Current U/I/V/T burden-set responsibility. H4 records but does not bind it."""

    def __init__(self, arm: str):
        self.arm = arm

    def assess(self, context):
        candidate_ids = tuple(context.candidate_ids)
        current = context.flow.samples[-1].observation
        has_participant = any(x.participate for x in context.participating_experiences)
        profiles = _profiles(candidate_ids, current, has_participant)
        computed = _responsibility_selected(profiles)
        bound = self.arm != "H4_RESPONSIBILITY_RECORD_ONLY"
        selected = computed if bound else candidate_ids[0]
        nonselected = tuple(x for x in candidate_ids if x != selected)

        axes = DynamicResponsibilityAxes(
            uncertainty=(
                f"heading:{current.local_heading_error_deg}",
                f"relational-support:{int(has_participant)}",
            ),
            impact=(f"density:{current.local_density}",),
            vulnerability=(f"front-gap:{current.front_gap_m}",),
            temporality=(f"closing:{current.front_closing_mps}",),
        )
        return ResponsibilityJudgment(
            candidate_ids=candidate_ids,
            selected_candidate_id=selected,
            nonselected_candidate_ids=nonselected,
            axes=axes,
            selected_obligations=(
                f"computed-responsibility-selected:{computed}",
                f"responsibility-bound:{str(bound).lower()}",
                "bind exactly one realized candidate",
            ),
            nonselected_obligations=tuple(f"retain-nonselected:{x}" for x in nonselected),
            rationale="GH-4 current U/I/V/T Pareto burden sets; no scalar responsibility score",
        )


class OutcomeRevalidationOperator:
    """Frozen GH-3 directional outcome mapping reused unchanged in meaning."""

    def revalidate(self, _context, audit, decision, outcome):
        realized = decision.observation
        post = outcome.post_observation
        speed_improved = post.ego_speed_mps < realized.ego_speed_mps
        heading_not_worse = abs(post.local_heading_error_deg) <= abs(realized.local_heading_error_deg)
        if speed_improved and heading_not_worse:
            state = RevalidationState.CONFIRMED
        elif (not speed_improved) and (not heading_not_worse):
            state = RevalidationState.REVISED
        else:
            state = RevalidationState.INCONCLUSIVE
        return JudgmentRevalidation(
            gap_judgment=RevalidationState.CONFIRMED,
            reengagement_judgments=tuple((x.experience_id, state) for x in audit),
            choice_judgment=state,
            responsibility_judgment=state,
            rationale="GH-4 authoritative post-Closure directional revalidation",
        )
