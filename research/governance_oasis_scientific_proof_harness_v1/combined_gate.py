from __future__ import annotations

from dataclasses import dataclass

from research.oasis_experiment_freeze_harness_v1.models import GateReport

from .models import ProofDesignReport


@dataclass(frozen=True)
class CombinedReadinessReport:
    experiment_id: str
    expected_execution_profile_id: str
    actual_execution_profile_id: str
    execution_profile_matches: bool
    execution_contract_matches: bool
    scientific_design_ready: bool
    execution_integrity_ready: bool
    experiment_ready: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "experiment_id": self.experiment_id,
            "expected_execution_profile_id": self.expected_execution_profile_id,
            "actual_execution_profile_id": self.actual_execution_profile_id,
            "execution_profile_matches": self.execution_profile_matches,
            "execution_contract_matches": self.execution_contract_matches,
            "scientific_design_ready": self.scientific_design_ready,
            "execution_integrity_ready": self.execution_integrity_ready,
            "experiment_ready": self.experiment_ready,
            "blockers": list(self.blockers),
        }


def combine_readiness(
    proof_report: ProofDesignReport,
    freeze_report: GateReport,
) -> CombinedReadinessReport:
    blockers = []
    profile_matches = (
        proof_report.execution_profile_id == freeze_report.profile_id
    )
    if not profile_matches:
        blockers.append(
            "execution_profile_mismatch:"
            + proof_report.execution_profile_id
            + "!="
            + freeze_report.profile_id
        )

    missing_execution_checks = sorted(
        set(proof_report.required_execution_check_ids)
        - set(freeze_report.required_check_ids)
    )
    execution_contract_matches = not missing_execution_checks
    if missing_execution_checks:
        blockers.append(
            "execution_profile_missing_required_checks:"
            + ",".join(missing_execution_checks)
        )

    if not proof_report.proof_ready:
        blockers.append(
            "scientific_proof_design_blocked:"
            + ",".join(proof_report.unresolved_check_ids)
        )
    if not freeze_report.freeze_ready:
        blockers.append(
            "execution_integrity_blocked:"
            + ",".join(freeze_report.unresolved_check_ids)
        )
    return CombinedReadinessReport(
        experiment_id=proof_report.experiment_id,
        expected_execution_profile_id=proof_report.execution_profile_id,
        actual_execution_profile_id=freeze_report.profile_id,
        execution_profile_matches=profile_matches,
        execution_contract_matches=execution_contract_matches,
        scientific_design_ready=proof_report.proof_ready,
        execution_integrity_ready=freeze_report.freeze_ready,
        experiment_ready=not blockers,
        blockers=tuple(blockers),
    )
