import unittest

from research.carla_v22_harness_v11.canonical_harness import (
    CanonicalHarnessV11,
    CoreEpochView,
    HarnessInvariantError,
    PresentObservation,
    Realization,
    VehicleActuation,
)
from research.carla_v22_harness_v11.synthetic_dry_run import (
    SyntheticCore,
    SyntheticFlow,
    run_dry_run,
)


class CanonicalHarnessTests(unittest.TestCase):
    def test_dry_run_passes_and_is_not_evidence(self):
        result = run_dry_run()
        self.assertEqual(result["dry_run"], "PASS")
        self.assertFalse(result["experimental_evidence"])
        self.assertEqual(result["apply_count"], 1)

    def test_observation_schema_rejects_future_or_scenario_field(self):
        flow = SyntheticFlow()
        original = flow.present_observation

        def leaked():
            data = original()
            data["scenario_label"] = "future-leak"
            return data

        flow.present_observation = leaked
        with self.assertRaises(HarnessInvariantError):
            CanonicalHarnessV11(SyntheticCore()).execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count, 0)

    def test_selected_possibility_must_exist_in_current_distribution(self):
        class BadCore(SyntheticCore):
            def realize(self, observation):
                return Realization(
                    "not-in-distribution",
                    VehicleActuation(throttle=0.0, brake=0.1, steer=0.0),
                )

        flow = SyntheticFlow()
        with self.assertRaises(HarnessInvariantError):
            CanonicalHarnessV11(BadCore()).execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count, 0)

    def test_present_observation_is_the_only_core_input_type(self):
        observation = PresentObservation.from_mapping(SyntheticFlow().present_observation())
        view = SyntheticCore().open_epoch(observation)
        self.assertIsInstance(view, CoreEpochView)


if __name__ == "__main__":
    unittest.main()
