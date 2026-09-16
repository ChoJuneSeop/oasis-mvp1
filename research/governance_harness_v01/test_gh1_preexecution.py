from __future__ import annotations

import json
import unittest
from pathlib import Path

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.governance_harness_v01.gh1_preexecution import (
    build_rng_streams,
    evaluate_current_flow_gap,
    load_json,
    repository_root,
    run_fresh_process_probe,
)
from research.governance_harness_v01.harness_v04 import (
    CurrentFlowGapRule,
    GovernanceHarnessV04,
    PresentFlowEvidence,
    PresentSample,
)
from research.governance_harness_v01.test_governance_attack_v04 import (
    Core,
    History,
    Reengage,
    Responsibility,
    Revalidate,
)


BASE = repository_root() / "research" / "governance_harness_v01"


def obs(speed: float, epoch: int) -> PresentObservation:
    return PresentObservation(epoch, speed, True, 12.0, 0.8, "vehicle", 0.0, 2)


def evidence(speeds: tuple[float, ...]) -> PresentFlowEvidence:
    return PresentFlowEvidence(tuple(
        PresentSample(float(i), obs(speed, i), {"phase": "validation"})
        for i, speed in enumerate(speeds, start=1)
    ))


def harness() -> GovernanceHarnessV04:
    return GovernanceHarnessV04(
        core=Core(), history_port=History(), gap_rule=CurrentFlowGapRule(0.5),
        reengagement_operator=Reengage(), responsibility_operator=Responsibility(),
        revalidation_operator=Revalidate(),
    )


class GH1PreexecutionTests(unittest.TestCase):
    def test_dv_01_detector_validation_cases_pass_on_actual_harness_path(self):
        spec = load_json(BASE / "GH1_GAP_DETECTOR_SPEC.json")
        h = harness()
        seen = set()
        for case in spec["validation_cases"]:
            ev = evidence(tuple(float(x) for x in case["speeds"]))
            actual = h._gap(ev)
            reference = evaluate_current_flow_gap(ev, h.gap_rule)
            self.assertEqual(actual, reference)
            self.assertEqual(actual.detected, bool(case["expected_gap"]), case["case_id"])
            seen.add(actual.detected)
        self.assertEqual(seen, {False, True}, "detector may not collapse to always-YES/always-NO")

    def test_dv_02_detector_spec_is_current_flow_only(self):
        spec = load_json(BASE / "GH1_GAP_DETECTOR_SPEC.json")
        allowed = " ".join(spec["allowed_inputs"]).lower()
        self.assertIn("samples", allowed)
        self.assertIn("ego_speed", allowed)
        for token in spec["forbidden_inputs"]:
            self.assertNotIn(token.lower(), allowed)

    def test_rng_01_subsystem_streams_are_distinct_and_history_draws_do_not_shift_others(self):
        seeds = load_json(BASE / "GH1_SEED_MANIFEST.json")
        seeds.pop("spec_version")
        baseline = build_rng_streams(seeds)
        env_expected = [baseline["environment_rng"].random() for _ in range(4)]
        core_expected = [baseline["core_rng"].random() for _ in range(4)]

        trial = build_rng_streams(seeds)
        for _ in range(100):
            trial["history_rng"].random()
        self.assertEqual(env_expected, [trial["environment_rng"].random() for _ in range(4)])
        self.assertEqual(core_expected, [trial["core_rng"].random() for _ in range(4)])

    def test_rng_02_seed_names_are_exactly_frozen(self):
        seeds = load_json(BASE / "GH1_SEED_MANIFEST.json")
        version = seeds.pop("spec_version")
        self.assertEqual(version, "GH1_SEEDS_V1")
        self.assertEqual(set(seeds), {
            "environment_rng", "core_rng", "history_rng", "participation_rng",
            "evaluator_rng", "run_order_rng",
        })
        self.assertEqual(len(set(seeds.values())), 6)

    def test_fp_01_each_arm_starts_in_a_fresh_process(self):
        results = [run_fresh_process_probe(arm) for arm in ("G1", "G2", "G3")]
        self.assertEqual(len({x["pid"] for x in results}), 3)
        self.assertTrue(all(x["before"] == [] for x in results))
        self.assertEqual([x["after"] for x in results], [["G1"], ["G2"], ["G3"]])
        self.assertEqual(results[0]["probe"], results[1]["probe"])
        self.assertEqual(results[1]["probe"], results[2]["probe"])

    def test_manifest_01_archive_is_frozen_and_evaluator_metadata_is_runtime_inaccessible(self):
        manifest = load_json(BASE / "GH1_ARCHIVE_MANIFEST.json")
        self.assertEqual(manifest["decision_eligible_archive"], "FROZEN")
        self.assertTrue(manifest["result_history_commit"])
        self.assertFalse(manifest["newly_committed_experience_reuse"])
        self.assertFalse(manifest["runtime_evaluator_class_access"])
        entries = manifest["entries"]
        self.assertEqual(len(entries), 12)
        classes = {x["evaluator_class"] for x in entries}
        self.assertEqual(classes, {"relevant", "surface_similar_relationally_wrong", "irrelevant"})

    def test_manifest_02_scenario_preserves_no_yes_recovery_no_yes_flow(self):
        manifest = load_json(BASE / "GH1_SCENARIO_MANIFEST.json")
        self.assertFalse(manifest["runtime_label_access"])
        self.assertFalse(manifest["feedback_carry_forward"])
        self.assertFalse(manifest["newly_committed_experience_reuse"])
        speeds = [float(x["ego_speed_mps"]) for x in manifest["flow_sequence"]]
        threshold = 0.5
        transitions = [(speeds[i - 1] - speeds[i]) >= threshold for i in range(1, len(speeds))]
        self.assertIn(True, transitions)
        first_yes = transitions.index(True)
        self.assertIn(False, transitions[first_yes + 1:])
        self.assertIn(True, transitions[first_yes + 1:])

    def test_manifest_03_run_order_is_balanced_and_pilot_is_excluded(self):
        manifest = load_json(BASE / "GH1_RUN_ORDER.json")
        self.assertTrue(manifest["pilot_excluded_from_confirmatory"])
        blocks = manifest["pilot_blocks"]
        self.assertEqual(len(blocks), 3)
        self.assertTrue(all(set(block) == {"G1", "G2", "G3"} for block in blocks))
        for position in range(3):
            self.assertEqual({block[position] for block in blocks}, {"G1", "G2", "G3"})


if __name__ == "__main__":
    unittest.main()
