from __future__ import annotations

import json

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design

from .design_spec import build_design
from .fixtures import load_frozen_fixtures
from .preflight import run_preflight
from .profile_io import load_execution_profile, verify_execution_profile


def main() -> None:
    profile = load_execution_profile()
    profile_errors = verify_execution_profile(profile)
    design_report = validate_design(build_design())
    preflight_report = run_preflight(profile=profile, fixtures=load_frozen_fixtures())
    print(
        json.dumps(
            {
                "mode": "A2_PREEXECUTION_SELFTEST_NOT_CONFIRMATORY_EVIDENCE",
                "profile_integrity": {
                    "pass": not profile_errors,
                    "errors": list(profile_errors),
                },
                "design": design_report.as_dict(),
                "preflight": preflight_report.as_dict(),
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if profile_errors or not design_report.proof_ready or not preflight_report.freeze_ready:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
