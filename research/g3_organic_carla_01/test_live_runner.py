from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from research.g3_organic_carla_01.live_runner import (
    _load_world_once,
    build_scene_plan,
)
from research.g3_organic_carla_01.protocol import (
    flow_spec,
    load_preregistration,
    verify_frozen_organic_sources,
)
from research.g3_organic_carla_01.release_gate import (
    REQUEST_NAME,
    authorize_release,
    build_release_request,
    verify_release_token,
)
from research.g3_organic_carla_01.run_audit import RunAuditLedger
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class Attr:
    def __init__(self, value):
        self.value = value
    def as_int(self):
        return int(self.value)


class Blueprint:
    def __init__(self, blueprint_id, wheels=4):
        self.id = blueprint_id
        self.wheels = wheels
    def has_attribute(self, name):
        return name == "number_of_wheels"
    def get_attribute(self, name):
        return Attr(self.wheels)


class Library:
    def __init__(self):
        self.items = [
            Blueprint("vehicle.tesla.model3", 4),
            Blueprint("vehicle.b", 4),
            Blueprint("vehicle.c", 4),
            Blueprint("vehicle.bike", 2),
        ]
    def filter(self, pattern):
        return list(self.items)


class Map:
    name = "Town10HD_Opt"
    def get_spawn_points(self):
        return [object() for _ in range(40)]


class World:
    def __init__(self, name="Town10HD_Opt"):
        self.map = Map()
        self.map.name = name
        self.library = Library()
    def get_map(self):
        return self.map
    def get_blueprint_library(self):
        return self.library


class LoadClient:
    def __init__(self, *, timeout_after_load=False):
        self.world = World("Town01")
        self.load_calls = 0
        self.timeout_after_load = timeout_after_load
    def get_available_maps(self):
        return ["/Game/Carla/Maps/Town10HD_Opt"]
    def set_timeout(self, value):
        self.timeout = value
    def load_world(self, target, reset_settings=False):
        self.load_calls += 1
        self.world = World("Town10HD_Opt")
        if self.timeout_after_load:
            raise TimeoutError("reply lost after server-side map load")
        return self.world
    def get_world(self):
        return self.world


