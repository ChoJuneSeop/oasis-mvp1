# GH-1 PASS / FAIL Rules

Status: `FROZEN`

## GH-1A Structural & Causal Validation

GH-1A PASS requires all valid structural runs to satisfy every hard invariant:

- Gap=NO produces zero archive access, zero records scanned and zero archive bytes read.
- Only participate=True experiences are exposed to the actual Core.
- A nonparticipant canary has zero Core exposure and does not alter the decision path.
- A participant-removal non-actuating counterfactual can change the decision path when the participant is causally relevant.
- The same Completed Experience can participate in one current context and not participate in another; no permanent participation state is inferred.
- Governance-selected possibility equals the realized possibility.
- No decision epoch performs more than one real actuation.
- No future/evaluator-label leakage occurs.
- Closure precedes Completed Experience commit.

Any hard-invariant violation is `STRUCTURAL_FAIL` or `EXECUTION_FAIL` as appropriate and GH-1B may not begin.

## GH-1B Effectiveness & Efficiency

Each preregistered metric is independently classified as:

- `SUPPORTED`: paired confirmatory evidence supports the preregistered directional/effect claim under the frozen conditions.
- `NOT_SUPPORTED`: the valid paired evidence does not support that claim.
- `INCONCLUSIVE`: the run is valid but uncertainty is too large to resolve the effect under the frozen analysis plan.

No single aggregate score or overall winner is permitted.

## Invalid-design states

Use `DESIGN_INVALID` when the preregistered scenario fails to provide the required anomaly/opportunity/candidate pipeline or when a frozen control is structurally broken before interpretable execution.

Use `DETECTOR_INVALID` when the pre-registered validity gate fails, including an always-YES/always-NO collapse on the frozen validation set.

`INCONCLUSIVE` must not be used to hide a broken design or execution failure.

## No post-hoc repair

A design-semantic change after confirmatory start requires a new version. Results obtained before such a change remain attached to the old version and are not silently pooled with the new design.
