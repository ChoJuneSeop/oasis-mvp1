from __future__ import annotations

from .models import (
    AxisId,
    EvidenceLevel,
    ExperimentDesign,
    PortfolioReport,
    ProgramSequenceReport,
)


def validate_program_sequence(
    *,
    program_id: str,
    design: ExperimentDesign,
    portfolio: PortfolioReport,
) -> ProgramSequenceReport:
    blockers: list[str] = []
    targeted = tuple(axis.value for axis in design.targeted_axes)

    if design.evidence_level is EvidenceLevel.INTEGRATED_CONFIRMATORY:
        if portfolio.next_required_axis is not None:
            blockers.append(
                "integrated_experiment_blocked_until_all_axes_supported:"
                + portfolio.next_required_axis
            )
        if set(design.targeted_axes) != set(AxisId):
            blockers.append("integrated_experiment_must_target_all_six_axes")
    else:
        if len(design.targeted_axes) != 1:
            blockers.append("axis_experiment_must_target_exactly_one_official_axis")
        elif portfolio.next_required_axis is None:
            blockers.append("all_axes_already_supported; next scientific step is integration")
        else:
            target = design.targeted_axes[0].value
            if target != portfolio.next_required_axis:
                replication = bool(design.metadata.get("replication_of_closed_axis"))
                target_is_supported = target in set(portfolio.supported_axes)
                if not (replication and target_is_supported):
                    blockers.append(
                        f"official_axis_sequence_requires={portfolio.next_required_axis};"
                        f"requested={target}"
                    )

    return ProgramSequenceReport(
        program_id=program_id,
        requested_experiment_id=design.experiment_id,
        next_required_axis=portfolio.next_required_axis,
        targeted_axes=targeted,
        sequence_ready=not blockers,
        blockers=tuple(blockers),
    )
