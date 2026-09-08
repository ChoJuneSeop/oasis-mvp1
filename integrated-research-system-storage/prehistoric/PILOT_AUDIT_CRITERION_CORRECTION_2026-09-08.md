# Native-Memory Pilot Audit Criterion Correction — 2026-09-08

## Classification

AUDIT-CRITERION DEFECT / 감사 기준 결함

This is not an OASIS execution failure, not a negative research result, and not a change to the preregistered agent/world conditions.

## Trigger

Workflow run 34175455742, job `pilot (A5, 4)` executed the full 24-cycle pilot segment successfully, but the post-run verification step failed because `allCapabilityFamiliesSeen` was false.

The only missing instantiated family for FOUNDER-1, FOUNDER-2, FOUNDER-4, and FOUNDER-5 was `consume`.

Contamination remained clean, all six founders realized 24/24 actions, and the run completed without OOM or syntax/runtime failure.

## Why the criterion was invalid

The preregistered fairness condition is that every comparison group has the same registered primitive capability grammar and the same physical world interface.

That condition was already verified by the strict parity audit:

- identical 11 registered capability IDs for all groups/founders,
- identical initial external reality,
- identical initial observation,
- identical neutral population,
- A0-A4 isolated from the OASIS kernel,
- empty initial memory and no imported reward/Q/future/target.

`allCapabilityFamiliesSeen`, however, asked a different question: whether every capability family happened to instantiate into the candidate set for every founder during one finite 24-cycle trajectory.

A physically unavailable capability in a particular current reality need not instantiate. Therefore failure to observe `consume` during a finite pilot segment is not evidence that the capability was absent from the agent's registered grammar or starved by implementation.

Conflating these two conditions creates a false audit failure and would bias the comparison against trajectories in which some physical affordances do not arise.

## Correction

For pilot pass/fail:

Required:
1. strict parity audit PASS for registered capability grammar,
2. contaminationClean == true,
3. substantiveResearchResult == false,
4. successful execution of the pilot segment.

Diagnostic only, not pass/fail:
- per-founder capability families instantiated during the finite segment.

The original A5 seed-4 trajectory is not interpreted as a substantive result. It is rerun with the identical seed and unchanged agent/world/observer/budget; only the external post-run audit criterion is corrected.

No physics, seed, Choice policy, memory mechanism, observer threshold, capability set, or research endpoint is changed.
