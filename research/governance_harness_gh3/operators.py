from __future__ import annotations

from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ExperienceReengagement,
    JudgmentRevalidation,
    ResponsibilityJudgment,
    RevalidationState,
)


def state_from_observations(realized_observation, post_observation) -> RevalidationState:
    speed_improved = post_observation.ego_speed_mps < realized_observation.ego_speed_mps
    heading_not_worse = (
        abs(post_observation.local_heading_error_deg)
        <= abs(realized_observation.local_heading_error_deg)
    )
    if speed_improved and heading_not_worse:
        return RevalidationState.CONFIRMED
    if (not speed_improved) and (not heading_not_worse):
        return RevalidationState.REVISED
    return RevalidationState.INCONCLUSIVE


def _semantic_match(candidate, current) -> bool:
    records = tuple(candidate.content.get("relation_records", ()))
    return bool(current.front_present) and any(
        record.semantic.subject_role == "ego-role"
        and record.semantic.object_role == "front-traffic-role"
        and record.semantic.relation_type == "longitudinal-relative-motion"
        for record in records
    )


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


class FeedbackAwareParticipation:
    """Current-first relation eligibility with context-local revalidation evidence."""

    def assess(self, evidence, _gap, candidates, feedback):
        current = evidence.samples[-1].observation
        decisions = []
        for candidate in candidates:
            base = _semantic_match(candidate, current)
            state = _matching_feedback_state(candidate, feedback)
            scope_density = candidate.content.get("feedback_scope_density")
            revised_applies_here = (
                state is RevalidationState.REVISED
                and scope_density is not None
                and int(current.local_density) == int(scope_density)
            )
            participate = bool(base and not revised_applies_here)
            if not base:
                rationale = "current relation semantics do not match"
            elif revised_applies_here:
                rationale = "prior participation was revised in the same current scope"
            elif state is RevalidationState.REVISED:
                rationale = "revised feedback is outside this current scope; current eligibility recomputed"
            elif state is RevalidationState.CONFIRMED:
                rationale = "confirmed feedback does not override current relation eligibility"
            elif state is RevalidationState.INCONCLUSIVE:
                rationale = "inconclusive feedback does not override current relation eligibility"
            else:
                rationale = "current relation semantics match"
            decisions.append(ExperienceReengagement(
                candidate.experience_id,
                participate,
                rationale,
                evidence_refs=(f"current-density:{current.local_density}",),
                provenance_ref=candidate.provenance_ref,
            ))
        return tuple(decisions)


class FixedParticipationBoundResponsibility:
    """Frozen experimental selection contract; identical in every GH-3 arm."""

    def assess(self, context):
        ids = tuple(context.candidate_ids)
        has_participant = any(x.participate for x in context.participating_experiences)
        if has_participant and "continue-flow" in ids:
            selected = "continue-flow"
        elif "yield-space" in ids:
            selected = "yield-space"
        elif ids:
            selected = ids[0]
        else:
            raise RuntimeError("GH-3 responsibility received no current possibilities")
        return ResponsibilityJudgment(
            candidate_ids=ids,
            selected_candidate_id=selected,
            nonselected_candidate_ids=tuple(x for x in ids if x != selected),
            axes=DynamicResponsibilityAxes(
                uncertainty=("current-evidence",),
                impact=("selection-effect",),
                vulnerability=("front-relation",),
                temporality=("current-epoch",),
            ),
            selected_obligations=("bind selected candidate to one realization",),
            nonselected_obligations=("retain nonselected alternatives in provenance",),
            rationale="frozen GH-3 responsibility contract",
        )


class OutcomeRevalidationOperator:
    """Map authoritative post-observation direction to typed revalidation states."""

    def revalidate(self, _context, audit, decision, outcome):
        state = state_from_observations(decision.observation, outcome.post_observation)
        return JudgmentRevalidation(
            gap_judgment=RevalidationState.CONFIRMED,
            reengagement_judgments=tuple((x.experience_id, state) for x in audit),
            choice_judgment=state,
            responsibility_judgment=state,
            rationale="post-Closure directional outcome revalidation",
        )
