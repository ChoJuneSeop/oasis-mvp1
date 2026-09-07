# CR-02 Joint vs Individual Causal Attribution — Corrected Result

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Canonical production conditions: unchanged
Corrected workflow: `OASIS CR-02 Joint Individual Causal Attribution 120k v2`
Run: `34078199598`
Job: `101608332951`
Artifact: `10002846695`

## Why v2 was required

CR-02 v1 is preserved as a failed validity run. It produced `full shadow choice mismatch = 2`.

Code audit identified two shadow-semantics defects:

1. Production `choose()` runs `refreshHidden()` immediately before `evalP()`, while the v1 shadow evaluated `evalP()` without reproducing that current-state transition.
2. `sig.choice` can be an internal `hidden:*` token, but production resolves that token to the hidden story's terminal place and records the actual choice as `P.target`. V1 compared these two different semantic levels directly.

V2 corrected only the validation harness:

- shadow path: `refreshHidden -> evalP`
- all hidden-state side effects are restored after every shadow
- decision-signature comparisons retain raw `sig`
- choice-level comparisons use the resolved actual production target

Production `relation-field.js`, reality stream, canonical windows, and 120k horizon were not changed.

## Validity

- production replay mismatch: 0
- full-shadow actual-target mismatch: 0
- duplicate decision-footprint equivalence violations: 0

Therefore the v2 decomposition is accepted as the current CR-02 result.

## Joint effects

- decisions with latent processes available: 1,967
- same-current joint latent-set decision-signature differences: 297
- same-current joint latent-set actual-target differences: 204
- mean active process identities at changed-decision moments: ~692.623

## Individual identity attribution

Across the 297 changed-decision moments:

- moments containing at least one individually necessary process: 1
- moments containing at least one individually sufficient process: 297
- moments with no individually necessary process but at least one individually sufficient process: 296
- interaction-only moments with no individually sufficient process: 0

Across the 204 actual-target-change moments:

- moments containing an individually necessary process: 0
- moments containing at least one individually sufficient process: 204
- no-necessary but individually sufficient / redundant-overdetermined moments: 204
- interaction-only moments: 0

Occurrence counts across all changed-decision moments:

- active identity occurrences: 205,709
- individually necessary decision occurrences: 1
- individually sufficient decision occurrences: 81,124
- individually necessary actual-target occurrences: 0
- individually sufficient actual-target occurrences: 50,402

## Group-level results

Relation-key and `key + sorted place-set` decision-footprint grouping produced the same aggregate group count in this run:

- key groups tested: 1,362
- footprint groups tested: 1,362

Group occurrences:

Decision signature:
- necessary groups: 248
- sufficient groups: 645

Actual target:
- necessary groups: 167
- sufficient groups: 375

The equality of aggregate key/footprint counts is an observation in this run, not a general invariant.

## Interpretation

### Supported within this same-current harness

The broad latent layer's behavioral effects are overwhelmingly redundant / overdetermined at the process-identity level.

`overdetermination` means that multiple available causes can independently support the same effect, so removing one cause often leaves the effect unchanged.

For the 204 actual-target differences, every changed choice had at least one process that could reproduce the full target by itself, but none of the individual process identities was necessary under leave-one-out removal.

This is not evidence that individual processes are irrelevant. It is evidence that many process identities are substitutable in the current implementation.

### CR-03 preregistered precondition failed to arise

CR-03 was preregistered specifically for moments where:

- the full latent set has an effect, AND
- no individual process is sufficient.

CR-02 v2 observed zero such moments for both decision-signature and actual-target effects.

Therefore CR-03 is **NOT RUN — NECESSITY KILLED BY CR-02 RESULT**.

Running the preregistered CR-03 despite zero eligible cases would be post-hoc experiment forcing.

## New unresolved question

The next necessary causal question is not minimal conjunctive support. It is:

> Is the observed redundancy explained merely by repeated episode identities with the same decision footprint, or can distinct relation-process structures independently reproduce the same current decision/actual target?

This requires a dedicated redundancy-source decomposition before any stronger OASIS causal interpretation.

## Evidence boundary

CR-02 v2 establishes same-current necessity/sufficiency behavior in the current implementation only.
It does not establish:

- unique actual causation
- longitudinal outcome causation
- future relation rewrite
- production O1 noncommutativity
- responsibility-axis identity
- external generalization
