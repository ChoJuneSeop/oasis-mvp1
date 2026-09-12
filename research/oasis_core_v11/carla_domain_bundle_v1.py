from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from research.oasis_core_v11.carla_domain_policy_v1 import (
    ContinuousUVITResponsibilityOperator,
    ControllerCoefficients,
    CurrentFeasibleCandidateGenerator,
    FrontInteractionClosureEvaluator,
    MemoryIsolatedActuationOperator,
    ParetoThenDistributionChoiceOperator,
    SemanticContinuityRelationOperator,
    TraceDerivedReconstructionOperator,
)
from research.oasis_core_v11.carla_relational_domain import (
    ClosedCARLARelationExtractor,
    CurrentObservationRelationBuilder,
)
from research.oasis_core_v11.current_relational_core import (
    CurrentRelationalCoreV11,
    HistoricalRelationRecord,
)
from research.oasis_core_v11.history_admission import HistoryAdmissionBridge


DOMAIN_BUNDLE_VERSION = "OASIS-CARLA G3.2 Domain Policy Bundle v1"
NO_POST_RESULT_RETUNING = True


@dataclass(frozen=True)
class DomainBundle:
    core: CurrentRelationalCoreV11
    history_admission: HistoryAdmissionBridge
    closure_evaluator: FrontInteractionClosureEvaluator
    controller_coefficients: ControllerCoefficients


def build_domain_bundle(
    history: Sequence[HistoricalRelationRecord] = (),
    *,
    controller_coefficients: ControllerCoefficients = ControllerCoefficients(),
) -> DomainBundle:
    core = CurrentRelationalCoreV11(
        relation_builder=CurrentObservationRelationBuilder(),
        candidate_provider=CurrentFeasibleCandidateGenerator(),
        relation_operator=SemanticContinuityRelationOperator(),
        reconstruction_operator=TraceDerivedReconstructionOperator(),
        responsibility_operator=ContinuousUVITResponsibilityOperator(),
        choice_operator=ParetoThenDistributionChoiceOperator(),
        actuation_operator=MemoryIsolatedActuationOperator(controller_coefficients),
        history=history,
    )
    admission = HistoryAdmissionBridge(core=core, extractor=ClosedCARLARelationExtractor())
    return DomainBundle(
        core=core,
        history_admission=admission,
        closure_evaluator=FrontInteractionClosureEvaluator(),
        controller_coefficients=controller_coefficients,
    )
