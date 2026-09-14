from research.g3_rpfo_v1 import rpfo_v12 as base
from research.g3_rpfo_v1.operator_v12 import (
    CanonicalRelationalParticipationFoldOperatorV12,
)

setattr(base, "FrontierV12", base.RelationalFrontierV12)


class CoreOperatorV12(CanonicalRelationalParticipationFoldOperatorV12):
    def __init__(self, resolver):
        super().__init__(resolver=resolver)


setattr(base, "RelationalParticipationFoldOperatorV12", CoreOperatorV12)

from research.g3_rpfo_v1.core_v12 import StrictRPFOOrganicCoreV12

__all__ = ["StrictRPFOOrganicCoreV12", "CoreOperatorV12"]
