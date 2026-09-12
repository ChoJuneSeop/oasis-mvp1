from __future__ import annotations

from copy import deepcopy

from research.carla_v22_harness_v11.canonical_harness import Realization
from research.choice_responsibility_v01.integration import (
    ChoiceContext,
    IntegratedChoiceCore,
    NoAdmissibleChoice,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

LIVE_SENTINEL_UNIT = "live-resource-plan-sentinel"


class LiveIntegratedChoiceCore(IntegratedChoiceCore):
    """Live order: Assessment -> Resource Allocation -> Verification -> Choice.

    The inherited adapter still calls bind_current_resources for compatibility,
    but the supplied plan must be an inert zero sentinel. The actual plan is
    constructed only after current Assessment inside realize().
    """

    def __init__(self, *, resource_allocator, **kwargs):
        super().__init__(**kwargs)
        self.resource_allocator = resource_allocator
        self._last_live_resource_plan = None

    def bind_current_resources(self, plan):
        if (
            float(plan.required) != 0.0
            or float(plan.available) != 0.0
            or float(plan.allocated) != 0.0
            or plan.unit != LIVE_SENTINEL_UNIT
        ):
            raise CoreV11InvariantError(
                "live adapter resource input must be an inert zero sentinel"
            )
        self._resource_plan = deepcopy(plan)

    def realize(self, observation):
        inputs = self._inputs(observation)
        assessment = deepcopy(self.assessment_operator.assess(inputs=deepcopy(inputs)))
        self._validate_assessment(inputs, assessment)

        plan = deepcopy(
            self.resource_allocator.allocate(
                inputs=deepcopy(inputs),
                assessment=deepcopy(assessment),
            )
        )
        required = sum(request.estimated_work for request in assessment.requests)
        if float(plan.required) != float(required):
            raise CoreV11InvariantError(
                "live resource plan demand must equal current assessment demand"
            )

        report = self._verify(inputs, assessment, plan)
        context = ChoiceContext(inputs, assessment, report)
        decision = self.integrated_choice.choose(context)
        self._last_context = deepcopy(context)
        self._last_choice = deepcopy(decision)
        self._last_live_resource_plan = deepcopy(plan)

        if decision.selected_id is None:
            raise NoAdmissibleChoice(decision.explanation)
        selected = next(
            c for c in inputs.evaluation.candidates
            if c.possibility_id == decision.selected_id
        )
        return Realization(
            decision.selected_id,
            self.actuation_operator.actuation(
                observation=observation,
                selected=deepcopy(selected),
            ),
        )

    def live_resource_plan(self):
        if self._last_live_resource_plan is None:
            raise CoreV11InvariantError("no live resource plan has been constructed")
        return deepcopy(self._last_live_resource_plan)
