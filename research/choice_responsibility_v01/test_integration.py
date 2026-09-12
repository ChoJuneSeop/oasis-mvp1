"""통합 경로 회귀 검사 / integration regressions, not scientific experiments."""
from dataclasses import replace
from pathlib import Path
import tempfile
import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.reconstruction import ProvenanceLink
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError, ReconstructionResult
from research.oasis_core_v12.contracts import AxisObservationV12, ReconstructionObservationV12
from research.oasis_core_v12.test_supplement import envelope
from research.oasis_core_v12.synthetic_integrated_flow import SyntheticGateway
from research.oasis_core_v12.runtime import DuplicateDispatch, StaleDecision
from .example import build_core, resources, ExampleAssessment, ExampleVerifier, run
from .integration import CurrentCondition, NoAdmissibleChoice
from .runtime import IntegratedFlowExecutor
from .trajectory import TrajectoryJournal


def decide(core, budget):
    gateway = SyntheticGateway()
    f = gateway.capture()
    core.open_current_epoch(f)
    core.bind_current_resources(resources(budget))
    return core.realize(f.observation)


class IntegrationTests(unittest.TestCase):
    def test_same_current_distribution_different_unverified_responsibility_changes_choice(self):
        low, high = build_core(), build_core()
        self.assertEqual(decide(low, 1).selected_possibility_id, 'yield')
        self.assertEqual(decide(high, 2).selected_possibility_id, 'proceed')
        self.assertEqual(low._last_context.inputs.evaluation.possibility_distribution,
                         high._last_context.inputs.evaluation.possibility_distribution)
        self.assertEqual(len(low._last_context.verification.omega), 1)
        self.assertEqual(len(high._last_context.verification.omega), 0)

    def test_verification_spent_is_measured_separately_from_allocated(self):
        class FastVerifier(ExampleVerifier):
            def verify(self, **kw):
                return replace(super().verify(**kw), spent_work=.25)
        core = build_core(verifier=FastVerifier())
        decide(core, 2)
        report = core._last_context.verification
        self.assertEqual((report.required_work, report.allocated_work, report.executed_work), (2,2,.5))

    def test_unresolved_is_not_zero_or_success(self):
        class Inconclusive(ExampleVerifier):
            def verify(self, **kw):
                return replace(super().verify(**kw), satisfied=None, explanation='current evidence insufficient')
        core = build_core(verifier=Inconclusive())
        self.assertEqual(decide(core, 2).selected_possibility_id,'yield')
        self.assertEqual(len(core._last_context.verification.omega),2)
        self.assertEqual(core._last_context.verification.executed_work,2)

    def test_missing_work_accounting_and_overrun_rejected(self):
        class Missing:
            def verify(self, **kw):
                return None
        class Overrun(ExampleVerifier):
            def verify(self, **kw):
                return replace(super().verify(**kw), spent_work=kw['work_limit']+1)
        for verifier in (Missing(),Overrun()):
            with self.assertRaises(CoreV11InvariantError):
                decide(build_core(verifier=verifier),2)

    def test_request_plan_mismatch_rejected(self):
        core=build_core()
        f=SyntheticGateway().capture()
        core.open_current_epoch(f)
        core.bind_current_resources(replace(resources(2),required=3))
        with self.assertRaises(CoreV11InvariantError):
            core.realize(f.observation)

    def test_stale_verification_and_fabricated_evidence_rejected(self):
        class BadRevision(ExampleVerifier):
            def verify(self, **kw):
                return replace(super().verify(**kw),revision='old-revision')
        class BadEvidence(ExampleVerifier):
            def verify(self, **kw):
                return replace(super().verify(**kw),evidence_refs=('not-observed',))
        for verifier in (BadRevision(),BadEvidence()):
            with self.assertRaises(CoreV11InvariantError):
                decide(build_core(verifier=verifier),2)

    def test_current_conditions_are_rebuilt_not_a_permanent_candidate_ban(self):
        class Changed(ExampleAssessment):
            def assess(self, **kw):
                return replace(super().assess(**kw),conditions=())
        core=build_core()
        self.assertEqual(decide(core,1).selected_possibility_id,'yield')
        core.assessment_operator=Changed()
        self.assertEqual(decide(core,1).selected_possibility_id,'proceed')
        self.assertTrue(core._last_context.verification.omega)

    def test_preference_cannot_bypass_current_unverified_execution_condition(self):
        class Bypass:
            def choose(self, **kw):
                return 'proceed'
        with self.assertRaises(CoreV11InvariantError):
            decide(build_core(preference_operator=Bypass()),1)

    def test_reconstruction_participation_and_uvit_reach_and_affect_choice(self):
        past=envelope()
        unknown=AxisObservationV12(None,'test-observation-v1',unavailable_reason='not measured')
        measurement=ReconstructionObservationV12('yield',20,(
            ProvenanceLink(past.record.source,0,('new-current-role',),('yield',)),),
            unknown,unknown,unknown,'original-to-current relation',('r1 -> current-front-closing',))
        class Reconstruction:
            def reconstruct(self, **kw):
                return ReconstructionResult(measurements=(measurement,))
        class Preference:
            def __init__(self):
                self.seen=None
            def choose(self, *,context,eligible_ids):
                self.seen=context
                return 'yield' if context.inputs.evaluation.reconstructions else 'proceed'
        pref=Preference()
        core=build_core(history=(past,),reconstruction_operator=Reconstruction(),preference_operator=pref)
        self.assertEqual(decide(core,2).selected_possibility_id,'yield')
        evaluation=pref.seen.inputs.evaluation
        self.assertTrue(evaluation.contributions)
        self.assertEqual(evaluation.reconstructions[0].vector,(None,None,None))
        self.assertEqual(evaluation.responsibilities['proceed'].impact,.3)
        self.assertTrue(pref.seen.verification.findings)
        self.assertTrue(pref.seen.assessment.conflicts)
        no_rec=build_core(history=(past,),preference_operator=Preference())
        self.assertEqual(decide(no_rec,2).selected_possibility_id,'proceed')

    def test_conflict_descriptors_are_open_and_not_choice_labels(self):
        class ArbitraryDescriptions(ExampleAssessment):
            def assess(self, **kw):
                a=super().assess(**kw)
                return replace(a,conflicts=tuple(replace(c,response_descriptors=('new-description','fifth-description')) for c in a.conflicts))
        core=build_core(history=(envelope(),),assessment_operator=ArbitraryDescriptions())
        self.assertEqual(decide(core,2).selected_possibility_id,'proceed')
        self.assertIn('fifth-description',core._last_context.assessment.conflicts[0].response_descriptors)

    def test_unknown_or_future_conflict_source_rejected(self):
        class BadConflict(ExampleAssessment):
            def assess(self, **kw):
                a=super().assess(**kw)
                return replace(a,conflicts=(replace(a.conflicts[0],past_sources=(RelationElementRef('ghost','r',999),)),))
        with self.assertRaises(CoreV11InvariantError):
            decide(build_core(history=(envelope(),),assessment_operator=BadConflict()),2)

    def test_no_admissible_choice_records_context_without_actuation(self):
        class AllNeedCheck(ExampleAssessment):
            def assess(self, **kw):
                a=super().assess(**kw)
                extra=CurrentCondition('current-yield-condition','yield',(a.requests[0].request_id,),False,
                                       'fixture currently requires the broader verification',('current:front-relation',))
                return replace(a,conditions=a.conditions+(extra,))
        core=build_core(assessment_operator=AllNeedCheck())
        journal=TrajectoryJournal(':memory:')
        port=SyntheticGateway()
        with self.assertRaises(NoAdmissibleChoice):
            IntegratedFlowExecutor(core,journal,authorize=lambda *a: True).execute(
                port,run_id='r',subject_id='s',resource_plan=resources(0),deadline_tau=21)
        self.assertFalse(port.applied)
        self.assertIsNone(journal.inspect('["r","s",1]'))
        report=journal.report(run_id='r',subject_id='s',as_of_tau=21)
        self.assertEqual(report['events'][0]['kind'],'no_current_choice')
        self.assertIsNone(report['global_outcome_classification'])
        journal.close()

    def test_stale_current_flow_prevents_integrated_dispatch(self):
        class Moving(SyntheticGateway):
            def __init__(self):
                super().__init__()
                self.calls=0
            def capture(self):
                self.calls+=1
                if self.calls==2:
                    self.epoch,self.tau=2,21
                return super().capture()
        port=Moving()
        journal=TrajectoryJournal(':memory:')
        with self.assertRaises(StaleDecision):
            IntegratedFlowExecutor(build_core(),journal,authorize=lambda *a: True).execute(
                port,run_id='r',subject_id='s',resource_plan=resources(1),deadline_tau=22)
        self.assertFalse(port.applied)
        journal.close()

    def test_responsibility_context_persists_across_restart_and_duplicate_is_blocked(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'journal.sqlite'
            journal=TrajectoryJournal(path)
            port=SyntheticGateway()
            args=dict(run_id='r',subject_id='s',resource_plan=resources(1),deadline_tau=21)
            IntegratedFlowExecutor(build_core(),journal,authorize=lambda *a: True).execute(port,**args)
            journal.close()
            journal=TrajectoryJournal(path)
            saved=journal.inspect('["r","s",1]')['selection']['decision_responsibility']
            self.assertTrue(saved['context']['verification']['omega'])
            with self.assertRaises(DuplicateDispatch):
                IntegratedFlowExecutor(build_core(),journal,authorize=lambda *a: True).execute(port,**args)
            journal.close()

    def test_complete_flow_includes_reentry_and_delayed_effect_without_four_way_judgment(self):
        result=run()
        self.assertTrue(result['responsibility_retained_through_completion'])
        self.assertTrue(result['source_linked_reentry'])
        self.assertTrue(result['delayed_observation_preserves_past'])
        self.assertIsNone(result['global_outcome_classification'])
        self.assertFalse(result['experimental_evidence'])


if __name__=='__main__':
    unittest.main()
