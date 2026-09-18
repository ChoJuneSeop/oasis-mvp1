"""Governance OASIS A2 Experience Contribution Traceability experiment package."""

from .adapter import DecisionBoundaryTap, DecisionInputEnvelope
from .artifact_io import write_immutable_json
from .design_spec import build_design
from .evaluator import aggregate_axis, aggregate_outcomes, evaluate_run
from .fixtures import build_default_fixtures, load_frozen_fixtures, validate_fixture_isolation
from .instrumentation import SystemTraceBuilder
from .integrated_choice_adapter import InstrumentedPreferenceOperator, extract_consumed_envelopes
from .ledger import ReferenceLedger
from .models import (
    A2ExecutionProfile,
    ArmFixture,
    ClaimOutcome,
    EventType,
    RunEvaluation,
    SystemTrace,
    TraceEntry,
)
from .preflight import run_preflight
from .profile_io import (
    compute_expected_bindings,
    load_execution_profile,
    verify_execution_profile,
)

__all__ = [
    "A2ExecutionProfile",
    "ArmFixture",
    "ClaimOutcome",
    "DecisionBoundaryTap",
    "DecisionInputEnvelope",
    "EventType",
    "InstrumentedPreferenceOperator",
    "ReferenceLedger",
    "RunEvaluation",
    "SystemTrace",
    "SystemTraceBuilder",
    "TraceEntry",
    "aggregate_axis",
    "aggregate_outcomes",
    "build_default_fixtures",
    "build_design",
    "compute_expected_bindings",
    "evaluate_run",
    "extract_consumed_envelopes",
    "load_execution_profile",
    "load_frozen_fixtures",
    "run_preflight",
    "validate_fixture_isolation",
    "write_immutable_json",
    "verify_execution_profile",
]
