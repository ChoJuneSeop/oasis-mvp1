"""별도 선택·책임 통합 실행 경로 / separate integrated execution path.

v1.2 execution sequence is preserved in this explicit versioned extension.
"""
from dataclasses import asdict
import json
from research.g3_2_sidecar.common import require_tau
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import ResourcePlan, require_text
from research.oasis_core_v12.runtime import (
    ApplicationReceipt, DuplicateDispatch, ExecutionJournal, LiveActuationPort, StaleDecision,
)
from .integration import IntegratedChoiceCore, NoAdmissibleChoice

class IntegratedFlowExecutor:
    def __init__(self, core, journal: ExecutionJournal, *, authorize):
        if not isinstance(core, IntegratedChoiceCore):
            raise CoreV11InvariantError('this separate path requires IntegratedChoiceCore')
        self.core, self.journal, self.authorize = core, journal, authorize

    def execute(self, port: LiveActuationPort, *, run_id: str, subject_id: str,
                resource_plan: ResourcePlan, deadline_tau: float) -> ApplicationReceipt:
        require_text(run_id, 'run_id')
        require_text(subject_id, 'subject_id')
        require_tau('deadline_tau', deadline_tau)
        frame = port.capture()
        key = json.dumps([run_id, subject_id, frame.observation.epoch], separators=(',', ':'))
        if self.journal.inspect(key) is not None:
            raise DuplicateDispatch('epoch already dispatched; inspect application confirmation')
        if frame.tau > deadline_tau:
            self.journal.event(key, 'deferred', {'reason': 'available decision time exhausted'})
            raise CoreV11InvariantError('decision deadline already elapsed')
        self.core.open_current_epoch(frame)
        self.core.bind_current_resources(resource_plan)
        try:
            proposal = self.core.realize(frame.observation)
        except NoAdmissibleChoice:
            self.journal.event(key, 'no_current_choice', {
                'decision_tau': frame.tau, 'decision_responsibility': self.core.responsibility_record()})
            raise
        responsibility = self.core.responsibility_record()
        self.journal.event(key, 'selected', {
            'decision_tau': frame.tau, 'revision': frame.revision,
            'proposal': asdict(proposal), 'resources': asdict(resource_plan),
            'decision_responsibility': responsibility})
        current = port.capture()
        if current.tau < frame.tau:
            raise CoreV11InvariantError('gateway clock moved backwards')
        if (current.revision != frame.revision or current.observation != frame.observation):
            self.journal.event(key, 'invalidated', {'reason': 'current premises changed', 'tau': current.tau})
            raise StaleDecision('rebuild from current flow; no action has been dispatched')
        if current.tau > deadline_tau:
            self.journal.event(key, 'deferred', {'reason': 'decision deadline elapsed', 'tau': current.tau})
            raise CoreV11InvariantError('no verification time remains for this proposal')
        # Only present observation and proposal cross this authority boundary.
        if self.authorize(current.observation, proposal) is not True:
            self.journal.event(key, 'not_authorized', {'tau': current.tau})
            raise CoreV11InvariantError('current proposal lacks execution authority')
        self.journal.reserve(key, {'decision_tau': frame.tau, 'attempt_tau': current.tau,
                                  'revision': current.revision, 'proposal': asdict(proposal),
                                  'resources': asdict(resource_plan),
                                  'decision_responsibility': responsibility})
        try:
            receipt = port.apply_if_current(proposal, expected_revision=current.revision,
                                            idempotency_key=key)
            if not isinstance(receipt, ApplicationReceipt) or receipt.observed_at_tau < current.tau:
                raise CoreV11InvariantError('invalid or backdated application receipt')
        except Exception as exc:
            # The call could have applied an action before communication failed.
            # Preserve the reservation, record uncertainty and never blindly replay.
            self.journal.event(key, 'application_unknown', {'error_type': type(exc).__name__})
            raise
        self.journal.receipt(key, receipt)
        # Applied means actuator acknowledged application, never outcome success.
        return receipt
