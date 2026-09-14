from research.g3_rpfo_v1.rpfo_v12 import CurrentContinuityClaimV12
from .state import FrontContinuityState

FRONT_RELATION_ID = "current:front-longitudinal"
FRONT_EVIDENCE_REFS = ("current:front-longitudinal", "observation:front-present")


def claims_for_frame(state: FrontContinuityState, frame):
    if not frame.observation.front_present or state.latest is None:
        return ()
    frame.assert_current_evidence(FRONT_EVIDENCE_REFS)
    return (CurrentContinuityClaimV12(
        claim_id="front-claim:%s:%s" % (frame.observation.epoch, state.latest.edge_id),
        current_relation_id=FRONT_RELATION_ID,
        edge_id=state.latest.edge_id,
        current_evidence_refs=FRONT_EVIDENCE_REFS,
        observed_at_tau=float(frame.tau),
    ),)
