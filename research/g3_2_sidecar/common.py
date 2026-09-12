from dataclasses import dataclass, field
from math import isfinite
from typing import Any, Mapping

class G32InvariantError(ValueError):
    pass

def require_tau(name: str, value: float) -> float:
    value = float(value)
    if not isfinite(value):
        raise G32InvariantError(f"{name} must be finite")
    return value

def normalize_distribution(values: Mapping[str, float]) -> dict[str, float]:
    if not values:
        raise G32InvariantError("possibility distribution must not be empty")
    clean: dict[str, float] = {}
    total = 0.0
    for key, raw in values.items():
        value = float(raw)
        if not isfinite(value) or value < 0.0:
            raise G32InvariantError(f"invalid possibility mass for {key!r}")
        clean[str(key)] = value
        total += value
    if total <= 0.0:
        raise G32InvariantError("possibility distribution must contain positive mass")
    return {k: v / total for k, v in clean.items()}

@dataclass(frozen=True)
class RelationElementRef:
    experience_id: str
    relation_element_id: str
    completed_at_tau: float
    relation_descriptor: Mapping[str, Any] = field(default_factory=dict)
    def __post_init__(self):
        object.__setattr__(self, "completed_at_tau", require_tau("completed_at_tau", self.completed_at_tau))
        if not self.experience_id or not self.relation_element_id:
            raise G32InvariantError("experience_id and relation_element_id are required")
