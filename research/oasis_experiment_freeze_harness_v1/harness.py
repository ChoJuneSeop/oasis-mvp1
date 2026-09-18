from __future__ import annotations

from collections import Counter
from dataclasses import replace
from typing import Iterable, Mapping

from .models import CheckCategory, CheckResult, CheckStatus, GateReport, GateState


class InvalidGateTransition(RuntimeError):
    pass


_ALLOWED_TRANSITIONS: Mapping[GateState, tuple[GateState, ...]] = {
    GateState.DRAFT: (GateState.STATIC_KILLSEARCH,),
    GateState.STATIC_KILLSEARCH: (GateState.CAUSAL_KILLSEARCH, GateState.DRAFT),
    GateState.CAUSAL_KILLSEARCH: (GateState.EXECUTION_KILLSEARCH, GateState.DRAFT),
    GateState.EXECUTION_KILLSEARCH: (GateState.CROSS_ARM_GATE, GateState.DRAFT),
    GateState.CROSS_ARM_GATE: (GateState.ADVERSARIAL_RECHECK, GateState.DRAFT),
    GateState.ADVERSARIAL_RECHECK: (GateState.FREEZE_READY, GateState.DRAFT),
    GateState.FREEZE_READY: (GateState.FROZEN, GateState.DRAFT),
    GateState.FROZEN: (GateState.EXECUTION_READY,),
    GateState.EXECUTION_READY: (GateState.EXECUTED,),
    GateState.EXECUTED: (GateState.ANALYSIS_ONLY,),
    GateState.ANALYSIS_ONLY: (),
}


class ExperimentFreezeHarness:
    """Fail-closed gate for OASIS experiment design/freeze/execution.

    A human may propose a state, but this harness is the authority that determines
    whether FREEZE_READY is reachable. Any missing, duplicated, failed, blocked,
    or unverified blocking check forces the profile back to DRAFT.
    """

    def __init__(
        self,
        *,
        profile_id: str,
        required_checks: Mapping[str, CheckCategory],
    ):
        if not profile_id.strip():
            raise ValueError("profile_id is required")
        if not required_checks:
            raise ValueError("required_checks may not be empty")
        self.profile_id = profile_id
        self.required_checks = dict(required_checks)

    def evaluate(self, results: Iterable[CheckResult]) -> GateReport:
        checks = tuple(results)
        counts = Counter(item.check_id for item in checks)
        duplicate_ids = tuple(sorted(k for k, n in counts.items() if n != 1))
        seen = {item.check_id for item in checks}
        missing = tuple(sorted(set(self.required_checks) - seen))

        category_mismatch = []
        unknown = []
        unresolved = []
        for item in checks:
            expected_category = self.required_checks.get(item.check_id)
            if expected_category is None:
                unknown.append(item.check_id)
                if item.blocking:
                    unresolved.append(item.check_id)
                continue
            if expected_category is not item.category:
                category_mismatch.append(item.check_id)
                unresolved.append(item.check_id)
            elif item.blocking and item.status is not CheckStatus.PASS:
                unresolved.append(item.check_id)

        unresolved.extend(missing)
        unresolved.extend(duplicate_ids)
        unresolved.extend(category_mismatch)
        unresolved_ids = tuple(sorted(set(unresolved)))

        freeze_ready = (
            not unresolved_ids
            and not missing
            and not duplicate_ids
            and len(checks) >= len(self.required_checks)
        )
        state = GateState.FREEZE_READY if freeze_ready else GateState.DRAFT

        return GateReport(
            profile_id=self.profile_id,
            state=state,
            checks=checks,
            required_check_ids=tuple(self.required_checks),
            unresolved_check_ids=unresolved_ids,
            missing_check_ids=missing,
            duplicate_check_ids=duplicate_ids,
            freeze_ready=freeze_ready,
        )

    def require_freeze_ready(self, report: GateReport) -> GateReport:
        if report.profile_id != self.profile_id:
            raise InvalidGateTransition(
                f"profile mismatch: {report.profile_id!r} != {self.profile_id!r}"
            )
        if not report.freeze_ready or report.state is not GateState.FREEZE_READY:
            raise InvalidGateTransition(
                "experiment is not FREEZE_READY; unresolved="
                + ",".join(report.unresolved_check_ids)
            )
        return report

    def transition(
        self,
        *,
        current: GateState,
        target: GateState,
        report: GateReport | None = None,
    ) -> GateState:
        if target not in _ALLOWED_TRANSITIONS[current]:
            raise InvalidGateTransition(f"illegal gate transition: {current} -> {target}")
        if target is GateState.FREEZE_READY:
            if report is None:
                raise InvalidGateTransition("FREEZE_READY requires a GateReport")
            self.require_freeze_ready(report)
        if target is GateState.FROZEN:
            if current is not GateState.FREEZE_READY:
                raise InvalidGateTransition("FROZEN requires FREEZE_READY")
            if report is None:
                raise InvalidGateTransition("FROZEN requires the passing GateReport")
            self.require_freeze_ready(report)
        return target

    def freeze(self, report: GateReport) -> GateReport:
        self.require_freeze_ready(report)
        return replace(report, state=GateState.FROZEN)
