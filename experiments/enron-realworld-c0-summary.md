# Enron Real-World C0 Validation — 2026-09-05

## Status
C0 external real-world validation. This is not proof of OASIS and is not a universal-superiority claim.

## Dataset
Public Enron temporal higher-order email network. The run downloaded the source event files directly at execution time and used only past events to construct features.

- Raw timestamped events: 10,885
- Eligible chronological prediction events after warm-up/history availability: 9,868
- Candidate samples per seed: 39,472
- Negative-sampling seeds: 7, 19, 43

## Question
Does an OASIS-like whole-flow representation add out-of-sample information about the next real Enron email hyperedge beyond local, pairwise, and temporal-hypergraph history?

## Controls
- No relationship-decay rule was imposed.
- No rule saying higher-order possibilities open under a chosen condition was imposed.
- No temporal-density-to-outcome rule was imposed.
- All features used only events strictly before the predicted event.
- Chronological split: 60% train / 20% validation / 20% test.
- Same learner for all representations: StandardScaler + L2 logistic regression.
- Each real event was ranked against 3 same-size candidates formed by replacing one node with a node already known before that event.

## Aggregate test results across three negative-sampling seeds

| Representation | Top-1 | MRR | Average Precision | ROC-AUC | Log loss |
|---|---:|---:|---:|---:|---:|
| Local | 0.715805 | 0.839032 | 0.708103 | 0.860205 | 0.386950 |
| Pairwise | 0.937859 | 0.965229 | 0.924476 | 0.970596 | 0.180363 |
| Temporal Hypergraph | **0.940392** | **0.966509** | 0.943921 | 0.975183 | 0.163597 |
| OASISFlow | 0.937859 | 0.965327 | **0.945841** | **0.976605** | **0.159765** |

## Paired top-1 comparison: OASISFlow minus Temporal Hypergraph

- Seed 7: OASIS 0.9433 vs Hypergraph 0.9428; bootstrap 95% CI [-0.00507, +0.00557]
- Seed 19: OASIS 0.9382 vs Hypergraph 0.9392; bootstrap 95% CI [-0.00507, +0.00304]
- Seed 43: OASIS 0.9321 vs Hypergraph 0.9392; bootstrap 95% CI [-0.01166, -0.00253]

The OASIS representation therefore did **not** establish an improvement in discrete next-event top-1 selection. In one seed it was significantly worse under the paired bootstrap interval.

At the same time, OASISFlow produced slightly better probability-quality metrics on average than Temporal Hypergraph:

- Average precision: +0.001920
- ROC-AUC: +0.001422
- Log loss: lower by 0.003832

These differences are small and cannot yet be attributed specifically to an OASIS mechanism; the larger feature set itself is a competing explanation.

## Current interpretation

1. Real relational history is strongly informative: Pairwise and Temporal Hypergraph representations greatly outperform Local.
2. A strong higher-order temporal representation already explains most of this prediction task.
3. OASIS-like current-flow features may contain a small amount of additional probabilistic information, but they did not improve the primary top-1 realized-event decision metric in this C0 test.
4. The task is near saturation for Pairwise/Hypergraph (about 94% top-1) because negatives differ from the true event by only one node. This creates a ceiling and is a plausible reason why extra whole-flow information has little room to improve top-1 performance.
5. The next real-world test should therefore use harder, naturally plausible competing futures rather than easy random corruptions, and should retain Temporal Hypergraph as a strong baseline.

## Verdict

- OASIS universal superiority: REJECTED / not supported.
- Pairwise relational importance: SUPPORTED in this dataset.
- Higher-order temporal history beyond local state: SUPPORTED in this dataset.
- OASIS whole-flow incremental value beyond strong Temporal Hypergraph: **UNRESOLVED**. Small probabilistic gains coexist with no top-1 gain.
- This experiment is retained as C0 real-world evidence and as a boundary condition for the next C-grade design.
