from dataclasses import dataclass

@dataclass(frozen=True)
class PostRealizationOutcome:
    observed_at_tau: float
    description: str
