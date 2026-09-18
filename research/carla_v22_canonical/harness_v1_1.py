from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

from research.g3_2_sidecar.common import G32InvariantError, RelationElementRef, normalize_distribution, require_tau
from research.g3_2_sidecar.history import HistoryEntry
from research.g3_2_sidecar.preflight import PolicyDeclaration, static_preflight
from research.g3_2_sidecar.reconstruction import ReconstructionMeasurement
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder

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
            missing = [k for k in APPROVED_OBSERVATION_FIELDS if k not in data]
            extra = [k for k in data if k not in APPROVED_OBSERVATION_FIELDS]
            raise HarnessInvariantError(
                f"present observation schema mismatch: missing={missing}, extra={extra}"
            )
        return cls(**data)


@dataclass(frozen=True)
class ActuationVector:
    throttle: float
    brake: float
    steer: float


@dataclass(frozen=True)
class DecisionFrame:
    tau: float
    current_reality: Mapping[str, Any]
    relation_elements: tuple[RelationElementRef, ...]
    possibility_distribution: Mapping[str, float]
    selected_possibility_id: str
    actuation: ActuationVector
    reconstruction: tuple[ReconstructionMeasurement, ...] = ()
    role_trace_by_relation: Mapping[tuple[str, str], tuple[str, ...]] = field(default_factory=dict)
    generated_by_relation: Mapping[tuple[str, str], tuple[str, ...]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        tau = require_tau("tau", self.tau)
        object.__setattr__(self, "tau", tau)
        normalized = normalize_distribution(self.possibility_distribution)
        object.__setattr__(self, "possibility_distribution", normalized)
        if self.selected_possibility_id not in normalized:
            raise HarnessInvariantError("selected possibility is absent from current distribution")
        for relation in self.relation_elements:
            if relation.completed_at_tau > tau:
                raise HarnessInvariantError("future relation entered current decision frame")
        for rec in self.reconstruction:
            if rec.observed_at_tau != tau:
                raise HarnessInvariantError("reconstruction is not aligned with current tau")


@dataclass(frozen=True)
class PreparedEpoch:
    epoch_id: str
    observation: PresentObservation
    frame: DecisionFrame
    recorder: G32EpochRecorder
    initial_fingerprint: str


@dataclass(frozen=True)
class RealizationReceipt:
    epoch_id: str
    realization_ref: str
    realized_tau: float


class PresentFlowPort(Protocol):
    def current_tau(self) -> float:
        ...

    def present_observation(self) -> Mapping[str, Any]:
        ...

    def flow_fingerprint(self) -> str:
        ...

    def apply_one(self, actuation: ActuationVector) -> str:
        ...


class OASISCoreAdapter(Protocol):
    """Adapter contract only; it does not define or replace the OASIS decision formula."""

    def evaluate_current(self, observation: PresentObservation, tau: float) -> DecisionFrame:
        ...

    def relation_ablation_distribution(
        self,
        frame: DecisionFrame,
        relation: RelationElementRef,
    ) -> Mapping[str, float]:
        ...

    def relation_group_ablation_distribution(
        self,
        frame: DecisionFrame,
        relations: Sequence[RelationElementRef],
    ) -> Mapping[str, float]:
        ...


class CanonicalHarnessV11:
    """
    Canonical Protocol-v2.2 harness shell for G3.2.

    Host flow mutation is allowed only through apply_one(), exactly once per prepared epoch.
    Relation ablations are observational counterfactual probes and must leave the host
    fingerprint and tau unchanged.
    """

    def __init__(self, port: PresentFlowPort, core: OASISCoreAdapter) -> None:
        self.port = port
        self.core = core
        self._realized_epochs: set[str] = set()
        report = static_preflight(PolicyDeclaration())
        if not report.passed:
            raise HarnessInvariantError(f"static G3.2 preflight failed: {report.violations}")

    @staticmethod
    def _relation_key(relation: RelationElementRef) -> tuple[str, str]:
        return (relation.experience_id, relation.relation_element_id)

    @staticmethod
    def _source_relations(rec: ReconstructionMeasurement) -> tuple[RelationElementRef, ...]:
        return tuple(link.source for link in rec.source_links)

    def _assert_probe_pure(self, *, before_fp: str, before_tau: float) -> tuple[str, float]:
        after_fp = self.port.flow_fingerprint()
        after_tau = require_tau("after_tau", self.port.current_tau())
        if after_fp != before_fp:
            raise HarnessInvariantError("counterfactual probe changed the real-flow fingerprint")
        if after_tau != before_tau:
            raise HarnessInvariantError("counterfactual probe advanced or rewound real-flow tau")
        return after_fp, after_tau

    def prepare_epoch(self) -> PreparedEpoch:
        tau = require_tau("tau", self.port.current_tau())
        raw_observation = self.port.present_observation()
        observation = PresentObservation.from_mapping(raw_observation)
        fingerprint = self.port.flow_fingerprint()

        frame = self.core.evaluate_current(observation, tau)
        if frame.tau != tau:
            raise HarnessInvariantError("core decision frame tau does not match host tau")

        after_eval_fp, _ = self._assert_probe_pure(before_fp=fingerprint, before_tau=tau)
        recorder = G32EpochRecorder(
            tau=tau,
            flow_fingerprint=fingerprint,
            current_reality=frame.current_reality,
            relation_elements=frame.relation_elements,
            possibility_distribution=frame.possibility_distribution,
        )

        for relation in frame.relation_elements:
            before_fp = self.port.flow_fingerprint()
            before_tau = self.port.current_tau()
            ablated = self.core.relation_ablation_distribution(frame, relation)
            after_fp, _ = self._assert_probe_pure(before_fp=before_fp, before_tau=before_tau)
            key = self._relation_key(relation)
            recorder.record_relation_probe(
                relation,
                before_fingerprint=before_fp,
                after_fingerprint=after_fp,
                relation_ablated_distribution=ablated,
                role_trace=frame.role_trace_by_relation.get(key, ()),
                generated_possibilities=frame.generated_by_relation.get(key, ()),
            )

        seen_groups: set[frozenset[tuple[str, str]]] = set()
        for rec in frame.reconstruction:
            source_relations = self._source_relations(rec)
            if len(source_relations) > 1:
                group_key = frozenset(self._relation_key(r) for r in source_relations)
                if group_key not in seen_groups:
                    before_fp = self.port.flow_fingerprint()
                    before_tau = self.port.current_tau()
                    ablated = self.core.relation_group_ablation_distribution(frame, source_relations)
                    after_fp, _ = self._assert_probe_pure(before_fp=before_fp, before_tau=before_tau)
                    recorder.record_group_probe(
                        source_relations,
                        before_fingerprint=before_fp,
                        after_fingerprint=after_fp,
                        group_ablated_distribution=ablated,
                        generated_possibilities=(rec.possibility_id,),
                    )
                    seen_groups.add(group_key)
            recorder.record_reconstruction(rec)

        final_fp, _ = self._assert_probe_pure(before_fp=after_eval_fp, before_tau=tau)
        epoch_id = f"epoch:{observation.epoch}:tau:{tau}:fp:{final_fp}"
        return PreparedEpoch(epoch_id, observation, frame, recorder, fingerprint)

    def realize_once(self, prepared: PreparedEpoch) -> RealizationReceipt:
        if prepared.epoch_id in self._realized_epochs:
            raise HarnessInvariantError("more than one real realization attempted for the same epoch")
        if self.port.flow_fingerprint() != prepared.initial_fingerprint:
            raise HarnessInvariantError("real flow changed between preparation and realization")
        realization_ref = str(self.port.apply_one(prepared.frame.actuation))
        if not realization_ref:
            raise HarnessInvariantError("host did not return a realization reference")
        self._realized_epochs.add(prepared.epoch_id)
        return RealizationReceipt(
            epoch_id=prepared.epoch_id,
            realization_ref=realization_ref,
            realized_tau=require_tau("realized_tau", self.port.current_tau()),
        )

    def complete_history(
        self,
        prepared: PreparedEpoch,
        receipt: RealizationReceipt,
        *,
        entry_id: str,
        outcome_tau: float,
        relation_end_tau: float,
        outcome_description: str,
        closure_method: str,
        closure_evidence: Mapping[str, Any],
    ) -> HistoryEntry:
        if receipt.epoch_id != prepared.epoch_id:
            raise HarnessInvariantError("realization receipt does not belong to prepared epoch")
        if prepared.epoch_id not in self._realized_epochs:
            raise HarnessInvariantError("history cannot be completed before actual realization")
        return prepared.recorder.complete_history_entry(
            entry_id=entry_id,
            realized_tau=receipt.realized_tau,
            outcome_tau=outcome_tau,
            relation_end_tau=relation_end_tau,
            selected_possibility_id=prepared.frame.selected_possibility_id,
            realization_ref=receipt.realization_ref,
            realization_count=1,
            outcome_description=outcome_description,
            closure_method=closure_method,
            closure_evidence=closure_evidence,
        )
