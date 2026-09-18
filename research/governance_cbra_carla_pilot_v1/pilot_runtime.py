from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict
from pathlib import Path
import random
from typing import Any, Iterable

from research.carla_v22_harness_v11.canonical_harness import (
    CanonicalHarnessV11,
    CoreEpochView,
    PresentObservation,
)
from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    CARLAPresentFlowPort,
    ControlledOracleObservationGateway,
    runtime_identity,
    validate_runtime_identity,
)
from research.governance_cbra_v1.models import (
    DecisionProvenanceSnapshot,
    ParticipationProvenance,
    ResponsibilityProvenance,
)
from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ExperienceReengagement,
    JudgmentRevalidation,
    ResponsibilityJudgment,
    RevalidationState,
)
from research.governance_harness_v01.harness_v04 import (
    AtomicFlowSnapshot,
    CompletedExperience,
    CurrentFlowGapRule,
    GovernanceFeedbackV04,
    GovernanceHarnessV04,
    HistoryAccessPort,
    ParticipatingExperienceView,
)
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError


EXPECTED_CARLA_VERSION = "0.9.16"
EXPECTED_MAP = "Town10HD_Opt"
FIXED_DELTA_SECONDS = 0.05


class ScenarioAdmissionError(RuntimeError):
    """Pre-execution CARLA scene failed the frozen Run4 admission contract."""


def scope_signature(observation: PresentObservation) -> tuple[bool, str, int]:
    return (
        bool(observation.front_present),
        str(observation.front_kind),
        int(observation.local_density),
    )


class PilotHistoryAccessPort(HistoryAccessPort):
    """Governance archive that materializes real closed CARLA relation records.

    GovernanceHarnessV04 intentionally stores a minimal CompletedExperience payload.
    The Pilot enriches that payload only with relation records extracted from the
    authoritative closed HistoryEntry via the frozen domain admission bridge. This
    preserves real later re-participation without giving the Core archive ownership.
    """

    def __init__(self, experiences: Iterable[CompletedExperience] = ()):
        super().__init__(experiences)
        self._admission = build_domain_bundle().history_admission
        self._cbra_scope: dict[str, tuple[bool, str, int]] = {}
        self._cbra_feedback_ids: set[str] = set()

    def atomic_commit(self, history, completed, feedback, sidecar, prepared_sidecar):
        records = self._admission.admit(history)
        enriched = CompletedExperience(
            experience_id=completed.experience_id,
            relation_id=completed.relation_id,
            provenance_ref=completed.provenance_ref,
            completed_tau=completed.completed_tau,
            content={
                "history_entry_id": history.entry_id,
                "selected": history.selected_possibility_id,
                "relation_records": records,
            },
            byte_size=len(repr((history, records)).encode("utf-8")),
        )
        return super().atomic_commit(
            history, enriched, feedback, sidecar, prepared_sidecar
        )

    def publish_cbra_feedback(
        self,
        feedback: GovernanceFeedbackV04,
        *,
        original_scope_signature: tuple[bool, str, int],
    ) -> None:
        if feedback.prior_entry_id in self._cbra_feedback_ids:
            raise CoreV11InvariantError("duplicate CBRA feedback publication")
        self._feedback.append(deepcopy(feedback))
        self._cbra_feedback_ids.add(feedback.prior_entry_id)
        self._cbra_scope[feedback.prior_entry_id] = tuple(original_scope_signature)

    def is_cbra_feedback(self, feedback_id: str) -> bool:
        return feedback_id in self._cbra_feedback_ids

    def cbra_scope(self, feedback_id: str):
        return self._cbra_scope.get(feedback_id)


