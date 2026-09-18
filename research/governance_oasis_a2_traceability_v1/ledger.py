from __future__ import annotations

from dataclasses import replace
from typing import Any

from .models import EventType, ReferenceEvent


class LedgerIntegrityError(RuntimeError):
    pass


_PRE_SEAL_TYPES = {
    EventType.CANDIDATE_OBSERVED,
    EventType.REVALIDATION_OBSERVED,
    EventType.PARTICIPATION_OBSERVED,
    EventType.DECISION_INPUT_CONSUMED,
}


class ReferenceLedger:
    """Independent reference instrumentation plane.

    The ledger observes runtime boundaries and never derives contribution truth
    from the OASIS provenance plane. At PRE_REALIZATION_SEAL it only commits the
    already-sealed system-trace digest, allowing the evaluator to prove that the
    OASIS trace existed before realization.
    """

    def __init__(
        self,
        *,
        run_id: str,
        execution_profile_id: str,
        contrast_id: str,
        arm_id: str,
        decision_invocation_id: str,
    ):
        self.run_id = run_id
        self.execution_profile_id = execution_profile_id
        self.contrast_id = contrast_id
        self.arm_id = arm_id
        self.decision_invocation_id = decision_invocation_id
        self._events: list[ReferenceEvent] = []
        self._sealed = False
        self._realized = False

    @property
    def events(self) -> tuple[ReferenceEvent, ...]:
        return tuple(self._events)

    def _append(
        self,
        event_type: EventType,
        *,
        ce_instance_id: str | None = None,
        payload_digest: str = "",
        relation_digest: str = "",
        order_digest: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> ReferenceEvent:
        previous_hash = self._events[-1].event_hash if self._events else ""
        event = ReferenceEvent(
            sequence_number=len(self._events) + 1,
            event_type=event_type,
            run_id=self.run_id,
            execution_profile_id=self.execution_profile_id,
            contrast_id=self.contrast_id,
            arm_id=self.arm_id,
            decision_invocation_id=self.decision_invocation_id,
            ce_instance_id=ce_instance_id,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
            metadata=dict(metadata or {}),
            previous_event_hash=previous_hash,
            event_hash="",
        )
        event = replace(event, event_hash=event.computed_hash())
        self._events.append(event)
        return event

    def observe_candidate(
        self,
        *,
        ce_instance_id: str,
        payload_digest: str,
        relation_digest: str,
        order_digest: str,
    ) -> ReferenceEvent:
        if self._sealed:
            raise LedgerIntegrityError("candidate observation after seal is forbidden")
        return self._append(
            EventType.CANDIDATE_OBSERVED,
            ce_instance_id=ce_instance_id,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
        )

    def observe_revalidation(
        self,
        *,
        ce_instance_id: str,
        accepted: bool,
        payload_digest: str,
        relation_digest: str,
        order_digest: str,
    ) -> ReferenceEvent:
        if self._sealed:
            raise LedgerIntegrityError("revalidation observation after seal is forbidden")
        return self._append(
            EventType.REVALIDATION_OBSERVED,
            ce_instance_id=ce_instance_id,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
            metadata={"accepted": bool(accepted)},
        )

    def observe_participation(
        self,
        *,
        ce_instance_id: str,
        participated: bool,
        payload_digest: str,
        relation_digest: str,
        order_digest: str,
    ) -> ReferenceEvent:
        if self._sealed:
            raise LedgerIntegrityError("participation observation after seal is forbidden")
        return self._append(
            EventType.PARTICIPATION_OBSERVED,
            ce_instance_id=ce_instance_id,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
            metadata={"participated": bool(participated)},
        )

    def observe_decision_input_consumed(
        self,
        *,
        ce_instance_id: str,
        payload_digest: str,
        relation_digest: str,
        order_digest: str,
    ) -> ReferenceEvent:
        if self._sealed:
            raise LedgerIntegrityError("decision consumption after seal is forbidden")
        return self._append(
            EventType.DECISION_INPUT_CONSUMED,
            ce_instance_id=ce_instance_id,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
        )

    def seal_pre_realization(self, *, system_trace_digest: str) -> ReferenceEvent:
        if self._sealed:
            raise LedgerIntegrityError("multiple pre-realization seals are forbidden")
        if self._realized:
            raise LedgerIntegrityError("cannot seal after realization")
        if not self._events:
            raise LedgerIntegrityError("cannot seal an empty reference ledger")
        self._sealed = True
        return self._append(
            EventType.PRE_REALIZATION_SEAL,
            metadata={"system_trace_digest": system_trace_digest},
        )

    def realize(self, *, action_id: str) -> ReferenceEvent:
        if not self._sealed:
            raise LedgerIntegrityError("realization requires a pre-realization seal")
        if self._realized:
            raise LedgerIntegrityError("multiple realizations are forbidden")
        if not self._events or self._events[-1].event_type is not EventType.PRE_REALIZATION_SEAL:
            raise LedgerIntegrityError("realization must immediately follow the seal")
        self._realized = True
        return self._append(
            EventType.SINGLE_REALIZATION,
            metadata={"action_id": action_id},
        )

    def post_outcome(self, *, observation_id: str) -> ReferenceEvent:
        if not self._realized:
            raise LedgerIntegrityError("post-outcome evidence requires realization")
        return self._append(
            EventType.POST_OUTCOME,
            metadata={"observation_id": observation_id},
        )

    def verify(self) -> tuple[str, ...]:
        errors: list[str] = []
        previous_hash = ""
        seal_positions: list[int] = []
        realization_positions: list[int] = []

        for index, event in enumerate(self._events, start=1):
            if event.sequence_number != index:
                errors.append(f"sequence mismatch at {index}")
            if event.previous_event_hash != previous_hash:
                errors.append(f"previous hash mismatch at {index}")
            if event.event_hash != event.computed_hash():
                errors.append(f"event hash mismatch at {index}")
            if event.run_id != self.run_id:
                errors.append(f"foreign run binding at {index}")
            if event.execution_profile_id != self.execution_profile_id:
                errors.append(f"foreign profile binding at {index}")
            if event.contrast_id != self.contrast_id or event.arm_id != self.arm_id:
                errors.append(f"foreign arm binding at {index}")
            if event.decision_invocation_id != self.decision_invocation_id:
                errors.append(f"decision invocation mismatch at {index}")

            if event.event_type is EventType.PRE_REALIZATION_SEAL:
                seal_positions.append(index)
            elif event.event_type is EventType.SINGLE_REALIZATION:
                realization_positions.append(index)

            previous_hash = event.event_hash

        if len(seal_positions) != 1:
            errors.append(f"expected exactly one seal, found {len(seal_positions)}")
        if len(realization_positions) != 1:
            errors.append(
                f"expected exactly one realization, found {len(realization_positions)}"
            )
        if seal_positions and realization_positions:
            if realization_positions[0] != seal_positions[0] + 1:
                errors.append("realization does not immediately follow seal")
            for event in self._events[seal_positions[0] :]:
                if event.event_type in _PRE_SEAL_TYPES:
                    errors.append("pre-choice provenance event appears after seal")
                    break
        if realization_positions:
            for event in self._events[: realization_positions[0] - 1]:
                if event.event_type is EventType.POST_OUTCOME:
                    errors.append("post-outcome evidence appears before realization")
                    break
        return tuple(errors)

    def seal_event(self) -> ReferenceEvent:
        seals = [e for e in self._events if e.event_type is EventType.PRE_REALIZATION_SEAL]
        if len(seals) != 1:
            raise LedgerIntegrityError("ledger does not contain exactly one seal")
        return seals[0]
