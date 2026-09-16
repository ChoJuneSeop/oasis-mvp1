from __future__ import annotations


class ActionContractError(ValueError):
    pass


# GH-1L scenario/prehistory vocabulary is semantic. Core uses canonical possibility IDs.
# This adapter is frozen before the v1.0.2 pilot and is the only admitted translation.
ACTION_ALIASES = {
    "continue": "continue-flow",
    "hold-course": "continue-flow",
    "continue-flow": "continue-flow",
    "yield-space": "yield-space",
    "align-heading-negative": "align-heading-negative",
    "align-heading-positive": "align-heading-positive",
}

CANONICAL_CORE_ACTIONS = frozenset({
    "continue-flow",
    "yield-space",
    "align-heading-negative",
    "align-heading-positive",
})


def canonical_action(action: str) -> str:
    try:
        value = ACTION_ALIASES[action]
    except KeyError as exc:
        raise ActionContractError(f"unregistered GH-1L action label: {action}") from exc
    if value not in CANONICAL_CORE_ACTIONS:
        raise ActionContractError(f"action does not map to a canonical Core possibility: {action}")
    return value
