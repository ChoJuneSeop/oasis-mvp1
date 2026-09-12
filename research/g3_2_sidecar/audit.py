from dataclasses import dataclass

from .bridge import EpochObservation
from .history import HistoryEntry


@dataclass(frozen=True)
class AuditReport:
    passed: bool
    violations: tuple[str, ...]


def _relation_set(relations):
    return frozenset((r.experience_id, r.relation_element_id) for r in relations)


def audit_observation(observation: EpochObservation) -> AuditReport:
    violations = []
    tau = observation.snapshot.tau
    for item in observation.participation:
        if item.relation.completed_at_tau > tau:
            violations.append("future relation entered participation")
    group_sets = {_relation_set(item.relations) for item in observation.group_participation}
    for item in observation.group_participation:
        if item.observed_at_tau > tau:
            violations.append("group participation is not aligned with current epoch")
        for relation in item.relations:
            if relation.completed_at_tau > tau:
                violations.append("future relation entered group participation")
    for rec in observation.reconstruction:
        if len(rec.vector) != 3:
            violations.append("reconstruction axes were collapsed")
        source_set = _relation_set(tuple(link.source for link in rec.source_links))
        if len(source_set) > 1 and source_set not in group_sets:
            violations.append("multi-relation reconstruction lacks matching joint probe")
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
    group_sets = {_relation_set(item.relations) for item in entry.group_participation}
    for item in entry.group_participation:
        if item.observed_at_tau > entry.decision_tau:
            violations.append("post-decision group participation entered history")
    for rec in entry.reconstruction:
        source_set = _relation_set(tuple(link.source for link in rec.source_links))
        if len(source_set) > 1 and source_set not in group_sets:
            violations.append("completed history lost joint reconstruction provenance")
    for link in entry.provenance:
        if link.source.completed_at_tau > entry.decision_tau:
            violations.append("future relation entered historical provenance")
    return AuditReport(not violations, tuple(violations))
