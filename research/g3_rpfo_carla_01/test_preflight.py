from __future__ import annotations

import unittest

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_rpfo_carla_01.core_factory import make_core
from research.g3_rpfo_carla_01 import live_runner as rpfo_runner
from research.g3_rpfo_carla_01.protocol import PROTOCOL_ID, verify_experiment_manifest
from research.g3_rpfo_carla_01.resolver import FRONT_RELATION_ID
from research.integration_checkpoint.frame import current_frame_from_host
from research.oasis_core_v11.current_relational_core import (
    CoreV11InvariantError,
    HistoricalRelationRecord,
    PastRelationSemanticView,
)
from research.oasis_core_v12.contracts import (
    CompletedProcess,
    HistoricalEnvelope,
    ObservedOccurrence,
)


def observation(epoch=10):
    return PresentObservation(
        epoch=epoch,
        ego_speed_mps=2.0,
        front_present=True,
        front_gap_m=12.0,
        front_closing_mps=0.8,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=2,
    )


def frame(epoch=10, tau=10.0):
    return current_frame_from_host(observation(epoch), tau=tau, revision="frame-%s" % epoch)


def front_envelope(exp_id, *, boundary, occurrence_id, occurrence=None):
    item = occurrence or ObservedOccurrence(
        occurrence_id=occurrence_id,
        occurred_at_tau=float(boundary),
        received_at_tau=float(boundary),
        description="independently observed front relation closure",
        source_ref="independent-evaluator-v1:test",
    )
    process = CompletedProcess(
        experience_id=exp_id,
        start_tau=max(0.0, float(boundary) - 1.0),
        boundary_tau=float(boundary),
        known_at_tau=float(boundary),
        occurrences=(item,),
        scope_description="front interaction",
        closure_method="front-participant-left-current-relation",
        closure_evidence_refs=(item.occurrence_id,),
    )
    record = HistoricalRelationRecord(
        source=RelationElementRef(
            exp_id,
            "front-interaction",
            float(boundary),
            {"relation": "front-interaction"},
        ),
        semantic=PastRelationSemanticView(
            subject_role="ego-role",
            object_role="front-traffic-role",
            relation_type="longitudinal-relative-motion",
            relation_state="interaction-ended",
            process_context=("front-interaction", "realization", "closure"),
            environment_context={"closure_event": "front-participant-absent"},
            historical_roles=("realized-relation",),
            possibility_links=("yield-space",),
        ),
    )
    return HistoricalEnvelope(record, process, (item.occurrence_id,))


class RPFOCARLAPreflightTests(unittest.TestCase):
    def test_frozen_manifest_is_self_consistent(self):
        manifest = verify_experiment_manifest()
        self.assertEqual(manifest["protocol_id"], PROTOCOL_ID)
        self.assertFalse(manifest["global_history_scan"])
        self.assertFalse(manifest["same_step_recursive_frontier_expansion"])
        self.assertFalse(manifest["unresolved_is_zero"])
        self.assertFalse(manifest["experimental_evidence"])
        self.assertEqual(manifest["empirical_ticks"], 0)

    def test_factory_starts_with_empty_history(self):
        core, _ = make_core()
        self.assertEqual(core.history_envelopes(), ())

    def test_multi_relation_admission_fails_before_history_mutation(self):
        core, _ = make_core()
        e1 = front_envelope("E-1", boundary=2.0, occurrence_id="O-1")
        e2 = front_envelope("E-2", boundary=3.0, occurrence_id="O-2")
        with self.assertRaises(CoreV11InvariantError):
            core.add_history_batch((e1, e2))
        self.assertEqual(core.history_envelopes(), ())

    def test_exact_replay_does_not_rewind_latest_process_pointer(self):
        core, _ = make_core()
        e1 = front_envelope("E-1", boundary=2.0, occurrence_id="O-1")
        e2 = front_envelope("E-2", boundary=3.0, occurrence_id="O-2")
        core.add_history_batch((e1,))
        core.add_history_batch((e2,))
        core.add_history_batch((e1,))

        core.open_current_epoch(frame())
        snapshot = core.rpfo_snapshot()
        self.assertIn(("E-2", "front-interaction"), snapshot.participating_keys)
        self.assertNotIn(("E-1", "front-interaction"), snapshot.participating_keys)
        self.assertFalse(snapshot.global_history_scan)
        self.assertFalse(snapshot.recursive_history_fold)

    def test_preserved_link_expands_on_next_epoch_not_same_epoch(self):
        core, _ = make_core()
        e1 = front_envelope("E-1", boundary=2.0, occurrence_id="O-1")
        e2 = front_envelope("E-2", boundary=3.0, occurrence_id="O-2")
        core.add_history_batch((e1,))
        core.add_history_batch((e2,))

        core.open_current_epoch(frame(epoch=10, tau=10.0))
        first = core.rpfo_snapshot()
        self.assertEqual(first.participating_keys, (("E-2", "front-interaction"),))
        self.assertTrue(first.next_frontier.contacts)

        core.open_current_epoch(frame(epoch=11, tau=11.0))
        second = core.rpfo_snapshot()
        self.assertIn(("E-1", "front-interaction"), second.participating_keys)
        self.assertIn(("E-2", "front-interaction"), second.participating_keys)

    def test_shared_closure_occurrence_does_not_invent_order_link(self):
        core, _ = make_core()
        shared = ObservedOccurrence(
            occurrence_id="O-shared",
            occurred_at_tau=2.0,
            received_at_tau=2.0,
            description="one shared independently observed closure",
            source_ref="independent-evaluator-v1:test",
        )
        e1 = front_envelope("E-1", boundary=2.0, occurrence_id="O-shared", occurrence=shared)
        e2 = front_envelope("E-2", boundary=2.0, occurrence_id="O-shared", occurrence=shared)
        core.add_history_batch((e1,))
        core.add_history_batch((e2,))

        repo = core.rpfo_repository.freeze(current_tau=10.0)
        self.assertEqual(repo.links_for(("E-1", "front-interaction")), ())
        self.assertEqual(repo.links_for(("E-2", "front-interaction")), ())

        core.open_current_epoch(frame())
        snapshot = core.rpfo_snapshot()
        self.assertEqual(snapshot.participating_keys, (("E-1", "front-interaction"),))

    def test_runner_patch_binds_release_gate_to_new_protocol(self):
        saved = rpfo_runner._patch()
        try:
            from research.g3_organic_carla_01 import gated_runner as base_runner
            from research.g3_organic_carla_01 import live_runner as base_live
            from research.g3_organic_carla_01 import release_gate as base_release
            self.assertEqual(base_runner.PROTOCOL_ID, PROTOCOL_ID)
            self.assertEqual(base_live.PROTOCOL_ID, PROTOCOL_ID)
            self.assertEqual(base_release.PROTOCOL_ID, PROTOCOL_ID)
            self.assertEqual(FRONT_RELATION_ID, "current:front-longitudinal")
        finally:
            rpfo_runner._restore(saved)


if __name__ == "__main__":
    unittest.main()
