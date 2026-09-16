# Stage 2 — Concept and theoretical design

## Dynamic responsibility
Responsibility is not a permanent candidate score. At each current decision epoch it is reconstructed from current relational evidence and the actual candidate set.

GH-2 retains the OASIS axes:
- **U — Uncertainty**: current evidence about epistemic/observational uncertainty relevant to a candidate;
- **I — Impact**: current evidence about the scope of effects attributable to selecting or not selecting a candidate;
- **V — Vulnerability**: current evidence about exposed/dependent participants in the present relation;
- **T — Temporality**: current evidence about whether the responsibility window is closing, stable, or otherwise time-conditioned.

## No scalarization
Each candidate receives four **burden sets**, one per axis. GH-2 does not sum, weight, average, or permanently store these axes. Candidate A responsibility-dominates B only when A's burden set is a subset of B's on every axis and is strictly smaller on at least one axis. If no candidate dominates, the already-formed current possibility distribution is used only as a deterministic tie-break within the non-dominated frontier.

This is a frozen experimental operationalization, not a universal OASIS equation.

## Selected and nonselected obligations
The chosen candidate carries an explicit selected obligation record. Every rejected candidate also remains linked to a nonselection obligation. Nonselection is therefore part of responsibility provenance rather than discarded state.

## Non-stickiness
Responsibility must be recomputed from current context. A previous epoch's responsibility profile is never a production input. GH-2 includes a stale-responsibility control specifically to test this boundary.

## Causal order
`current reality -> actual possibilities -> dynamic U/I/V/T -> responsibility-bound selection -> one realization`

Responsibility before possibilities, responsibility after realization, and permanent responsibility weights are invalid GH-2 implementations.
