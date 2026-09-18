from __future__ import annotations
import unittest
from .scenario import build_pilot_world,build_confirmatory_world
from .runner import run_runtime
from .evaluator import evaluate

class Preexec(unittest.TestCase):
    def test_matrix_sizes_are_frozen(self):
        self.assertEqual(len(build_pilot_world()),15)
        self.assertEqual(len(build_confirmatory_world()),60)

    def test_pilot_is_structural_only(self):
        cases=build_pilot_world(); r=evaluate(cases,run_runtime(cases),scientific=False)
        self.assertFalse(r["scientific_evaluator_used"])
        self.assertNotIn("metrics",r)
        self.assertTrue(r["structural"]["fresh_process"])
        self.assertTrue(r["structural"]["checkpoint_exactly_one"])
        self.assertTrue(r["structural"]["as_of_gate_exactly_one"])
        self.assertFalse(r["structural"]["counterfactual_claimed"])

if __name__=="__main__": unittest.main()
