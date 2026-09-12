from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from .common import RelationElementRef, require_tau
from .participation import CounterfactualProbeResult, ParticipationMeasurement, measure_participation
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


class FrozenFlowPort(Protocol):
    """Read-only contract for connecting an existing G3.1/CARLA harness to the G3.2 sidecar."""

    def snapshot(self) -> FlowSnapshot:
        ...

    def probe_without_relation(self, relation: RelationElementRef) -> CounterfactualProbeResult:
        ...

    def reconstruction_measurements(self) -> Sequence[ReconstructionMeasurement]:
        ...


@dataclass(frozen=True)
class EpochObservation:
    snapshot: FlowSnapshot
    participation: tuple[ParticipationMeasurement, ...]
    reconstruction: tuple[ReconstructionMeasurement, ...]


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

    return EpochObservation(
        snapshot=before,
        participation=tuple(participation),
        reconstruction=reconstruction,
    )
