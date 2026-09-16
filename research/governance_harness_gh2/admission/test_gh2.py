from __future__ import annotations

import json
import unittest
from pathlib import Path

from research.governance_harness_gh2.admission.preflight import evaluate_gates
from research.governance_harness_gh2.models import ARMS
from research.governance_harness_gh2.responsibility import current_trace, permuted_trace, stale_trace
from research.governance_harness_gh2.runner import dry_run, run_runtime
from research.governance_harness_gh2.scenario import (
    CONFIRMATORY_COMBOS,
    OBSERVATION_FAMILIES,
    PILOT_COMBOS,
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
        self.assertEqual(PILOT_COMBOS, (("U",), ("I",), ("V",), ("T",)))
        self.assertEqual(len(self.pilot), 8)

    def test_02_confirmatory_is_eleven_multi_axis_combinations(self):
        self.assertEqual(len(CONFIRMATORY_COMBOS), 11)
        self.assertTrue(all(len(combo) >= 2 for combo in CONFIRMATORY_COMBOS))
        self.assertEqual(len(self.confirmatory), 66)

    def test_03_pilot_and_confirmatory_classes_are_disjoint(self):
        a = {x.truth.scenario_class for x in self.pilot}
        b = {x.truth.scenario_class for x in self.confirmatory}
        self.assertTrue(a.isdisjoint(b))

    def test_04_confirmatory_uses_three_observation_families(self):
        self.assertEqual(len(OBSERVATION_FAMILIES), 3)
        self.assertEqual(len({x.runtime.observation for x in self.confirmatory}), 3)

    def test_05_each_pair_has_matched_observation_and_relation_id(self):
        by_pair = {}
        for case in self.pilot + self.confirmatory:
            by_pair.setdefault(case.truth.pair_id, []).append(case)
        self.assertEqual(len(by_pair), 37)
        for items in by_pair.values():
            self.assertEqual(len(items), 2)
            self.assertEqual(items[0].runtime.observation, items[1].runtime.observation)
            self.assertEqual(items[0].runtime.relation_id, items[1].runtime.relation_id)
            self.assertNotEqual(items[0].truth.expected_action, items[1].truth.expected_action)

    def test_06_actual_core_candidates_are_frozen_across_families(self):
        for observation in OBSERVATION_FAMILIES:
            core = build_domain_bundle().core
            view = core.open_epoch(observation, 9100.0, ParticipatingExperienceView(()))
            self.assertEqual(tuple(view.possibility_distribution), ("continue-flow", "yield-space"))

    def test_07_responsibility_is_after_actual_possibilities(self):
        _, view = self._view(self.pilot[0])
        trace = current_trace(tuple(view.possibility_distribution), view.possibility_distribution, self.pilot[0].runtime.responsibility_context)
        self.assertEqual({x.candidate_id for x in trace.profiles}, set(view.possibility_distribution))

    def test_08_no_scalar_responsibility_field(self):
        _, view = self._view(self.pilot[0])
        trace = current_trace(tuple(view.possibility_distribution), view.possibility_distribution, self.pilot[0].runtime.responsibility_context)
        for profile in trace.profiles:
            self.assertTrue(all(isinstance(axis, frozenset) for axis in profile.axes()))
            self.assertFalse(hasattr(profile, "score"))

    def test_09_context_reversal_changes_current_responsibility_selection(self):
        critical, relief = self.pilot[0], self.pilot[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        a = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        b = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertNotEqual(a.responsibility_selected, b.responsibility_selected)

    def test_10_permutation_preserves_candidate_ids_but_changes_profiles(self):
        case = self.pilot[0]
        _, view = self._view(case)
        ids = tuple(view.possibility_distribution)
        base = current_trace(ids, view.possibility_distribution, case.runtime.responsibility_context)
        perm = permuted_trace(base, view.possibility_distribution)
        self.assertEqual(tuple(x.candidate_id for x in base.profiles), tuple(x.candidate_id for x in perm.profiles))
        self.assertNotEqual(base.profiles, perm.profiles)

    def test_11_stale_control_can_reuse_same_pair_profile(self):
        critical, relief = self.pilot[0], self.pilot[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        prior = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        stale = stale_trace(prior, ids, view.possibility_distribution)
        current = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertNotEqual(stale.responsibility_selected, current.responsibility_selected)
        self.assertEqual(stale.source, "stale")

    def test_12_all_arms_run_in_fresh_processes(self):
        dry = dry_run()
        self.assertTrue(dry["fresh_process"])
        self.assertEqual(set(dry["arms"]), set(ARMS))

    def test_13_preflight_dry_run_has_no_evaluator_metric(self):
        dry = dry_run()
        self.assertFalse(dry["evaluator_used"])
        self.assertNotIn("resolution_rate", json.dumps(dry, sort_keys=True))

    def test_14_selected_equals_realized_and_single_realization(self):
        dry = dry_run()
        for item in dry["arms"].values():
            self.assertTrue(item["selected_equals_realized"])
            self.assertTrue(item["one_realization_per_decision"])
            self.assertEqual(item["decision_count"], 8)
            self.assertEqual(item["realization_count"], 8)

    def test_15_r4_stale_is_pair_local(self):
        raw = run_runtime(case.runtime for case in self.pilot)
        r4 = next(x for x in raw["workers"] if x["arm"] == "R4_STALE")
        decisions = r4["decisions"]
        for index, decision in enumerate(decisions):
            if index % 2 == 0:
                self.assertIsNone(decision["stale_source_frame_id"])
            else:
                self.assertEqual(decision["stale_source_frame_id"], decisions[index - 1]["frame_id"])

    def test_16_all_arms_preserve_candidate_set(self):
        raw = run_runtime(case.runtime for case in self.pilot)
        for worker in raw["workers"]:
            for decision in worker["decisions"]:
                self.assertEqual(tuple(decision["candidate_ids"]), ("continue-flow", "yield-space"))

    def test_17_selected_and_nonselected_obligations_are_present(self):
        raw = run_runtime(case.runtime for case in self.pilot)
        for worker in raw["workers"]:
            for decision in worker["decisions"]:
                self.assertTrue(decision["responsibility"]["selected_obligations"])
                self.assertTrue(decision["responsibility"]["nonselected_obligations"])

    def test_18_history_participation_is_empty_and_deterministic(self):
        case = self.pilot[0]
        core = build_domain_bundle().core
        a = core.open_epoch(case.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        core = build_domain_bundle().core
        b = core.open_epoch(case.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        self.assertEqual(dict(a.possibility_distribution), dict(b.possibility_distribution))

    def test_19_v11_outputs_absent_before_execution(self):
        here = Path(__file__).resolve().parents[1]
        self.assertFalse((here / "results" / "PILOT_RESULT_V1_1.json").exists())
        self.assertFalse((here / "results" / "CONFIRMATORY_RESULT_V1_1.json").exists())

    def test_20_manifest_freezes_finite_confirmatory_size_before_pilot(self):
        here = Path(__file__).resolve().parents[1]
        manifest = json.loads((here / "design" / "FREEZE_MANIFEST.json").read_text())
        design = manifest["confirmatory_design"]
        self.assertEqual(design["frames_per_arm"], 66)
        self.assertEqual(design["total_decision_realization_units"], 264)
        self.assertFalse(design["pilot_derived_count_freeze"])
        self.assertIs(manifest["experiment_executed"], False)
        self.assertIsNone(manifest["aggregate_score"])

    def test_21_all_preexecution_gates_pass(self):
        gates = evaluate_gates()
        self.assertTrue(all(v["pass"] for v in gates.values()), json.dumps(gates, indent=2))


if __name__ == "__main__":
    unittest.main()
