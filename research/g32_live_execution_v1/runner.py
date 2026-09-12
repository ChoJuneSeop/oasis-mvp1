from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    CARLAPresentFlowPort,
    ControlledOracleObservationGateway,
    runtime_identity,
    validate_runtime_identity,
)
from research.g32_live_execution_v1.episode import FrontRelationEpisodeManager
from research.g32_live_execution_v1.live_core import LIVE_SENTINEL_UNIT
from research.integration_checkpoint.harness_adapter import (
    CorePortAdapter,
    IntegratedHarness,
)
from research.oasis_core_v12.contracts import ResourcePlan


@dataclass(frozen=True)
class FrozenLiveRuntimeIdentity:
    identity: dict[str, object]


def inert_resource_sentinel() -> ResourcePlan:
    return ResourcePlan(
        0.0,
        0.0,
        0.0,
        LIVE_SENTINEL_UNIT,
        "Compatibility-only sentinel; live resource allocation occurs after current Assessment.",
        (),
    )


class G32LiveSession:
    """Minimal live CARLA host session over the frozen canonical runtime boundary.

    The session validates but never guesses or mutates CARLA runtime settings.
    Scenario spawning and Traffic Manager policy remain separately frozen host concerns.
    """

    def __init__(
        self,
        *,
        client: Any,
        world: Any,
        ego_actor: Any,
        core: Any,
        closure_evaluator: Any,
    ):
        identity = validate_runtime_identity(runtime_identity(world, client))
        self.runtime = FrozenLiveRuntimeIdentity(identity=dict(identity))
        self.client = client
        self.world = world
        self.ego_actor = ego_actor
        self.gateway = ControlledOracleObservationGateway(world, ego_actor)
        self.flow = CARLAPresentFlowPort(world, ego_actor, self.gateway)
        self.harness = IntegratedHarness(CorePortAdapter(core))
        self.core = core
        self.episodes = FrontRelationEpisodeManager(closure_evaluator)

    def current_observation(self) -> PresentObservation:
        return PresentObservation.from_mapping(self.flow.present_observation())

    def decision_if_episode_idle(self):
        if self.episodes.active:
            return None
        execution = self.harness.execute_decision_epoch(
            self.flow,
            resources=inert_resource_sentinel(),
        )
        responsibility = self.core.responsibility_record()
        started = self.episodes.begin(
            execution,
            decision_responsibility=responsibility,
        )
        return {
            "execution": execution,
            "decision_responsibility": responsibility,
            "front_episode_started": started,
        }

    def advance_and_observe(self):
        self.world.tick()
        observation = self.current_observation()
        tau = float(self.flow.current_tau())
        completed = self.episodes.observe_post(
            post_observation=observation,
            post_tau=tau,
        )
        return {
            "tau": tau,
            "observation": observation,
            "completed_episode": completed,
        }
