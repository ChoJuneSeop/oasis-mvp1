# CR-03L Longitudinal Fate of Equifinal Relation Channels — Preregistration

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Dependency: CR-03C target-level CHANNEL_EQUIFINAL cases (`63/77` cross-key target moments)

## Necessity / prior-art subtraction

Equifinality, path dependence, partially observable history dependence, predictive-state representations, and state abstraction/bisimulation are established prior art.

In particular, current behavioral equivalence is insufficient for safe state aggregation when future transition behavior differs. Bisimulation-style abstractions require relevant future transition/reward equivalence, while predictive-state approaches represent history through its implications for future observations.

Therefore CR-03L does **not** test novelty of `different paths can reach the same result` or `history can matter`.

The OASIS-specific implementation question is narrower:

> When two distinct reactivated relation structures pass through different decision-consumed channels but realize the same current action, does that current convergence remain equivalent under the same future reality flow, or can their preserved relational histories later separate, return, and reappear?

## Fixed experimental scope

- Main production world horizon used to find branch points: 120,000 ticks.
- Future branch horizon from each selected point: **20,000 ticks**.
- Production `relation-field.js`: unchanged.
- Canonical guard: required before execution.
- Branches are auxiliary causal mechanism tests and never feed back into the production replay.
- Future exogenous reality: identical deterministic `env(t)` tape for both branches.
- No future information is available at branch selection.
- No random branch selection.

## Eligible branch point

A branch point must satisfy all of the following in the same current state:

1. Full latent layer changes the resolved actual target relative to no-latent.
2. At least two distinct relation keys are individually sufficient for the full resolved target.
3. At least two of those sufficient keys have different CR-03C **decision-consumed primary channel signatures**.
4. Thus the moment is a CR-03C target-level `CHANNEL_EQUIFINAL` case.

## Deterministic branch-point selection

Divide the 120k production horizon into twelve fixed 10,000-tick bins:

- 1–10,000
- 10,001–20,000
- ...
- 110,001–120,000

In each bin, select the **first eligible target-level CHANNEL_EQUIFINAL moment**. If a bin has no eligible moment, no case is manufactured for that bin.

This selection uses only current-state eligibility and tick order, never future branch behavior.

## Deterministic relation-key pair selection

At the selected moment:

1. sort individually sufficient relation keys lexicographically;
2. scan pairs in lexical order;
3. choose the first pair whose primary downstream channel signatures differ.

No pair is selected because of later divergence.

## Branch intervention

Immediately before the production `choose()` at the branch point:

- clone the complete current world into Branch A and Branch B;
- preserve all completed histories and latent stores in both clones;
- in Branch A, currentize only the selected latent relation key A for that current decision;
- in Branch B, currentize only key B;
- canonical recent episodes remain unchanged in both branches;
- run the real production choose path in each branch;
- assert the immediate resolved target is identical in A and B and equals the qualifying target;
- release the key-only intervention immediately after that choice;
- continue both complete worlds normally for 20,000 ticks with the exact same future `env(t)`.

This is a **one-current intervention**, not a permanent policy.

## Why a paired branch is used

The branch pair begins from the same pre-intervention world and receives the same future exogenous tape. This avoids interpreting an observational association as the causal effect of a relation path.

Time-varying feedback is still recorded because branch choices can change later states, which can change later relations and choices. Naive longitudinal regression is not used.

## Observation start for primary future divergence

The immediate chosen target is identical by design.

Primary future-flow observation begins only after **both branches have completed that shared immediate action and reached their next production choice**. This prevents the initial intervention itself from being counted as a future divergence.

## Primary outcomes

For the focal party, record:

1. first future resolved-target divergence after the shared immediate action;
2. first observable-flow divergence: current place / target / party positions / HP;
3. first relation-history divergence;
4. first hidden-state divergence;
5. whether a target divergence later returns to target equality;
6. whether divergence reappears after such a return;
7. divergence state at +1k, +5k, and +20k future ticks;
8. no-divergence by +20k as **right-censored**, not permanent equivalence.

`right-censored` = 관찰 종료 시점까지 사건이 나타나지 않았을 뿐 영구히 발생하지 않는다고 단정하지 않는 처리.

## Secondary state layers

To avoid confusing transient currentization caches with realized future flow, record separately:

- observable flow: place, target, member positions/HP;
- decision state: discovery/visit state, seen NPCs, hidden candidates/done, active relation keys;
- history state: ordered choice history, ordered relation history, latent-process store summary.

A difference in `relationField.active` alone is not sufficient to declare realized future-flow divergence.

## Allowed result patterns

No monotonic divergence assumption is allowed.

Possible valid patterns include:
- no later difference
- delayed difference
- divergence then contraction
- divergence then natural return
- return followed by reappearance
- different histories with temporarily equal current observable flow

## Falsification / interpretation

### If no selected branches diverge in future choices/realized flow
CR-03C equifinal channels may be functionally equivalent over the tested 20k horizon. This does not prove permanent equivalence.

### If future divergence occurs
This supports implementation-level path dependence after current equifinality: different relation processes can realize the same current action yet later participate differently in the continuing reality flow.

### If only internal/history state differs but all future realized choices remain equal
Preserved history distinction exists, but behavioral future relevance remains unvalidated over the tested horizon.

## Evidence boundary

CR-03L can support long-horizon mechanism-level path dependence in this deterministic world. It does not prove general OASIS theory, external-world generalization, or patent novelty by itself.
