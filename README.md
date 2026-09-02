# OASIS MVP2

OASIS is implemented here as a 2D autonomous RPG observation laboratory, not as a score-maximizing game bot.

## Current validation structure

The world now contains 10 places, 8 NPCs, and 3 distinct hero parties. Each party moves together by default. Individual members contribute differently to one party decision according to current danger, role, health, curiosity, care, courage, accumulated experience, and — in OASIS-Full — relationship history.

Multiple possibilities can exist at once, but only one party action is realized at a time.

Temporary separation is allowed only as a contextual role action such as scouting, followed by reunion.

## Four comparison groups

- OASIS-Full: relationship history + outcome feedback + present-flow context + participation state + relationship-gated structural expansion.
- NoRelation: outcome feedback remains, but relationship formation/reactivation and relationship-gated possibilities are removed.
- NoFeedback: outcomes do not update later decision conditions. Relationship state, experience, discovery, injury, and healing are not fed back into future judgment.
- FixedScore: static role/place preferences with evolving OASIS structures removed.

The environmental danger/weather tape is deterministic and shared across groups.

## Why the world was expanded

The purpose is not to add content for its own sake. The expanded world creates conditions in which a past relationship can alter what is possible later.

Examples include relationship-gated places such as the Ancient Ruins, Watchtower, Star Shrine, and Red Canyon. In OASIS-Full, relationships with particular NPCs can make previously unavailable places enter the party's candidate set. NoRelation cannot open those candidates through relationship history.

## Cause-separated metrics

The previous single spiral count was not sufficient to explain why OASIS-Full and NoRelation could look identical. MVP2 therefore records separate causes:

- experience feedback changes
- relationship changes
- participation-leader changes
- candidate-structure changes
- counterfactual choice changes caused by relationship participation
- total spiral-loop events
- estimated possibility-space size

A higher number is not treated as proof of superiority. The important observation is whether the structure and realized path diverge, and why.

## Same-state counterfactual replay

The `동일상황 재시험` control evaluates the selected OASIS-Full party twice without advancing the world: once with relationship participation and once with relationship participation removed. It records whether the available candidate set or selected destination changes.

This is intended as an internal structural falsification aid, not as proof of real-world causality.

## Multiple party histories

Three parties begin from different locations and carry slightly different collective dispositions. They share the same world but accumulate different experiences and relationships. This makes it possible to observe whether the same NPC or place later participates differently in each party's future possibilities.

## Persistence and closed-app behavior

State is saved in localStorage. When the app is reopened, elapsed wall-clock time is converted into a bounded catch-up simulation. This is not true continuous background execution while the browser or PWA is closed; it is resume-time catch-up without a dedicated server.

## PWA

The app uses `manifest.json`, `icon.svg`, and `service-worker.js` and can be installed from the GitHub Pages deployment as a standalone home-screen app.
