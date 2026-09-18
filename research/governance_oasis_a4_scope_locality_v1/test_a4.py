from __future__ import annotations

import unittest
from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from .design_spec import build_design
from .experiment import Arm, Context, cases, evaluate, preflight, run_case, run_workers

class A4Tests(unittest.TestCase):
    def test_design_gate(self):
        r=validate_design(build_design())
        self.assertTrue(r.proof_ready,r.unresolved_check_ids)

    def test_context_matrix_and_base_eligibility(self):
        cs=cases()
        self.assertEqual(len(cs),9)
        self.assertEqual({c.context for c in cs},set(Context))
        self.assertTrue(all(c.base_eligible for c in cs))

    def test_same_scope_legitimate_effect(self):
        for c in cases():
            if c.context is Context.SAME_SCOPE:
                self.assertFalse(run_case(Arm.SCOPE_LOCAL_PRODUCTION,c).participate)
                self.assertTrue(run_case(Arm.RECORD_ONLY,c).participate)

    def test_changed_scope_not_globally_suppressed(self):
        for c in cases():
            if c.context is Context.CHANGED_SCOPE:
                self.assertTrue(run_case(Arm.SCOPE_LOCAL_PRODUCTION,c).participate)
                self.assertFalse(run_case(Arm.SCOPE_GUARD_ABLATED,c).participate)

    def test_unrelated_relation_is_independently_eligible(self):
        for c in cases():
            if c.context is Context.UNRELATED_RELATION:
                self.assertTrue(run_case(Arm.SCOPE_LOCAL_PRODUCTION,c).participate)
                self.assertTrue(run_case(Arm.RECORD_ONLY,c).participate)
                self.assertFalse(run_case(Arm.SCOPE_GUARD_ABLATED,c).participate)

    def test_archive_never_deleted(self):
        self.assertTrue(all(r.archive_ce_present for rows in run_workers().values() for r in rows))

    def test_selected_realized_single(self):
        self.assertTrue(all(r.selected==r.realized and r.realization_count==1 for rows in run_workers().values() for r in rows))

    def test_preflight(self):
        design,gate=preflight()
        self.assertTrue(design.proof_ready,design.unresolved_check_ids)
        self.assertTrue(gate.freeze_ready,gate.unresolved_check_ids)

    def test_confirmatory_reference_result(self):
        r=evaluate(run_workers())
        self.assertEqual(r["outcome"],"SUPPORTS")
        self.assertEqual(r["production_inappropriate_global_exclusion_count"],0)
        self.assertEqual(r["guard_ablated_global_exclusion_count"],6)
        self.assertEqual(r["same_scope_effect_count"],3)

if __name__=="__main__":
    unittest.main()