class PilotParticipation:
    """Current-context participation with optional provenance-bound CBRA feedback.

    No failure-class/scenario label is accepted by this operator. Base participation
    is derived only from the approved present observation: a prior experience may
    participate when a front relation is present and is not currently opening away.
    CBRA may reverse the prior judgment only for the same relation scope.
    """

    def __init__(self, history_port: PilotHistoryAccessPort):
        self.history_port = history_port

    def assess(self, evidence, _gap, candidates, feedback):
        current = evidence.samples[-1].observation
        current_scope = scope_signature(current)
        latest_cbra = [
            item
            for item in feedback
            if self.history_port.is_cbra_feedback(item.prior_entry_id)
            and self.history_port.cbra_scope(item.prior_entry_id) == current_scope
        ]
        state_by_experience: dict[str, RevalidationState] = {}
        for item in latest_cbra:
            for experience_id, state in item.experience_states:
                state_by_experience[experience_id] = state

        result = []
        for item in candidates:
            participate = bool(
                current.front_present and float(current.front_closing_mps) >= 0.0
            )
            state = state_by_experience.get(item.experience_id)
            if state is RevalidationState.REVISED:
                participate = not participate
            rationale = (
                "current front relation is present and non-opening"
                if participate
                else "current relation does not support participation"
            )
            if state is RevalidationState.REVISED:
                rationale += "; same-scope CBRA provenance revised the prior judgment"
            result.append(
                ExperienceReengagement(
                    item.experience_id,
                    participate,
                    rationale,
                    evidence_refs=(f"current-epoch:{current.epoch}",),
                    provenance_ref=item.provenance_ref,
                )
            )
        return tuple(result)


class PilotResponsibility:
    """Dynamic U/I/V/T responsibility over the actual current candidate set."""

    def __init__(self, history_port: PilotHistoryAccessPort):
        self.history_port = history_port

    def _cbra_responsibility_revised(self, context) -> bool:
        current = context.flow.samples[-1].observation
        sig = scope_signature(current)
        for item in reversed(context.feedback):
            if (
                self.history_port.is_cbra_feedback(item.prior_entry_id)
                and self.history_port.cbra_scope(item.prior_entry_id) == sig
                and item.responsibility_state is RevalidationState.REVISED
            ):
                return True
        return False

    def assess(self, context):
        ids = tuple(context.candidate_ids)
        if not ids:
            raise CoreV11InvariantError("responsibility requires current candidates")
        current = context.flow.samples[-1].observation

        if current.front_present and "yield-space" in ids:
            selected = "yield-space"
        elif "continue-flow" in ids:
            selected = "continue-flow"
        else:
            selected = ids[0]

        if self._cbra_responsibility_revised(context) and len(ids) > 1:
            selected = next(item for item in ids if item != selected)

        nonselected = tuple(item for item in ids if item != selected)
        axes = DynamicResponsibilityAxes(
            uncertainty=(f"front-present:{bool(current.front_present)}",),
            impact=(f"front-kind:{current.front_kind}",),
            vulnerability=(f"local-density:{int(current.local_density)}",),
            temporality=(f"epoch:{int(current.epoch)}",),
        )
        return ResponsibilityJudgment(
            candidate_ids=ids,
            selected_candidate_id=selected,
            nonselected_candidate_ids=nonselected,
            axes=axes,
            selected_obligations=("selected-current-evidence-bound",),
            nonselected_obligations=(
                ("nonselected-rationale-preserved",) if nonselected else ()
            ),
            rationale="dynamic current U/I/V/T responsibility binding",
        )


class PilotClosureRevalidation:
    """Immediate post-Closure governance revalidation.

    This is distinct from CBRA. It records that the just-closed provenance chain is
    internally bound; later contradictory/supporting evidence remains CBRA's job.
    """

    def revalidate(self, _context, audit, _decision, _outcome):
        return JudgmentRevalidation(
            RevalidationState.CONFIRMED,
            tuple(
                (item.experience_id, RevalidationState.CONFIRMED)
                for item in audit
            ),
            RevalidationState.CONFIRMED,
            RevalidationState.CONFIRMED,
            rationale="authoritative Closure completed; later evidence remains open",
        )


def build_governance_harness():
    bundle = build_domain_bundle()
    port = PilotHistoryAccessPort()
    harness = GovernanceHarnessV04(
        core=bundle.core,
        history_port=port,
        gap_rule=CurrentFlowGapRule(speed_drop_threshold=0.5),
        reengagement_operator=PilotParticipation(port),
        responsibility_operator=PilotResponsibility(port),
        revalidation_operator=PilotClosureRevalidation(),
    )
    if harness.admission.state.value != "ADMITTED":
        raise CoreV11InvariantError(
            f"Governance Core admission blocked: {harness.admission.reasons}"
        )
    return harness, port


