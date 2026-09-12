from __future__ import annotations

from pathlib import Path
import tempfile
import unittest
from unittest import mock

from host_tools.g3_organic_carla_01 import windows_orchestrator_low_vram as low


class LowVramHostTests(unittest.TestCase):
    def test_low_vram_launch_is_infrastructure_only_and_uses_supported_low_quality(self):
        with tempfile.TemporaryDirectory() as td:
            exe = Path(td) / "CarlaUE4.exe"
            exe.write_bytes(b"x")
            log = Path(td) / "carla.log"
            process = mock.MagicMock()
            with mock.patch.object(low.subprocess, "Popen", return_value=process) as popen:
                returned, handle = low.start_carla_low_vram(exe, 2000, log)
                self.assertIs(returned, process)
                command = popen.call_args.args[0]
                self.assertIn("-quality-level=Low", command)
                self.assertIn("-RenderOffScreen", command)
                self.assertIn("-nosound", command)
                self.assertIn("-carla-port=2000", command)
                handle.close()

    def test_wrapper_delegates_to_frozen_base_main_after_manifest_check(self):
        with mock.patch.object(low, "verify_low_vram_manifest") as verify:
            with mock.patch.object(low.base, "main", return_value=0) as main:
                with mock.patch.object(low, "start_carla_low_vram") as starter:
                    rc = low.main(["--flow", "OF-01", "--attempt", "4"])
                    self.assertEqual(rc, 0)
                    verify.assert_called_once()
                    main.assert_called_once_with(["--flow", "OF-01", "--attempt", "4"])
                    self.assertIs(low.base.start_carla, starter)


if __name__ == "__main__":
    unittest.main()
