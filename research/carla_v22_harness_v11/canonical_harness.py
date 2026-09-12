from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder
from research.g3_2_sidecar.reconstruction import ReconstructionMeasurement


PROTOCOL_NAME = "OASIS-CARLA Paper Validation Protocol v2.2"
HARNESS_NAME = "OASIS-CARLA Paper Validation Harness v1.1"
FIXED_DELTA_SECONDS = 0.05

APPROVED_OBSERVATION_FIELDS = (
    "epoch",
    "ego_speed_mps",
    "front_present",
    "front_gap_m",
    "front_closing_mps",
    "front_kind",
    "local_heading_error_deg",
    "local_density",
)


class HarnessInvariantError(RuntimeError):
    pass


@dataclass(frozen=True)
class PresentObservation:
    epoch: int
    ego_speed_mps: float
    front_present: bool
    front_gap_m: float
    front_closing_mps: float
    front_kind: str
    local_heading_error_deg: float
    local_density: int

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "PresentObservation":
        if tuple(data.keys()) != APPROVED_OBSERVATION_FIELDS:
            raise HarnessInvariantError(f"observation schema mismatch: {tuple(data.keys())}")
        return cls(**data)


@dataclass(frozen=True)
class VehicleActuation:
    throttle: float
    brake: float
    steer: float

    def __post_init__(self) -> None:
        for name, value in (("throttle", self.throttle), ("brake", self.brake), ("steer", self.steer)):
            if not isinstance(value, (int, float)):
                raise HarnessInvariantError(f"{name} must be numeric")
        if not 0.0 <= float(self.throttle) <= 1.0:
            raise HarnessInvariantError("throttle must be in [0,1]")
        if not 0.0 <= float(self.brake) <= 1.0:
            raise HarnessInvariantError("brake must be in [0,1]")
        if not -1.0 <= float(self.steer) <= 1.0:
            raise HarnessInvariantError("steer must be in [-1,1]")


@dataclass(frozen=True)
class CoreEpochView:
    relation_elements: tuple[RelationElementRef, ...]
    possibility_distribution: Mapping[str, float]
    role_trace_by_relation: Mapping[tuple[str, str], tuple[str, ...]] = field(default_factory=dict)
    generated_by_relation: Mapping[tuple[str, str], tuple[str, ...]] = field(default_factory=dict)
    reconstructions: tuple[ReconstructionMeasurement, ...] = ()


@dataclass(frozen=True)
class Realization:
    selected_possibility_id: str
    actuation: VehicleActuation


class PresentFlowPort(Protocol):
    """Host-side CARLA adapter. The Core never receives this object."""

    def current_tau(self) -> float: ...
    def present_observation(self) -> Mapping[str, Any]: ...
    def current_reality(self) -> Mapping[str, Any]: ...
    def flow_fingerprint(self) -> str: ...
    def apply_single_actuation(self, actuation: VehicleActuation) -> str:
        """Apply exactly one real VehicleControl-equivalent actuation and return a realization ref."""
        ...


class CanonicalCorePort(Protocol):
    """OASIS Core boundary under Protocol v2.2.

    Current flow time `tau` is passed explicitly. It must never be reconstructed from
    epoch number or simulator delta. No CARLA world, map, raw actor, seed, trigger,
    future trajectory or scenario label is passed through this interface.
    """

    def open_epoch(self, observation: PresentObservation, tau: float) -> CoreEpochView: ...

    def ablate_relation(
        self,
        observation: PresentObservation,
        relation: RelationElementRef,
        tau: float,
    ) -> Mapping[str, float]: ...

    def ablate_relation_group(
        self,
        observation: PresentObservation,
        relations: Sequence[RelationElementRef],
        tau: float,
    ) -> Mapping[str, float]: ...

    def realize(self, observation: PresentObservation, tau: float) -> Realization: ...


@dataclass(frozen=True)
class DecisionExecution:
    tau: float
    observation: PresentObservation
    recorder: G32EpochRecorder
    realization: Realization
    realization_ref: str
    before_fingerprint: str
    after_realization_fingerprint: str


class CanonicalHarnessV11:
    """Canonical Protocol-v2.2 harness.

    Decision-time counterfactual probes are read-only. The host port is authoritative
    for the continuous real flow and receives exactly one real actuation per epoch.
    """

    def __init__(self, core: CanonicalCorePort):
        self.core = core

    @staticmethod
    def _relation_key(relation: RelationElementRef) -> tuple[str, str]:
        return (relation.experience_id, relation.relation_element_id)

    def execute_decision_epoch(self, flow: PresentFlowPort) -> DecisionExecution:
        tau = float(flow.current_tau())
        observation = PresentObservation.from_mapping(flow.present_observation())
        current_reality = dict(flow.current_reality())
        before = flow.flow_fingerprint()

        view = self.core.open_epoch(observation, tau)
        recorder = G32EpochRecorder(
            tau=tau,
            flow_fingerprint=before,
            current_reality=current_reality,
            relation_elements=tuple(view.relation_elements),
            possibility_distribution=view.possibility_distribution,
        )

        for relation in view.relation_elements:
            ablated = self.core.ablate_relation(observation, relation, tau)
            after_probe = flow.flow_fingerprint()
            key = self._relation_key(relation)
            recorder.record_relation_probe(
                relation,
                before_fingerprint=before,
                after_fingerprint=after_probe,
                relation_ablated_distribution=ablated,
                role_trace=view.role_trace_by_relation.get(key, ()),
                generated_possibilities=view.generated_by_relation.get(key, ()),
            )

        for reconstruction in view.reconstructions:
            if float(reconstruction.observed_at_tau) != tau:
                raise HarnessInvariantError(
                    "reconstruction observed_at_tau must equal current host flow tau"
                )
            sources = tuple(link.source for link in reconstruction.source_links)
            if len(sources) > 1:
                group_ablated = self.core.ablate_relation_group(observation, sources, tau)
                after_group_probe = flow.flow_fingerprint()
                generated = tuple(
                    p
                    for relation in sources
                    for p in view.generated_by_relation.get(self._relation_key(relation), ())
                )
                recorder.record_group_probe(
                    sources,
                    before_fingerprint=before,
                    after_fingerprint=after_group_probe,
                    group_ablated_distribution=group_ablated,
                    generated_possibilities=generated,
                )
            recorder.record_reconstruction(reconstruction)

        if flow.flow_fingerprint() != before:
            raise HarnessInvariantError("decision-time probing mutated or advanced real flow")
        if float(flow.current_tau()) != tau:
            raise HarnessInvariantError("decision-time probing advanced or rewound real-flow tau")

        realization = self.core.realize(observation, tau)
        if realization.selected_possibility_id not in recorder.possibility_distribution:
            raise HarnessInvariantError("selected possibility was absent from current distribution")

        realization_ref = flow.apply_single_actuation(realization.actuation)
        if not realization_ref:
            raise HarnessInvariantError("real actuation did not return a realization reference")

        after_realization = flow.flow_fingerprint()
        return DecisionExecution(
            tau=tau,
            observation=observation,
            recorder=recorder,
            realization=realization,
            realization_ref=realization_ref,
            before_fingerprint=before,
            after_realization_fingerprint=after_realization,
        )
