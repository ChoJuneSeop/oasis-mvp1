# CR-03R Redundancy Source Decomposition — Preregistration

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Depends on: corrected CR-02 v2 (`run 34078199598`)

## Why this experiment is necessary

CR-02 v2 found 297 same-current decision-signature effects and 204 resolved actual-target effects from the latent relation layer. Almost every effect was individually non-necessary but individually sufficient at the episode-identity level. The originally preregistered CR-03 required the opposite pattern (joint effect with no individually sufficient process), so CR-03 is not run.

The unresolved ambiguity is whether CR-02 redundancy is:

1. merely repeated episode identities that have the same current decision footprint, or
2. genuinely alternative relation-process structures, including different relation keys, that independently reproduce the same current effect.

Prior sufficient-cause literature already establishes redundant and multiple sufficient causes. Therefore the scientific purpose here is mechanism decomposition in the OASIS implementation, not novelty of redundancy itself.

## Fixed scope

- Horizon: 120,000 ticks.
- Same deterministic production world and exogenous `env(t)`.
- Production relation-field implementation unchanged.
- Shadow only; no counterfactual state feeds back into production.
- Shadow choice semantics reproduce `refreshHidden -> evalP -> resolved P.target`.
- Canonical guard must pass first.

## Units

Analyze every CR-02-type same-current moment where:

- full active latent set changes decision signature relative to no-latent; and separately
- full active latent set changes resolved actual target relative to no-latent.

Group active process identities at two levels:

1. decision footprint = relation key + sorted place set
2. relation key

## Preregistered tests

For every changed moment:

- Full active identities vs no latent.
- One representative identity per decision footprint vs full identities.
- Each footprint alone vs full effect.
- Full minus each footprint vs full effect.
- Each relation key alone vs full effect.
- Full minus each relation key vs full effect.

## Primary classifications

For decision signature and resolved actual target separately:

### CROSS_KEY_OVERDETERMINATION
Two or more distinct relation keys are each individually sufficient to reproduce the full effect.

### WITHIN_KEY_ALTERNATIVE_FOOTPRINTS
Two or more distinct sufficient decision footprints exist but all sufficient footprints belong to one relation key.

### SINGLE_SUFFICIENT_KEY_NECESSARY
Exactly one sufficient relation key exists and removing it destroys the full effect. Episode-level non-necessity can therefore be explained by redundancy inside that necessary relation structure.

### SINGLE_SUFFICIENT_KEY_PLUS_COALITION
Exactly one relation key is sufficient alone, but removing it does not destroy the full effect. The remaining non-individually-sufficient relation keys jointly provide an alternative route.

### NO_SUFFICIENT_KEY
No individual relation key is sufficient despite the episode-level CR-02 pattern. This would indicate grouping semantics require further investigation.

## Primary falsification question

If all or nearly all CR-02 redundancy collapses to `SINGLE_SUFFICIENT_KEY_NECESSARY` and one representative per footprint reproduces full behavior, the apparent episode-level overdetermination is largely an implementation multiplicity artifact.

If `CROSS_KEY_OVERDETERMINATION` occurs, redundancy cannot be explained only by duplicate episode identities; distinct relation structures can independently reproduce the same current effect in this harness.

## Validity requirements

- production replay mismatch = 0
- full-shadow resolved-target mismatch = 0
- representative-per-footprint compression mismatch = 0, otherwise identity multiplicity itself is behaviorally relevant and must be reported rather than compressed
- no shadow feedback

## Evidence boundary

This is same-current mechanism evidence only. It does not establish unique actual causation, longitudinal outcome causation, future relation rewrite, or generalization.
