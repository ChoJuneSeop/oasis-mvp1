# MVP3 Reality Flow Validation Checkpoint — through STAGE 15

Checkpoint date: 2026-09-06
Branch: `mvp3-reality-flow-kill`
Canonical restart point: STAGE 16

## Frozen validation chain

### STAGE 1 — Reality Flow Engine Kill Search
Generic novelty claims for stream processing, history-dependent decisions, temporal memory, and continually revised world models were killed. MVP3 survived only as an OASIS internal-validity correction: present relation authority must depend on the ongoing Reality Flow rather than one scalar coordinate or fixed threshold.

### STAGE 2 — MVP2 path-sensitivity falsification
Same endpoint, same stored relation episode, opposite trajectories produced the same activation, participants, candidates, and decision.
Result: `MVP2_FALSIFIED_FOR_PATH_SENSITIVITY`.

### STAGE 3–6 — Minimal Reality Flow layer and integration
A thin temporal relation layer was added without legacy 0.18 / 0.38 / 1200 thresholds. Same-coordinate/opposite-flow sensitivity survived redesigned testing, existing comparison arms remained unchanged, and the live loader remained operational.

### STAGE 7 — Last-direction aliasing falsification
Direct `[+1]` and reversal `[-1,+1]` paths shared endpoint and final direction but were treated identically by the last-direction proxy.
Result: `MVP3_LAST_DIRECTION_PROXY_FALSIFIED_FOR_TRAJECTORY_ALIASING`.

### STAGE 8 — Qualitative run topology
Run structure preserved reversal information without magnitude or fixed danger thresholds. Exact qualitative per-party run topology distinguished the Stage 7 counterexample and remained viable in the live 1800-tick world.
Results:
- `STAGE8_RUN_STRUCTURE_OBSERVATION_SURVIVES`
- `STAGE8_FLOW_TOPOLOGY_SURVIVES_ALIASING_TEST`
- `STAGE8_TOPOLOGY_LIVE_VIABILITY_SURVIVES`

Representation mechanics are prior art and are not claimed as OASIS novelty.

### STAGE 9 — Legacy authority contamination
The topology candidate was found to execute concurrently with legacy fixed-threshold relation authority.
Result: `STAGE9_LEGACY_RELATION_AUTHORITY_CONTAMINATION_CONFIRMED`.

### STAGE 10 — Causal isolation
Legacy authority was removed while relation-experience storage was retained. Topology observation/activation, actions, episode formation, and external comparison compatibility remained operational.
Result: `STAGE10_TOPOLOGY_CAUSAL_ISOLATION_SURVIVES`.

### STAGE 11 — Residual history-possession authority leak
Even after legacy threshold authority removal, merely possessing old relation history still opened gated executable possibilities when current topology granted no authority.
Result: `STAGE11_HISTORY_POSSESSION_STILL_GRANTS_CANDIDATE_AUTHORITY`.

### STAGE 12 — Evidence / execution authority separation
Two independent implementations established the same boundary:
- remembered relation/place evidence may remain known
- current gated execution authority may become dormant
- matching current Reality Flow may later restore that authority
- dormant evidence does not enter the executable candidate set

Static and live turnover regressions all survived.
Results:
- `STAGE12_EVIDENCE_EXECUTION_AUTHORITY_SEPARATION_SURVIVES`
- `STAGE12_LIVE_EVIDENCE_EXECUTION_BOUNDARY_SURVIVES`
- `STAGE12_EVIDENCE_AUTHORITY_SEPARATION_SURVIVES`
- `STAGE12_AUTHORITY_SEPARATION_LIVE_SURVIVES`

### STAGE 13 — Fixed last-18 relation-history window
Last-18 versus full relation history changed experience composition but did not change present topology authority, authorized possibilities, dormant evidence, or realized choice path in the tested live flow.
Result: `STAGE13_FIXED_RECENCY_WINDOW_ALTERS_EXPERIENCE_COMPOSITION_BUT_NOT_CURRENT_FLOW`.

