from copy import deepcopy

from research.g3_rpfo_v1 import rpfo_v12 as base
from research.g3_rpfo_v1.operator_v12 import (
    CanonicalRelationalParticipationFoldOperatorV12,
)

setattr(base, "FrontierV12", base.RelationalFrontierV12)


class CoreOperatorV12(CanonicalRelationalParticipationFoldOperatorV12):
    def __init__(self, resolver):
        super().__init__(resolver=resolver)


setattr(base, "RelationalParticipationFoldOperatorV12", CoreOperatorV12)

from research.g3_rpfo_v1.core_v12 import (
    StrictRPFOOrganicCoreV12 as _BaseRPFOCoreV12,
)


class StrictRPFOOrganicCoreV12(_BaseRPFOCoreV12):
    """Canonical Core with full failed-epoch state rollback."""

    def open_current_epoch(self, frame):
        builder = self.relation_builder
        builder_state = (
            getattr(builder, "_observation", None),
            getattr(builder, "_relations", None),
        )
        core_state = (
            self._frame,
            self._last_evaluation,
            self._resource_plan,
            self._last_context,
            self._last_choice,
            self._last_organic_resource_plan,
        )
        ledger_state = (
            deepcopy(self.variable_ledger._active),
            deepcopy(self.variable_ledger._events),
        )
        try:
            return super().open_current_epoch(frame)
        except Exception:
            (
                self._frame,
                self._last_evaluation,
                self._resource_plan,
                self._last_context,
                self._last_choice,
                self._last_organic_resource_plan,
            ) = core_state
            if hasattr(builder, "_observation"):
                builder._observation = builder_state[0]
            if hasattr(builder, "_relations"):
                builder._relations = builder_state[1]
            self.variable_ledger._active = ledger_state[0]
            self.variable_ledger._events = ledger_state[1]
            raise


__all__ = ["StrictRPFOOrganicCoreV12", "CoreOperatorV12"]
