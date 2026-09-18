from __future__ import annotations
import unittest
from .scenario import build_pilot_world,build_confirmatory_world
from .runner import run_runtime
from .evaluator import evaluate

class Preexec(unittest.TestCase):
    def test_matrix_sizes_and_operational_family_variation_are_frozen(self):
        self.assertEqual(len(build_pilot_world()),15)
        c=build_confirmatory_world()
        self.assertEqual(len(c),60)
        self.assertEqual({x.runtime.initial_scope for x in c},{1,2,3,4})

    def test_pilot_is_structural_only_and_general_has_no_cbra(self):
        cases=build_pilot_world(); r=evaluate(cases,run_runtime(cases),scientific=False)
        self.assertFalse(r["scientific_evaluator_used"]); self.assertNotIn("metrics",r)
        s=r["structural"]
        self.assertTrue(s["fresh_process"])
        self.assertTrue(s["governance_checkpoint_contract"])
        self.assertTrue(s["general_harness_has_no_cbra"])
        self.assertTrue(s["as_of_gate_present"])
        self.assertFalse(s["counterfactual_claimed"])

if __name__=="__main__": unittest.main()
