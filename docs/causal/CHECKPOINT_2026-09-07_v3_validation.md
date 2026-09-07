# OASIS Causal Research v3 Validation Checkpoint

Date: 2026-09-07
Status: SAVED / PAUSED BY USER

## Execution state

- GitHub Actions run: `OASIS Causal Research System v3 Validation` run #10
- Run ID: `34091737854`
- Head SHA: `0e00519a15e630a45f12dac6c31d2633f188d360`
- Fixed 120,000-tick latent audit: COMPLETED SUCCESSFULLY
- Non-anticipation / canonical validation guard: PASSED
- v2 trace assembly stage: FAILED AFTER THE 120k EXPERIMENT COMPLETED
- v3 behavioral evidence assembly: SKIPPED because the inherited v2 assembly step failed
- Raw workflow artifact preserved: `oasis-causal-research-v3`
- Artifact ID: `10007182663`
- Artifact size: 49,001,995 bytes

## Failure classification

The observed failure is an analysis-pipeline scale bug, not an experimental or theoretical failure.

The inherited v2 assembler aggregates a very large `allReappearanceGaps` array and applies `Math.max(...array)` / `Math.min(...array)` style spread expansion. At approximately one million-scale reappearance-gap entries, this can exceed the JavaScript argument/call-stack limit. The 120k audit itself completed before this failure.

Important distinction:
- Experimental execution: SUCCESS
- Raw evidence generation: SUCCESS
- Post-run inherited v2 assembly: SCALE FAILURE
- No claim of H0/H1/H2 validation is made from the failed assembly stage.

## Preliminary raw-data finding already identified

From 297 same-state counterfactual comparisons:

- resolved-choice changes: 204 / 297
- participant-leader changes: 284 / 297
- candidate-destination-list changes: 0 / 297

Interpretation at this checkpoint:

The current evidence does **not** show that relational information expanded the candidate destination list in these comparisons. It instead indicates that, within the same candidate destination set, relational information altered participation and/or selection pathways. This distinction must be preserved in later H0 interpretation.

## H1 structural lineage path identified in implementation

The current implementation exposes a stronger lineage route for H1 than simple storage-growth counting:

`outcome -> newly realized relational event -> compose with prior relation -> later select-participation -> subsequent outcome / field-spiral signal`

Relevant implementation hooks already present in `relation-field.js` include:

- `outcome`
- `compose`
- `reactivate`
- `select-participation`
- `field-spiral`

This path should be analyzed as a genealogy of realized experience entering the existing Past Relational Structure and later participating in downstream behavior. It has **not yet been promoted to a validated H1 result** at this checkpoint.

## Evidence discipline preserved

At pause time:

- H0: not yet finally graded from the new v3 run
- H1: structural validation not yet completed
- H2: integrated validation not yet completed
- H3: prior implementation-level reappearance evidence remains separate from new v3 grading
- H4: OPEN_INQUIRY
- No failed post-processing step is to be reinterpreted as theory failure.
- No preliminary association is to be upgraded to necessity, sufficiency, or general causal superiority.

## Resume point

On resume, continue from this exact order:

1. Replace spread-based min/max aggregation in the inherited v2 assembler with streaming / iterative aggregation.
2. Re-run assembly on the already generated 120k artifact where feasible; do not regenerate the experiment unless required.
3. Run the v3 behavioral evidence assembler.
4. Grade H0 separately for:
   - candidate-set composition,
   - participation changes,
   - selection changes.
5. Build the H1 lineage analyzer over `outcome -> compose -> select-participation -> downstream structure`.
6. Only after H0/H1 evidence is stable, proceed to H2.

This checkpoint intentionally freezes findings without declaring new canonical validation status.
