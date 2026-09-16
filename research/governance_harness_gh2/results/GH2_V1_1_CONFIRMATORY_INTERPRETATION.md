# GH-2 v1.1 Confirmatory Interpretation

## Status

**GH-2 v1.1 — CONFIRMATORY COMPLETE**

Frozen experiment snapshot: `6d1a6606c0dc06074832474d2b29fe1140e5f0bd`

The structural Pilot completed first without evaluator use and without computing any confirmatory metric. The confirmatory experiment then executed the preregistered finite matrix of 66 frames per arm across four arms, for 264 decision-realization units.

## Confirmatory observations

| Arm | Contract-consistent resolutions | Rate |
|---|---:|---:|
| R1 CURRENT_BOUND | 66/66 | 1.00 |
| R2 RECORD_ONLY | 33/66 | 0.50 |
| R3 PERMUTED | 0/66 | 0.00 |
| R4 STALE | 33/66 | 0.50 |

Primary contrast: `R1 - R2 = +0.50`.

Secondary contrasts:
- `R1 - R3 = +1.00`
- `R1 - R4 = +0.50`
- R1 and R2 enacted different selections on `33/66` frames.

The same 1.00 / 0.50 / 0.00 / 0.50 pattern occurred in each of the three frozen observation families. The same pattern also occurred separately in every one of the eleven frozen multi-axis combinations: UI, UV, UT, IV, IT, VT, UIV, UIT, UVT, IVT, UIVT.

## Causal interpretation within the frozen GH-2 contract

### R1 vs R2 — binding versus recording

R1 and R2 receive the same current observation, actual Core possibility set/distribution, empty participating-experience view, and current responsibility computation. The intended intervention is whether that responsibility judgment is causally bound to selection.

The observed 66/66 versus 33/66 separation therefore demonstrates within this frozen matrix that responsibility cannot be represented merely as a side record if the governance decision is intended to follow the current responsibility contract. Binding changes the realized decision path on 33 of 66 frames.

### R1 vs R3 — candidate identity

R3 preserves the responsibility-profile structure but reassigns profiles across candidate identities before binding. Its 0/66 contract-consistent result contrasts with R1's 66/66.

Within this experiment, responsibility is therefore not an interchangeable context label. Its provenance must remain attached to the candidate for which the obligation was formed.

### R1 vs R4 — current-context non-stickiness

R4 reuses responsibility only from the immediately preceding critical member of the same matched pair, and stale state is reset at every new pair. R4 resolved 33/66 versus R1's 66/66.

Within the frozen matched-pair design, responsibility must therefore be recomputed when the current relational context reverses rather than retained as a sticky prior profile.

## Structural validity

All confirmatory execution paths preserved:
- fresh arm processes;
- identical Core candidate sets;
- selected == realized;
- exactly one realization per decision;
- non-scalar U/I/V/T responsibility representation;
- R1 responsibility-before-realization binding;
- pair-local-only R4 stale state;
- evaluator truth joined only after worker execution;
- no runtime evaluator leakage;
- identical empty history participation across arms.

## Wrapper incident

The first confirmatory run (`35077973030`) completed the full 264-unit experiment step and produced the same metric pattern. A post-result validation assertion then incorrectly treated `runtime_evaluator_leakage: false` as a failing Boolean because it applied `all()` to the whole invariant mapping.

No experiment code, responsibility rule, scenario, evaluator contract, or frozen snapshot was modified. Only the post-result validation expression was corrected. The exact frozen snapshot was then rerun (`35078074065`) and reproduced the same metric values; this second run supplied the retained artifact. The second run is evidence recovery/reproducibility, not an additional statistical sample.

## Claim boundary

GH-2 v1.1 is a deterministic finite synthetic contract experiment. These results establish the causal role of current-context responsibility binding **within the frozen GH-2 experimental scope**.

They do not establish general task-performance superiority, population-level effect size, deployment safety, or superiority over other AI systems. No p-value, aggregate winner score, or population generalization is claimed.

## Governance-OASIS consequence

The evidence supports the architecture-level transition:

`current possibilities -> current U/I/V/T responsibility -> candidate-specific binding -> single realization`

rather than:

`current possibilities -> selection -> responsibility logged afterward`

GH-2 is therefore closed for its present research question. The next experimental lineage is **GH-3 — Outcome-based Revalidation**.
