from __future__ import annotations

from dataclasses import replace

from .models import SystemTrace, TraceEntry


class TraceStateError(RuntimeError):
    pass


class SystemTraceBuilder:
    """OASIS provenance plane.

    This builder records what Governance OASIS claims happened. It does not
    create reference truth. The independent ReferenceLedger observes the
    decision boundary separately.
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
        self._entries: dict[str, TraceEntry] = {}
        self._sealed = False

    def _require_open(self) -> None:
        if self._sealed:
            raise TraceStateError("system trace is already sealed")

    def candidate(
        self,
        *,
        ce_instance_id: str,
        payload_digest: str,
        relation_digest: str,
        order_digest: str,
        provenance_ref: str,
    ) -> None:
        self._require_open()
        if ce_instance_id in self._entries:
            raise TraceStateError(f"duplicate CE candidate: {ce_instance_id}")
        self._entries[ce_instance_id] = TraceEntry(
            ce_instance_id=ce_instance_id,
            candidate=True,
            revalidated=None,
            participated=None,
            decision_consumed=False,
            payload_digest=payload_digest,
            relation_digest=relation_digest,
            order_digest=order_digest,
            provenance_ref=provenance_ref,
        )

    def revalidate(self, ce_instance_id: str, *, accepted: bool) -> None:
        self._require_open()
        entry = self._entries.get(ce_instance_id)
        if entry is None or not entry.candidate:
            raise TraceStateError("revalidation requires an existing candidate")
        if entry.revalidated is not None:
            raise TraceStateError("revalidation may be recorded only once")
        self._entries[ce_instance_id] = replace(entry, revalidated=accepted)

    def participate(self, ce_instance_id: str, *, participated: bool) -> None:
        self._require_open()
        entry = self._entries.get(ce_instance_id)
        if entry is None or entry.revalidated is None:
            raise TraceStateError("participation requires a revalidation result")
        if entry.participated is not None:
            raise TraceStateError("participation may be recorded only once")
        if participated and not entry.revalidated:
            raise TraceStateError("revalidation NO cannot participate")
        self._entries[ce_instance_id] = replace(entry, participated=participated)

    def consume(self, ce_instance_id: str) -> None:
        self._require_open()
        entry = self._entries.get(ce_instance_id)
        if entry is None or entry.participated is not True:
            raise TraceStateError("decision consumption requires participation")
        if entry.decision_consumed:
            raise TraceStateError("decision consumption may be recorded only once")
        self._entries[ce_instance_id] = replace(entry, decision_consumed=True)

    def seal(self) -> SystemTrace:
        self._require_open()
        if not self._entries:
            raise TraceStateError("cannot seal an empty system trace")
        self._sealed = True
        return SystemTrace(
            run_id=self.run_id,
            execution_profile_id=self.execution_profile_id,
            contrast_id=self.contrast_id,
            arm_id=self.arm_id,
            decision_invocation_id=self.decision_invocation_id,
            entries=tuple(sorted(self._entries.values(), key=lambda x: x.ce_instance_id)),
            sealed=True,
        )
