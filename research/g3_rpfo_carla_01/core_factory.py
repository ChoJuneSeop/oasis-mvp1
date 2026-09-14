from research.g3_organic_carla_01.live_runner import build_organic_core as build_legacy_core
from research.g3_rpfo_carla_01.live_core import RPFOCARLALiveCore
from research.g3_rpfo_carla_01.resolver import FrontProcessParticipationResolver, RPFOParticipationContributionOperator


def make_core(history=()):
    legacy, closure = build_legacy_core()
    names = (
        "assessment_operator", "verifier", "preference_operator", "resource_allocator",
        "relation_builder", "candidate_provider", "reconstruction_operator",
        "responsibility_operator", "actuation_operator",
    )
    kwargs = {name: getattr(legacy, name) for name in names}
    kwargs["relation_operator"] = RPFOParticipationContributionOperator()
    kwargs["participation_resolver"] = FrontProcessParticipationResolver()
    kwargs["history"] = tuple(history)
    return RPFOCARLALiveCore(**kwargs), closure
