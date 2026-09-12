from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from math import atan2, degrees, sqrt
from typing import Any, Iterable, Mapping, Optional

from research.carla_v22_harness_v11.canonical_harness import VehicleActuation


class CARLARuntimeInvariantError(RuntimeError):
    pass


def _speed(vector: Any) -> float:
    return sqrt(float(vector.x) ** 2 + float(vector.y) ** 2 + float(vector.z) ** 2)


def _yaw_error_deg(ego_yaw: float, reference_yaw: float) -> float:
    delta = float(ego_yaw) - float(reference_yaw)
    while delta > 180.0:
        delta -= 360.0
    while delta < -180.0:
        delta += 360.0
    return delta


def _forward(yaw_deg: float) -> tuple[float, float]:
    from math import cos, radians, sin
    angle = radians(float(yaw_deg))
    return cos(angle), sin(angle)


def _kind(type_id: str) -> str:
    text = str(type_id)
    if text.startswith("vehicle."):
        return "vehicle"
    if text.startswith("walker."):
        return "pedestrian"
    return "other"


@dataclass(frozen=True)
class GatewayObservation:
    epoch: int
    ego_speed_mps: float
    front_present: bool
    front_gap_m: float
    front_closing_mps: float
    front_kind: str
    local_heading_error_deg: float
    local_density: int

    def as_mapping(self) -> dict[str, object]:
        return {
            "epoch": self.epoch,
            "ego_speed_mps": self.ego_speed_mps,
            "front_present": self.front_present,
            "front_gap_m": self.front_gap_m,
            "front_closing_mps": self.front_closing_mps,
            "front_kind": self.front_kind,
            "local_heading_error_deg": self.local_heading_error_deg,
            "local_density": self.local_density,
        }


class ControlledOracleObservationGateway:
    """Present-state-only Observation Gateway for Protocol v2.2.

    World/map/raw actor identity may be used only inside this gateway. The output is
    exactly the approved present observation schema; raw actor id, coordinates, map
    topology, seed, trigger, future state and trajectory are never emitted.

    Front relation selection uses same current road/lane and positive longitudinal
    projection, choosing the nearest present actor. It does not use a learned/fixed
    distance threshold to define semantic relevance.
    """

    def __init__(self, world: Any, ego_actor: Any):
        self.world = world
        self.ego_actor = ego_actor

    def _actors(self) -> Iterable[Any]:
        return self.world.get_actors()

    def observe(self) -> GatewayObservation:
        snapshot = self.world.get_snapshot()
        world_map = self.world.get_map()
        ego_transform = self.ego_actor.get_transform()
        ego_location = ego_transform.location
        ego_velocity = self.ego_actor.get_velocity()
        ego_waypoint = world_map.get_waypoint(ego_location)
        if ego_waypoint is None:
            raise CARLARuntimeInvariantError("ego has no current map waypoint")

        fx, fy = _forward(ego_transform.rotation.yaw)
        front_actor: Optional[Any] = None
        front_distance: Optional[float] = None
        local_density = 0

        for actor in self._actors():
            if getattr(actor, "id", None) == getattr(self.ego_actor, "id", None):
                continue
            type_id = str(getattr(actor, "type_id", ""))
            if not (type_id.startswith("vehicle.") or type_id.startswith("walker.")):
                continue
            location = actor.get_location()
            waypoint = world_map.get_waypoint(location)
            if waypoint is None:
                continue
            if getattr(waypoint, "road_id", None) == getattr(ego_waypoint, "road_id", None):
                local_density += 1
            if (
                getattr(waypoint, "road_id", None) != getattr(ego_waypoint, "road_id", None)
                or getattr(waypoint, "lane_id", None) != getattr(ego_waypoint, "lane_id", None)
            ):
                continue
            dx = float(location.x) - float(ego_location.x)
            dy = float(location.y) - float(ego_location.y)
            longitudinal = dx * fx + dy * fy
            if longitudinal <= 0.0:
                continue
            distance = sqrt(dx * dx + dy * dy + (float(location.z) - float(ego_location.z)) ** 2)
            if front_distance is None or distance < front_distance:
                front_distance = distance
                front_actor = actor

        front_present = front_actor is not None
        if front_actor is None:
            front_gap = 0.0
            closing = 0.0
            front_kind = "none"
        else:
            front_gap = float(front_distance)
            front_velocity = front_actor.get_velocity()
            ego_forward_speed = float(ego_velocity.x) * fx + float(ego_velocity.y) * fy
            front_forward_speed = float(front_velocity.x) * fx + float(front_velocity.y) * fy
            closing = ego_forward_speed - front_forward_speed
            front_kind = _kind(getattr(front_actor, "type_id", ""))

        lane_yaw = float(ego_waypoint.transform.rotation.yaw)
        return GatewayObservation(
            epoch=int(snapshot.frame),
            ego_speed_mps=_speed(ego_velocity),
            front_present=front_present,
            front_gap_m=front_gap,
            front_closing_mps=closing,
            front_kind=front_kind,
            local_heading_error_deg=_yaw_error_deg(ego_transform.rotation.yaw, lane_yaw),
            local_density=int(local_density),
        )


