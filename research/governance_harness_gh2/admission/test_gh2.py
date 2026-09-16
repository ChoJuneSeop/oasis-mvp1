from __future__ import annotations

import inspect
import json
import unittest
from pathlib import Path

from research.governance_harness_gh2.admission import preflight
from research.governance_harness_gh2.admission.preflight import evaluate_gates
from research.governance_harness_gh2.models import ARMS
from research.governance_harness_gh2.responsibility import current_trace, permuted_trace, stale_trace
from research.governance_harness_gh2.runner import dry_run, run_cases
from research.governance_harness_gh2.scenario import (
    CONFIRMATORY_AXIS_COMBINATIONS,
    OBSERVATION_FAMILIES,
    build_confirmatory_world,
    build_pilot_world,
)
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class GH2V11AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pilot = build_pilot_world()
        cls.confirmatory = build_confirmatory_world()

    def _view(self, case):
        core = build_domain_bundle().core
        view = core.open_epoch(case.runtime.observation, 9000.0, ParticipatingExperienceView(()))
        return core, view

    def test_01_pilot_is_four_single_axis_pairs(self):
        self.assertEqual(len(self.pilot), 8)
        self.assertEqual(len({x.truth.pair_id for x in self.pilot}), 4)

    def test_02_confirmatory_matrix_is_frozen_66_frames(self):
        self.assertEqual(len(CONFIRMATORY_AXIS_COMBINATIONS), 11)
        self.assertEqual(len(OBSERVATION_FAMILIES), 3)
        self.assertEqual(len(self.confirmatory), 66)
        self.assertEqual(len({x.truth.pair_id for x in self.confirmatory}), 33)

    def test_03_pilot_and_confirmatory_scenario_classes_are_disjoint(self):
        pilot = {x.truth.scenario_class for x in self.pilot}
        confirm = {x.truth.scenario_class for x in self.confirmatory}
        self.assertTrue(pilot.isdisjoint(confirm))

    def test_04_every_pair_is_matched_observation_with_opposite_contract(self):
        for world in (self.pilot, self.confirmatory):
            pairs = {}
            for case in world:
                pairs.setdefault(case.truth.pair_id, []).append(case)
            for items in pairs.values():
                self.assertEqual(len(items), 2)
                self.assertEqual(items[0].runtime.observation, items[1].runtime.observation)
                self.assertNotEqual(items[0].truth.expected_action, items[1].truth.expected_action)
                self.assertEqual(items[0].runtime.relation_id, items[1].runtime.relation_id)

    def test_05_confirmatory_contains_only_multi_axis_combinations(self):
        labels = {"".join(x) for x in CONFIRMATORY_AXIS_COMBINATIONS}
        self.assertEqual(labels, {"UI", "UV", "UT", "IV", "IT", "VT", "UIV", "UIT", "UVT", "IVT", "UIVT"})
        self.assertTrue(all(len(label) >= 2 for label in labels))

    def test_06_actual_core_candidate_contract_holds_for_all_observation_families(self):
        for _, observation in OBSERVATION_FAMILIES:
            core = build_domain_bundle().core
            view = core.open_epoch(observation, 9100.0, ParticipatingExperienceView(()))
            self.assertEqual(tuple(view.possibility_distribution), ("continue-flow", "yield-space"))

    def test_07_responsibility_is_computed_after_actual_candidates(self):
        case = self.pilot[0]
        _, view = self._view(case)
        ids = tuple(view.possibility_distribution)
        trace = current_trace(ids, view.possibility_distribution, case.runtime.responsibility_context)
        self.assertEqual({x.candidate_id for x in trace.profiles}, set(ids))

    def test_08_responsibility_has_no_scalar_score(self):
        case = self.pilot[0]
        _, view = self._view(case)
        trace = current_trace(tuple(view.possibility_distribution), view.possibility_distribution, case.runtime.responsibility_context)
        for profile in trace.profiles:
            self.assertTrue(all(isinstance(axis, frozenset) for axis in profile.axes()))
            self.assertFalse(hasattr(profile, "score"))

    def test_09_single_axis_context_reversal_changes_current_responsibility(self):
        critical, relief = self.pilot[0], self.pilot[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        a = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        b = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertEqual(a.responsibility_selected, "yield-space")
        self.assertEqual(b.responsibility_selected, "continue-flow")

    def test_10_permutation_preserves_shape_but_changes_candidate_identity(self):
        case = self.pilot[0]
        _, view = self._view(case)
        ids = tuple(view.possibility_distribution)
        base = current_trace(ids, view.possibility_distribution, case.runtime.responsibility_context)
        perm = permuted_trace(base, view.possibility_distribution)
        self.assertEqual(tuple(x.candidate_id for x in base.profiles), tuple(x.candidate_id for x in perm.profiles))
        self.assertNotEqual(base.profiles, perm.profiles)

    def test_11_stale_operator_itself_reuses_prior_profile(self):
        critical, relief = self.pilot[0], self.pilot[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        prior = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        stale = stale_trace(prior, ids, view.possibility_distribution)
        current = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertNotEqual(stale.responsibility_selected, current.responsibility_selected)
        self.assertEqual(stale.source, "stale")

    def test_12_r4_stale_state_is_pair_local_and_resets_between_pairs(self):
        block = run_cases(self.pilot)
        decisions = next(x for x in block["workers"] if x["arm"] == "R4_STALE")["decisions"]
        self.assertEqual(len(decisions), 8)
        for index in range(0, len(decisions), 2):
            critical, relief = decisions[index], decisions[index + 1]
            self.assertIsNone(critical["stale_source_frame_id"])
            self.assertEqual(relief["stale_source_frame_id"], critical["frame_id"])

    def test_13_all_arms_run_in_fresh_processes(self):
        block = run_cases(self.pilot)
        pids = [x["pid"] for x in block["workers"]]
        tokens = [x["worker_token"] for x in block["workers"]]
        self.assertEqual({x["arm"] for x in block["workers"]}, set(ARMS))
        self.assertEqual(len(pids), len(set(pids)))
        self.assertEqual(len(tokens), len(set(tokens)))

    def test_14_r1_selected_equals_realized_and_is_single_realization(self):
        block = run_cases(self.pilot)
        decisions = next(x for x in block["workers"] if x["arm"] == "R1_CURRENT_BOUND")["decisions"]
        for decision in decisions:
            self.assertEqual(decision["responsibility"]["responsibility_selected"], decision["enacted_selected"])
            self.assertEqual(decision["enacted_selected"], decision["realized_action"])
            self.assertEqual(decision["realization_count"], 1)

    def test_15_r2_is_record_only_ablation_without_asserting_effect_size(self):
        block = run_cases(self.pilot)
        decisions = next(x for x in block["workers"] if x["arm"] == "R2_RECORD_ONLY")["decisions"]
        self.assertTrue(all(decision["responsibility_bound"] is False for decision in decisions))

    def test_16_r3_is_bound_to_permuted_profiles(self):
        block = run_cases(self.pilot)
        decisions = next(x for x in block["workers"] if x["arm"] == "R3_PERMUTED")["decisions"]
        self.assertTrue(all(decision["responsibility"]["source"] == "permuted" for decision in decisions))
        self.assertTrue(all(decision["responsibility_bound"] is True for decision in decisions))

    def test_17_selected_and_nonselected_obligations_are_preserved(self):
        block = run_cases(self.pilot)
        for worker in block["workers"]:
            for decision in worker["decisions"]:
                self.assertTrue(decision["responsibility"]["selected_obligations"])
                self.assertTrue(decision["responsibility"]["nonselected_obligations"])

    def test_18_history_is_frozen_empty_for_candidate_generation(self):
        case = self.pilot[0]
        core = build_domain_bundle().core
        a = core.open_epoch(case.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        core = build_domain_bundle().core
        b = core.open_epoch(case.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        self.assertEqual(dict(a.possibility_distribution), dict(b.possibility_distribution))

    def test_19_dry_run_is_structural_only_and_contains_no_effect_metric(self):
        payload = dry_run()
        text = json.dumps(payload)
        self.assertEqual(payload["stage"], "dry-run-structural-only")
        self.assertIs(payload["experiment_executed"], False)
        self.assertTrue(payload["fresh_process"])
        self.assertNotIn("resolution_rate", text)
        self.assertNotIn("expected_action", text)
        self.assertNotIn("evaluator", text)

    def test_20_preflight_does_not_call_post_decision_evaluator(self):
        source = inspect.getsource(preflight)
        self.assertNotIn("evaluate_cases(", source)
        self.assertNotIn("resolution_rate", source)

    def test_21_manifest_freezes_count_before_pilot_and_rejects_seed_replication(self):
        here = Path(__file__).resolve().parents[1]
        manifest = json.loads((here / "design" / "FREEZE_MANIFEST.json").read_text())
        self.assertEqual(manifest["spec_version"], "GH2_EXPERIMENT_V1_1_PREEXECUTION")
        self.assertEqual(manifest["confirmatory_frames_per_arm"], 66)
        self.assertEqual(manifest["confirmatory_decision_realization_units"], 264)
        self.assertEqual(manifest["confirmatory_count_method"], "PRE_FROZEN_FINITE_MATRIX_NO_PILOT_DERIVATION")
        self.assertEqual(manifest["pilot_seeds"], [])
        self.assertIs(manifest["seed_is_experimental_factor"], False)
        self.assertIs(manifest["pilot_may_change_confirmatory_count"], False)

    def test_22_pilot_and_confirmatory_outputs_are_absent(self):
        here = Path(__file__).resolve().parents[1]
        self.assertFalse((here / "results" / "PILOT_RESULT.json").exists())
        self.assertFalse((here / "results" / "CONFIRMATORY_RESULT.json").exists())

    def test_23_all_preexecution_gates_pass(self):
        gates = evaluate_gates()
        self.assertTrue(all(value["pass"] for value in gates.values()), json.dumps(gates, indent=2))


if __name__ == "__main__":
    unittest.main()
