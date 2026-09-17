# GH-4 Code Fit Analysis

Status: STAGE_5_CODE_ANALYSIS_PASS

## Existing frozen capabilities reused unchanged

`GovernanceHarnessV04` already provides the execution order required by GH-4:

- present-flow capture,
- declarative current-flow Gap judgment,
- archive search only when Gap=YES,
- one participation decision per retrieved candidate,
- immutable participating view exposed to Core,
- responsibility binding after Core exposes actual possibility identifiers,
- `realize_selected` causal binding,
- one real actuation latch,
- authoritative post-observation and Closure,
- typed revalidation,
- atomic history/provenance/feedback/Completed-Experience commit,
- transactional rollback support.

The Core and canonical harness therefore do not require modification.

## Additive GH-4 requirements

### 1. Dynamic decision archive policy

GH-3 intentionally kept newly committed CEs decision-ineligible. GH-4 needs a research-only `IntegratedHistoryPort` that can permit run-created CEs to become searchable in later epochs while retaining strict `completed_tau < decision_tau` admission.

The same port also provides the `H2_FROZEN_NEW_CE` control where run-created experiences are committed but remain decision-ineligible.

### 2. Relational enrichment at commit boundary

`GovernanceHarnessV04` creates a generic completed experience containing the history-entry id and selected possibility. The GH-4 port must enrich that committed CE with experiment-local relational metadata needed for later contextual participation. This enrichment occurs only inside the HistoryAccessPort commit boundary; it does not alter Core, the realized history entry, governance provenance or prior feedback.

Enrichment fields are restricted to data available after Closure: relation id, selected possibility, completed scope density and a historical relation record whose provenance remains the newly committed CE provenance.

### 3. Integrated participation operator

A GH-4 operator must:

- decide separately for every retrieved candidate,
- use current relation/scope only,
- apply provenance-matched REVISED feedback only in matching scope,
- avoid permanent scores and thresholds learned from results,
- support the `H5_NONSELECTIVE_HISTORY` ablation without changing archive access.

### 4. Integrated responsibility operator

A GH-4 operator must derive current U/I/V/T candidate burden sets from present observation and current participation state. It must use Pareto set dominance, not a weighted sum. The `H4_RESPONSIBILITY_RECORD_ONLY` arm computes the same current burden structure but does not bind its selected result to realization.

### 5. Persistent long-horizon runner

Each arm must create one Core, one GovernanceHarnessV04, one HistoryAccessPort and one host-flow object, then execute the entire horizon without reset. Arm isolation is provided by fresh OS processes.

## Admission conclusion

No frozen Core, canonical harness, GovernanceHarnessV04, GH-1/GH-1L, GH-2 or GH-3 code needs modification. GH-4 can be implemented additively under `research/governance_harness_gh4/` plus one GH-4 CI workflow.
