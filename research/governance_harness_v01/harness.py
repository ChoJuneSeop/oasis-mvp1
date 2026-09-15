from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from research.carla_v22_harness_v11.canonical_harness import (
    CanonicalHarnessV11,
    DecisionExecution,
    PresentFlowPort,
    PresentObservation,
)


class GovernanceInvariantError(RuntimeError):
    pass


@dataclass(frozen=True)
class CurrentFlowSnapshot:
    """Present-flow evidence available before any historical-memory access."""

    tau: float
    observation: PresentObservation
    current_reality: Mapping[str, Any]
    flow_fingerprint: str


@dataclass(frozen=True)
class GapAssessment:
    detected: bool
    abnormal_outputs: tuple[str, ...] = ()
    relation_changes: tuple[str, ...] = ()
    progress_anomalies: tuple[str, ...] = ()
    current_evidence_refs: tuple[str, ...] = ()
    rationale: str = ""


@dataclass(frozen=True)
class ExperienceReengagement:
    experience_id: str
    participate: bool
    rationale: str
    evidence_refs: tuple[str, ...] = ()


@dataclass(frozen=True)
class ResponsibilityJudgment:
    """Tracks duties for selection and non-selection, not merely a score."""

    selected_obligations: tuple[str, ...]
    nonselected_obligations: tuple[str, ...]
    unresolved_obligations: tuple[str, ...] = ()
    rationale: str = ""


@dataclass(frozen=True)
class GovernanceDecisionContext:
    snapshot: CurrentFlowSnapshot
    gap: GapAssessment
    reengagement: tuple[ExperienceReengagement, ...]
    responsibility: ResponsibilityJudgment


@dataclass(frozen=True)
class OutcomeObservation:
    description: str
    evidence: Mapping[str, Any]
    observed_tau: float
    flow_fingerprint: str


@dataclass(frozen=True)
class JudgmentRevalidation:
    gap_judgment: str
    reengagement_judgments: tuple[tuple[str, str], ...]
    choice_judgment: str
    responsibility_judgment: str
    rationale: str = ""


@dataclass(frozen=True)
class GovernanceEpochExecution:
    branch: str
    snapshot: CurrentFlowSnapshot
    gap: GapAssessment
    decision: DecisionExecution
    outcome: OutcomeObservation
    reengagement: tuple[ExperienceReengagement, ...] = ()
    responsibility: ResponsibilityJudgment | None = None
    revalidation: JudgmentRevalidation | None = None


class CurrentGapDetector(Protocol):
    def assess(self, snapshot: CurrentFlowSnapshot) -> GapAssessment: ...


class ExperienceReengagementOperator(Protocol):
    def assess(
        self, snapshot: CurrentFlowSnapshot, gap: GapAssessment
    ) -> tuple[ExperienceReengagement, ...]: ...


class ResponsibilityOperator(Protocol):
    def assess(
        self,
        snapshot: CurrentFlowSnapshot,
        gap: GapAssessment,
        reengagement: tuple[ExperienceReengagement, ...],
    ) -> ResponsibilityJudgment: ...


class GovernanceContextPort(Protocol):
    def bind_governance_context(self, context: GovernanceDecisionContext) -> None: ...


class OutcomeObserver(Protocol):
    def observe(
        self, execution: DecisionExecution, flow: PresentFlowPort
    ) -> OutcomeObservation: ...


class RevalidationOperator(Protocol):
    def revalidate(
        self,
        context: GovernanceDecisionContext,
        execution: DecisionExecution,
        outcome: OutcomeObservation,
    ) -> JudgmentRevalidation: ...


