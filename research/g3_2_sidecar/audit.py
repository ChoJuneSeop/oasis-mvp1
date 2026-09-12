from dataclasses import dataclass

from .bridge import EpochObservation
from .history import HistoryEntry


@dataclass(frozen=True)
class AuditReport:
    passed: bool
    violations: tuple[str, ...]


def audit_observation(observation: EpochObservation) -> AuditReport:
    violations = []
    tau = observation.snapshot.tau
    for item in observation.participation:
        if item.relation.completed_at_tau > tau:
            violations.append("future relation entered participation")
    for rec in observation.reconstruction:
        if len(rec.vector) != 3:
            violations.append("reconstruction axes were collapsed")
        for link in rec.source_links:
            if link.source.completed_at_tau > tau:
                violations.append("future relation entered reconstruction provenance")
    return AuditReport(not violations, tuple(violations))


def audit_history(entry: HistoryEntry) -> AuditReport:
    violations = []
    if entry.realization_count != 1:
        violations.append("decision epoch must contain exactly one realization")
    if not entry.closure_method.strip():
        violations.append("relation-process closure evidence is missing")
    for link in entry.provenance:
        if link.source.completed_at_tau > entry.decision_tau:
            violations.append("future relation entered historical provenance")
    return AuditReport(not violations, tuple(violations))