class BaselineCoreBoundary:
    """Explicit General Harness comparator: canonical harness + relation memory.

    It has no Governance gap gate, NO provenance, U/I/V/T governance feedback, or
    CBRA. It may receive already-completed relation records when the relation id
    matches, which makes it a concrete comparator rather than a no-memory strawman.
    """

    def __init__(self, core, view: ParticipatingExperienceView):
        self.core = core
        self.view = view

    def open_epoch(self, observation, tau):
        return self.core.open_epoch(observation, tau, self.view)

    def ablate_relation(self, observation, relation, tau):
        return self.core.ablate_relation(observation, relation, tau)

    def ablate_relation_group(self, observation, relations, tau):
        return self.core.ablate_relation_group(observation, relations, tau)

    def realize(self, observation, tau):
        return self.core.realize(observation, tau)


class PilotCARLAHost:
    """Atomic Governance host boundary over the frozen CARLA gateway."""

    def __init__(self, world: Any, ego_actor: Any, relation_id: str):
        self.world = world
        self.ego_actor = ego_actor
        self.gateway = ControlledOracleObservationGateway(world, ego_actor)
        self.flow = CARLAPresentFlowPort(world, ego_actor, self.gateway)
        self.relation_id = relation_id
        self.version = int(world.get_snapshot().frame) * 10
        self.last_realization_ref: str | None = None

    def set_relation_id(self, relation_id: str) -> None:
        if not relation_id:
            raise ValueError("relation_id is required")
        self.relation_id = relation_id

    def mark_host_mutation(self) -> None:
        self.version += 1

    def tick(self) -> int:
        returned = int(self.world.tick())
        self.version += 1
        return returned

    def atomic_current_snapshot(self) -> AtomicFlowSnapshot:
        obs = PresentObservation.from_mapping(self.flow.present_observation())
        return AtomicFlowSnapshot(
            tau=float(self.flow.current_tau()),
            observation=obs,
            current_reality={
                "front_state": (
                    "absent"
                    if not obs.front_present
                    else (
                        "closing"
                        if obs.front_closing_mps > 0.0
                        else (
                            "opening"
                            if obs.front_closing_mps < 0.0
                            else "no-relative-motion"
                        )
                    )
                ),
                "front_kind": obs.front_kind,
                "lane_heading_state": (
                    "aligned"
                    if obs.local_heading_error_deg == 0.0
                    else (
                        "positive-offset"
                        if obs.local_heading_error_deg > 0.0
                        else "negative-offset"
                    )
                ),
                "local_participation_count": obs.local_density,
            },
            version=int(self.version),
            fingerprint=self.flow.flow_fingerprint(),
            relation_id=self.relation_id,
            realization_ref=self.last_realization_ref,
        )

    def current_flow_version(self) -> int:
        return int(self.version)

    def current_tau(self) -> float:
        return float(self.flow.current_tau())

    def present_observation(self):
        return self.flow.present_observation()

    def current_reality(self):
        return self.flow.current_reality()

    def flow_fingerprint(self) -> str:
        return self.flow.flow_fingerprint()

    def apply_single_actuation(self, actuation) -> str:
        ref = self.flow.apply_single_actuation(actuation)
        self.last_realization_ref = str(ref)
        self.version += 1
        return str(ref)


