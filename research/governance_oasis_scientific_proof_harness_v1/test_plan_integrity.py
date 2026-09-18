from __future__ import annotations

import json
from pathlib import Path
import unittest

from .models import AxisId


HERE = Path(__file__).resolve().parent


class RequiredNextExperimentsIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(
            (HERE / "REQUIRED_NEXT_EXPERIMENTS.json").read_text(encoding="utf-8")
        )

    def test_existing_closed_axes_are_only_a1_and_a3(self):
        closed = {x["axis"] for x in self.data["existing_closed_axes"]}
        self.assertEqual(
            closed,
            {
                AxisId.A1_BEHAVIOR_CHANGE_EFFECTIVENESS.value,
                AxisId.A3_RESPONSIBILITY_SENSITIVITY.value,
            },
        )

    def test_missing_program_obligations_are_a2_a4_a5_a6_plus_integration(self):
        axes = [x["axis"] for x in self.data["required_next_experiments"]]
        self.assertEqual(
            axes,
            [
                AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY.value,
                AxisId.A4_OVERGENERALIZATION_PREVENTION.value,
                AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING.value,
                AxisId.A6_WRONG_BEHAVIOR_RECOVERY.value,
                "INTEGRATED",
            ],
        )

    def test_each_axis_experiment_has_causal_controls_and_held_constants(self):
        for item in self.data["required_next_experiments"][:-1]:
            with self.subTest(experiment_id=item["experiment_id"]):
                self.assertGreaterEqual(len(item["minimum_arms"]), 3)
                self.assertTrue(item["held_constant"])
                self.assertTrue(item["primary_observables"])
                self.assertIn("zero difference remains a valid result", item["mandatory_invariants"])

    def test_a2_ablation_does_not_claim_same_full_ce_content(self):
        a2 = next(
            x for x in self.data["required_next_experiments"]
            if x["axis"] == AxisId.A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY.value
        )
        held = " ".join(a2["held_constant"]).lower()
        self.assertIn("same completed experience identities", held)
        self.assertIn("non-relational payload", held)
        self.assertIn("only declared relation/process/order metadata", held)
        self.assertNotIn("same completed experience multiset/content", held)

    def test_a4_requires_all_relation_contexts(self):
        a4 = next(
            x for x in self.data["required_next_experiments"]
            if x["axis"] == AxisId.A4_OVERGENERALIZATION_PREVENTION.value
        )
        self.assertEqual(
            set(a4["required_contexts"]),
            {"SAME_SCOPE", "CHANGED_SCOPE", "UNRELATED_RELATION"},
        )

    def test_a5_requires_real_conflict_without_destructive_overwrite(self):
        a5 = next(
            x for x in self.data["required_next_experiments"]
            if x["axis"] == AxisId.A5_CONFLICTING_EXPERIENCE_HANDLING.value
        )
        self.assertGreaterEqual(a5["minimum_conflicting_completed_experiences"], 2)
        self.assertTrue(a5["conflict_operational_definition"].strip())
        text = " ".join(a5["mandatory_invariants"]).lower()
        self.assertIn("no scalar", text)
        self.assertIn("no destructive overwrite", text)

    def test_a6_requires_post_outcome_wrongness_then_recovery(self):
        a6 = next(
            x for x in self.data["required_next_experiments"]
            if x["axis"] == AxisId.A6_WRONG_BEHAVIOR_RECOVERY.value
        )
        self.assertGreaterEqual(a6["minimum_temporal_epochs"], 3)
        self.assertEqual(
            set(a6["attribution_controls"]),
            {"DECISION_LINKED", "EXOGENOUS"},
        )
        self.assertIn("undefined at decision time", a6["adverse_outcome_rule"])
        chain = a6["required_temporal_chain"]
        realized = chain.index(
            "later behavior change is actually realized without a pre-supplied wrongness label"
        )
        observed = chain.index("authoritative post-outcome observation is produced")
        evaluated = chain.index(
            "independent evaluator applies the preregistered adverse-outcome criterion after worker output is sealed"
        )
        closure = chain.index("Closure")
        revalidation = chain.index("provenance-bound revalidation commit")
        recovery = chain.index("later behavior recovery observation")
        self.assertLess(realized, observed)
        self.assertLess(observed, evaluated)
        self.assertLess(evaluated, closure)
        self.assertLess(closure, revalidation)
        self.assertLess(revalidation, recovery)

    def test_integration_requires_all_six_axes(self):
        integrated = self.data["required_next_experiments"][-1]
        self.assertEqual(set(integrated["prerequisite_axes"]), {axis.value for axis in AxisId})
        self.assertIn("one realization per epoch", integrated["mandatory_invariants"])
        self.assertIn("no future information", integrated["mandatory_invariants"])


if __name__ == "__main__":
    unittest.main()
