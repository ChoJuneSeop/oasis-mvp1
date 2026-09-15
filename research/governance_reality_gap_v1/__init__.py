"""Semantic boundary between paper research axes and runtime reality gaps."""

from .contracts import (
    GapStatus,
    GapTriggeredRecallGate,
    MaintainCurrentFlow,
    RealityGapAxis,
    RealityGapObservation,
    RealityGapSignature,
    RecallDirective,
    ResearchAxis,
    ResearchAxisAssessment,
    ResearchVerdict,
)
from .integration import GapMediatedIntegratedChoiceCore
from .eligibility import (
    BroadRecallRetriever,
    ProvenanceRelationEligibilityGate,
    ReentryAuthorization,
    RelationEligibilityAssessment,
    RetrievedExperience,
)
from .reevaluation import IndependentReevaluationGate, ReevaluationDecision

__all__ = [
    "GapStatus",
    "GapTriggeredRecallGate",
    "GapMediatedIntegratedChoiceCore",
    "MaintainCurrentFlow",
    "RealityGapAxis",
    "RealityGapObservation",
    "RealityGapSignature",
    "RecallDirective",
    "ResearchAxis",
    "ResearchAxisAssessment",
    "ResearchVerdict",
    "BroadRecallRetriever",
    "ProvenanceRelationEligibilityGate",
    "ReentryAuthorization",
    "RelationEligibilityAssessment",
    "RetrievedExperience",
    "IndependentReevaluationGate",
    "ReevaluationDecision",
]
