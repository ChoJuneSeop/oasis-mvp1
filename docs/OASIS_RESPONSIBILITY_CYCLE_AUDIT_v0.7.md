# OASIS Responsibility-Cycle Experience Boundary v0.7 Audit

## Scope

This branch tests one implementation hypothesis for experiential event segmentation:

`rho_t dynamics -> relative trough -> renewed rise -> completed experience candidate e_i`

It does not yet define the canonical responsibility function itself, nor `a_t`, `C_t`, `Psi`, `P`, choice, minimum safety semantics, or full `W` rewriting.

## User-derived hypothesis

Reality continues to flow and observation changes with it. Responsibility is not expected to become literally zero because minimum monitoring/safety can remain active. However, responsibility can fall toward a local low-activity state and later rise again when a new judgment demand emerges.

Hypothesis:

> The transition from a responsibility trough to renewed responsibility growth can serve as a natural experiential-cycle boundary.

The previous event is assigned `closedAt` at the trough. Closure is only confirmed retrospectively when the renewed rise is observed.

## Why this is different from v0.6

v0.6 closes a minimal directional relation lifecycle only when that relation explicitly ceases.

v0.7 does not require all participating relations to cease. A relation may remain active across multiple experiential cycles. This allows one broad reality flow to contain multiple completed experiences, which is consistent with the fixed OASIS concept that `f_t` and `e_i` are not one-to-one.

## Responsibility is not reduced to one weighted score

The prototype represents `rho` as a component-wise resource-allocation state. Example components can include monitoring, search, verification, and compute allocation, but the canonical component set is not yet fixed.

Comparison uses only partial ordering:

- rise: every component is non-decreasing and at least one increases;
- fall: every component is non-increasing and at least one decreases;
- same: no component changes;
- incomparable: some components rise while others fall.

No weighted sum, risk score, absolute low threshold, epsilon, timeout, or reward is used.

An incomparable redistribution does not by itself create an event boundary.

## Cycle rule

1. A first component-wise rise begins a provisional responsibility cycle.
2. Further rises continue the cycle.
3. A component-wise fall starts a descending phase and records a relative trough candidate.
4. A flat low plateau updates the trough to the latest low sample.
5. A renewed rise after descent/trough confirms the prior trough as the previous event boundary.
6. The confirming rise begins the next cycle.
7. If no renewed rise occurs, the last cycle remains provisional rather than being force-closed by time.

## Minimum safety boundary compatibility

The detector never requires `rho = 0`. A persistent non-zero monitoring/safety floor is compatible because the boundary is relational/directional: it depends on a local fall-then-rise cycle, not an absolute zero point.

## Retrospective closure

If responsibility reaches a low state at `t=4` and rises again at `t=5`, v0.7 records:

- `closedAt = 4`
- `boundaryConfirmedAt = 5`

This is deliberate. At `t=4` alone the system cannot know that the point is a trough; the next rise supplies the evidence.

## Kill-search conclusion

Event Segmentation Theory and related episodic-memory research already connect event boundaries with changes in ongoing event models, prediction error, attention, and cognitive-control updates. Therefore the general idea that internal processing changes can mark event boundaries is not novel by itself.

The OASIS-specific question is narrower: whether its dynamically allocated responsibility process provides a useful endogenous cycle for grouping relational flows into completed experiences without an external task label or fixed episode timer.

This remains an empirical hypothesis, not a proven novelty claim.

## Falsification result

Local equivalent execution:

`oasis-responsibility-cycle-v0.7: 12/12 tests passed`

Tests cover:

1. non-zero safety floor compatibility;
2. component-wise rise;
3. component-wise fall;
4. mixed/incomparable resource redistribution;
5. rise starts but does not prematurely close a cycle;
6. fall alone does not close a cycle;
7. renewed rise closes at the prior trough;
8. flat trough handling;
9. time alone cannot create a boundary;
10. repeated cycles preserve event order;
11. multiple relational streams can remain active through the boundary;
12. explicit relation cessation is not required for experiential closure.

## Critical circularity warning

This approach becomes invalid if responsibility `rho_t` is itself computed using the event boundary or historical event `e_i` that the same detector is trying to create.

For a valid implementation, boundary-driving responsibility must be computed from information available before the boundary decision, such as current flow, current uncertainty, current participation, current consequence exposure, and actual resource allocation. The segmenter must not feed its own newly created event label back into the same-step responsibility calculation.

## Critical granularity warning

A tiny numeric change in a continuously valued internal resource could produce an artificial rise/fall if those values are noisy estimates. The intended inputs are authoritative allocation states or independently uncertainty-qualified responsibility components, not arbitrary floating-point scores.

## Status

v0.7 is an implementation hypothesis that improves multi-relation experience segmentation over the v0.6 `relation ceased` rule, but it is not yet canonical OASIS.

The next required step is to connect actual responsibility allocation to the cycle detector and test whether the resulting boundaries correspond to coherent completed experiences without using scripted event labels.
