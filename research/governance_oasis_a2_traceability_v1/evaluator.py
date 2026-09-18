from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from .ledger import ReferenceLedger
from .models import ArmFixture, ClaimOutcome, EventType, RunEvaluation, SystemTrace


def _last_bool(events, key: str) -> bool | None:
    if not events:
        return None
    return bool(events[-1].metadata[key])


def evaluate_run(
    *,
    fixture: ArmFixture,
    system_trace: SystemTrace,
    reference_ledger: ReferenceLedger,
) -> RunEvaluation:
    integrity_errors = list(reference_ledger.verify())
    binding_pairs = (
        ("run_id", system_trace.run_id, reference_ledger.run_id),
        ("execution_profile_id", system_trace.execution_profile_id, reference_ledger.execution_profile_id),
        ("contrast_id", system_trace.contrast_id, reference_ledger.contrast_id),
        ("arm_id", system_trace.arm_id, reference_ledger.arm_id),
        ("decision_invocation_id", system_trace.decision_invocation_id, reference_ledger.decision_invocation_id),
    )
    for name, left, right in binding_pairs:
        if left != right:
            integrity_errors.append(f"{name} mismatch: {left!r}!={right!r}")
    if fixture.arm_id != reference_ledger.arm_id or fixture.contrast_id != reference_ledger.contrast_id:
        integrity_errors.append("fixture binding mismatch")
    if not system_trace.sealed:
        integrity_errors.append("system trace is not sealed")

    try:
        seal = reference_ledger.seal_event()
        committed_trace_digest = str(seal.metadata.get("system_trace_digest", ""))
        if committed_trace_digest != system_trace.digest():
            integrity_errors.append("sealed system-trace digest mismatch")
    except Exception as exc:
        integrity_errors.append(f"seal lookup failed: {exc}")

    if integrity_errors:
        return RunEvaluation(
            run_id=reference_ledger.run_id,
            contrast_id=reference_ledger.contrast_id,
            arm_id=reference_ledger.arm_id,
            outcome=ClaimOutcome.INVALID,
            reasons=tuple(sorted(set(integrity_errors))),
            matched_entries=0,
            reference_consumed_ids=(),
            system_consumed_ids=(),
        )

    grouped = defaultdict(list)
    for event in reference_ledger.events:
        if event.ce_instance_id is not None:
            grouped[event.ce_instance_id].append(event)

    reference_state: dict[str, dict[str, object]] = {}
    for ce_id, events in grouped.items():
        candidates = [e for e in events if e.event_type is EventType.CANDIDATE_OBSERVED]
        revalidations = [e for e in events if e.event_type is EventType.REVALIDATION_OBSERVED]
        participations = [e for e in events if e.event_type is EventType.PARTICIPATION_OBSERVED]
        consumptions = [e for e in events if e.event_type is EventType.DECISION_INPUT_CONSUMED]
        provenance_events = candidates + revalidations + participations + consumptions
        digest_states = {
            (e.payload_digest, e.relation_digest, e.order_digest)
            for e in provenance_events
        }
        if len(digest_states) > 1:
            return RunEvaluation(
                run_id=reference_ledger.run_id,
                contrast_id=reference_ledger.contrast_id,
                arm_id=reference_ledger.arm_id,
                outcome=ClaimOutcome.INVALID,
                reasons=(f"{ce_id}: reference provenance digest changed across pre-realization states",),
                matched_entries=0,
                reference_consumed_ids=(),
                system_consumed_ids=(),
            )
        anchor = (
            consumptions[-1]
            if consumptions
            else (candidates[-1] if candidates else (events[0] if events else None))
        )
        reference_state[ce_id] = {
            "candidate": bool(candidates),
            "revalidated": _last_bool(revalidations, "accepted"),
            "participated": _last_bool(participations, "participated"),
            "decision_consumed": bool(consumptions),
            "payload_digest": "" if anchor is None else anchor.payload_digest,
            "relation_digest": "" if anchor is None else anchor.relation_digest,
            "order_digest": "" if anchor is None else anchor.order_digest,
        }

    system_state = {entry.ce_instance_id: entry for entry in system_trace.entries}
    reasons: list[str] = []
    matched = 0

    all_ids = sorted(set(reference_state) | set(system_state))
    for ce_id in all_ids:
        ref = reference_state.get(ce_id)
        sys = system_state.get(ce_id)
        if ref is None:
            reasons.append(f"{ce_id}: system trace contains CE absent from reference plane")
            continue
        if sys is None:
            reasons.append(f"{ce_id}: reference CE missing from system trace")
            continue
        comparisons = {
            "candidate": (sys.candidate, ref["candidate"]),
            "revalidated": (sys.revalidated, ref["revalidated"]),
            "participated": (sys.participated, ref["participated"]),
            "decision_consumed": (sys.decision_consumed, ref["decision_consumed"]),
            "payload_digest": (sys.payload_digest, ref["payload_digest"]),
            "relation_digest": (sys.relation_digest, ref["relation_digest"]),
            "order_digest": (sys.order_digest, ref["order_digest"]),
        }
        mismatched = [name for name, values in comparisons.items() if values[0] != values[1]]
        if mismatched:
            reasons.append(f"{ce_id}: mismatch={','.join(mismatched)}")
        else:
            matched += 1

    reference_consumed = tuple(
        sorted(
            ce_id
            for ce_id, state in reference_state.items()
            if bool(state["decision_consumed"])
        )
    )
    system_consumed = tuple(
        sorted(entry.ce_instance_id for entry in system_trace.entries if entry.decision_consumed)
    )

    expected_negative = fixture.expected_negative_state()
    if expected_negative is not None:
        if len(fixture.identity_binding) != 1:
            reasons.append("negative fixture must bind exactly one decoy CE")
        else:
            ce_id = fixture.identity_binding[0]
            state = reference_state.get(ce_id)
            if state is None:
                reasons.append("negative fixture CE absent from reference plane")
            else:
                observed = (
                    bool(state["candidate"]),
                    bool(state["revalidated"]),
                    bool(state["participated"]),
                    bool(state["decision_consumed"]),
                )
                if observed != expected_negative:
                    return RunEvaluation(
                        run_id=reference_ledger.run_id,
                        contrast_id=reference_ledger.contrast_id,
                        arm_id=reference_ledger.arm_id,
                        outcome=ClaimOutcome.INVALID,
                        reasons=(f"negative manipulation failed: observed={observed} expected={expected_negative}",),
                        matched_entries=matched,
                        reference_consumed_ids=reference_consumed,
                        system_consumed_ids=system_consumed,
                    )
    elif not reference_consumed:
        return RunEvaluation(
            run_id=reference_ledger.run_id,
            contrast_id=reference_ledger.contrast_id,
            arm_id=reference_ledger.arm_id,
            outcome=ClaimOutcome.INCONCLUSIVE,
            reasons=("valid run but no CE reached the decision-consumption boundary",),
            matched_entries=matched,
            reference_consumed_ids=reference_consumed,
            system_consumed_ids=system_consumed,
        )

    outcome = ClaimOutcome.SUPPORTS if not reasons else ClaimOutcome.DOES_NOT_SUPPORT
    return RunEvaluation(
        run_id=reference_ledger.run_id,
        contrast_id=reference_ledger.contrast_id,
        arm_id=reference_ledger.arm_id,
        outcome=outcome,
        reasons=tuple(reasons),
        matched_entries=matched,
        reference_consumed_ids=reference_consumed,
        system_consumed_ids=system_consumed,
    )


