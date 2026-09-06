# O3 danger–structural-state matched long-horizon validation — 2026-09-07

## Scope
This document does not treat `S.danger` as the OASIS responsibility axis. The question is narrower:

> After completed-process O3 is fixed, does current danger still distinguish moments when latent relations change the actual choice after conditioning on the current structural flow state?

Production reality and canonical experiments were not modified. All matching, path cuts and circular shifts were offline/same-current shadow analyses.

## Prior-art / necessity check
Matching, conditional permutation and balance diagnostics are standard tools for reducing measured confounding in observational comparisons. Recent methodological work also recommends sensitivity analyses across plausible matching strategies rather than selecting one favorable specification. Therefore matching itself is not an OASIS novelty claim. It is used only to test whether the earlier danger association was a structural proxy artifact.

## Canonical guard
Before each run the compatibility guard confirmed:
- order-insensitive production `pairKey`
- last-18 relation recombination window
- last-80 episode window
- 1200-tick age window
- canonical browser-world 40×100 design
- Full vs NoRelation primary contrast
- 520-tick open-possibility stage
- synthetic O1 isolation

## Preceding path deconfounding result
At 30k, phase-shifting danger only inside O3 latent retrieval did not change the observed O3 choice-difference labels or AUC. Phase-shifting danger inside participant/ranking evaluation did change them. However, 127 decision-path circular shifts showed canonical AUC 0.65008 was not exceptional relative to that path-randomized distribution: 37/127 controls were >= canonical, empirical p=0.296875. Thus direct insertion of the current danger value into the decision formula alone did not explain the association, and danger was not established as an independent responsibility variable.

## Matched-state design
For every completed-process O3 actual-choice-difference event, one non-difference decision from the same party was selected without using danger.

Matching hierarchy:
1. same current place + same current target
2. same current place
3. same current target
4. same party only

In both 30k and 120k all positive events were matched at tier 0: same party, same current place and same current target.

Core structural covariates:
- visit history
- discovered/routes/seen counts
- relation-history size
- current episode count
- latent-process count
- O3 eligible-process count
- active-key count
- hidden candidate count
- decision index and decision gap
- tick
- recent place composition

Full matching additionally used:
- recent NPC relational composition
- active relation-key Jaccard distance

After pairs were frozen, current danger differences were compared against 127 within-party circular shifts of the observed danger-at-decision sequence.

## Instrumentation correction
The first 30k matched run recorded 442 decisions instead of the canonical 463 because 21 early decisions before latent storage existed were omitted. Choice-difference=28 and decision-difference=33 were already correct. The instrumentation was corrected only to record those early decisions as `choiceDiff=false`, matching the established signal-discovery convention. No matching rule, threshold or hypothesis was changed.

## 30k result
Canonical replication:
- records: 463
- completed-process O3 choice differences: 28
- decision-signature differences: 33
- actions: 463
- relation events: 249
- recombinations: 2,565

### Core matching
- pairs: 28/28
- same place+target: 28/28
- mean danger difference: +0.174608
- median danger difference: +0.195138
- positive event had higher danger: 60.71%
- circular-shift null median: +0.008049
- null p95: +0.119745
- null max: +0.182485
- exceed: 1/127
- empirical p: 0.015625

### Full relational matching
- pairs: 28/28
- same place+target: 28/28
- mean danger difference: +0.101905
- median danger difference: +0.105648
- positive event had higher danger: 60.71%
- circular-shift null median: +0.008509
- null p95: +0.125799
- null max: +0.220104
- exceed: 15/127
- empirical p: 0.125

Interpretation at 30k: once current relational composition was also matched, danger was not distinguished from the circular-shift null. This was treated as evidence against prematurely identifying danger with responsibility.

## 120k long-horizon replication
Canonical long-horizon records:
- records/actions: 1,997
- completed-process O3 actual-choice differences: 164
- decision-signature differences: 197
- relation events: 960
- recombinations: 10,045

### Core matching
- pairs: 164/164
- same place+target: 164/164
- mean danger difference: +0.186144
- median danger difference: +0.235680
- positive event had higher danger: 67.07%
- null median: +0.004333
- null p95: +0.059259
- null max: +0.086062
- exceed: 0/127
- empirical p: 0.0078125

