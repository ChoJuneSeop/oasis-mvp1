# CR-03C Decision-Channel Equivalence — Result

Date: 2026-09-07
Baseline: OASIS Integrated Core v2.0 (unchanged)
Run: `34079126784`
Job: `101610897827`
Artifact: `10003136256`

## Validity

- canonical compatibility guard: PASS
- production replay mismatch: 0
- full-shadow resolved-target mismatch: 0
- CR-02 joint effects reproduced: 297 decision-signature / 204 resolved-target
- CR-03R cross-key cases reproduced: 165 decision / 77 resolved-target

## Primary result

Distinct relation keys frequently remained distinct at the **decision-consumed downstream interface** while still converging on the same current result.

### Cross-key decision-signature cases, n=165

- `CHANNEL_EQUIVALENT`: 15 = 9.09%
- `CHANNEL_EQUIFINAL`: 150 = 90.91%
- maximum unique downstream channel signatures at one moment: 4

### Cross-key resolved-target cases, n=77

- `CHANNEL_EQUIVALENT`: 14 = 18.18%
- `CHANNEL_EQUIFINAL`: 63 = 81.82%
- maximum unique downstream channel signatures at one moment: 4

`CHANNEL_EQUIFINAL` means that at least two independently sufficient relation keys produced different measured downstream decision interfaces while reproducing the same current decision/actual target.

`equifinality` = 서로 다른 경로나 조건조합이 동일한 현재 결과에 도달하는 현상.

## Which decision-consumed components differed?

Among the 150 decision-level equifinal moments:
- participant-role set differed: 2
- actionable-place set differed: 0
- place-relevance vector differed: 146
- hidden-story readiness differed: 81
- hidden-candidate set differed after refresh: 0
- member-rank matrix differed: 146

Among the 63 resolved-target equifinal moments:
- participant-role set differed: 4
- actionable-place set differed: 0
- place-relevance vector differed: 59
- hidden-story readiness differed: 42
- hidden-candidate set differed after refresh: 0
- member-rank matrix differed: 59

Raw relation-key identity and raw NPC-touch differences were excluded from the primary classification. Thus the result is not created merely by naming two relation keys differently.

## Interpretation

### Supported within this harness

CR-03R cross-key redundancy is not explained solely by relation identities collapsing immediately into one identical decision channel.

In most cross-key cases, different currentized relation structures altered relation-aware relevance/ranking and/or hidden readiness differently, yet the system still realized the same current decision or actual target.

This is **same-current equifinality evidence** in the current OASIS implementation.

### Not established

Same current result does not establish long-term equivalence.

State-abstraction/bisimulation work treats two states as safely equivalent only when their future reward/transition behavior is also equivalent under relevant actions. Predictive-state approaches likewise emphasize history-conditioned future predictions in partially observable systems.

Therefore CR-03C does not justify permanently merging the histories that currently converge.

## Next required test

CR-03L must intervene on two equifinal sufficient relation keys at the same current moment:

- preserve the same pre-branch reality,
- currentize only relation key A in branch A and key B in branch B,
- verify the immediate resolved target is the same,
- release the intervention,
- continue both branches under exactly the same future exogenous reality tape,
- observe whether current-flow state, relation history, hidden structure, future selections, outcomes, divergence/return/reappearance remain equivalent or separate over a long horizon.

No monotonic divergence is assumed.

## Evidence boundary

CR-03C remains implementation/same-current mechanism evidence. It does not yet establish:
- long-horizon path dependence
- outcome causal propagation
- future relation rewrite
- production O1 noncommutativity
- generalization
