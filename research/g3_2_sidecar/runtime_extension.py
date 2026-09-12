from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Mapping, Sequence

from .common import G32InvariantError, RelationElementRef, normalize_distribution, require_tau
from .history import HistoryEntry
from .participation import (
    CounterfactualProbeResult,
    GroupParticipationMeasurement,
    ParticipationMeasurement,
    measure_group_participation,
    measure_participation,
)
from .reconstruction import ProvenanceLink, ReconstructionMeasurement


def _relation_key(relation: RelationElementRef) -> tuple[str, str]:
    return (relation.experience_id, relation.relation_element_id)


def _relation_set_key(relations: Sequence[RelationElementRef]) -> frozenset[tuple[str, str]]:
    return frozenset(_relation_key(r) for r in relations)


@dataclass
class G32EpochRecorder:
    """Read-only G3.2 recorder for one continuous decision epoch.

    The host harness remains authoritative for CARLA ticks and the one real action.
    This recorder observes decision-time structures and stores relational genealogy.
    """

    tau: float
    flow_fingerprint: str
    current_reality: Mapping[str, Any]
    relation_elements: tuple[RelationElementRef, ...]
    possibility_distribution: Mapping[str, float]
    participation: list[ParticipationMeasurement] = field(default_factory=list)
    group_participation: list[GroupParticipationMeasurement] = field(default_factory=list)
    reconstruction: list[ReconstructionMeasurement] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.tau = require_tau("tau", self.tau)
        if not self.flow_fingerprint:
            raise G32InvariantError("flow_fingerprint is required")
        self.possibility_distribution = normalize_distribution(self.possibility_distribution)
        for rel in self.relation_elements:
            if rel.completed_at_tau > self.tau:
                raise G32InvariantError("future relation element entered current epoch")

    def record_relation_probe(
        self,
        relation: RelationElementRef,
        *,
        before_fingerprint: str,
        after_fingerprint: str,
        relation_ablated_distribution: Mapping[str, float],
        role_trace: Sequence[str] = (),
        generated_possibilities: Sequence[str] = (),
    ) -> ParticipationMeasurement:
        if relation not in self.relation_elements:
            raise G32InvariantError("probe relation is not in the epoch relation set")
        if before_fingerprint != self.flow_fingerprint or after_fingerprint != self.flow_fingerprint:
            raise G32InvariantError("internal probe changed or mismatched the real-flow fingerprint")
        probe = CounterfactualProbeResult(
            state_hash_before=before_fingerprint,
            state_hash_after=after_fingerprint,
            full_distribution=self.possibility_distribution,
            relation_ablated_distribution=relation_ablated_distribution,
            full_role_trace=tuple(str(x) for x in role_trace),
            generated_possibilities=tuple(str(x) for x in generated_possibilities),
        )
        measurement = measure_participation(self.tau, relation, probe)
        self.participation.append(measurement)
        return measurement

    def record_group_probe(
        self,
        relations: Sequence[RelationElementRef],
        *,
        before_fingerprint: str,
        after_fingerprint: str,
        group_ablated_distribution: Mapping[str, float],
        generated_possibilities: Sequence[str] = (),
    ) -> GroupParticipationMeasurement:
        rels = tuple(relations)
        if any(rel not in self.relation_elements for rel in rels):
            raise G32InvariantError("group probe contains relation outside the epoch relation set")
        if before_fingerprint != self.flow_fingerprint or after_fingerprint != self.flow_fingerprint:
            raise G32InvariantError("group probe changed or mismatched the real-flow fingerprint")
        measurement = measure_group_participation(
            self.tau,
            rels,
            state_hash_before=before_fingerprint,
            state_hash_after=after_fingerprint,
            full_distribution=self.possibility_distribution,
            group_ablated_distribution=group_ablated_distribution,
            generated_possibilities=generated_possibilities,
        )
        self.group_participation.append(measurement)
        return measurement

    def _has_matching_group_probe(self, source_links: Sequence[ProvenanceLink]) -> bool:
        wanted = _relation_set_key(tuple(link.source for link in source_links))
        return any(_relation_set_key(item.relations) == wanted for item in self.group_participation)

    def record_reconstruction(self, measurement: ReconstructionMeasurement) -> None:
        if measurement.observed_at_tau != self.tau:
            raise G32InvariantError("reconstruction is not aligned with the current epoch")
        known = {_relation_key(r) for r in self.relation_elements}
        for link in measurement.source_links:
            key = _relation_key(link.source)
            if key not in known:
                raise G32InvariantError("reconstruction provenance references an unknown relation element")
            if link.source.completed_at_tau > self.tau:
                raise G32InvariantError("future relation entered reconstruction provenance")
        if len(measurement.source_links) > 1 and not self._has_matching_group_probe(measurement.source_links):
            raise G32InvariantError("multi-relation reconstruction requires a matching joint relation probe")
        self.reconstruction.append(measurement)

    def _provenance(self) -> tuple[ProvenanceLink, ...]:
        seen: dict[tuple[str, str], ProvenanceLink] = {}
        participation_map = {_relation_key(p.relation): p for p in self.participation}
        for rec in self.reconstruction:
            for link in rec.source_links:
                key = _relation_key(link.source)
                p = participation_map.get(key)
                if p is None:
                    raise G32InvariantError("reconstruction source lacks participation measurement")
                seen[key] = ProvenanceLink(
                    source=link.source,
                    distribution_effect=p.distribution_effect,
                    participation_roles=p.role_trace,
                    generated_possibilities=p.generated_possibilities,
                    contribution_trace=link.contribution_trace,
                )
        return tuple(seen.values())

    def complete_history_entry(
        self,
        *,
        entry_id: str,
        realized_tau: float,
        outcome_tau: float,
        relation_end_tau: float,
        selected_possibility_id: str,
        realization_ref: str,
        realization_count: int,
        outcome_description: str,
        closure_method: str,
        closure_evidence: Mapping[str, Any],
    ) -> HistoryEntry:
        if selected_possibility_id not in self.possibility_distribution:
            raise G32InvariantError("realized possibility was not present in the decision-time distribution")
        return HistoryEntry(
            entry_id=entry_id,
            decision_tau=self.tau,
            realized_tau=realized_tau,
            outcome_tau=outcome_tau,
            relation_end_tau=relation_end_tau,
            selected_possibility_id=selected_possibility_id,
            realization_ref=realization_ref,
            realization_count=realization_count,
            outcome_description=outcome_description,
            current_reality=dict(self.current_reality),
            participation=tuple(self.participation),
            group_participation=tuple(self.group_participation),
            reconstruction=tuple(self.reconstruction),
            provenance=self._provenance(),
            closure_method=closure_method,
            closure_evidence=dict(closure_evidence),
        )

    def decision_record(self) -> dict[str, Any]:
        return {
            "tau": self.tau,
            "flow_fingerprint": self.flow_fingerprint,
            "current_reality": dict(self.current_reality),
            "relation_elements": [asdict(x) for x in self.relation_elements],
            "possibility_distribution": dict(self.possibility_distribution),
            "participation": [asdict(x) for x in self.participation],
            "group_participation": [asdict(x) for x in self.group_participation],
            "reconstruction": [asdict(x) for x in self.reconstruction],
        }
