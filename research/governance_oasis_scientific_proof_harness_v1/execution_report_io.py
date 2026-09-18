from __future__ import annotations

import json
from pathlib import Path

from research.oasis_experiment_freeze_harness_v1.models import GateReport, GateState


def load_execution_report(path: Path) -> GateReport:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return GateReport(
        profile_id=str(raw["profile_id"]),
        state=GateState(raw["state"]),
        checks=(),
        required_check_ids=tuple(str(x) for x in raw.get("required_check_ids", ())),
        unresolved_check_ids=tuple(str(x) for x in raw.get("unresolved_check_ids", ())),
        missing_check_ids=tuple(str(x) for x in raw.get("missing_check_ids", ())),
        duplicate_check_ids=tuple(str(x) for x in raw.get("duplicate_check_ids", ())),
        freeze_ready=bool(raw["freeze_ready"]),
    )