class PilotScene:
    """One-ego/one-counterpart deterministic scene without world reload."""

    def __init__(self, client: Any, *, seed: int):
        self.client = client
        self.world = client.get_world()

        # Configure the frozen CARLA execution mode before validating it.
        # This is pre-experimental host setup: no decision, actuation, Closure,
        # evaluator result, or Pilot evidence exists yet.
        client_version = str(client.get_client_version())
        server_version = str(client.get_server_version())
        if client_version != EXPECTED_CARLA_VERSION or server_version != EXPECTED_CARLA_VERSION:
            raise CoreV11InvariantError(
                f"CARLA version must be {EXPECTED_CARLA_VERSION}, "
                f"got client={client_version!r}, server={server_version!r}"
            )
        if client_version != server_version:
            raise CoreV11InvariantError("CARLA client/server versions differ")

        current_map = str(self.world.get_map().name).rsplit("/", 1)[-1]
        if current_map != EXPECTED_MAP:
            raise CoreV11InvariantError(
                f"Pilot will not reload the CARLA world: expected {EXPECTED_MAP}, got {current_map}"
            )

        settings = self.world.get_settings()
        settings.synchronous_mode = True
        settings.fixed_delta_seconds = FIXED_DELTA_SECONDS
        settings.no_rendering_mode = True
        self.world.apply_settings(settings)

        identity = validate_runtime_identity(runtime_identity(self.world, client))
        if identity.get("synchronous_mode") is not True:
            raise CoreV11InvariantError("Pilot failed to establish synchronous_mode=True")
        if float(identity.get("fixed_delta_seconds")) != FIXED_DELTA_SECONDS:
            raise CoreV11InvariantError("Pilot failed to establish fixed_delta_seconds=0.05")
        if identity.get("no_rendering_mode") is not True:
            raise CoreV11InvariantError(
                "Pilot requires no_rendering_mode=True before unit execution"
            )

        try:
            import carla  # type: ignore
            self.world.set_weather(carla.WeatherParameters.ClearNoon)
        except Exception:
            pass

        self.seed = int(seed)
        self.ego = None
        self.counterpart = None
        self.base_transform = None
        self.host: PilotCARLAHost | None = None
        self._spawn_ego()

    def _four_wheel_vehicle_ids(self):
        ids = []
        for bp in self.world.get_blueprint_library().filter("vehicle.*"):
            try:
                wheels = int(bp.get_attribute("number_of_wheels"))
            except Exception:
                wheels = 4
            if wheels == 4:
                ids.append(bp.id)
        if not ids:
            raise CoreV11InvariantError("no four-wheel CARLA vehicle blueprints")
        return tuple(sorted(ids))

    def _spawn_ego(self):
        points = list(self.world.get_map().get_spawn_points())
        if not points:
            raise ScenarioAdmissionError("CARLA map has no spawn points")
        rng = random.Random(self.seed)
        order = list(range(len(points)))
        rng.shuffle(order)

        # Run3 freezes a deterministic clean-lane admission rule. We may examine
        # candidates only before any Pilot decision epoch exists. A candidate is
        # admissible only when it has forward relation space and the approved
        # gateway reports no pre-existing front relation. This prevents unrelated
        # ambient actors from making front-participant Closure impossible later.
        viable = []
        world_map = self.world.get_map()
        for index in order:
            wp = world_map.get_waypoint(points[index].location)
            if wp is not None and list(wp.next(18.0)):
                viable.append(index)
        if not viable:
            raise ScenarioAdmissionError(
                "no forward-capable ego spawn exists for the frozen Pilot scene"
            )

        ids = self._four_wheel_vehicle_ids()
        preferred = (
            "vehicle.tesla.model3"
            if "vehicle.tesla.model3" in ids
            else ids[0]
        )
        bp = self.world.get_blueprint_library().find(preferred)
        try:
            if bp.has_attribute("role_name"):
                bp.set_attribute("role_name", "governance-pilot-ego")
        except Exception:
            pass

        rejected = []
        for index in viable:
            actor = self.world.try_spawn_actor(bp, points[index])
            if actor is None:
                rejected.append({"spawn_index": int(index), "reason": "spawn-failed"})
                continue
            try:
                self.world.tick()
                gateway = ControlledOracleObservationGateway(self.world, actor)
                observation = PresentObservation.from_mapping(
                    gateway.observe().as_mapping()
                )
                if observation.front_present:
                    rejected.append(
                        {
                            "spawn_index": int(index),
                            "reason": "pre-existing-front-relation",
                            "front_kind": observation.front_kind,
                            "local_density": observation.local_density,
                        }
                    )
                    actor.destroy()
                    self.world.tick()
                    continue

                self.ego = actor
                self.base_transform = points[index]
                self.admitted_spawn_index = int(index)
                self.admission_rejected_candidates = tuple(rejected)
                self.host = PilotCARLAHost(
                    self.world, self.ego, relation_id="UNBOUND"
                )
                return
            except Exception:
                if self.ego is None:
                    try:
                        actor.destroy()
                    except Exception:
                        pass
                raise

        raise ScenarioAdmissionError(
            "no deterministic clean-lane ego spawn satisfied Run3 admission"
        )

    def _counterpart_blueprint(self, kind: str):
        library = self.world.get_blueprint_library()
        if kind == "vehicle":
            ids = self._four_wheel_vehicle_ids()
            preferred = (
                "vehicle.lincoln.mkz_2020"
                if "vehicle.lincoln.mkz_2020" in ids
                else ids[-1]
            )
            bp = library.find(preferred)
        elif kind == "pedestrian":
            walkers = sorted(bp.id for bp in library.filter("walker.pedestrian.*"))
            if not walkers:
                raise CoreV11InvariantError("no pedestrian blueprint for changed scope")
            bp = library.find(walkers[0])
        else:
            raise ValueError(f"unsupported counterpart kind: {kind}")
        try:
            if bp.has_attribute("role_name"):
                bp.set_attribute("role_name", f"governance-pilot-{kind}")
        except Exception:
            pass
        return bp

    def remove_counterpart(self):
        if self.counterpart is not None:
            try:
                self.counterpart.destroy()
            finally:
                self.counterpart = None
                self.host.mark_host_mutation()

    def reset_ego(self):
        import carla  # type: ignore

        self.ego.set_transform(self.base_transform)
        self.ego.set_target_velocity(carla.Vector3D(0.0, 0.0, 0.0))
        self.ego.set_target_angular_velocity(carla.Vector3D(0.0, 0.0, 0.0))
        try:
            self.ego.apply_control(carla.VehicleControl(throttle=0.0, brake=1.0))
        except Exception:
            pass
        self.host.last_realization_ref = None
        self.host.mark_host_mutation()
        self.host.tick()

    def spawn_counterpart(self, kind: str = "vehicle"):
        """Spawn only a counterpart that the approved Gateway actually recognizes.

        Run4 keeps the frozen candidate distances unchanged. Physical actor spawn is
        not sufficient: after each successful spawn, the authoritative present-state
        Gateway must report front_present=True and the expected front_kind. A failed
        candidate is destroyed before the next already-frozen distance is tried.
        No failure label, evaluator result, or post-outcome evidence is consulted.
        """
        self.remove_counterpart()
        world_map = self.world.get_map()
        wp = world_map.get_waypoint(self.ego.get_location())
        if wp is None:
            raise CoreV11InvariantError("ego has no waypoint for Pilot counterpart")
        bp = self._counterpart_blueprint(kind)
        distances = (18.0, 22.0, 26.0, 30.0, 34.0)
        rejected: list[dict[str, object]] = []
        for distance in distances:
            nxt = list(wp.next(distance))
            if not nxt:
                rejected.append(
                    {"distance_m": float(distance), "reason": "no-forward-waypoint"}
                )
                continue
            transform = nxt[0].transform
            transform.location.z += 0.35 if kind == "vehicle" else 0.8
            actor = self.world.try_spawn_actor(bp, transform)
            if actor is None:
                rejected.append(
                    {"distance_m": float(distance), "reason": "physical-spawn-failed"}
                )
                continue

            self.counterpart = actor
            self.host.mark_host_mutation()
            self.host.tick()
            observed = PresentObservation.from_mapping(
                self.host.present_observation()
            )
            if observed.front_present and observed.front_kind == kind:
                self.last_counterpart_admission = {
                    "kind": kind,
                    "distance_m": float(distance),
                    "front_present": True,
                    "front_kind": observed.front_kind,
                    "front_gap_m": float(observed.front_gap_m),
                    "rejected_candidates": tuple(rejected),
                }
                return actor

            rejected.append(
                {
                    "distance_m": float(distance),
                    "reason": "gateway-front-relation-not-approved",
                    "observed_front_present": bool(observed.front_present),
                    "observed_front_kind": observed.front_kind,
                    "observed_front_gap_m": float(observed.front_gap_m),
                }
            )
            try:
                actor.destroy()
            finally:
                self.counterpart = None
                self.host.mark_host_mutation()
                self.host.tick()

        self.last_counterpart_admission = {
            "kind": kind,
            "distance_m": None,
            "front_present": False,
            "front_kind": "none",
            "rejected_candidates": tuple(rejected),
        }
        raise ScenarioAdmissionError(
            f"{kind} counterpart did not form an approved front relation "
            "at any frozen candidate distance"
        )

    def admit_relation_cycle(self, kind: str) -> dict[str, object]:
        """Rehearse relation presence and Closure before any experimental decision.

        This admission cycle is diagnostic only. It creates no HistoryEntry, no
        Completed Experience, no CBRA checkpoint, and no Pilot evidence. Failure
        is classified PRE_EXECUTION_SCENARIO_INVALID and never repaired by seed,
        threshold, distance, or post-result substitution.
        """
        self.reset_ego()
        self.host.set_relation_id(f"ADMISSION:{kind}")
        baseline = PresentObservation.from_mapping(self.host.present_observation())
        if baseline.front_present:
            raise ScenarioAdmissionError(
                f"{kind} admission baseline is contaminated by an ambient front relation"
            )

        self.spawn_counterpart(kind)
        staged = PresentObservation.from_mapping(self.host.present_observation())
        if not staged.front_present:
            raise ScenarioAdmissionError(
                f"{kind} counterpart did not form an approved front relation"
            )
        if staged.front_kind != kind:
            raise ScenarioAdmissionError(
                f"{kind} admission observed front_kind={staged.front_kind!r}"
            )

        self.remove_counterpart()
        self.host.tick()
        closed = PresentObservation.from_mapping(self.host.present_observation())
        if closed.front_present:
            raise ScenarioAdmissionError(
                f"{kind} counterpart removal did not produce front_present=False"
            )

        result = {
            "kind": kind,
            "spawn_index": int(self.admitted_spawn_index),
            "baseline_front_present": bool(baseline.front_present),
            "staged_front_present": bool(staged.front_present),
            "staged_front_kind": staged.front_kind,
            "closure_front_present": bool(closed.front_present),
            "passed": True,
        }
        self.reset_ego()
        self.host.set_relation_id("UNBOUND")
        return result

    def set_motion(self, *, ego_speed: float, counterpart_speed: float):
        import carla  # type: ignore

        forward = self.ego.get_transform().get_forward_vector()
        ego_v = carla.Vector3D(
            float(forward.x) * float(ego_speed),
            float(forward.y) * float(ego_speed),
            float(forward.z) * float(ego_speed),
        )
        self.ego.set_target_velocity(ego_v)
        if self.counterpart is not None:
            front_v = carla.Vector3D(
                float(forward.x) * float(counterpart_speed),
                float(forward.y) * float(counterpart_speed),
                float(forward.z) * float(counterpart_speed),
            )
            try:
                self.counterpart.set_target_velocity(front_v)
            except Exception:
                pass
        self.host.mark_host_mutation()
        self.host.tick()

    def stage_front_relation(
        self,
        *,
        kind: str,
        opening: bool,
        relation_id: str,
    ) -> None:
        self.reset_ego()
        self.host.set_relation_id(relation_id)
        self.spawn_counterpart(kind)
        # Establish the first actual current sample with a higher ego speed.
        self.set_motion(ego_speed=4.0, counterpart_speed=0.5)
        # Main current sample always has a material ego speed decrease. Omission
        # cases are physically staged as an opening front relation, not by passing
        # a failure label into Governance.
        self.set_motion(
            ego_speed=1.0,
            counterpart_speed=(3.0 if opening else 0.2),
        )

    def close_front_relation(self) -> PresentObservation:
        self.remove_counterpart()
        self.host.tick()
        return PresentObservation.from_mapping(self.host.present_observation())

    def cleanup(self):
        self.remove_counterpart()
        if self.ego is not None:
            try:
                self.ego.destroy()
            except Exception:
                pass
            self.ego = None


