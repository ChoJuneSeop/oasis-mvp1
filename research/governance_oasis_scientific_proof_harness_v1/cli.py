from __future__ import annotations

import argparse
import json
from pathlib import Path

from .design_gate import validate_design
from .design_io import load_design
from .execution_report_io import load_execution_report
from .io import load_evidence_registry
from .portfolio_gate import audit_portfolio
from .readiness_gate import evaluate_experiment_readiness


HERE = Path(__file__).resolve().parent
DEFAULT_REGISTRY = HERE / "PROGRAM_EVIDENCE_REGISTRY.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Governance OASIS scientific proof-design harness"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--portfolio", action="store_true")
    group.add_argument("--design", type=Path)
    group.add_argument(
        "--ready-check",
        type=Path,
        metavar="DESIGN_JSON",
        help="run the canonical scientific+sequence+three-lens readiness gate",
    )
    parser.add_argument("--execution-report", type=Path)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--audit-only", action="store_true")
    args = parser.parse_args(argv)

    if args.portfolio:
        program_id, records = load_evidence_registry(args.registry)
        report = audit_portfolio(program_id=program_id, evidence=records)
        payload = report.as_dict()
        ready = report.proof_complete
    elif args.ready_check is not None:
        if args.execution_report is None:
            parser.error("--ready-check requires --execution-report")
        program_id, records = load_evidence_registry(args.registry)
        portfolio = audit_portfolio(program_id=program_id, evidence=records)
        design = load_design(args.ready_check)
        execution = load_execution_report(args.execution_report)
        report = evaluate_experiment_readiness(
            program_id=program_id,
            design=design,
            portfolio=portfolio,
            execution_report=execution,
        )
        payload = report.as_dict()
        ready = report.experiment_ready
    else:
        design = load_design(args.design)
        report = validate_design(design)
        payload = report.as_dict()
        ready = report.proof_ready

    rendered = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")

    if args.audit_only:
        return 0
    return 0 if ready else 2


if __name__ == "__main__":
    raise SystemExit(main())
