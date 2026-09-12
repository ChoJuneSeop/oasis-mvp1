"""보완 계약 회귀 검사 / contract regression, not OASIS efficacy experiments."""
from copy import deepcopy
from dataclasses import replace
import json
from pathlib import Path
import tempfile
import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.reconstruction import ProvenanceLink
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder
from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError, ReconstructionResult, PossibilityCandidate, RelationContribution,
)
from research.oasis_core_v11.test_current_relational_core import (
    make_core as legacy_core, history_record, observation,
)
from .contracts import (
    CurrentFrame, CurrentEvidence, CompletedProcess, ObservedOccurrence, HistoricalEnvelope,
    AxisObservationV12, ReconstructionObservationV12, ResourcePlan,
)
from .current_relational_core import CurrentRelationalCoreV12
from .process_archive import ProcessArchive
from .runtime import (
    ApplicationReceipt, CurrentFlowExecutorV12, ExecutionJournal, StaleDecision, DuplicateDispatch,
)


def frame(tau=20.0, epoch=10, revision='present-1'):
    obs = replace(observation(), epoch=epoch)
    return CurrentFrame(obs, tau, revision, (
        CurrentEvidence('obs:current-lane', 'local_heading_error_deg', 0.0, tau, tau),
        CurrentEvidence('obs:front-relation', 'front_present', True, tau, tau),
    ))


def occurrence(identity='event-1', at=1.0, received=1.0):
    return ObservedOccurrence(identity, at, received, 'relation persisted', 'gateway:observed')


def envelope(exp='E-1', at=2.0, known=2.0, shared=None):
    item = shared or occurrence(exp + ':event')
    process = CompletedProcess(exp, 0.0, at, known, (item,),
                               'observed approach process', 'evidenced relation boundary',
                               (item.occurrence_id,), ('later effects not yet known',))
    return HistoricalEnvelope(history_record(exp, 'r1', at), process, (item.occurrence_id,))


def make_core(history=(), **overrides):
    old = legacy_core(())
    args = {name: getattr(old, name) for name in (
        'relation_builder', 'candidate_provider', 'relation_operator', 'reconstruction_operator',
        'responsibility_operator', 'choice_operator', 'actuation_operator')}
    # Keep synthetic numeric values visibly synthetic; supply named current evidence.
    base_responsibility = args['responsibility_operator']
    class Responsibility:
        def evaluate(self, **kw):
            value = base_responsibility.evaluate(**kw)
            return replace(value, evidence={'domain_visibility': ('obs:front-relation',)})
    args['responsibility_operator'] = Responsibility()
    args.update(overrides)
    return CurrentRelationalCoreV12(history=history, **args)


def resource_plan():
    return ResourcePlan(10, 4, 4, 'synthetic work units', 'current deadline limits verification',
                        ('longer verification unfinished',))


class FakeLivePort:
    """Test double only. Atomic revision/idempotency logic belongs in the real gateway."""
    def __init__(self, initial=None):
        self.frame = initial or frame()
        self.capture_count = 0
        self.calls = []
        self.advance_on_second_capture = False
        self.change_at_apply = False
        self.fail_after_apply = False

    def capture(self):
        self.capture_count += 1
        if self.advance_on_second_capture and self.capture_count == 2:
            self.frame = frame(tau=21, epoch=self.frame.observation.epoch, revision='present-2')
        return self.frame

    def apply_if_current(self, realization, *, expected_revision, idempotency_key):
        if self.change_at_apply:
            self.frame = frame(tau=21, revision='present-2')
        if expected_revision != self.frame.revision:
            return ApplicationReceipt(False, self.frame.tau, reason='premises changed atomically at apply')
        if idempotency_key in self.calls:
            raise AssertionError('duplicate actuator call')
        self.calls.append(idempotency_key)
        if self.fail_after_apply:
            raise TimeoutError('acknowledgement lost after application')
        return ApplicationReceipt(True, self.frame.tau, 'actual-' + idempotency_key)


