# Blind Historical Flow Replay v2 — Retrospective Contamination Audit

## Verdict

Run `33997689850` is **execution-valid but scientifically contaminated for OASIS structural interpretation**.

The raw trace remains useful as a debugging/audit artifact. It MUST NOT be used as paper evidence for OASIS superiority, OASIS-specific relational-flow behavior, selective reactivation, or comparator equivalence.

This verdict does not mean the historical chronology itself is false. It means the runtime representation and comparator construction contain treatment leakage and flow contamination strong enough that the observed relational/possibility/choice structures cannot be attributed cleanly to OASIS.

## Retrospective OASIS Four-Axis Audit

1. 성공값 감사: PASS
   - No historical-match score, accuracy, stability, reward or preferred outcome was used.
2. 평가기준 감사: PASS
   - No conventional performance metric entered OASIS judgment.
3. 흐름 감사: FAIL
   - Unrealized affordance entities were inserted into `changedEntities` and therefore into the current relational seed.
   - Persisting participants and stale relations widened the current field independently of newly realized reality.
4. 구현 감사: FAIL
   - OASIS reconstitution leaked into comparator state.
   - Current affordances and reactivated affordances used asymmetric executability rules.
   - The experimenter pre-enumerated the atomic action universe at each reveal.

Because axes 3 and 4 fail, the run cannot be accepted as a paper-validation result under the project’s own pre-experiment rule.

## Confirmed contamination mechanisms

### C1. Unrealized possibilities contaminate current reality seeds — CONFIRMED / CRITICAL

`observe()` adds entities referenced by every supplied affordance to `changedEntities` even though those affordances are only possibilities and have not been selected or actualized.

Therefore:

`experimenter-supplied possible action -> changedEntities -> current seed -> affinity-field reconstitution`

This reverses the intended OASIS relation:

`current reality -> possibilities -> one actualization -> next reality`.

An unrealized possibility must not become evidence that reality itself changed.

### C2. All available participants are injected into every current seed — CONFIRMED / HIGH

`_currentSeeds()` adds every currently available participant in the world, not only participants whose relation/condition changed in the latest flow.

In this case Authority-A, Expedition-A and Force-B persisted as available participants. Expedition-A appears in both seeded completed experiences, so both historical experiences have a direct overlap path at essentially every test reveal.

Observed valid-run trace consequence: OASIS reactivated `experience:0` and `experience:1` at T0-T4 without a condition that can distinguish selective present relevance from participant persistence.

### C3. Last warmup deliberation leaks into T0 seeds — CONFIRMED / HIGH

After the final warmup experience is actualized, `lastDeliberation` is not cleared before T0. `_currentSeeds()` explicitly adds entities from `lastDeliberation.choice.entities`.

The T0 OASIS/TemporalGraph/OrderedEpisodic traces therefore contain `Local-Force` in seed entities even though T0 does not introduce Local-Force. CurrentEvent does not, because it overrides the seed logic.

This is a direct carry-over contaminant from warmup into the first evaluated reveal.

### C4. Past event relations remain active as current world relations — CONFIRMED / HIGH

World relations persist until explicitly removed. The historical adapter adds many event-like relations (`attacks`, `repels`, `defeats-regime-at`, `demands-withdrawal`, etc.) but does not close/remove them when they cease to be current relations.

Consequently the TemporalGraph relation signature grows cumulatively across T0-T4, and OASIS treats those retained relations as current-world relations in addition to reactivated completed-experience relations.

This mixes:
- still-valid present relations;
- completed past events;
- reactivated completed experiences.

The experiment therefore does not cleanly distinguish present flow from historical experience.

### C5. Historical relations are duplicated in OASIS field representation — CONFIRMED / HIGH

Warmup relations remain in `world.relations` and are also stored inside completed experiences. When those experiences are reactivated, the same relational occurrences can enter the OASIS field both as current retained relations and as historical relations.

The valid trace shows repeated `commands`, `arrives-at`, `holds-post`, `attacks`, and `repels` signatures. This creates relational-field inflation and prevents interpreting a larger relation signature as broader present-sensitive reconstitution.

### C6. OASIS treatment leaks into TemporalGraph comparator — CONFIRMED / CRITICAL

`TemporalGraphComparator.reconstituteAffinityField()` first calls `super.reconstituteAffinityField()`, i.e. the full OASIS relational reconstitution. It then clears `reactivated`, `paths`, and historical relation arrays, but it does **not** reconstruct/reset `participatingEntities` from a clean temporal-graph-only process.

Thus the comparator can retain a participant frontier expanded by OASIS historical reactivation even after the explicit memory list is erased.

This is direct treatment leakage into a control arm.

### C7. OrderedEpisodic starts from a treatment-contaminated frontier — CONFIRMED / CRITICAL

`OrderedEpisodicComparator` extends `TemporalGraphComparator` and initializes its retrieval frontier from `base.participatingEntities`.

Because that field may already contain OASIS-expanded participating entities, the episodic comparator’s retrieval condition is not independent of OASIS reconstitution.

Therefore OrderedEpisodic is not a clean strong memory comparator in this run.

### C8. All comparators share the OASIS decision envelope — CONFIRMED / HIGH FOR GENERAL COMPARISON

