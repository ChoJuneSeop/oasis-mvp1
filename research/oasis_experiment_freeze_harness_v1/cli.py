from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .run5_profile import audit_run5


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail-closed OASIS experiment design/freeze gate"
    )
    parser.add_argument("--profile", choices=("run5",), required=True)
    parser.add_argument("--target-ref", default="HEAD")
    parser.add_argument("--report")
    parser.add_argument(
        "--audit-only",
        action="store_true",
        help="emit the report but do not fail the process when the gate is blocked",
    )
    args = parser.parse_args(argv)

    root = _repo_root()
    if args.profile == "run5":
        report = audit_run5(root, target_ref=args.target_ref)
    else:
        raise AssertionError("unreachable profile")

    payload = report.as_dict()
    rendered = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    sys.stdout.write(rendered)
    if args.report:
        path = Path(args.report)
        if not path.is_absolute():
            path = root / path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rendered, encoding="utf-8")

    if args.audit_only:
        return 0
    return 0 if report.freeze_ready else 2


if __name__ == "__main__":
    raise SystemExit(main())
