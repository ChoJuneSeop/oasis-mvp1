# OASIS Blind Historical Flow Replay v1 — preregistered protocol

## Status

This document is frozen before the first run of the experiment. If the protocol is changed after results are observed, the changed version must be treated as a new experiment.

## Purpose

This first historical-flow run is an implementation/mechanism validation, not a claim of OASIS superiority and not a causal test of whether an OASIS action would have changed real history.

The narrow question is:

> With the same historical fact multiset and the same current fact, does preserving directed relational order change the reconstituted current relational field and the possibility structure? Can a strong ordered relational-memory comparator reproduce the same difference?

The historical outcome is used only as the next reality disclosure. It is not a target, reward, success label, danger label, or answer key.

## Pre-experiment kill search

The experiment is necessary only for claims stronger than “history matters.” Existing path-dependence and process-tracing research already establishes that historical sequence can matter. Therefore this run cannot support novelty from history dependence alone.

LLM retrospective evaluation also has a known temporal-leakage problem: a model may internally know post-cutoff outcomes even when instructed to reason from an earlier date. This v1 mechanism test therefore uses a strict anonymized relational representation and does not claim an LLM forecasting result. A later model-facing replay must include claim-level future-information auditing.

Relevant prior work reviewed before execution:

- Jackson & Kollman, “Modeling, Measuring, and Distinguishing Path Dependence, Outcome Dependence, and Outcome Independence,” Political Analysis (2017).
- Dowding, “Process Tracing: Causation and Levels of Analysis,” Oxford Handbook of Philosophy of Political Science (2023).
- Liu et al., “ExAnte: A Benchmark for Ex-Ante Inference in Large Language Models,” EACL (2026), DOI 10.18653/v1/2026.eacl-long.72.
- Zhang, Chen & Stadie, “All Leaks Count, Some Count More: Interpretable Temporal Contamination Detection in LLM Backtesting” (2026).
- Zhang & Stadie, “Temporal Leakage in LLM Backtesting: Measurement, Validation, and Adjusted Scores” (2026).

## OASIS pre-experiment four-axis audit

### 1. Success-value audit

PASS by construction.

No desired historical end state is encoded. No return point, stabilization target, danger target, accuracy target, or preferred action is defined.

### 2. Evaluation-criterion audit

PASS by construction.

The run records structural traces only: current fact, reactivated completed experiences, directed relational field, derived possibility relations, one realized selection if internally generated, and any minimum baseline intervention required to keep an arm running.

Counts may be printed descriptively but no count is interpreted as “better.”

### 3. Flow audit

PASS by construction.

Facts are disclosed one phase at a time. The current field is reconstructed after each new historical fact. Later historical phases are unavailable to the engine until disclosed. The experiment does not freeze the heterogeneous event as a terminal state.

### 4. Implementation audit

The existing `relation-field.js` FAILS the current theory audit and is excluded from this experiment. It contains fixed age/risk thresholds and collapses relation direction through a sorted pair key.

The v1 historical-flow engine therefore has these hard constraints:

- no danger scalar;
- no risk threshold;
- no time-to-live/episode expiry;
- no fixed success score;
- no sorted undirected pair key inside OASIS-Full;
- relation direction is retained;
- relation order is retained;
- the current relational field is reconstructed from the current flow, rather than stored as a permanent score;
- unrealized relational possibilities are regenerated from the currently reconstituted field rather than kept as permanent weighted objects;
- future historical facts are not consulted by the choice generator.

## Historical case v1

The first case is the 1911 Second Moroccan / Agadir Crisis, chosen as a real multi-actor relational sequence with intervention, interpretation, third-party action, public signaling, negotiation, and settlement.

The engine receives anonymized actors and sites only. The source mapping is kept in the dataset metadata for researcher audit but is not part of the engine's active input.

Primary/secondary chronology basis:

- Jean-Marc Delaunay, “Moroccan Crises 1905–1911,” 1914-1918-online: French intervention at Fez in April–May 1911; Spanish occupation of Larache in early June; German dispatch of the Panther to Agadir on 1 July; exclusion of Spain from Franco-German talks; resolution on 4 November 1911.
- U.S. Office of the Historian, FRUS 1911 and Paris Peace Conference historical documents: documentation of the 4 November 1911 Franco-German agreement.
- Historical Journal literature on the 21 July 1911 Mansion House speech for the British public signal during the crisis.

## Experimental arms

1. `oasis-flow`
   - retains directed event relations and event order;
   - reconstructs the currently participating historical relation field by walking backward through completed relations from current participants;
   - may form new relational possibilities only from temporally composable directed relations present in that current field;
   - if at least one possibility is internally formed, one is realized without an external success ranking.

2. `ordered-relational-memory`
   - strong comparator;
   - retains the same directed order and uses the same current-conditioned backward relational reconstruction;
   - does not perform OASIS relational recombination.
   - If this comparator reproduces C1/C2/C5 effects, those effects are not unique to OASIS.

3. `unordered-relational-memory`
   - retains relations but removes temporal-order dependence when reconstructing the connected historical field.

4. `undirected-ordered-memory`
   - retains temporal order but removes relation direction for its comparison signature.

5. `no-relation`
   - retains the current disclosed fact but does not reactivate historical relation structure.

## Same-facts/order ablation

The canonical historical sequence is compared with a control sequence containing the same disclosed fact multiset but with two adjacent earlier facts exchanged. The swapped sequence is a formal ablation, not a claim that the counterfactual order historically occurred.

The current probe fact after those histories is identical in both arms.

This tests whether observed divergence can be traced specifically to relation order rather than different available factual content.

## Direction ablation

A second formal control reverses one selected earlier directed relation while keeping its endpoints and relation label available for comparison. This is an implementation falsifier for accidental undirected treatment; it is not interpreted as a historical counterfactual claim.

## Minimal Baseline Intervention Principle

No system receives an extra condition while it can continue from its own mechanism.

If an arm cannot form any next selection at a phase, the harness may provide only the minimum common continuation instruction: follow one relation contained in the current disclosed fact. Every such intervention is explicitly recorded.

An intervention is never counted as internally generated model behavior.

## Observations, not success metrics

For every phase and arm record:

- disclosed historical fact ID;
- currently reactivated completed-experience IDs;
- directed relation-field trace;
- generated relational possibilities;
- internally realized selection, if any;
- whether minimum baseline intervention was required;
- change from the immediately preceding current flow.

After the run, results may be described as return, continuation, transformed flow, newly formed relation, repeated structure, or other trajectory descriptions, but none is predeclared as success.

## Falsification conditions

- If `oasis-flow` produces the same current relational field and possibility structure after the order ablation, C1/C5 receive no support from this mechanism run.
- If `ordered-relational-memory` reproduces the same relational-history effects, history sensitivity is not OASIS-unique.
- If direction reversal does not alter the OASIS structural trace where the reversed relation participates, the implementation has failed to preserve direction.
- If a supposedly new possibility is already explicitly present in the disclosed history, it does not count as structural recombination.
- If any future historical phase contributes to a pre-disclosure output, the run is invalid.
- If a fixed danger/success/stability threshold enters the OASIS engine, the run is invalid.

## Scope boundary

This v1 experiment can test implementation consistency for relational-order reconstitution, selective reactivation, path dependence, and structural recombination.

It cannot establish that an OASIS-selected action would have changed the actual next historical reality, because the actual historical stream is not causally generated by the experimental agent. Choice-to-reality rewriting must be validated separately in an interactive environment.
