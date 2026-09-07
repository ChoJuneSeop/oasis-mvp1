# O3 Danger Balanced Matching Multiverse — 120k Result (2026-09-07)

## Purpose

Test whether the positive residual association between completed-process O3 choice contribution and current danger depends on one particular balanced control selection.

This is a matched-subsample/design-uncertainty falsification experiment. It is not a causal intervention and it does not establish that danger is the OASIS Responsibility Axis.

Prior matching-robustness work explicitly warns that equally admissible matching/subsample choices can yield different conclusions, so a single good match is not sufficient evidence of robustness.

## Fixed conditions

- Production reality engine: unchanged
- Horizon: 120,000 ticks
- Production trajectory reproduced: 1,997 decisions
- O3 actual choice-difference events: 164
- O3 decision-difference events: 197
- Matchable positive O3 events: 163
- O3 condition: completed-process O3 fixed
- Exact strata: same party + current place + current target + identical active relation-key set
- Structural balance: 650 nonconstant terms from base covariates, squares, and all two-way products
- Every frozen solution was re-evaluated using actual matched-sample max |SMD| <= 0.10
- Danger was not used in matching, swap proposals, acceptance, collection, balance, or diversity calculations.
- Danger was read only after the complete solution set had been frozen.

Canonical compatibility guard passed before execution.

## Design multiverse generation

A previously validated cardinality-balanced solution was used only as a starting point. Eight independent deterministic danger-blind random-walk chains used seeds:

17, 43, 101, 211, 307, 401, 503, 607

Each chain:

- remained inside exact strata;
- swapped controls only;
- retained the same 163 positive O3 events;
- accepted a swap only if actual max |SMD| remained <= 0.10;
- performed 3,080 accepted swaps;
- contributed 32 unique frozen control selections.

The run produced 257 unique solutions: one starting solution plus 256 alternatives. The script metadata said targetSolutions=256, so this is an off-by-one reporting issue only; the actual generatedUnique=257 is the authoritative run count. It did not affect eligibility, balance, or danger-blindness.

## Diversity diagnostics

- Unique controls used across the multiverse: 950
- Distance from baseline, median Jaccard distance: 0.7165
- Distance from baseline, maximum: 0.7698
- Pairwise Jaccard distance among all solutions:
  - minimum: 0.2751
  - median: 0.7413
  - maximum: 0.8231

Thus the multiverse was not a set of near-identical control selections.

## Balance diagnostics

Across all 257 solutions:

- maximum observed max |SMD|: 0.0999965
- median max |SMD|: 0.0986261
- solutions satisfying max |SMD| <= 0.05: 1

Therefore the main result applies to the predeclared <=0.10 balance class. It does not establish a multi-solution result at the stricter <=0.05 balance level.

## Danger residual distribution after all designs were frozen

The positive O3 group mean danger was 0.7192279.

Across all 257 admissible balanced solutions, the mean-danger residual (O3-positive minus matched controls) was:

- minimum: +0.0480211
- 5th percentile: +0.0522518
- 25th percentile: +0.0615013
- median: +0.0676384
- 75th percentile: +0.0765495
- 95th percentile: +0.0848289
- maximum: +0.0917898
- positive solutions: 257/257 = 100%
- zero or negative solutions: 0/257

Starting solution residual in this run: +0.0848127.

The immediately preceding single-solution iterative-cardinality run produced +0.0867320. The small difference between these two starting solutions is itself evidence that the optimizer can return different admissible control sets; both remained positive.

## Chain-level sign check

Every chain remained positive across all 32 collected solutions.

Approximate chain ranges:

- seed 17: +0.0511 to +0.0918
- seed 43: +0.0493 to +0.0820
- seed 101: +0.0480 to +0.0888
- seed 211: +0.0504 to +0.0894
- seed 307: +0.0490 to +0.0835
- seed 401: +0.0618 to +0.0869
- seed 503: +0.0497 to +0.0828
- seed 607: +0.0633 to +0.0884

## Balance/effect relationship

- Correlation between danger residual and max |SMD|: approximately -0.0009
- Correlation between danger residual and Jaccard distance from the starting solution: approximately -0.1254

The positive residual was therefore not concentrated only in solutions with worse balance, and it persisted across substantially different control selections.

## Interpretation

This experiment strongly weakens the explanation that the previously observed positive danger residual was an artifact of one arbitrary balanced matched subsample.

Within the explored <=0.10 balanced design multiverse, the sign was fully stable: all 257 danger-blind admissible solutions produced a positive residual.

However, this does not prove causality and does not prove a Responsibility Axis. Important remaining limitations are:

1. The 257 solutions were correlated random-walk draws from the feasible design space; they are not IID samples from all possible admissible matches.
2. PositiveFraction=100% is a robustness proportion, not a statistical p-value.
3. The multiverse does not prove that no valid balanced solution with zero or negative residual exists outside the explored region.
4. Only one solution achieved max |SMD| <= 0.05, so strong-balance multiverse robustness remains unresolved.
5. Unmeasured flow-state variables may still confound the danger association.

## Evidence grade after this experiment

Supported more strongly:

- The O3-choice/danger residual is not easily removed by changing the balanced control selection within a large, diverse <=0.10 structural-balance multiverse.
- Single-match design uncertainty is now a weaker alternative explanation than before this experiment.

Still not established:

- danger causally changes O3 contribution;
- danger is the OASIS Responsibility Axis;
- the residual survives every possible admissible balanced design;
- the result survives a comparable multiverse under <=0.05 maximum SMD.

## Next falsification target

The strongest next test is not another random multiverse. It is an adversarial robust-bound optimization over the admissible balance set:

- deliberately find the admissible balanced control selection that minimizes the danger residual;
- separately find the one that maximizes it;
- keep the same 163 O3 events, exact strata, and structural-balance constraints;
- report the feasible residual interval.

Unlike the present danger-blind multiverse, that adversarial test may use danger only as the final robustness objective after the admissible structural design set is defined. If the minimum feasible residual remains positive, match-selection uncertainty is much more strongly bounded. If a zero/negative admissible solution exists, the current 257/257 result is sampling-robust but not worst-case robust.

## Run metadata

- Workflow: OASIS O3 Danger Balanced Matching Multiverse 120k
- Run ID: 34074528082
- Job ID: 101597954298
- Artifact ID: 10001630743
- Artifact SHA-256: e66c4d0d85f841ec183a5edc7ad95644a5d1804bcca7e6b05154e28df7c9837c
- Experiment code commit: c1ba1cd8efd00c58df1b19eb42d832bc7c1e3e93
- Workflow commit: 1cb50adbb55ce14aa536c87c7682d3987ee6d9c5
