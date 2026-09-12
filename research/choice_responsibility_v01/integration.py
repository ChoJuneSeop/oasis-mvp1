"""현재 전체 맥락을 선택에 연결 / current full-context choice integration.

This is a separate supplementary process, not a replacement G3 theory or a safety proof.
Domain assessment supplies evidenced conditions, not a universal risk-score threshold.
"""
from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass
from math import isfinite

from research.carla_v22_harness_v11.canonical_harness import Realization
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError, EpochEvaluation
from research.oasis_core_v12.contracts import CurrentFrame, ResourcePlan, require_text
from research.oasis_core_v12.current_relational_core import CurrentRelationalCoreV12

PROCESS_ID = 'choice-responsibility-integration-v0.1'


@dataclass(frozen=True)
class ConflictTrace:
    """B_tau(e): current/past tension, expressed as a relation trace, not a class label."""
    trace_id: str
    current_relation_ids: tuple[str, ...]
    past_sources: tuple[RelationElementRef, ...]
    description: str
    evidence_refs: tuple[str, ...]
    response_descriptors: tuple[str, ...] = ()


@dataclass(frozen=True)
class VerificationRequest:
    """Q: an evidenced current verification demand. Order is supplied with a rationale."""
    request_id: str
    candidate_ids: tuple[str, ...]
    question: str
    estimated_work: float
    evidence_refs: tuple[str, ...]


@dataclass(frozen=True)
class CurrentCondition:
    """Current execution condition. Check IDs and exclusions may change each epoch."""
    condition_id: str
    candidate_id: str
    required_checks: tuple[str, ...]
    excluded: bool
    rationale: str
    evidence_refs: tuple[str, ...]


@dataclass(frozen=True)
class ResponsibilityAssessment:
    requests: tuple[VerificationRequest, ...]
    conditions: tuple[CurrentCondition, ...]
    conflicts: tuple[ConflictTrace, ...]
    scheduling_rationale: str


@dataclass(frozen=True)
class VerificationFinding:
    """True/False/None describe one question, NOT a global success/failure taxonomy."""
    request_id: str
    satisfied: bool | None
    spent_work: float
    evidence_refs: tuple[str, ...]
    explanation: str
    revision: str


@dataclass(frozen=True)
class UnresolvedResponsibility:
    """Omega / 오메가: work not done or evidence still inconclusive, with original demand."""
    request: VerificationRequest
    reason: str


@dataclass(frozen=True)
class VerificationReport:
    required_work: float
    available_work: float
    allocated_work: float
    executed_work: float
    unit: str
    findings: tuple[VerificationFinding, ...]
    omega: tuple[UnresolvedResponsibility, ...]
    additional_unverified_scope: tuple[str, ...]


@dataclass(frozen=True)
class DecisionInputs:
    frame: CurrentFrame
    evaluation: EpochEvaluation
    reentered_unresolved: tuple[tuple[str, tuple[str, ...]], ...]


@dataclass(frozen=True)
class ChoiceContext:
    inputs: DecisionInputs
    assessment: ResponsibilityAssessment
    verification: VerificationReport


@dataclass(frozen=True)
class ChoiceDecision:
    selected_id: str | None
    eligible_ids: tuple[str, ...]
    blocked_by: tuple[tuple[str, tuple[str, ...]], ...]
    explanation: str


class NoAdmissibleChoice(CoreV11InvariantError):
    """No execution now; not terminal, not proof of inevitable failure."""