CurrentEvent, TemporalGraph and OrderedEpisodic all inherit from `OASISReferenceCore`. They reuse OASIS possibility-generation, responsibility and choice machinery, changing mainly field/memory reconstruction.

This can be useful for a narrow ablation, but it is not an independent comparison against other decision architectures. It also makes equal possibility structures partly a consequence of shared OASIS machinery.

The run therefore cannot support the claim that “other models” behave the same or differently from OASIS.

### C9. Current and reactivated actions use asymmetric executability rules — CONFIRMED / CRITICAL

Current experimenter-supplied affordances are admitted when the actor is available and explicit `requires` facts are satisfied. They are not required to match the actor’s declared capability list.

Reactivated actions from completed experiences must additionally pass the actor capability check.

Therefore:
- experimenter-supplied current action: lower admission barrier;
- history-derived reactivated action: higher admission barrier.

This structurally biases the experiment against history-derived possibility reopening and invalidates comparisons about whether completed experience changes the possibility structure.

### C10. Atomic possibility space is experimenter-pre-enumerated — CONFIRMED / CRITICAL

At T0-T4 the harness manually supplies the action set (`hold`, `request-report`, `open-channel`, `prepare-move`, `request-supply`, `withdraw`, `request-support`, etc.).

Although the core can compose these actions, the primitive action universe itself is selected by the experimenter with knowledge of the historical case.

This conflicts with the project rule that the experimenter must not close the possibility set in advance. It also means the same possibility counts across systems cannot be interpreted as an emergent property of the systems.

### C11. Responsibility/process bridges are partly experimenter-authored — CONFIRMED / HIGH

Examples such as `hold` creating `supply:Expedition-A` and `request-supply`/`withdraw` resolving that obligation are manually encoded in the adapter.

These may be reasonable world semantics, but they are not raw historical observations and they directly determine structural combination and responsibility dominance. They require independent justification/provenance before they can be treated as reality rather than experiment design.

### C12. Common warmup cannot test selective reactivation — CONFIRMED / HIGH

Only two completed experiences are seeded, and both are tightly connected to the same expedition/outpost that remains central in every test reveal.

There are no irrelevant or differently related completed experiences competing for re-participation. Therefore reactivating both experiences cannot establish selectivity; it is compatible with simple overlap saturation.

## Potential temporal/hindsight contamination not yet provable from the run

### T1. Per-claim ex-ante provenance is missing — UNRESOLVED / HIGH RISK

The protocol gives a general historical chronology and source list, but the runtime events do not attach a source and first-available timestamp to every fact/relation.

Thus we cannot verify from the frozen artifact alone that each relation such as `locally-outnumbers`, `has-not-committed-support`, or `controls` was available to the relevant historical decision-maker at the exact reveal boundary.

This does not prove future leakage occurred. It means the required provenance audit cannot pass.

### T2. Historical-case identification / training-data leakage — NOT APPLICABLE TO THIS RUN, HIGH RISK FOR FUTURE LLM RUNS

The four systems in v2 are code classes, not pretrained language models. They do not semantically recognize “Fashoda” from training memory, so model memorization is not the main contamination mechanism in this run.

However, if frontier LLMs are later used as comparison systems, anonymizing names/dates is insufficient by itself. The event sequence is distinctive enough that a model may infer the historical case from relational structure. A matched clean control or point-in-time model/reference is required.

## What remains trustworthy

The following may be retained:
- CI execution provenance;
- exact raw trace;
- confirmation that the frozen harness executed as written;
- discovery of the contamination mechanisms above;
- use of this run as an implementation/experimental-design diagnostic.

The following are NOT trustworthy as paper evidence:
- OASIS reactivates “more relevant” history;
- OASIS and comparators have genuinely equal possibility structures;
- OASIS choice differences/similarities reflect substantive decision differences;
- OrderedEpisodic or TemporalGraph constitute clean strong controls;
- v2 validates C1/C2/C5.

## Required remediation before any rerun

1. Separate `realityChangedEntities` from entities merely referenced by available affordances.
2. Do not seed the current field with every available participant; derive present participation from actual current relational change/process.
3. Clear or explicitly close the last warmup deliberation before T0.
4. Give relations explicit persistence/termination semantics; event relations must not remain current forever by default.
5. Deduplicate current retained relations versus reactivated historical process relations by provenance/occurrence.
6. Build TemporalGraph and OrderedEpisodic from clean independent state, not by calling full OASIS reconstitution and erasing fields afterward.
7. Add at least one independent decision architecture rather than only OASIS-derived ablations.
8. Apply the same executability rule to current and reactivated actions, including capability/physical/organizational constraints.
9. Replace hand-enumerated action menus with an independently specified world-action generator/interface, or formally justify why the atomic action set is complete without using the known outcome.
10. Add unrelated and differently related completed experiences so selective reactivation can actually be falsified.
11. Attach `source`, `available_at`, and decision-maker access/provenance to every historical fact/relation.
12. For future LLM comparators, add a structurally isomorphic surface-transformed case and a matched clean/obscure historical control; do not claim anonymization proves zero leakage.

## Final status

**Blind Historical Flow Replay v2 is frozen as a contaminated diagnostic run. Do not rerun v2 unchanged.**

A corrected experiment must be versioned separately (v3 or later) after a fresh four-axis audit.