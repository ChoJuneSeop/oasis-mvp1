from research.g3_rpfo_v1 import rpfo_v12 as base

base.FrontierV12 = base.RelationalFrontierV12
BaseOperatorV12 = base.RelationalParticipationFoldOperatorV12


class OperatorV12(BaseOperatorV12):
    def __init__(self, resolver):
        super().__init__(resolver=resolver)
