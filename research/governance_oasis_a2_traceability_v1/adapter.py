from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Generic, Iterable, TypeVar

from .ledger import ReferenceLedger


T = TypeVar("T")


@dataclass(frozen=True)
class DecisionInputEnvelope:
    """CE-derived input crossing the exact decision-operator boundary."""

    ce_instance_id: str
    payload_digest: str
    relation_digest: str
    order_digest: str


class DecisionBoundaryTap(Generic[T]):
    """Independent reference-plane tap placed immediately around the decision call.

    Contribution truth is defined by inputs that cross this boundary. The tap
    never consults SystemTraceBuilder or any OASIS self-reported contribution flag.
    """

    def __init__(self, ledger: ReferenceLedger):
        self._ledger = ledger

    def invoke(
        self,
        decision_operator: Callable[[tuple[DecisionInputEnvelope, ...]], T],
        ce_inputs: Iterable[DecisionInputEnvelope],
    ) -> T:
        frozen_inputs = tuple(ce_inputs)
        for item in frozen_inputs:
            self._ledger.observe_decision_input_consumed(
                ce_instance_id=item.ce_instance_id,
                payload_digest=item.payload_digest,
                relation_digest=item.relation_digest,
                order_digest=item.order_digest,
            )
        return decision_operator(frozen_inputs)
