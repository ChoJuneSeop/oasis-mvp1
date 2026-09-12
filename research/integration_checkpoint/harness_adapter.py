from copy import deepcopy
from dataclasses import dataclass
from typing import Sequence
from research.carla_v22_harness_v11.canonical_harness import CanonicalHarnessV11, CoreEpochView, PresentObservation, Realization
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v12.contracts import ResourcePlan
from .frame import current_frame_from_host

class AdapterError(RuntimeError):
    pass

@dataclass(frozen=True)
class Prepared:
    observation: PresentObservation
    tau: float
    revision: str
    resources: ResourcePlan

class CorePortAdapter:
    def __init__(self, core):
        self.core = core
        self.prepared = None

    def prepare(self, observation, *, tau, revision, resources):
        self.prepared = Prepared(observation, float(tau), revision, deepcopy(resources))

    def _require(self, observation, tau):
        if self.prepared is None:
            raise AdapterError('current host frame was not prepared')
        if self.prepared.observation != observation or self.prepared.tau != float(tau):
            raise AdapterError('prepared host frame does not match current decision frame')
        return self.prepared

    def open_epoch(self, observation: PresentObservation, tau: float) -> CoreEpochView:
        p = self._require(observation, tau)
        frame = current_frame_from_host(observation, tau=p.tau, revision=p.revision)
        view = self.core.open_current_epoch(frame)
        self.core.bind_current_resources(p.resources)
        return view

    def ablate_relation(self, observation: PresentObservation, relation: RelationElementRef, tau: float):
        self._require(observation, tau)
        return self.core.ablate_relation(observation, relation)

    def ablate_relation_group(self, observation: PresentObservation, relations: Sequence[RelationElementRef], tau: float):
        self._require(observation, tau)
        return self.core.ablate_relation_group(observation, relations)

    def realize(self, observation: PresentObservation, tau: float) -> Realization:
        self._require(observation, tau)
        return self.core.realize(observation)

class IntegratedHarness(CanonicalHarnessV11):
    def __init__(self, adapter: CorePortAdapter):
        super().__init__(adapter)
        self.adapter = adapter

    def execute_decision_epoch(self, flow, *, resources: ResourcePlan):
        tau = float(flow.current_tau())
        observation = PresentObservation.from_mapping(flow.present_observation())
        revision = flow.flow_fingerprint()
        self.adapter.prepare(observation, tau=tau, revision=revision, resources=resources)
        if float(flow.current_tau()) != tau or flow.flow_fingerprint() != revision:
            raise AdapterError('host frame changed during preparation')
        execution = super().execute_decision_epoch(flow)
        if execution.before_fingerprint != revision:
            raise AdapterError('canonical decision used a different host revision')
        return execution
