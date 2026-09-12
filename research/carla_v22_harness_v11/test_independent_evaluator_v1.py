import unittest

from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11, PresentObservation
from research.carla_v22_harness_v11.synthetic_dry_run import SyntheticFlow
from research.carla_v22_harness_v11.independent_evaluator_v1 import IndependentEvaluatorV1, EvaluatorInvariantError
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class EvaluatorTests(unittest.TestCase):
    def _execution(self):
        bundle=build_domain_bundle()
        flow=SyntheticFlow()
        execution=CanonicalHarnessV11(bundle.core).execute_decision_epoch(flow)
        return bundle, execution

    def test_open_relation_remains_pending_even_at_large_post_tau(self):
        bundle, execution=self._execution()
        evaluator=IndependentEvaluatorV1(bundle.closure_evaluator)
        evaluator.begin(execution)
        record=evaluator.observe_post(post_observation=execution.observation, post_tau=9999.0)
        self.assertFalse(record.closed)
        self.assertIsNone(record.history_entry)
        self.assertTrue(evaluator.has_pending_relation)

    def test_front_absence_closes_and_history_can_be_admitted(self):
        bundle, execution=self._execution()
        evaluator=IndependentEvaluatorV1(bundle.closure_evaluator)
        evaluator.begin(execution)
        o=execution.observation
        post=PresentObservation(o.epoch+1,o.ego_speed_mps,False,0.0,0.0,'none',o.local_heading_error_deg,o.local_density)
        record=evaluator.observe_post(post_observation=post,post_tau=10.20)
        self.assertTrue(record.closed)
        self.assertIsNotNone(record.history_entry)
        admitted=bundle.history_admission.admit(record.history_entry)
        self.assertEqual(len(admitted),1)
        self.assertFalse(evaluator.has_pending_relation)

    def test_post_observation_before_decision_is_rejected(self):
        bundle, execution=self._execution()
        evaluator=IndependentEvaluatorV1(bundle.closure_evaluator)
        evaluator.begin(execution)
        with self.assertRaises(EvaluatorInvariantError):
            evaluator.observe_post(post_observation=execution.observation,post_tau=execution.tau-0.1)

if __name__=='__main__': unittest.main()
