#!/usr/bin/env python3
"""
OASIS P1 synthetic structural falsification test.

Purpose
-------
Test whether an implementation satisfying the proposed P1 structure exhibits:
1) relation-history sensitivity with the same completed experiences and current context,
2) participation-state sensitivity,
3) history x participation interaction: past relation history changes the effect of
   current participation, rather than participation being a fixed standalone weight.

This is a specification/structural falsification test, NOT empirical validation of OASIS.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import statistics
from pathlib import Path
from typing import Dict, List, Sequence

SEED_DEFAULT = 20260905
TRIALS_DEFAULT = 1000
EPS = 1e-12

OPTION_VECS = (
    (0.9, 0.2, -0.4, 0.3),
    (-0.5, 0.8, 0.6, -0.1),
    (0.1, -0.7, 0.9, 0.4),
    (-0.3, -0.2, -0.5, 0.9),
)

MODELS = ("oasis", "fixed", "similarity", "no_history")


def dot(a: Sequence[float], b: Sequence[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def norm(a: Sequence[float]) -> float:
    return math.sqrt(sum(x * x for x in a))


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    na, nb = norm(a), norm(b)
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot(a, b) / (na * nb)))


def logistic(z: float) -> float:
    z = max(-50.0, min(50.0, z))
    return 1.0 / (1.0 + math.exp(-z))


def softmax(values: Sequence[float]) -> List[float]:
    m = max(values)
    exps = [math.exp(v - m) for v in values]
    total = sum(exps)
    return [v / total for v in exps]


def js_divergence(p: Sequence[float], q: Sequence[float]) -> float:
    """Jensen-Shannon divergence in bits, bounded in [0, 1]."""
    mid = [(a + b) / 2.0 for a, b in zip(p, q)]

    def kl(a: Sequence[float], b: Sequence[float]) -> float:
        return sum(
            x * math.log(x / y, 2)
            for x, y in zip(a, b)
            if x > 0.0 and y > 0.0
        )

    return 0.5 * kl(p, mid) + 0.5 * kl(q, mid)


def generate_trial(rng: random.Random, n_exp: int = 16, n_part: int = 4):
    """
    Generate paired worlds with:
      - identical completed experience set E
      - identical current context X
      - identical currently available participants
      - different relation history R for relation test
      - different participation state P for participation test
    """
    context = [rng.uniform(-1.0, 1.0) for _ in range(4)]

    experiences = []
    for _ in range(n_exp):
        experiences.append(
            {
                "sig": [rng.uniform(-1.0, 1.0) for _ in range(4)],
                "participant": rng.randrange(n_part),
                "outcome": rng.uniform(-1.0, 1.0),
            }
        )

    relation_a = [
        [rng.uniform(-1.0, 1.0) for _ in range(4)]
        for _ in range(n_part)
    ]

    relation_b = [
        [(-v if (dim + p) % 2 == 0 else v) for dim, v in enumerate(vec)]
        for p, vec in enumerate(relation_a)
    ]

    participation_a = [rng.uniform(0.35, 1.0) for _ in range(n_part)]

    participation_b = [
        max(0.05, min(1.0, (1.0 - x) * 0.85 + 0.10))
        for x in participation_a
    ]

    return (
        context,
        experiences,
        relation_a,
        relation_b,
        participation_a,
        participation_b,
    )


def aggregate_state(
    context: Sequence[float],
    experiences,
    relation_history,
    participation,
    mode: str,
) -> List[float]:
    agg = [0.0] * 4
    weight_sum = 0.0

    for exp in experiences:
        similarity = (cosine(exp["sig"], context) + 1.0) / 2.0
        participant = exp["participant"]

        if mode == "oasis":
            history = (cosine(exp["sig"], relation_history[participant]) + 1.0) / 2.0
            current_participation = participation[participant]
            interaction = similarity * history * current_participation
            rho = logistic(
                2.2 * similarity
                + 1.8 * history
                + 1.4 * current_participation
                + 2.2 * interaction
                - 3.6
            )
        elif mode == "fixed":
            rho = 0.5
        elif mode == "similarity":
            rho = similarity
        elif mode == "no_history":
            rho = similarity * participation[participant]
        else:
            raise ValueError(f"unknown mode: {mode}")

        outcome_factor = max(0.05, 0.65 + 0.35 * exp["outcome"])
        w = rho * outcome_factor

        for k in range(4):
            agg[k] += w * exp["sig"][k]
        weight_sum += abs(w)

    if weight_sum:
        agg = [x / weight_sum for x in agg]

    if mode in ("oasis", "no_history"):
        participation_summary = (sum(participation) / len(participation) - 0.5) * 0.5
        agg = [
            math.tanh(x + participation_summary * (1.0 if k % 2 == 0 else -1.0))
            for k, x in enumerate(agg)
        ]
    else:
        agg = [math.tanh(x) for x in agg]

    return agg


def possibility_distribution(
    context,
    experiences,
    relation_history,
    participation,
    mode: str,
) -> List[float]:
    state = aggregate_state(
        context, experiences, relation_history, participation, mode
    )

    scores = []
    for option_vec in OPTION_VECS:
        current_term = dot(option_vec, context)
        relational_term = dot(option_vec, state)
        nonlinear_term = 0.45 * current_term * relational_term
        scores.append(0.9 * current_term + 1.5 * relational_term + nonlinear_term)

    return softmax(scores)


def summarize(values: Sequence[float]) -> Dict[str, float]:
    ordered = sorted(values)
    n = len(ordered)

    def quantile(q: float) -> float:
        if n == 1:
            return ordered[0]
        pos = q * (n - 1)
        lo = int(math.floor(pos))
        hi = int(math.ceil(pos))
        if lo == hi:
            return ordered[lo]
        frac = pos - lo
        return ordered[lo] * (1.0 - frac) + ordered[hi] * frac

    return {
        "mean": statistics.mean(values),
        "median": statistics.median(values),
        "q05": quantile(0.05),
        "q95": quantile(0.95),
        "max": max(values),
        "nonzero_rate": sum(v > EPS for v in values) / len(values),
    }


def run(trials: int, seed: int):
    rng = random.Random(seed)

    relation_effect = {m: [] for m in MODELS}
    participation_effect = {m: [] for m in MODELS}
    interaction_effect = {m: [] for m in MODELS}

    for _ in range(trials):
        (
            context,
            experiences,
            relation_a,
            relation_b,
            participation_a,
            participation_b,
        ) = generate_trial(rng)

        for mode in MODELS:
            dist_ra_pa = possibility_distribution(
                context, experiences, relation_a, participation_a, mode
            )
            dist_rb_pa = possibility_distribution(
                context, experiences, relation_b, participation_a, mode
            )
            dist_ra_pb = possibility_distribution(
                context, experiences, relation_a, participation_b, mode
            )
            dist_rb_pb = possibility_distribution(
                context, experiences, relation_b, participation_b, mode
            )

            relation_effect[mode].append(
                js_divergence(dist_ra_pa, dist_rb_pa)
            )

            effect_under_ra = js_divergence(dist_ra_pa, dist_ra_pb)
            effect_under_rb = js_divergence(dist_rb_pa, dist_rb_pb)
            participation_effect[mode].append(effect_under_ra)

            interaction_effect[mode].append(
                abs(effect_under_ra - effect_under_rb)
            )

    metrics = {
        "relation_history_sensitivity": {
            m: summarize(relation_effect[m]) for m in MODELS
        },
        "participation_sensitivity": {
            m: summarize(participation_effect[m]) for m in MODELS
        },
        "history_x_participation_interaction": {
            m: summarize(interaction_effect[m]) for m in MODELS
        },
    }

    checks = {
        "oasis_relation_history_effect_nonzero":
            metrics["relation_history_sensitivity"]["oasis"]["nonzero_rate"] > 0.95,
        "history_ablations_remove_relation_effect":
            all(
                metrics["relation_history_sensitivity"][m]["nonzero_rate"] == 0.0
                for m in ("fixed", "similarity", "no_history")
            ),
        "oasis_participation_effect_nonzero":
            metrics["participation_sensitivity"]["oasis"]["nonzero_rate"] > 0.95,
        "past_history_modulates_participation_effect":
            metrics["history_x_participation_interaction"]["oasis"]["nonzero_rate"] > 0.95,
        "no_history_ablation_removes_interaction":
            metrics["history_x_participation_interaction"]["no_history"]["nonzero_rate"] == 0.0,
    }

    verdict = "PASS" if all(checks.values()) else "FAIL"

    return {
        "experiment": "P1 synthetic structural falsification",
        "scope": (
            "Specification/structural consistency only. "
            "This does not constitute empirical validation of OASIS."
        ),
        "seed": seed,
        "trials": trials,
        "verdict": verdict,
        "checks": checks,
        "metrics": metrics,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=TRIALS_DEFAULT)
    parser.add_argument("--seed", type=int, default=SEED_DEFAULT)
    parser.add_argument(
        "--output",
        default="verification/results/p1_latest.json",
        help="JSON result path",
    )
    args = parser.parse_args()

    result = run(args.trials, args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))
    return 0 if result["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
