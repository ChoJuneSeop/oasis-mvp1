from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from host_tools.g3_organic_carla_01 import windows_orchestrator as w


class WindowsOrchestratorTests(unittest.TestCase):
    def test_run_dir_is_attempt_scoped_and_non_resuming(self):
        root = Path(r"C:\OUT")
        self.assertEqual(
            w.run_dir_for(root, "OF-01", 2),
            root / w.PROTOCOL_ID / "OF-01-A2",
        )

    def test_existing_rpc_port_is_rejected(self):
        fake_socket = mock.MagicMock()
        fake_socket.__enter__.return_value = fake_socket
        fake_socket.connect_ex.return_value = 0
        with mock.patch.object(w.socket, "socket", return_value=fake_socket):
            with self.assertRaises(w.HostOrchestrationError):
                w.ensure_port_free("127.0.0.1", 2000)

    def test_no_rendering_is_applied_without_world_tick(self):
        settings = mock.MagicMock()
        settings.no_rendering_mode = False
        verify = mock.MagicMock()
        verify.no_rendering_mode = True
        world = mock.MagicMock()
        world.get_settings.side_effect = [settings, verify]
        self.assertTrue(w.prepare_no_rendering_without_tick(world))
        world.apply_settings.assert_called_once_with(settings)
        world.tick.assert_not_called()

    def test_ready_requires_zero_empirical_ticks(self):
        with tempfile.TemporaryDirectory() as td:
            run_dir = Path(td)
            (run_dir / "status.json").write_text(
                json.dumps(
                    {
                        "phase": "PRE_FIRST_TICK_READY",
                        "empirical_evidence": False,
                        "empirical_ticks": 0,
                    }
                ),
                encoding="utf-8",
            )
            runner = mock.MagicMock()
            runner.poll.return_value = None
            status = w.wait_for_ready(run_dir, runner, 0.1)
            self.assertEqual(status["phase"], "PRE_FIRST_TICK_READY")

    def test_ready_rejects_empirical_contamination(self):
        with tempfile.TemporaryDirectory() as td:
            run_dir = Path(td)
            (run_dir / "status.json").write_text(
                json.dumps(
                    {
                        "phase": "PRE_FIRST_TICK_READY",
                        "empirical_evidence": True,
                        "empirical_ticks": 1,
                    }
                ),
                encoding="utf-8",
            )
            runner = mock.MagicMock()
            runner.poll.return_value = None
            with self.assertRaises(w.HostOrchestrationError):
                w.wait_for_ready(run_dir, runner, 0.1)

    def test_owned_process_cleanup_targets_only_owned_pid(self):
        process = mock.MagicMock()
        process.poll.return_value = None
        process.pid = 4321
        with mock.patch.object(w.os, "name", "nt"):
            with mock.patch.object(w.subprocess, "run") as run:
                w.terminate_owned_process(process)
                args = run.call_args.args[0]
                self.assertEqual(args[:3], ["taskkill", "/PID", "4321"])
                self.assertNotIn("/IM", args)


if __name__ == "__main__":
    unittest.main()
