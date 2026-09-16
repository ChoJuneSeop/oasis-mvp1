# GH-2 v1.1 Confirmatory Wrapper Fix Log

## Scope

This record distinguishes an execution-wrapper false negative from the frozen GH-2 v1.1 experiment.

## First confirmatory run

- Run: `35077973030`
- Frozen experiment snapshot: `6d1a6606c0dc06074832474d2b29fe1140e5f0bd`
- 66 frames/arm x 4 arms = 264 decision-realization units
- Main experiment step: **SUCCESS**
- Generated raw-result SHA256: `a744a7270a2913ecd7ef8fb0a21dbb9601726dba22212f245f6a8dd850a0254c`
- Post-result validation step: **FALSE NEGATIVE**

The validation wrapper used `all(p['structural_invariants'].values())`. The invariant field `runtime_evaluator_leakage` is correctly represented as `false` when no leakage occurred, so the generic `all()` assertion incorrectly rejected the valid result.

## Permitted correction

Only the post-result wrapper semantics were changed:
- positive invariants must equal `true`;
- `runtime_evaluator_leakage` must equal `false`.

The following were **not changed**:
- frozen experiment snapshot;
- Core;
- GH-1 / GH-1L lineage;
- responsibility operator or burden tokens;
- arm definitions;
- scenario matrix;
- evaluator truth;
- primary/secondary metrics;
- pilot provenance;
- candidate contract;
- realization path.

Wrapper correction commit: `a4a3914938ceb90a829386fa4e1992aa967ddf09`.

## Evidence-recovery run

- Run: `35078074065`
- Frozen experiment snapshot: unchanged `6d1a6606c0dc06074832474d2b29fe1140e5f0bd`
- Workflow conclusion: **SUCCESS**
- Raw-result SHA256: `d89aa18b301d7c566440e379d92b5d85268a884337269d612b5ab4424aea34d6`
- Artifact ID: `10439266495`
- Artifact ZIP SHA256: `698247fe2ead6135edc75ce31fea5a05ea247df36ecd607ded317c27241bbca2`

The metric pattern was reproduced exactly:
- R1 = 66/66
- R2 = 33/66
- R3 = 0/66
- R4 = 33/66
- R1-R2 = +0.50
- R1-R3 = +1.00
- R1-R4 = +0.50

The recovery run is not treated as an additional statistical replicate. It demonstrates exact-snapshot reproducibility after correction of the evidence wrapper.
