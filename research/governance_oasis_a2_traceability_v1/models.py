from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any

from .canonical import domain_digest


HARNESS_FREEZE_COMMIT = "be6ec29f934e9e7b30199f0cb3c1286a94538477"
SOURCE_FREEZE_COMMIT = "721f9cacbabb5457628ead61aa97bc3da9e364c4"
EXPERIMENT_ID = "GO_A2_RELATION_ORDER_TRACEABILITY_V1"
AXIS_ID = "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY"
EXECUTION_PROFILE_ID = "GO_A2_TRACEABILITY_EXECUTION_V1"


class EventType(str, Enum):
    CANDIDATE_OBSERVED = "CANDIDATE_OBSERVED"
    REVALIDATION_OBSERVED = "REVALIDATION_OBSERVED"
    PARTICIPATION_OBSERVED = "PARTICIPATION_OBSERVED"
    DECISION_INPUT_CONSUMED = "DECISION_INPUT_CONSUMED"
    PRE_REALIZATION_SEAL = "PRE_REALIZATION_SEAL"
    SINGLE_REALIZATION = "SINGLE_REALIZATION"
    POST_OUTCOME = "POST_OUTCOME"


class ClaimOutcome(str, Enum):
    SUPPORTS = "SUPPORTS"
    DOES_NOT_SUPPORT = "DOES_NOT_SUPPORT"
    INCONCLUSIVE = "INCONCLUSIVE"
    INVALID = "INVALID"


@dataclass(frozen=True)
class A2ExecutionProfile:
    profile_id: str
    harness_freeze_commit: str
    source_freeze_commit: str
    experiment_definition_hash: str
    confirmatory_plan_hash: str
    ce_registry_hash: str
    world_snapshot_hash: str
    worker_build_hash: str
    system_trace_build_hash: str
    reference_recorder_build_hash: str
    evaluator_build_hash: str
    single_realization: bool = True
    pre_realization_seal_required: bool = True
    future_information_prohibited: bool = True
    evaluator_postjoin: bool = True

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ArmFixture:
    arm_id: str
    contrast_id: str
    current_observation_hash: str
    core_hash: str
    possibility_set_hash: str
    payload_semantic_hash: str
    identity_binding: tuple[str, ...]
    relation_digest: str
    order_digest: str
    negative_stage: str | None = None

    def scientific_fields(self) -> dict[str, Any]:
        return {
            "current_observation_hash": self.current_observation_hash,
            "core_hash": self.core_hash,
            "possibility_set_hash": self.possibility_set_hash,
            "payload_semantic_hash": self.payload_semantic_hash,
            "identity_binding": list(self.identity_binding),
            "relation_digest": self.relation_digest,
            "order_digest": self.order_digest,
            "negative_stage": self.negative_stage,
        }

    @property
    def expects_consumption(self) -> bool:
        return self.negative_stage is None

    def expected_negative_state(self) -> tuple[bool, bool, bool, bool] | None:
        if self.negative_stage is None:
            return None
        mapping = {
            "N1_REVALIDATION_NO": (True, False, False, False),
            "N2_NOT_PARTICIPATED": (True, True, False, False),
            "N3_PARTICIPATED_NOT_CONSUMED": (True, True, True, False),
        }
        try:
            return mapping[self.negative_stage]
        except KeyError as exc:
            raise ValueError(f"unknown negative stage: {self.negative_stage}") from exc


@dataclass(frozen=True)
class TraceEntry:
    ce_instance_id: str
    candidate: bool
    revalidated: bool | None
    participated: bool | None
    decision_consumed: bool
    payload_digest: str
    relation_digest: str
    order_digest: str
    provenance_ref: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SystemTrace:
    run_id: str
    execution_profile_id: str
    contrast_id: str
    arm_id: str
    decision_invocation_id: str
    entries: tuple[TraceEntry, ...]
    sealed: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "execution_profile_id": self.execution_profile_id,
            "contrast_id": self.contrast_id,
            "arm_id": self.arm_id,
            "decision_invocation_id": self.decision_invocation_id,
            "entries": [entry.as_dict() for entry in self.entries],
            "sealed": self.sealed,
        }

    def digest(self) -> str:
        return domain_digest("A2_SYSTEM_TRACE_V1", self.as_dict())


@dataclass(frozen=True)
class ReferenceEvent:
    sequence_number: int
    event_type: EventType
    run_id: str
    execution_profile_id: str
    contrast_id: str
    arm_id: str
    decision_invocation_id: str
    ce_instance_id: str | None
    payload_digest: str
    relation_digest: str
    order_digest: str
    metadata: dict[str, Any] = field(default_factory=dict)
    previous_event_hash: str = ""
    event_hash: str = ""

    def hash_payload(self) -> dict[str, Any]:
        return {
            "sequence_number": self.sequence_number,
            "event_type": self.event_type.value,
            "run_id": self.run_id,
            "execution_profile_id": self.execution_profile_id,
            "contrast_id": self.contrast_id,
            "arm_id": self.arm_id,
            "decision_invocation_id": self.decision_invocation_id,
            "ce_instance_id": self.ce_instance_id,
            "payload_digest": self.payload_digest,
            "relation_digest": self.relation_digest,
            "order_digest": self.order_digest,
            "metadata": self.metadata,
            "previous_event_hash": self.previous_event_hash,
        }

    def computed_hash(self) -> str:
        return domain_digest("A2_REFERENCE_EVENT_V1", self.hash_payload())

    def as_dict(self) -> dict[str, Any]:
        data = self.hash_payload()
        data["event_hash"] = self.event_hash
        return data


@dataclass(frozen=True)
class RunEvaluation:
    run_id: str
    contrast_id: str
    arm_id: str
    outcome: ClaimOutcome
    reasons: tuple[str, ...]
    matched_entries: int
    reference_consumed_ids: tuple[str, ...]
    system_consumed_ids: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "contrast_id": self.contrast_id,
            "arm_id": self.arm_id,
            "outcome": self.outcome.value,
            "reasons": list(self.reasons),
            "matched_entries": self.matched_entries,
            "reference_consumed_ids": list(self.reference_consumed_ids),
            "system_consumed_ids": list(self.system_consumed_ids),
        }
