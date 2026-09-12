from dataclasses import dataclass

@dataclass(frozen=True)
class AnchorRecord:
    experience_id: str
    decision_tau: float
    realized_tau: float
    relation_end_tau: float
    selected_possibility_id: str
    realization_ref: str