class CurrentContextChoice:
    """Executable reference rule / 실행 가능한 기준 선택 규칙.

    Enforce domain-evidenced current conditions; then let a preference operator see
    the COMPLETE context and only the admissible candidate IDs. It must not receive
    a scalar surrogate for participation/reconstruction/responsibility/Omega.
    """
    def __init__(self, preference_operator):
        self.preference_operator = preference_operator

    def choose(self, context: ChoiceContext) -> ChoiceDecision:
        findings = {x.request_id: x for x in context.verification.findings}
        blocks = {}
        for candidate in context.inputs.evaluation.candidates:
            reasons = []
            for condition in context.assessment.conditions:
                if condition.candidate_id != candidate.possibility_id:
                    continue
                if condition.excluded:
                    reasons.append(condition.condition_id)
                for check in condition.required_checks:
                    if check not in findings or findings[check].satisfied is not True:
                        reasons.append(condition.condition_id + ':' + check)
            if reasons:
                blocks[candidate.possibility_id] = tuple(reasons)
        eligible = tuple(c.possibility_id for c in context.inputs.evaluation.candidates
                         if c.possibility_id not in blocks)
        if not eligible:
            return ChoiceDecision(None, (), tuple(blocks.items()),
                                  'Current evidenced execution conditions are not satisfied; preserve flow and unresolved responsibility.')
        selected = self.preference_operator.choose(context=deepcopy(context), eligible_ids=eligible)
        if selected not in eligible:
            raise CoreV11InvariantError('preference attempted to bypass current responsibility conditions')
        return ChoiceDecision(selected, eligible, tuple(blocks.items()),
                              'Selected within current evidenced conditions; unresolved non-gating scope remains recorded.')


