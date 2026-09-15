from __future__ import annotations

from copy import deepcopy

from research.choice_responsibility_v01.integration import IntegratedChoiceCore
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError

from .contracts import MaintainCurrentFlow, RecallDirective
from .eligibility import ReentryAuthorization


class GapMediatedIntegratedChoiceCore(IntegratedChoiceCore):
    """Axis-2 integration that makes the recall gate authoritative.

    The underlying history remains append-only and intact.  Each current epoch must
    explicitly bind either MaintainCurrentFlow or a RecallDirective before the
    ordinary core opens the frame.  Only the resulting epoch-local history view is
    visible to relation participation.  This class is separate from the frozen
    Axis-1 core and does not change its default behavior.
    """

    def __init__(self, **operators):
        super().__init__(**operators)
        self._pending_gap_access = None
        self._active_history_keys: frozenset[tuple[str, str]] | None = None

    @classmethod
    def from_integrated_core(cls, core: IntegratedChoiceCore):
        return cls(
            assessment_operator=core.assessment_operator,
            verifier=core.verifier,
            preference_operator=core.integrated_choice.preference_operator,
            relation_builder=core.relation_builder,
            candidate_provider=core.candidate_provider,
            relation_operator=core.relation_operator,
            reconstruction_operator=core.reconstruction_operator,
            responsibility_operator=core.responsibility_operator,
            actuation_operator=core.actuation_operator,
            history=core.history_envelopes(),
        )

    def bind_gap_access(
        self, decision: MaintainCurrentFlow | ReentryAuthorization
    ) -> None:
        if self._pending_gap_access is not None:
            raise CoreV11InvariantError("gap access is already bound for the next epoch")
        if isinstance(decision, RecallDirective):
            raise CoreV11InvariantError(
                "recall is retrieval authority, not re-entry authorization"
            )
        if not isinstance(decision, (MaintainCurrentFlow, ReentryAuthorization)):
            raise TypeError(
                "history access requires MaintainCurrentFlow or ReentryAuthorization"
            )
        if isinstance(decision, ReentryAuthorization):
            if (
                decision.permits_direct_probability_update
                or decision.permits_direct_choice
                or decision.constitutes_reevaluation
            ):
                raise CoreV11InvariantError("recall directive exceeds recall-only authority")
        self._pending_gap_access = deepcopy(decision)

    def open_current_epoch(self, frame):
        decision = self._pending_gap_access
        if decision is None:
            raise CoreV11InvariantError(
                "Axis-2 current epoch requires an explicit gap access decision"
            )
        if decision.revision != frame.revision or decision.observed_at_tau != frame.tau:
            raise CoreV11InvariantError(
                "gap access decision is not bound to the current frame"
            )

        if isinstance(decision, MaintainCurrentFlow):
            keys: frozenset[tuple[str, str]] = frozenset()
        else:
            known_keys = frozenset(
                self._source_key(envelope.record.source)
                for envelope in super().history_envelopes()
            )
            requested = frozenset(decision.authorized_source_keys)
            if not requested.issubset(known_keys):
                raise CoreV11InvariantError("re-entry authorization names unknown history")
            keys = requested

        self._active_history_keys = keys
        self._pending_gap_access = None
        return super().open_current_epoch(frame)

    def history_records(self):
        records = super().history_records()
        if self._active_history_keys is None:
            raise CoreV11InvariantError(
                "Axis-2 history view is unavailable before a gap-mediated epoch"
            )
        return tuple(
            record
            for record in records
            if self._source_key(record.source) in self._active_history_keys
        )

    def active_history_keys(self) -> tuple[tuple[str, str], ...]:
        if self._active_history_keys is None:
            return ()
        return tuple(sorted(self._active_history_keys))
