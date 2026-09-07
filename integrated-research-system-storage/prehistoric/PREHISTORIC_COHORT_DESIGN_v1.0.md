# OASIS Prehistoric Full-Flow Cohort Design v1.0

Date: 2026-09-08
Status: Pre-experiment cohort definition
Branch: `storage/oasis-integrated-research-system-v1.0`

## 1. Scope

This document defines the experimental cohort and shared capability group for the clean prehistoric OASIS environment.

It does **not** import legacy prehistoric decisions, reward/Q values, relationEpisode buffers, historical action logs, old affordance candidate lists, or contaminated Blind Historical artifacts.

Legacy prehistoric code may be consulted only to reconstruct neutral physical-world ideas such as resource types, movement, bodily needs, proximity, and environmental change. It is not an initialization source for agent memory or decisions.

## 2. Experimental cohort

Total: 6 OASIS agents.

All six use the same:
- `OASISMathKernelV1Canonical`;
- observation interface;
- physical body constraints;
- starting capability group `B_t`;
- life-value constraint;
- Responsibility Axis implementation;
- world physics;
- initial memory state `H_0 = empty`;
- initial relation history `R_0 = empty`.

The only intended between-agent difference is the explicit personality disposition attached to Choice Axis interpretation.

### Common experimental Choice Axis layer

All six agents must be capable of closing a choice without using reward, success labels, or a pre-ranked answer list.

For this prehistoric cohort, the common experimental Choice Axis samples from the already constructed admissible possibility distribution `P_t` rather than selecting `argmax P_t`.

This is an experiment-specific closure mechanism, not a claim that stochastic sampling is the universal OASIS Choice law.

The same run seed and same observation reproduce the same sample; a different exogenous run seed may realize a different trajectory.

### OASIS-N0 — Neutral / 무개성

No personality disposition.

- receives no preference score;
- receives no target behavior;
- does not restrict the admissible candidate set according to personality;
- uses only the common non-argmax stochastic Choice Axis over already admissible possibilities.

### OASIS-P1 — Explorer / 탐색형

Disposition: among admissible possibilities, first retain the structurally grounded possibilities that expose the agent to the greatest currently unincorporated relation/participation expansion, then use the same common non-argmax sampling rule inside that subset.

This is not a novelty reward and does not alter life constraints or Responsibility.

### OASIS-P2 — Cooperative / 협력형

Disposition: among admissible possibilities, first retain those involving the greatest number of other currently available participants, then use the same common sampling rule inside that subset.

This is not a social reward and does not assume cooperation is better.

### OASIS-P3 — Self-Reliant / 자립형

Disposition: among admissible possibilities, first retain those requiring the fewest additional participants, then use the same common sampling rule inside that subset.

This is not an isolation objective and does not remove existing relations.

### OASIS-P4 — Continuity / 지속형

Disposition: among admissible possibilities, first retain those using the greatest amount of currently re-currentized relational structure, then use the same common sampling rule inside that subset.

This does not make old relations permanently active and does not equate recurrence with correctness.

### OASIS-P5 — Compositional / 구성형

Disposition: among admissible possibilities, first retain those with the deepest valid multi-step capability/relation composition, then use the same common sampling rule inside that subset.

This is not a complexity reward and does not assume longer sequences are better.

## 3. Shared capability group B_t

These are physical/interaction capabilities, not pre-enumerated answers or action candidates.

Shared by all six agents:

1. `observe`
   - Korean: 주변 현실을 관측할 수 있는 능력.
2. `move`
   - Korean: 관측된 공간 안에서 위치를 변화시킬 수 있는 능력.
3. `contact`
   - Korean: 가까운 존재 또는 물체와 접촉 관계를 만들 수 있는 능력.
4. `grasp`
   - Korean: 운반 가능한 물체를 잡을 수 있는 능력.
5. `carry`
   - Korean: 잡은 물체를 이동시키는 능력.
6. `release`
   - Korean: 잡은 물체를 내려놓을 수 있는 능력.
7. `consume`
   - Korean: 먹거나 마실 수 있는 대상을 섭취할 수 있는 능력.
8. `transfer`
   - Korean: 자신이 보유한 대상을 다른 참여자에게 넘길 수 있는 능력.
9. `strike`
   - Korean: 몸이나 잡은 물체를 통해 물리적 힘을 가할 수 있는 능력.
10. `combine`
    - Korean: 현재 물리조건이 허용할 때 둘 이상의 대상을 결합할 수 있는 능력.
11. `rest`
    - Korean: 능동 행동을 줄이고 세계의 신체회복 규칙이 작동하도록 둘 수 있는 능력.

These capabilities do not directly encode `hunt`, `craft`, `fire`, `share`, or `forage` as answers.
Such higher-level behavior must emerge, if it emerges at all, from current reality plus capability/relation composition.

## 4. Personality placement

Personality is an experiment-specific Choice Axis disposition layer.

It must not modify:
- the physical world;
- observation truth;
- available body capabilities;
- life-value admissibility;
- Responsibility signals;
- past relation storage;
- possibility-generation rules before current-flow grounding;
- experimental success criteria.

Personality may inspect only already constructed, admissible possibilities and their current structural provenance.

## 5. No-contamination rule

The prehistoric experiment must initialize every agent with:

`history = []`
`historyRelations = []`
`realizations = []`
`legacyMemory = absent`
`reward = absent`
`Q = absent`
`relationEpisodes = absent`
`futureStream = absent`
`targetAction = absent`

No legacy experiment result may be converted into an initial relation or personality preference.

## 6. Experimental question

The cohort is not intended to prove that personality affects behavior. That is already a known general phenomenon in agent simulation.

The OASIS-specific question is:

> Under the same prehistoric reality, same mathematical kernel, same capabilities, and zero imported history, how do different Choice-Axis dispositions alter the evolving trajectory of relation formation, possibility composition, realization, incorporation, and later re-currentization?

The neutral OASIS is the no-disposition control.

## 7. Interpretation boundary

Different trajectories are not automatically ranked as better or worse.

Observe:
- first realized action or non-intervention;
- relation formation;
- active/non-current relation transitions;
- possibility composition structure;
- realized sequence structure;
- incorporation into `H_t`;
- later re-currentization;
- participation changes;
- long-horizon structural divergence/convergence.

Do not use survival, innovation count, social count, or any single scalar as an OASIS superiority score.