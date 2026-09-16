from __future__ import annotations

import json
import unittest
from pathlib import Path
from types import SimpleNamespace

from research.governance_harness_gh3.admission.preflight import evaluate_gates
from research.governance_harness_gh3.history import FrozenDecisionHistoryPort, baseline_experience
from research.governance_harness_gh3.models import ARMS, FORBIDDEN_RUNTIME_KEYS
from research.governance_harness_gh3.operators import FeedbackAwareParticipation, state_from_observations
from research.governance_harness_gh3.runner import dry_run, run_chain, run_runtime
from research.governance_harness_gh3.scenario import (
    CONFIRMATORY_FAMILIES,
    OUTCOME_STATES,
    PILOT_FAMILIES,
    RECURRENCE_SCOPES,
    build_confirmatory_world,
    build_pilot_world,
)
from research.governance_harness_v01.harness import (
    GapAssessment,
    RevalidationState,
)
from research.governance_harness_v01.harness_v04 import GovernanceFeedbackV04
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle


class GH3AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pilot = build_pilot_world()
        cls.confirmatory = build_confirmatory_world()

    def test_01_frozen_arm_contract(self):
        self.assertEqual(
            ARMS,
            ("F1_ACTIVE_CORRECT", "F2_RECORD_ONLY", "F3_PERMUTED_STATE"),
        )

    def test_02_pilot_is_structural_three_chain_matrix(self):
        self.assertEqual(tuple(PILOT_FAMILIES), ("P1",))
        self.assertEqual(len(self.pilot), 3)
        self.assertEqual({x.truth.outcome_state for x in self.pilot}, set(OUTCOME_STATES))
        self.assertEqual({x.truth.scope_mode for x in self.pilot}, {"same_scope"})

    def test_03_confirmatory_is_frozen_eighteen_chain_matrix(self):
        self.assertEqual(len(CONFIRMATORY_FAMILIES), 3)
        self.assertEqual(len(OUTCOME_STATES), 3)
        self.assertEqual(len(RECURRENCE_SCOPES), 2)
        self.assertEqual(len(self.confirmatory), 18)

    def test_04_pilot_and_confirmatory_are_disjoint(self):
        p = {x.runtime.chain_id for x in self.pilot}
        c = {x.runtime.chain_id for x in self.confirmatory}
        self.assertTrue(p.isdisjoint(c))
        self.assertTrue({x.truth.family for x in self.pilot}.isdisjoint({x.truth.family for x in self.confirmatory}))

    def test_05_runtime_contains_no_evaluator_truth_fields(self):
        for case in self.pilot + self.confirmatory:
            runtime_keys = set(vars(case.runtime))
            self.assertFalse(FORBIDDEN_RUNTIME_KEYS.intersection(runtime_keys))
            self.assertNotIn(case.truth.outcome_state, case.runtime.chain_id.lower())
            self.assertNotIn(case.truth.scope_mode, case.runtime.chain_id.lower())

    def test_06_revalidation_mapping_is_typed_and_directional(self):
        by_state = {case.truth.outcome_state: case for case in self.pilot}
        for state in OUTCOME_STATES:
            case = by_state[state]
            actual = state_from_observations(
                case.runtime.antecedent_decision,
                case.runtime.antecedent_post,
            )
            self.assertIsInstance(actual, RevalidationState)
            self.assertEqual(actual.value, state)

    def test_07_all_decision_observations_keep_continue_and_yield_feasible(self):
        for case in self.pilot + self.confirmatory:
            for observation in (case.runtime.antecedent_decision, case.runtime.recurrence_decision):
                core = build_domain_bundle().core
                view = core.open_epoch(observation, 10_000.0, None)
                self.assertIn("continue-flow", view.possibility_distribution)
                self.assertIn("yield-space", view.possibility_distribution)

    def _feedback(self, candidate, *, relation_id=None, provenance=None, state=RevalidationState.REVISED):
        return GovernanceFeedbackV04(
            prior_entry_id="CE:prior",
            relation_id=relation_id or candidate.relation_id,
            provenance_refs=(provenance or candidate.provenance_ref,),
            gap_state=RevalidationState.CONFIRMED,
            choice_state=state,
            responsibility_state=state,
            experience_states=((candidate.experience_id, state),),
        )

    def _evidence(self, observation):
        return SimpleNamespace(samples=(SimpleNamespace(observation=observation),))

    def test_08_revised_feedback_is_same_scope_local_not_permanent(self):
        case = self.pilot[0]
        candidate = baseline_experience(case.runtime.relation_id, case.runtime.antecedent_decision.local_density)
        operator = FeedbackAwareParticipation()
        fb = (self._feedback(candidate),)
        same = operator.assess(
            self._evidence(case.runtime.recurrence_decision),
            GapAssessment(True),
            (candidate,),
            fb,
        )[0]
        shifted_obs = case.runtime.recurrence_decision.__class__(
            **{**vars(case.runtime.recurrence_decision), "local_density": case.runtime.recurrence_decision.local_density + 1}
        )
        shifted = operator.assess(
            self._evidence(shifted_obs),
            GapAssessment(True),
            (candidate,),
            fb,
        )[0]
        self.assertFalse(same.participate)
        self.assertTrue(shifted.participate)

    def test_09_wrong_relation_or_provenance_feedback_has_zero_participation_effect(self):
        case = self.pilot[0]
        candidate = baseline_experience(case.runtime.relation_id, case.runtime.antecedent_decision.local_density)
        operator = FeedbackAwareParticipation()
        for feedback in (
            (self._feedback(candidate, relation_id="GH3-WRONG-REL"),),
            (self._feedback(candidate, provenance="prov:wrong"),),
        ):
            result = operator.assess(
                self._evidence(case.runtime.recurrence_decision),
                GapAssessment(True),
                (candidate,),
                feedback,
            )[0]
            self.assertTrue(result.participate)

    def test_10_history_port_keeps_new_ce_out_of_decision_eligible_archive(self):
        case = self.pilot[0]
        result = run_chain("F1_ACTIVE_CORRECT", case.runtime)
        self.assertEqual(result.baseline_decision_eligible_count, 1)
        self.assertGreater(result.stored_experience_count_after_antecedent, 1)
        self.assertEqual(result.recurrence_decision_eligible_count, 1)
        self.assertFalse(result.recurrence_new_ce_exposed)

    def test_11_record_only_commits_feedback_but_exposes_none(self):
        case = self.pilot[0]
        result = run_chain("F2_RECORD_ONLY", case.runtime)
        self.assertIn(result.committed_feedback_state, OUTCOME_STATES)
        self.assertIsNone(result.recurrence_exposed_feedback_state)

    def test_12_permuted_arm_does_not_rewrite_committed_state(self):
        case = self.pilot[0]
        result = run_chain("F3_PERMUTED_STATE", case.runtime)
        self.assertIn(result.committed_feedback_state, OUTCOME_STATES)
        self.assertIn(result.recurrence_exposed_feedback_state, OUTCOME_STATES)
        self.assertNotEqual(result.committed_feedback_state, result.recurrence_exposed_feedback_state)

    def test_13_feedback_cannot_affect_same_epoch(self):
        case = self.pilot[0]
        for arm in ARMS:
            result = run_chain(arm, case.runtime)
            self.assertEqual(result.antecedent_participants, (f"E1:{case.runtime.relation_id}",))
            self.assertEqual(result.antecedent_selected, result.antecedent_realized)

    def test_14_all_scientific_arms_use_fresh_processes(self):
        block = run_runtime(tuple(case.runtime for case in self.pilot))
        self.assertEqual(len(block["workers"]), 3)
        self.assertEqual(len({x["pid"] for x in block["workers"]}), 3)
        self.assertEqual(len({x["worker_token"] for x in block["workers"]}), 3)

    def test_15_preflight_dry_run_is_structural_only(self):
        dry = dry_run()
        self.assertTrue(dry["fresh_process"])
        self.assertFalse(dry["evaluator_used"])
        self.assertFalse(dry["confirmatory_metric_computed"])
        text = json.dumps(dry, sort_keys=True)
        self.assertNotIn("state_match_rate", text)
        self.assertNotIn("F1_vs_F2", text)

    def test_16_selected_equals_realized_and_two_realizations_per_chain(self):
        dry = dry_run()
        for value in dry["arms"].values():
            self.assertTrue(value["selected_equals_realized"])
            self.assertTrue(value["two_realizations_per_chain"])
            self.assertFalse(value["new_ce_decision_reuse"])

    def test_17_manifest_freezes_confirmatory_before_pilot(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / "design" / "FREEZE_MANIFEST.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["spec_version"], "GH3_EXPERIMENT_V1_0_FINAL")
        self.assertEqual(manifest["confirmatory"]["chains_per_arm"], 18)
        self.assertEqual(manifest["confirmatory"]["total_decision_realization_epochs"], 108)
        self.assertFalse(manifest["confirmatory"]["pilot_derived_count_freeze"])
        self.assertFalse(manifest["pilot_executed"])
        self.assertFalse(manifest["confirmatory_executed"])
        self.assertIsNone(manifest["aggregate_score"])

    def test_18_pilot_and_confirmatory_output_files_absent(self):
        root = Path(__file__).resolve().parents[1]
        self.assertFalse((root / "results" / "PILOT_RESULT_V1_0.json").exists())
        self.assertFalse((root / "results" / "CONFIRMATORY_RESULT_V1_0.json").exists())

    def test_19_f2_and_f3_are_not_encoded_in_runtime(self):
        for case in self.pilot + self.confirmatory:
            raw = json.dumps({k: str(v) for k, v in vars(case.runtime).items()}, sort_keys=True)
            for arm in ARMS:
                self.assertNotIn(arm, raw)

    def test_20_core_admission_and_existing_closure_contract_remain_available(self):
        bundle = build_domain_bundle()
        self.assertTrue(bundle.core.experimental_contract["closure"])
        self.assertTrue(bundle.core.experimental_contract["single_realization"])
        self.assertTrue(bundle.core.experimental_contract["history_port_only"])

    def test_21_all_preexecution_gates_pass(self):
        gates = evaluate_gates()
        self.assertTrue(all(v["pass"] for v in gates.values()), json.dumps(gates, indent=2))


if __name__ == "__main__":
    unittest.main()
