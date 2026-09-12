import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation, VehicleActuation
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    CurrentRelation,
    CurrentRelationalCoreV11,
    HistoricalRelationRecord,
    PastRelationSemanticView,
    PossibilityCandidate,
    ReconstructionResult,
    RelationContribution,
    ResponsibilityVector,
)


def observation():
    return PresentObservation(
        epoch=10,
        ego_speed_mps=2.0,
        front_present=True,
        front_gap_m=12.0,
        front_closing_mps=0.8,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=2,
    )


def history_record(exp_id: str, rel_id: str, completed_at: float):
    return HistoricalRelationRecord(
        source=RelationElementRef(
            exp_id,
            rel_id,
            completed_at,
            {"relation": "closing-gap", "historical_timestamp_for_provenance_only": completed_at},
        ),
        semantic=PastRelationSemanticView(
            subject_role="ego-role",
            object_role="front-role",
            relation_type="closing-gap",
            relation_state="approaching",
            process_context=("approach",),
            environment_context={"visibility": "clear"},
            historical_roles=("recognition",),
            possibility_links=("yield",),
        ),
    )


class RelationBuilder:
    def __init__(self, present=True):
        self.present = present

    def build(self, obs):
        if not self.present:
            return ()
        return (
            CurrentRelation(
                relation_id="cur-front-closing",
                subject_role="ego-role",
                object_role="front-role",
                relation_type="closing-gap",
                relation_state="approaching",
                process_context=("approach",),
                environment_context={"visibility": "clear"},
            ),
        )


class CandidateProvider:
    def candidates(self, obs, current_relations):
        return (
            PossibilityCandidate("proceed", ("obs:current-lane",)),
            PossibilityCandidate("yield", ("obs:front-relation",)),
        )


class MatchingRelationOperator:
    def __init__(self):
        self.seen_past_objects = []

    def relate(self, *, current_relations, past, candidate_ids):
        self.seen_past_objects.append(past)
        if not current_relations:
            return ()
        if "yield" not in candidate_ids:
            return ()
        if not any(r.relation_type == past.relation_type for r in current_relations):
            return ()
        return (
            RelationContribution(
                possibility_id="yield",
                current_relation_ids=tuple(r.relation_id for r in current_relations),
                role_trace=("recognition", "constraint"),
                generated_possibilities=("yield",),
                trace={"basis": "current/past relation-type continuity"},
            ),
        )


class SymmetricRedundantRelationOperator:
    """Synthetic redundancy: either historical relation can support the same current structure."""

    def relate(self, *, current_relations, past, candidate_ids):
        if not current_relations:
            return ()
        if not any(r.relation_type == past.relation_type for r in current_relations):
            return ()
        anchors = tuple(r.relation_id for r in current_relations)
        return tuple(
            RelationContribution(
                possibility_id=pid,
                current_relation_ids=anchors,
                role_trace=("recognition", "generation"),
                generated_possibilities=(pid,),
                trace={"basis": "synthetic symmetric redundant support"},
            )
            for pid in candidate_ids
        )


class NoReconstruction:
    def reconstruct(self, **kwargs):
        return ReconstructionResult()


class RedundancyReconstruction:
    """Synthetic only: single-source removal is compensated; joint removal is not."""

    def reconstruct(self, *, contributions, **kwargs):
        source_keys = {
            (x.source.experience_id, x.source.relation_element_id)
            for x in contributions
        }
        n = len(source_keys)
        if n == 0:
            return ReconstructionResult()
        # Each existing base possibility has 1 current token + n source tokens.
        # Give the reconstructed possibility the same amount of current evidence,
        # making either single-source ablation distributionally redundant while
        # joint ablation removes the reconstructed possibility entirely.
        evidence = tuple(f"current:reconstruction:{i}" for i in range(n + 1))
        return ReconstructionResult(
            additional_candidates=(PossibilityCandidate("reconstructed-yield", evidence),)
        )


class Responsibility:
    def evaluate(self, *, observation, candidate, **kwargs):
        return ResponsibilityVector(
            uncertainty=0.2,
            impact=0.4,
            irreversibility=0.1,
            time_constraint=0.3,
            additional={"domain_visibility": 0.25},
            evidence={"candidate": candidate.possibility_id},
        )


class Choice:
    def choose(self, *, candidates, distribution, **kwargs):
        # Deterministic test operator only; not a CARLA policy.
        return max(candidates, key=lambda c: (distribution[c.possibility_id], c.possibility_id)).possibility_id


class Actuation:
    def actuation(self, *, selected, **kwargs):
        return VehicleActuation(throttle=0.1, brake=0.0, steer=0.0)


