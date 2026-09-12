from dataclasses import dataclass

@dataclass(frozen=True)
class ClosureRecord:
    start_tau: float
    observed_tau: float
    record_id: str
