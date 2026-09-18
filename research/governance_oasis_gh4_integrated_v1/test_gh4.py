from __future__ import annotations

import unittest

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from .design_spec import build_design
from .evaluator import evaluate
from .orchestrator import run_families
from .preflight import run_preflight
from .scenario import Arm, build_pilot, build_confirmatory

class GH4IntegratedTests(unittest.TestCase):
    def test_integrated_design_gate(self):
        r=validate_design(build_design())
        self.assertTrue(r.proof_ready,r.unresolved_check_ids)
        self.assertEqual(len(r.targeted_axes),6)

    def test_pilot_confirmatory_disjoint(self):
        p=build_pilot(); c=build_confirmatory()
        self.assertEqual([x.family_id for x in p],["P"])
        self.assertEqual([x.family_id for x in c],["F1","F2","F3"])

    def test_pilot_is_structural_only(self):
        p=build_pilot()
        result=evaluate(p,run_families(p),scientific=False)
        self.assertFalse(result["scientific_evaluator_used"])
        self.assertNotIn("outcome",result)
        self.assertTrue(all(result["structural"].values()),result["structural"])

    def test_current_flow_first_gate(self):
        p=build_pilot(); bundle=run_families(p)
        full=next(r for r in bundle["runs"] if r["arm"]==Arm.FULL_FLOW.value)
        e0=next(x for x in full["rows"] if x["epoch_id"]=="E0-CURRENT-FIRST")
        self.assertFalse(e0["history_needed"])
        self.assertEqual(e0["history_access_count"],0)
        self.assertEqual(e0["candidate_ids"],[])

    def test_preflight(self):
        d,g=run_preflight()
        self.assertTrue(d.proof_ready,d.unresolved_check_ids)
        self.assertTrue(g.freeze_ready,g.unresolved_check_ids)

if __name__=="__main__":
    unittest.main()
