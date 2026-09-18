from __future__ import annotations

import unittest

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design
from .design_spec import build_design
from .evaluator import evaluate
from .preflight import run_preflight
from .runner import run_workers
from .scenario import build_pilot_world, build_confirmatory_world

class A5Tests(unittest.TestCase):
    def test_design_gate(self):
        r=validate_design(build_design())
        self.assertTrue(r.proof_ready,r.unresolved_check_ids)

    def test_matrix_frozen_and_disjoint(self):
        p=build_pilot_world(); c=build_confirmatory_world()
        self.assertEqual(len(p),4)
        self.assertEqual(len(c),12)
        self.assertFalse({x.runtime.case_id for x in p}&{x.runtime.case_id for x in c})

    def test_every_case_has_two_conflicting_ce(self):
        for x in build_confirmatory_world():
            self.assertEqual(len(x.runtime.ce_archive),2)
            self.assertEqual({ce.supported_action for ce in x.runtime.ce_archive},{"continue-flow","yield-space"})

    def test_preflight(self):
        d,g=run_preflight()
        self.assertTrue(d.proof_ready,d.unresolved_check_ids)
        self.assertTrue(g.freeze_ready,g.unresolved_check_ids)


if __name__=="__main__":
    unittest.main()
