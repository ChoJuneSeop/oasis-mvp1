from __future__ import annotations

from dataclasses import asdict
from typing import Iterable

from .models import ARMS, ScenarioCase
from .operators import state_from_observations


def _index_workers(workers: Iterable[dict]) -> dict[str, dict[str, dict]]:
    by_arm: dict[str, dict[str, dict]] = {}
    for worker in workers:
        arm = str(worker["arm"])
        if arm in by_arm:
            raise RuntimeError(f"duplicate GH-3 worker arm: {arm}")
        chains = {}
        for item in worker["results"]:
            chain_id = str(item["chain_id"])
            if chain_id in chains:
                raise RuntimeError(f"duplicate GH-3 chain id: {chain_id}")
            chains[chain_id] = item
        by_arm[arm] = chains
    if set(by_arm) != set(ARMS):
        raise RuntimeError(f"GH-3 evaluator arm mismatch: {sorted(by_arm)}")
    return by_arm


def evaluate(cases: tuple[ScenarioCase, ...], workers: tuple[dict, ...] | list[dict]) -> dict:
    """Independent post-worker evaluator.

    Scenario truth is joined only here, after all scientific workers have returned.
    No evaluator truth is accepted by the worker runner.
    """
    truth_by_chain = {case.runtime.chain_id: case for case in cases}
    if len(truth_by_chain) != len(cases):
        raise RuntimeError("duplicate GH-3 evaluator chain id")
    by_arm = _index_workers(workers)
    for arm in ARMS:
        if set(by_arm[arm]) != set(truth_by_chain):
            raise RuntimeError(f"GH-3 evaluator chain set mismatch for {arm}")

    state_match = {arm: [] for arm in ARMS}
    for arm in ARMS:
        for chain_id, case in truth_by_chain.items():
            item = by_arm[arm][chain_id]
            expected = state_from_observations(
                case.runtime.antecedent_decision,
                case.runtime.antecedent_post,
            ).value
            if expected != case.truth.outcome_state:
                raise RuntimeError(
                    f"frozen GH-3 scenario truth is inconsistent: {chain_id}: {expected} != {case.truth.outcome_state}"
                )
            state_match[arm].append(int(item["antecedent_revalidation_state"] == expected))

    link_a = {
        arm: {
            "matched": sum(values),
            "total": len(values),
            "revalidation_state_match_rate": sum(values) / len(values),
        }
        for arm, values in state_match.items()
    }

    f1 = by_arm["F1_ACTIVE_CORRECT"]
    f2 = by_arm["F2_RECORD_ONLY"]
    f3 = by_arm["F3_PERMUTED_STATE"]

    revised_same = [
        c.runtime.chain_id for c in cases
        if c.truth.outcome_state == "revised" and c.truth.scope_mode == "same_scope"
    ]
    confirmed_all = [
        c.runtime.chain_id for c in cases if c.truth.outcome_state == "confirmed"
    ]
    inconclusive_all = [
        c.runtime.chain_id for c in cases if c.truth.outcome_state == "inconclusive"
    ]
    revised_shifted = [
        c.runtime.chain_id for c in cases
        if c.truth.outcome_state == "revised" and c.truth.scope_mode == "shifted_scope"
    ]

    def participant_changed(chain_id: str, left=f1, right=f2) -> int:
        return int(tuple(left[chain_id]["recurrence_participants"]) != tuple(right[chain_id]["recurrence_participants"]))

    def selection_changed(chain_id: str, left=f1, right=f2) -> int:
        return int(left[chain_id]["recurrence_realized"] != right[chain_id]["recurrence_realized"])

    def no_change(chain_id: str, left=f1, right=f2) -> int:
        return int(
            tuple(left[chain_id]["recurrence_participants"]) == tuple(right[chain_id]["recurrence_participants"])
            and left[chain_id]["recurrence_realized"] == right[chain_id]["recurrence_realized"]
        )

    primary_part = [participant_changed(x) for x in revised_same]
    primary_sel = [selection_changed(x) for x in revised_same]
    confirmed_stability = [no_change(x) for x in confirmed_all]
    inconclusive_stability = [no_change(x) for x in inconclusive_all]
    revised_shifted_stability = [no_change(x) for x in revised_shifted]

    f3_rows = []
    for case in cases:
        chain_id = case.runtime.chain_id
        row = f3[chain_id]
        f3_rows.append({
            "chain_id": chain_id,
            "true_state": case.truth.outcome_state,
            "scope_mode": case.truth.scope_mode,
            "family": case.truth.family,
            "stored_state": row["committed_feedback_state"],
            "exposed_state": row["recurrence_exposed_feedback_state"],
            "participants": row["recurrence_participants"],
            "realized": row["recurrence_realized"],
        })

    structural = {}
    for arm in ARMS:
        values = tuple(by_arm[arm].values())
        structural[arm] = {
            "chain_count": len(values),
            "selected_equals_realized": all(
                x["antecedent_selected"] == x["antecedent_realized"]
                and x["recurrence_selected"] == x["recurrence_realized"]
                for x in values
            ),
            "two_realizations_per_chain": all(x["realization_count"] == 2 for x in values),
            "new_ce_decision_reuse": any(x["recurrence_new_ce_exposed"] for x in values),
            "baseline_archive_count_stable": all(x["recurrence_decision_eligible_count"] == 1 for x in values),
        }

    def _rate(values: list[int]) -> float | None:
        return None if not values else sum(values) / len(values)

    return {
        "link_a": link_a,
        "link_b_primary": {
            "subset": "REVISED + SAME_SCOPE",
            "chain_count": len(revised_same),
            "F1_vs_F2_participation_change_count": sum(primary_part),
            "F1_vs_F2_participation_change_rate": _rate(primary_part),
            "F1_vs_F2_selection_change_count": sum(primary_sel),
            "F1_vs_F2_selection_change_rate": _rate(primary_sel),
        },
        "stability": {
            "confirmed_F1_vs_F2_no_change_rate": _rate(confirmed_stability),
            "inconclusive_F1_vs_F2_no_change_rate": _rate(inconclusive_stability),
            "revised_shifted_scope_no_global_block_rate": _rate(revised_shifted_stability),
        },
        "state_content_ablation": f3_rows,
        "structural": structural,
        "aggregate_score": None,
        "truth": [
            {
                "chain_id": case.runtime.chain_id,
                **asdict(case.truth),
            }
            for case in cases
        ],
    }
