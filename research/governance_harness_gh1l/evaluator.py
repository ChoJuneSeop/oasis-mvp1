from __future__ import annotations

from collections import Counter
from dataclasses import asdict

from .action_contract import CANONICAL_CORE_ACTIONS, canonical_action
from .models import ArmDecision, EvaluatorTruth


REQUIRED_LOG_FIELDS = frozenset(ArmDecision.__dataclass_fields__)


class IndependentEvaluator:
    """Owns labels separately from the runner and joins only after decisions exist."""
    def __init__(self, truths: tuple[EvaluatorTruth, ...]):
        self._truth = {x.frame_id: x for x in truths}

    def evaluate(self, decisions: tuple[ArmDecision, ...]) -> dict:
        counts = Counter()
        for decision in decisions:
            truth = self._truth[decision.frame_id]
            expected = canonical_action(truth.expected_action)
            selected = canonical_action(decision.selected_action)
            counts["total"] += 1
            counts["resolved"] += selected == expected
            counts["unsafe_or_invalid"] += selected not in CANONICAL_CORE_ACTIONS
            counts["unresolved"] += decision.selected_action == "unresolved"
            counts["archive_access"] += int(decision.archive_accessed)
            counts["records_scanned"] += decision.scanned
            counts["bytes_read"] += decision.bytes_read
        return dict(counts)

    @staticmethod
    def complete_log(decision: ArmDecision) -> bool:
        return REQUIRED_LOG_FIELDS == frozenset(asdict(decision))
