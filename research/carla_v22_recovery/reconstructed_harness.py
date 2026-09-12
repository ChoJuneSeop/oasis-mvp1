from __future__ import annotations

from dataclasses import dataclass, asdict
from enum import Enum
from hashlib import sha256
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol, Sequence


PROTOCOL_NAME = "OASIS-CARLA Paper Validation Protocol v2.2"
HARNESS_NAME = "OASIS-CARLA Paper Validation Harness v1.0"
ORIGINAL_CORE_SHA256 = "cbe905fbda1eba5c85a97aa5942f8aa06444f32d9348fc93f87d7ba3912719d7"
CARLA_MAP = "Town10HD_Opt"
FIXED_DELTA_SECONDS = 0.05
REPLAY_EPOCHS = 220

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

KNOWN_EXPERIENCE_KEYS = (
    "E-old-neutral",
    "E-mid-pedestrian",
    "E-recent-opening",
    "E-old-closing",
)


class ReconstructionError(RuntimeError):
    pass


class Intervention(str, Enum):
    FULL = "FULL"
    NO_REACTIVATION = "NO_REACTIVATION"
    TIME_CENSORED = "TIME_CENSORED"
    FIXED_RESPONSIBILITY = "FIXED_RESPONSIBILITY"


@dataclass(frozen=True)
class Observation:
    epoch: int
    ego_speed_mps: float
    front_present: bool
    front_gap_m: float
    front_closing_mps: float
    front_kind: str
    local_heading_error_deg: float
    local_density: int

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "Observation":
        if tuple(data.keys()) != APPROVED_OBSERVATION_FIELDS:
            missing = [k for k in APPROVED_OBSERVATION_FIELDS if k not in data]
            extra = [k for k in data if k not in APPROVED_OBSERVATION_FIELDS]
            raise ReconstructionError(
                f"observation schema mismatch: missing={missing}, extra={extra}, order={tuple(data.keys())}"
            )
        return cls(**data)


@dataclass(frozen=True)
class VehicleActuation:
    throttle: float
    brake: float
    steer: float


@dataclass(frozen=True)
class DecisionRecord:
    actuation: VehicleActuation
    reactivated_keys: tuple[str, ...]
    compute_units: int
    responsibility: tuple[float, float, float, float]


@dataclass(frozen=True)
class ProbeRecord:
    intervention: Intervention
    before_fingerprint: str
    after_fingerprint: str
    state_unchanged: bool
    decision: DecisionRecord


class RecoveredDecisionCore(Protocol):
    """Interface only. The lost original decision-core implementation is not reconstructed by evidence."""

    def decide(self, observation: Observation, intervention: Intervention) -> DecisionRecord:
        ...


class ReadOnlyFlowPort(Protocol):
    """Host-side adapter. It must expose only a present snapshot and a stable fingerprint."""

    def present_observation(self) -> Observation:
        ...

    def flow_fingerprint(self) -> str:
        ...


class EvidenceConstrainedHarness:
    """
    Reconstructed harness shell derived from surviving integrity evidence.

    It deliberately excludes CARLA world/map/raw-actor access and the missing core logic.
    Counterfactual probes are required to be read-only with respect to the real flow.
    """

    def __init__(self, core: RecoveredDecisionCore):
        self.core = core

    def probe(self, port: ReadOnlyFlowPort, intervention: Intervention) -> ProbeRecord:
        observation = port.present_observation()
        before = port.flow_fingerprint()
        decision = self.core.decide(observation, intervention)
        after = port.flow_fingerprint()
        unchanged = before == after
        if not unchanged:
            raise ReconstructionError("counterfactual probe mutated or advanced the real flow")
        return ProbeRecord(
            intervention=intervention,
            before_fingerprint=before,
            after_fingerprint=after,
            state_unchanged=True,
            decision=decision,
        )


def candidate_source_sha256(path: str | Path) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()


def matches_lost_original_core(path: str | Path) -> bool:
    """Only a byte-level hash match can justify calling a candidate the recovered original core."""
    return candidate_source_sha256(path) == ORIGINAL_CORE_SHA256


def _decision_from_report(data: Mapping[str, Any]) -> DecisionRecord:
    control = data["control"]
    responsibility = tuple(float(x) for x in data["responsibility"])
    if len(responsibility) != 4:
        raise ReconstructionError("responsibility vector must have four components")
    return DecisionRecord(
        actuation=VehicleActuation(
            throttle=float(control["throttle"]),
            brake=float(control["brake"]),
            steer=float(control["steer"]),
        ),
        reactivated_keys=tuple(str(x) for x in data["reactivated_keys"]),
        compute_units=int(data["compute_units"]),
        responsibility=responsibility,  # type: ignore[arg-type]
    )


