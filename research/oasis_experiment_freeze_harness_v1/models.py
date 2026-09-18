from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class GateState(str, Enum):
    DRAFT = "DRAFT"
    STATIC_KILLSEARCH = "STATIC_KILLSEARCH"
    CAUSAL_KILLSEARCH = "CAUSAL_KILLSEARCH"
    EXECUTION_KILLSEARCH = "EXECUTION_KILLSEARCH"
    CROSS_ARM_GATE = "CROSS_ARM_GATE"
    ADVERSARIAL_RECHECK = "ADVERSARIAL_RECHECK"
    FREEZE_READY = "FREEZE_READY"
    FROZEN = "FROZEN"
    EXECUTION_READY = "EXECUTION_READY"
    EXECUTED = "EXECUTED"
    ANALYSIS_ONLY = "ANALYSIS_ONLY"


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNVERIFIED = "UNVERIFIED"
    BLOCKED = "BLOCKED"


class CheckCategory(str, Enum):
    DEFINITION = "DEFINITION"
    CAUSAL = "CAUSAL"
    EXECUTION = "EXECUTION"
    CROSS_ARM = "CROSS_ARM"
    WORLD_ISOLATION = "WORLD_ISOLATION"
    EVALUATOR = "EVALUATOR"
    CBRA = "CBRA"
    TELEMETRY = "TELEMETRY"
    FREEZE = "FREEZE"
    ADVERSARIAL = "ADVERSARIAL"


@dataclass(frozen=True)
class CheckResult:
    check_id: str
    category: CheckCategory
    status: CheckStatus
    summary: str
    evidence: tuple[str, ...] = ()
    blocking: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def resolved(self) -> bool:
        return self.status is CheckStatus.PASS

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["category"] = self.category.value
        data["status"] = self.status.value
        data["evidence"] = list(self.evidence)
        return data


@dataclass(frozen=True)
class GateReport:
    profile_id: str
    state: GateState
    checks: tuple[CheckResult, ...]
    required_check_ids: tuple[str, ...]
    unresolved_check_ids: tuple[str, ...]
    missing_check_ids: tuple[str, ...]
    duplicate_check_ids: tuple[str, ...]
    freeze_ready: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "profile_id": self.profile_id,
            "state": self.state.value,
            "checks": [item.as_dict() for item in self.checks],
            "required_check_ids": list(self.required_check_ids),
            "unresolved_check_ids": list(self.unresolved_check_ids),
            "missing_check_ids": list(self.missing_check_ids),
            "duplicate_check_ids": list(self.duplicate_check_ids),
            "freeze_ready": self.freeze_ready,
        }
