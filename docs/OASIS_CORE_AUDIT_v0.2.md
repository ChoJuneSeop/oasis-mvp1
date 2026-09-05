# OASIS Core Audit v0.2

## Scope

This audit isolates O2/O3/O4/O11 from the MVP world. It is not a performance comparison and not evidence of OASIS superiority.

## v0.1 falsification history

v0.1 initially passed basic unit tests, but adversarial tests exposed three saturation paths:

1. 500 unrelated memories sharing the same endpoint caused 500 activations.
2. Requiring the same relation label still allowed 500 activations when all memories shared that label.
3. Statistical removal of a ubiquitous `self` token failed when `self` appeared in 499/500 memories, producing 499 activations.

Therefore v0.1 is retained as a failed implementation-fidelity attempt.

## v0.2 design correction

v0.2 separates `actor` from `counterparts` at the data-model level. Actor identity cannot be used as relational bridge evidence. Reactivation currently requires both:

- directed endpoint continuity from a completed past process into the present flow; and
- reappearance of at least one non-actor relational counterpart at the boundary.

Same actor, same place, same relation label, scalar similarity, reward, top-k rank, and fixed thresholds are insufficient by themselves.

## Current test status

Local Node validation: 12/12 tests passed.

The suite includes direction/order preservation, zero activation for unrelated memory, same-present/different-flow discrimination, 500-memory noise, shared-endpoint collision, shared-relation collision, actor/self exclusion, and recovery of one genuine relational re-entry among 500 endpoint collisions.

## Remaining scientific risk

The v0.2 bridge rule is still a provisional implementation rule chosen by the researcher. Passing these tests establishes only internal construct fidelity for O2/O3/O4/O11. It does not establish that `counterpart reappearance` is the correct or unique mechanism of OASIS affinity reactivation. That mechanism must later be challenged in a neutral world where relevance is not pre-labeled by the experimenter.
