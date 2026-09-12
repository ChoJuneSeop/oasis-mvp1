# OASIS-CARLA v2.2 Harness v1.1 — Core Compatibility Audit

Date: 2026-09-12
Status: PRE-CARLA / CORE ADMISSION BLOCKED

## Purpose

This audit prevents an older implementation from silently becoming the semantic definition of the current OASIS paper model. The canonical Harness v1.1 and G3.2 sidecar are already source-frozen and preflight-tested; the decision Core is evaluated separately.

## Candidate A — implementation/oasis-integrated-core-v1

Source checkpoint: `9e6d8eeed52e2eb2ec9918b374e2e179e362669d`

### Reusable structure

- current-flow observation before deliberation
- completed-experience storage
- relation/process provenance fields
- structural possibility composition
- explicit single actualization guard
- non-scalar Pareto-like responsibility frontier
- deterministic structural tie-break documented as non-semantic

### Blocking conflicts with current G3.2 theory

1. **Implicit temporal-order bias**
   `reconstituteAffinityField()` scans `closedExperiences` backward and takes a matching chain from the most recent side first. There is no numeric decay, but storage order can determine admission. Current G3.2 forbids default recency priority from replacing present relation.

2. **Binary current-flow selection gate**
   The integrated `choose()` prefers candidates whose `currentFlowSupport.size > 0` whenever any exist. Current-reality primacy is required, but this boolean gate is too strong to stand in for the whole current relational process.

3. **Completion before relation-process Closure**
   `actualize()` writes a new `closedExperience` immediately after one supplied outcome event. Current definition requires selected realization + actual application + post-realization outcome observation + relation-process Closure. Persistence/no-change/failure may complete an experience, but closure must be separately evidenced.

4. **Responsibility mismatch**
   The legacy responsibility representation is obligation/invariant-set based. The current paper baseline requires adaptive U/I/V/T as common responsibility variables, with domain-specific variables allowed dynamically. The legacy representation can inform provenance but cannot be treated as the current responsibility operator.

5. **Experience-level rather than relation-element-level participation**
   Legacy reactivation exposes whole experience support. G3.2 requires relation-element provenance, dynamic role trace, individual distribution effect, and joint/group effect without collapsing the experience to selected/rejected.

Verdict: `NOT_ADMISSIBLE_AS_CURRENT_G32_DECISION_CORE`.

## Candidate B — experiment/gamma-2.2-r-v4.6

Source checkpoint: `c2b04c43e22cee3959071fa42d1cc49262c208ef`

### Reusable structure

- flow-preserved path ablation
- latent/non-current relation provenance audit
- intervention only on re-entry path while preserving formation/storage/outcome machinery
- negative-stream retention
- explicit interpretation boundary separating path effect from universal necessity/sufficiency

### Blocking conflicts with current G3.2 theory

The relation-field implementation contains fixed implementation semantics including:

- recent relation window: last 18
- active episode cap/window: 80
- age window: 1200 ticks
- danger matching band: ±0.18
- participant rule at danger >= 0.38

These were legitimate experimental controls in that version but cannot become the current OASIS meaning. Current G3.2 prohibits fixed time/value thresholds from replacing present relational flow.

Verdict: `NOT_ADMISSIBLE_AS_CURRENT_G32_DECISION_CORE`; `ADMISSIBLE_AS_METHOD_REFERENCE_FOR_PROVENANCE_AND_PATH_ABLATION`.

## Lost CARLA Harness v1.0 decision core

Recorded SHA-256:
`cbe905fbda1eba5c85a97aa5942f8aa06444f32d9348fc93f87d7ba3912719d7`

The source is unavailable. The surviving integrity report proves leakage/purity properties and preserves output traces, but it is insufficient to reconstruct the semantic operator exactly. It therefore cannot be silently recreated from outputs or used as current source identity.

Verdict: `HISTORICAL_EVIDENCE_ONLY`.

## Admission requirements for a current G3.2 Core

A candidate Core may be connected to real CARLA only if all of the following are satisfied before execution:

- no future state, future trajectory, scenario label, trigger, seed, raw actor ID, or full map topology access;
- no fixed recency boost or old-memory decay;
- no fixed time/value threshold whose category becomes the meaning of participation or reconstruction;
- relation-element provenance instead of whole-experience selected/rejected gating;
- individual and joint/group counterfactual probes are pure;
- Participation and Reconstruction remain independent observables;
- U/I/V/T responsibility variables are present as current-process controls and are not collapsed into one permanent score;
- exactly one actual realization per decision epoch;
- Completed Experience is incorporated only after evidenced relation-process Closure;
- action/control policy and relational-memory operator are separable so that G3.2 does not confound a newly invented controller with the memory/reconstruction hypothesis.

## Gate

`REAL_CARLA_G32_EXECUTION = BLOCKED`

Reason: canonical Harness v1.1 is ready, but no surviving legacy Core satisfies the current formal definition without semantic modification. A current-compliant Core must be implemented and source-frozen as a new version before CARLA execution.
