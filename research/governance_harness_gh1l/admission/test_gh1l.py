from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

from research.governance_harness_gh1l.admission.preflight import evaluate_gates
from research.governance_harness_gh1l.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh1l.runner.engine import LongHorizonRunner
from research.governance_harness_gh1l.scenario.generator import (
    SCENARIO_CLASSES, generate_long_world, runtime_stream,
)
from research.governance_harness_gh1l.scenario.prehistory import archive_hash, build_frozen_archive


class GH1LAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.archive = build_frozen_archive()
        cls.world = generate_long_world()
        cls.runtime = runtime_stream(cls.world)

    def test_01_prehistory_passed_real_closure(self):
        self.assertTrue(all(x.closure_entry_id for x in self.archive))
        self.assertEqual(len(self.archive), 6)

    def test_02_archive_hash_is_identical_for_all_arms(self):
        self.assertEqual(len({archive_hash(self.archive) for _ in ARMS}), 1)

    def test_03_all_required_scenario_classes_exist(self):
        self.assertEqual({x.truth.scenario_class for x in self.world}, set(SCENARIO_CLASSES))

    def test_04_evaluator_labels_do_not_enter_runtime(self):
        for _, row in self.runtime:
            self.assertFalse(FORBIDDEN_RUNTIME_KEYS.intersection(row))

    def test_05_matched_observation_has_different_history(self):
        pair = [x for x in self.world if x.truth.matched_pair_id == "MATCH-1"]
        self.assertEqual(len(pair), 2)
        self.assertEqual(pair[0].runtime.ego_speed_mps, pair[1].runtime.ego_speed_mps)
        self.assertEqual(pair[0].runtime.front_present, pair[1].runtime.front_present)
        self.assertNotEqual(pair[0].runtime.relation_id, pair[1].runtime.relation_id)

    def test_06_g1_no_gap_reads_nothing(self):
        runner = LongHorizonRunner(self.archive)
        decision = runner.decide("G1", *self.runtime[0])
        self.assertFalse(decision.gap)
        self.assertFalse(decision.archive_accessed)
        self.assertEqual((decision.scanned, decision.bytes_read), (0, 0))

    def test_07_g2_always_retrieves_but_selects(self):
        runner = LongHorizonRunner(self.archive)
        decision = runner.decide("G2", *self.runtime[0])
        self.assertTrue(decision.archive_accessed)
        self.assertLessEqual(len(decision.participants), len(decision.candidates))

    def test_08_g3_has_no_history(self):
        case = next(x for x in self.world if x.truth.scenario_class == "history-critical")
        decision = LongHorizonRunner(self.archive).decide("G3", case.frame_id, case.runtime.as_runtime_mapping())
        self.assertEqual(decision.candidates, ())
        self.assertEqual(decision.participants, ())

    def test_09_g4_all_candidates_participate_on_gap(self):
        case = next(x for x in self.world if x.truth.scenario_class == "history-critical")
        decision = LongHorizonRunner(self.archive).decide("G4", case.frame_id, case.runtime.as_runtime_mapping())
        self.assertTrue(decision.gap)
        self.assertEqual(decision.participants, decision.candidates)

    def test_10_g5_preserves_count_but_permutes_identity(self):
        case = next(x for x in self.world if x.truth.scenario_class == "history-critical")
        g1 = LongHorizonRunner(self.archive).decide("G1", case.frame_id, case.runtime.as_runtime_mapping())
        g5 = LongHorizonRunner(self.archive).decide("G5", case.frame_id, case.runtime.as_runtime_mapping())
        self.assertEqual(len(g1.participants), len(g5.participants))
        self.assertNotEqual(g1.participants, g5.participants)

    def test_11_same_experience_can_be_yes_then_no_by_context(self):
        critical = next(x for x in self.world if x.truth.scenario_class == "history-critical")
        reversal = next(x for x in self.world if x.truth.scenario_class == "context-reversal")
        yes = LongHorizonRunner(self.archive).decide("G1", critical.frame_id, critical.runtime.as_runtime_mapping())
        no = LongHorizonRunner(self.archive).decide("G1", reversal.frame_id, reversal.runtime.as_runtime_mapping())
        self.assertIn("P01", yes.participants)
        self.assertNotIn("P01", no.participants)

    def test_12_counterfactual_never_actuates(self):
        case = next(x for x in self.world if x.truth.scenario_class == "history-critical")
        result = LongHorizonRunner(self.archive).decide("G1", case.frame_id, case.runtime.as_runtime_mapping(), counterfactual=True)
        self.assertEqual(result.actuator_count, 0)
        self.assertIsNone(result.realized_action)

    def test_13_new_confirmatory_closure_is_not_reused(self):
        runner = LongHorizonRunner(self.archive)
        before = archive_hash(runner.archive)
        runner.record_confirmatory_closure("F9999")
        self.assertEqual(before, archive_hash(runner.archive))

    def test_14_confirmatory_runner_is_locked_before_pilot_count_freeze(self):
        root = Path(__file__).resolve().parents[3]
        proc = subprocess.run([sys.executable, "-m", "research.governance_harness_gh1l.runner.run_experiment",
                               "--stage", "confirmatory"], cwd=root, capture_output=True, text=True)
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("count freeze", proc.stderr)

    def test_15_all_preexecution_gates_pass(self):
        gates = evaluate_gates()
        self.assertTrue(all(x["pass"] for x in gates.values()), json.dumps(gates, indent=2))


if __name__ == "__main__":
    unittest.main()
