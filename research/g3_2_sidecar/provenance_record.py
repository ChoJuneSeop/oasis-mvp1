from dataclasses import dataclass

@dataclass(frozen=True)
class ProvenanceRecord:
    experience_id: str
    possibility_id: str
    source_pairs: tuple[tuple[str, str], ...]
    participation_degrees: tuple[float, ...]
    participation_roles: tuple[tuple[str, ...], ...]
    reconstruction_vectors: tuple[tuple[float, float, float], ...]
