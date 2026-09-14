from __future__ import annotations

import unittest
from unittest import mock

from host_tools.g3_rpfo_carla_01 import external_carla_runner as external


class ExternalCarlaRunnerTests(unittest.TestCase):
    def test_reuses_existing_preregistered_world_without_reload(self):
        client = mock.MagicMock()
        client.get_client_version.return_value = "0.9.16"
        client.get_server_version.return_value = "0.9.16"
        world = mock.MagicMock()
        world.get_map.return_value.name = "/Game/Carla/Maps/Town10HD_Opt"
        settings = mock.MagicMock()
        world.get_settings.return_value = settings
        client.get_world.return_value = world
        tm = mock.MagicMock()
        client.get_trafficmanager.return_value = tm
        protocol = {
            "environment": {
                "map": "Town10HD_Opt",
                "fixed_delta_seconds": 0.05,
                "traffic_manager_port": 8000,
            }
        }
        returned_world, returned_tm = external.prepare_existing_world(
            client, protocol, seed=111268688
        )
        self.assertIs(returned_world, world)
        self.assertIs(returned_tm, tm)
        self.assertTrue(settings.synchronous_mode)
        self.assertEqual(settings.fixed_delta_seconds, 0.05)
        world.apply_settings.assert_called_once_with(settings)
        tm.set_synchronous_mode.assert_called_once_with(True)
        tm.set_random_device_seed.assert_called_once_with(111268688)
        client.load_world.assert_not_called()

    def test_wrong_map_fails_instead_of_reloading(self):
        client = mock.MagicMock()
        client.get_client_version.return_value = "0.9.16"
        client.get_server_version.return_value = "0.9.16"
        world = mock.MagicMock()
        world.get_map.return_value.name = "/Game/Carla/Maps/Town03"
        client.get_world.return_value = world
        protocol = {
            "environment": {
                "map": "Town10HD_Opt",
                "fixed_delta_seconds": 0.05,
                "traffic_manager_port": 8000,
            }
        }
        with self.assertRaises(Exception):
            external.prepare_existing_world(client, protocol, seed=111268688)
        client.load_world.assert_not_called()

    def test_run_flow_uses_rpfo_wrapper_and_restores_prepare_hook(self):
        original = external.base_gated.prepare_live_world
        with mock.patch.object(external.rpfo_live, "run_flow", return_value="ok") as run:
            result = external.run_flow(
                flow_id="OF-01", attempt=1, output_root="out", host="127.0.0.1", port=2000
            )
            self.assertEqual(result, "ok")
            self.assertIs(external.base_gated.prepare_live_world, original)
            run.assert_called_once()


if __name__ == "__main__":
    unittest.main()
