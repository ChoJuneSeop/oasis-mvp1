"""합성 연결 예제 / synthetic wiring only; no scientific or CARLA efficacy claim."""
from pathlib import Path
import tempfile
import json

from research.g3_2_sidecar.history import HistoryEntry
from research.oasis_core_v11 import synthetic_integrated_flow as legacy
from research.oasis_core_v12.synthetic_integrated_flow import SyntheticGateway
from research.oasis_core_v12.contracts import ObservedOccurrence, ResourcePlan
from research.oasis_core_v12.process_archive import ProcessArchive
from .integration import (
    IntegratedChoiceCore, ConflictTrace, VerificationRequest, CurrentCondition,
    ResponsibilityAssessment, VerificationFinding,
)
from .runtime import IntegratedFlowExecutor
from .trajectory import ResponsibilityHistoryBridge, TrajectoryJournal


class ExampleAssessment:
    """Fixture conditions are generated each epoch; not a universal OASIS risk rule."""
    def assess(self, *, inputs):
        evidence = ('current:front-relation',)
        candidates = tuple(c.possibility_id for c in inputs.evaluation.candidates)
        epoch = inputs.frame.observation.epoch
        front_id = f'front-check-{epoch}'
        conflicts = ()
        if inputs.evaluation.contributions:
            source = inputs.evaluation.contributions[0].source
            conflicts = (ConflictTrace(f'current-past-tension-{epoch}',
                tuple(r.relation_id for r in inputs.evaluation.current_relations), (source,),
                'Historical approach is compared with the current front relation; consequence remains open.',
                evidence, ('currently re-evaluating', 'other descriptors remain possible')),)
        requests = (
            VerificationRequest(f'extended-check-{epoch}', candidates,
                                'Inspect the current relation context', 1, evidence),
            VerificationRequest(front_id, ('proceed',),
                                'Is the present prerequisite for proceeding supported?', 1, evidence),
        )
        condition = CurrentCondition(f'present-proceed-condition-{epoch}', 'proceed', (front_id,), False,
                                     'This fixture requires a current front check before proceeding.', evidence)
        return ResponsibilityAssessment(requests, (condition,), conflicts,
                                        'Synthetic fixture: inspect context before checking the proceed prerequisite.')


class ExampleVerifier:
    def verify(self, *, request, inputs, work_limit):
        return VerificationFinding(request.request_id, True, 1, request.evidence_refs,
            'Fixture acknowledgement from current observation only; not driving-safety validation.', inputs.frame.revision)


class ExamplePreference:
    def choose(self, *, context, eligible_ids):
        # This explicit fixture preference is not promoted to the OASIS choice law.
        return 'proceed' if 'proceed' in eligible_ids else eligible_ids[0]


def build_core(**overrides):
    old = legacy.build_core()
    operators = {name: getattr(old, name) for name in (
        'relation_builder','candidate_provider','relation_operator','reconstruction_operator',
        'responsibility_operator','actuation_operator')}
    operators.update(assessment_operator=ExampleAssessment(), verifier=ExampleVerifier(),
                     preference_operator=ExamplePreference())
    operators.update(overrides)
    return IntegratedChoiceCore(**operators)


def resources(allocated):
    return ResourcePlan(2, allocated, allocated, 'synthetic work units',
                        'Current fixture availability', ('remaining domain uncertainty',))


def run():
    with tempfile.TemporaryDirectory() as tmp:
        core = build_core()
        journal = TrajectoryJournal(Path(tmp)/'flow.sqlite')
        archive = ProcessArchive(Path(tmp)/'process.sqlite')
        executor = IntegratedFlowExecutor(core, journal, authorize=lambda *args: True)
        gateway = SyntheticGateway()
        first = executor.execute(gateway, run_id='separate-integration', subject_id='one',
                                 resource_plan=resources(1), deadline_tau=21)
        first_key = '["separate-integration","one",1]'
        first_record = journal.inspect(first_key)
        first_choice = first_record['selection']['proposal']['selected_possibility_id']
        event = ObservedOccurrence('observed-after-choice',20.1,20.1,
            'Observed relation persisted until the evidenced boundary.', 'synthetic-gateway')
        entry = HistoryEntry('E-integrated-1',20,first.observed_at_tau,20.1,20.2,first_choice,
            first.realization_ref,1,event.description,closure_method='synthetic relational boundary',
            closure_evidence={'occurrence_refs': [event.occurrence_id]})
        bridge = ResponsibilityHistoryBridge(core, legacy.ClosedRelationExtractor(), archive, journal)
        bridge.admit(first_key,entry,known_at_tau=20.2,occurrences=(event,),
                     relation_occurrence_refs={'closed-front-approach': (event.occurrence_id,)})
        gateway.epoch,gateway.tau = 2,21
        executor.execute(gateway,run_id='separate-integration',subject_id='one',
                         resource_plan=resources(2),deadline_tau=22)
        second = journal.inspect('["separate-integration","one",2]')
        second_choice = second['selection']['proposal']['selected_possibility_id']
        assert second['selection']['decision_responsibility']['context']['inputs']['reentered_unresolved']
        before = journal.report(run_id='separate-integration',subject_id='one',as_of_tau=22)
        bridge.append_observation(first_key,'E-integrated-1',ObservedOccurrence(
            'late-followup',25,30,'A later related observation became available.','synthetic-gateway'),
            reason='Observed association; not established causality.')
        assert before == journal.report(run_id='separate-integration',subject_id='one',as_of_tau=22)
        report = journal.report(run_id='separate-integration',subject_id='one',as_of_tau=30)
        assert first_choice == 'yield' and second_choice == 'proceed'
        assert any(e['record'].get('reentered_from') for e in report['events'])
        result = {'process_id':'choice-responsibility-integration-v0.1','wiring':'PASS',
                  'first_choice_with_unresolved_prerequisite':first_choice,
                  'next_choice_after_current_verification':second_choice,
                  'responsibility_retained_through_completion':bool(core.history_envelopes()[0].completion.unresolved),
                  'source_linked_reentry':True,'delayed_observation_preserves_past':True,
                  'trajectory_event_count':len(report['events']), 'experimental_evidence':False,
                  'global_outcome_classification':None, 'real_carla_execution':'BLOCKED'}
        archive.close()
        journal.close()
        return result


if __name__ == '__main__':
    print(json.dumps(run(),ensure_ascii=False,indent=2))
