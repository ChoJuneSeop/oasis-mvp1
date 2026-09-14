from __future__ import annotations

import argparse

from research.g3_organic_carla_01 import release_gate as base_release
from research.g3_rpfo_carla_01.protocol import PROTOCOL_ID, verify_experiment_manifest


def authorize_release(run_dir, *, explicit_approval):
    verify_experiment_manifest()
    previous = base_release.PROTOCOL_ID
    base_release.PROTOCOL_ID = PROTOCOL_ID
    try:
        return base_release.authorize_release(
            run_dir, explicit_approval=explicit_approval
        )
    finally:
        base_release.PROTOCOL_ID = previous


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Authorize tick 1 for the frozen RPFO CARLA empirical lineage."
    )
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--approve", action="store_true")
    args = parser.parse_args(argv)
    path = authorize_release(args.run_dir, explicit_approval=bool(args.approve))
    print("PRE_FIRST_TICK_RELEASE_CREATED: %s" % path, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