def _write_ready_status(root: Path, request_sha: str, *, phase="PRE_FIRST_TICK_READY"):
    (root / "status.json").write_text(
        json.dumps(
            {
                "protocol_id": "G3-ORGANIC-CARLA-01",
                "phase": phase,
                "empirical_evidence": False,
                "empirical_ticks": 0,
                "release_request_sha256": request_sha,
                "runtime_identity_sha256": "runtime-sha",
                "scene_manifest_sha256": "scene-sha",
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )


class IndependentExperimentTests(unittest.TestCase):
    def test_preregistration_is_fixed_six_flow_independent_cohort(self):
        protocol = load_preregistration()
        self.assertEqual(protocol["protocol_id"], "G3-ORGANIC-CARLA-01")
        self.assertEqual(len(protocol["flows"]), 6)
        self.assertEqual(len({x["seed"] for x in protocol["flows"]}), 6)
        self.assertEqual(protocol["environment"]["planned_horizon_ticks_per_flow"], 30000)
        self.assertFalse(protocol["environment"]["horizon_is_semantic_threshold"])
        self.assertFalse(protocol["attempt_policy"]["resume_after_process_or_carla_interruption"])
        self.assertEqual(flow_spec(protocol, "OF-01")["seed"], 111268688)

    def test_frozen_organic_source_hashes_still_match(self):
        repo_root = Path(__file__).resolve().parents[2]
        manifest = verify_frozen_organic_sources(repo_root)
        self.assertEqual(
            manifest["source_snapshot_commit"],
            "343dd3aa220537ad3dab2e8bb11c7a93a50378a5",
        )

    def test_scene_plan_is_seed_deterministic_exact_and_non_substituting(self):
        world = World()
        first = build_scene_plan(world, seed=111268688, npc_count=12)
        second = build_scene_plan(world, seed=111268688, npc_count=12)
        third = build_scene_plan(world, seed=1108629046, npc_count=12)
        self.assertEqual(first, second)
        self.assertNotEqual(first, third)
        self.assertEqual(first["ego"]["blueprint"], "vehicle.tesla.model3")
        self.assertEqual(len(first["npcs"]), 12)
        indices = [first["ego"]["spawn_index"]] + [x["spawn_index"] for x in first["npcs"]]
        self.assertEqual(len(indices), len(set(indices)))
        self.assertFalse(first["substitution_after_spawn_failure"])

    def test_map_load_is_never_reissued_after_lost_reply(self):
        client = LoadClient(timeout_after_load=True)
        world = _load_world_once(client, target_short_name="Town10HD_Opt", wait_seconds=0.1)
        self.assertEqual(world.get_map().name, "Town10HD_Opt")
        self.assertEqual(client.load_calls, 1)

    def test_tick_audit_exposes_uncertain_cross_system_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "audit.sqlite"
            audit = RunAuditLedger(path)
            audit.tick_intent(tick_index=1, prior_carla_frame=100)
            self.assertEqual(audit.uncertain_tick_indices(), (1,))
            with self.assertRaises(CoreV11InvariantError):
                audit.validate_tick_sequence(1)
            audit.tick_complete(
                tick_index=1,
                carla_frame=101,
                elapsed_seconds=5.05,
                realized=True,
                pending_relations_before_post=1,
            )
            self.assertEqual(audit.uncertain_tick_indices(), ())
            self.assertEqual(audit.validate_tick_sequence(1)["ticks"], 1)
            audit.close()

    def test_tick_sequence_rejects_external_tick_owner_gap(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit = RunAuditLedger(Path(tmp) / "audit.sqlite")
            audit.tick_intent(tick_index=1, prior_carla_frame=100)
            audit.tick_complete(
                tick_index=1,
                carla_frame=101,
                elapsed_seconds=5.05,
                realized=False,
                pending_relations_before_post=0,
            )
            audit.tick_intent(tick_index=2, prior_carla_frame=101)
            audit.tick_complete(
                tick_index=2,
                carla_frame=103,
                elapsed_seconds=5.15,
                realized=False,
                pending_relations_before_post=0,
            )
            with self.assertRaises(CoreV11InvariantError):
                audit.validate_tick_sequence(2)
            audit.close()

    def test_release_requires_ready_zero_tick_status_and_explicit_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _, request_sha = build_release_request(
                run_dir=root,
                flow_id="OF-01",
                attempt=1,
                preregistration_sha256="prereg-sha",
                experiment_source_manifest_sha256="manifest-sha",
                runtime_identity_sha256="runtime-sha",
                scene_manifest_sha256="scene-sha",
                pre_first_tick_carla_frame=100,
                pre_first_tick_tau=5.0,
                pre_first_tick_current_revision="revision-1",
            )
            _write_ready_status(root, request_sha)
            with self.assertRaises(CoreV11InvariantError):
                authorize_release(root, explicit_approval=False)
            authorize_release(root, explicit_approval=True)
            token = verify_release_token(root, expected_request_sha256=request_sha)
            self.assertTrue(token["explicit_operator_action"])
            self.assertFalse(token["empirical_evidence"])
            self.assertFalse(token["outcome_data_included"])

    def test_release_request_mutation_invalidates_token(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _, request_sha = build_release_request(
                run_dir=root,
                flow_id="OF-01",
                attempt=1,
                preregistration_sha256="prereg-sha",
                experiment_source_manifest_sha256="manifest-sha",
                runtime_identity_sha256="runtime-sha",
                scene_manifest_sha256="scene-sha",
                pre_first_tick_carla_frame=100,
                pre_first_tick_tau=5.0,
                pre_first_tick_current_revision="revision-1",
            )
            _write_ready_status(root, request_sha)
            authorize_release(root, explicit_approval=True)
            path = root / REQUEST_NAME
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["pre_first_tick_current_revision"] = "mutated"
            path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")
            with self.assertRaises(CoreV11InvariantError):
                verify_release_token(root, expected_request_sha256=request_sha)

    def test_release_rejected_if_ready_phase_is_lost(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _, request_sha = build_release_request(
                run_dir=root,
                flow_id="OF-01",
                attempt=1,
                preregistration_sha256="prereg-sha",
                experiment_source_manifest_sha256="manifest-sha",
                runtime_identity_sha256="runtime-sha",
                scene_manifest_sha256="scene-sha",
                pre_first_tick_carla_frame=100,
                pre_first_tick_tau=5.0,
                pre_first_tick_current_revision="revision-1",
            )
            _write_ready_status(root, request_sha, phase="LIVE_RUNNING")
            with self.assertRaises(CoreV11InvariantError):
                authorize_release(root, explicit_approval=True)


if __name__ == "__main__":
    unittest.main()
