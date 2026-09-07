# OASIS Causal Research System v1.0

Date: 2026-09-07
Core baseline: OASIS Integrated Core v2.0 (unchanged)
Research layer: additive, read/audit-first, production-safe.

## Purpose

The system does not reduce causality to `A -> B`. It traces the actual relational process:

`formation -> non-current/latent -> contextual reactivation -> participation -> possibility/decision structure -> one realized choice -> outcome -> future relation rewrite`.

The research target is the OASIS in the current flow, not the OASIS at a fixed coordinate.

## Architecture

1. Reality Flow Observer
2. Relation/Process Recorder
3. Current-Latent Transition Tracker
4. Contextual Reactivation Tracker
5. Participation Trace
6. Decision-Structure / Single-Choice Trace
7. Outcome / Relation-Rewrite Trace
8. Long-Horizon Causal Ledger
9. Shadow Counterfactual Engine
10. Right-Censoring Manager
11. Falsification Engine
12. Evidence Grader

## Production boundary

The production world remains the only realized trajectory. Research shadows are analysis-only and are forbidden from feeding state back into production.

`production -> audit/adapter -> research traces`

not

`shadow -> production`.

## Process identity

Research identity uses the existing episode identifier:

`episodeId = createdTick | relationKey | fromTickA | fromTickB`

This identifier is a research/audit identity, not a claim that affinity itself is a permanently scored object.

## Required trace stages

For each process identity, record as available:

- compose / formation
- latentize
- reactivate
- noncurrent
- select-participation
- outcome
- field-spiral / next-judgment structural rewrite
- joint counterfactual decision-difference membership
- end-of-horizon censoring status

## Causal contribution representation

Do not collapse contribution into one scalar. Represent it as a vector/state record:

- reactivated
- participated
- changedDecisionStructure
- changedActualChoice
- changedOutcome
- changedFutureRelationStructure
- contributionScope: individual | joint-set | unknown

## Right censoring

A process that has not reactivated by the observation horizon is `not observed by horizon`, not `never reactivates`.

A process still current at the end is censored with respect to its next non-current transition.

## Non-anticipatory constraints

The following invalidate an experiment:

1. future information used at time t
2. pre-scheduled reactivation time
3. random activation used as a substitute for unpredictability
4. non-currentness implemented as deletion
5. retrieval equated with currentization
6. currentization equated with causal choice contribution
7. shadow result written into production state
8. failed/negative experiment overwritten by a tuned successor

## Evidence ladder

A process claim is upgraded only in this order where applicable:

1. code path exists
2. event observed
3. identity continuity observed
4. participation observed
5. joint or individual counterfactual contribution observed
6. outcome difference observed
7. later relation/judgment rewrite difference observed
8. replicated under long horizon / alternative seeds or worlds
9. generalization tested outside the current harness

Skipping levels must be stated explicitly.

## Experiment protocol

Before every experiment:

1. kill-search prior art and necessity
2. freeze hypothesis and scope
3. freeze primary statistic and controls
4. run canonical compatibility guard
5. execute production trajectory unchanged unless intervention is the explicit experimental treatment
6. preserve raw audit
7. grade result: OBSERVED / SUPPORTED / REFUTED / UNVALIDATED
8. append result; never rewrite a failed predecessor into success

## Current system implementation mapping

Existing `relation-field.js` already emits the following opt-in audit events:

- compose
- latentize
- reactivate
- noncurrent
- select-participation
- outcome
- field-spiral

Existing `tools/latent-relation-store-validation.mjs` produces streamed audit JSONL plus same-current whole-latent-layer counterfactual decision differences.

The v1.0 research system adds a causal trace assembler and invariant validator over these existing artifacts rather than replacing the production relation-field implementation.

## Scope boundaries

- O1 full production noncommutativity: not assumed.
- O2 non-currentness: auditable.
- O3 contextual reactivation: auditable; individual causal attribution remains separate from joint-set attribution.
- O4: enforced as a design constraint; distinct behavioral effect not assumed.
- responsibility axis: not equated with danger.
- unrealized possibility causal force: not assumed.
- spiral: treated as long-term emergent structure, not an independent operator.