class GovernanceHarnessV01:
    """Minimal governance layer preserving the canonical one-realization harness.

    Gap assessment is deliberately capability-separated from experience memory: it
    receives only an immutable snapshot of the present flow. Historical experience
    is first reachable through ``reengagement_operator`` and only on the YES branch.
    """

    def __init__(
        self,
        canonical_harness: CanonicalHarnessV11,
        *,
        gap_detector: CurrentGapDetector,
        outcome_observer: OutcomeObserver,
        reengagement_operator: ExperienceReengagementOperator | None = None,
        responsibility_operator: ResponsibilityOperator | None = None,
        revalidation_operator: RevalidationOperator | None = None,
        context_port: GovernanceContextPort | None = None,
    ):
        self.canonical_harness = canonical_harness
        self.gap_detector = gap_detector
        self.outcome_observer = outcome_observer
        self.reengagement_operator = reengagement_operator
        self.responsibility_operator = responsibility_operator
        self.revalidation_operator = revalidation_operator
        self.context_port = context_port

    @staticmethod
    def _snapshot(flow: PresentFlowPort) -> CurrentFlowSnapshot:
        tau = float(flow.current_tau())
        observation = PresentObservation.from_mapping(flow.present_observation())
        reality = deepcopy(dict(flow.current_reality()))
        fingerprint = flow.flow_fingerprint()
        if float(flow.current_tau()) != tau or flow.flow_fingerprint() != fingerprint:
            raise GovernanceInvariantError("present flow changed while taking gap snapshot")
        return CurrentFlowSnapshot(tau, observation, reality, fingerprint)

    @staticmethod
    def _assert_snapshot_current(flow: PresentFlowPort, snapshot: CurrentFlowSnapshot) -> None:
        if (
            float(flow.current_tau()) != snapshot.tau
            or flow.flow_fingerprint() != snapshot.flow_fingerprint
        ):
            raise GovernanceInvariantError("governance deliberation mutated or advanced real flow")

    def execute_decision_epoch(self, flow: PresentFlowPort) -> GovernanceEpochExecution:
        snapshot = self._snapshot(flow)
        gap = deepcopy(self.gap_detector.assess(deepcopy(snapshot)))
        if not isinstance(gap, GapAssessment):
            raise GovernanceInvariantError("gap detector returned an invalid assessment")
        self._assert_snapshot_current(flow, snapshot)

        if not gap.detected:
            decision = self.canonical_harness.execute_decision_epoch(flow)
            outcome = deepcopy(self.outcome_observer.observe(decision, flow))
            return GovernanceEpochExecution("NO", snapshot, gap, decision, outcome)

        if self.reengagement_operator is None or self.responsibility_operator is None:
            raise GovernanceInvariantError("YES branch requires reengagement and responsibility operators")
        if self.revalidation_operator is None:
            raise GovernanceInvariantError("YES branch requires outcome revalidation")

        reengagement = tuple(
            deepcopy(self.reengagement_operator.assess(deepcopy(snapshot), deepcopy(gap)))
        )
        responsibility = deepcopy(
            self.responsibility_operator.assess(
                deepcopy(snapshot), deepcopy(gap), deepcopy(reengagement)
            )
        )
        if not isinstance(responsibility, ResponsibilityJudgment):
            raise GovernanceInvariantError("responsibility operator returned an invalid judgment")
        if not (responsibility.selected_obligations or responsibility.nonselected_obligations):
            raise GovernanceInvariantError("YES branch must track selection or non-selection responsibility")

        context = GovernanceDecisionContext(snapshot, gap, reengagement, responsibility)
        if self.context_port is not None:
            self.context_port.bind_governance_context(deepcopy(context))
        self._assert_snapshot_current(flow, snapshot)

        decision = self.canonical_harness.execute_decision_epoch(flow)
        outcome = deepcopy(self.outcome_observer.observe(decision, flow))
        revalidation = deepcopy(
            self.revalidation_operator.revalidate(
                deepcopy(context), deepcopy(decision), deepcopy(outcome)
            )
        )
        if not isinstance(revalidation, JudgmentRevalidation):
            raise GovernanceInvariantError("revalidation operator returned an invalid record")
        decided_ids = tuple(item.experience_id for item in reengagement)
        revised_ids = tuple(item[0] for item in revalidation.reengagement_judgments)
        if revised_ids != decided_ids:
            raise GovernanceInvariantError("revalidation must cover every reengagement judgment in order")
        return GovernanceEpochExecution(
            "YES",
            snapshot,
            gap,
            decision,
            outcome,
            reengagement,
            responsibility,
            revalidation,
        )
