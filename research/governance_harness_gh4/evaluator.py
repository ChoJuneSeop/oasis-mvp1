from __future__ import annotations

from .models import ARMS, ScenarioCase


def _index_workers(workers):
    by_arm = {}
    for worker in workers:
        arm = str(worker["arm"])
        if arm in by_arm:
            raise RuntimeError(f"duplicate GH-4 arm: {arm}")
        rows = {str(x["episode_id"]): x for x in worker["results"]}
        if len(rows) != len(worker["results"]):
            raise RuntimeError(f"duplicate GH-4 episode id in {arm}")
        by_arm[arm] = {"worker": worker, "rows": rows}
    if set(by_arm) != set(ARMS):
        raise RuntimeError(f"GH-4 evaluator arm mismatch: {sorted(by_arm)}")
    return by_arm


def _rate(values):
    return None if not values else sum(values) / len(values)


def evaluate(cases: tuple[ScenarioCase, ...], workers) -> dict:
    """Join frozen scientific truth only after all arm workers have returned."""
    truth = {case.runtime.episode_id: case.truth for case in cases}
    if len(truth) != len(cases):
        raise RuntimeError("duplicate GH-4 truth episode id")
    by_arm = _index_workers(workers)
    for arm in ARMS:
        if set(by_arm[arm]["rows"]) != set(truth):
            raise RuntimeError(f"GH-4 evaluator episode set mismatch for {arm}")

    structural = {}
    state_match = {}
    for arm in ARMS:
        worker = by_arm[arm]["worker"]
        rows = tuple(by_arm[arm]["rows"].values())
        structural[arm] = {
            "decision_count": worker["decision_count"],
            "realization_count": worker["realization_count"],
            "commit_count": worker["commit_count"],
            "persistent_core": worker["persistent_core"],
            "persistent_harness": worker["persistent_harness"],
            "persistent_history_port": worker["persistent_history_port"],
            "reset_count": worker["reset_count"],
            "selected_equals_realized": all(x["selected"] == x["realized"] for x in rows),
            "one_realization_per_epoch": all(x["realization_count"] == 1 for x in rows),
            "no_gap_zero_archive_access": all(
                x["archive_access_count"] == 0 for x in rows if not x["gap_detected"]
            ),
            "strict_past_only_archive": all(
                all(float(tau) < float(cases[i].runtime.decision_observation.epoch + 1e9) for tau in x["decision_eligible_completed_taus"])
                for i, x in enumerate(rows)
            ),
        }
        matches = []
        for episode_id, row in by_arm[arm]["rows"].items():
            matches.append(int(row["revalidation_state"] == truth[episode_id].outcome_state))
        state_match[arm] = {
            "matched": sum(matches),
            "total": len(matches),
            "revalidation_state_match_rate": _rate(matches),
        }

    h1_rows = by_arm["H1_FULL_INTEGRATED"]["rows"]
    gap_h1 = [row for row in h1_rows.values() if row["gap_detected"]]
    run_created_candidate = [
        int(any(not str(x).startswith("GH4-BASE:") for x in row["decision_eligible_ids"]))
        for row in gap_h1
    ]
    run_created_participant = [
        int(any(not str(x).startswith("GH4-BASE:") for x in row["participant_ids"]))
        for row in gap_h1
    ]
    revised_block = [int(row["revised_block_count"] > 0) for row in gap_h1]
    no_gap_h1 = [row for row in h1_rows.values() if not row["gap_detected"]]

    def pairwise(left_arm: str, right_arm: str) -> dict:
        left = by_arm[left_arm]["rows"]
        right = by_arm[right_arm]["rows"]
        participant_diff = []
        selection_diff = []
        for episode_id in truth:
            participant_diff.append(int(tuple(left[episode_id]["participant_ids"]) != tuple(right[episode_id]["participant_ids"])))
            selection_diff.append(int(left[episode_id]["realized"] != right[episode_id]["realized"]))
        return {
            "episode_count": len(participant_diff),
            "participation_set_difference_count": sum(participant_diff),
            "participation_set_difference_rate": _rate(participant_diff),
            "realized_selection_difference_count": sum(selection_diff),
            "realized_selection_difference_rate": _rate(selection_diff),
        }

    return {
        "spec_version": "GH4_EXPERIMENT_V1_0_FINAL",
        "structural": structural,
        "revalidation": state_match,
        "h1_integrated_flow": {
            "gap_epoch_count": len(gap_h1),
            "run_created_ce_candidate_epoch_count": sum(run_created_candidate),
            "run_created_ce_candidate_epoch_rate": _rate(run_created_candidate),
            "run_created_ce_participation_epoch_count": sum(run_created_participant),
            "run_created_ce_participation_epoch_rate": _rate(run_created_participant),
            "provenance_revised_block_epoch_count": sum(revised_block),
            "provenance_revised_block_epoch_rate": _rate(revised_block),
            "no_gap_epoch_count": len(no_gap_h1),
            "no_gap_zero_archive_access_rate": _rate([int(x["archive_access_count"] == 0) for x in no_gap_h1]),
        },
        "pairwise_mechanism_contrasts": {
            "H1_vs_H2_new_CE_eligibility": pairwise("H1_FULL_INTEGRATED", "H2_FROZEN_NEW_CE"),
            "H1_vs_H3_feedback_exposure": pairwise("H1_FULL_INTEGRATED", "H3_FEEDBACK_RECORD_ONLY"),
            "H1_vs_H4_responsibility_binding": pairwise("H1_FULL_INTEGRATED", "H4_RESPONSIBILITY_RECORD_ONLY"),
            "H1_vs_H5_selective_participation": pairwise("H1_FULL_INTEGRATED", "H5_NONSELECTIVE_HISTORY"),
        },
        "aggregate_score": None,
        "truth": [
            {
                "episode_id": case.runtime.episode_id,
                "family": case.truth.family,
                "gap_expected": case.truth.gap_expected,
                "outcome_state": case.truth.outcome_state,
                "matrix_round": case.truth.matrix_round,
            }
            for case in cases
        ],
    }
