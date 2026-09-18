from __future__ import annotations

import unittest

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from .design_spec import build_design
from .evaluator import evaluate
from .pipeline import run_pipeline
from .preflight import run_preflight
from .scenario import Arm, RecoveryContext, build_pilot_world, build_confirmatory_world

class A6Tests(unittest.TestCase):
    def test_design_gate(self):
        r=validate_design(build_design())
        self.assertTrue(r.proof_ready,r.unresolved_check_ids)

    def test_pilot_confirmatory_disjoint(self):
        p=build_pilot_world(); c=build_confirmatory_world()
        self.assertEqual(len(p),2)
        self.assertEqual(len(c),6)
        self.assertFalse({x.case_id for x in p}&{x.case_id for x in c})

    def test_pilot_structural_only(self):
        p=build_pilot_world()
        result=evaluate(p,run_pipeline(p),scientific=False)
        self.assertFalse(result["scientific_evaluator_used"])
        self.assertNotIn("outcome",result)
        self.assertTrue(all(result["structural"].values()),result["structural"])

    def test_initial_worker_has_no_wrongness(self):
        p=build_pilot_world(); pipeline=run_pipeline(p)
        for worker in pipeline["initial_workers"]:
            for row in worker["rows"]:
                self.assertFalse(row["worker_received_wrongness"])
                self.assertFalse(row["worker_received_future_outcome"])

    def test_unrelated_is_base_eligible_but_feedback_not_applied(self):
        p=build_pilot_world(); pipeline=run_pipeline(p)
        later={w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in pipeline["later_workers"]}
        case=next(x for x in p if x.recovery_context is RecoveryContext.UNRELATED_RELATION)
        row=later[Arm.REVALIDATION_EXPOSED.value][case.case_id]
        self.assertTrue(row["ce_base_eligible"])
        self.assertFalse(row["revalidation_applied"])
        self.assertTrue(row["ce_participated"])

    def test_exogenous_commit_never_revised(self):
        p=build_pilot_world(); pipeline=run_pipeline(p)
        for commit in pipeline["commits"][Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value].values():
            self.assertIsNotNone(commit)
            self.assertEqual(commit.attribution,"EXOGENOUS")
            self.assertNotEqual(commit.state,"REVISED")

    def test_preflight(self):
        d,g=run_preflight()
        self.assertTrue(d.proof_ready,d.unresolved_check_ids)
        self.assertTrue(g.freeze_ready,g.unresolved_check_ids)

if __name__=="__main__":
    unittest.main()
