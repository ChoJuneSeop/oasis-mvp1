from __future__ import annotations

from copy import deepcopy
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


class V12ClaimInbox:
    def __init__(self):
        self._by_epoch = {}

    def publish(self, *, epoch, claims):
        claims = tuple(deepcopy(tuple(claims)))
        ids = [x.claim_id for x in claims]
        if len(ids) != len(set(ids)):
            raise CoreV11InvariantError("duplicate claim id")
        staged = dict(self._by_epoch)
        prior = staged.get(epoch)
        if prior is not None and prior != claims:
            raise CoreV11InvariantError("claim set changed inside one epoch")
        staged[epoch] = claims
        self._by_epoch = staged

    def read(self, *, epoch):
        return deepcopy(tuple(self._by_epoch.get(epoch, ())))


class EpochTransactionV12:
    FIELDS = (
        "_participation_state",
        "_carried_frontier",
        "_epoch_repo_snapshot",
        "_epoch_history_snapshot",
        "_epoch_identity",
        "_epoch_frame_copy",
        "_epoch_rpfo_snapshot",
    )

    @classmethod
    def capture(cls, core):
        return tuple(getattr(core, name) for name in cls.FIELDS)

    @classmethod
    def restore(cls, core, values):
        for name, value in zip(cls.FIELDS, values):
            setattr(core, name, value)
