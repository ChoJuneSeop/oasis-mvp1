from __future__ import annotations

"""Organic G3 integration core.

The class integrates current participation/reconstruction, responsibility assessment,
resource allocation, verification, choice, and one proposed realization in one current
flow. It intentionally does not alter the frozen baseline implementation files.
"""

from copy import deepcopy
from dataclasses import asdict, dataclass
from typing import Any

from research.carla_v22_harness_v11.canonical_harness import Realization
from research.choice_responsibility_v01.integration import (
    ChoiceContext,
    IntegratedChoiceCore,
    NoAdmissibleChoice,
)
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

ORGANIC_PROCESS_ID = "oasis-g3-organic-flow-v1"


@dataclass(frozen=True)
class ResponsibilityVariableTransition:
    tau: float
    candidate_id: str
    variable: str
    event: str
    value: float | None
    evidence_refs: tuple[str, ...]
    rationale: str


class ResponsibilityVariableLedger:
    """Preserve activation/update/deactivation of dynamic responsibility variables."""

    def __init__(self):
        self._active: dict[tuple[str, str], tuple[float, tuple[str, ...]]] = {}
        self._events: list[ResponsibilityVariableTransition] = []

    def observe(self, evaluation) -> None:
        current: dict[tuple[str, str], tuple[float, tuple[str, ...]]] = {}
        for candidate_id, vector in evaluation.responsibilities.items():
            for name, raw_value in vector.additional.items():
                refs = vector.evidence.get(name)
                if not isinstance(refs, (tuple, list)) or not refs:
                    raise CoreV11InvariantError(
                        f"dynamic responsibility variable {name!r} lacks named current evidence"
                    )
                state = (float(raw_value), tuple(str(x) for x in refs))
                key = (candidate_id, str(name))
                current[key] = state
                prior = self._active.get(key)
                if prior is None:
                    self._events.append(
                        ResponsibilityVariableTransition(
                            evaluation.tau,
                            candidate_id,
                            str(name),
                            "activated",
                            state[0],
                            state[1],
                            "Variable is present in the current responsibility structure with named current evidence.",
                        )
                    )
                elif prior != state:
                    self._events.append(
                        ResponsibilityVariableTransition(
                            evaluation.tau,
                            candidate_id,
                            str(name),
                            "updated",
                            state[0],
                            state[1],
                            "Current value/evidence changed; prior responsibility record is retained.",
                        )
                    )

        for key, prior in sorted(self._active.items()):
            if key not in current:
                self._events.append(
                    ResponsibilityVariableTransition(
                        evaluation.tau,
                        key[0],
                        key[1],
                        "deactivated",
                        None,
                        prior[1],
                        "Variable is not active in this current relation/candidate structure; historical records are not deleted.",
                    )
                )
        self._active = current

    def events(self) -> tuple[ResponsibilityVariableTransition, ...]:
        return deepcopy(tuple(self._events))


class OrganicIntegratedChoiceCore(IntegratedChoiceCore):
    """Assessment -> allocation -> verification -> choice on the same current frame."""

    def __init__(self, *, resource_allocator, **kwargs):
        super().__init__(**kwargs)
        self.resource_allocator = resource_allocator
        self.variable_ledger = ResponsibilityVariableLedger()
        self._last_organic_resource_plan = None

    def open_current_epoch(self, frame):
        self._last_organic_resource_plan = None
        view = super().open_current_epoch(frame)
        if self._last_evaluation is None:
            raise CoreV11InvariantError("current evaluation was not constructed")
        self.variable_ledger.observe(self._last_evaluation)
        return view

    def bind_current_resources(self, plan):
        raise CoreV11InvariantError(
            "organic path forbids pre-binding a resource plan; current assessment must exist before allocation"
        )

    def realize(self, observation):
        inputs = self._inputs(observation)
        assessment = deepcopy(self.assessment_operator.assess(inputs=deepcopy(inputs)))
        self._validate_assessment(inputs, assessment)

        plan = deepcopy(
            self.resource_allocator.allocate(
                inputs=deepcopy(inputs), assessment=deepcopy(assessment)
            )
        )
        required = float(sum(request.estimated_work for request in assessment.requests))
        if float(plan.required) != required:
            raise CoreV11InvariantError(
                "resource plan demand must equal the current assessment demand"
            )

        report = self._verify(inputs, assessment, plan)
        context = ChoiceContext(inputs, assessment, report)
        decision = self.integrated_choice.choose(context)
        self._last_context = deepcopy(context)
        self._last_choice = deepcopy(decision)
        self._last_organic_resource_plan = deepcopy(plan)

        if decision.selected_id is None:
            raise NoAdmissibleChoice(decision.explanation)
        selected = next(
            c for c in inputs.evaluation.candidates
            if c.possibility_id == decision.selected_id
        )
        return Realization(
            decision.selected_id,
            self.actuation_operator.actuation(
                observation=observation, selected=deepcopy(selected)
            ),
        )

    def organic_resource_plan(self):
        if self._last_organic_resource_plan is None:
            raise CoreV11InvariantError("no current organic resource plan has been constructed")
        return deepcopy(self._last_organic_resource_plan)

    def responsibility_record(self) -> dict[str, Any]:
        base = super().responsibility_record()
        evaluation = self._last_context.inputs.evaluation
        reconstructed_ids = tuple(
            dict.fromkeys(x.possibility_id for x in evaluation.reconstructions)
        )
        base.update(
            {
                "organic_process_id": ORGANIC_PROCESS_ID,
                "resource_plan": asdict(self.organic_resource_plan()),
                "responsibility_variable_transitions": [
                    asdict(x) for x in self.variable_ledger.events()
                ],
                "possibility_scope": {
                    "constructed_ids": tuple(c.possibility_id for c in evaluation.candidates),
                    "reconstructed_ids": reconstructed_ids,
                    "open_world_not_exhaustive": True,
                    "interpretation": "The current enumerated candidate set is the constructed decision domain for this epoch, not all possibilities in reality.",
                },
            }
        )
        return deepcopy(base)
