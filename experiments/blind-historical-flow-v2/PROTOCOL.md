# Blind Historical Flow Replay v2 — Protocol Lock

## Status
Paper-validation experiment. This protocol is frozen before execution.

## Purpose
Observe the whole OASIS flow under an externally verifiable historical stream without treating the historical outcome as a target.

Primary question:
When the same historical current is revealed sequentially, does OASIS reconstitute completed relational experiences into the present in a way that changes participation, possibility structure, and single-choice formation beyond (a) a current-event-only comparator, (b) a temporal relation-graph comparator, and (c) ordered episodic retrieval?

This experiment does NOT test whether OASIS predicts the historical future correctly.
This experiment does NOT causally test choice -> next reality rewriting, because the subsequent historical stream is exogenous to the model's hypothetical choice.

## Kill-search conclusion
Prior work already covers process tracing, path dependence, temporal knowledge graphs with multi-relational/multi-hop reasoning, state-aware episodic memory, event-centric logical memory, and temporal leakage in LLM backtesting. Therefore the following are NOT novel evidence by themselves:
- history sensitivity;
- order sensitivity;
- multi-hop relation reasoning;
- retrieving a relevant past experience;
- producing a different action after history changes.

A stronger OASIS-specific observation requires tracing the full chain:
current flow -> relational field reconstitution -> completed-experience re-participation -> participation state -> open possibility structure -> single choice.
Even then, if the strong temporal-graph or episodic comparator reproduces the same structure, OASIS uniqueness is not established.

## Historical case
One anonymized 1898 colonial confrontation is used as the first case only. No generalization is allowed from this single case.

Private source mapping (not part of blind agent payload):
- expedition arrived at the river outpost on 10 July 1898 and claimed the post;
- a local attack on 25 August was repelled;
- the opposing force defeated the regional regime on 2 September;
- the opposing commander arrived at the outpost on 19 September and demanded withdrawal;
- the expedition's report reached the home government during October while logistical and force asymmetries were evident;
- evacuation instructions were issued in early November;
- the expedition departed in December.

Historical sources used for chronology audit:
- Oxford Companion to British History / Encyclopedia.com, “Fashoda crisis”;
- Encyclopedia.com, “Jean Baptiste Marchand”;
- Encyclopedia of the Modern Middle East and North Africa / Encyclopedia.com, “Fashoda Affair”.

## Blindness
The runtime payload contains no country names, personal names, place names, event name, or calendar dates.
Actors and locations are represented as Authority-A, Expedition-A, Force-B, Region-Q, Route-W, etc.
The historical mapping is never used as a scoring key.

## Common information rule
Every system receives the same blind facts, relations, participants, and atomic executable affordances at each reveal.
Atomic affordances are world-interface actions only. They are not ranked, labeled good/bad, or assigned success probabilities.

## Common completed-experience warmup
Before the test window, every system receives the same two completed historical episodes:
1. establish the outpost after arrival;
2. defend the outpost against the local attack.
Each warmup event exposes only the historically realized atomic action, so it seeds an identical completed-experience set rather than testing choice quality.
Warmup steps are excluded from interpretation of model preference.

## Test stream
After warmup, the historical stream is revealed one step at a time. At each step:
1. observe the new current reality;
2. reconstruct the system's internal relation/memory structure;
3. generate currently available possibility structure;
4. form one choice if the system can do so;
5. record the full trace;
6. reveal the next historical event exogenously.

The hypothetical model choice is NOT treated as the cause of the next historical event and is NOT stored as a completed experience during the test window.

## Comparators
1. OASIS Reference Core — authoritative paper-validation implementation.
2. Current Event — only relations introduced by the latest reveal; no completed-experience reactivation.
3. Temporal Graph — accumulated current relation graph; no completed-experience reactivation.
4. Ordered Episodic — temporal graph plus only the most recent completed experience sharing entities with the current field; no relational-chain reconstitution across multiple completed experiences.

The three comparators deliberately reuse the same execution/choice envelope where possible. This makes them stronger ablations: differences cannot be attributed merely to a different score function.

## OASIS pre-experiment four-axis audit
1. Success-value audit: PASS. No historical outcome, return state, stability, accuracy, or preferred action is a success target.
2. Evaluation audit: PASS. No reward, accuracy, balanced accuracy, convergence, churn, or historical-match score enters OASIS judgment.
3. Flow audit: PASS. The case is revealed sequentially; no single snapshot is the experimental object.
4. Implementation audit: PASS-CONDITIONAL. The harness must import `src/oasis-reference-core.mjs`; it must not import `relation-field.js` or insert thresholds/scores into OASIS. CI must verify this before the run is accepted.

## Minimal baseline intervention
If a system cannot continue because no executable possibility exists, record `continuationRequired=true` first.
Only then may the harness add an identical minimal continuation condition to all affected systems, marked explicitly as an intervention event.
No intervention is planned in advance for this case.

## Observations retained
Per system and reveal:
- seed/current entities;
- relation signature with direction/order;
- reactivated completed-experience IDs;
- current and historical participation;
- all possibility IDs and step sequences;
- responsibility unresolved/violations;
- single choice, if any;
- whether a non-semantic realization tie was required;
- structural novelty marker;
- continuation requirement.

## No predeclared winner
No result category is named PASS/FAIL for OASIS performance.
After the run, differences are described first. Only afterward are claims mapped to C1–C5 and prior-art alternatives.

## Evidence boundary
This experiment can contribute evidence about relational-history reconstitution, selective reactivation, possibility formation, and path-dependent choice formation (C1/C2/C5-related observations).
It cannot by itself establish C3 choice-caused reality rewriting or C4 causal emergence of new world structure, because the historical continuation is external to the hypothetical choice.
Those require a separate interactive-world experiment.
