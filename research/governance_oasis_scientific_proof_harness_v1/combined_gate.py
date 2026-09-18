from __future__ import annotations

from dataclasses import dataclass

from research.oasis_experiment_freeze_harness_v1.models import GateReport

from .models import ProofDesignReport


@dataclass(frozen=True)
class CombinedReadinessReport:
    experiment_id: str
    scientific_design_ready: bool
    execution_integrity_ready: bool
    experiment_ready: bool
    blockers: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "experiment_id": self.experiment_id,
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
        scientific_design_ready=proof_report.proof_ready,
        execution_integrity_ready=freeze_report.freeze_ready,
        experiment_ready=not blockers,
        blockers=tuple(blockers),
    )