def aggregate_outcomes(results: Iterable[RunEvaluation]) -> ClaimOutcome:
    results = tuple(results)
    if not results:
        return ClaimOutcome.INCONCLUSIVE
    outcomes = {result.outcome for result in results}
    if ClaimOutcome.INVALID in outcomes:
        return ClaimOutcome.INVALID
    if ClaimOutcome.INCONCLUSIVE in outcomes:
        return ClaimOutcome.INCONCLUSIVE
    if outcomes == {ClaimOutcome.SUPPORTS}:
        return ClaimOutcome.SUPPORTS
    if outcomes == {ClaimOutcome.DOES_NOT_SUPPORT}:
        return ClaimOutcome.DOES_NOT_SUPPORT
    return ClaimOutcome.INCONCLUSIVE


def aggregate_axis(results: Iterable[RunEvaluation]) -> ClaimOutcome:
    results = tuple(results)
    by_contrast: dict[str, list[RunEvaluation]] = defaultdict(list)
    for result in results:
        by_contrast[result.contrast_id].append(result)

    required = {"A2-I", "A2-R", "A2-O", "A2-N"}
    if set(by_contrast) != required:
        return ClaimOutcome.INCONCLUSIVE

    contrast_outcomes = {key: aggregate_outcomes(value) for key, value in by_contrast.items()}
    values = set(contrast_outcomes.values())
    if ClaimOutcome.INVALID in values:
        return ClaimOutcome.INVALID
    if ClaimOutcome.INCONCLUSIVE in values:
        return ClaimOutcome.INCONCLUSIVE
    if values == {ClaimOutcome.SUPPORTS}:
        return ClaimOutcome.SUPPORTS
    return ClaimOutcome.DOES_NOT_SUPPORT
