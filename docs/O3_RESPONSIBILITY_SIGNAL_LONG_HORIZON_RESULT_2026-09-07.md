# O3 Responsibility-Signal Long-Horizon Validation — 2026-09-07

## Scope

This is an auxiliary validation. It does not modify the production reality engine or canonical production relation-field conditions.

Canonical guard remained unchanged:
- pairKey remains order-insensitive at key level
- relation recombination uses last 18 relations
- production episode window remains 80
- production reactivation age remains 1200 ticks
- canonical browser-world and open-possibility experiments remain separated

O3 in this validation is fixed as the completed-process reactivation gate. The tested current-flow signals do not gate reactivation and do not change the actual world trajectory.

The test asks only whether already-existing current-flow signals are associated with moments when completed-process O3 changes the counterfactual choice.

## Prior-art / necessity boundary

Long-horizon agent research already studies trajectory-level uncertainty, temporal memory adaptation, selective retrieval, and uncertainty-driven compute allocation. Therefore neither uncertainty-aware allocation nor adaptive retrieval is treated as OASIS novelty here.

The OASIS-specific implementation question is narrower: after O3 is held fixed, does any signal already present in the current production flow consistently distinguish the moments when reactivated relation-processes actually alter the choice?

## Predeclared signals

Three existing signals only:

1. danger — current S.danger level
2. dangerDelta — change in S.danger since the same party's previous decision
3. uncertainty — negative top-two vote margin under completed-process O3; larger means less vote separation

Primary statistic: AUC for discriminating O3 choice-difference events.
Null: 127 per-party circular shifts of the choice-difference label sequence.
Multiple-comparison correction: Bonferroni ×3, fixed before the run.

No threshold or new responsibility formula was introduced.

## 30k result

Records: 463
O3 choice differences: 28
O3 decision-signature differences: 33

### danger
- AUC: 0.6500821018062397
- mean at choice-difference events: 0.7021511901193298
- mean at non-choice-difference events: 0.5348662952917297
- null median: 0.48563218390804597
- null p95: 0.58752052545156
- null max: 0.787192118226601
- nulls >= observed: 1 / 127
- empirical p: 0.015625
- Bonferroni ×3 p: 0.046875
- survives 3-signal correction: yes

### dangerDelta
- AUC: 0.40402298850574714
- empirical p: 0.9765625
- corrected p: 1
- survives: no

### uncertainty
- AUC: 0.4942528735632184
- empirical p: 0.4921875
- corrected p: 1
- survives: no

The 30k danger result was treated only as a candidate because there were only 28 positive choice-difference events.

## 120k long-horizon replication

Run: 34062136533
Artifact ID: 9997840076
Artifact SHA-256: 2b66ca0069813385d7d396a16a218387c176c3361e11a655dd23cd57262ca696

Records: 1997
O3 choice differences: 164
O3 decision-signature differences: 197
Unique circular-shift offset tuples: 127

### danger
- AUC: 0.6536399079211741
- mean at O3 choice-difference events: 0.7169731080633385
- mean at non-choice-difference events: 0.5536586109326215
- null median: 0.4840192673612497
- null p95: 0.5321377722778865
- null max: 0.5559625031602198
- nulls >= observed: 0 / 127
- empirical p: 0.0078125
- Bonferroni ×3 p: 0.0234375
- survives 3-signal correction: yes

### dangerDelta
- AUC: 0.5104120926642982
- positive mean: 0.010716362726386259
- negative mean: -0.00010705583981775239
- null median: 0.5023219299296102
- null p95: 0.5351981956808112
- null max: 0.5567026599071228
- empirical p: 0.34375
- corrected p: 1
- survives: no

### uncertainty
- AUC: 0.40022021742312347
- positive mean: -3.7134146341463414
- negative mean: -3.1942171303873432
- null median: 0.4979541734860884
- null p95: 0.541482043298338
- null max: 0.5816451106409591
- empirical p: 1
- corrected p: 1
- survives: no

World counters at 120k:
- actions: 1997
- relation events: 960
- recombinations: 10045

## Separate falsification: danger rise as allocator

A different auxiliary test fixed completed-process O3 at every decision and used current danger-rise only as a post-reactivation deep-audit scheduler.

Run: 34061868120
Artifact ID: 9997728983

Results:
- O3 choice differences: 28
- danger-rise audit budget: 214 decisions
- captured O3 choice differences: 8
- 127 time-shift null median captured choices: 14
- null p95: 17
- null max: 18
- empirical p: 0.9921875

Therefore current danger-rise is rejected as a useful O3 verification-allocation proxy in this implementation.

## Current interpretation

Supported at implementation-association level:

- The absolute current danger level is consistently associated with moments when completed-process O3 changes the counterfactual choice, at both 30k and 120k horizons.
- The direction of recent danger change is not supported.
- Simple top-two vote-margin uncertainty is not supported.
- Current danger-rise timing is not supported as a post-O3 verification allocator.

Not supported / not claimed:

- danger level causes O3 choice effects
- danger level is itself the OASIS responsibility axis
- a fixed danger threshold should gate reactivation or verification
- the responsibility operator is already implemented as an independent production operator
- this single deterministic world establishes generality

## OASIS interpretation

The current evidence points away from a rule of the form:

"risk is rising -> reactivate more / verify more"

and toward a narrower observation:

"when the currently realized situation carries a higher risk state, reactivated relation-processes are more likely to be decision-relevant in this environment."

This distinction is important. It concerns the current relational situation rather than a fixed coordinate or a short-term derivative. It still does not define responsibility. A dedicated responsibility state must remain separate from raw danger if the OASIS responsibility axis is to be implemented and causally validated.

## Evidence grade

- Long-horizon replicated association in the actual browser-world implementation: supported.
- Responsibility-axis mechanism: not yet implemented independently / not proven.
- O3 causal mechanism from actual formed relation-processes: supported by separate same-current ablations, within prior stated limits.
- General theory / superiority / novelty: not established by this experiment.