def experience_from_history(history) -> CompletedExperience:
    admission = build_domain_bundle().history_admission
    records = admission.admit(history)
    return CompletedExperience(
        history.entry_id,
        "",
        f"general:{history.entry_id}",
        history.relation_end_tau,
        {
            "history_entry_id": history.entry_id,
            "selected": history.selected_possibility_id,
            "relation_records": records,
        },
        len(repr((history, records)).encode("utf-8")),
    )


def complete_baseline_history(
    *,
    scene: PilotScene,
    execution,
    entry_id: str,
):
    post_observation = scene.close_front_relation()
    post_tau = float(scene.host.current_tau())
    closure = build_domain_bundle().closure_evaluator.evaluate(
        realized_observation=execution.observation,
        post_observation=post_observation,
        selected_possibility_id=execution.realization.selected_possibility_id,
    )
    if not closure.closed:
        raise CoreV11InvariantError("General Harness relation did not reach Closure")
    return execution.recorder.complete_history_entry(
        entry_id=entry_id,
        realized_tau=execution.realization_tau,
        outcome_tau=post_tau,
        relation_end_tau=post_tau,
        selected_possibility_id=execution.realization.selected_possibility_id,
        realization_ref=execution.realization_ref,
        realization_count=1,
        outcome_description="authoritative CARLA relation-process closure",
        closure_method=closure.method,
        closure_evidence=closure.evidence,
    )


