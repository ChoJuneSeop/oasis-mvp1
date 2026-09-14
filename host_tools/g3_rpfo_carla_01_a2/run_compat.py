from host_tools.g3_rpfo_carla_01_a2.failure_guard import record
from host_tools.g3_rpfo_carla_01_a2.manifest_compat import verified_manifest
from research.g3_rpfo_carla_01 import live_runner as rpfo_live
from host_tools.g3_rpfo_carla_01.external_carla_runner import main

rpfo_live.verify_experiment_manifest = verified_manifest
_original_run_flow = rpfo_live.run_flow


def _guarded_run_flow(**kwargs):
    try:
        return _original_run_flow(**kwargs)
    except Exception as exc:
        record(
            kwargs.get("output_root"),
            kwargs.get("flow_id"),
            kwargs.get("attempt"),
            exc,
        )
        raise


rpfo_live.run_flow = _guarded_run_flow

if __name__ == "__main__":
    raise SystemExit(main())
