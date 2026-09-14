from dataclasses import dataclass

@dataclass(frozen=True)
class LatestContinuity:
    key: tuple[str, str]
    edge_id: str
    occurrence_ref: str
    occurred_at_tau: float
    known_at_tau: float

class FrontContinuityState:
    def __init__(self, scope_id):
        self.scope_id = str(scope_id).strip()
        if not self.scope_id:
            raise ValueError("scope_id required")
        self.latest = None
        self.release_ready = False
