from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from .common import G32InvariantError, RelationElementRef, require_tau
from .participation import (
    CounterfactualProbeResult,
    GroupParticipationMeasurement,
    ParticipationMeasurement,
    measure_group_participation,
    measure_participation,
)
from .reconstruction import ReconstructionMeasurement


@dataclass(frozen=True)
class FlowSnapshot:
    tau: float
    fingerprint: str
    reality_view: Mapping[str, Any]
    relation_elements: tuple[RelationElementRef, ...]
    possibility_distribution: Mapping[str, float]

    def __post_init__(self):
        object.__setattr__(self, "tau", require_tau("tau", self.tau))
        if not self.fingerprint:
            raise ValueError("fingerprint is required")


@dataclass(frozen=True)
class GroupCounterfactualProbeResult:
    state_hash_before: str
    state_hash_after: str
    group_ablated_distribution: Mapping[str, float]
    generated_possibilities: tuple[str, ...] = ()

    def assert_pure(self):
        if self.state_hash_before != self.state_hash_after:
            raise G32InvariantError("group counterfactual probe changed the real state")


class FrozenFlowPort(Protocol):
    """Read-only contract for connecting an existing G3.1/CARLA harness to the G3.2 sidecar."""

    def snapshot(self) -> FlowSnapshot:
        ...

    def probe_without_relation(self, relation: RelationElementRef) -> CounterfactualProbeResult:
        ...

    def probe_without_relations(
        self,
        relations: Sequence[RelationElementRef],
    ) -> GroupCounterfactualProbeResult:
        ...

    def reconstruction_measurements(self) -> Sequence[ReconstructionMeasurement]:
        ...


@dataclass(frozen=True)
class EpochObservation:
    snapshot: FlowSnapshot
    participation: tuple[ParticipationMeasurement, ...]
    group_participation: tuple[GroupParticipationMeasurement, ...]
    reconstruction: tuple[ReconstructionMeasurement, ...]


def _source_set(rec: ReconstructionMeasurement) -> frozenset[tuple[str, str]]:
    return frozenset(
        (link.source.experience_id, link.source.relation_element_id)
        for link in rec.source_links
    )


def observe_epoch(port: FrozenFlowPort) -> EpochObservation:
    before = port.snapshot()
    participation = []
    for relation in before.relation_elements:
        probe = port.probe_without_relation(relation)
        participation.append(measure_participation(before.tau, relation, probe))
        after_probe = port.snapshot()
        if after_probe.fingerprint != before.fingerprint:
            raise RuntimeError("observer probe changed the frozen flow state")
        if after_probe.tau != before.tau:
            raise RuntimeError("observer probe advanced the reality flow")

    reconstruction = tuple(port.reconstruction_measurements())
    for item in reconstruction:
        if item.observed_at_tau != before.tau:
            raise RuntimeError("reconstruction observation is not aligned with the current epoch")

    relation_by_key = {
        (r.experience_id, r.relation_element_id): r
        for r in before.relation_elements
    }
    unique_groups: dict[frozenset[tuple[str, str]], tuple[RelationElementRef, ...]] = {}
    for rec in reconstruction:
        keys = _source_set(rec)
        if len(keys) <= 1:
            continue
        if any(key not in relation_by_key for key in keys):
            raise RuntimeError("reconstruction references relation outside the current epoch set")
        unique_groups[keys] = tuple(relation_by_key[key] for key in sorted(keys))

    group_participation = []
    for relations in unique_groups.values():
        probe = port.probe_without_relations(relations)
        probe.assert_pure()
        if probe.state_hash_before != before.fingerprint or probe.state_hash_after != before.fingerprint:
            raise RuntimeError("group probe fingerprint does not match the frozen flow")
        group_participation.append(
            measure_group_participation(
                before.tau,
                relations,
                state_hash_before=probe.state_hash_before,
                state_hash_after=probe.state_hash_after,
                full_distribution=before.possibility_distribution,
                group_ablated_distribution=probe.group_ablated_distribution,
                generated_possibilities=probe.generated_possibilities,
            )
        )
        after_probe = port.snapshot()
        if after_probe.fingerprint != before.fingerprint:
            raise RuntimeError("group observer probe changed the frozen flow state")
        if after_probe.tau != before.tau:
            raise RuntimeError("group observer probe advanced the reality flow")

    return EpochObservation(
        snapshot=before,
        participation=tuple(participation),
        group_participation=tuple(group_participation),
        reconstruction=reconstruction,
    )
