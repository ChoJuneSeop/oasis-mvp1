#!/usr/bin/env python3
"""
P1-2 neutral synthetic falsification benchmark.

This benchmark was preregistered in P1_2_PREREGISTRATION.md before first
GitHub Actions result. It intentionally contains negative controls in which
relation history should NOT help, plus one positive control in which
history x current participation matters.

The data-generating process is deliberately different from the P1 structural
implementation. This remains synthetic evidence, not empirical validation.
"""

from __future__ import annotations
import argparse
import json
import math
import random
import statistics
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

DEFAULT_SEED = 20260905
DEFAULT_REPS = 8
DEFAULT_TRAIN = 700
DEFAULT_TEST = 350

REGIMES = (
    "null_current_only",
    "markov_participation",
    "history_additive",
    "history_participation_interaction",
)
MODELS = (
    "current_only",
    "similarity_memory",
    "participation_no_history",
    "relation_additive",
    "relation_interaction",
)
REGIME_OFFSETS = {
    "null_current_only": 11,
    "markov_participation": 23,
    "history_additive": 37,
    "history_participation_interaction": 53,
}


def sigmoid(z: float) -> float:
    z = max(-30.0, min(30.0, z))
    return 1.0 / (1.0 + math.exp(-z))


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (na * nb)))


def generate_sample(
    rng: random.Random,
    regime: str,
    n_events: int = 12,
    n_participants: int = 3,
) -> Dict:
    current = [rng.uniform(-1.0, 1.0) for _ in range(3)]
    participation = [rng.uniform(0.1, 1.0) for _ in range(n_participants)]

    events: List[Tuple[int, List[float], int]] = []
    latent_relation = [0.0] * n_participants

    for _ in range(n_events):
        participant = rng.randrange(n_participants)
        cue = [rng.uniform(-1.0, 1.0) for _ in range(3)]
        p_positive = sigmoid(
            0.40 * current[0] - 0.25 * current[1] + 0.15 * cue[0]
        )
        valence = 1 if rng.random() < p_positive else -1
        events.append((participant, cue, valence))

        # Hidden sequential DGP. This is not the OASIS reactivation equation.
        p = participant
        latent_relation[p] = math.tanh(
            0.63 * latent_relation[p]
            + 0.72 * valence
            + 0.18 * cue[0] * cue[1]
            - 0.10 * cue[2]
        )
        neighbor = (p + 1) % n_participants
        latent_relation[neighbor] = math.tanh(
            latent_relation[neighbor] + 0.07 * valence
        )

    base = 0.75 * current[0] - 0.55 * current[1] + 0.35 * current[2]
    participation_term = (
        0.70 * (participation[0] - participation[1])
        + 0.25 * participation[2]
    )

    if regime == "null_current_only":
        latent_score = base
    elif regime == "markov_participation":
        latent_score = base + 0.75 * participation_term
    elif regime == "history_additive":
        latent_score = (
            base
            + 0.75 * participation_term
            + 0.55 * sum(latent_relation)
        )
    elif regime == "history_participation_interaction":
        interaction = sum(
            latent_relation[p] * (participation[p] - 0.45)
            for p in range(n_participants)
        )
        cross_relation = 0.18 * latent_relation[0] * latent_relation[1]
        latent_score = (
            base
            + 0.45 * participation_term
            + 1.80 * interaction
            + cross_relation
        )
    else:
        raise ValueError(f"unknown regime: {regime}")

    p_true = sigmoid(latent_score)
    outcome = 1 if rng.random() < p_true else 0

    return {
        "current": current,
        "participation": participation,
        "events": events,
        "outcome": outcome,
        "p_true": p_true,
    }


def unordered_similarity_summary(sample: Dict) -> List[float]:
    current = sample["current"]
    sums = [0.0] * 3
    counts = [0] * 3
    for participant, cue, valence in sample["events"]:
        similarity = (cosine(cue, current) + 1.0) / 2.0
        sums[participant] += valence * similarity
        counts[participant] += 1
    return [
        sums[i] / counts[i] if counts[i] else 0.0
        for i in range(3)
    ]


def relation_summary(sample: Dict) -> List[float]:
    """Order-sensitive summary intentionally different from the hidden DGP."""
    current = sample["current"]
    h = [0.0] * 3
    for participant, cue, valence in sample["events"]:
        similarity = (cosine(cue, current) + 1.0) / 2.0
        h[participant] = (
            0.78 * h[participant]
            + valence * (0.55 + 0.45 * similarity)
        )
    return h


def recent_features(sample: Dict) -> List[float]:
    participant, cue, valence = sample["events"][-1]
    similarity = (cosine(cue, sample["current"]) + 1.0) / 2.0
    return [
        float(valence),
        similarity,
        *[1.0 if participant == j else 0.0 for j in range(3)],
    ]


