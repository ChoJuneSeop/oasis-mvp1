from __future__ import annotations

from research.oasis_experiment_freeze_harness_v1.models import GateReport

from .design_gate import validate_design
from .models import ExperimentDesign, ExperimentReadinessReport, PortfolioReport
from .program_sequence import validate_program_sequence
from .three_lens_gate import three_lens_review


def evaluate_experiment_readiness(
    *,
    program_id: str,
    design: ExperimentDesign,
    portfolio: PortfolioReport,
    execution_report: GateReport,
) -> ExperimentReadinessReport:
    proof = validate_design(design)
    sequence = validate_program_sequence(
        program_id=program_id,
        design=design,
        portfolio=portfolio,
    )
    lenses = three_lens_review(
        proof_report=proof,
        execution_report=execution_report,
    )

    blockers: list[str] = []
    if not proof.proof_ready:
        blockers.append(
            "scientific_design:"
            + ",".join(proof.unresolved_check_ids)
        )
    if not sequence.sequence_ready:
        blockers.append(
            "program_sequence:"
            + ",".join(sequence.blockers)
        )
    if not lenses.all_three_pass:
        if lenses.definition_blockers:
            blockers.append(
                "definition_review:"
                + ",".join(lenses.definition_blockers)
            )
        if lenses.causal_blockers:
            blockers.append(
                "causal_review:"
                + ",".join(lenses.causal_blockers)
            )
        if lenses.execution_blockers:
            blockers.append(
                "execution_review:"
                + ",".join(lenses.execution_blockers)
            )

    ready = (
        proof.proof_ready
        and sequence.sequence_ready
        and lenses.all_three_pass
        and not blockers
    )

    return ExperimentReadinessReport(
        experiment_id=design.experiment_id,
        scientific_design_ready=proof.proof_ready,
        sequence_ready=sequence.sequence_ready,
        three_lens_ready=lenses.all_three_pass,
        experiment_ready=ready,
        blockers=tuple(blockers),
    )