def make_core(history, *, present_relation=True, reconstruction=None, relation_operator=None):
    return CurrentRelationalCoreV11(
        relation_builder=RelationBuilder(present_relation),
        candidate_provider=CandidateProvider(),
        relation_operator=relation_operator or MatchingRelationOperator(),
        reconstruction_operator=reconstruction or NoReconstruction(),
        responsibility_operator=Responsibility(),
        choice_operator=Choice(),
        actuation_operator=Actuation(),
        history=history,
    )


class CoreV11Tests(unittest.TestCase):
    def test_age_is_not_available_to_relation_operator(self):
        op = MatchingRelationOperator()
        core = make_core((history_record("E-old", "r1", 1.0),), relation_operator=op)
        core.open_epoch(observation())
        self.assertTrue(op.seen_past_objects)
        self.assertFalse(hasattr(op.seen_past_objects[0], "completed_at_tau"))
        self.assertFalse(hasattr(op.seen_past_objects[0], "age"))

    def test_swapping_old_and_recent_timestamps_does_not_change_distribution(self):
        a = (
            history_record("E-a", "r1", 1.0),
            history_record("E-b", "r2", 9.0),
        )
        b = (
            history_record("E-a", "r1", 9.0),
            history_record("E-b", "r2", 1.0),
        )
        self.assertEqual(
            make_core(a).open_epoch(observation()).possibility_distribution,
            make_core(b).open_epoch(observation()).possibility_distribution,
        )

    def test_history_insertion_order_does_not_change_distribution(self):
        records = (
            history_record("E-z", "r9", 3.0),
            history_record("E-a", "r1", 7.0),
        )
        self.assertEqual(
            make_core(records).open_epoch(observation()).possibility_distribution,
            make_core(tuple(reversed(records))).open_epoch(observation()).possibility_distribution,
        )

    def test_no_current_relation_means_no_past_participation(self):
        core = make_core((history_record("E-old", "r1", 1.0),), present_relation=False)
        view = core.open_epoch(observation())
        self.assertEqual(view.role_trace_by_relation, {})
        self.assertEqual(view.generated_by_relation, {})
        self.assertEqual(view.possibility_distribution, {"proceed": 0.5, "yield": 0.5})

    def test_past_relation_cannot_resurrect_noncurrent_candidate(self):
        class BadOperator:
            def relate(self, *, current_relations, **kwargs):
                return (
                    RelationContribution(
                        possibility_id="ghost-action",
                        current_relation_ids=tuple(r.relation_id for r in current_relations),
                        role_trace=("generation",),
                    ),
                )

        core = make_core(
            (history_record("E-old", "r1", 1.0),),
            relation_operator=BadOperator(),
        )
        with self.assertRaises(CoreV11InvariantError):
            core.open_epoch(observation())

    def test_reconstruction_candidate_requires_current_evidence(self):
        class BadReconstruction:
            def reconstruct(self, **kwargs):
                return ReconstructionResult(
                    additional_candidates=(PossibilityCandidate("invented", ()),)
                )

        core = make_core(
            (history_record("E-old", "r1", 1.0),),
            reconstruction=BadReconstruction(),
        )
        with self.assertRaises(CoreV11InvariantError):
            core.open_epoch(observation())

    def test_redundancy_can_make_individual_effect_zero_but_joint_effect_nonzero(self):
        r1 = history_record("E-1", "r1", 1.0)
        r2 = history_record("E-2", "r2", 8.0)
        core = make_core(
            (r1, r2),
            reconstruction=RedundancyReconstruction(),
            relation_operator=SymmetricRedundantRelationOperator(),
        )
        full = core.open_epoch(observation()).possibility_distribution
        one_out = core.ablate_relation(observation(), r1.source)
        other_out = core.ablate_relation(observation(), r2.source)
        both_out = core.ablate_relation_group(observation(), (r1.source, r2.source))

        self.assertEqual(full, one_out)
        self.assertEqual(full, other_out)
        self.assertNotEqual(full, both_out)
        self.assertIn("reconstructed-yield", full)
        self.assertNotIn("reconstructed-yield", both_out)

    def test_responsibility_remains_uvit_vector_not_scalar(self):
        core = make_core((history_record("E-old", "r1", 1.0),))
        core.open_epoch(observation())
        evaluation = core._last_evaluation
        self.assertIsNotNone(evaluation)
        vector = evaluation.responsibilities["yield"]
        self.assertEqual(
            (vector.uncertainty, vector.impact, vector.irreversibility, vector.time_constraint),
            (0.2, 0.4, 0.1, 0.3),
        )
        self.assertFalse(hasattr(vector, "score"))


if __name__ == "__main__":
    unittest.main()
