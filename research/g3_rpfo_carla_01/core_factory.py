from research.g3_organic_carla_01.live_runner import build_organic_core as build_legacy_core
from research.g3_rpfo_carla_01.live_core import RPFOCARLALiveCore
from research.g3_rpfo_carla_01.resolver import FrontProcessParticipationResolver, RPFOParticipationContributionOperator


def make_core(history=()):
    legacy, closure = build_legacy_core()
    kwargs = {
        "assessment_operator": legacy.assessment_operator,
        "verifier": legacy.verifier,
        "preference_operator": legacy.integrated_choice.preference_operator,
        "resource_allocator": legacy.resource_allocator,
        "relation_builder": legacy.relation_builder,
        "candidate_provider": legacy.candidate_provider,
        "reconstruction_operator": legacy.reconstruction_operator,
        "responsibility_operator": legacy.responsibility_operator,
        "actuation_operator": legacy.actuation_operator,
        "relation_operator": RPFOParticipationContributionOperator(),
        "participation_resolver": FrontProcessParticipationResolver(),
        "history": tuple(history),
    }
    return RPFOCARLALiveCore(**kwargs), closure