def feature_vector(sample: Dict, model: str) -> List[float]:
    current = list(sample["current"])
    participation = list(sample["participation"])
    unordered = unordered_similarity_summary(sample)
    relation = relation_summary(sample)
    recent = recent_features(sample)

    if model == "current_only":
        return current
    if model == "similarity_memory":
        return current + unordered
    if model == "participation_no_history":
        return current + participation + recent
    if model == "relation_additive":
        return current + participation + recent + relation
    if model == "relation_interaction":
        interactions = [
            relation[i] * participation[i] for i in range(3)
        ]
        return current + participation + recent + relation + interactions
    raise ValueError(f"unknown model: {model}")


def fit_scaler(x_rows: Sequence[Sequence[float]]):
    d = len(x_rows[0])
    means, stds = [], []
    for j in range(d):
        values = [row[j] for row in x_rows]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance)
        means.append(mean)
        stds.append(std if std > 1e-8 else 1.0)
    return means, stds


def transform(
    x_rows: Sequence[Sequence[float]],
    means: Sequence[float],
    stds: Sequence[float],
) -> List[List[float]]:
    return [
        [(row[j] - means[j]) / stds[j] for j in range(len(row))]
        for row in x_rows
    ]


def fit_logistic(
    x_rows: Sequence[Sequence[float]],
    labels: Sequence[int],
    l2: float = 0.02,
    epochs: int = 180,
    learning_rate: float = 0.08,
) -> List[float]:
    n = len(x_rows)
    d = len(x_rows[0])
    weights = [0.0] * (d + 1)

    for epoch in range(epochs):
        grad = [0.0] * (d + 1)
        for row, label in zip(x_rows, labels):
            z = weights[0] + sum(
                weights[j + 1] * row[j] for j in range(d)
            )
            p = sigmoid(z)
            err = p - label
            grad[0] += err
            for j in range(d):
                grad[j + 1] += err * row[j]

        grad[0] /= n
        for j in range(d):
            grad[j + 1] = grad[j + 1] / n + l2 * weights[j + 1]

        step = learning_rate / (1.0 + 0.01 * epoch)
        for j in range(d + 1):
            weights[j] -= step * grad[j]

    return weights


def predict(weights: Sequence[float], row: Sequence[float]) -> float:
    return sigmoid(
        weights[0]
        + sum(weights[j + 1] * row[j] for j in range(len(row)))
    )


