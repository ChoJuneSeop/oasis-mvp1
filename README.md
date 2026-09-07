# OASIS MVP2

## Governing research protocol / 최상위 연구 프로토콜

All OASIS research, paper production, causal research, mathematical formalization, experiment design, falsification, kill-search, code validation, and research reporting are governed by:

`OASIS_RESEARCH_PROTOCOL.md`

This root protocol has precedence over domain-specific research documents. If a lower-level document conflicts with it, the master protocol governs. Historical conflicting systems are preserved as Legacy/comparator material rather than silently overwritten.

OASIS is implemented here as a 2D autonomous RPG observation laboratory, not as a score-maximizing game bot.

## Current causal research baseline

The active causal research baseline is **OASIS Causal Research System v2.0 (2026-09-07)**, subordinate to `OASIS_RESEARCH_PROTOCOL.md`.

Canonical definition: `docs/OASIS_CAUSAL_RESEARCH_SYSTEM_v2.0_ko.md`
Implementation spec: `docs/causal/CAUSAL_RESEARCH_SYSTEM_SPEC_v2.0.md`
Evidence ledger: `docs/causal/CAUSAL_EVIDENCE_LEDGER_v2.0.md`
Experiment index: `docs/causal/CAUSAL_EXPERIMENT_INDEX_v2.0.md`
Active trace assembler: `tools/causal-trace-ledger-v2.mjs`

The v2 causal process is:

`past relational structure + current reality -> possibility composition -> single realization -> realized experience -> incorporation into the existing past relational structure -> formation of a new past relational structure -> relation between the entire new past relational structure and subsequent reality -> new relational structure / possibility composition`

A completed event is both the terminal point of the preceding relational process and the starting point of the next reality flow. Reality is not treated as a set of ontologically separate event fragments.

The theoretical term is **Past Relational Structure / 과거 관계구조**. Existing implementation fields named `relationHistory` may remain for compatibility, but they do not define the theory.

## v2 core causal research axes

1. Realization and Incorporation into Past Relational Structure / 현실화와 과거 관계구조 편입
2. Formation of New Past Relational Structure and Subsequent Reality Relation / 새로운 과거 관계구조 형성과 이후 현실관계
3. Possibility of Relational Reappearance / 인연의 재출현 가능성
4. Whether Relational Persistence Has Limits / 인연 지속의 제한 여부

Divergence delay is auxiliary timing information only. It is not interpreted as causal strength.

The v1 axes — realized change, persistence, reconvergence, accumulated relational effect, and downstream long-horizon effect — are retained as Legacy/comparator concepts and are no longer the active OASIS causal core.

## Current validation structure

The world contains 10 places, 8 NPCs, and 3 distinct hero parties. Each party moves together by default. Individual members contribute differently to one party decision according to current danger, role, health, curiosity, care, courage, accumulated experience, and — in OASIS-Full — the past relational structure.

Multiple possibilities can exist at once, but only one party action is realized at a time.

Temporary separation is allowed only as a contextual role action such as scouting, followed by reunion.

## Four comparison groups

- OASIS-Full: past relational structure + outcome feedback + present-flow context + participation state + relation-gated structural expansion.
- NoRelation: outcome feedback remains, but relational formation/reactivation and relation-gated possibilities are removed.
- NoFeedback: outcomes do not update later decision conditions. Relational state, experience, discovery, injury, and healing are not fed back into future judgment.
- FixedScore: static role/place preferences with evolving OASIS structures removed.

The environmental danger/weather tape is deterministic and shared across groups.

## Why the world was expanded

The purpose is not to add content for its own sake. The expanded world creates conditions in which a past relation can alter what becomes possible later.

Examples include relation-gated places such as the Ancient Ruins, Watchtower, Star Shrine, and Red Canyon. In OASIS-Full, prior relations with particular NPCs can make previously unavailable places enter the party's candidate set. NoRelation cannot open those candidates through the past relational structure.

## Cause-separated implementation metrics

The previous single spiral count was not sufficient to explain why OASIS-Full and NoRelation could look identical. MVP2 therefore records separate implementation signals:

- experience feedback changes
- relational changes
- participation-leader changes
- candidate-structure changes
- counterfactual choice changes caused by relational participation
- total spiral-loop events
- estimated possibility-space size

A higher number is not treated as proof of superiority.

For causal v2, implementation field growth is not automatically interpreted as structural incorporation. `relationHistoryBefore/After` growth is only an incorporation-candidate signal until structural participation is separately demonstrated.

## Relational reappearance

A past relation may stop directly participating in current judgment or current relational formation without being treated as deleted or extinct.

If later reality conditions allow that relation to become relevant again, the v2 tracker records reappearance and its observed gap. Reappearance must not be pre-scheduled using future information.

A relation not reobserved by the current horizon is reported only as `NOT_REOBSERVED_WITHIN_HORIZON`, not as extinct or permanently unavailable.

## Same-state counterfactual replay

The `동일상황 재시험` control evaluates the selected OASIS-Full party twice without advancing the production world: once with relational participation and once with that participation removed. It records whether the available candidate set or selected destination changes.

This is an internal structural falsification aid, not proof of real-world causality. Shadow/counterfactual states are analysis-only and do not enter the production past relational structure.

## Legacy v1 comparator

OASIS Causal Research System v1.0, its documents, trace tool, and historical evidence remain preserved for direct comparison with v2.

Legacy material is not silently rewritten to fit v2. Future comparison can apply both v1 segmented analysis and v2 continuous-relational analysis to the same experiment data.

## Multiple party structures

Three parties begin from different locations and carry slightly different collective dispositions. They share the same world but form different past relational structures. This makes it possible to observe whether the same NPC or place later participates differently in each party's possibilities.

## Persistence and closed-app behavior

State is saved in localStorage. When the app is reopened, elapsed wall-clock time is converted into a bounded catch-up simulation. This implementation retention behavior is not a theoretical limit on relational persistence.

This is not true continuous background execution while the browser or PWA is closed; it is resume-time catch-up without a dedicated server.

## PWA

The app uses `manifest.json`, `icon.svg`, and `service-worker.js` and can be installed from the GitHub Pages deployment as a standalone home-screen app.
