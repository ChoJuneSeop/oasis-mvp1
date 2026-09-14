from host_tools.g3_rpfo_carla_01_a2.manifest_compat import verified_manifest
from research.g3_rpfo_carla_01 import live_runner as rpfo_live
from host_tools.g3_rpfo_carla_01.external_carla_runner import main

rpfo_live.verify_experiment_manifest = verified_manifest

if __name__ == "__main__":
    raise SystemExit(main())
