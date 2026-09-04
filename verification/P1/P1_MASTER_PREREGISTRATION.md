# OASIS P1 Master Preregistration

Date fixed: 2026-09-05 (Asia/Seoul)
Reference: OASIS 이론·수학 통합초안 v0.1

## 0. Neutrality rule
This document is fixed before the next round of external evidence review and empirical testing. Criteria must not be relaxed after seeing results. Adverse, null, and contradictory results are retained.

## 1. P1 reference claim
P1 defines the relationship-field (인연필드) as a dynamic relational field in which completed past experiences, current participation states, current reality conditions, and relation-process histories change their meaning/activation according to their relation with the present flow; the resulting possibility combinations may be non-independent and nonlinear, and their realizability is represented by a joint probability distribution.

For P1 validation, details of the probability distribution are not used as decisive evidence because those are tested mainly under P2. The empirical core of P1 is field formation: whether present relational context and participation can reactivate completed experiences differently and thereby alter the currently constructible possibility space.

## 2. Claims to test
### C1 Context-dependent reactivation
The same completed experience can have different current activation/meaning when present relational context differs.

### C2 History dependence beyond experience set
With the same completed-experience set and broadly matched current observable state, different relation-process histories can produce different current activation patterns or downstream possibility/decision structure.

### C3 Participation-state modulation
Current participation state affects which past completed experiences matter now, and may interact with relation history rather than acting only as a fixed standalone weight.

### C4 Possibility-space consequence
Changes in reactivation/participation/history should change a downstream measurable possibility/choice/outcome distribution, not merely an internal hidden variable with no observable consequence.

### C5 OASIS-specific incremental value
The history × participation structure should add reproducible out-of-sample information beyond simpler explanations when the data-generating process actually contains such dependence. It need not outperform in null or Markov environments.

## 3. Alternative explanations
A0 Current-state sufficiency / Markov explanation: current observable state alone explains outcomes; history adds no information.

A1 Similarity retrieval: apparent reactivation is explained only by similarity between current context and stored experience.

A2 Recency/frequency: recent or frequently repeated experiences dominate without a specifically relational mechanism.

A3 Fixed-weight explanation: stable trust/value weights on participants or experiences explain the effect without dynamic relation-dependent activation.

A4 Hidden-state confounding: history is only a proxy for an omitted current latent state; once current state is fully measured, the history effect disappears.

A5 Generic sequence-model explanation: ordinary HMM/RNN/Transformer/sequence features capture the same predictive structure; no additional empirical content is established by calling it an 인연필드.

A6 Overparameterization: a richer model wins only because it has greater capacity, not because the proposed relational variables are necessary.

## 4. Counterexamples that must be allowed
R1 Environments in which current state fully determines the next outcome; history should not help.

R2 Environments in which participant identity/state is irrelevant; changing participation should not systematically alter predictions.

R3 Experience histories with different order but identical sufficient statistics where the order is genuinely irrelevant; P1 must not invent an order effect.

R4 Cases where similarity or recency fully explains reactivation; OASIS-specific interaction is not required.

R5 Cases where a generic sequence model matches or exceeds OASIS-specific structure; this weakens OASIS specificity even if history dependence exists.

## 5. Pre-fixed Kill Criteria
### K1 Core empirical kill
The empirical core C1–C4 is rejected for the tested scope if, in at least two independent non-synthetic datasets/environments with adequate power and available sequential history, adding relation-history and participation information yields no reproducible out-of-sample incremental information over a current-state + similarity + recency baseline, AND history permutation produces no reproducible degradation.

Operational rule: paired bootstrap/permutation 95% CI for improvement must include 0 and the absolute relative improvement must be <0.5% in both independent datasets; history permutation degradation must also be <0.5% with CI including 0.

### K2 Spurious-history kill
If the OASIS history/participation mechanism shows a comparable or larger advantage in preregistered null/Markov negative-control environments where history is known to be irrelevant, the mechanism fails specificity. Comparable means within 50% of the positive-control effect size or greater.

### K3 OASIS-specificity kill
Even if history dependence exists, C5 is not supported if a capacity-matched generic sequence baseline explains the same effect with equal or better held-out performance and the OASIS-specific ablations do not produce a reproducible loss. This does not kill the general existence of history dependence; it kills the claim that the OASIS-specific relational formulation has distinct empirical value.

### K4 No-observable-consequence kill
If activation/history differences can be produced internally but do not alter any preregistered downstream prediction, option distribution, behavior, or outcome measure beyond noise, C4 fails and P1 is at most a descriptive internal representation.

## 6. Validation design
### Stage 1: Construct validity
Check whether established literature independently supports: context-dependent memory/reactivation, sequence/history effects, participation/social-context modulation, and higher-order/non-additive interaction. Literature support alone cannot validate OASIS-specific C5.

### Stage 2: Negative and positive controls
Use synthetic or controlled environments with known ground truth:
- Markov/current-only null
- similarity/recency-only
- additive history
- history × participation interaction
The model must not win materially in null environments and should detect dependence only where present.

### Stage 3: External non-OASIS data
Use at least two independent public datasets or externally generated environments not produced by the OASIS code. Required characteristics: sequential history, current state, participant/context variables where possible, and a measurable downstream target.

### Stage 4: Ablation and permutation
Compare:
B0 current-state only
B1 current + similarity
B2 current + similarity + recency/frequency
B3 fixed participant/experience weights
B4 generic capacity-matched sequence model
O1 OASIS relational history without participation interaction
O2 OASIS history × participation

Perform history-order permutation, participant-state permutation, and relation-history removal.

### Stage 5: Robustness
Multiple seeds/splits, held-out temporal evaluation where possible, paired bootstrap/permutation confidence intervals, calibration checks, and failure-case inspection.

## 7. Primary metrics
For probabilistic outcomes: held-out log loss is primary, Brier score and calibration secondary.
For classification: log loss primary; AUROC/F1 only secondary.
For continuous outcomes: held-out negative log likelihood where available, otherwise MAE/RMSE with pre-fixed direction.

Primary effect: relative held-out improvement versus the strongest simpler baseline.
Minimum effect for positive support: >=0.5% relative improvement and paired 95% CI excluding 0, reproduced across at least two independent splits/seeds; external support requires replication in at least two independent datasets/environments.

## 8. Verdict rules
PASS: C1–C4 supported externally in at least two independent non-synthetic datasets/environments, negative controls behave correctly, and C5 survives capacity-matched baselines/ablations.

PARTIAL: history/context dependence is supported but participation interaction, downstream consequence, or OASIS-specific incremental value is not consistently supported.

FAIL: any core Kill Criterion K1, K2, or K4 is met. If only K3 is met, verdict is PARTIAL with 'general history dependence supported, OASIS-specificity unsupported'.

INCONCLUSIVE: evidence is insufficient, underpowered, non-independent, or required variables are unavailable.

## 9. Anti-confirmation-bias constraints
- Do not select datasets after inspecting whether OASIS wins.
- Do not tune thresholds after seeing the test set.
- Do not omit failed seeds, datasets, or negative controls.
- Synthetic success is never called external empirical validation.
- Literature compatibility is not proof of the full P1 proposition.
- A simpler explanation that matches the data is preferred until OASIS-specific incremental value is demonstrated.