def validate_surviving_integrity_report(report: Mapping[str, Any]) -> dict[str, Any]:
    """
    Validate the surviving report against the directly evidenced reconstruction contract.

    This checks evidence consistency. It does NOT prove that this reconstructed source is the
    byte-identical lost harness.
    """
    errors: list[str] = []

    if report.get("protocol") != PROTOCOL_NAME:
        errors.append("protocol name mismatch")
    if report.get("harness") != HARNESS_NAME:
        errors.append("harness name mismatch")
    if report.get("carla_map") != CARLA_MAP:
        errors.append("CARLA map mismatch")
    if float(report.get("fixed_delta_seconds", -1)) != FIXED_DELTA_SECONDS:
        errors.append("fixed delta mismatch")
    if int(report.get("replay_epochs", -1)) != REPLAY_EPOCHS:
        errors.append("replay epoch count mismatch")

    gates = report.get("gates", {})
    g1 = gates.get("G1", {})
    if not (g1.get("pass") is True and g1.get("epochs") == 220 and g1.get("violations") == 0):
        errors.append("G1 evidence mismatch")

    g2 = gates.get("G2", {})
    static_audit = g2.get("core_static_audit", {})
    schema_audit = g2.get("observation_schema_audit", {})
    if static_audit.get("core_file_sha256") != ORIGINAL_CORE_SHA256:
        errors.append("recorded original core SHA-256 mismatch")
    if static_audit.get("prohibited_hits") != [] or static_audit.get("pass") is not True:
        errors.append("G2 static audit mismatch")
    if schema_audit.get("approved_exact_match") is not True:
        errors.append("G2 approved observation schema mismatch")
    if schema_audit.get("unexpected_fields") != [] or schema_audit.get("prohibited_fields_present") != []:
        errors.append("G2 schema leakage evidence mismatch")

    g3 = gates.get("G3", {})
    if not (g3.get("pass") is True and g3.get("checks") == 20 and g3.get("violations") == 0):
        errors.append("G3 counterfactual purity evidence mismatch")

    g4 = gates.get("G4", {})
    if g4.get("pass") is not False:
        errors.append("G4 must remain recorded as FAIL")

    probes = report.get("counterfactual_probe_records", [])
    probe_count = 0
    seen_interventions: set[str] = set()
    for epoch_record in probes:
        observation_data = epoch_record.get("observation", {})
        try:
            Observation.from_mapping(observation_data)
        except Exception as exc:
            errors.append(f"observation schema error at epoch {observation_data.get('epoch')}: {exc}")

        for raw_probe in epoch_record.get("probes", []):
            probe_count += 1
            name = str(raw_probe.get("intervention"))
            seen_interventions.add(name)
            try:
                Intervention(name)
            except ValueError:
                errors.append(f"unknown intervention: {name}")
            if raw_probe.get("before_hash") != raw_probe.get("after_hash"):
                errors.append(f"probe fingerprint changed at epoch {observation_data.get('epoch')} / {name}")
            if raw_probe.get("state_unchanged") is not True:
                errors.append(f"probe marked state changed at epoch {observation_data.get('epoch')} / {name}")
            try:
                _decision_from_report(raw_probe["decision"])
            except Exception as exc:
                errors.append(f"decision record error at epoch {observation_data.get('epoch')} / {name}: {exc}")

    expected_interventions = {x.value for x in Intervention}
    if seen_interventions != expected_interventions:
        errors.append(
            f"intervention set mismatch: seen={sorted(seen_interventions)}, expected={sorted(expected_interventions)}"
        )
    if probe_count != int(g3.get("checks", -1)):
        errors.append(f"probe count {probe_count} != recorded G3 checks {g3.get('checks')}")

    return {
        "pass": not errors,
        "errors": errors,
        "probe_count": probe_count,
        "interventions": sorted(seen_interventions),
        "identity": "evidence-constrained reconstruction; original source identity not established",
    }


def report_probe_to_dict(record: ProbeRecord) -> dict[str, Any]:
    data = asdict(record)
    data["intervention"] = record.intervention.value
    data["decision"]["control"] = data["decision"].pop("actuation")
    return data
