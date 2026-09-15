from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class ReevaluationDecision:
    occurred: bool
    changed_inputs: tuple[str, ...]
    reason: str


class IndependentReevaluationGate:
    """Decide from possibility/responsibility changes, never from re-entry alone."""

    FIELDS = ("possibility_distribution", "responsibilities", "eligible_ids")

    def evaluate(
        self,
        *,
        baseline: Mapping[str, Any],
        current: Mapping[str, Any],
    ) -> ReevaluationDecision:
        changed = tuple(field for field in self.FIELDS if baseline[field] != current[field])
        return ReevaluationDecision(
            occurred=bool(changed),
            changed_inputs=changed,
            reason=(
                "possibility or responsibility state changed"
                if changed
                else "re-entry alone supplied no independent reevaluation cause"
            ),
        )