### Full relational matching
- pairs: 164/164
- same place+target: 164/164
- mean danger difference: +0.099069
- median danger difference: +0.105648
- positive event had higher danger: 59.76%
- null median: +0.007214
- null p95: +0.050216
- null max: +0.089565
- exceed: 0/127
- empirical p: 0.0078125

Interpretation: the 30k disappearance under Full matching did not persist at 120k. A positive residual danger association reappeared under the same matching specification. This horizon-dependent reversal is itself a result and must not be hidden by selecting only 30k or only 120k.

## 120k matching-sensitivity analysis
Because the long-horizon result could depend on one arbitrary distance definition, the same 1,997 records and 164 positive events were re-matched under five predeclared specifications. Every pair was still required to have the same party + same current place + same current target. Danger was never used for matching.

Balance diagnostics used SMD (standardized mean difference) across expanded structural covariates plus active-key Jaccard distance.

| Specification | mean danger diff | empirical p | max |SMD| | median |SMD| | SMD>0.1 |
|---|---:|---:|---:|---:|---:|
| range-normalized L1, no replacement | +0.082733 | 0.03125 | 0.34455 | 0.01370 | 2 |
| standardized Euclidean (zL2), no replacement | +0.072134 | 0.0546875 | 0.19712 | 0.02705 | 1 |
| empirical-rank L1, no replacement | +0.087320 | 0.0234375 | 0.21603 | 0.02109 | 2 |
| range-L1 with replacement | +0.081721 | 0.046875 | 0.26321 | 0.00839 | 1 |
| range-L1 global greedy 1:1 | +0.082373 | 0.0234375 | 0.27261 | 0.01269 | 2 |

All five specifications preserved the positive direction. Four of five produced empirical p<0.05. The best balance by maximum SMD was standardized Euclidean (`max |SMD|=0.1971`), but its empirical p was 0.0546875. Therefore the association is directionally robust but not robust enough to claim an independent responsibility variable.

## Current evidence judgment
Supported:
1. Under completed-process O3, actual-choice-difference events occur at higher current danger on average over 120k.
2. The long-horizon direction persists across several reasonable matching distance/algorithm choices.
3. The effect is not explained solely by danger-conditioned latent retrieval.
4. The effect is not explained solely by the trivial fact that current danger appears in the participant/ranking formula.
5. Horizon matters: Full relational matching was non-significant at 30k but significant at 120k.

Not established:
1. `S.danger` is the OASIS responsibility axis.
2. Danger causally increases the influence of latent relational processes.
3. The measured structural covariates are fully balanced; even the best sensitivity specification still had max |SMD|≈0.197.
4. Unmeasured current-flow structure has been eliminated.
5. A fixed danger threshold or fixed lag should control O3.

## OASIS interpretation
The current evidence fits a weaker and more relational statement than `danger = responsibility`:

> O3 choice contribution is concentrated in portions of the long-run current flow that also tend to carry higher danger, but current danger is not yet separable from the full relational/temporal state strongly enough to promote it to a responsibility operator.

The 30k→120k reversal is especially important. It indicates that the phenomenon should not be treated as a fixed coordinate effect. What matters is how relation history, latent processes, current participation and environment risk co-evolve across the trajectory.

## Next required validation
Before implementing a responsibility operator, improve matched-state balance without tuning on the danger outcome. The next experiment should use a predeclared balance-oriented design (e.g. optimal/caliper or fine-balance matching) and require acceptable structural balance diagnostics before testing residual danger. If the residual association survives a genuinely balanced long-horizon design, it can be promoted from `flow-state proxy candidate` to a stronger responsibility-state candidate. If it vanishes, the correct conclusion is that danger was mainly a marker of relational-flow state.

## Runs and artifacts
- 30k corrected matched run: `34066608839`; artifact `9999137493`; SHA-256 `127bcffa700a47920d4fda7710c8255f5c7a7dd64312f29947e412c2da405d2b`
- 120k matched run: `34066674253`; artifact `9999178731`; SHA-256 `ae19b9ac65480a66d2fc5a0a68a6ea9156f4d9dba47d7b831aca0fd8ffa3141d`
- 120k matching-sensitivity run: `34066939705`; artifact `9999253875`; SHA-256 `a05fdd04067d6981bbc38fefd232b0da55a214356eb4aed2a094f906145c9cd7`
