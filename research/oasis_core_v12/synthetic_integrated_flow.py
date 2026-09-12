"""전체 연결 실행 예제 / synthetic wiring example, NOT experimental evidence."""
from dataclasses import asdict
import json
from pathlib import Path
import tempfile

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11 import synthetic_integrated_flow as old
from .contracts import CurrentEvidence, CurrentFrame, ObservedOccurrence, ResourcePlan
from .current_relational_core import CurrentRelationalCoreV12
from .history_admission import HistoryAdmissionBridgeV12
from .process_archive import ProcessArchive
from .runtime import ApplicationReceipt, CurrentFlowExecutorV12, ExecutionJournal


class SyntheticGateway:
    def __init__(self):
        self.epoch, self.tau = 1, 20.0
        self.applied = {}

    def capture(self):
        observation = PresentObservation(self.epoch, 2, True, 12, .8, 'vehicle', 0, 2)
        return CurrentFrame(observation, self.tau, f'revision-{self.epoch}', (
            CurrentEvidence('current:lane-open', 'local_heading_error_deg', 0, self.tau, self.tau),
            CurrentEvidence('current:front-relation', 'front_present', True, self.tau, self.tau),
        ))

    def apply_if_current(self, realization, *, expected_revision, idempotency_key):
        if expected_revision != f'revision-{self.epoch}':
            return ApplicationReceipt(False, self.tau, reason='current relation changed')
        if idempotency_key in self.applied:
            return self.applied[idempotency_key]
        self.tau += .05
        receipt = ApplicationReceipt(True, self.tau, f'synthetic-application-{self.epoch}')
        self.applied[idempotency_key] = receipt
        return receipt


def run():
    baseline = old.build_core()
    core = CurrentRelationalCoreV12(**{name: getattr(baseline, name) for name in (
        'relation_builder', 'candidate_provider', 'relation_operator', 'reconstruction_operator',
        'responsibility_operator', 'choice_operator', 'actuation_operator')})
    with tempfile.TemporaryDirectory() as directory:
        archive = ProcessArchive(Path(directory)/'process.sqlite')
        journal = ExecutionJournal(Path(directory)/'execution.sqlite')
        port = SyntheticGateway()
        executor = CurrentFlowExecutorV12(core, journal, authorize=lambda obs, proposed: True)
        budget = ResourcePlan(1, 1, 1, 'synthetic work unit', 'wiring fixture only', ())
        first = executor.execute(port, run_id='wiring', subject_id='one', resource_plan=budget, deadline_tau=21)
        selected = journal.inspect('["wiring","one",1]')['selection']['proposal']['selected_possibility_id']
        observed = ObservedOccurrence('actual-observation-1', 20.1, 20.1,
                                      'relation persisted until observed boundary', 'synthetic-gateway')
        entry = HistoryEntry(
            entry_id='E1', decision_tau=20, realized_tau=first.observed_at_tau,
            outcome_tau=20.1, relation_end_tau=20.2, selected_possibility_id=selected,
            realization_ref=first.realization_ref, realization_count=1,
            outcome_description=observed.description, closure_method='synthetic observed relation boundary',
            closure_evidence={'occurrence_refs': [observed.occurrence_id], 'unresolved': ['later effects unknown']})
        admitted = HistoryAdmissionBridgeV12(core, old.ClosedRelationExtractor(), archive).admit(
            entry, known_at_tau=20.2, occurrences=(observed,),
            relation_occurrence_refs={'closed-front-approach': (observed.occurrence_id,)})
        port.epoch, port.tau = 2, 21
        second = executor.execute(port, run_id='wiring', subject_id='one', resource_plan=budget, deadline_tau=22)
        participation = core.open_current_epoch(port.capture()).role_trace_by_relation
        earlier = archive.view('E1', as_of_tau=21)
        archive.append_observation('E1', ObservedOccurrence('later-observation', 25, 30,
            'a related outcome became observable later', 'synthetic-gateway'), reason='later association, causality unproven')
        assert archive.view('E1', as_of_tau=21) == earlier
        assert first.applied and second.applied and len(admitted) == 1 and participation
        result = {'wiring': 'PASS', 'experimental_evidence': False,
                  'application_count': len(port.applied), 'completed_experiences': len(admitted),
                  'next_epoch_participation': [list(key) for key in participation],
                  'late_observation_preserves_earlier_view': True,
                  'real_carla_execution': 'BLOCKED_UNTIL_DOMAIN_POLICY_ADMISSION'}
        archive.close()
        journal.close()
        return result


if __name__ == '__main__':
    print(json.dumps(run(), ensure_ascii=False, indent=2))
