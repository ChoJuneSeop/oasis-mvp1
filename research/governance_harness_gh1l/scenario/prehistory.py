from __future__ import annotations

import hashlib
import json
from dataclasses import asdict

from research.governance_harness_v01.gh1a_structural_run import (
    ControlledFlow, Participation, Responsibility, Revalidation, close,
)
from research.governance_harness_v01.harness_v04 import (
    CurrentFlowGapRule, GovernanceHarnessV04, HistoryAccessPort,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle

from ..models import Experience


PREHISTORY_PLAN = (
    ("P01", "REL-A", "closing", "yield-space"),
    ("P02", "REL-A", "reversed", "continue"),
    ("P03", "REL-B", "crossing", "hold-course"),
    ("P04", "REL-C", "closing", "yield-space"),
    ("P05", "REL-C", "open", "continue"),
    ("P06", "DISTRACTOR-X", "closing", "hold-course"),
)


def build_frozen_archive() -> tuple[Experience, ...]:
    """Create every archive item only after the real GH-1 Closure path commits."""
    result: list[Experience] = []
    for index, (experience_id, relation_id, context, action) in enumerate(PREHISTORY_PLAN, 1):
        bundle = build_domain_bundle()
        port = HistoryAccessPort(())
        harness = GovernanceHarnessV04(
            core=bundle.core, history_port=port,
            gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
            reengagement_operator=Participation(),
            responsibility_operator=Responsibility(),
            revalidation_operator=Revalidation(),
        )
        flow = ControlledFlow(relation_id)
        execution = harness.execute_decision_epoch(flow, relation_id=relation_id)
        completed = close(harness, flow)
        if completed.history_entry is None or port.committed_count != 1:
            raise RuntimeError("prehistory experience did not pass actual Closure")
        result.append(Experience(
            experience_id=experience_id, relation_id=relation_id, context=context,
            recommended_action=action, completed_tau=float(index),
            provenance_ref=f"closure:{completed.history_entry.entry_id}:{experience_id}",
            closure_entry_id=completed.history_entry.entry_id,
        ))
        if execution.pending is not True:
            raise RuntimeError("prehistory decision skipped pending-outcome state")
    return tuple(result)


def archive_hash(archive: tuple[Experience, ...]) -> str:
    payload = json.dumps([asdict(x) for x in archive], sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
