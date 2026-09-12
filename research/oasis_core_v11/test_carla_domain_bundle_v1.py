import unittest

from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11
from research.carla_v22_harness_v11.synthetic_dry_run import SyntheticFlow
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import HistoricalRelationRecord, PastRelationSemanticView


def history(exp, rel):
    return HistoricalRelationRecord(
        source=RelationElementRef(exp, rel, 1.0, {}),
        semantic=PastRelationSemanticView(
            subject_role="ego-role",
            object_role="front-traffic-role",
            relation_type="longitudinal-relative-motion",
            relation_state="closing",
            process_context=("front-interaction",),
            environment_context={"symbolic": "front-interaction"},
            historical_roles=("realized-relation",),
            possibility_links=("yield-space",),
        ),
    )


class DomainBundleTests(unittest.TestCase):
    def test_bundle_runs_through_canonical_harness(self):
        bundle = build_domain_bundle((history("E1", "r1"), history("E2", "r2")))
        flow = SyntheticFlow()
        execution = CanonicalHarnessV11(bundle.core).execute_decision_epoch(flow)
        self.assertEqual(flow.apply_count, 1)
        self.assertGreaterEqual(len(execution.recorder.participation), 2)
        self.assertEqual(len(execution.recorder.reconstruction), 1)
        self.assertEqual(len(execution.recorder.group_participation), 1)
        self.assertEqual(execution.recorder.reconstruction[0].observed_at_tau, execution.tau)
        self.assertTrue(all(link.distribution_effect is None for link in execution.recorder.reconstruction[0].source_links))

    def test_closure_evidence_can_be_admitted_after_realization(self):
        bundle = build_domain_bundle()
        flow = SyntheticFlow()
        execution = CanonicalHarnessV11(bundle.core).execute_decision_epoch(flow)
        realized = execution.observation
        post = type(realized)(
            epoch=realized.epoch + 1,
            ego_speed_mps=realized.ego_speed_mps,
            front_present=False,
            front_gap_m=0.0,
            front_closing_mps=0.0,
            front_kind="none",
            local_heading_error_deg=realized.local_heading_error_deg,
            local_density=realized.local_density,
        )
        closure = bundle.closure_evaluator.evaluate(
            realized_observation=realized,
            post_observation=post,
            selected_possibility_id=execution.realization.selected_possibility_id,
        )
        self.assertTrue(closure.closed)
        entry = execution.recorder.complete_history_entry(
            entry_id="E-closed",
            realized_tau=10.05,
            outcome_tau=10.10,
            relation_end_tau=10.20,
            selected_possibility_id=execution.realization.selected_possibility_id,
            realization_ref=execution.realization_ref,
            realization_count=1,
            outcome_description="front relation ended after realization",
            closure_method=closure.method,
            closure_evidence=closure.evidence,
        )
        admitted = bundle.history_admission.admit(entry)
        self.assertEqual(len(admitted), 1)
        self.assertEqual(admitted[0].source.completed_at_tau, 10.20)


if __name__ == "__main__":
    unittest.main()
