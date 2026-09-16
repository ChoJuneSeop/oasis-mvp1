# GH-3 v1.0 Confirmatory Result

## Status

CONFIRMATORY COMPLETE.

Frozen experiment snapshot: `1d392e39bf1ff64e71eb591988649c8041d025ab`

Primary workflow run: `35106684909`

The confirmatory execution used the a-priori finite matrix frozen before Pilot: 18 chains per arm, three arms, two decision-realization epochs per chain, for 108 total decision-realization epochs. All scientific workers completed before evaluator truth was joined.

## Structural result

All three arms used fresh worker processes. Every chain preserved selected=realized for both epochs, exactly two realizations per chain, one frozen decision-eligible baseline experience, and zero decision reuse of the newly committed Completed Experience. The latter isolates governance feedback from accumulated CE reuse.

## Link A: outcome -> typed revalidation

Each arm matched the frozen outcome-state contract on all 18 antecedent chains:

- F1_ACTIVE_CORRECT: 18/18
- F2_RECORD_ONLY: 18/18
- F3_PERMUTED_STATE: 18/18

Thus the authoritative post-observation/Closure path produced the intended typed CONFIRMED, REVISED, or INCONCLUSIVE revalidation state throughout the finite matrix.

## Link B: typed feedback -> later governance

The primary causal subset was `REVISED + SAME_SCOPE`. There were three such chains, one in each held-out observation family.

F1_ACTIVE_CORRECT versus F2_RECORD_ONLY changed later participation on 3/3 chains and changed later realized selection on 3/3 chains. Therefore, in the frozen harness, correctly exposed REVISED feedback is not merely an audit record: when the same relation scope recurs, it causally changes the later participation path and the realized choice.

## Stability / non-stickiness

F1 versus F2 showed no change on all CONFIRMED cases and all INCONCLUSIVE cases. REVISED feedback also produced no global exclusion when the recurrence scope shifted. All three frozen stability rates were 1.0.

This is the intended non-stickiness property: a prior REVISED judgment applies only where the frozen current relation scope matches; it does not become a permanent experience ban.

## State-content ablation

F3_PERMUTED_STATE preserved committed provenance but permuted the state only when exposing feedback to the later governance step. This changed behavior according to the exposed state. In particular, a stored CONFIRMED state exposed as REVISED suppressed same-scope participation, while a stored REVISED state exposed as INCONCLUSIVE removed that suppression. This supports the causal role of feedback content rather than mere feedback presence.

## Claim boundary

GH-3 v1.0 supports a controlled causal claim for Outcome-based Revalidation:

`realization -> authoritative post-observation -> Closure -> typed revalidation -> provenance-bound feedback -> later related governance`

within the frozen finite synthetic matrix.

It does not establish real-world or CARLA generalization, learned outcome evaluation, newly committed CE reuse, long-horizon accumulation, or overall system superiority. No aggregate winner score is reported.

## Governance-paper interpretation

Together with GH-1/GH-1L and GH-2, GH-3 supplies evidence for the third paper-level governance principle: outcomes can revalidate prior governance judgments and that revalidation can selectively alter a later related decision without becoming a permanent scalar memory weight or global exclusion rule.
