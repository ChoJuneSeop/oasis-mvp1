# Stage 1 — Problem recognition and goal

## Problem
Governance Harness v0.4 already contains the mechanics required after realization: authoritative post-observation, Closure, typed `JudgmentRevalidation`, provenance, feedback persistence, and atomic Completed Experience commit. However, GH-1/GH-1L/GH-2 did not establish that **outcome-based revalidation itself has an independent causal role in a later governance decision**.

GH-1 and GH-1L established selective re-participation within their frozen scopes. GH-2 established a causal responsibility-selection layer, while explicitly disabling outcome-feedback decision reuse, newly committed Completed Experience reuse, and revalidation learning. Therefore a post-outcome revalidation object could still be only an audit record with no later governance effect.

## GH-3 primary question
Given an identical later current observation, identical frozen historical archive, identical Core, identical possibility set/distribution, and identical responsibility contract, does **provenance-bound revalidation derived only after authoritative realization outcome and Closure** causally alter the next governance judgment relative to the same revalidation being recorded but withheld from the next decision?

## Two-link causal target
GH-3 must separately establish both links:

1. `authoritative post-outcome -> typed revalidation state`
2. `typed provenance-bound revalidation feedback -> later governance difference`

Neither link may be inferred from the other.

## Goal
Establish or reject, under a frozen synthetic governance contract, the limited claim:

> A completed realisation can be revalidated only after host-authoritative post-observation and Closure, producing non-scalar, provenance-bound feedback that may participate as evidence in a later governance epoch without reverse causality, same-epoch reuse, permanent memory weights, or post-result rule tuning.

## Primary isolation rule
Newly committed Completed Experience records are committed for provenance integrity but are **not decision-eligible historical participants in the primary GH-3 experiment**. This prevents the causal effect of revalidation feedback from being confounded with new-CE reuse. New-CE decision reuse is reserved for a later integrated governance experiment.

## Out of scope
- reward learning, reinforcement learning, utility/value fitting, or policy-gradient updates;
- permanent positive/negative memory weights;
- treating `REVISED` as deletion, invalidation, or permanent exclusion;
- same-epoch feedback reuse;
- general task-performance or safety superiority;
- legal/moral blame attribution;
- newly committed CE decision reuse as a causal factor;
- live CARLA deployment validity;
- GH-1/GH-1L/GH-2 rule retuning based on GH-3 outcomes.
