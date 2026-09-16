from __future__ import annotations

import json
import unittest
from pathlib import Path

from research.governance_harness_gh2.admission.preflight import evaluate_gates
from research.governance_harness_gh2.models import ARMS
from research.governance_harness_gh2.responsibility import current_trace, permuted_trace, stale_trace
from research.governance_harness_gh2.runner import evaluate_block
from research.governance_harness_gh2.scenario import build_world
from research.governance_harness_v01.harness_v04 import ParticipatingExperienceView
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class GH2AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = build_world(8201)

    def _view(self, case):
        core = build_domain_bundle().core
        view = core.open_epoch(case.runtime.observation, 9000.0, ParticipatingExperienceView(()))
        return core, view

    def test_01_same_observation_with_opposite_truth_by_context(self):
        for pair in ("PAIR-U", "PAIR-I", "PAIR-V", "PAIR-T"):
            items = [x for x in self.world if x.truth.pair_id == pair]
            self.assertEqual(len(items), 2)
            self.assertEqual(items[0].runtime.observation, items[1].runtime.observation)
            self.assertNotEqual(items[0].truth.expected_action, items[1].truth.expected_action)

    def test_02_actual_core_candidates_are_frozen(self):
        _, view = self._view(self.world[0])
        self.assertEqual(tuple(view.possibility_distribution), ("continue-flow", "yield-space"))

    def test_03_responsibility_is_after_actual_possibilities(self):
        _, view = self._view(self.world[0])
        trace = current_trace(tuple(view.possibility_distribution), view.possibility_distribution, self.world[0].runtime.responsibility_context)
        self.assertEqual({x.candidate_id for x in trace.profiles}, set(view.possibility_distribution))

    def test_04_no_scalar_responsibility_field(self):
        _, view = self._view(self.world[0])
        trace = current_trace(tuple(view.possibility_distribution), view.possibility_distribution, self.world[0].runtime.responsibility_context)
        for profile in trace.profiles:
            self.assertTrue(all(isinstance(axis, frozenset) for axis in profile.axes()))
            self.assertFalse(hasattr(profile, "score"))

    def test_05_context_reversal_changes_current_responsibility_selection(self):
        critical, relief = self.world[0], self.world[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        a = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        b = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertEqual(a.responsibility_selected, "yield-space")
        self.assertEqual(b.responsibility_selected, "continue-flow")

    def test_06_permutation_preserves_axis_shape_but_changes_identity(self):
        case = self.world[0]
        _, view = self._view(case)
        ids = tuple(view.possibility_distribution)
        base = current_trace(ids, view.possibility_distribution, case.runtime.responsibility_context)
        perm = permuted_trace(base, view.possibility_distribution)
        self.assertEqual(tuple(x.candidate_id for x in base.profiles), tuple(x.candidate_id for x in perm.profiles))
        self.assertNotEqual(base.profiles, perm.profiles)

    def test_07_stale_control_reuses_previous_context_only(self):
        critical, relief = self.world[0], self.world[1]
        _, view = self._view(critical)
        ids = tuple(view.possibility_distribution)
        prior = current_trace(ids, view.possibility_distribution, critical.runtime.responsibility_context)
        stale = stale_trace(prior, ids, view.possibility_distribution)
        current = current_trace(ids, view.possibility_distribution, relief.runtime.responsibility_context)
        self.assertNotEqual(stale.responsibility_selected, current.responsibility_selected)
        self.assertEqual(stale.source, "stale")

    def test_08_all_arms_run_in_fresh_processes(self):
        block = evaluate_block(8201)
        pids = [v["pid"] for v in block["arms"].values()]
        tokens = [v["worker_token"] for v in block["arms"].values()]
        self.assertEqual(set(block["arms"]), set(ARMS))
        self.assertEqual(len(pids), len(set(pids)))
        self.assertEqual(len(tokens), len(set(tokens)))

    def test_09_r1_selected_equals_realized_for_every_frame(self):
        block = evaluate_block(8201)
        for d in block["arms"]["R1_CURRENT_BOUND"]["decisions"]:
            self.assertEqual(d["responsibility"]["responsibility_selected"], d["enacted_selected"])
            self.assertEqual(d["enacted_selected"], d["realized_action"])
            self.assertEqual(d["realization_count"], 1)

    def test_10_r2_is_explicit_record_only_ablation(self):
        block = evaluate_block(8201)
        decisions = block["arms"]["R2_RECORD_ONLY"]["decisions"]
        self.assertTrue(any(d["responsibility"]["responsibility_selected"] != d["enacted_selected"] for d in decisions))
        self.assertTrue(all(d["responsibility_bound"] is False for d in decisions))

    def test_11_r3_is_bound_to_permuted_profiles(self):
        block = evaluate_block(8201)
        decisions = block["arms"]["R3_PERMUTED"]["decisions"]
        self.assertTrue(all(d["responsibility"]["source"] == "permuted" for d in decisions))
        self.assertTrue(all(d["responsibility_bound"] is True for d in decisions))

    def test_12_r4_records_stale_source_after_first_frame(self):
        block = evaluate_block(8201)
        decisions = block["arms"]["R4_STALE"]["decisions"]
        self.assertIsNone(decisions[0]["stale_source_frame_id"])
        self.assertTrue(all(d["stale_source_frame_id"] for d in decisions[1:]))

    def test_13_selected_and_nonselected_obligations_are_present(self):
        block = evaluate_block(8201)
        for arm in ARMS:
            for d in block["arms"][arm]["decisions"]:
                self.assertTrue(d["responsibility"]["selected_obligations"])
                self.assertTrue(d["responsibility"]["nonselected_obligations"])

    def test_14_no_history_participation_confounds_candidates(self):
        first = self.world[0]
        core = build_domain_bundle().core
        a = core.open_epoch(first.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        core = build_domain_bundle().core
        b = core.open_epoch(first.runtime.observation, 10000.0, ParticipatingExperienceView(()))
        self.assertEqual(dict(a.possibility_distribution), dict(b.possibility_distribution))

    def test_15_r1_resolves_all_frozen_axis_pairs_in_structural_dry_run(self):
        block = evaluate_block(8201)
        self.assertEqual(block["arms"]["R1_CURRENT_BOUND"]["resolution_rate"], 1.0)

    def test_16_primary_ablation_diff_exists_before_experiment(self):
        block = evaluate_block(8201)
        self.assertGreater(
            block["arms"]["R1_CURRENT_BOUND"]["resolution_rate"],
            block["arms"]["R2_RECORD_ONLY"]["resolution_rate"],
        )

    def test_17_pilot_and_confirmatory_outputs_are_absent(self):
        here = Path(__file__).resolve().parents[1]
        self.assertFalse((here / "results" / "PILOT_RESULT.json").exists())
        self.assertFalse((here / "results" / "CONFIRMATORY_RESULT.json").exists())

    def test_18_freeze_manifest_says_experiment_not_executed(self):
        here = Path(__file__).resolve().parents[1]
        manifest = json.loads((here / "design" / "FREEZE_MANIFEST.json").read_text())
        self.assertIs(manifest["experiment_executed"], False)
        self.assertIsNone(manifest["aggregate_score"])

    def test_19_all_preexecution_gates_pass(self):
        gates = evaluate_gates()
        self.assertTrue(all(v["pass"] for v in gates.values()), json.dumps(gates, indent=2))


if __name__ == "__main__":
    unittest.main()