class IntegratedChoiceCore(CurrentRelationalCoreV12):
    def __init__(self, *, assessment_operator, verifier, preference_operator, **legacy_operators):
        if 'choice_operator' in legacy_operators:
            raise CoreV11InvariantError('legacy choice bypass is forbidden on the integrated path')
        super().__init__(choice_operator=None, **legacy_operators)
        self.assessment_operator = assessment_operator
        self.verifier = verifier
        self.integrated_choice = CurrentContextChoice(preference_operator)
        self._resource_plan = None
        self._last_context = None
        self._last_choice = None

    def open_current_epoch(self, frame):
        self._resource_plan = self._last_context = self._last_choice = None
        return super().open_current_epoch(frame)

    def bind_current_resources(self, plan: ResourcePlan):
        if self._frame is None:
            raise CoreV11InvariantError('open current frame before binding resources')
        self._resource_plan = deepcopy(plan)

    def _inputs(self, observation):
        frame = self._require_frame(observation)
        evaluation = self._last_evaluation
        if evaluation is None:
            evaluation = self._evaluate(observation)
        keys = {self._source_key(x.source) for x in evaluation.contributions}
        keys.update(self._source_key(link.source) for x in evaluation.reconstructions for link in x.source_links)
        reentered = {}
        for item in self.history_envelopes():
            if self._source_key(item.record.source) in keys and item.completion.unresolved:
                reentered[item.completion.experience_id] = item.completion.unresolved
        return deepcopy(DecisionInputs(frame, evaluation, tuple(reentered.items())))

    def _validate_assessment(self, inputs, assessment):
        frame = inputs.frame
        candidates = {c.possibility_id for c in inputs.evaluation.candidates}
        current_relations = {r.relation_id for r in inputs.evaluation.current_relations}
        sources = {self._source_key(r.source): r.source for r in self.history_records()}
        require_text(assessment.scheduling_rationale, 'current verification scheduling rationale')
        for sequence, field in ((assessment.requests, 'request_id'), (assessment.conditions, 'condition_id'),
                                (assessment.conflicts, 'trace_id')):
            ids = [getattr(x, field) for x in sequence]
            if len(ids) != len(set(ids)):
                raise CoreV11InvariantError('duplicate assessment identity')
            for identity in ids:
                require_text(identity, field)
        requests = {x.request_id: x for x in assessment.requests}
        for request in assessment.requests:
            require_text(request.question, 'verification question')
            if not request.candidate_ids or not set(request.candidate_ids) <= candidates:
                raise CoreV11InvariantError('verification request targets unknown candidates')
            if not isfinite(request.estimated_work) or request.estimated_work < 0:
                raise CoreV11InvariantError('invalid verification work estimate')
            frame.assert_current_evidence(request.evidence_refs)
        for condition in assessment.conditions:
            require_text(condition.rationale, 'current condition rationale')
            if condition.candidate_id not in candidates or type(condition.excluded) is not bool:
                raise CoreV11InvariantError('invalid current condition')
            frame.assert_current_evidence(condition.evidence_refs)
            for ref in condition.required_checks:
                if ref not in requests or condition.candidate_id not in requests[ref].candidate_ids:
                    raise CoreV11InvariantError('current condition lacks matching verification demand')
        for conflict in assessment.conflicts:
            require_text(conflict.description, 'relation conflict description')
            if not conflict.current_relation_ids or not set(conflict.current_relation_ids) <= current_relations:
                raise CoreV11InvariantError('conflict must have a current relation anchor')
            frame.assert_current_evidence(conflict.evidence_refs)
            for ref in conflict.past_sources:
                if sources.get(self._source_key(ref)) != ref:
                    raise CoreV11InvariantError('conflict references future, unknown or altered history')

    def _verify(self, inputs, assessment, plan):
        required = sum(r.estimated_work for r in assessment.requests)
        if not isfinite(required) or plan.required != required:
            raise CoreV11InvariantError('resource demand must equal the current verification request work')
        findings, omega, spent = [], [], 0.0
        for request in assessment.requests:
            remaining = max(0.0, plan.allocated - spent)
            if request.estimated_work > remaining:
                omega.append(UnresolvedResponsibility(request, 'available allocated work is insufficient'))
                continue
            finding = self.verifier.verify(request=deepcopy(request), inputs=deepcopy(inputs), work_limit=remaining)
            if finding is None:
                raise CoreV11InvariantError('verifier omitted work accounting; cannot certify executed work')
            if finding.request_id != request.request_id or finding.revision != inputs.frame.revision:
                raise CoreV11InvariantError('verification finding is not bound to current demand and revision')
            if type(finding.satisfied) is not bool and finding.satisfied is not None:
                raise CoreV11InvariantError('invalid verification finding')
            if not isfinite(finding.spent_work) or not 0 <= finding.spent_work <= remaining:
                raise CoreV11InvariantError('verification exceeded declared work limit; cannot certify choice')
            inputs.frame.assert_current_evidence(finding.evidence_refs)
            require_text(finding.explanation, 'verification evidence explanation')
            spent += finding.spent_work
            findings.append(finding)
            if finding.satisfied is None:
                omega.append(UnresolvedResponsibility(request, finding.explanation))
        return VerificationReport(required, plan.available, plan.allocated, spent, plan.unit,
                                  tuple(findings), tuple(omega), plan.unverified)

    def realize(self, observation):
        if self._resource_plan is None:
            raise CoreV11InvariantError('integrated choice requires current resource and verification context')
        inputs = self._inputs(observation)
        assessment = deepcopy(self.assessment_operator.assess(inputs=deepcopy(inputs)))
        self._validate_assessment(inputs, assessment)
        report = self._verify(inputs, assessment, self._resource_plan)
        context = ChoiceContext(inputs, assessment, report)
        decision = self.integrated_choice.choose(context)
        self._last_context, self._last_choice = deepcopy(context), deepcopy(decision)
        if decision.selected_id is None:
            raise NoAdmissibleChoice(decision.explanation)
        selected = next(c for c in inputs.evaluation.candidates if c.possibility_id == decision.selected_id)
        return Realization(decision.selected_id, self.actuation_operator.actuation(
            observation=observation, selected=deepcopy(selected)))

    def responsibility_record(self):
        if self._last_context is None or self._last_choice is None:
            raise CoreV11InvariantError('no integrated choice has been constructed')
        return deepcopy({'process_id': PROCESS_ID, 'context': asdict(self._last_context),
                         'decision': asdict(self._last_choice), 'experimental_evidence': False})