def run_general_decision(
    *,
    scene: PilotScene,
    experiences: tuple[CompletedExperience, ...],
):
    core = build_domain_bundle().core
    view = ParticipatingExperienceView(experiences)
    harness = CanonicalHarnessV11(BaselineCoreBoundary(core, view))
    return harness.execute_decision_epoch(scene.host)


def snapshot_from_governance_execution(execution) -> DecisionProvenanceSnapshot:
    history = execution.history_entry
    if history is None or execution.provenance is None:
        raise CoreV11InvariantError("CBRA requires committed Governance provenance")
    responsibility = execution.responsibility
    if responsibility.selected_candidate_id is None:
        raise CoreV11InvariantError("CBRA requires an actual selected candidate")

    participation = tuple(
        ParticipationProvenance(
            experience_id=item.experience_id,
            participate=bool(item.participate),
            rationale=item.rationale,
            provenance_ref=item.provenance_ref,
        )
        for item in execution.reengagement
    )
    if not participation:
        raise CoreV11InvariantError(
            "Pilot CBRA failure classes require at least one participation judgment"
        )

    axis_obligations = (
        ("U", tuple(responsibility.axes.uncertainty)),
        ("I", tuple(responsibility.axes.impact)),
        ("V", tuple(responsibility.axes.vulnerability)),
        ("T", tuple(responsibility.axes.temporality)),
    )
    return DecisionProvenanceSnapshot(
        entry_id=history.entry_id,
        relation_id=execution.relation_id,
        decision_tau=history.decision_tau,
        closure_tau=history.relation_end_tau,
        participation=participation,
        responsibility=ResponsibilityProvenance(
            selected_candidate_id=responsibility.selected_candidate_id,
            nonselected_candidate_ids=tuple(
                responsibility.nonselected_candidate_ids
            ),
            uncertainty=tuple(responsibility.axes.uncertainty),
            impact=tuple(responsibility.axes.impact),
            vulnerability=tuple(responsibility.axes.vulnerability),
            temporality=tuple(responsibility.axes.temporality),
            selected_obligations=tuple(responsibility.selected_obligations),
            nonselected_obligations=tuple(
                responsibility.nonselected_obligations
            ),
            axis_obligations=axis_obligations,
        ),
    )


def cbra_feedback_from_checkpoint(checkpoint) -> GovernanceFeedbackV04:
    obligation_states = [
        item.state for item in checkpoint.responsibility_obligation_findings
    ]
    if any(state is RevalidationState.REVISED for state in obligation_states):
        responsibility_state = RevalidationState.REVISED
    elif any(state is RevalidationState.CONFIRMED for state in obligation_states):
        responsibility_state = RevalidationState.CONFIRMED
    else:
        responsibility_state = RevalidationState.INCONCLUSIVE

    return GovernanceFeedbackV04(
        prior_entry_id=f"CBRA:{checkpoint.entry_id}:{checkpoint.ordinal}",
        relation_id=checkpoint.relation_id,
        provenance_refs=tuple(checkpoint.evidence_refs),
        gap_state=RevalidationState.INCONCLUSIVE,
        choice_state=checkpoint.selected_choice_finding.state,
        responsibility_state=responsibility_state,
        experience_states=tuple(
            (item.target_id, item.state)
            for item in checkpoint.participation_findings
        ),
    )
