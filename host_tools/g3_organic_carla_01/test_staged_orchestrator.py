from __future__ import annotations

from pathlib import Path
import tempfile
import unittest
from unittest import mock

from host_tools.g3_organic_carla_01 import staged_flow_runner as flow
from host_tools.g3_organic_carla_01 import windows_orchestrator_staged as staged


class StagedHostTests(unittest.TestCase):
    def test_all_stage_delays_are_exactly_five_seconds(self):
        self.assertEqual(staged.STAGE_DELAY_SECONDS, 5.0)
        self.assertEqual(flow.STAGE_DELAY_SECONDS, 5.0)

    def test_staged_runner_command_uses_module_entrypoint(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            log = root / "runner.log"
            proc = mock.MagicMock()
            with mock.patch.object(staged.subprocess, "Popen", return_value=proc) as popen:
                returned, handle = staged.start_staged_runner(
                    repo_root=root,
                    output_root=root / "out",
                    flow="OF-01",
                    attempt=5,
                    host="127.0.0.1",
                    port=2000,
                    log_path=log,
                )
                self.assertIs(returned, proc)
                cmd = popen.call_args.args[0]
                self.assertIn("-m", cmd)
                self.assertIn("host_tools.g3_organic_carla_01.staged_flow_runner", cmd)
                self.assertIn("5", cmd)
                handle.close()

    def test_host_stage_wrappers_sleep_five_seconds(self):
        fake_world = object()
        with mock.patch.object(staged, "_ORIGINAL_WAIT_FOR_CARLA", return_value=("c", fake_world)):
            with mock.patch.object(staged.time, "sleep") as sleep:
                result = staged.wait_for_carla_staged("127.0.0.1", 2000, 1.0)
                self.assertEqual(result, ("c", fake_world))
                sleep.assert_called_once_with(5.0)


if __name__ == "__main__":
    unittest.main()