class CARLAPresentFlowPort:
    """Environment Actuator + current-flow host boundary.

    Exactly one real actuation may be applied per CARLA frame through this object.
    Counterfactual Core probes receive no reference to this port.
    """

    def __init__(self, world: Any, ego_actor: Any, gateway: ControlledOracleObservationGateway):
        self.world = world
        self.ego_actor = ego_actor
        self.gateway = gateway
        self._last_applied_frame: Optional[int] = None
        self._cached_observation: Optional[GatewayObservation] = None
        self._cached_frame: Optional[int] = None

    def _snapshot(self):
        return self.world.get_snapshot()

    def current_tau(self) -> float:
        return float(self._snapshot().timestamp.elapsed_seconds)

    def _observation(self) -> GatewayObservation:
        frame = int(self._snapshot().frame)
        if self._cached_observation is None or self._cached_frame != frame:
            self._cached_observation = self.gateway.observe()
            self._cached_frame = frame
        return self._cached_observation

    def present_observation(self) -> Mapping[str, object]:
        return self._observation().as_mapping()

    def current_reality(self) -> Mapping[str, object]:
        obs = self._observation()
        front_state = "absent"
        if obs.front_present:
            if obs.front_closing_mps > 0.0:
                front_state = "closing"
            elif obs.front_closing_mps < 0.0:
                front_state = "opening"
            else:
                front_state = "no-relative-motion"
        heading_state = "aligned"
        if obs.local_heading_error_deg > 0.0:
            heading_state = "positive-offset"
        elif obs.local_heading_error_deg < 0.0:
            heading_state = "negative-offset"
        return {
            "front_relation_state": front_state,
            "front_kind": obs.front_kind,
            "lane_heading_state": heading_state,
            "local_participation_count": obs.local_density,
        }

    def flow_fingerprint(self) -> str:
        snapshot = self._snapshot()
        obs = self._observation()
        payload = (
            int(snapshot.frame),
            float(snapshot.timestamp.elapsed_seconds),
            tuple(obs.as_mapping().items()),
        )
        return sha256(repr(payload).encode("utf-8")).hexdigest()

    def apply_single_actuation(self, actuation: VehicleActuation) -> str:
        frame = int(self._snapshot().frame)
        if self._last_applied_frame == frame:
            raise CARLARuntimeInvariantError("more than one real actuation attempted in one CARLA frame")
        try:
            import carla  # type: ignore
        except Exception as exc:
            raise CARLARuntimeInvariantError("CARLA Python API is unavailable") from exc
        control = carla.VehicleControl(
            throttle=float(actuation.throttle),
            brake=float(actuation.brake),
            steer=float(actuation.steer),
        )
        self.ego_actor.apply_control(control)
        self._last_applied_frame = frame
        return f"carla-frame:{frame}:single-actuation"


def runtime_identity(world: Any) -> dict[str, object]:
    """Capture environment identity before experiment; does not infer or invent version."""
    settings = world.get_settings()
    world_map = world.get_map()
    try:
        import carla  # type: ignore
        client_version = getattr(carla, "__version__", None)
    except Exception:
        client_version = None
    return {
        "carla_python_version": client_version,
        "map_name": str(getattr(world_map, "name", "")),
        "synchronous_mode": bool(getattr(settings, "synchronous_mode", False)),
        "fixed_delta_seconds": getattr(settings, "fixed_delta_seconds", None),
    }
