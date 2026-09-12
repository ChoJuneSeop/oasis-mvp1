import hashlib
import unittest
from research.choice_responsibility_v01.integration import IntegratedChoiceCore, ResponsibilityAssessment
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.contracts import ResourcePlan
from .frame import V12ResponsibilityEvidenceAdapter
from .selection import ParetoContextPreference
from .harness_adapter import CorePortAdapter, IntegratedHarness

class Assessment:
    def assess(self, *, inputs):
        return ResponsibilityAssessment((), (), (), 'no extra fixture verification')

class Verifier:
    def verify(self, **kwargs):
        return None

class Flow:
    def __init__(self):
        self.tau = 10.0
        self.applied = 0
        self.state = 0
    def current_tau(self):
        return self.tau
    def present_observation(self):
        return {
            'epoch': 1,
            'ego_speed_mps': 4.0,
            'front_present': True,
            'front_gap_m': 10.0,
            'front_closing_mps': 0.5,
            'front_kind': 'vehicle',
            'local_heading_error_deg': 0.0,
            'local_density': 2,
        }
    def current_reality(self):
        return {'fixture': 'current'}
    def flow_fingerprint(self):
        return hashlib.sha256(f'{self.tau}:{self.state}'.encode()).hexdigest()
    def apply_single_actuation(self, actuation):
        if self.applied:
            raise RuntimeError('duplicate application')
        self.applied += 1
        self.state += 1
        return 'fixture-realization-1'

def build_core():
    base = build_domain_bundle().core
    return IntegratedChoiceCore(
        assessment_operator=Assessment(), verifier=Verifier(), preference_operator=ParetoContextPreference(),
        relation_builder=base.relation_builder, candidate_provider=base.candidate_provider,
        relation_operator=base.relation_operator, reconstruction_operator=base.reconstruction_operator,
        responsibility_operator=V12ResponsibilityEvidenceAdapter(base.responsibility_operator),
        actuation_operator=base.actuation_operator,
    )

class HarnessAdapterTest(unittest.TestCase):
    def test_full_current_flow_wiring(self):
        core = build_core()
        harness = IntegratedHarness(CorePortAdapter(core))
        flow = Flow()
        execution = harness.execute_decision_epoch(
            flow,
            resources=ResourcePlan(0, 0, 0, 'work', 'fixture has no extra checks', ()),
        )
        self.assertEqual(flow.applied, 1)
        self.assertIn(execution.realization.selected_possibility_id, execution.recorder.possibility_distribution)
        record = core.responsibility_record()
        self.assertEqual(record['process_id'], 'choice-responsibility-integration-v0.1')
        self.assertEqual(record['context']['inputs']['evaluation']['tau'], 10.0)

if __name__ == '__main__':
    unittest.main()
