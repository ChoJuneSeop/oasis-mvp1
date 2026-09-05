# OASIS M -> O -> f Integration Note v0.5

This note records the intended integration contract between:

- `oasis-measurement-observation-v0.5.js`
- `oasis-relation-flow-v0.4.js`

The measurement adapter emits directional qualitative relational observations with raw evidence and uncertainty preserved. The flow tracker must then treat repeated semantic state as continuity and only append ordered transitions when the semantic relational state changes.

Expected path:

`raw scalar measurement -> uncertainty interval -> qualitative relation state -> persistent directional relational flow`

The integration falsification checks:

1. first observation remains indeterminate rather than guessed;
2. numeric fluctuation inside measurement uncertainty does not create a semantic transition;
3. non-overlapping interval movement produces an approaching transition;
4. repeated approaching observations continue one flow;
5. a clear reversal produces an ordered receding transition in the same flow.

This integration does not define relational closure or completed experience `e_i`.