def log_loss(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    eps = 1e-12
    total = 0.0
    for y, p in zip(labels, probabilities):
        p = max(eps, min(1.0 - eps, p))
        total += -(y * math.log(p) + (1 - y) * math.log(1.0 - p))
    return total / len(labels)


def brier_score(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    return sum(
        (y - p) ** 2 for y, p in zip(labels, probabilities)
    ) / len(labels)


def shuffled_test_copy(sample: Dict, rng: random.Random) -> Dict:
    events = list(sample["events"])
    rng.shuffle(events)
    return {
        "current": list(sample["current"]),
        "participation": list(sample["participation"]),
        "events": events,
        "outcome": sample["outcome"],
        "p_true": sample["p_true"],
    }


def evaluate_model(
    train: Sequence[Dict],
    test: Sequence[Dict],
    model: str,
    shuffle_rng: random.Random,
) -> Dict[str, float]:
    x_train_raw = [feature_vector(s, model) for s in train]
    x_test_raw = [feature_vector(s, model) for s in test]
    means, stds = fit_scaler(x_train_raw)
    x_train = transform(x_train_raw, means, stds)
    x_test = transform(x_test_raw, means, stds)

    y_train = [s["outcome"] for s in train]
    y_test = [s["outcome"] for s in test]

    weights = fit_logistic(x_train, y_train)
    probs = [predict(weights, row) for row in x_test]

    shuffled_test = [shuffled_test_copy(s, shuffle_rng) for s in test]
    x_shuffle_raw = [feature_vector(s, model) for s in shuffled_test]
    x_shuffle = transform(x_shuffle_raw, means, stds)
    probs_shuffle = [predict(weights, row) for row in x_shuffle]

    return {
        "log_loss": log_loss(y_test, probs),
        "brier": brier_score(y_test, probs),
        "shuffled_log_loss": log_loss(y_test, probs_shuffle),
    }


def summarize(values: Sequence[float]) -> Dict[str, float]:
    return {
        "mean": statistics.mean(values),
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "stdev": statistics.stdev(values) if len(values) > 1 else 0.0,
    }


def run(seed: int, reps: int, n_train: int, n_test: int) -> Dict:
    raw: Dict[str, Dict[str, List[Dict[str, float]]]] = {
        regime: {model: [] for model in MODELS}
        for regime in REGIMES
    }

    for regime in REGIMES:
        for rep in range(reps):
            rep_seed = seed + REGIME_OFFSETS[regime] * 10000 + rep * 101
            rng = random.Random(rep_seed)
            train = [generate_sample(rng, regime) for _ in range(n_train)]
            test = [generate_sample(rng, regime) for _ in range(n_test)]

            for model_index, model in enumerate(MODELS):
                shuffle_rng = random.Random(
                    rep_seed + 700001 + model_index * 997
                )
                raw[regime][model].append(
                    evaluate_model(train, test, model, shuffle_rng)
                )

    summary: Dict = {}
    for regime in REGIMES:
        summary[regime] = {}
        for model in MODELS:
            rows = raw[regime][model]
            summary[regime][model] = {
                "log_loss": summarize([r["log_loss"] for r in rows]),
                "brier": summarize([r["brier"] for r in rows]),
                "shuffle_delta_log_loss": summarize([
                    r["shuffled_log_loss"] - r["log_loss"] for r in rows
                ]),
            }

    def mean_ll(regime: str, model: str) -> float:
        return summary[regime][model]["log_loss"]["mean"]

    null_gain = (
        mean_ll("null_current_only", "current_only")
        - mean_ll("null_current_only", "relation_interaction")
    )
    markov_gain = (
        mean_ll("markov_participation", "participation_no_history")
        - mean_ll("markov_participation", "relation_interaction")
    )
    additive_gain = (
        mean_ll("history_additive", "relation_additive")
        - mean_ll("history_additive", "relation_interaction")
    )
    interaction_gains = []
    for rep in range(reps):
        add_ll = raw["history_participation_interaction"]["relation_additive"][rep]["log_loss"]
        int_ll = raw["history_participation_interaction"]["relation_interaction"][rep]["log_loss"]
        interaction_gains.append(add_ll - int_ll)

    interaction_gain_mean = statistics.mean(interaction_gains)
    interaction_gain_rate = sum(v > 0.0 for v in interaction_gains) / reps

    interaction_shuffle_delta = summary[
        "history_participation_interaction"
    ]["relation_interaction"]["shuffle_delta_log_loss"]["mean"]
    null_shuffle_delta = summary[
        "null_current_only"
    ]["relation_interaction"]["shuffle_delta_log_loss"]["mean"]

    checks = {
        "negative_null_no_spurious_history_gain": null_gain < 0.003,
        "negative_markov_no_spurious_history_gain": markov_gain < 0.003,
        "negative_additive_no_spurious_interaction_gain": additive_gain < 0.003,
        "positive_interaction_mean_gain": interaction_gain_mean >= 0.004,
        "positive_interaction_replication_rate": interaction_gain_rate >= 0.65,
        "positive_order_shuffle_hurts_interaction_regime":
            interaction_shuffle_delta >= 0.003,
        "negative_order_shuffle_small_in_null":
            null_shuffle_delta < 0.003,
    }

    if all(checks.values()):
        verdict = "STRUCTURE_SUPPORTED_SYNTHETIC"
    else:
        positive = (
            checks["positive_interaction_mean_gain"]
            and checks["positive_interaction_replication_rate"]
            and checks["positive_order_shuffle_hurts_interaction_regime"]
        )
        negative = (
            checks["negative_null_no_spurious_history_gain"]
            and checks["negative_markov_no_spurious_history_gain"]
            and checks["negative_additive_no_spurious_interaction_gain"]
            and checks["negative_order_shuffle_small_in_null"]
        )
        verdict = "PARTIAL" if (positive or negative) else "NOT_SUPPORTED"

    return {
        "experiment": "P1-2 neutral synthetic falsification benchmark",
        "evidence_grade": "synthetic_independent_falsification",
        "empirical_validation": False,
        "seed": seed,
        "repetitions": reps,
        "train_per_rep": n_train,
        "test_per_rep": n_test,
        "verdict": verdict,
        "preregistered_checks": checks,
        "primary_contrasts": {
            "null_relation_interaction_gain_vs_current": null_gain,
            "markov_relation_interaction_gain_vs_participation": markov_gain,
            "additive_interaction_gain_vs_relation_additive": additive_gain,
            "interaction_gain_vs_relation_additive": interaction_gain_mean,
            "interaction_gain_positive_rep_rate": interaction_gain_rate,
            "interaction_regime_shuffle_delta": interaction_shuffle_delta,
            "null_regime_shuffle_delta": null_shuffle_delta,
        },
        "summary": summary,
        "raw_repetitions": raw,
        "interpretation_limit": (
            "A successful result supports only the synthetic structural necessity "
            "of order-sensitive relation history x current participation in the "
            "positive-control regime. It does not establish real-world validity "
            "or OASIS-specific superiority."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--reps", type=int, default=DEFAULT_REPS)
    parser.add_argument("--train", type=int, default=DEFAULT_TRAIN)
    parser.add_argument("--test", type=int, default=DEFAULT_TEST)
    parser.add_argument(
        "--output",
        default="verification/results/p1_2_neutral_latest.json",
    )
    args = parser.parse_args()

    result = run(args.seed, args.reps, args.train, args.test)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps({
        "verdict": result["verdict"],
        "preregistered_checks": result["preregistered_checks"],
        "primary_contrasts": result["primary_contrasts"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