class SupplementTests(unittest.TestCase):
    def test_late_received_history_is_not_available_in_earlier_decision(self):
        late = envelope(known=30)
        core = make_core((late,))
        before = core.open_current_epoch(frame(20))
        after = core.open_current_epoch(frame(30))
        self.assertFalse(before.relation_elements)
        self.assertTrue(after.role_trace_by_relation)
        self.assertFalse(core.open_current_epoch(frame(20)).relation_elements)

    def test_future_completion_excluded_before_any_relation_operator_call(self):
        core = make_core((envelope(at=30, known=30),))
        core.open_current_epoch(frame(20))
        self.assertEqual(core.relation_operator.seen_past_objects, [])

    def test_epoch_index_is_not_silently_used_as_tau(self):
        core = make_core((envelope(at=30, known=30),))
        self.assertFalse(core.open_current_epoch(frame(20, epoch=1000)).relation_elements)

    def test_unbound_observation_rejected(self):
        with self.assertRaises(CoreV11InvariantError):
            make_core().open_epoch(observation())

    def test_future_received_current_evidence_rejected(self):
        f = frame()
        with self.assertRaises(CoreV11InvariantError):
            replace(f, evidence=(replace(f.evidence[0], received_at_tau=21),))

    def test_unapproved_observation_evidence_rejected(self):
        with self.assertRaises(CoreV11InvariantError):
            replace(frame(), evidence=(CurrentEvidence('future', 'scenario_label', 'good', 20, 20),))

    def test_fabricated_current_candidate_anchor_rejected(self):
        class Provider:
            def candidates(self, *args):
                return (PossibilityCandidate('x', ('made-up-current-evidence',)),)
        with self.assertRaises(CoreV11InvariantError):
            make_core(candidate_provider=Provider()).open_current_epoch(frame())

    def test_absent_current_relation_anchor_rejected(self):
        class BadRelation:
            def relate(self, **kw):
                return (RelationContribution('yield', ('absent',), ('dynamic-role',)),)
        with self.assertRaises(CoreV11InvariantError):
            make_core((envelope(),), relation_operator=BadRelation()).open_current_epoch(frame())

    def test_history_is_append_only_and_batch_failure_is_atomic(self):
        first = envelope()
        core = make_core((first,))
        conflict = replace(first, record=replace(first.record,
                           semantic=replace(first.record.semantic, relation_state='overwritten')))
        with self.assertRaises(CoreV11InvariantError):
            core.add_history_batch((envelope('E-2'), conflict))
        self.assertEqual(len(core.history_envelopes()), 1)
        core.add_history(first)  # exact replay is idempotent
        self.assertEqual(len(core.history_envelopes()), 1)

    def test_caller_mutation_cannot_rewrite_history(self):
        first = envelope()
        core = make_core((first,))
        first.record.semantic.environment_context['visibility'] = 'mutated'
        exposed = core.history_envelopes()[0]
        self.assertNotEqual(exposed.record.semantic.environment_context.get('visibility'), 'mutated')
        exposed.record.semantic.environment_context['visibility'] = 'also-mutated'
        self.assertNotEqual(core.history_envelopes()[0].record.semantic.environment_context.get('visibility'), 'also-mutated')

    def test_shared_occurrence_not_counted_twice(self):
        item = occurrence()
        one = make_core((envelope('E-a', shared=item),)).open_current_epoch(frame())
        two = make_core((envelope('E-a', shared=item), envelope('E-b', shared=item))).open_current_epoch(frame())
        self.assertEqual(one.possibility_distribution, two.possibility_distribution)
        self.assertEqual(len(two.role_trace_by_relation), 2)

    def test_shared_occurrence_with_conflicting_content_rejected(self):
        a = envelope(shared=occurrence())
        b = envelope('E-2', shared=replace(occurrence(), description='contradictory record'))
        with self.assertRaises(CoreV11InvariantError):
            make_core((a,b))

    def test_unknown_axis_is_not_zero(self):
        axis = AxisObservationV12(None, 'comparison-v1', unavailable_reason='missing correspondence observation')
        self.assertIsNone(axis.value)
        with self.assertRaises(CoreV11InvariantError):
            AxisObservationV12(None, 'comparison-v1')
        self.assertEqual(AxisObservationV12(0.0, 'comparison-v1', ('evidence',)).value, 0)

    def test_reconstruction_without_provenance_is_rejected(self):
        class BadReconstruction:
            def reconstruct(self, **kw):
                return ReconstructionResult((PossibilityCandidate('new', ('obs:current-lane',)),))
        with self.assertRaises(CoreV11InvariantError):
            make_core(reconstruction_operator=BadReconstruction()).open_current_epoch(frame())

    def test_reconstruction_with_unknown_axis_integrates_with_existing_sidecar(self):
        past = envelope()
        unknown = AxisObservationV12(None, 'comparison-v1', unavailable_reason='not measured')
        measurement = ReconstructionObservationV12('new', 20, (
            ProvenanceLink(past.record.source, 0, ('current-derived-role',), ('new',)),
        ), unknown, unknown, unknown, 'original sourced relation vs current construction', ('r1 -> current-front',))
        class Reconstruction:
            def reconstruct(self, *, contributions, **kw):
                if not contributions:
                    return ReconstructionResult()
                return ReconstructionResult((PossibilityCandidate('new', ('obs:current-lane',)),), (measurement,))
        core = make_core((past,), reconstruction_operator=Reconstruction())
        view = core.open_current_epoch(frame())
        before = deepcopy(core.history_envelopes())
        ablated = core.ablate_relation(frame().observation, past.record.source)
        self.assertNotIn('new', ablated)
        self.assertEqual(before, core.history_envelopes())
        recorder = G32EpochRecorder(20, 'snapshot', {}, view.relation_elements, view.possibility_distribution)
        recorder.record_relation_probe(past.record.source, before_fingerprint='snapshot', after_fingerprint='snapshot',
            relation_ablated_distribution=ablated, role_trace=view.role_trace_by_relation[('E-1','r1')])
        recorder.record_reconstruction(measurement)
        self.assertEqual(recorder.decision_record()['reconstruction'][0]['recombination']['value'], None)
        self.assertIn('current-derived-role', view.role_trace_by_relation[('E-1','r1')])

    def test_additional_responsibility_needs_named_evidence(self):
        bad = legacy_core(()).responsibility_operator
        with self.assertRaises(CoreV11InvariantError):
            make_core(responsibility_operator=bad).open_current_epoch(frame())

    def test_exported_distribution_cannot_mutate_pending_choice(self):
        core = make_core((envelope(),))
        view = core.open_current_epoch(frame())
        original = dict(core._last_evaluation.possibility_distribution)
        view.possibility_distribution['yield'] = 999
        self.assertEqual(core._last_evaluation.possibility_distribution, original)

    def test_additional_responsibility_rejects_unregistered_evidence(self):
        base = make_core().responsibility_operator
        class BadEvidence:
            def evaluate(self, **kw):
                return replace(base.evaluate(**kw), evidence={'domain_visibility': ('fabricated',)})
        with self.assertRaises(CoreV11InvariantError):
            make_core(responsibility_operator=BadEvidence()).open_current_epoch(frame())

    def test_resource_shortfall_is_explicit_and_bounded(self):
        self.assertLess(resource_plan().allocated, resource_plan().required)
        with self.assertRaises(CoreV11InvariantError):
            replace(resource_plan(), allocated=5)
        with self.assertRaises(CoreV11InvariantError):
            replace(resource_plan(), unverified=())

    def test_no_change_completion_and_delayed_observation_preserve_past_view(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = ProcessArchive(Path(tmp)/'history.sqlite')
            process = envelope().completion
            archive.complete(process)
            before = archive.view('E-1', as_of_tau=20)
            archive.append_observation('E-1', occurrence('delayed', at=4, received=30), reason='later observed relation')
            self.assertEqual(before, archive.view('E-1', as_of_tau=20))
            self.assertEqual(len(archive.view('E-1', as_of_tau=30)['additions']), 1)
            self.assertEqual(before['original'], archive.view('E-1', as_of_tau=30)['original'])
            archive.close()
            reopened = ProcessArchive(Path(tmp)/'history.sqlite')
            self.assertEqual(len(reopened.view('E-1', as_of_tau=30)['additions']), 1)
            reopened.close()

    def test_unobserved_closure_and_duplicate_occurrence_rewrite_rejected(self):
        with self.assertRaises(CoreV11InvariantError):
            replace(envelope().completion, closure_evidence_refs=('unobserved',))
        archive = ProcessArchive(':memory:')
        archive.complete(envelope().completion)
        with self.assertRaises(CoreV11InvariantError):
            archive.complete(replace(envelope().completion, scope_description='changed original'))
        archive.close()

    def test_stale_decision_does_not_dispatch_and_can_be_rebuilt(self):
        journal = ExecutionJournal(':memory:')
        executor = CurrentFlowExecutorV12(make_core(), journal, authorize=lambda *a: True)
        port = FakeLivePort()
        port.advance_on_second_capture = True
        with self.assertRaises(StaleDecision):
            executor.execute(port, run_id='r', subject_id='s', resource_plan=resource_plan(), deadline_tau=25)
        self.assertFalse(port.calls)
        receipt = executor.execute(port, run_id='r', subject_id='s', resource_plan=resource_plan(), deadline_tau=25)
        self.assertTrue(receipt.applied)
        journal.close()

    def test_atomic_apply_detects_change_after_last_capture(self):
        journal = ExecutionJournal(':memory:')
        port = FakeLivePort()
        port.change_at_apply = True
        receipt = CurrentFlowExecutorV12(make_core(), journal, authorize=lambda *a: True).execute(
            port, run_id='r', subject_id='s', resource_plan=resource_plan(), deadline_tau=25)
        self.assertFalse(receipt.applied)
        self.assertFalse(port.calls)
        journal.close()

    def test_restart_after_uncertain_application_cannot_repeat_action(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'execution.sqlite'
            journal = ExecutionJournal(path)
            port = FakeLivePort()
            port.fail_after_apply = True
            args = dict(run_id='r', subject_id='s', resource_plan=resource_plan(), deadline_tau=25)
            executor = CurrentFlowExecutorV12(make_core(), journal, authorize=lambda *a: True)
            with self.assertRaises(TimeoutError):
                executor.execute(port, **args)
            self.assertEqual(len(port.calls), 1)
            journal.close()
            reopened = ExecutionJournal(path)
            with self.assertRaises(DuplicateDispatch):
                CurrentFlowExecutorV12(make_core(), reopened, authorize=lambda *a: True).execute(port, **args)
            self.assertEqual(len(port.calls), 1)
            self.assertIsNone(reopened.inspect('["r","s",10]')['receipt'])
            reopened.close()

    def test_authority_and_deadline_are_checked_before_dispatch(self):
        for authorize, deadline in ((lambda *a: False, 25), (lambda *a: True, 19)):
            journal = ExecutionJournal(':memory:')
            port = FakeLivePort()
            with self.assertRaises(CoreV11InvariantError):
                CurrentFlowExecutorV12(make_core(), journal, authorize=authorize).execute(
                    port, run_id='r', subject_id='s', resource_plan=resource_plan(), deadline_tau=deadline)
            self.assertFalse(port.calls)
            journal.close()

    def test_separate_subjects_can_act_in_same_world_epoch(self):
        journal = ExecutionJournal(':memory:')
        port = FakeLivePort()
        executor = CurrentFlowExecutorV12(make_core(), journal, authorize=lambda *a: True)
        for subject in ('one','two'):
            self.assertTrue(executor.execute(port, run_id='r', subject_id=subject,
                resource_plan=resource_plan(), deadline_tau=25).applied)
        self.assertEqual(len(port.calls), 2)
        journal.close()


if __name__ == '__main__':
    unittest.main()
