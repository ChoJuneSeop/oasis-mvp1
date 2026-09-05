# OASIS M -> O -> f Integration Note v0.5

This note records the integration contract between:

- `oasis-measurement-observation-v0.5.js`
- `oasis-relation-flow-v0.4.js`

The measurement adapter emits directional qualitative relational observations with raw evidence and uncertainty preserved. The flow tracker treats repeated semantic state as continuity and appends ordered transitions only when the semantic relational state changes.

Path:

`raw scalar measurement -> uncertainty interval -> qualitative relation state -> persistent directional relational flow`

## Integration falsification result

Local equivalent execution:

`oasis M->O->f integration v0.5: 5/5 tests passed`

The integration falsification confirms:

1. first observation remains indeterminate rather than guessed;
2. numeric fluctuation inside measurement uncertainty does not create a semantic transition;
3. non-overlapping interval movement produces an ordered `indeterminate -> approaching` transition;
4. repeated approaching evidence continues the same flow generation;
5. a clear reversal produces `approaching -> receding` inside that same ordered flow.

During integration, the first draft test exposed an API mismatch (`update` vs the actual v0.4 `ingestObservation`, and incorrect expected snapshot field names). The test was corrected against the real v0.4 interface before execution. This is recorded because implementation-fidelity failures must not be hidden by a passing conceptual test.

This integration does not define relational closure or completed experience `e_i`.

## Remaining limit

The adapter currently handles a narrow scalar-trend relation, especially pairwise distance. It does not yet infer higher-order social, causal, functional, or semantic relations from raw measurements.
