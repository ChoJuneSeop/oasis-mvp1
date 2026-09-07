# OASIS Causal Research System v1.0

Date: 2026-09-07
Status: current research implementation specification
Canonical semantic baseline: `../OASIS_CAUSAL_RESEARCH_SYSTEM_v1.0_ko.md`
Research layer: additive, read/audit-first, production-safe.

## Purpose

The system does not reduce causality to `A -> B`. It studies how an intervention changes the long-run sequence of:

`past relational structure + current reality -> possibility composition -> single realization -> new realized relational experience -> incorporation into accumulated past relational structure -> formation of a new relational structure -> new possibility composition`.

The key semantic rule is accumulation by realized experience. A realization does **not** overwrite or rewrite the whole relational structure. Only what is realized becomes part of actual relational history.

Unrealized possibilities are not persistent parallel future paths. They are possibilities available at a particular current moment that were not realized at that moment.

## Architecture

1. Reality Flow Observer
2. Relation/Process Recorder
3. Current-Latent Transition Tracker
4. Contextual Reactivation Tracker
5. Participation Trace
6. Possibility / Decision-Structure Trace
7. Single-Realization Trace
8. Realized-Relation Incorporation Trace
9. Subsequent Relational-Structure Formation Trace
10. Long-Horizon Causal Ledger
11. Shadow Counterfactual Engine
12. Right-Censoring Manager
13. Falsification Engine
14. Evidence Grader

## Production boundary

The production world remains the only realized trajectory. Research shadows are analysis-only and are forbidden from feeding state back into production.

`production -> audit/adapter -> research traces`

not

`shadow -> production`.

## Process identity

Research identity may use the existing episode identifier:

`episodeId = createdTick | relationKey | fromTickA | fromTickB`

This is an audit identity only. It does not imply a permanently scored affinity object.

## Required trace stages

For each process identity, record as available:

- compose / formation
- latentize
- reactivate
- noncurrent
- select-participation
- outcome / realization
- realized relational experience incorporated into actual history
- post-realization change in later judgment conditions
- joint counterfactual decision-difference membership
- end-of-horizon censoring status

The stage formerly described as `future relation rewrite` is now interpreted as **post-realization subsequent formation/change**, never as whole-structure overwrite.

## Causal contribution representation

Do not collapse contribution into one scalar prematurely. Represent at least:

- reactivated
- participated
- changedDecisionStructure
- changedActualChoice
- changedOutcome
- generatedRealizedRelationalExperience
- changedSubsequentRelationalFormation
- contributionScope: individual | joint-set | unknown

## Primary long-horizon measurement axes

1. divergenceDelay — time from intervention to first observed realized difference
2. realizedChange — difference in realized event/action/relation sequence
3. persistence — duration of the observed divergence
4. reconvergence — whether distinct flows later return to materially similar realized states
5. accumulatedRelationalEffect — difference created by incorporation of newly realized relational experiences
6. downstreamLongHorizonEffect — later differences attributable to the accumulated relational history under controlled comparison

These axes remain separate until a later validated causal-rate equation is justified.

## Right censoring

A process that has not reactivated by the observation horizon is `not observed by horizon`, not `never reactivates`.

A process still current at the end is censored with respect to its next transition.

## Non-anticipatory constraints

The following invalidate an experiment:

1. future information used at time t
2. pre-scheduled reactivation time presented as emergent causality
3. random activation used as a substitute for contextual emergence
4. non-currentness implemented as deletion
5. retrieval equated with currentization
6. currentization equated with causal choice contribution
7. shadow result written into production state
8. failed/negative experiment overwritten by a tuned successor
9. unrealized possibilities treated as directly observed persistent future paths
10. whole relational structure described as overwritten after each realization

## Evidence ladder

A process claim is upgraded only in this order where applicable:

1. code path exists
2. event observed
3. identity continuity observed
4. participation observed
5. realized choice/outcome observed
6. new realized relational experience enters actual relational history
7. subsequent relational/judgment formation differs
8. controlled counterfactual or paired-flow contribution observed
9. replicated under long horizon / alternative seeds or worlds
10. generalization tested outside the current harness

Skipping levels must be stated explicitly.

## Experiment protocol

Before every experiment:

1. freeze hypothesis and scope
2. define the intervention and control condition
3. freeze primary realized-flow statistics and controls
4. run compatibility/invariant checks
5. execute each condition forward without future leakage
6. preserve raw audit
7. measure divergence delay, realized change, persistence, reconvergence, accumulated relational effect, and downstream effect as applicable
8. use internal possibility/participation/reactivation traces only to explain observed differences
9. grade result: OBSERVED / SUPPORTED / REFUTED / UNVALIDATED
10. append results; never rewrite a failed predecessor into success

## Implementation mapping

Existing `relation-field.js` already emits opt-in audit events including:

- compose
- latentize
- reactivate
- noncurrent
- select-participation
- outcome
- field-spiral

For v1.0 research semantics:

- `outcome` is the realized event boundary.
- growth of `relationHistory` after `outcome` is evidence that a newly realized relational experience entered actual history.
- `field-spiral` is treated only as an observed post-realization change in later judgment conditions. Its historical event name does **not** mean whole relational structure rewrite.

The causal trace assembler must therefore use incorporation/accumulation/subsequent-formation terminology rather than `futureRewrite` terminology.

## Scope boundaries

- observed realized flow is the primary empirical layer.
- internal possibility composition is an explanatory model layer, not direct observation of unrealized futures.
- individual causal attribution remains separate from joint-set attribution.
- responsibility is not equated with danger.
- unrealized possibility causal force is not assumed merely because a possibility existed.
- spiral is treated as a long-term emergent structure, not proof of improvement.
- whole-structure rewrite semantics are excluded from v1.0.
