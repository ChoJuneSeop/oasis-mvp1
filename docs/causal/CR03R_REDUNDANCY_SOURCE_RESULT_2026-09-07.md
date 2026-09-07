# CR-03R Redundancy Source Decomposition — Result

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Run: `34078727151`
Job: `101609786096`
Artifact: `10002995772`

## Validity

- production replay mismatch: 0
- full-shadow resolved-target mismatch: 0
- one-representative-per-footprint compression mismatch: 0
- canonical guard: PASS

CR-02 joint effect counts were exactly reproduced:
- decision-signature effects: 297
- resolved actual-target effects: 204

## Main result

Episode-identity redundancy is real but does not fully explain the observed overdetermination.

### Decision-signature effects, n=297

- `CROSS_KEY_OVERDETERMINATION`: 165 / 297 = 55.56%
- `SINGLE_SUFFICIENT_KEY_NECESSARY`: 128 / 297 = 43.10%
- `SINGLE_SUFFICIENT_KEY_PLUS_COALITION`: 4 / 297 = 1.35%
- `WITHIN_KEY_ALTERNATIVE_FOOTPRINTS`: 0
- `NO_SUFFICIENT_KEY`: 0

Maximum number of independently sufficient relation keys at one changed-decision moment: 7.

### Resolved actual-target effects, n=204

- `CROSS_KEY_OVERDETERMINATION`: 77 / 204 = 37.75%
- `SINGLE_SUFFICIENT_KEY_NECESSARY`: 125 / 204 = 61.27%
- `SINGLE_SUFFICIENT_KEY_PLUS_COALITION`: 2 / 204 = 0.98%
- `WITHIN_KEY_ALTERNATIVE_FOOTPRINTS`: 0
- `NO_SUFFICIENT_KEY`: 0

Maximum number of independently sufficient relation keys for the same actual-target effect: 7.

## Identity multiplicity

- all 297 changed-decision moments contained duplicate episode identities.
- no moment contained multiple distinct `key + sorted-place-set` footprints for the same relation key.
- replacing every repeated footprint with one representative episode preserved the complete full decision signature in all 297 moments.

Sufficient footprints containing duplicate identities:
- decision: 632 / 645 = 97.98%
- actual target: 371 / 375 = 98.93%

Therefore repeated episode identities are overwhelmingly common, but their multiplicity itself is behaviorally redundant at these same-current moments.

## Interpretation

### Supported

The current broad latent-store implementation contains two distinct redundancy regimes:

1. **within-relation identity multiplicity** — many historical episode identities implement the same current decision footprint; this multiplicity can be compressed without changing the current decision in the tested moments.
2. **cross-relation alternative sufficiency** — in 165 decision moments and 77 actual-target moments, two or more different relation keys can each independently reproduce the same full effect.

Thus the CR-02 overdetermination pattern is not explainable solely as duplicate copies of one relation-process footprint.

### Not yet established

A different relation key is not automatically a different downstream causal mechanism.

Production relation-field logic can map distinct keys into the same coarse decision channels, such as:
- any active relation exists
- relation is relevant to target/place
- relation touches a required NPC
- relation satisfies a hidden-story link

Therefore `cross-key sufficiency` is evidence of distinct relation identities, but **not yet evidence of distinct decision mechanisms**.

The next required experiment is a downstream decision-channel equivalence decomposition.

## Prior-art boundary

Redundant sufficient causes, overdetermination, equifinality, and multiple sufficient pathways are established causal concepts. CR-03R does not claim novelty for those concepts.

OASIS-specific research remains the longitudinal ordered chain:
completed relation-process -> non-currentness -> contextual reactivation -> current participation -> single realization -> outcome -> later relation reconstruction.

## Evidence boundary

CR-03R remains same-current implementation evidence. It does not establish:
- unique actual causation
- future divergence after convergent current choices
- outcome causal effect
- future relation rewrite
- external generalization
