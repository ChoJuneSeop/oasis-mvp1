# OASIS v3 120k Preliminary Reanalysis — 2026-09-07

상태 / Status: PRELIMINARY EVIDENCE RECORD — NOT FINAL PAPER RESULT

## 1. Run provenance

- GitHub Actions run: `34091737854` / v3 validation run #10
- Fresh canonical horizon: 120,000 ticks
- Experimenter intervention after initialization: 0
- Hard causal invariant anomalies in raw audit recheck: 0
- Raw audit generated successfully.
- Original v2 report assembly failed after data generation because the old assembler attempted spread-based `Math.max(...allReappearanceGaps)` / `Math.min(...)` over approximately one million gap values. This is an analysis-scale implementation failure, not an experimental invariant failure.
- Raw artifact was preserved and independently re-read.

## 2. Raw longitudinal counts

- completedTick: 120,000
- latent relational processes: 9,805
- total audit events: 1,954,736
- latentizations: 9,805
- reactivations: 969,111
- noncurrent transitions: 961,790
- select-participation events: 1,988
- outcomes: 1,997
- composed relational episodes: 10,045
- field-spiral events under the existing implementation signal: 0

## 3. Same-current-state relational ablation

Analysis-only shadow comparison temporarily disabled the reactivated past-relation layer while preserving the same production current state.

- comparison rows: 297
- action/destination candidate-list changes (`cands`): 0
- participation-leader changes: 284
- selected-action changes: 204

### Interpretation

The implementation field `cands` is an action/destination candidate list and is **not** the theoretical `행동 결정 관계 후보군 / Behavioral Decision Relational Candidate Set`.

Therefore this result must not be stated as evidence that relational participation expanded the action candidate list in these 297 comparisons.

The supported narrow statement is:

> Under the tested canonical harness and fixed current state, removing reactivated past relations changed the participation leader in 284/297 comparisons and the selected action in 204/297 comparisons.

This provides a partial within-harness observation that past relational structure can participate in behavioral decision formation. It does not validate Individual Disposition or the full H0 factor interaction.

## 4. H1 structural incorporation genealogy

A separate genealogy was reconstructed as:

`outcome`
→ newly realized relation-history delta
→ `compose` between the current realized relation and a prior relation
→ later `select-participation` containing the composed relation key

Observed:

- realization-to-compose structural formation links: 10,045
- links later observed in actual selection participation: 9,981
- within-horizon later-participation rate: approximately 99.36%
- 64 late/remaining formation links were not used to assert disappearance or failure beyond the observation horizon.

### Preliminary H1 interpretation

This is stronger than simple storage growth. Within the canonical harness, a realized experience is observed participating with prior relations in formation of a new relational composition, and the resulting composition is later observed participating in actual selection for 9,981 traced cases.

Provisional grade:

`SUPPORTED_WITHIN_HARNESS_FOR_FORMATION_AND_LATER_PARTICIPATION`

This is not universal causal validation and does not imply whole-structure rewrite.

## 5. H3 relational reappearance

From the preserved v2 trace output generated before the scale failure:

- latent traces: 9,805
- traces with reappearance: 9,781
- traces with repeated reappearance: 9,587
- `NOT_REOBSERVED_WITHIN_HORIZON`: 24
- reappearance gap observations: 969,111
- observed gap min: 0 ticks
- observed gap max: 4,089 ticks
- observed gap mean: approximately 141.94 ticks

Preliminary grade remains bounded:

`OBSERVED_IMPLEMENTATION / CAUSAL HYPOTHESIS REQUIRES REPLICATION`

No claim of infinite or permanent relational persistence is permitted.

## 6. H2 status

Current raw audit does not carry a whole Past Relational Structure version/provenance identifier linking a newly formed full structure to later current-reality queries.

Therefore H2 remains:

`UNVALIDATED — WHOLE-STRUCTURE PROVENANCE INSTRUMENTATION REQUIRED`

See `EX02_WHOLE_PAST_STRUCTURE_PROTOCOL_v3.0.md`.

## 7. H4 status

`OPEN_INQUIRY`

The 24 not-reobserved traces are reported only as `NOT_REOBSERVED_WITHIN_HORIZON`.

## 8. Individual Disposition status

The run used the `NONE` disposition control condition.

Therefore:

- disposition necessity: UNVALIDATED
- disposition effect: UNVALIDATED
- disposition sufficiency: NOT ASSUMED

## 9. Current H0 boundary

Preliminary result supports only the relational component of H0 within the canonical harness:

- Past relational participation: partially observed
- Current reality: held fixed in the relational ablation; its independent contribution not identified by this comparison
- Individual Disposition: unvalidated
- native theoretical Behavioral Decision Relational Candidate Set trace: still required
- no single factor is established as a sufficient condition

## 10. Required next validation

1. Complete scale-safe replication run.
2. Add native relational-candidate provenance trace for H0.
3. Preserve H1 genealogy as an explicit paper result only after replication.
4. Add Past Relational Structure version/provenance instrumentation for H2.
5. Run disposition `NONE` versus minimum-prior comparison only after the structural core is stable.
