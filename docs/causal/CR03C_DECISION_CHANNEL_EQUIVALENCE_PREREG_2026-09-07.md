# CR-03C Decision-Channel Equivalence — Preregistration

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Dependency: CR-03R cross-key overdetermination result (`run 34078727151`)

## Necessity / prior-art subtraction

CR-03R established that two or more distinct relation keys can each reproduce the same current decision signature in 165/297 changed-decision moments and the same resolved actual target in 77/204 target-change moments.

This does not yet imply different causal mechanisms. Causal abstraction and aggregation literature warns that distinct micro-realizations can map into one macro state while having either equivalent or non-equivalent intervention effects. Causal-degeneracy literature also already recognizes that different internal states can realize the same function.

Therefore CR-03C does not test novelty of multiple realizability or degeneracy. It tests an implementation-specific ambiguity:

> Do independently sufficient OASIS relation keys traverse the same downstream relation-decision interface, or different interfaces that converge on the same current result?

## Fixed scope

- 120,000 ticks.
- same deterministic production world and exogenous flow.
- production trajectory unchanged.
- canonical guard first.
- analyze only CR-03R cross-key moments.
- shadow-only interventions; no feedback.
- choice semantics use resolved production target.

## Downstream relation-decision channel trace

For each independently sufficient relation key acting alone, record the relation-field effects *without including the relation-key identity itself*:

1. participant-role set returned to OASIS decision logic.
2. actionable-place set.
3. per-place `fieldRelevantToPlace` boolean vector.
4. set of NPC endpoints touched by the active field.
5. hidden-story readiness vector.
6. hidden-candidate set after production-equivalent `refreshHidden`.
7. member-rank tuple matrix across active participants and actionable places.

This trace is the currently instrumentable downstream interface by which relation-field state enters the decision mechanism.

## Primary classifications

For every CR-03R cross-key moment:

### CHANNEL_EQUIVALENT
All independently sufficient relation keys produce exactly the same downstream channel trace.

Interpretation: cross-key identity differences collapse before or at the measured relation-decision interface. Current cross-key sufficiency is functional degeneracy at this interface.

### CHANNEL_EQUIFINAL
At least two independently sufficient relation keys produce different downstream channel traces while still reproducing the same full decision signature or resolved target.

Interpretation: distinct measured decision pathways converge on the same current result. This is same-current equifinality evidence in the implementation.

`equifinality` = 서로 다른 경로나 조건 조합이 동일한 결과에 도달하는 현상.

## Validity requirements

- production replay mismatch = 0
- full-shadow resolved-target mismatch = 0
- joint decision effects = 297 and target effects = 204
- cross-key decision moments = 165 and target moments = 77, reproducing CR-03R
- shadow state fully restored after each channel trace

## Falsification

If all cross-key cases are CHANNEL_EQUIVALENT, CR-03R does not support distinct downstream causal pathways; it mainly identifies multiple relation identities collapsed into the same functional channel.

If CHANNEL_EQUIFINAL cases occur, cross-key redundancy cannot be fully explained by a single measured boolean/ranking channel. The next experiment must then test whether those currently convergent pathways later diverge under identical exogenous flow.

## Evidence boundary

CR-03C remains same-current mechanism evidence. It does not establish longitudinal causation, future relation rewrite, or external generalization.
