from research.g3_rpfo_v1 import rpfo_v12 as base
from research.g3_rpfo_v1.entry_v12 import OperatorV12

setattr(base, "RelationalParticipationFoldOperatorV12", OperatorV12)

from research.g3_rpfo_v1.core_v12 import StrictRPFOOrganicCoreV12

__all__ = ["StrictRPFOOrganicCoreV12"]
