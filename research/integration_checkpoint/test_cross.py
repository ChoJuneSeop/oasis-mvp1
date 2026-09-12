import unittest
from research.choice_responsibility_v01.integration import IntegratedChoiceCore, ResponsibilityAssessment, VerificationFinding
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.contracts import ResourcePlan
from .frame import current_frame_from_host, V12ResponsibilityEvidenceAdapter
from .selection import ParetoContextPreference
from research.carla_v22_harness_v11.canonical_harness import PresentObservation

class Assessment:
    def assess(self, *, inputs):
        return ResponsibilityAssessment((), (), (), 'no extra fixture verification')

class Verifier:
    def verify(self, **kwargs):
        return None

class CrossWiringTest(unittest.TestCase):
    def test_latest_domain_operators_run_through_integrated_choice_core(self):
        base = build_domain_bundle().core
        core = IntegratedChoiceCore(
            assessment_operator=Assessment(), verifier=Verifier(), preference_operator=ParetoContextPreference(),
            relation_builder=base.relation_builder, candidate_provider=base.candidate_provider,
            relation_operator=base.relation_operator, reconstruction_operator=base.reconstruction_operator,
            responsibility_operator=V12ResponsibilityEvidenceAdapter(base.responsibility_operator),
            actuation_operator=base.actuation_operator,
        )
        obs = PresentObservation(1, 4.0, True, 10.0, 0.5, 'vehicle', 0.0, 2)
        frame = current_frame_from_host(obs, tau=10.0, revision='snapshot-1')
        view = core.open_current_epoch(frame)
        core.bind_current_resources(ResourcePlan(0, 0, 0, 'work', 'no fixture checks', ()))
        result = core.realize(obs)
        self.assertIn(result.selected_possibility_id, view.possibility_distribution)
        record = core.responsibility_record()
        self.assertEqual(record['process_id'], 'choice-responsibility-integration-v0.1')
        self.assertEqual(record['context']['inputs']['evaluation']['tau'], 10.0)

if __name__ == '__main__':
    unittest.main()
