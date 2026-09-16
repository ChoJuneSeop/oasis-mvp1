from __future__ import annotations

from dataclasses import replace
from typing import Mapping, Sequence

from research.governance_harness_v01.harness import (
    DynamicResponsibilityAxes,
    ResponsibilityJudgment,
)

from .models import CandidateBurden, ResponsibilityContext, ResponsibilityTrace


class ResponsibilityContractError(RuntimeError):
    pass


def _profile(candidate_id: str, ctx: ResponsibilityContext) -> CandidateBurden:
    if candidate_id not in {"continue-flow", "yield-space"}:
        raise ResponsibilityContractError(f"GH-2 unexpected candidate: {candidate_id}")

    if candidate_id == "continue-flow":
        return CandidateBurden(
            candidate_id,
            frozenset({"degraded-observation"}) if ctx.uncertainty_state == "degraded" else frozenset(),
            frozenset({"shared-impact"}) if ctx.impact_scope == "shared" else frozenset(),
            frozenset({"exposed-participant"}) if ctx.vulnerability_state == "exposed" else frozenset(),
            frozenset({"closing-window"}) if ctx.temporality_state == "closing" else frozenset(),
        )
    return CandidateBurden(
        candidate_id,
        frozenset({"unnecessary-uncertainty-intervention"}) if ctx.uncertainty_state == "clear" else frozenset(),
        frozenset({"isolated-flow-disruption"}) if ctx.impact_scope == "isolated" else frozenset(),
        frozenset({"unnecessary-vulnerability-intervention"}) if ctx.vulnerability_state == "ordinary" else frozenset(),
        frozenset({"stable-window-interference"}) if ctx.temporality_state == "stable" else frozenset(),
    )


def _dominates(a: CandidateBurden, b: CandidateBurden) -> bool:
    pairs = tuple(zip(a.axes(), b.axes()))
    return all(left.issubset(right) for left, right in pairs) and any(left != right for left, right in pairs)


def _select(profiles: Sequence[CandidateBurden], distribution: Mapping[str, float]) -> str:
    if set(distribution) != {x.candidate_id for x in profiles}:
        raise ResponsibilityContractError("responsibility profiles do not match actual candidate set")
    frontier = [
        item for item in profiles
        if not any(other.candidate_id != item.candidate_id and _dominates(other, item) for other in profiles)
    ]
    if not frontier:
        raise ResponsibilityContractError("responsibility frontier is empty")
    return max(frontier, key=lambda item: (float(distribution[item.candidate_id]), item.candidate_id)).candidate_id


def current_trace(candidate_ids: Sequence[str], distribution: Mapping[str, float], ctx: ResponsibilityContext) -> ResponsibilityTrace:
    profiles = tuple(_profile(cid, ctx) for cid in candidate_ids)
    selected = _select(profiles, distribution)
    nonselected = tuple(x for x in candidate_ids if x != selected)
    tokens = (
        f"U:{ctx.uncertainty_state}", f"I:{ctx.impact_scope}",
        f"V:{ctx.vulnerability_state}", f"T:{ctx.temporality_state}",
    )
    return ResponsibilityTrace(
        profiles=profiles,
        responsibility_selected=selected,
        selected_obligations=(f"bind-selected:{selected}", "preserve-current-uvit-provenance"),
        nonselected_obligations=tuple(f"retain-nonselected:{x}" for x in nonselected),
        context_tokens=tokens,
        source="current",
    )


def permuted_trace(trace: ResponsibilityTrace, distribution: Mapping[str, float]) -> ResponsibilityTrace:
    if len(trace.profiles) < 2:
        raise ResponsibilityContractError("permutation requires at least two candidates")
    ids = [x.candidate_id for x in trace.profiles]
    shifted = trace.profiles[1:] + trace.profiles[:1]
    remapped = tuple(replace(profile, candidate_id=cid) for cid, profile in zip(ids, shifted))
    selected = _select(remapped, distribution)
    return replace(
        trace,
        profiles=remapped,
        responsibility_selected=selected,
        selected_obligations=(f"bind-selected:{selected}", "permuted-candidate-profile-control"),
        nonselected_obligations=tuple(f"retain-nonselected:{x}" for x in ids if x != selected),
        source="permuted",
    )


def stale_trace(previous: ResponsibilityTrace, candidate_ids: Sequence[str], distribution: Mapping[str, float]) -> ResponsibilityTrace:
    if tuple(x.candidate_id for x in previous.profiles) != tuple(candidate_ids):
        raise ResponsibilityContractError("stale control requires identical candidate set")
    selected = _select(previous.profiles, distribution)
    return replace(
        previous,
        responsibility_selected=selected,
        selected_obligations=(f"bind-selected:{selected}", "stale-profile-control"),
        nonselected_obligations=tuple(f"retain-nonselected:{x}" for x in candidate_ids if x != selected),
        source="stale",
    )


def as_governance_judgment(trace: ResponsibilityTrace, candidate_ids: Sequence[str]) -> ResponsibilityJudgment:
    selected = trace.responsibility_selected
    axes = DynamicResponsibilityAxes(
        (trace.context_tokens[0],), (trace.context_tokens[1],),
        (trace.context_tokens[2],), (trace.context_tokens[3],),
    )
    return ResponsibilityJudgment(
        tuple(candidate_ids), selected,
        tuple(x for x in candidate_ids if x != selected), axes,
        trace.selected_obligations, trace.nonselected_obligations,
        rationale=f"GH-2 {trace.source} responsibility frontier; no scalar responsibility score",
    )