Important limitation: both arms saturated the shared 80-episode cap, so another bounded-retention mechanism could mask downstream effects.

### STAGE 14 — Fixed 80-episode cap
Holding last-18 composition fixed, cap80 versus no-cap produced:
- different stored episode sets
- topology activation count 32 versus 37
- a different current active relation set for one party
- no difference in known evidence, executable authorized possibilities, dormant evidence, or realized choice path in that 1800-tick run

Correct scoped result: `STAGE14_EPISODE_CAP_PROPAGATES_TO_RELATIONAL_AUTHORITY_NOT_EXECUTION`.

The fixed cap can therefore affect the current relational-authority layer even when that difference does not yet reach executable choice in the observed live stream.

### STAGE 15 — Delayed-relevance retention kill
Targeted falsification of oldest-first fixed-cap eviction.

Control design:
- both arms start with the same old completed Mira–Elli relation episode and the same relationship knowledge
- the old episode has topology key `1`
- 80 newer filler episodes make the old episode the oldest retained item
- cap80 applies its actual final `slice(-80)` behavior; no-cap retains all episodes
- during a mismatch current flow `-1>1`, the old relation is dormant and grants no premature execution authority in either arm
- later both arms receive the same current endpoint and the same topology key `1`

Observed:
- cap80: old target episode is evicted; relationship/place knowledge remains known, but the deleted relation cannot reactivate and the gated `ruin` possibility remains non-authorized/non-candidate
- no-cap: old target episode remains dormant during the mismatch phase, then reactivates when current topology becomes `1`; `ruin` becomes currently authorized and enters the candidate set

All controls passed.
Result: `STAGE15_OLDEST_FIRST_CAP_BLOCKS_DELAYED_RELATION_REACTIVATION`.

Interpretation:
A fixed oldest-first episode cap can erase a completed experience solely because it is old, even though that experience is currently dormant rather than invalid and can become relation-relevant again under a later Reality Flow. This directly supports the internal OASIS requirement that age alone must not determine whether a completed experience may ever regain present relation authority.

This does NOT establish that unlimited memory is optimal. It establishes only that oldest-first bounded deletion is not a valid OASIS retention principle when delayed relevance is possible.

English terms:
- Delayed relevance: information not useful in the current situation that becomes relevant in a later situation.
- FIFO-like / oldest-first eviction: capacity management that removes the oldest retained entries first.
- Dormant evidence: remembered evidence that currently has no execution authority.

## Frozen conclusions through STAGE 15

1. Current scalar coordinates are insufficient to represent Reality Flow.
2. Final direction alone is also insufficient.
3. Qualitative trajectory structure may condition relation authority, but its mechanics are prior art and not OASIS novelty.
4. Stored evidence and current execution authority must be separated.
5. Remembered evidence can persist while authority disappears and later returns.
6. Fixed retention windows/caps are implementation assumptions, not OASIS principles.
7. Oldest-first fixed-cap deletion is positively falsified for delayed relevance: it can destroy a future relation reactivation that would otherwise occur under the same later Reality Flow.
8. No conclusion has been reached that unlimited retention is desirable or scalable.

## Restart point — STAGE 16

### STAGE 16 — Relation-Preserving Retention Kill Search
Question:
What is the minimum retention/compaction rule that can control memory growth without deleting an experience merely because it is old, while preserving the possibility that a dormant completed experience may later regain relation authority?

Required sequence:
1. Kill-search adaptive memory, consolidation, semantic compression, reservoir sampling, graph summarization, and salience-based retention as prior art.
2. Do not adopt a memory-scoring formula merely because it improves retention.
3. Separate storage cost control from current relation authority.
4. Preserve dormant evidence without granting permanent execution authority.
5. Falsify any proposed compaction rule with delayed-relevance counterexamples before live integration.
6. Do not call a retention mechanism OASIS novelty unless the difference survives prior-art and causal tests.

This file is the canonical checkpoint for restarting the Reality Flow validation sequence after STAGE 15.
