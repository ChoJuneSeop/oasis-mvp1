# CR-03 Irreducible Relation Support — Preregistration

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0
Dependency: execute only after CR-02 v2 validity passes with production replay mismatch = 0, full-shadow actual-target mismatch = 0, and duplicate-footprint violation = 0.

## Necessity / prior-art subtraction

Sufficient-component cause models already show that an outcome can have multiple sufficient causal constellations and that redundant sufficient causes can make a genuine component appear non-causal under simple removal tests. Minimal sufficient conditions / INUS-style accounts are also established prior art. Therefore CR-03 does not test novelty of 'causes can be conjunctive' or 'minimal sufficient sets exist'.

OASIS-specific scope is narrower: within the same current flow, when a reactivated latent relation set changes the current decision but no single process identity is individually sufficient, identify whether there are irreducible *relation-process support sets* and preserve their process identities for later longitudinal tracing.

## Unit and scope

- Unit: one actual production decision moment in the 120k OASIS world.
- Eligible moment: CR-02 v2 confirms a joint latent-set decision effect and no individual process identity is sufficient for the full decision effect.
- This is same-current mechanism analysis only.
- It is not a claim of global actual causation, theory generalization, or future relation rewrite.

## Target effect

Primary target: full decision signature relative to the no-latent same-current shadow.
Secondary target: resolved actual target relative to the no-latent same-current shadow.

The internal `hidden:*` token is not itself an actual choice. Choice-level analysis always uses the resolved production target.

## Search object

Given an active process-identity set A at an eligible moment, find a subset S such that:

1. S reproduces the full target effect under the same current state.
2. Removing any one member from S destroys that target effect.

Such S is called a **1-minimal irreducible relation support set**.

This wording is deliberate. The experiment does not claim that S is the unique or globally smallest causal set.

## Search-order bias control

Run the same deterministic shrink test under four preregistered process orders:

1. createdTick ascending, then episodeId lexical.
2. createdTick descending, then episodeId lexical.
3. relation key lexical, then createdTick ascending.
4. deterministic FNV-style hash of episodeId, then episodeId lexical.

If different 1-minimal sets are found, preserve all distinct sets. Do not choose the smallest or most OASIS-favorable result after seeing outcomes.

## Invariants

- Same production current state.
- Same external reality and tick.
- Shadow evaluations never feed back into production.
- `refreshHidden -> evalP -> actual-target resolution` matches production choice semantics.
- Canonical relation-field windows remain unchanged.
- No future information.
- No random activation.

## Required outputs

For every distinct support set:

- tick
- party
- current place
- danger/current flow state
- full active process count
- support-set process IDs
- process creation ticks
- relation keys and places
- raw decision signature
- resolved actual target
- result under each single-member deletion
- search order(s) that recovered the set

## Evidence grading

- A recovered set supports only **same-current irreducible joint contribution** in the current implementation.
- Multiple recovered sets are evidence of alternative relational support structures, not a failure.
- No recovered set is also a valid result; it leaves the corresponding joint effect unresolved under this search procedure.
- Future outcome and future relation rewrite remain unvalidated until later longitudinal intervention experiments.
