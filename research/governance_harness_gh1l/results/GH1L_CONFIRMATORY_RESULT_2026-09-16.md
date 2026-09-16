# GH-1L Confirmatory Result — 2026-09-16

## Status

`GH1L_EXPERIMENT_V1_0_2_ACTION_CONTRACT` confirmatory execution completed successfully.

- Frozen code: `135012775fa1a3fd4c912b4df0f563b75befe781`
- Count-frozen snapshot: `17d2c7d5e2764e7e3fd4330e3c6f1335e75410c2`
- Workflow run: `35062859122`
- Confirmatory blocks: 12
- Arm runs: 60
- Horizon: 512 ticks per run
- Pilot data included in confirmatory: no
- Fresh-process isolation: PASS
- Archive hash invariant: PASS
- Invalid/unsafe action-contract violations: 0
- Unresolved outputs: 0

## Confirmatory contrasts

### G1 vs G3 — contribution of selectively re-participating eligible history

History-sensitive resolution was 1.00 for G1 and 0.40 for G3. The paired G1-G3 difference was `+0.60` in all 12 confirmatory blocks. This exceeds the pre-confirmatory frozen target delta of `0.20`.

Within the frozen GH-1L world, current-flow-gated selective re-participation therefore produced a stable decision-path difference at the history-sensitive cases relative to the same system without history.

This is not a claim that history improves every tick. The whole-horizon G3 resolution rate remained 0.994140625 because only a small frozen subset of the 512-tick world is history-sensitive by design.

### G1 vs G2 — cost of current-flow access gating

G1 and G2 both achieved history-sensitive resolution 1.00. G1 archive access rate was 0.009765625, while G2 accessed the archive at every tick (1.00). The paired access-rate difference was `-0.990234375` in all 12 blocks, or 99.0234375 percentage points less archive access for G1.

Thus the access gate preserved the observed confirmatory decision result while avoiding almost all archive reads in this frozen world.

### G1 vs G4 — selective participation versus all retrieved experiences

G4 used the same Gap-gated archive access as G1 but allowed every retrieved experience to participate. Its history-sensitive resolution rate was 0.40. G1-G4 was `+0.60` in every confirmatory block.

This separates archive access from participation: merely opening history did not reproduce G1. Context-local selection of which Completed Experiences participated was necessary for the observed decision-path effect under these scenarios.

### G1 vs G5 — experience identity specificity

G5 preserved G1's participation count but replaced the selected identities with seed-fixed alternative experiences. G5 history-sensitive resolution averaged 0.5166666667. The paired G1-G5 difference averaged `+0.4833333333`, sample SD `0.1029857301`, with a normal-approximation 95% interval of `[0.4250636711, 0.5416029956]`. Every confirmatory block remained positive (`+0.4` or `+0.6`).

This shows that the effect was not explained by participation cardinality alone. Which relational experience participated mattered in the frozen GH-1L cases.

## Structural interpretation

Taken together, the confirmatory contrasts isolate four different mechanisms without an aggregate score:

1. G1-G3: eligible past experience can causally alter later decision paths in history-sensitive cases.
2. G1-G2: current-flow-first access gating can sharply reduce archive access without changing the observed G1/G2 result here.
3. G1-G4: unrestricted participation after access does not reproduce selective participation.
4. G1-G5: preserving participation count while changing experience identity does not reproduce G1, so the result is identity/relationship specific rather than a generic memory-count effect.

## Claim boundary

GH-1L does not establish general model superiority, real-world deployment performance, CARLA safety, responsibility-axis effects, feedback learning, or permanent memory weighting. It verifies a narrower longitudinal mechanism under a frozen synthetic world: **current-flow-first access gating plus current-relationship-specific re-participation can produce stable later decision differences, and those differences depend on which Completed Experience participates.**

The v1.0.1 diagnostic pilot is retained only as provenance and is invalid for confirmatory inference because its action vocabulary was not yet canonicalized to Core possibility IDs.
