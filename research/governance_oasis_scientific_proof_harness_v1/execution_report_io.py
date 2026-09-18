from __future__ import annotations

from collections import Counter
import json
from pathlib import Path

from research.oasis_experiment_freeze_harness_v1.models import (
    CheckCategory,
    CheckResult,
    CheckStatus,
    GateReport,
    GateState,
)


def load_execution_report(path: Path) -> GateReport:
    """Load a lower-harness report without trusting its freeze_ready Boolean.

    The serialized report is treated as evidence, not authority. Readiness is
    recomputed from concrete check results, required IDs, missing/duplicate IDs,
    and the serialized state.
    """
    raw = json.loads(path.read_text(encoding="utf-8"))

    checks = tuple(
        CheckResult(
            check_id=str(item["check_id"]),
            category=CheckCategory(item["category"]),
            status=CheckStatus(item["status"]),
            summary=str(item.get("summary", "")),
            evidence=tuple(str(x) for x in item.get("evidence", ())),
            blocking=bool(item.get("blocking", True)),
            metadata=dict(item.get("metadata", {})),
        )
        for item in raw.get("checks", ())
    )
    required = tuple(str(x) for x in raw.get("required_check_ids", ()))
    counts = Counter(item.check_id for item in checks)
    duplicate_from_checks = {
        check_id for check_id, count in counts.items() if count != 1
    }
    duplicate_declared = set(str(x) for x in raw.get("duplicate_check_ids", ()))
    duplicates = tuple(sorted(duplicate_from_checks | duplicate_declared))

    by_id = {item.check_id: item for item in checks if counts[item.check_id] == 1}
    computed_missing = {
        check_id
        for check_id in required
        if check_id not in by_id
    }
    declared_missing = set(str(x) for x in raw.get("missing_check_ids", ()))
    missing = tuple(sorted(computed_missing | declared_missing))

    unresolved = set(str(x) for x in raw.get("unresolved_check_ids", ()))
    unresolved.update(
        check_id
        for check_id in required
        if check_id in by_id
        and by_id[check_id].blocking
        and by_id[check_id].status is not CheckStatus.PASS
    )

    state = GateState(raw["state"])
    declared_ready = bool(raw.get("freeze_ready", False))
    computed_ready = (
        declared_ready
        and state is GateState.FREEZE_READY
        and bool(required)
        and not missing
        and not duplicates
        and not unresolved
        and all(
            check_id in by_id
            and by_id[check_id].status is CheckStatus.PASS
            for check_id in required
        )
    )

    return GateReport(
        profile_id=str(raw["profile_id"]),
        state=state,
        checks=checks,
        required_check_ids=required,
        unresolved_check_ids=tuple(sorted(unresolved)),
        missing_check_ids=missing,
        duplicate_check_ids=duplicates,
        freeze_ready=computed_ready,
    )
